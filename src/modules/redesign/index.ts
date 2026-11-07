// Entry point of the redesign layer. Loaded once from ../index.ts.
import RedesignShell from './Shell';
import Automation, { lang } from './automation/Automation';
import './automation/battles';
import './automation/features';
import './automation/safari';

const GROUP_TITLES = {
    vanilla: { fr: 'Automatisation', en: 'Automation' },
    custom: { fr: 'Règles modifiées', en: 'Rule changes' },
    debug: { fr: 'Outils de triche', en: 'Cheat tools' },
};

const RedesignAutomation = {
    Automation,
    groups: ko.pureComputed(() => (['vanilla', 'custom', 'debug'] as const)
        .map((g) => ({ id: g, title: GROUP_TITLES[g][lang()], features: Automation.byGroup(g) }))
        .filter((g) => g.features.length)),
    summary: ko.pureComputed(() => Automation.active()
        .map((f) => [f.name(), f.statusText()].filter(Boolean).join(' ')).join(' · ')),
};

// Quick toggles above the fight (Combat page): auto clicker, auto gym, auto dungeon.
const QUICK = [
    { id: 'autoClick', key: 'autoClickShort', applicable: () => true },
    { id: 'autoGym', key: 'autoGymShort', applicable: () => RedesignShell.canAutoGym() },
    { id: 'autoDungeon', key: 'autoDungeonShort', applicable: () => RedesignShell.canAutoDungeon() },
] as const;
const quick = QUICK.map((q) => {
    const feature = Automation.find(q.id);
    return {
        feature,
        label: () => RedesignShell.label(q.key),
        status: ko.pureComputed(() => (q.id === 'autoClick' && feature?.enabled() ? feature.statusText() : '')),
        // A running toggle can always be switched off; an idle one only where it applies.
        usable: ko.pureComputed(() => !!feature && (feature.enabled() || q.applicable())),
    };
}).filter((q) => q.feature);
const quickIds: string[] = QUICK.map((q) => q.id);
Object.assign(RedesignAutomation, {
    quick,
    othersActive: ko.pureComputed(() => Automation.active().filter((f) => !quickIds.includes(f.id)).length),
});

Object.assign(window, { RedesignShell, RedesignAutomation });

export default RedesignShell;
