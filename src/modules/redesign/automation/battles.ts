/* eslint-disable @typescript-eslint/no-explicit-any */
// Auto gym and auto dungeon, from enhancedautoclicker.user.js (Ephenia/Pokeclicker-Scripts,
// GPL-3.0). Rewritten against the current game API without replacing any game function:
// - gyms use the game's own auto restart (its cost, free from 100 clears, and its reward)
//   instead of the script's free restart override;
// - dungeons are entered with the normal token cost and left through the game's own
//   victory path (no free in-place restart).
// Both lock onto the place where they are switched on, and stop when the player leaves,
// loses, or runs out of tokens.
import Automation, { AutomationContext } from './Automation';

const GS = (ctx: AutomationContext) => ctx.w.GameConstants.GameState;
const TIERS = ['common', 'rare', 'epic', 'legendary', 'mythic'];

const say = (fr: string, en: string) => ({ fr, en });

const MSG = {
    noGym: say(
        'Ouvrez une ville dont l\'arène est débloquée, puis activez l\'auto-arène.',
        'Open a town with an unlocked gym, then switch auto gym on.',
    ),
    gymLeft: say('Vous avez quitté la ville : auto-arène arrêtée.', 'You left the town: auto gym stopped.'),
    gymLost: say('Arène perdue (temps écoulé) : auto-arène arrêtée.', 'Gym lost (time ran out): auto gym stopped.'),
    noDungeon: say(
        'Ouvrez un donjon débloqué, puis activez l\'auto-donjon.',
        'Open an unlocked dungeon, then switch auto dungeon on.',
    ),
    guide: say(
        'Un guide de donjon est engagé : il fait déjà le travail. Auto-donjon arrêté.',
        'A dungeon guide is hired and already does the job. Auto dungeon stopped.',
    ),
    dungeonLeft: say('Vous avez quitté le donjon : auto-donjon arrêté.', 'You left the dungeon: auto dungeon stopped.'),
    dungeonLost: say(
        'Donjon non terminé (temps écoulé ou sortie) : auto-donjon arrêté.',
        'Dungeon not cleared (time ran out or left): auto dungeon stopped.',
    ),
    noTokens: say('Plus assez de jetons de donjon : auto-donjon arrêté.', 'Not enough dungeon tokens: auto dungeon stopped.'),
};

// ---------------------------------------------------------------- auto clicker

// enhancedautoclicker.user.js: click attack on every battle type.
// Rate 1-1000/s (the original script went to 100/s with a ×5 multiplier). Up to 20/s
// the average stays within the game's own limit; above, it exceeds it. Every click goes
// through the game's real click code path (statistics, challenges, catching, defeat).
const GAME_CLICK_CAP = 20;
const MAX_RATE = 1000;
const RATES = [1, 5, 10, 20, 50, 100, 200, 500, 1000];
let clickDebt = 0;
let lastClickTick = 0;
Automation.register({
    id: 'autoClick',
    group: 'vanilla',
    name: { fr: 'Auto-clic', en: 'Auto clicker' },
    description: {
        fr: 'Attaque à votre place sur les routes, dans les arènes, les donjons et les combats spéciaux. Au-delà de 20 clics par seconde, la limite du jeu est dépassée.',
        en: 'Click attacks for you on routes, gyms, dungeons and special battles. Above 20 clicks per second, the game\'s own limit is exceeded.',
    },
    intervalMs: 0,
    options: [
        {
            key: 'rate',
            label: { fr: 'Clics par seconde', en: 'Clicks per second' },
            type: 'select',
            default: 20,
            choices: RATES.map((n) => ({ value: n, label: { fr: `${n}/s`, en: `${n}/s` } })),
        },
    ],
    tick: (ctx) => {
        const rate = Math.max(1, Math.min(MAX_RATE, Number(ctx.opt('rate')) || GAME_CLICK_CAP));
        const now = Date.now();
        const elapsed = lastClickTick ? Math.min(now - lastClickTick, 1000) : 0;
        lastClickTick = now;
        // Up to a quarter second of clicks per tick (250 at 1000/s), so background ticks keep pace.
        clickDebt = Math.min(clickDebt + (rate * elapsed) / 1000, Math.max(20, rate / 4));
        const clicks = Math.floor(clickDebt);
        if (clicks < 1) return;
        clickDebt -= clicks;

        const { App, GymBattle, DungeonRunner, DungeonBattle, TemporaryBattleBattle } = ctx.g;
        const G = GS(ctx);
        let target: any = null;
        switch (App.game.gameState) {
            case G.fighting: target = ctx.w.Battle; break;
            case G.gym: target = GymBattle; break;
            case G.dungeon: target = DungeonRunner.fighting() && !DungeonBattle.catching() ? DungeonBattle : null; break;
            case G.temporaryBattle: target = TemporaryBattleBattle; break;
            default: break;
        }
        if (!target) return;
        // The click debt already paces the rate; the game's 50 ms guard is reset so the
        // scheduler's 20 ms granularity does not drop clicks (at <= 20/s the average stays
        // within the game's own limit).
        // At most one Pokémon defeated per pass: once the foe falls (or a catch starts), the
        // rest of this pass is dropped. Clicking through every new foe at 1000/s meant up to
        // 1000 defeats a second, each with its rewards, quests and achievements: the page froze.
        const foe = target.enemyPokemon?.();
        for (let i = 0; i < clicks; i++) {
            target.lastClickAttack = 0;
            target.clickAttack();
            const current = target.enemyPokemon?.();
            if (current !== foe || !current?.isAlive?.()) {
                clickDebt = 0;
                break;
            }
        }
    },
    status: (ctx) => `${ctx.opt('rate')}/s`,
});

// ---------------------------------------------------------------- auto gym

let gymTarget: { town: string; started: boolean } | null = null;

const unlockedGyms = (ctx: AutomationContext): any[] => {
    const { player, Gym } = ctx.g;
    return (player.town?.content ?? []).filter((c: any) => c instanceof Gym && c.isUnlocked());
};

Automation.register({
    id: 'autoGym',
    group: 'vanilla',
    name: { fr: 'Auto-arène', en: 'Auto gym' },
    description: {
        fr: 'Combat en boucle une arène de la ville ouverte, avec la relance automatique du jeu (payante jusqu\'à 100 victoires). S\'arrête si vous quittez la ville ou perdez.',
        en: 'Fights a gym of the open town in a loop, using the game\'s own auto restart (paid until 100 wins). Stops when you leave the town or lose.',
    },
    intervalMs: 250,
    options: [
        {
            key: 'gym',
            label: { fr: 'Arène de la ville (Conseil 4 : 5 = Maître)', en: 'Gym in town (Elite Four: 5 = Champion)' },
            type: 'select',
            default: 1,
            choices: [1, 2, 3, 4, 5].map((n) => ({ value: n, label: { fr: String(n), en: String(n) } })),
        },
    ],
    enable: (ctx) => {
        const { App, player } = ctx.g;
        Automation.find('autoDungeon')?.enabled(false);
        const G = GS(ctx);
        const here = App.game.gameState === G.gym || App.game.gameState === G.town;
        if (!here || !unlockedGyms(ctx).length) {
            gymTarget = null;
            ctx.stop(MSG.noGym);
            return;
        }
        gymTarget = { town: player.town.name, started: false };
    },
    disable: () => { gymTarget = null; },
    tick: (ctx) => {
        if (!gymTarget) return;
        const { App, player, GymRunner } = ctx.g;
        const G = GS(ctx);
        const state = App.game.gameState;
        if (state === G.gym) return; // the game's own auto restart runs the loop
        if (state !== G.town || player.town.name !== gymTarget.town) {
            ctx.stop(MSG.gymLeft);
            return;
        }
        // Back in town: either a loss (timer ran out) or the restart could not be paid.
        if (gymTarget.started && GymRunner.timeLeft() <= 0) {
            ctx.stop(MSG.gymLost);
            return;
        }
        const gyms = unlockedGyms(ctx);
        if (!gyms.length) {
            ctx.stop(MSG.noGym);
            return;
        }
        const index = Math.min(Math.max(1, Number(ctx.opt('gym')) || 1), gyms.length) - 1;
        gymTarget.started = true;
        GymRunner.startGym(gyms[index], true);
    },
    status: () => gymTarget?.town ?? '',
});

// ---------------------------------------------------------------- auto dungeon

let dungeonTarget: { name: string; entered: boolean; clears: number } | null = null;

const clearsOf = (ctx: AutomationContext, name: string): number => {
    const { App } = ctx.g;
    return App.game.statistics.dungeonsCleared[ctx.w.GameConstants.getDungeonIndex(name)]();
};

// Breadth-first search over the floor grid from the player's tile; returns the closest
// tile matching `want`, or null.
const nearest = (board: any[][], from: { x: number; y: number }, want: (t: any) => boolean): any => {
    const size = board.length;
    const seen = new Set<number>([from.y * size + from.x]);
    const queue = [[from.x, from.y]];
    while (queue.length) {
        const [x, y] = queue.shift();
        const tile = board[y][x];
        if (want(tile)) return tile;
        [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].forEach(([nx, ny]) => {
            if (nx < 0 || ny < 0 || nx >= size || ny >= size || seen.has(ny * size + nx)) return;
            seen.add(ny * size + nx);
            queue.push([nx, ny]);
        });
    }
    return null;
};

const stepDungeon = (ctx: AutomationContext) => {
    const { DungeonRunner, DungeonBattle } = ctx.g;
    if (DungeonRunner.fighting() || DungeonBattle.catching() || DungeonRunner.fightingBoss() || DungeonRunner.dungeonFinished()) return;
    const T = ctx.w.GameConstants.DungeonTileType;
    const map = DungeonRunner.map;
    const pos = map.playerPosition();
    const board = map.board()[pos.floor];
    const mode = ctx.opt('mode');
    const minTier = Math.max(0, TIERS.indexOf(ctx.opt('tier')));

    const wantChest = (t: any) => mode !== 'boss' && t.type() === T.chest && TIERS.indexOf(t.metadata?.tier) >= minTier;
    const wantEnemy = (t: any) => mode === 'all' && t.type() === T.enemy;
    const isExit = (t: any) => t.type() === T.boss || t.type() === T.ladder;

    const here = map.currentTile();
    if (wantChest(here)) {
        DungeonRunner.openChest();
        return;
    }
    const goal = nearest(board, pos, (t) => wantChest(t) || wantEnemy(t)) ?? nearest(board, pos, isExit);
    if (!goal) return;
    if (goal === here) {
        if (here.type() === T.boss) DungeonRunner.startBossFight();
        else if (here.type() === T.ladder) DungeonRunner.nextFloor();
        return;
    }
    // Shortest path, around wild Pokémon unless fights are wanted; falls back to any path.
    const adjacent = (p: any) => p && Math.abs(p.x - pos.x) + Math.abs(p.y - pos.y) === 1;
    let path: any[] = mode === 'all' ? [] : map.findShortestPath(pos, goal.position, [T.enemy]);
    if (!adjacent(path[0])) path = map.findShortestPath(pos, goal.position);
    if (!adjacent(path[0])) return;
    // Visited tiles can be crossed in one move, as with a tap on the map.
    const next = path.find((p) => !board[p.y][p.x].isVisited) ?? path[path.length - 1];
    map.moveToCoordinates(next.x, next.y);
};

Automation.register({
    id: 'autoDungeon',
    group: 'vanilla',
    name: { fr: 'Auto-donjon', en: 'Auto dungeon' },
    description: {
        fr: 'Explore en boucle le donjon ouvert et paie l\'entrée en jetons. S\'arrête si vous quittez le donjon, perdez ou manquez de jetons. Activez aussi l\'auto-clic pour aller plus vite.',
        en: 'Runs the open dungeon in a loop and pays the token entry. Stops when you leave, lose or run out of tokens. Turn the auto clicker on too for speed.',
    },
    intervalMs: 100,
    options: [
        {
            key: 'mode',
            label: { fr: 'Parcours', en: 'Route' },
            type: 'select',
            default: 'chests',
            choices: [
                { value: 'boss', label: { fr: 'Boss direct', en: 'Straight to the boss' } },
                { value: 'chests', label: { fr: 'Coffres puis boss', en: 'Chests, then boss' } },
                { value: 'all', label: { fr: 'Tout : combats, coffres, boss', en: 'Everything: fights, chests, boss' } },
            ],
        },
        {
            key: 'tier',
            label: { fr: 'Coffres à ouvrir', en: 'Chests to open' },
            type: 'select',
            default: 'common',
            choices: [
                { value: 'common', label: { fr: 'Tous', en: 'All' } },
                { value: 'rare', label: { fr: 'Rares et mieux', en: 'Rare and up' } },
                { value: 'epic', label: { fr: 'Épiques et mieux', en: 'Epic and up' } },
                { value: 'legendary', label: { fr: 'Légendaires et mieux', en: 'Legendary and up' } },
                { value: 'mythic', label: { fr: 'Mythiques seulement', en: 'Mythic only' } },
            ],
        },
    ],
    enable: (ctx) => {
        const { App, player, DungeonRunner, DungeonTown, DungeonGuides } = ctx.g;
        Automation.find('autoGym')?.enabled(false);
        const G = GS(ctx);
        dungeonTarget = null;
        if (DungeonGuides.hired()) {
            ctx.stop(MSG.guide);
            return;
        }
        let name: string | null = null;
        if (App.game.gameState === G.dungeon) name = DungeonRunner.dungeon?.name ?? null;
        else if (App.game.gameState === G.town && player.town instanceof DungeonTown && player.town.dungeon?.isUnlocked()) name = player.town.dungeon.name;
        if (!name) {
            ctx.stop(MSG.noDungeon);
            return;
        }
        // Already inside: count this run.
        const inside = App.game.gameState === G.dungeon;
        dungeonTarget = { name, entered: inside, clears: clearsOf(ctx, name) };
    },
    disable: () => { dungeonTarget = null; },
    tick: (ctx) => {
        if (!dungeonTarget) return;
        const { App, player, DungeonRunner, DungeonGuides } = ctx.g;
        const G = GS(ctx);
        const state = App.game.gameState;
        if (state === G.dungeon) {
            if (DungeonRunner.dungeon?.name !== dungeonTarget.name) {
                ctx.stop(MSG.dungeonLeft);
                return;
            }
            stepDungeon(ctx);
            return;
        }
        if (state !== G.town || player.town.name !== dungeonTarget.name) {
            ctx.stop(MSG.dungeonLeft);
            return;
        }
        if (dungeonTarget.entered && clearsOf(ctx, dungeonTarget.name) <= dungeonTarget.clears) {
            ctx.stop(MSG.dungeonLost);
            return;
        }
        if (DungeonGuides.hired()) {
            ctx.stop(MSG.guide);
            return;
        }
        const dungeon = player.town.dungeon;
        if (!DungeonRunner.hasEnoughTokens(dungeon)) {
            ctx.stop(MSG.noTokens);
            return;
        }
        if (!DungeonRunner.canStartDungeon(dungeon)) {
            ctx.stop(MSG.noDungeon);
            return;
        }
        dungeonTarget.entered = true;
        dungeonTarget.clears = clearsOf(ctx, dungeonTarget.name);
        DungeonRunner.initializeDungeon(dungeon);
    },
    status: () => dungeonTarget?.name ?? '',
});

// ---------------------------------------------------------------- Battle Frontier

// autobattlefrontier.user.js: starts a new run when the previous one ended in a loss.
// A run left with « Quit Battle » keeps its checkpoint and waits for the player.
Automation.register({
    id: 'autoFrontier',
    group: 'vanilla',
    name: { fr: 'Auto Frontier', en: 'Auto Frontier' },
    description: {
        fr: 'Dans la Battle Frontier, relance une partie depuis l’étape 1 après chaque défaite. Une partie quittée garde son point de reprise et attend.',
        en: 'In the Battle Frontier, starts a new run from stage 1 after each loss. A run you quit keeps its checkpoint and waits.',
    },
    intervalMs: 1000,
    tick: (ctx) => {
        const { App } = ctx.g;
        const Runner = ctx.g.BattleFrontierRunner;
        if (!Runner || App.game.gameState !== GS(ctx).battleFrontier || Runner.started()) return;
        if (Runner.hasCheckpoint()) return;
        Runner.start(false);
    },
    status: (ctx) => {
        const Runner = ctx.g.BattleFrontierRunner;
        return Runner?.started() ? `${ctx.g.App.game.statistics.battleFrontierHighestStageCompleted()}` : '';
    },
});

// Frontier cheats: the timer stays full; damage multiplied (or one hit).
Automation.register({
    id: 'frontierTimeFreeze',
    group: 'custom',
    name: { fr: 'Frontier : temps figé', en: 'Frontier: frozen timer' },
    description: {
        fr: 'Le chronomètre de la Battle Frontier ne descend plus.',
        en: 'The Battle Frontier timer no longer runs down.',
    },
    warning: {
        fr: 'Change les règles du jeu tant que c’est actif. Rien n’est écrit dans la sauvegarde.',
        en: 'Changes the game rules while enabled. Nothing is written to the save.',
    },
    intervalMs: 250,
    tick: (ctx) => {
        const Runner = ctx.g.BattleFrontierRunner;
        if (!Runner?.started()) return;
        Runner.timeLeft(ctx.w.GameConstants.GYM_TIME);
        Runner.timeLeftPercentage(100);
    },
});

let frontierDamage = 1;
let frontierPatched = false;
const patchFrontierDamage = (ctx: AutomationContext) => {
    const party = ctx.g.App?.game?.party;
    if (frontierPatched || !party) return;
    frontierPatched = true;
    const original = party.calculatePokemonAttack.bind(party);
    party.calculatePokemonAttack = (...args: any[]) => {
        const base = original(...args);
        return frontierDamage > 1 && ctx.g.App.game.gameState === GS(ctx).battleFrontier ? base * frontierDamage : base;
    };
};

Automation.register({
    id: 'frontierDamage',
    group: 'custom',
    name: { fr: 'Frontier : dégâts', en: 'Frontier: damage' },
    description: {
        fr: 'Multiplie les dégâts de votre équipe dans la Battle Frontier (ou met K.O. en un coup).',
        en: 'Multiplies your team’s damage in the Battle Frontier (or knocks out in one hit).',
    },
    warning: {
        fr: 'Change les règles du jeu tant que c’est actif. Rien n’est écrit dans la sauvegarde.',
        en: 'Changes the game rules while enabled. Nothing is written to the save.',
    },
    options: [
        {
            key: 'mode',
            label: { fr: 'Dégâts', en: 'Damage' },
            type: 'select',
            default: 'ko',
            choices: [
                { value: 'ko', label: { fr: 'K.O. en un coup', en: 'One-hit K.O.' } },
                ...[2, 10, 100].map((n) => ({ value: String(n), label: { fr: `×${n}`, en: `×${n}` } })),
            ],
        },
    ],
    intervalMs: 1000,
    enable: (ctx) => { patchFrontierDamage(ctx); frontierDamage = ctx.opt('mode') === 'ko' ? 1e15 : Math.max(1, Number(ctx.opt('mode')) || 1); },
    tick: (ctx) => { frontierDamage = ctx.opt('mode') === 'ko' ? 1e15 : Math.max(1, Number(ctx.opt('mode')) || 1); },
    disable: () => { frontierDamage = 1; },
    status: (ctx) => (ctx.opt('mode') === 'ko' ? 'K.O.' : `×${ctx.opt('mode')}`),
});
