# PokéClicker, refonte privée

Fork personnel de [pokeclicker/pokeclicker](https://github.com/pokeclicker/pokeclicker) (branche `develop`, v0.10.26). Il apporte trois choses :

- une interface refaite pour le téléphone et l'ordinateur ;
- les scripts communautaires intégrés nativement ;
- les scripts cassés réparés pour la version actuelle du jeu.

## Lancer en local

Node 24 (`~/.local/node/bin` sur cette machine).

```sh
export PATH=~/.local/node/bin:$PATH
npm ci && git submodule update --init --depth 1
npx gulp build          # sortie dans build/
npm start               # serveur de dev avec rechargement
```

## Architecture : une couche posée sur le jeu

Le code du jeu n'est presque pas touché, pour pouvoir récupérer les mises à jour. Seules deux lignes changent dans les fichiers d'origine :

| Fichier d'origine | Modification |
|---|---|
| `src/index.html` | `@import "redesign/shell.html"` avant `<div id="game">` |
| `src/modules/index.ts` | `import './redesign';` en dernière ligne |

Tout le reste se trouve dans des dossiers propres au fork :

- `src/modules/redesign/Shell.ts` : la coque à six pages.
  - Au démarrage, elle déplace les modules du jeu dans ses emplacements. Les blocs Knockout `<!-- ko if -->` qui les entourent sont déplacés avec eux.
  - Un module inconnu ajouté par une future mise à jour atterrit sur la page Activités.
- `src/modules/redesign/automation/` : le cadre d'automatisation (`Automation.ts`) et les fonctions portées (`features.ts`).
- `src/components/redesign/shell.html` : le balisage de la coque.
- `src/styles/redesign/*.less` : la peau. Toutes les règles sont préfixées par `html.rd`, donc l'interface classique reste intacte.
- `src/assets/fonts/redesign/` : Figtree et Barlow Semi Condensed (SIL OFL), auto-hébergées.
- `src/assets/images/redesign/icons.svg` : les icônes Lucide (ISC).

Pour revenir à l'interface d'origine : Menu > Interface classique. Le choix est stocké dans `localStorage['rd.enabled']`. Pour réactiver la refonte, exécuter dans la console :

```js
localStorage.removeItem('rd.enabled'); location.reload();
```

### Récupérer une mise à jour du jeu

```sh
git fetch upstream develop
git merge upstream/develop
```

Seules les deux lignes ci-dessus peuvent entrer en conflit. Après une mise à jour, vérifier que les identifiants listés dans `SLOTS` (`Shell.ts`) existent toujours.

## Pages

| Page | Contenu |
|---|---|
| Combat | Combat, Poké Balls, monnaies, état de l'automatisation, carte |
| Progrès | Quêtes, suivi des succès, accès à tous les succès et toutes les quêtes |
| Objets | Objets Oak, objets de combat |
| Pokémon | Liste des Pokémon |
| Activités | Pension, ferme, souterrain, raccourcis |
| Menu | Automatisation, son, sauvegarde, interface, menu du jeu |

Disposition selon l'écran :

- **Mobile** : barre d'onglets en bas, Menu en haut à droite. Une mini-barre de combat reste visible sur les autres pages ; touchez le sprite pour attaquer, le nom pour revenir au combat.
- **Ordinateur** (1100 px et plus) : rail de navigation à gauche, combat ancré dans une colonne, page active à droite. La page Combat affiche la carte en grand.

## Scripts : état de l'intégration

L'audit complet a été fait le 05/11/2026 contre la v0.10.26. Les scripts viennent de [Ephenia/Pokeclicker-Scripts](https://github.com/Ephenia/Pokeclicker-Scripts) (GPL-3.0).

### Intégrés

| Script d'origine | État | Réparation |
|---|---|---|
| enhancedautoclicker | Intégré : clic | Respecte la limite du jeu (20 clics/s). Auto-arène et auto-donjon restent à faire. |
| enhancedautohatchery | Intégré | Mode fossile retiré (les œufs fossiles n'existent plus depuis 0.10.24). Boucle bornée. |
| simpleautofarmer | Intégré | `farming.berryData` remplacé par `plot.berryData`. Choix de la replantation. |
| enhancedautomine | Réécrit | Nouveau souterrain : mine en instance, durabilité des outils. Relance la mine si l'auto-relance du jeu est coupée. |
| autoquestcompleter | Intégré | Respecte le nombre d'emplacements. Rafraîchissement payant seulement sur option. |
| autobattleitems | Intégré | Choix des objets, rachat optionnel. |
| catchspeedadjuster | Intégré (règle modifiée) | Le délai d'origine est restauré quand on désactive. |
| oakitemsunlimited | Intégré (règle modifiée) | Rien n'est écrit dans la sauvegarde. |

### À faire

| Script | Ce qu'il faut corriger |
|---|---|
| autobattlefrontier | Fonctionne, interface à refaire nativement |
| autosafarizone | `berryList` devient `berryInventory`, gérer le Pinap, chemins vides |
| infiniteseasonalevents | Construire la liste depuis `App.game.specialEvents.events` |
| syntheticshinysynapse | Envelopper les vrais points d'appel au lieu d'analyser la pile d'appels |
| debugcheatstools | `PokemonLocations.getPokemonLocations`. Sauvegarde automatique avant toute modification. |
| omegaproteingains, perkypokeruspandemic, simpleweatherchanger, challengemodechanger, overnightberrygrowth | Fonctionnent ; à porter |
| catchfilterfantasia | Recoupe les filtres de Poké Balls natifs ; à évaluer |
| additionalvisualsettings | La refonte couvre l'aspect ; options de performance à porter |

### Écartés

| Script | Raison |
|---|---|
| discordcodegenerator | Écrase l'identifiant Discord de la sauvegarde et remet à zéro les codes réclamés. |
| scriptfixerupper | Inutile : les réglages du fork sont rangés sous `rd.*`. |

Les réglages d'automatisation sont stockés dans `localStorage['rd.automation']`.

## Sauvegarde

Le site du fork est sur un autre domaine que pokeclicker.com, donc la sauvegarde n'est pas partagée automatiquement. Pour la transférer :

1. Sur pokeclicker.com : Start Menu > Save > Download Save.
2. Sur le fork : écran des sauvegardes > Import Save.

La version du fork doit être supérieure ou égale à celle de la sauvegarde.

## Licences

Le jeu est sous ISC. Les scripts intégrés sont sous GPL-3.0, donc ce fork devient GPL-3.0 s'il est distribué un jour. Il est privé pour l'instant.
