# Audit du 05/11/2026

Cet audit couvre la version v0.10.26 du fork. Il s'appuie sur trois sources :

- un audit technique de la couche de refonte (accessibilité, performances, adaptation aux écrans, robustesse) ;
- un banc de test des automatisations, rejoué dans Chrome sur une partie où la pension, la ferme, le souterrain et les quêtes sont débloqués ;
- une recherche des souhaits des joueurs : environ 700 tickets de pokeclicker/pokeclicker et 300 de Pokeclicker-Scripts.

## 1. Vérification des automatisations

| Fonction | Résultat mesuré | État |
|---|---|---|
| Auto-clic | 196 à 200 clics/s demandés → 196 à 200 obtenus ; 100 → 100 ; 20 → 20 ; 5 → 5. 50/s tenus sans minuteur, avec le seul battement du jeu (donc onglet en arrière-plan). | OK |
| Auto-éclosion | Remplit l'emplacement libre selon les filtres de la pension. Fait éclore un œuf prêt puis le remplace. | OK |
| Auto-ferme | Plante la baie choisie, récolte la baie mûre (+2) et replante. | OK |
| Auto-mine | Creuse les objets ; 1 objet sur 3 en 12 s, limité par la durabilité des outils. | OK, lente par nature |
| Auto-quêtes | Démarre une quête dans la limite des emplacements, réclame les quêtes terminées. | OK |
| Auto-objets de combat | X Attaque et X Clic relancés (27 s d'effet), stock décrémenté. | OK |
| Capture instantanée | Délai à 0, puis délais d'origine restaurés à la désactivation. | OK |
| Objets Oak illimités | 3 emplacements, puis 0 à la désactivation ; les objets actifs en trop sont désormais retirés. | OK, corrigé |

## 2. Corrections apportées pendant l'audit

| Problème | Correction |
|---|---|
| Dans un donjon, le bouton « Attaquer » de la mini-barre pouvait ouvrir un coffre, lancer le boss ou quitter le donjon. | Il n'agit que pendant un combat. Le dernier ennemi n'est plus affiché pendant l'exploration. |
| Battle Frontier : la mini-barre affichait un bouton d'attaque qui ne faisait rien. | Le bouton est désactivé. |
| L'automatisation ralentissait fortement en arrière-plan (minuteur limité par le navigateur). | Elle tourne aussi sur le battement du jeu, qui continue en arrière-plan. |
| La liste Pokémon pouvait rendre toute l'équipe d'un coup (chargement progressif neutralisé). | La zone de défilement est bornée de nouveau ; la règle `:has()` est remplacée par une classe posée au démarrage. |
| Changer de page ne remontait pas en haut. | Corrigé. |
| La touche Espace sur un bouton de la refonte déclenchait des raccourcis du jeu (arène, donjon). | Les touches Espace et Entrée restent aux boutons de la refonte. |
| Zoom bloqué ; marges des zones protégées (encoche) inactives. | Le zoom à deux doigts est permis (pas le double tap) et `viewport-fit=cover` est activé. |
| La ferme débordait de 7 px en largeur, ce qui dézoomait toute la page sur téléphone. | Le débordement horizontal est coupé. |
| Contrastes insuffisants : en-têtes repliés, bordures de champs, filtres de Poké Ball désactivés. | Corrigés. Les filtres désactivés sont barrés au lieu d'être pâlis. |
| Une règle du thème « yeti » assombrissait « Lv » dans la grille Pokémon (3,2:1). | Neutralisée. |
| Entre 700 et 760 px, la mini-barre et la pastille débordaient. | Largeur bornée. |
| Le texte d'état de l'auto-clic ne suivait pas la cadence choisie. | Corrigé. |
| Interface classique : la coque restait chargée et il n'y avait pas de chemin de retour. | La coque est retirée, et le menu du jeu propose « Nouvelle interface ». |
| La couleur d'énergie était réécrite sur la racine du document à chaque ennemi. | Elle n'est écrite que si elle change, et sur la coque seulement. |
| Petites corrections. | Interrupteurs : zone de toucher portée à 44 px. Fenêtres : hauteur en `dvh` (iOS). Langue de la page selon le jeu. Mouvements réduits respectés. Erreurs d'automatisation journalisées une fois. Écriture des réglages protégée. |

## 3. Restes de l'audit technique (non corrigés)

- Les réglages d'automatisation sont communs à toutes les sauvegardes (`rd.automation`). Il faudrait les ranger par sauvegarde.
- Le thème Bootswatch est encore téléchargé à chaque chargement avant d'être retiré, et les correctifs du thème clair d'origine s'appliquent encore par endroits (icône de boss inversée, à vérifier).
- Certaines cibles tactiles restent sous 44 px : boutons `btn-sm` du jeu dans la ferme et la pension, cases de donjon (environ 34 px), bouton de fermeture des notifications.
- Les fonds `:hover` restent collés après un toucher : il faudrait les réserver à `@media (hover: hover)`.
- Sur un téléphone en paysage, la barre du haut et les onglets occupent environ la moitié de la hauteur.
- Changer de page n'est pas annoncé aux lecteurs d'écran, et le focus ne bouge pas.
- Plusieurs sélecteurs dépendent du balisage d'origine : la liste est dans le rapport d'audit. Il manque un test de fumée après chaque fusion avec le jeu d'origine.
- La PWA n'est pas encore faite (manifeste, installation).

## 4. Améliorations de qualité de vie proposées

« Pur » veut dire que la règle du jeu reste intacte, « triche » qu'elle change.

| Priorité | Amélioration | Type | Effort |
|---|---|---|---|
| 1 | **Voyage rapide** vers toute ville, route, arène ou donjon débloqués, avec un bouton « aller à la quête » sur chaque quête. Demande la plus soutenue (EPH#69, EPH#127). | Pur | Faible à moyen |
| 2 | **Carte de donjon adaptée au téléphone** : plateau à la largeur de l'écran, et second appui sur une case pour ouvrir le coffre ou lancer le boss (PC#6032, PC#2017). | Pur | Faible à moyen |
| 3 | **Supprimer les confirmations** pour rafraîchir ou abandonner une quête (PC#4180). | Pur | Faible |
| 4 | **Comportement mobile** : écran maintenu allumé pendant le jeu, résumé des gains hors ligne au retour, infobulles à l'appui long au lieu du survol, installation en PWA. | Pur | Faible |
| 5 | **Pension** : tri sur plusieurs critères et filtres d'exclusion (PC#2087, PC#3189). Améliore directement l'auto-éclosion. | Pur | Faible à moyen |
| 6 | ~~**Auto-donjon** avec modes rush du boss, coffres puis boss, ou exploration complète.~~ Fait le 05/11/2026, avec l'auto-arène : entrée payée en jetons, relance d'arène payée comme dans le jeu. | Pur | Fait |
| 7 | **Auto-Safari** : succès de 1000 cailloux et 10 000 pas jugés « incroyablement fastidieux » (EPH#325, 10 votes). C'est un script à porter. | Pur | Moyen à élevé |
| 8 | **Sauvegardes** : copies locales tournantes et export par la feuille de partage du téléphone. Synchronisation entre appareils plus tard, en option. | Pur | Faible, puis élevé |
| 9 | **Liste Pokémon** : recherche, filtres repris du Pokédex (type, shiny, Pokérus, EV), plusieurs clés de tri. | Pur | Faible à moyen |
| 10 | **Catégories en masse** : appliquer une catégorie à tous les Pokémon filtrés (EPH#161). | Pur | Moyen |
| 11 | **Filtres de Poké Ball** : éditeur tactile et préréglage temporaire pour la quête en cours (« capturer 50 Pokémon Eau »). | Pur | Moyen |
| 12 | **Ferme** : paillis riche en fin de croissance, clic automatique sur les Pokémon errants, planificateur de mutations. | Pur | Faible, puis élevé |
| 13 | **Optimiseur de vitamines** : la formule existe dans les scripts d'origine (EPH#317). | Pur | Moyen |
| 14 | **Souterrain** : vente automatique avec règles (« garder N de chaque », « garder les objets d'évolution encore utiles »). | Pur | Faible |
| 15 | **Statistiques d'efficacité** : argent, XP et jetons par heure ; meilleure route pour l'objectif en cours. | Pur | Faible |
| 16 | **Notifications** : regroupées dans un journal, avec quelques alertes gardées à l'écran (shiny, Pokémon errant, pension vide, défaite au Frontier). | Pur | Faible à moyen |
| 17 | **Arène** : relance automatique (qui existe déjà dans le jeu) mise en avant sur mobile ; relance du Battle Frontier au point de contrôle. | Pur | Faible |
| 18 | **Chambre de purification** : purifier automatiquement quand la jauge est pleine. | Pur | Faible |
| 19 | **Rencontres** : afficher toutes les rencontres, y compris celles qui dépendent de la météo, et marquer les Ultra-Chimères. | Pur | Faible |
| 20 | **Rachat automatique de Poké Balls** sous un seuil. | Pur | Faible |
| 21 | **Scripts restants à porter** : Battle Frontier, événements saisonniers, taux de shiny, outils debug, vitamines illimitées, Pokérus, météo, modes de défi, pousse des baies hors ligne. | Triche pour la plupart | Faible à moyen |

Le détail et les sources de chaque proposition (liens des tickets, votes, fichiers du jeu concernés) ont été recueillis pendant la recherche. Les votes restent faibles partout (3 à 10 réactions) : ce sont des signaux relatifs, pas des mesures de demande.
