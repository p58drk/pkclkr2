/* eslint-disable @typescript-eslint/no-explicit-any */
// Feature definitions. Each one names the userscript it replaces and what was repaired.
import Automation from './Automation';
import Amount from '../../wallet/Amount';

// ---------------------------------------------------------------- vanilla

// enhancedautohatchery.user.js: hatch ready eggs, refill free slots with the first
// Pokémon of the hatchery's own filtered and sorted list. Fossil mode removed: fossil
// eggs no longer exist since 0.10.24.
Automation.register({
    id: 'autoHatch',
    group: 'vanilla',
    name: { fr: 'Auto-éclosion', en: 'Auto hatchery' },
    description: {
        fr: 'Fait éclore les œufs prêts et remplit les emplacements libres selon les filtres et le tri de la pension.',
        en: 'Hatches ready eggs and fills free slots using the hatchery filters and sort order.',
    },
    intervalMs: 1000,
    available: (ctx) => ctx.g.App.game.breeding.canAccess(),
    tick: (ctx) => {
        const { App, BreedingController } = ctx.g;
        const breeding = App.game.breeding;
        const eggs = breeding._eggList as Array<KnockoutObservable<any>>;
        eggs.forEach((egg, i) => {
            if (egg().canHatch()) breeding.hatchPokemonEgg(i);
        });
        if (!breeding.hasFreeEggSlot()) return;
        // Sorted once per tick (the list is idle while the hatchery window is closed).
        const candidates = BreedingController.hatcherySortedFilteredList();
        for (let i = 0; i < candidates.length && breeding.hasFreeEggSlot(); i++) {
            if (!candidates[i].breeding) breeding.addPokemonToHatchery(candidates[i]);
        }
    },
    status: (ctx) => {
        const eggs = ctx.g.App.game.breeding._eggList as Array<KnockoutObservable<any>>;
        const busy = eggs.filter((e) => !e().isNone()).length;
        return `${busy}/${ctx.g.App.game.breeding.eggSlots}`;
    },
});

// simpleautofarmer.user.js: harvest ripe berries and replant. Repaired: berry data now
// comes from plot.berryData (farming.berryData no longer exists).
Automation.register({
    id: 'autoFarm',
    group: 'vanilla',
    name: { fr: 'Auto-ferme', en: 'Auto farm' },
    description: {
        fr: 'Récolte les baies mûres et replante la baie sélectionnée dans la ferme.',
        en: 'Harvests ripe berries and replants the berry selected in the farm.',
    },
    intervalMs: 2000,
    options: [
        {
            key: 'mode',
            label: { fr: 'Replanter', en: 'Replant' },
            type: 'select',
            default: 'selected',
            choices: [
                { value: 'selected', label: { fr: 'La baie sélectionnée', en: 'Selected berry' } },
                { value: 'same', label: { fr: 'La même baie', en: 'Same berry' } },
                { value: 'none', label: { fr: 'Ne pas replanter', en: 'Do not replant' } },
            ],
        },
    ],
    available: (ctx) => ctx.g.App.game.farming.canAccess(),
    tick: (ctx) => {
        const { App, FarmController } = ctx.g;
        const farming = App.game.farming;
        const mode = ctx.opt('mode');
        const PlotStage = ctx.w.PlotStage;
        farming.plotList.forEach((plot: any, index: number) => {
            if (!plot.isUnlocked) return;
            let replant = -1;
            if (!plot.isEmpty() && plot.stage() === PlotStage.Berry) {
                replant = plot.berry;
                farming.harvest(index);
            }
            if (!plot.isEmpty() || mode === 'none') return;
            const berry = mode === 'same' && replant >= 0 ? replant : FarmController.selectedBerry();
            if (berry >= 0 && farming.berryInventory[berry]?.() > 0) farming.plant(index, berry);
        });
    },
});

// enhancedautomine.user.js: rewritten for the 2025 Underground (instance mine, tool
// durability). Targets tiles that still cover an item; restarts a finished mine
// when the game's own auto-restart is off.
Automation.register({
    id: 'autoMine',
    group: 'vanilla',
    name: { fr: 'Auto-mine', en: 'Auto mine' },
    description: {
        fr: 'Creuse les objets enfouis avec le marteau ou le burin selon leur durabilité, puis relance une mine.',
        en: 'Digs out buried items with the hammer or chisel depending on durability, then starts a new mine.',
    },
    intervalMs: 400,
    available: (ctx) => ctx.g.App.game.underground.canAccess(),
    tick: (ctx) => {
        const { App, Settings } = { App: ctx.g.App, Settings: ctx.w.Settings };
        const ug = App.game.underground;
        const Tool = ctx.w.UndergroundToolType;
        const mine = ug.mine;
        if (!mine) {
            ug.generateMine(ug.autoSearchMineType);
            return;
        }
        if (mine.completed) {
            if (!Settings.getSetting('autoRestartUndergroundMine')?.observableValue?.()) {
                ug.generateMine(ug.autoSearchMineType);
            }
            return;
        }
        if (mine.timeUntilDiscovery > 0) return;
        const grid = mine.grid as any[];
        const target = grid.findIndex((tile) => tile.reward && !tile.reward.rewarded && tile.layerDepth > 0);
        if (target < 0) return;
        const { x, y } = mine.getCoordinateForGridIndex(target);
        const hammer = ug.tools.getTool(Tool.Hammer);
        const chisel = ug.tools.getTool(Tool.Chisel);
        if (hammer?.canUseTool()) ug.tools.useTool(Tool.Hammer, x, y);
        else if (chisel?.canUseTool()) ug.tools.useTool(Tool.Chisel, x, y);
    },
    status: (ctx) => {
        const mine = ctx.g.App.game.underground.mine;
        return mine ? `${mine.itemsFound}/${mine.itemsBuried}` : '';
    },
});

// custom/autoquestcompleter.user.js: claim, start up to the game's quest slots, and
// take the free refresh. Repaired: no longer exceeds questSlots, no paid refresh
// unless asked.
Automation.register({
    id: 'autoQuests',
    group: 'vanilla',
    name: { fr: 'Auto-quêtes', en: 'Auto quests' },
    description: {
        fr: 'Réclame les quêtes terminées et en démarre de nouvelles dans la limite de vos emplacements.',
        en: 'Claims finished quests and starts new ones within your quest slots.',
    },
    intervalMs: 1500,
    options: [
        { key: 'paidRefresh', label: { fr: 'Rafraîchir en payant', en: 'Paid refresh' }, type: 'boolean', default: false },
    ],
    available: (ctx) => ctx.g.App.game.quests.isDailyQuestsUnlocked?.() ?? true,
    tick: (ctx) => {
        const quests = ctx.g.App.game.quests;
        quests.questList().forEach((q: any, i: number) => {
            if (q.isCompleted() && !q.claimed()) quests.claimQuest(i);
        });
        quests.questList().forEach((q: any, i: number) => {
            if (quests.canStartNewQuest() && !q.inProgress() && !q.isCompleted()) quests.beginQuest(i);
        });
        const allDone = quests.questList().every((q: any) => q.claimed());
        if (allDone && (quests.freeRefresh() || (ctx.opt('paidRefresh') && quests.canAffordRefresh()))) {
            quests.refreshQuests();
        }
    },
});

// autobattleitems.user.js: keep chosen battle items running.
const BATTLE_ITEMS = ['xAttack', 'xClick', 'Lucky_egg', 'Token_collector', 'Dowsing_machine', 'Lucky_incense'];
Automation.register({
    id: 'autoBattleItems',
    group: 'vanilla',
    name: { fr: 'Auto-objets de combat', en: 'Auto battle items' },
    description: {
        fr: 'Relance les objets de combat dès que leur effet se termine, s’il vous en reste.',
        en: 'Uses battle items again as soon as their effect ends, while you have some.',
    },
    intervalMs: 1000,
    options: [
        { key: 'buy', label: { fr: 'Racheter quand il n’y en a plus', en: 'Buy more when out' }, type: 'boolean', default: false },
        ...BATTLE_ITEMS.map((name) => ({
            key: name,
            label: { fr: name.replace(/_/g, ' '), en: name.replace(/_/g, ' ') },
            type: 'boolean' as const,
            default: name === 'xAttack' || name === 'xClick',
        })),
    ],
    available: (ctx) => !ctx.g.App.game.challenges.list.disableBattleItems.active(),
    tick: (ctx) => {
        const { player } = ctx.g;
        const { ItemList, ItemHandler, EffectEngineRunner } = ctx.w;
        BATTLE_ITEMS.forEach((name) => {
            if (!ctx.opt(name)) return;
            if (EffectEngineRunner.getEffect(name) > 1) return;
            if (player.itemList[name]() <= 0 && ctx.opt('buy')) {
                const item = ItemList[name];
                const price = new Amount(item.totalPrice(1), item.currency);
                if (item.isAvailable() && ctx.g.App.game.wallet.hasAmount(price)) item.buy(1);
            }
            if (player.itemList[name]() > 0) ItemHandler.useItem(name, 1);
        });
    },
});

// ---------------------------------------------------------------- custom (rule-changing)

const originalCatchTimes: number[] = [];
// custom/catchspeedadjuster.user.js
Automation.register({
    id: 'catchSpeed',
    group: 'custom',
    name: { fr: 'Capture instantanée', en: 'Instant catch' },
    description: {
        fr: 'Supprime l’animation de capture des Poké Balls.',
        en: 'Removes the Poké Ball catch delay.',
    },
    warning: {
        fr: 'Change les règles du jeu tant que c’est actif.',
        en: 'Changes the game rules while enabled.',
    },
    enable: (ctx) => {
        ctx.g.App.game.pokeballs.pokeballs.forEach((b: any, i: number) => {
            if (originalCatchTimes[i] === undefined) originalCatchTimes[i] = b.catchTime;
            b.catchTime = 0;
        });
    },
    disable: (ctx) => {
        ctx.g.App.game.pokeballs.pokeballs.forEach((b: any, i: number) => {
            if (originalCatchTimes[i] !== undefined) b.catchTime = originalCatchTimes[i];
        });
    },
});

let originalOakRequirements: number[] | null = null;
// custom/oakitemsunlimited.user.js
Automation.register({
    id: 'oakItemsUnlimited',
    group: 'custom',
    name: { fr: 'Objets Oak : tous les emplacements', en: 'Oak Items: all slots' },
    description: {
        fr: 'Débloque tous les emplacements d’objets Oak sans attendre le nombre de Pokémon requis.',
        en: 'Unlocks every Oak Item slot without the caught-Pokémon requirement.',
    },
    warning: {
        fr: 'Change les règles du jeu tant que c’est actif. Les objets activés en plus sont enregistrés dans la sauvegarde ; à la désactivation, ceux qui dépassent la limite normale sont retirés.',
        en: 'Changes the game rules while enabled. Extra active items are saved; disabling removes the ones above the normal limit.',
    },
    enable: (ctx) => {
        const oak = ctx.g.App.game.oakItems;
        if (!originalOakRequirements) originalOakRequirements = [...oak.unlockRequirements];
        oak.unlockRequirements = oak.unlockRequirements.map(() => 0);
    },
    disable: (ctx) => {
        const oak = ctx.g.App.game.oakItems;
        if (originalOakRequirements) oak.unlockRequirements = [...originalOakRequirements];
        // Drop active items above the normal limit, last ones first.
        const active = oak.itemList.filter((item: any) => item.isActive);
        active.slice(oak.maxActiveCount()).reverse().forEach((item: any) => { item.isActive = false; });
    },
});
