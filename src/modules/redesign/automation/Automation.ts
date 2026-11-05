/* eslint-disable @typescript-eslint/no-explicit-any */
// Integrated automation: native replacements for the community userscripts
// (Ephenia/Pokeclicker-Scripts, GPL-3.0), rewritten against the current game API.
// One scheduler, one settings store, one UI (Menu > Automation).
import Settings from '../../settings/Settings';

export type Lang = 'fr' | 'en';
export type Group = 'vanilla' | 'custom' | 'debug';
type Text = Record<Lang, string>;

export interface AutomationOption {
    key: string;
    label: Text;
    type: 'number' | 'boolean' | 'select';
    default: any;
    min?: number;
    max?: number;
    step?: number;
    choices?: { value: any; label: Text }[];
}

export interface AutomationContext {
    g: any; // script-level globals (App, player, ...)
    w: any; // window
    opt: (key: string) => any;
    // Turn the feature off (after the current tick), optionally telling the player why.
    stop: (message?: Text) => void;
}

export interface AutomationFeatureDef {
    id: string;
    group: Group;
    name: Text;
    description: Text;
    // Warn before enabling (rule-changing or save-altering features).
    warning?: Text;
    intervalMs?: number;
    options?: AutomationOption[];
    available?: (ctx: AutomationContext) => boolean;
    // Why `available` is false, shown in the Menu (e.g. what unlocks it).
    unavailable?: Text;
    tick?: (ctx: AutomationContext) => void;
    enable?: (ctx: AutomationContext) => void;
    disable?: (ctx: AutomationContext) => void;
    status?: (ctx: AutomationContext) => string;
}

const STORE_KEY = 'rd.automation';

type Stored = Record<string, { enabled: boolean; options: Record<string, any> }>;

function readStore(): Stored {
    try {
        return JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    } catch {
        return {};
    }
}

export function lang(): Lang {
    try {
        return Settings.getSetting('translation.language')?.observableValue?.() === 'fr' ? 'fr' : 'en';
    } catch {
        return 'en';
    }
}

export class AutomationFeature {
    readonly enabled: KnockoutObservable<boolean>;
    readonly options: Record<string, KnockoutObservable<any>> = {};
    readonly expanded = ko.observable(false);
    readonly lastError = ko.observable<string>('');
    lastRun = 0;

    constructor(public readonly def: AutomationFeatureDef, stored: Stored[string] | undefined) {
        this.enabled = ko.observable(!!stored?.enabled);
        (def.options ?? []).forEach((o) => {
            const saved = stored?.options?.[o.key];
            this.options[o.key] = ko.observable(saved !== undefined ? saved : o.default);
            this.options[o.key].subscribe(() => Automation.persist());
        });
        this.enabled.subscribe((on) => {
            Automation.persist();
            const ctx = Automation.context(this);
            if (!ctx) return;
            try {
                if (on) def.enable?.(ctx); else def.disable?.(ctx);
                this.lastError('');
            } catch (e) {
                this.lastError(String((e as Error)?.message || e));
            }
        });
    }

    get id() { return this.def.id; }
    name() { return this.def.name[lang()]; }
    description() { return this.def.description[lang()]; }
    warning() { return this.def.warning?.[lang()] ?? ''; }
    unavailableText() { return this.def.unavailable?.[lang()] ?? ''; }
    optionLabel(o: AutomationOption) { return o.label[lang()]; }
    choiceLabel(c: { label: Text }) { return c.label[lang()]; }

    available = ko.pureComputed(() => {
        Automation.ready();
        const ctx = Automation.context(this);
        if (!ctx) return false;
        try { return this.def.available ? this.def.available(ctx) : true; } catch { return false; }
    });

    statusText = ko.pureComputed(() => {
        Automation.ready();
        Object.values(this.options).forEach((o) => o()); // status reads options with peek()
        if (!this.enabled() || !this.def.status) return '';
        const ctx = Automation.context(this);
        try { return ctx ? this.def.status(ctx) : ''; } catch { return ''; }
    });

    toggle() {
        if (!this.enabled() && this.def.warning && !window.confirm(`${this.name()}\n\n${this.warning()}`)) {
            return;
        }
        this.enabled(!this.enabled());
    }
}

export default class Automation {
    static readonly features: AutomationFeature[] = [];
    static readonly ready = ko.observable(false);
    private static globals: any = null;
    private static timer: number | undefined;

    static register(def: AutomationFeatureDef) {
        const stored = readStore()[def.id];
        Automation.features.push(new AutomationFeature(def, stored));
    }

    static find(id: string) {
        return Automation.features.find((f) => f.id === id);
    }

    static byGroup(group: Group) {
        return Automation.features.filter((f) => f.def.group === group);
    }

    static active = ko.pureComputed(() => Automation.features.filter((f) => f.enabled() && f.available()));

    private static warned = new Set<string>();

    static report(feature: AutomationFeature, e: unknown) {
        const msg = String((e as Error)?.message || e);
        feature.lastError(msg);
        const key = `${feature.id}:${msg}`;
        if (!Automation.warned.has(key)) {
            Automation.warned.add(key);
            // eslint-disable-next-line no-console
            console.warn(`[automation] ${feature.id}: ${msg}`);
        }
    }

    static persist() {
        const data: Stored = {};
        Automation.features.forEach((f) => {
            const options: Record<string, any> = {};
            Object.entries(f.options).forEach(([k, o]) => { options[k] = o(); });
            data[f.id] = { enabled: f.enabled.peek(), options };
        });
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify(data));
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[automation] settings not saved', e);
        }
    }

    static context(feature: AutomationFeature): AutomationContext | null {
        if (!Automation.globals) return null;
        return {
            g: Automation.globals,
            w: window,
            opt: (key: string) => feature.options[key]?.peek(),
            stop: (message?: Text) => {
                window.setTimeout(() => feature.enabled(false), 0);
                if (!message) return;
                const w = window as any;
                try {
                    w.Notifier.notify({
                        title: feature.name(),
                        message: message[lang()],
                        type: w.NotificationConstants.NotificationOption.warning,
                    });
                } catch { /* notifications unavailable */ }
            },
        };
    }

    static start(globals: any) {
        Automation.globals = globals;
        Automation.ready(true);
        // Re-apply rule patches of features that were left on.
        Automation.features.forEach((f) => {
            if (!f.enabled.peek()) return;
            const ctx = Automation.context(f);
            try { f.def.enable?.(ctx); } catch (e) { f.lastError(String((e as Error)?.message || e)); }
        });
        // The game keeps ticking in a Web Worker when the tab is hidden, while timers get
        // throttled: run automation from the game tick, plus a light timer while visible
        // for a smoother auto clicker.
        const game = globals?.App?.game;
        if (game && !game.__rdAutomationHooked) {
            const original = game.gameTick.bind(game);
            game.gameTick = () => { original(); Automation.tick(); };
            game.__rdAutomationHooked = true;
        }
        window.clearInterval(Automation.timer);
        Automation.timer = window.setInterval(() => { if (!document.hidden) Automation.tick(); }, 50);
    }

    static tick() {
        const now = Date.now();
        Automation.features.forEach((f) => {
            if (!f.def.tick || !f.enabled.peek()) return;
            const every = f.def.intervalMs ?? 1000;
            if (now - f.lastRun < every) return;
            f.lastRun = now;
            const ctx = Automation.context(f);
            if (!ctx) return;
            try {
                if (f.def.available && !f.def.available(ctx)) return;
                f.def.tick(ctx);
                if (f.lastError.peek()) f.lastError('');
            } catch (e) {
                Automation.report(f, e);
            }
        });
    }
}
