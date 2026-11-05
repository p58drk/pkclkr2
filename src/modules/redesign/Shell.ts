/* eslint-disable @typescript-eslint/no-explicit-any */
// Redesign shell: six task pages, a combat dock and a mini combat bar.
// Upstream modules are never rewritten: their root elements are relocated into
// the shell's slots before Knockout applies its bindings. Any module the map
// below does not know about falls back to the Activities page, so upstream
// additions stay reachable after a merge.
import GameLoadState from '../utilities/GameLoadState';
import Information from '../utilities/Information';
import { label, LabelKey, typeLabel } from './labels';
import Automation from './automation/Automation';

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
        DungeonBattle: get('DungeonBattle'),
        TemporaryBattleBattle: get('TemporaryBattleBattle'),
        AchievementHandler: get('AchievementHandler'),
        BreedingController: get('BreedingController'),
        FarmController: get('FarmController'),
        PartyController: get('PartyController'),
        RouteHelper: get('RouteHelper'),
        GymRunner: get('GymRunner'),
        Gym: get('Gym'),
        DungeonTown: get('DungeonTown'),
        DungeonGuides: get('DungeonGuides'),
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
        window.scrollTo({ top: 0 });
    }

    static goToAutomation() {
        RedesignShell.go('menu');
        window.setTimeout(() => document.getElementById('rd-menu-automation')?.scrollIntoView({ block: 'start' }), 0);
    }

    // Shows the page that holds an element, synchronously (Knockout defers its own
    // update, and intro.js measures the target right away).
    static goToElement(el: Element | null) {
        if (!el) return;
        const page = el.closest('.rd-page')?.id?.replace('rd-page-', '') as PageId
            || (el.closest('#rd-dock') ? 'combat' : null);
        if (!page || !PAGES.includes(page)) return;
        document.getElementById('rd-main')?.setAttribute('data-page', page);
        RedesignShell.go(page);
        el.scrollIntoView({ block: 'center' });
    }

    // Upstream tutorial targets that the redesign hides are redirected to their new home.
    static tutorialTarget(el: any): any {
        if (!(el instanceof Element)) return el;
        if (el.id === 'startMenu') {
            const candidates = ['#rd-nav .rd-nav-menu', '#rd-top .rd-top-menu'];
            return candidates.map((sel) => document.querySelector(sel))
                .find((c) => c && (c as HTMLElement).offsetParent !== null) ?? el;
        }
        return el;
    }

    private static patchTutorials() {
        const original = Information.show.bind(Information);
        Information.show = (options: any = {}) => {
            const steps = (options.steps ?? []).map((step: any) => ({ ...step, element: RedesignShell.tutorialTarget(step.element) }));
            RedesignShell.goToElement(steps.find((step: any) => step.element instanceof Element)?.element ?? null);
            const tour: any = original({ ...options, steps });
            tour?.onbeforechange?.((target: Element) => RedesignShell.goToElement(target));
            return tour;
        };
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
        // In a dungeon the last foe stays in Battle.enemyPokemon while the player explores.
        const r = RedesignShell.refs();
        if (RedesignShell.state() === w.GameConstants?.GameState?.dungeon && !r?.DungeonRunner?.fighting?.() && !r?.DungeonBattle?.catching?.()) return null;
        return w.Battle?.enemyPokemon?.() ?? null;
    });

    // Battle Frontier fights on its own; the mini bar shows the foe but has nothing to hit.
    static canAttack = ko.pureComputed(() => {
        const GS = w.GameConstants?.GameState;
        return !!RedesignShell.foe() && RedesignShell.state() !== GS?.battleFrontier;
    });

    // Game state name on the shell (data-state), so styles can follow the battle type.
    static stateName = ko.pureComputed(() => {
        const GS = w.GameConstants?.GameState;
        const s = RedesignShell.state();
        return GS && GS[s] !== undefined ? GS[s] : 'loading';
    });

    // Card line: always present during battles (no layout jump while exploring a dungeon).
    static headName = ko.pureComputed(() => {
        const foe = RedesignShell.foe();
        if (foe) return foe.displayName;
        const r = RedesignShell.refs();
        return r?.DungeonRunner?.dungeon?.name ?? RedesignShell.locationName();
    });

    static headSub = ko.pureComputed(() => {
        if (RedesignShell.foe()) return '';
        const r = RedesignShell.refs();
        if (RedesignShell.state() !== w.GameConstants?.GameState?.dungeon || !r?.DungeonRunner) return '';
        const name = r.DungeonRunner.dungeon?.name;
        const clears = name ? r.App.game.statistics.dungeonsCleared[w.GameConstants.getDungeonIndex(name)]() : 0;
        return `${label('exploring')} · ${RedesignShell.formatNumber(clears)} ${label('clears')}`;
    });

    // Where the quick gym / dungeon toggles make sense.
    static canAutoGym = ko.pureComputed(() => {
        const r = RedesignShell.refs();
        const GS = w.GameConstants?.GameState;
        if (!r || !GS) return false;
        const s = RedesignShell.state();
        if (s === GS.gym) return true;
        return s === GS.town && (r.player.town?.content ?? []).some((c: any) => c instanceof r.Gym && c.isUnlocked());
    });

    static canAutoDungeon = ko.pureComputed(() => {
        const r = RedesignShell.refs();
        const GS = w.GameConstants?.GameState;
        if (!r || !GS) return false;
        const s = RedesignShell.state();
        if (s === GS.dungeon) return true;
        return s === GS.town && r.player.town instanceof r.DungeonTown && !!r.player.town.dungeon?.isUnlocked();
    });

    // The mini bar floats above the tabs on pages other than Combat (phones).
    static miniVisible = ko.pureComputed(() => !!RedesignShell.foe() && RedesignShell.page() !== 'combat');

    static progressTab = ko.observable<'quests' | 'lines' | 'achievements'>('quests');

    // Achievement locations: route, gym or dungeon, when the player can already go there.
    static destinationFor(achievement: any): (() => void) | null {
        const r = RedesignShell.refs();
        const p = achievement?.property;
        const GC = w.GameConstants;
        const MapHelper = w.MapHelper ?? (0, eval)('typeof MapHelper !== "undefined" ? MapHelper : undefined');
        if (!r || !p || !GC || !MapHelper) return null;
        if (p.route !== undefined && p.region !== undefined) {
            if (!MapHelper.accessToRoute(p.route, p.region)) return null;
            return () => MapHelper.moveToRoute(p.route, p.region);
        }
        if (p.gymIndex !== undefined) {
            const name = GC.RegionGyms.flat()[p.gymIndex];
            const GymList = (0, eval)('typeof GymList !== "undefined" ? GymList : undefined');
            const town = GymList?.[name]?.parent?.name ?? GymList?.[name]?.town;
            if (!town || !MapHelper.accessToTown(town)) return null;
            return () => MapHelper.moveToTown(town);
        }
        if (p.dungeonIndex !== undefined) {
            const name = GC.RegionDungeons.flat()[p.dungeonIndex];
            if (!name || !MapHelper.accessToTown(name)) return null;
            return () => MapHelper.moveToTown(name);
        }
        return null;
    }

    static trackedDestination = ko.pureComputed(() => {
        const r = RedesignShell.refs();
        const tracked = r?.App?.game?.achievementTracker?.trackedAchievement?.();
        return tracked ? RedesignShell.destinationFor(tracked) : null;
    });

    static travelTo(achievement: any) {
        const go = RedesignShell.destinationFor(achievement);
        if (!go) return false;
        go();
        RedesignShell.go('combat');
        return true;
    }

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

    static foeTypes = ko.pureComputed(() => {
        const foe = RedesignShell.foe();
        if (!foe) return [];
        return [foe.type1, foe.type2]
            .filter((t: number) => t != null && t >= 0)
            .filter((t: number, i: number, a: number[]) => a.indexOf(t) === i)
            .map((t: number) => ({ name: typeLabel(t), color: ENERGY[t] }));
    });

    // Route completion as a mark: ● all caught, ✶ all caught shiny.
    static routeMark = ko.pureComputed(() => {
        try {
            const { RouteHelper, player } = RedesignShell.refs();
            const GS = w.GameConstants.GameState;
            if (RedesignShell.state() !== GS.fighting) return '';
            if (RouteHelper.routeCompleted(player.route, player.region, true)) return '✶';
            if (RouteHelper.routeCompleted(player.route, player.region, false)) return '●';
            return '';
        } catch {
            return '';
        }
    });

    static attack() {
        const GS = w.GameConstants?.GameState;
        const r = RedesignShell.refs();
        if (!GS || !r) return;
        switch (RedesignShell.state()) {
            case GS.fighting: w.Battle?.clickAttack?.(); break;
            case GS.gym: r.GymBattle?.clickAttack?.(); break;
            case GS.dungeon: if (r.DungeonRunner?.fighting?.()) r.DungeonBattle?.clickAttack?.(); break;
            case GS.temporaryBattle: r.TemporaryBattleBattle?.clickAttack?.(); break;
            default: break;
        }
    }

    static formatNumber(n: number): string {
        if (n == null || Number.isNaN(n)) return '';
        const locale = label('hp') === 'PV' ? 'fr-FR' : 'en-US';
        // Narrow no-break and no-break spaces become a thin space.
        return Math.round(n).toLocaleString(locale).replace(/[\u202f\u00a0]/g, '\u2009');
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
        // Pokémon list: a class instead of a :has() rule (re-evaluated on every row insert).
        document.querySelector('#pokemonListBody div[data-bind^="let:"]')?.classList.add('rd-pokegrid');
        // Fallback: anything upstream adds to a column lands on Activities.
        const fallback = document.getElementById('rd-slot-activities');
        UPSTREAM_COLUMNS.forEach((col) => {
            const column = document.getElementById(col);
            column?.querySelectorAll(':scope > .card').forEach((card) => fallback && RedesignShell.moveInto(card, fallback));
        });
        // Shell-owned controls that live inside upstream modules.
        const moveTo = (id: string, hostSel: string) => {
            const el = document.getElementById(id);
            const host = document.querySelector(hostSel);
            if (el && host && el.parentElement !== host) host.appendChild(el);
        };
        moveTo('rd-balls-tools', '#pokeballSelector');
        moveTo('rd-tracker-go', '#achievementTrackerBody');
        // The start menu's item list becomes the Menu page's game section.
        const list = document.querySelector('#startMenu .dropdown-menu');
        const menuSlot = document.getElementById('rd-menu-game');
        if (list && menuSlot && list.parentElement !== menuSlot) {
            list.classList.remove('dropdown-menu', 'dropdown-menu-right');
            list.classList.add('rd-list');
            menuSlot.appendChild(list);
        }
    }

    private static lastFoeColours = '';

    static applyFoeColours(foe: any) {
        const t1 = foe?.type1 ?? -1;
        const t2 = foe?.type2 ?? -1;
        const c1 = t1 >= 0 ? ENERGY[t1] : 'var(--n5)';
        const c2 = t2 >= 0 ? ENERGY[t2] : c1;
        // Only write when the colours change, and below the root, to keep restyles local.
        if (`${c1}|${c2}` === RedesignShell.lastFoeColours) return;
        RedesignShell.lastFoeColours = `${c1}|${c2}`;
        const host = (document.getElementById('rd-shell') ?? document.documentElement).style;
        host.setProperty('--foe', c1);
        host.setProperty('--foe-2', c2);
    }

    // Home screen (save selector): plain text links, a section title, translated actions,
    // and a visible actions button on every save card.
    private static homeScreen() {
        const home = document.getElementById('saveSelector');
        if (!home) return;
        const names: Record<string, string> = { discord: 'Discord', github: 'GitHub', wiki: 'Wiki' };
        home.querySelectorAll('a[target="_blank"] > img[alt]').forEach((img) => {
            const a = img.parentElement as HTMLAnchorElement;
            const key = Object.keys(names).find((k) => (img.getAttribute('alt') || '').toLowerCase().includes(k));
            a.textContent = key ? names[key] : img.getAttribute('alt');
            a.classList.add('rd-home-link');
        });
        const list = home.querySelector('.save-container');
        if (list && !home.querySelector('.rd-home-title')) {
            const title = document.createElement('h2');
            title.className = 'rd-home-title';
            title.textContent = label('saves');
            list.parentElement?.insertBefore(title, list);
        }
        const [newBtn, importBtn] = Array.from(home.querySelectorAll('.new-import-buttons > label'));
        if (newBtn) newBtn.textContent = label('newSave');
        if (importBtn) importBtn.textContent = label('importSave');
        const decorate = () => home.querySelectorAll('.context-menu-button').forEach((b) => {
            if (b.classList.contains('rd-save-more')) return;
            b.classList.add('rd-save-more');
            b.setAttribute('role', 'button');
            b.setAttribute('aria-label', label('saveActions'));
            b.textContent = '⋯';
        });
        decorate();
        if (list) new MutationObserver(decorate).observe(list, { childList: true });
    }

    // Bottom sheets: the grab handle (and the header) drag the sheet down; past a
    // threshold, or a quick flick, it closes. A tap on the handle closes it too.
    private static sheetGestures() {
        let sheet: HTMLElement | null = null;
        let modal: HTMLElement | null = null;
        let startY = 0;
        let startT = 0;
        let dy = 0;
        let handle = false;
        const phone = () => window.matchMedia('(max-width: 699.98px)').matches;
        document.addEventListener('touchstart', (e) => {
            if (!phone() || e.touches.length !== 1) return;
            const t = e.target as Element;
            const content = t.closest?.('.modal.show .modal-content') as HTMLElement | null;
            if (!content) return;
            const y = e.touches[0].clientY;
            const top = content.getBoundingClientRect().top;
            const onHandle = y - top < 28;
            const onHeader = !!t.closest('.modal-header') && !t.closest('button, a, input, select, textarea, [data-toggle]');
            if (!onHandle && !onHeader) return;
            handle = onHandle;
            sheet = content.closest('.modal-dialog') as HTMLElement;
            modal = content.closest('.modal') as HTMLElement;
            startY = y;
            startT = Date.now();
            dy = 0;
            sheet.style.transition = 'none';
        }, { passive: true });
        document.addEventListener('touchmove', (e) => {
            if (!sheet) return;
            dy = Math.max(0, e.touches[0].clientY - startY);
            sheet.style.transform = `translateY(${dy}px)`;
        }, { passive: true });
        const end = () => {
            if (!sheet) return;
            const fast = dy > 40 && dy / Math.max(1, Date.now() - startT) > 0.5;
            const tap = handle && dy < 4 && Date.now() - startT < 300;
            sheet.style.transition = '';
            sheet.style.transform = '';
            if (dy > 120 || fast || tap) w.$(modal).modal('hide');
            sheet = null;
            modal = null;
        };
        document.addEventListener('touchend', end);
        document.addEventListener('touchcancel', end);
    }

    // Phones: allow pinch zoom (upstream blocks it) and draw under the notch.
    private static fixViewport() {
        const meta = document.querySelector('meta[name="viewport"]');
        meta?.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
    }

    // Upstream swallows Space on keyup and maps it to game actions: keep Space/Enter for
    // the shell's own buttons and switches.
    private static guardKeys(shell: HTMLElement) {
        const stop = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement;
            if ((e.key === ' ' || e.key === 'Enter') && t.closest('button, a, [role="switch"], input, select')) e.stopPropagation();
        };
        shell.addEventListener('keydown', stop);
        shell.addEventListener('keyup', stop);
    }

    static boot() {
        if (RedesignShell.enabled) RedesignShell.patchTutorials();
        if (!RedesignShell.enabled) {
            // Classic interface: drop the shell (no hidden bindings) and offer a way back.
            const onClassicReady = () => {
                document.getElementById('rd-shell')?.remove();
                const menu = document.querySelector('#startMenu .dropdown-menu');
                if (menu && !menu.querySelector('.rd-back')) {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.className = 'dropdown-item rd-back';
                    a.href = '#';
                    a.textContent = label('redesignUI');
                    a.addEventListener('click', (e) => { e.preventDefault(); RedesignShell.setClassic(false); });
                    li.appendChild(a);
                    menu.prepend(li);
                }
            };
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onClassicReady); else onClassicReady();
            // Automation still runs under the classic interface.
            GameLoadState.onLoadState(GameLoadState.states.running, () => {
                RedesignShell.refs(resolveScriptGlobals());
                Automation.start(RedesignShell.refs());
            });
            return;
        }
        document.documentElement.classList.add('rd');

        const onReady = () => {
            // Bootswatch themes are replaced by the redesign skin.
            document.getElementById('theme-link')?.remove();
            const shell = document.getElementById('rd-shell');
            const game = document.getElementById('game');
            if (shell && game && shell.parentElement !== game) game.prepend(shell);
            if (shell) RedesignShell.guardKeys(shell);
            RedesignShell.fixViewport();
            RedesignShell.relocate();
            RedesignShell.sheetGestures();
            RedesignShell.homeScreen();
            // Choosing an achievement to track also travels to its place, when unlocked.
            document.addEventListener('click', (e) => {
                const row = (e.target as Element)?.closest?.('#achievementsModal .achievement-row');
                if (row) RedesignShell.travelTo(ko.dataFor(row));
            });
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
        GameLoadState.onLoadState(GameLoadState.states.running, () => Automation.start(RedesignShell.refs()));
        GameLoadState.onLoadState(GameLoadState.states.appliedBindings, () => {
            document.documentElement.lang = label('hp') === 'PV' ? 'fr' : 'en';
            RedesignShell.applyFoeColours(w.Battle?.enemyPokemon?.());
            w.Battle?.enemyPokemon?.subscribe((foe) => RedesignShell.applyFoeColours(foe));
        });
    }
}

RedesignShell.boot();
