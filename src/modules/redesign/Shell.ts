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
        BattleFrontierRunner: get('BattleFrontierRunner'),
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

    private static pageBeforeMenu: PageId = 'combat';

    // The menu button opens the Menu page, and a second tap goes back where you were.
    static toggleMenu() {
        if (RedesignShell.page() === 'menu') {
            RedesignShell.go(RedesignShell.pageBeforeMenu);
        } else {
            RedesignShell.go('menu');
        }
    }

    static go(page: PageId) {
        if (page === 'menu' && RedesignShell.page() !== 'menu') RedesignShell.pageBeforeMenu = RedesignShell.page();
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
        if (s === GS.battleFrontier) return !!RedesignShell.refs()?.BattleFrontierRunner?.started?.();
        return [GS.fighting, GS.gym, GS.dungeon, GS.temporaryBattle].includes(s);
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

    // Screen Wake Lock (iOS 16.4+, Chrome): keeps the phone awake while the game is open.
    static keepAwake = ko.observable(localStorage.getItem('rd.keepAwake') === '1');
    static keepAwakeSupported = 'wakeLock' in navigator;
    private static wakeLock: any = null;

    static toggleKeepAwake() {
        RedesignShell.keepAwake(!RedesignShell.keepAwake());
        localStorage.setItem('rd.keepAwake', RedesignShell.keepAwake() ? '1' : '0');
        RedesignShell.applyWakeLock();
    }

    static async applyWakeLock() {
        const nav: any = navigator;
        if (!nav.wakeLock) return;
        try {
            if (RedesignShell.keepAwake() && document.visibilityState === 'visible') {
                if (!RedesignShell.wakeLock) {
                    RedesignShell.wakeLock = await nav.wakeLock.request('screen');
                    RedesignShell.wakeLock.addEventListener?.('release', () => { RedesignShell.wakeLock = null; });
                }
            } else if (RedesignShell.wakeLock) {
                await RedesignShell.wakeLock.release();
                RedesignShell.wakeLock = null;
            }
        } catch {
            RedesignShell.wakeLock = null;
        }
    }

    // ----- New version available -----
    // No service worker: the deployed bundle's ETag (or Last-Modified) is read at start
    // and checked again when the app comes back to the foreground and every 10 minutes.
    static updateReady = ko.observable(false);
    private static bundleStamp: string | null = null;

    private static async readBundleStamp(): Promise<string | null> {
        try {
            const res = await fetch('scripts/modules.min.js', { method: 'HEAD', cache: 'no-store' });
            if (!res.ok) return null;
            return res.headers.get('etag') || res.headers.get('last-modified') || res.headers.get('content-length');
        } catch {
            return null;
        }
    }

    static async checkForUpdate() {
        if (RedesignShell.updateReady()) return;
        const stamp = await RedesignShell.readBundleStamp();
        if (!stamp) return;
        if (RedesignShell.bundleStamp === null) {
            RedesignShell.bundleStamp = stamp;
        } else if (stamp !== RedesignShell.bundleStamp) {
            RedesignShell.updateReady(true);
        }
    }

    static applyUpdate() {
        const r = RedesignShell.refs();
        try { r?.Save?.store?.(r.player); } catch { /* reload anyway */ }
        window.location.reload();
    }

    private static watchForUpdates() {
        RedesignShell.checkForUpdate();
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') RedesignShell.checkForUpdate(); });
        window.setInterval(() => RedesignShell.checkForUpdate(), 10 * 60 * 1000);
    }

    // Pokédex counter in the top bar: distinct species caught (forms count once) out of
    // every species in the game, and species caught shiny. Recomputed at most once a second.
    static dexStats = ko.pureComputed(() => {
        const r = RedesignShell.refs();
        const party = r?.App?.game?.party;
        if (!party) return null;
        const caught = new Set<number>();
        const shiny = new Set<number>();
        party.caughtPokemon.forEach((p: any) => {
            const id = Math.floor(p.id);
            if (id <= 0) return;
            caught.add(id);
            if (p.shiny) shiny.add(id);
        });
        const GC = w.GameConstants;
        const total = GC?.MaxIDPerRegion?.[GC.MAX_AVAILABLE_REGION] ?? 1025;
        return { caught: caught.size, total, shiny: shiny.size };
    }).extend({ rateLimit: 1000 });

    // ----- Mine treasures: sell from the list -----
    static treasureFilter = ko.observable<'sell' | 'all'>('sell');

    static treasures = ko.pureComputed(() => {
        const r = RedesignShell.refs();
        const UI = w.UndergroundItems;
        const VT = w.UndergroundItemValueType;
        if (!r?.player || !UI || !VT) return [];
        const all = RedesignShell.treasureFilter() === 'all';
        const rows = UI.list
            .filter((it: any) => it.valueType !== VT.MegaStone)
            .map((it: any) => {
                const owned = r.player.itemList[it.itemName]?.() ?? 0;
                const sellable = it.hasSellValue();
                return { item: it, owned, sellable, total: sellable ? it.value * owned : 0, gem: it.valueType === VT.Gem };
            })
            .filter((row: any) => row.owned > 0 && (all || row.sellable));
        rows.sort((a: any, b: any) => Number(b.sellable) - Number(a.sellable)
            || a.item.valueType - b.item.valueType
            || b.total - a.total);
        return rows;
    });

    static treasureSummary = ko.pureComputed(() => {
        let diamonds = 0;
        let plates = 0;
        RedesignShell.treasures().forEach((row: any) => {
            if (!row.sellable || row.item.sellLocked()) return;
            if (row.gem) plates += row.owned; else diamonds += row.total;
        });
        return { diamonds, plates };
    });

    static treasureValueText(row: any): string {
        return row.gem ? `${RedesignShell.formatNumber(row.item.value)} ${w.PokemonType[row.item.type]}` : RedesignShell.formatNumber(row.item.value);
    }

    static openTreasure(row: any) {
        const T = w.UndergroundTrading;
        if (!T || !row.item.isUnlocked()) return;
        T.selectedTradeFromItem = row.item;
        T.selectedTradeToItem = T.tradeToItemList[0];
        w.$('#treasureDetailModal').modal('show');
    }

    static sellTreasure(row: any) {
        if (!row.sellable || row.item.sellLocked()) return;
        w.UndergroundController.sellMineItem(row.item, row.owned);
    }

    // Sells every unlocked stack of one kind (diamond treasures or gem plates); items
    // locked with the padlock are kept.
    static sellAllTreasures(kind: 'diamond' | 'gem') {
        let count = 0;
        let value = 0;
        RedesignShell.treasures().slice().forEach((row: any) => {
            if (!row.sellable || row.item.sellLocked() || row.gem !== (kind === 'gem')) return;
            count += row.owned;
            value += row.total;
            w.UndergroundController.sellMineItem(row.item, row.owned);
        });
        if (!count) return;
        w.Notifier.notify({
            title: label('treasures'),
            message: kind === 'gem'
                ? label('soldPlates').replace('{n}', RedesignShell.formatNumber(count))
                : label('soldTreasures').replace('{n}', RedesignShell.formatNumber(count)).replace('{v}', RedesignShell.formatNumber(value)),
            type: w.NotificationConstants.NotificationOption.success,
        });
    }

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
            if (RedesignShell.state() === GS.battleFrontier) return 'Battle Frontier';
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
        // Hatchery module: the switch row opens the module body, above the eggs.
        const eggList = document.querySelector('#breedingDisplay #eggList');
        const hatchTools = document.getElementById('rd-hatch-tools');
        if (eggList && hatchTools && hatchTools.parentElement !== eggList) eggList.prepend(hatchTools);
        // Farm module: the switch row opens the module body, above the tools.
        const farmBody = document.querySelector('#farmDisplay #plotListCard');
        const farmTools = document.getElementById('rd-farm-tools');
        if (farmBody && farmTools && farmTools.parentElement !== farmBody) farmBody.prepend(farmTools);
        moveTo('rd-mine-tools', '#undergroundDisplay');
        moveTo('rd-oak-tools', '#oakItemsContainer');
        // Battle Frontier card: our welcome and switches open the card body.
        const bfCard = document.getElementById('battleFrontierInformation');
        const bfView = document.getElementById('rd-frontier');
        if (bfCard && bfView && bfView.parentElement !== bfCard) bfCard.querySelector(':scope > .card-header')?.after(bfView);
        const treasuresPane = document.getElementById('treasures');
        const treasuresView = document.getElementById('rd-treasures');
        if (treasuresPane && treasuresView && treasuresView.parentElement !== treasuresPane) treasuresPane.prepend(treasuresView);
        moveTo('rd-minemodal-tools', '#mineModal #dig .row.p-2 > .col-6.d-flex');
        moveTo('rd-minefind-tools', '#mineModal #dig .row.p-2 > .col-6.d-flex');
        // Find mine window: next to « Search for mine ».
        const search = document.querySelector('#findNewMineModal button[data-bind*="generateMine"]');
        const findTools = document.getElementById('rd-findmine-tools');
        if (search?.parentElement && findTools && findTools.parentElement !== search.parentElement) search.parentElement.appendChild(findTools);
        // The farm window footer: first, before the info button.
        const farmFooter = document.querySelector('#farmModal .modal-footer');
        const farmModalTools = document.getElementById('rd-farmmodal-tools');
        if (farmFooter && farmModalTools && farmModalTools.parentElement !== farmFooter) farmFooter.prepend(farmModalTools);
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

    // Phones: a notification banner follows the finger upwards and is dismissed past 40px.
    private static toastGestures() {
        let toast: HTMLElement | null = null;
        let startY = 0;
        let dy = 0;
        document.addEventListener('touchstart', (e) => {
            const t = (e.target as Element)?.closest?.('#toaster .toast') as HTMLElement | null;
            if (!t || (e.target as Element).closest('button, a')) return;
            toast = t;
            startY = e.touches[0].clientY;
            dy = 0;
            toast.style.transition = 'none';
        }, { passive: true });
        document.addEventListener('touchmove', (e) => {
            if (!toast) return;
            dy = Math.min(0, e.touches[0].clientY - startY);
            toast.style.transform = `translateY(${dy}px)`;
            toast.style.opacity = String(1 + dy / 120);
        }, { passive: true });
        const end = () => {
            if (!toast) return;
            const t = toast;
            toast = null;
            t.style.transition = '';
            if (dy < -40) {
                w.$(t).toast('hide');
                t.remove();
            } else {
                t.style.transform = '';
                t.style.opacity = '';
            }
        };
        document.addEventListener('touchend', end);
        document.addEventListener('touchcancel', end);
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

    // Tooltips open on hover; a touch screen never sends the "hover ends" event, so they
    // stayed on screen across pages. They now close on a page change, on a window
    // opening or closing, on the next touch elsewhere, and after 3 s on touch screens.
    private static tooltipHygiene() {
        const $ = w.$;
        const hide = (except?: Element | null) => {
            document.querySelectorAll('[aria-describedby^="tooltip"]').forEach((el) => {
                if (el === except) return;
                try { $(el).tooltip('hide'); } catch { /* not a tooltip owner */ }
            });
            document.querySelectorAll('.tooltip').forEach((tip) => {
                if (except && except.getAttribute('aria-describedby') === tip.id) return;
                tip.remove();
            });
        };
        RedesignShell.page.subscribe(() => hide());
        $(document).on('show.bs.modal hide.bs.modal', () => hide());
        if (!window.matchMedia('(hover: none)').matches) return;
        document.addEventListener('touchstart', (e) => {
            const owner = (e.target as Element)?.closest?.('[aria-describedby^="tooltip"]') ?? null;
            hide(owner);
        }, { passive: true, capture: true });
        new MutationObserver((records) => records.forEach((r) => r.addedNodes.forEach((n) => {
            if (n instanceof HTMLElement && n.classList.contains('tooltip')) {
                window.setTimeout(() => {
                    if (!n.isConnected) return;
                    const owner = document.querySelector(`[aria-describedby="${n.id}"]`);
                    try { if (owner) $(owner).tooltip('hide'); } catch { /* ignore */ }
                    n.remove();
                }, 3000);
            }
        }))).observe(document.body, { childList: true });
    }

    // Lazy lists (Pokémon, hatchery): load more rows per step and start well before the
    // end of the list, so fast scrolling rarely reaches the loader.
    private static tuneLazyLists() {
        const original = w.lazyLoad;
        if (typeof original !== 'function' || original.__rdTuned) return;
        const tuned = (key: string, node: Node, list: any, options: any = {}) => original(key, node, list, {
            ...options,
            pageSize: Math.max(60, (options.pageSize ?? 40) * 3),
            triggerMargin: '200%',
        });
        tuned.__rdTuned = true;
        w.lazyLoad = tuned;
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

    // Home screen icon (black, iPhone and Android), web app manifest and status bar.
    // Added from here so the upstream page head stays untouched.
    private static installAppMeta() {
        const head = document.head;
        if (!head || head.querySelector('link[rel="apple-touch-icon"]')) return;
        const base = 'assets/images/redesign/';
        const add = (tag: string, attrs: Record<string, string>) => {
            const el = document.createElement(tag);
            Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
            head.appendChild(el);
        };
        const favicon = head.querySelector('link[rel="icon"]');
        if (favicon) {
            favicon.setAttribute('href', `${base}favicon-48.png`);
            favicon.setAttribute('type', 'image/png');
        }
        add('link', { rel: 'apple-touch-icon', href: `${base}apple-touch-icon.png` });
        add('link', { rel: 'manifest', href: `${base}manifest.webmanifest` });
        add('meta', { name: 'theme-color', content: '#131317' });
        add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
        add('meta', { name: 'mobile-web-app-capable', content: 'yes' });
        add('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' });
        add('meta', { name: 'apple-mobile-web-app-title', content: 'PokéClicker' });
    }

    static boot() {
        RedesignShell.installAppMeta();
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
            RedesignShell.tuneLazyLists();
            RedesignShell.relocate();
            RedesignShell.sheetGestures();
            RedesignShell.homeScreen();
            RedesignShell.toastGestures();
            RedesignShell.tooltipHygiene();
            // The lock is dropped when the page is hidden: take it again on return.
            document.addEventListener('visibilitychange', () => RedesignShell.applyWakeLock());
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
        GameLoadState.onLoadState(GameLoadState.states.running, () => {
            Automation.start(RedesignShell.refs());
            RedesignShell.applyWakeLock();
            RedesignShell.watchForUpdates();
        });
        GameLoadState.onLoadState(GameLoadState.states.appliedBindings, () => {
            document.documentElement.lang = label('hp') === 'PV' ? 'fr' : 'en';
            RedesignShell.applyFoeColours(w.Battle?.enemyPokemon?.());
            w.Battle?.enemyPokemon?.subscribe((foe) => RedesignShell.applyFoeColours(foe));
        });
    }
}

RedesignShell.boot();
