// Shell labels follow the game's language setting (French or English).
// The upstream game UI is mostly English; only the shell chrome is translated here.
import Settings from '../settings/Settings';

const fr = {
    combat: 'Combat',
    progress: 'Progrès',
    items: 'Objets',
    pokemon: 'Pokémon',
    activities: 'Activités',
    menu: 'Menu',
    map: 'Carte',
    defeated: 'vaincus',
    tapToAttack: 'Touchez pour attaquer',
    town: 'Ville',
    automation: 'Automatisation',
    automationOff: 'Automatisation coupée',
    classicUI: 'Interface classique',
    classicUIHint: 'Revenir à l’interface d’origine (rechargement)',
    redesignUI: 'Nouvelle interface',
    sound: 'Son',
    save: 'Sauvegarder',
    gameMenu: 'Jeu',
    interface: 'Interface',
    achievementsAll: 'Tous les succès',
    questsAll: 'Toutes les quêtes',
    open: 'Ouvrir',
    goToCombat: 'Aller au combat',
    attack: 'Attaquer',
    hp: 'PV',
    activitiesEmpty: 'La pension, la ferme et le souterrain apparaîtront ici dès qu’ils seront débloqués au fil de l’aventure.',
} as const;

export type LabelKey = keyof typeof fr;

const en: Record<LabelKey, string> = {
    combat: 'Battle',
    progress: 'Progress',
    items: 'Items',
    pokemon: 'Pokémon',
    activities: 'Activities',
    menu: 'Menu',
    map: 'Map',
    defeated: 'defeated',
    tapToAttack: 'Tap to attack',
    town: 'Town',
    automation: 'Automation',
    automationOff: 'Automation off',
    classicUI: 'Classic interface',
    classicUIHint: 'Switch back to the original interface (reloads)',
    redesignUI: 'New interface',
    sound: 'Sound',
    save: 'Save',
    gameMenu: 'Game',
    interface: 'Interface',
    achievementsAll: 'All achievements',
    questsAll: 'All quests',
    open: 'Open',
    goToCombat: 'Go to battle',
    attack: 'Attack',
    hp: 'HP',
    activitiesEmpty: 'The Day Care, the Farm and the Underground will appear here as soon as you unlock them.',
};

export function label(key: LabelKey): string {
    let lang = 'en';
    try {
        lang = Settings.getSetting('translation.language')?.observableValue?.() ?? 'en';
    } catch {
        lang = 'en';
    }
    return lang === 'fr' ? fr[key] : en[key];
}


const TYPES_FR = ['Normal', 'Feu', 'Eau', 'Électrik', 'Plante', 'Glace', 'Combat', 'Poison', 'Sol', 'Vol',
    'Psy', 'Insecte', 'Roche', 'Spectre', 'Dragon', 'Ténèbres', 'Acier', 'Fée'];
const TYPES_EN = ['Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying',
    'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'];

export function typeLabel(type: number): string {
    if (type < 0) return '';
    return (label('hp') === 'PV' ? TYPES_FR : TYPES_EN)[type] ?? '';
}
