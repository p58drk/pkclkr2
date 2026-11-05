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

## Déploiement (Vercel, projet `pkclkr2`)

Le site est déployé comme site statique déjà compilé, depuis `dist/`. Ce dossier est ignoré par Git ; il contient le lien `.vercel/`, un `vercel.json` (sans installation ni build) et un `.vercelignore` qui exclut `.env*`.

```sh
export PATH=~/.local/node/bin:$PATH
NODE_ENV=production npx gulp build
rsync -a --delete --exclude .vercel --exclude vercel.json --exclude .vercelignore --exclude .env.local --exclude .gitignore build/ dist/
cd dist && vercel deploy          # preview, protégée par l'authentification Vercel
vercel deploy --prod              # production publique : https://pkclkr2.vercel.app
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

L'écran d'accueil (choix de la sauvegarde) garde le logo sur un fond neutre : les sauvegardes forment une liste (toucher = charger, bouton ⋯ = télécharger, importer par-dessus, supprimer) et « Nouvelle sauvegarde » / « Importer » restent en bas de l'écran.


| Page | Contenu |
|---|---|
| Combat | Interrupteurs auto-clic, auto-arène et auto-donjon, combat, carte, monnaies, Poké Balls (avec « Zéro délai ») |
| Progrès | Onglets Quêtes, Histoires et Succès. Choisir un succès à suivre emmène à son lieu (route, arène, donjon) s'il est débloqué |
| Objets | Objets Oak, objets de combat |
| Pokémon | Liste des Pokémon |
| Activités | Pension, ferme, souterrain, raccourcis |
| Menu | Automatisation (une ligne par fonction, réglages en dépliant), son, sauvegarde, interface, menu du jeu en grille |

Disposition selon l'écran :

- **Mobile** : barre d'onglets en bas, Menu en haut à droite. Les fenêtres s'ouvrent en feuille : glisser la poignée vers le bas (ou la toucher) la ferme. Une mini-barre de combat reste visible sur les autres pages ; touchez le sprite pour attaquer, le nom pour revenir au combat.
- **Ordinateur** (1100 px et plus) : rail de navigation à gauche, combat ancré dans une colonne, page active à droite. La page Combat affiche la carte en grand.

## Scripts : état de l'intégration

L'audit complet a été fait le 05/11/2026 contre la v0.10.26. Les scripts viennent de [Ephenia/Pokeclicker-Scripts](https://github.com/Ephenia/Pokeclicker-Scripts) (GPL-3.0).

### Intégrés

| Script d'origine | État | Réparation |
|---|---|---|
| enhancedautoclicker | Intégré : clic (1 à 1000 clics/s, mesuré, au plus un Pokémon vaincu par passage), auto-arène, auto-donjon | Au-delà de 20/s, le clic dépasse la limite du jeu, comme le script d’origine (100/s). Aucune fonction du jeu n’est remplacée : l’arène utilise la relance automatique du jeu (payante jusqu’à 100 victoires) au lieu de la relance gratuite du script, et le donjon paie l’entrée en jetons à chaque passage. Trois parcours : boss direct, coffres puis boss, tout. Les deux s’arrêtent si on quitte le lieu, si on perd ou s’il n’y a plus de jetons. |
| enhancedautohatchery | Intégré | Mode fossile retiré (les œufs fossiles n'existent plus depuis 0.10.24). Boucle bornée. |
| simpleautofarmer | Intégré | `farming.berryData` remplacé par `plot.berryData`. Choix de la replantation. |
| enhancedautomine | Réécrit | Nouveau souterrain : mine en instance, durabilité des outils. Relance la mine si l'auto-relance du jeu est coupée. |
| autoquestcompleter | Intégré | Respecte le nombre d'emplacements. Rafraîchissement payant seulement sur option. |
| autobattleitems | Intégré | Choix des objets, rachat optionnel. |
| catchspeedadjuster | Intégré (règle modifiée) | Le délai d'origine est restauré quand on désactive. |
| oakitemsunlimited | Intégré (règle modifiée) | Rien n'est écrit dans la sauvegarde. |
| (propre au fork) Pension : 12 œufs | Règle modifiée | 12 œufs en même temps. Les emplacements sont ajoutés avant la lecture de la sauvegarde ; la sauvegarde garde le nombre d’emplacements achetés. Le jeu officiel ignore les œufs 5 à 12 et rend leurs Pokémon à l’équipe. À la désactivation, les œufs en cours finissent. |
| (propre au fork) Ferme accélérée | Règle modifiée | Instantanée par défaut (la baie passe au début de sa maturité), ou ×2 à ×100 jusqu’à maturité. Une baie mûre dure le temps habituel avant de flétrir. Interrupteur dans le module Ferme et la fenêtre de la ferme. Rien dans la sauvegarde. |
| (propre au fork) Mine : recharge rapide | Règle modifiée | Instantanée par défaut (outils toujours à 100 %, sans coût de durabilité), ou ×2 à ×50. Interrupteur dans le module Souterrain et l’onglet Dig. Rien dans la sauvegarde. |
| (propre au fork) Mine : découverte instantanée | Règle modifiée | Une mine recherchée est trouvée aussitôt (compte à rebours amené à sa fin, annonce habituelle). Interrupteur dans l’onglet Dig et la fenêtre « Find mine ». |

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
