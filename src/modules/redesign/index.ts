// Entry point of the redesign layer. Loaded once from ../index.ts.
import RedesignShell from './Shell';
import Automation, { lang } from './automation/Automation';
import './automation/features';

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

Object.assign(window, { RedesignShell, RedesignAutomation });

export default RedesignShell;
