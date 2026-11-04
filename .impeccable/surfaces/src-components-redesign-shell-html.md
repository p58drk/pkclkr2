---
version: 1
slug: "src-components-redesign-shell-html"
primary_target: "src/components/redesign/shell.html"
related_targets: ["src/index.html"]
---

# Surface brief: game shell (all six pages)

Scope: the whole in-game interface of the PokeClicker fork: shell, navigation, the six pages, every upstream module and modal restyled. Visitor mode: Operate.

Audience and job: one player, mostly on a phone, short check-ins (fight, collect eggs, replant, switch route, toggle automation) between long idle stretches. Also desktop browser.

Constraints: layered over upstream (one @import in index.html, one import in modules/index.ts); upstream module roots are relocated into pages at runtime, never rewritten. Classic interface stays available behind a setting.

Memorable moment: the fight never leaves the screen. On mobile a mini combat bar sits above the tab bar on every other page; on desktop combat is docked in its own column.

## Direction contract

THESIS: The interface is a quiet, dark, neutral instrument; the only saturated colour on screen is the energy colour of whatever Pokémon or type is being shown, read like a trading card's anatomy. Refuses: Bootstrap cards on a decorative background with colour-coded buttons.

OWN-WORLD: Neutral ramp of nine fixed steps (n0 #0e0e11 … n9 #ecebf2), no drop shadows, no white surfaces, hairline 1px seams between rows. Eighteen type energy colours are the palette and only appear on content (halo, HP bar, energy dots, type labels). Buttons are neutral tonal (n2/n3) with n9 text; one emphasis level only. Type: Barlow Semi Condensed 600/700 for names and all figures (tabular), Figtree for UI text. State marks: ● caught, ✶ shiny, ✚ Pokérus, never boxes.

STORY: The player opens the app, reads the route, the foe, its HP and the automation status in one glance, taps to fight, checks quests and eggs in two taps, and leaves.

FIRST VIEWPORT: Mobile Combat page (390×844): top bar with region · route · defeated count and the Menu button; battle field 300px tall: foe name left at 30px, HP right in 34px figures, energy dot + type below, sprite centred over a radial halo in the foe's type colour, HP bar in that colour at the bottom; attack and DPS figures in a two-column row; Poké Ball selector as four columns of ball + count; currencies as hairline rows; automation pill above a five-tab bottom bar (Combat, Progrès, Objets, Pokémon, Activités).

FORM: Trading card anatomy without the card rectangle; position 5 of the ordered grounded list; seed:d431363e2c707eea. Raises: dense edge-to-edge Pokémon grid with marks (from convention catalog); farm and egg stages at fixed scale on a shared baseline (from botanical folio); fixed neutral ramp as the only tonal tokens (from exposure record); the current region dominates the Map page (from zoo map); importance carried by a fixed size ramp, not colour (from star atlas).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Exact behaviour of each automation once the script audit lands.
- PWA icons (no raster yet).
