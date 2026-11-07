/* eslint-disable @typescript-eslint/no-explicit-any */
// Auto Safari, from autosafarizone.user.js 1.2.4 (Kanzen01, Ephenia/Pokeclicker-Scripts,
// GPL-3.0). Same behaviour, rewritten against the current game API:
// - berries are read from `farming.berryInventory` (was `berryList`);
// - one scheduler instead of a private setInterval, time-based waits instead of tick counts;
// - entering needs the player in a Safari town, like the original; the entrance fee is the
//   game's own (quest points), paid again when the balls run out unless asked not to;
// - leaving the Safari with its Leave button switches the automation off.
// Order of the original: walk to a visible shiny, pick the items up before the last ball,
// otherwise walk to the nearest encounter tiles (grass or water) and fight what comes.
import Automation, { AutomationContext } from './Automation';

const say = (fr: string, en: string) => ({ fr, en });

const MSG = {
    noSafari: say(
        'Allez dans la ville d’une zone Safari (Pass Safari requis), puis activez l’Auto Safari.',
        'Go to a Safari Zone town (Safari Pass needed), then switch Auto Safari on.',
    ),
    elsewhere: say(
        'Une partie de Safari est en cours dans une autre région : terminez-la ou quittez-la d’abord.',
        'A Safari run is active in another region: finish or leave it first.',
    ),
    cannotPay: say('Pas assez de points de quête pour l’entrée : Auto Safari arrêté.', 'Not enough quest points for the entrance: Auto Safari stopped.'),
    done: say('Plus de Safari Balls : Auto Safari arrêté.', 'Out of Safari Balls: Auto Safari stopped.'),
    lost: say('Aucun chemin vers une rencontre sur cette carte : Auto Safari arrêté.', 'No path to an encounter on this map: Auto Safari stopped.'),
};

const enum Mode { None, Encounters, Items, Shiny }

const state = {
    mode: Mode.None,
    target: null as [number, number] | null,
    path: [] as string[],
    skipItems: false,
    skipShinies: [] as any[],
    // -1: no priority spawns on this map, 1: some, 0: to compute
    priority: 0,
    priorityTiles: [] as number[],
    tiles: null as Set<number> | null,
    inBattle: false,
    waitUntil: 0,
    awaiting: false,
    lastStep: 0,
};

function reset() {
    Object.assign(state, {
        mode: Mode.None, target: null, path: [], skipItems: false, skipShinies: [], priority: 0,
        priorityTiles: [], tiles: null, inBattle: false, waitUntil: 0, awaiting: false, lastStep: 0,
    });
}

// ---------------------------------------------------------------- fast animations

let baseSpeeds: Record<string, number> | null = null;
let baseMove = 0;
function applyFastAnimations(ctx: AutomationContext, on: boolean) {
    const { Safari, SafariBattle } = ctx.g;
    if (!Safari || !SafariBattle) return;
    if (!baseSpeeds) {
        baseSpeeds = { ...SafariBattle.Speed };
        baseMove = Safari.moveSpeed;
    }
    Object.keys(baseSpeeds).forEach((k) => { SafariBattle.Speed[k] = on ? baseSpeeds[k] / 2 : baseSpeeds[k]; });
    Safari.moveSpeed = on ? baseMove / 2 : baseMove;
}

// ---------------------------------------------------------------- map helpers

function inMap(ctx: AutomationContext, row: number, col: number) {
    const grid = ctx.g.Safari.grid;
    return row >= 0 && row < grid.length && col >= 0 && col < grid[0].length;
}

// Breadth-first search from the player to the closest tile passing `isTarget`.
function pathTo(ctx: AutomationContext, isTarget: (row: number, col: number) => boolean): [[number, number] | null, string[]] {
    const { Safari } = ctx.g;
    const walk = ctx.w.GameConstants.SAFARI_LEGAL_WALK_BLOCKS;
    const start = Safari.playerXY;
    const seen = new Set<string>([`${start.y}-${start.x}`]);
    const queue: [number, number, string[]][] = [[start.y, start.x, []]];
    while (queue.length) {
        const [row, col, path] = queue.shift();
        if (path.length && isTarget(row, col)) return [[row, col], path];
        const next: [number, number, string][] = [[row - 1, col, 'up'], [row + 1, col, 'down'], [row, col - 1, 'left'], [row, col + 1, 'right']];
        for (const [r, c, dir] of next) {
            const key = `${r}-${c}`;
            if (inMap(ctx, r, c) && !seen.has(key) && walk.includes(Safari.grid[r][c])) {
                seen.add(key);
                queue.push([r, c, path.concat(dir)]);
            }
        }
    }
    return [null, []];
}

// A lone encounter tile (no neighbour of the same kind) is a map glitch: skip it.
function isolated(ctx: AutomationContext, row: number, col: number) {
    const { Safari } = ctx.g;
    const T = ctx.w.GameConstants.SafariTile;
    const water = ctx.w.GameConstants.SAFARI_WATER_BLOCKS;
    const tile = Safari.grid[row][col];
    let same: (t: number) => boolean;
    if (T.waterUL <= tile && tile <= T.waterDR) same = (t) => water.includes(t);
    else if (T.sandUL <= tile && tile <= T.sandULinverted) same = (t) => T.sandUL <= t && t <= T.sandULinverted;
    else if (T.fenceUL <= tile && tile <= T.fenceDLend) same = (t) => T.fenceUL <= t && t <= T.fenceDLend;
    else if (T.treeTopL <= tile && tile <= T.treeRootsR) same = (t) => T.treeTopL <= t && t <= T.treeRootsR;
    else same = (t) => t === tile;
    return ![[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]]
        .some(([r, c]) => inMap(ctx, r, c) && same(Safari.grid[r][c]));
}

function isPriority(ctx: AutomationContext, name: string) {
    const { App } = ctx.g;
    return (ctx.opt('seekNew') && !App.game.party.alreadyCaughtPokemonByName(name))
        || (ctx.opt('seekPokerus') && App.game.party.getPokemonByName(name)?.pokerus === ctx.w.GameConstants.Pokerus.Contagious);
}

// Bug Catching Contest (Johto): the environment with the best contest reward for the
// player's highest region, computed once per region like the original.
const contestEnv: Record<number, number> = {};
function bestContestEnvironment(ctx: AutomationContext): number {
    const { player, SafariPokemonList } = ctx.g;
    const { GameConstants, SafariEnvironments, PokemonHelper, pokemonMap } = ctx.w;
    const region = player.highestRegion();
    if (contestEnv[region] === undefined) {
        let [grassVal, waterVal, grassW, waterW] = [0, 0, 0, 0];
        for (const e of SafariPokemonList.list[GameConstants.Region.johto]()) {
            if (PokemonHelper.calcNativeRegion(e.name) > region) continue;
            const reward = Math.floor(pokemonMap[e.name].attack / 5);
            if (e.environments.includes(SafariEnvironments.Grass)) { grassVal += reward; grassW += e.weight; }
            if (e.environments.includes(SafariEnvironments.Water)) { waterVal += reward; waterW += e.weight; }
        }
        contestEnv[region] = (grassVal / grassW) > (waterVal / waterW) ? SafariEnvironments.Grass : SafariEnvironments.Water;
    }
    return contestEnv[region];
}

function encounterTiles(ctx: AutomationContext): number[] {
    const { player, SafariPokemonList } = ctx.g;
    const { GameConstants, SafariEnvironments } = ctx.w;
    const grass = GameConstants.SafariTile.grass;
    const water: number[] = GameConstants.SAFARI_WATER_BLOCKS;
    if (!state.tiles) state.tiles = new Set(ctx.g.Safari.grid.flat());
    if (player.town.name === 'Hoppy Town Fishing Pond' && !state.tiles.has(grass)) return [...water];
    if ((ctx.opt('seekNew') || ctx.opt('seekPokerus')) && state.priority > -1) {
        if (state.priority === 0) {
            let [grassP, waterP, grassT, waterT] = [0, 0, 0, 0];
            let grassOnly = false;
            let waterOnly = false;
            SafariPokemonList.list[player.region]().filter((p: any) => p.isAvailable()).forEach((p: any) => {
                const g = p.environments.includes(SafariEnvironments.Grass);
                const w = p.environments.includes(SafariEnvironments.Water);
                grassT += +g * p.weight;
                waterT += +w * p.weight;
                if (isPriority(ctx, p.name)) {
                    grassP += +g * p.weight;
                    waterP += +w * p.weight;
                    if (!(g && w)) { grassOnly ||= g; waterOnly ||= w; }
                }
            });
            if (grassOnly === waterOnly) {
                const g = grassP / grassT;
                const w = waterP / waterT;
                state.priorityTiles = g === w ? [grass, ...water] : (g > w ? [grass] : [...water]);
            } else {
                state.priorityTiles = grassOnly ? [grass] : [...water];
            }
            state.priority = grassP === 0 && waterP === 0 ? -1 : 1;
        }
        if (state.priority === 1) return state.priorityTiles;
    }
    if (player.town.name === 'National Park') {
        return bestContestEnvironment(ctx) === SafariEnvironments.Grass ? [grass] : [...water];
    }
    return [grass, ...water];
}

// ---------------------------------------------------------------- exploring

function step(ctx: AutomationContext, now: number) {
    const { Safari } = ctx.g;
    if (Safari.isMoving || now - state.lastStep < Safari.moveSpeed + 25 || !state.path.length) return;
    state.lastStep = now;
    Safari.step(state.path.shift());
}

function explore(ctx: AutomationContext, now: number) {
    const { Safari } = ctx.g;
    state.inBattle = false;
    const at = (list: any[]) => new Set(list.map(({ x, y }) => `${y}-${x}`));
    const stillThere = (list: any[]) => state.target && list.some((p) => p.y === state.target[0] && p.x === state.target[1]);

    const shinies = Safari.pokemonGrid().filter((p: any) => p.shiny && !state.skipShinies.includes(p));
    if (shinies.length) {
        if (state.mode !== Mode.Shiny || !state.path.length || !stillThere(Safari.pokemonGrid())) {
            state.mode = Mode.Shiny;
            const spots = at(shinies);
            [state.target, state.path] = pathTo(ctx, (r, c) => spots.has(`${r}-${c}`));
        }
        if (state.path.length) step(ctx, now);
        else state.skipShinies.push(...shinies);
        return;
    }
    if (ctx.opt('pickItems') && Safari.itemGrid().length && Safari.balls() === 1 && !state.skipItems) {
        if (state.mode !== Mode.Items || !state.path.length || !stillThere(Safari.itemGrid())) {
            state.mode = Mode.Items;
            const spots = at(Safari.itemGrid());
            [state.target, state.path] = pathTo(ctx, (r, c) => spots.has(`${r}-${c}`));
        }
        if (state.path.length) step(ctx, now);
        else state.skipItems = true;
        return;
    }
    if (state.mode !== Mode.Encounters || !state.path.length) {
        state.mode = Mode.Encounters;
        const tiles = new Set(encounterTiles(ctx));
        [state.target, state.path] = pathTo(ctx, (r, c) => tiles.has(Safari.grid[r][c]) && !isolated(ctx, r, c));
    }
    if (state.path.length) step(ctx, now);
    else ctx.stop(MSG.lost);
}

// ---------------------------------------------------------------- encounters

function fight(ctx: AutomationContext, now: number) {
    const { App, Safari, SafariBattle, BaitList, BaitType } = ctx.g;
    const { BerryType } = ctx.w;
    if (SafariBattle.busy()) return;
    const enemy = SafariBattle.enemy;
    if (!state.inBattle) {
        // Let the encounter window settle before the first action (animation glitches).
        state.inBattle = true;
        state.waitUntil = now + 300;
        document.querySelectorAll('#safariBattleModal #safariBall').forEach((ball) => ball.remove());
        return;
    }
    const berries = (type: number) => App.game.farming.berryInventory[type]();
    const bait = (which: any) => { SafariBattle.selectedBait(which); SafariBattle.throwBait(); };
    const forceRun = !enemy.shiny && (state.mode !== Mode.Encounters
        || (Safari.balls() === 1 && ctx.opt('pickItems') && Safari.itemGrid().length > 0 && !state.skipItems));
    const priority = isPriority(ctx, enemy.name);
    let threwBall = false;

    if (enemy.shiny) {
        if (!(enemy.angry || enemy.eating || enemy.eatingBait !== BaitType.Bait)) {
            if (berries(BerryType.Nanab) > 5) bait(BaitList.Nanab);
            else if (berries(BerryType.Razz) > 5) bait(BaitList.Razz);
            else if (Safari.balls() > 2) bait(BaitList.Bait);
            else SafariBattle.throwRock();
        } else if (!enemy.angry && Safari.balls() <= 2) {
            SafariBattle.throwRock();
        } else {
            threwBall = true;
            SafariBattle.throwBall();
        }
    } else if (ctx.opt('throwBait') && !priority && !(enemy.eating || enemy.angry) && App.game.statistics.safariBaitThrown() < 1000) {
        // Bait achievement grind (1000 throws).
        bait(BaitList.Bait);
    } else if (forceRun || ((ctx.opt('seekNew') || ctx.opt('seekPokerus')) && state.priority === 1 && !priority)) {
        SafariBattle.run();
    } else if (enemy.angry === 0) {
        // Turn 1 on a priority Pokémon: a berry first (Nanab, then Razz), then a rock.
        if (ctx.opt('throwBait') && priority && !(enemy.eating || enemy.eatingBait !== BaitType.Bait)) {
            if (berries(BerryType.Nanab) > 25 && enemy.catchFactor < 100 / (2 + enemy.levelModifier)) {
                bait(BaitList.Nanab);
                return;
            }
            if (berries(BerryType.Razz) > 25) {
                bait(BaitList.Razz);
                return;
            }
        }
        SafariBattle.throwRock();
    } else {
        threwBall = true;
        SafariBattle.throwBall();
    }

    if (!threwBall) return;
    if (Safari.balls() <= 0) {
        if (!ctx.opt('repeat')) {
            ctx.stop(MSG.done);
        } else {
            // Leave time for the game-over sequence before entering again (the original
            // waited 40 ticks of 275 ms, scaled by the Safari level speed tier).
            state.waitUntil = now + 11000 * SafariBattle.tierMultiplier(Safari.safariLevel());
        }
        if (Safari.balls() < 0) SafariBattle.gameOver();
    } else if (priority && state.priority === 1) {
        // A priority Pokémon may just have been caught: re-evaluate the tiles.
        state.priority = 0;
    }
}

// ---------------------------------------------------------------- entering

function inSafariTown(ctx: AutomationContext) {
    const { player, SafariTownContent } = ctx.g;
    return !player.route && !!player.town?.content?.some((c: any) => c instanceof SafariTownContent);
}

function enter(ctx: AutomationContext) {
    const { Safari, player } = ctx.g;
    const $ = ctx.w.$;
    if (!Safari.canAccess() || !inSafariTown(ctx)) {
        ctx.stop(MSG.noSafari);
        return;
    }
    if (Safari.inProgress() && Safari.activeRegion() !== player.region) {
        ctx.stop(MSG.elsewhere);
        return;
    }
    if ($('#safariModal').data('bs.modal')?._isShown) {
        if (!Safari.inProgress()) {
            if (!Safari.canPay()) {
                ctx.stop(MSG.cannotPay);
                return;
            }
            Safari.payEntranceFee();
            state.skipItems = false;
            state.path = [];
            state.priority = 0;
            state.tiles = null;
        }
        state.awaiting = false;
        return;
    }
    state.awaiting = true;
    window.setTimeout(() => { state.awaiting = false; }, 5000);
    $('#safariModal').one('shown.bs.modal', () => { state.awaiting = false; });
    const modal = ctx.w.DisplayObservables.modalState.safariModal;
    if (modal === 'hidden') Safari.openModal();
    else if (modal === 'hide') $('#safariModal').one('hidden.bs.modal', () => Safari.openModal());
}

// The game tracks a modal's state from the first time it is read; read before the Safari
// window is opened, it would otherwise miss that opening (the original did the same).
const touchModalState = () => (window as any).DisplayObservables?.modalState?.safariModal;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => window.setTimeout(touchModalState));
else window.setTimeout(touchModalState);

const safariShown = (ctx: AutomationContext) => ctx.w.DisplayObservables.modalState.safariModal === 'show'
    || !!ctx.w.$('#safariModal').data('bs.modal')?._isShown;

// ---------------------------------------------------------------- feature

let leaveHooked = false;

Automation.register({
    id: 'autoSafari',
    group: 'vanilla',
    name: { fr: 'Auto Safari', en: 'Auto Safari' },
    description: {
        fr: 'Dans une zone Safari : paie l’entrée, marche vers les rencontres, capture (caillou puis Ball), va chercher les shiny visibles et ramasse les objets avant la dernière Ball.',
        en: 'In a Safari Zone: pays the entrance, walks to encounters, catches (rock then ball), goes for visible shinies and picks items up before the last ball.',
    },
    intervalMs: 50,
    options: [
        { key: 'pickItems', label: { fr: 'Ramasser les objets', en: 'Pick items up' }, type: 'boolean', default: true },
        { key: 'throwBait', label: { fr: 'Lancer des appâts (succès, baies sur les cibles)', en: 'Throw bait (achievement, berries on targets)' }, type: 'boolean', default: false },
        { key: 'seekNew', label: { fr: 'Chercher les Pokémon non capturés', en: 'Seek uncaught Pokémon' }, type: 'boolean', default: false },
        { key: 'seekPokerus', label: { fr: 'Chercher le Pokérus contagieux', en: 'Seek contagious Pokérus' }, type: 'boolean', default: false },
        { key: 'fastAnim', label: { fr: 'Animations ×2', en: 'Animations ×2' }, type: 'boolean', default: false },
        { key: 'repeat', label: { fr: 'Repayer l’entrée à la fin des Balls', en: 'Pay again when the balls run out' }, type: 'boolean', default: true },
    ],
    available: (ctx) => !!ctx.g.Safari?.canAccess?.(),
    unavailable: say('Pass Safari requis (arène de Parmanie).', 'Safari Pass needed (Fuchsia City gym).'),
    enable: (ctx) => {
        reset();
        applyFastAnimations(ctx, !!ctx.opt('fastAnim'));
        if (!leaveHooked) {
            leaveHooked = true;
            // The Safari's own Leave button means « stop ».
            document.addEventListener('click', (e) => {
                if ((e.target as Element)?.closest?.('#safariModal .modalClose')) Automation.find('autoSafari')?.enabled(false);
            }, { capture: true });
        }
        if (!inSafariTown(ctx) && !ctx.g.Safari.inBattle()) ctx.stop(MSG.noSafari);
    },
    disable: (ctx) => {
        applyFastAnimations(ctx, false);
        reset();
    },
    tick: (ctx) => {
        const { Safari, player } = ctx.g;
        const now = Date.now();
        if (now < state.waitUntil || state.awaiting) return;
        const fast = !!ctx.opt('fastAnim');
        if ((baseSpeeds ? Safari.moveSpeed < baseMove : false) !== fast) applyFastAnimations(ctx, fast);
        if (!Safari.inProgress() || Safari.activeRegion() !== player.region || !safariShown(ctx)) {
            enter(ctx);
        } else if (Safari.inBattle()) {
            fight(ctx, now);
        } else {
            explore(ctx, now);
        }
    },
    status: (ctx) => {
        const { Safari } = ctx.g;
        return Safari?.inProgress?.() ? `${Safari.balls()} Balls` : '';
    },
});
