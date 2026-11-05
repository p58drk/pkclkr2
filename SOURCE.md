# Code source et licences de pkclkr2.vercel.app

Ce site est une version modifiée de [PokéClicker](https://github.com/pokeclicker/pokeclicker) (licence ISC).

Le site publié se compose de deux parties :

- **Le jeu d'origine, non modifié** : commit [`b6b4200d6a7f8d0528727b64155028bf18bba5bf`](https://github.com/pokeclicker/pokeclicker/tree/b6b4200d6a7f8d0528727b64155028bf18bba5bf) de la branche `develop`, version 0.10.26.
- **Les ajouts du fork** : ce dépôt, https://github.com/p58drk/pkclkr2. La liste des fichiers ajoutés ou modifiés s'obtient avec `git diff --name-only b6b4200d HEAD`.
  - La nouvelle interface : `src/*/redesign/`, `src/styles/redesign/` et les deux lignes d'import modifiées dans `src/index.html` et `src/modules/index.ts`.
  - L'automatisation intégrée : `src/modules/redesign/automation/`.

## Licences

| Élément | Licence |
|---|---|
| Couche de refonte et automatisation intégrée | GNU GPL v3 (texte complet : `src/assets/licenses/GPL-3.0.txt`) |
| Jeu PokéClicker | ISC |
| Icônes Lucide | ISC |
| Polices Figtree et Barlow Semi Condensed | SIL Open Font License 1.1 (fichiers de licence dans `src/assets/fonts/redesign/`) |

L'automatisation intégrée est une réécriture dérivée de [Pokeclicker-Scripts](https://github.com/Ephenia/Pokeclicker-Scripts) d'Ephenia, sous GPL-3.0. C'est pour cette raison que la couche du fork est distribuée sous GPL v3.

## Reconstruire le site

Avec Node 24 :

```sh
git clone https://github.com/p58drk/pkclkr2.git && cd pkclkr2
npm ci
git submodule update --init
NODE_ENV=production npx gulp build
```

Le site compilé se trouve dans `build/`.
