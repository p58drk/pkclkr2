/* eslint-disable @typescript-eslint/no-explicit-any */
// Redesign shell: six task pages, a combat dock and a mini combat bar.
// Upstream modules are never rewritten: their root elements are relocated into
// the shell's slots before Knockout applies its bindings. Any module the map
// below does not know about falls back to the Activities page, so upstream
// additions stay reachable after a merge.
import GameLoadState from '../utilities/GameLoadState';
import { label, LabelKey } from './labels';

const w = window as any;

// Script-level globals (`class App`, `let player`, ...) live in the global lexical
// scope, not on window: resolve them once the game has loaded.
const resolveScriptGlobals = (): any => {
    // eslint-disable-next-line no-eval
    const get = (name: string) => { try { return (0, eval)(`typeof ${name} !== 'undefined' ? ${name} : undefined`); } catch { return undefined; } };
    return {
        App: get('App'),
        player: get('player'),
        Save: get('Save'),
        GymBattle: get('GymBattle'),
        DungeonRunner: get('DungeonRunner'),
        TemporaryBattleBattle: get('TemporaryBattleBattle'),
        AchievementHandler: get('AchievementHandler'),
    };
};

export type PageId = 'combat' | 'progress' | 'items' | 'pokemon' | 'activities' | 'menu';
export const PAGES: PageId[] = ['combat', 'progress', 'items', 'pokemon', 'activities', 'menu'];

const STORAGE_ENABLED = 'rd.enabled';
const STORAGE_PAGE = 'rd.page';

// Slot id -> upstream root ids, in display order.
const SLOTS: Record<string, string[]> = {
    'rd-dock-fight': ['battleContainer', 'dungeonMap', 'battleFrontierInformation'],
    'rd-dock-balls': ['pokeballSelector'],
    'rd-dock-currency': ['currencyContainer'],
    'rd-slot-combat': ['middle-bottom-sort-column'],
    'rd-slot-progress': ['questDisplayContainer', 'achivementTrackerContainer'],
    'rd-slot-items': ['oakItemsContainer', 'battleItemContainer'],
    'rd-slot-pokemon': ['pokemonListContainer'],
    'rd-slot-activities': ['breedingDisplay', 'farmDisplay', 'undergroundDisplay', 'shortcutsContainer'],
};

const UPSTREAM_COLUMNS = ['left-column', 'left-column-2', 'middle-top-sort-column', 'right-column', 'right-column-2'];

// Energy colours per PokemonType index (Normal = 0 ... Fairy = 17), tuned for the dark ground.
export const ENERGY = [
    '#a8a77a', '#ee8130', '#6390f0', '#f7d02c', '#7ac74c', '#96d9d6',
    '#c22e28', '#a33ea1', '#e2bf65', '#a98ff3', '#f95587', '#a6b91a',
    '#b6a136', '#735797', '#6f35fc', '#705746', '#b7b7ce', '#d685ad',
];

export default class RedesignShell {
    static readonly enabled: boolean = localStorage.getItem(STORAGE_ENABLED) !== '0';

    static refs: KnockoutObservable<any> = ko.observable(null);

    static page: KnockoutObservable<PageId> = ko.observable(RedesignShell.readPage());

    static label = (key: LabelKey) => label(key);

    private static readPage(): PageId {
        const saved = localStorage.getItem(STORAGE_PAGE) as PageId;
        return PAGES.includes(saved) ? saved : 'combat';
    }

    static go(page: PageId) {
        RedesignShell.page(page);
        localStorage.setItem(STORAGE_PAGE, page);
        document.getElementById('rd-main')?.scrollTo({ top: 0 });
    }

    static setClassic(classic: boolean) {
        localStorage.setItem(STORAGE_ENABLED, classic ? '0' : '1');
        const r = RedesignShell.refs();
        r?.Save?.store?.(r.player);
        window.location.reload();
    }

    // ----- Battle state for the top bar and the mini bar -----

    private static state(): number {
        return RedesignShell.refs()?.App?.game?.gameState ?? -1;
    }

    static isFighting = ko.pureComputed(() => {
        const GS = w.GameConstants?.GameState;
        if (!GS) return false;
        const s = RedesignShell.state();
        return [GS.fighting, GS.gym, GS.dungeon, GS.temporaryBattle, GS.battleFrontier].includes(s);
    });

    static foe = ko.pureComputed(() => {
        if (!RedesignShell.isFighting()) return null;
        return w.Battle?.enemyPokemon?.() ?? null;
    });

    static regionName = ko.pureComputed(() => {
        try {
            const { player } = RedesignShell.refs();
            return w.GameConstants.camelCaseToString(w.GameConstants.Region[player.region]);
        } catch {
            return '';
        }
    });

    static locationName = ko.pureComputed(() => {
        try {
            const { player } = RedesignShell.refs();
            const GS = w.GameConstants.GameState;
            if (RedesignShell.state() === GS.fighting) {
                return w.Routes.getName(player.route, player.region);
            }
            return player.town?.name ?? '';
        } catch {
            return '';
        }
    });

    static routeKills = ko.pureComputed(() => {
        try {
            const { App, player } = RedesignShell.refs();
            const GS = w.GameConstants.GameState;
            if (RedesignShell.state() !== GS.fighting) return null;
            return App.game.statistics.routeKills[player.region][player.route]();
        } catch {
            return null;
        }
    });

    static typeName(type: number): string {
        return type >= 0 ? (w.PokemonType?.[type] ?? '') : '';
    }

    static attack() {
        const GS = w.GameConstants?.GameState;
        const r = RedesignShell.refs();
        if (!GS || !r) return;
        switch (RedesignShell.state()) {
            case GS.fighting: w.Battle?.clickAttack?.(); break;
            case GS.gym: r.GymBattle?.clickAttack?.(); break;
            case GS.dungeon: r.DungeonRunner?.handleInteraction?.(); break;
            case GS.temporaryBattle: r.TemporaryBattleBattle?.clickAttack?.(); break;
            default: break;
        }
    }

    static formatNumber(n: number): string {
        if (n == null || Number.isNaN(n)) return '';
        return Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
    }

    // ----- Boot -----

    // Returns the nodes to move for an element: the element itself, or the whole
    // `<!-- ko ... --> ... <!-- /ko -->` block(s) that wrap it, so Knockout's
    // virtual-element guards (if/foreach) travel with the module.
    private static unitFor(el: Element): Node[] {
        const isBlank = (n: Node) => n.nodeType === Node.TEXT_NODE && !n.textContent.trim();
        const prevSig = (n: Node) => { let p = n.previousSibling; while (p && isBlank(p)) p = p.previousSibling; return p; };
        const nextSig = (n: Node) => { let p = n.nextSibling; while (p && isBlank(p)) p = p.nextSibling; return p; };
        let first: Node = el;
        let last: Node = el;
        for (;;) {
            const open = prevSig(first);
            const close = nextSig(last);
            const opens = open?.nodeType === Node.COMMENT_NODE && /^\s*ko\s/.test(open.textContent);
            const closes = close?.nodeType === Node.COMMENT_NODE && /^\s*\/ko\s*$/.test(close.textContent);
            if (!opens || !closes) break;
            first = open;
            last = close;
        }
        const nodes: Node[] = [];
        for (let n: Node = first; n; n = n.nextSibling) {
            nodes.push(n);
            if (n === last) break;
        }
        return nodes;
    }

    private static moveInto(el: Element, slot: Element) {
        if (el.parentElement === slot) return;
        RedesignShell.unitFor(el).forEach((n) => slot.appendChild(n));
    }

    static relocate() {
        Object.entries(SLOTS).forEach(([slotId, ids]) => {
            const slot = document.getElementById(slotId);
            if (!slot) return;
            ids.forEach((id) => {
                const el = document.getElementById(id);
                if (el) RedesignShell.moveInto(el, slot);
            });
        });
        // Fallback: anything upstream adds to a column lands on Activities.
        const fallback = document.getElementById('rd-slot-activities');
        UPSTREAM_COLUMNS.forEach((col) => {
            const column = document.getElementById(col);
            column?.querySelectorAll(':scope > .card').forEach((card) => fallback && RedesignShell.moveInto(card, fallback));
        });
        // The start menu's item list becomes the Menu page's game section.
        const list = document.querySelector('#startMenu .dropdown-menu');
        const menuSlot = document.getElementById('rd-menu-game');
        if (list && menuSlot && list.parentElement !== menuSlot) {
            list.classList.remove('dropdown-menu', 'dropdown-menu-right');
            list.classList.add('rd-list');
            menuSlot.appendChild(list);
        }
    }

    static applyFoeColours(foe: any) {
        const root = document.documentElement.style;
        const t1 = foe?.type1 ?? -1;
        const t2 = foe?.type2 ?? -1;
        root.setProperty('--foe', t1 >= 0 ? ENERGY[t1] : 'var(--n5)');
        root.setProperty('--foe-2', t2 >= 0 ? ENERGY[t2] : (t1 >= 0 ? ENERGY[t1] : 'var(--n5)'));
    }

    static boot() {
        if (!RedesignShell.enabled) return;
        document.documentElement.classList.add('rd');

        const onReady = () => {
            // Bootswatch themes are replaced by the redesign skin.
            document.getElementById('theme-link')?.remove();
            const shell = document.getElementById('rd-shell');
            const game = document.getElementById('game');
            if (shell && game && shell.parentElement !== game) game.prepend(shell);
            RedesignShell.relocate();
        };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', onReady);
        } else {
            onReady();
        }

        // Save.load() re-sorts modules into upstream columns: put them back before bindings.
        GameLoadState.onLoadState(GameLoadState.states.initialized, () => {
            RedesignShell.refs(resolveScriptGlobals());
            RedesignShell.relocate();
        });
        GameLoadState.onLoadState(GameLoadState.states.appliedBindings, () => {
            RedesignShell.applyFoeColours(w.Battle?.enemyPokemon?.());
            w.Battle?.enemyPokemon?.subscribe((foe) => RedesignShell.applyFoeColours(foe));
        });
    }
}

RedesignShell.boot();
