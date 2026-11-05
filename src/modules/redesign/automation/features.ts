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
    name: { fr: 'Auto-récolte', en: 'Auto harvest' },
    description: {
        fr: 'Récolte les baies mûres et replante la baie sélectionnée dans la ferme.',
        en: 'Harvests ripe berries and replants the berry selected in the farm.',
    },
    intervalMs: 1000,
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

// Hatchery: 12 eggs at once instead of 4 (rule change, no userscript equivalent).
// The extra slots exist only in this fork: they are added to the hatchery before the
// save is read, so eggs 5-12 survive a reload. The save keeps the number of slots the
// player bought; the official game ignores eggs 5-12 and returns those Pokémon to the
// party on load. Switching off lets eggs 5-12 finish, then the slots disappear on the
// next load.
const HATCHERY_SLOTS = 12;
const BASE_SLOTS = 4;
const lexical = (name: string): any => {
    // eslint-disable-next-line no-eval
    try { return (0, eval)(`typeof ${name} !== 'undefined' ? ${name} : undefined`); } catch { return undefined; }
};
const hatcheryOn = () => !!Automation.find('hatchery12')?.enabled.peek();
let breedingPatched = false;
const patchBreeding = () => {
    const Breeding = lexical('Breeding');
    const Egg = lexical('Egg');
    if (breedingPatched || !Breeding || !Egg) return;
    breedingPatched = true;
    const fromJSON = Breeding.prototype.fromJSON;
    Breeding.prototype.fromJSON = function patchedFromJSON(json: any) {
        const saved: any[] = json?.eggList ?? [];
        const pending = saved.slice(BASE_SLOTS).some((e) => e && e.type != null && e.type !== -1);
        if (hatcheryOn() || pending) {
            while (this.defaults.eggList.length < HATCHERY_SLOTS) this.defaults.eggList.push(ko.observable(new Egg()));
        }
        fromJSON.call(this, json);
        if (hatcheryOn() && this.eggList.length >= HATCHERY_SLOTS && this.__rdPurchased == null) {
            this.__rdPurchased = this.eggSlots;
            this.eggSlots = HATCHERY_SLOTS;
        }
    };
    const toJSON = Breeding.prototype.toJSON;
    Breeding.prototype.toJSON = function patchedToJSON() {
        const json = toJSON.call(this);
        if (this.__rdPurchased != null) json.eggSlots = this.__rdPurchased;
        return json;
    };
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', patchBreeding); else patchBreeding();

Automation.register({
    id: 'hatchery12',
    group: 'custom',
    name: { fr: 'Pension : 12 œufs', en: 'Hatchery: 12 eggs' },
    description: {
        fr: 'Fait couver 12 œufs en même temps au lieu de 4.',
        en: 'Incubates 12 eggs at once instead of 4.',
    },
    warning: {
        fr: 'Change les règles du jeu ; la page se recharge à l’activation. La sauvegarde garde vos emplacements achetés. Les œufs 5 à 12 n’existent pas dans le jeu officiel : si vous y importez la sauvegarde, ils disparaissent et leurs Pokémon reviennent dans l’équipe. À la désactivation, les œufs en cours finissent normalement.',
        en: 'Changes the game rules; the page reloads when switched on. The save keeps your bought slots. Eggs 5-12 do not exist in the official game: importing the save there drops them and returns their Pokémon to the party. When switched off, eggs in progress finish normally.',
    },
    available: (ctx) => ctx.g.App.game.breeding.canAccess(),
    enable: (ctx) => {
        const breeding = ctx.g.App.game.breeding;
        if (breeding.eggList.length < HATCHERY_SLOTS) {
            // The hatchery view is built once: reload so the 12 slots exist before bindings.
            // A guard stops a reload loop if the hatchery could not be extended.
            const tries = Number(sessionStorage.getItem('rd.hatchery12.reload') || 0);
            if (tries >= 1) {
                sessionStorage.removeItem('rd.hatchery12.reload');
                throw new Error('hatchery not extended');
            }
            sessionStorage.setItem('rd.hatchery12.reload', String(tries + 1));
            ctx.g.Save.store(ctx.g.player);
            window.location.reload();
            return;
        }
        sessionStorage.removeItem('rd.hatchery12.reload');
        if (breeding.__rdPurchased == null) {
            breeding.__rdPurchased = breeding.eggSlots;
            breeding.eggSlots = HATCHERY_SLOTS;
        }
    },
    disable: (ctx) => {
        const breeding = ctx.g.App.game.breeding;
        if (breeding.__rdPurchased != null) {
            breeding.eggSlots = breeding.__rdPurchased;
            breeding.__rdPurchased = null;
        }
    },
    status: (ctx) => {
        const eggs = ctx.g.App.game.breeding.eggList as Array<KnockoutObservable<any>>;
        return `${eggs.filter((e) => !e().isNone()).length}/${HATCHERY_SLOTS}`;
    },
});

// Farm: faster growth until ripe (rule change). Only the time to ripen is shortened:
// once ripe, a berry lasts as long as usual before withering. The countdown shown on
// each plot follows, since it reads the same multiplier.
let farmSpeed = 1;
let plotPatched = false;
const patchPlot = () => {
    const Plot = lexical('Plot');
    const PlotStage = lexical('PlotStage');
    if (plotPatched || !Plot || PlotStage === undefined) return;
    plotPatched = true;
    const original = Plot.prototype.getGrowthMultiplier;
    Plot.prototype.getGrowthMultiplier = function patchedGrowth() {
        const base = original.call(this);
        return farmSpeed > 1 && this.stage() < PlotStage.Berry ? base * farmSpeed : base;
    };
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', patchPlot); else patchPlot();

Automation.register({
    id: 'farmSpeed',
    group: 'custom',
    name: { fr: 'Ferme accélérée', en: 'Faster farm' },
    description: {
        fr: 'Les baies mûrissent aussitôt plantées (ou plus vite, au choix). Une fois mûres, elles restent le temps habituel avant de flétrir.',
        en: 'Berries ripen as soon as planted (or faster, as chosen). Once ripe, they last the usual time before withering.',
    },
    warning: {
        fr: 'Change les règles du jeu tant que c’est actif. Rien n’est écrit dans la sauvegarde.',
        en: 'Changes the game rules while enabled. Nothing is written to the save.',
    },
    options: [
        {
            key: 'mode',
            label: { fr: 'Pousse', en: 'Growth' },
            type: 'select',
            default: 'instant',
            choices: [
                { value: 'instant', label: { fr: 'Instantanée', en: 'Instant' } },
                ...[2, 5, 10, 50, 100].map((n) => ({ value: String(n), label: { fr: `×${n}`, en: `×${n}` } })),
            ],
        },
    ],
    available: (ctx) => ctx.g.App.game.farming.canAccess(),
    intervalMs: 250,
    enable: (ctx) => { patchPlot(); farmSpeed = ctx.opt('mode') === 'instant' ? 1 : Math.max(1, Number(ctx.opt('mode')) || 1); },
    tick: (ctx) => {
        const mode = ctx.opt('mode');
        if (mode !== 'instant') {
            farmSpeed = Math.max(1, Number(mode) || 1);
            return;
        }
        farmSpeed = 1;
        // Instant: every growing berry jumps to the start of its ripe stage (it then
        // lasts the usual time before withering).
        const PlotStage = lexical('PlotStage');
        ctx.g.App.game.farming.plotList.forEach((plot: any) => {
            if (!plot.isUnlocked || plot.isEmpty() || plot.stage() >= PlotStage.Berry) return;
            plot.age = plot.berryData.growthTime[PlotStage.Berry - 1] + 0.01;
        });
    },
    disable: () => { farmSpeed = 1; },
    status: (ctx) => (ctx.opt('mode') === 'instant' ? '⚡' : `×${ctx.opt('mode')}`),
});

// Underground: tools recharge faster (rule change). The game's own restore rate is
// multiplied, so the "time until 100%" shown in the mine follows; past the game's own
// threshold a tool stops using durability, as it does at high underground levels.
const mineSpeed = ko.observable(1);
// Instant: a restore rate far above the game's own "free use" threshold, so a tool
// costs no durability and refills at once (as the game does at high levels).
const mineFactor = (mode: any) => (mode === 'instant' ? 1e6 : Math.max(1, Number(mode) || 1));
let toolPatched = false;
const patchTools = (ctx: any) => {
    if (toolPatched) return;
    const tool = ctx.g.App?.game?.underground?.tools?.tools?.[0];
    if (!tool) return;
    toolPatched = true;
    const proto = Object.getPrototypeOf(tool);
    const original = proto.calculateDurabilityRestoreRatePerSecond;
    proto.calculateDurabilityRestoreRatePerSecond = function patchedRestore(...args: any[]) {
        return original.apply(this, args) * mineSpeed();
    };
    // The game caches each tool's rate in a computed that does not know about the speed:
    // rebuild it so it follows both the underground level and the speed.
    const underground = ctx.g.App.game.underground;
    underground.tools.tools.forEach((t: any) => {
        t.restoreRatePerSecond = ko.pureComputed(() => t.calculateDurabilityRestoreRatePerSecond(underground.undergroundLevel));
    });
};

Automation.register({
    id: 'mineSpeed',
    group: 'custom',
    name: { fr: 'Mine : recharge rapide', en: 'Mine: fast recharge' },
    description: {
        fr: 'Les outils de la mine restent à 100 % (ou se rechargent plus vite, au choix).',
        en: 'Underground tools stay at 100% (or recharge faster, as chosen).',
    },
    warning: {
        fr: 'Change les règles du jeu tant que c’est actif. Rien n’est écrit dans la sauvegarde.',
        en: 'Changes the game rules while enabled. Nothing is written to the save.',
    },
    options: [
        {
            key: 'mode',
            label: { fr: 'Recharge', en: 'Recharge' },
            type: 'select',
            default: 'instant',
            choices: [
                { value: 'instant', label: { fr: 'Instantanée', en: 'Instant' } },
                ...[2, 5, 10, 50].map((n) => ({ value: String(n), label: { fr: `×${n}`, en: `×${n}` } })),
            ],
        },
    ],
    available: (ctx) => ctx.g.App.game.underground.canAccess(),
    intervalMs: 500,
    enable: (ctx) => { patchTools(ctx); mineSpeed(mineFactor(ctx.opt('mode'))); },
    tick: (ctx) => {
        const v = mineFactor(ctx.opt('mode'));
        if (mineSpeed.peek() !== v) mineSpeed(v);
    },
    disable: () => { mineSpeed(1); },
    status: (ctx) => (ctx.opt('mode') === 'instant' ? '⚡' : `×${ctx.opt('mode')}`),
});

// Underground: a searched mine is found at once (rule change). The discovery countdown
// is brought to its end; the game's next tick announces the mine as usual.
Automation.register({
    id: 'mineInstantFind',
    group: 'custom',
    name: { fr: 'Mine : découverte instantanée', en: 'Mine: instant find' },
    description: {
        fr: 'Une nouvelle mine est trouvée aussitôt la recherche lancée, sans attendre le compte à rebours.',
        en: 'A new mine is found as soon as the search starts, without the countdown.',
    },
    warning: {
        fr: 'Change les règles du jeu tant que c’est actif. Rien d’autre n’est modifié dans la sauvegarde.',
        en: 'Changes the game rules while enabled. Nothing else in the save is changed.',
    },
    available: (ctx) => ctx.g.App.game.underground.canAccess(),
    intervalMs: 250,
    tick: (ctx) => {
        const mine = ctx.g.App.game.underground.mine;
        if (mine && !mine.completed && mine.timeUntilDiscovery > 0.001) mine._timeUntilDiscovery(0.001);
    },
});

// Hatchery: eggs are ready as soon as they are placed (rule change). Hatching itself
// stays with the player or with Auto hatchery.
Automation.register({
    id: 'hatchInstant',
    group: 'custom',
    name: { fr: 'Éclosion instantanée', en: 'Instant hatch' },
    description: {
        fr: 'Les œufs sont prêts à éclore dès qu’ils sont posés. Avec l’auto-éclosion, ils éclosent aussitôt.',
        en: 'Eggs are ready to hatch as soon as they are placed. With Auto hatchery, they hatch at once.',
    },
    warning: {
        fr: 'Change les règles du jeu tant que c’est actif. Rien d’autre n’est modifié dans la sauvegarde.',
        en: 'Changes the game rules while enabled. Nothing else in the save is changed.',
    },
    available: (ctx) => ctx.g.App.game.breeding.canAccess(),
    intervalMs: 250,
    tick: (ctx) => {
        (ctx.g.App.game.breeding.eggList as Array<KnockoutObservable<any>>).forEach((slot) => {
            const egg = slot();
            if (!egg.isNone() && !egg.canHatch()) egg.steps(egg.totalSteps);
        });
    },
});
