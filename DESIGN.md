---
name: PokeClicker (redesign layer)
description: A quiet, dark, neutral instrument for playing PokeClicker on a phone; the only saturated colour is the energy of the Pokémon on screen.
colors:
  n0-pit: "#0c0c0f"
  n1-ground: "#131317"
  n2-control: "#1c1c22"
  n3-raised: "#26262e"
  n4-track: "#33333d"
  n5-idle: "#4a4a56"
  n6-disabled: "#74737f"
  n7-secondary: "#a5a4b1"
  n9-ink: "#ecebf2"
  line-seam: "#24242b"
  scrim: "#000000"
  ok: "#8fd468"
  warn: "#f2c94c"
  bad: "#f07167"
  energy-normal: "#a8a77a"
  energy-fire: "#ee8130"
  energy-water: "#6390f0"
  energy-electric: "#f7d02c"
  energy-grass: "#7ac74c"
  energy-ice: "#96d9d6"
  energy-fighting: "#c22e28"
  energy-poison: "#a33ea1"
  energy-ground: "#e2bf65"
  energy-flying: "#a98ff3"
  energy-psychic: "#f95587"
  energy-bug: "#a6b91a"
  energy-rock: "#b6a136"
  energy-ghost: "#735797"
  energy-dragon: "#6f35fc"
  energy-dark: "#705746"
  energy-steel: "#b7b7ce"
  energy-fairy: "#d685ad"
typography:
  figure-display:
    fontFamily: "Barlow Semi Condensed, Figtree, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "tnum"
  headline:
    fontFamily: "Barlow Semi Condensed, Figtree, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.005em"
  title-page:
    fontFamily: "Barlow Semi Condensed, Figtree, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.005em"
  title:
    fontFamily: "Barlow Semi Condensed, Figtree, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.1
  figure:
    fontFamily: "Barlow Semi Condensed, Figtree, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    fontFeature: "tnum"
  section-label:
    fontFamily: "Barlow Semi Condensed, Figtree, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.08em"
  row:
    fontFamily: "Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.3
  body:
    fontFamily: "Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
  meta:
    fontFamily: "Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.35
  caption:
    fontFamily: "Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.3
  label:
    fontFamily: "Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1
rounded:
  hairline: "2px"
  track: "3px"
  tag: "6px"
  s: "8px"
  m: "12px"
  bar: "16px"
  sheet: "20px"
  pill: "22px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  gutter: "16px"
  lg: "24px"
  tap: "44px"
components:
  button:
    backgroundColor: "{colors.n2-control}"
    textColor: "{colors.n9-ink}"
    rounded: "{rounded.s}"
    typography: "{typography.body}"
  button-hover:
    backgroundColor: "{colors.n3-raised}"
  button-active:
    backgroundColor: "{colors.n4-track}"
  button-disabled:
    backgroundColor: "{colors.n2-control}"
    textColor: "{colors.n6-disabled}"
  button-danger:
    backgroundColor: "{colors.n2-control}"
    textColor: "{colors.bad}"
  icon-button:
    textColor: "{colors.n7-secondary}"
    rounded: "{rounded.m}"
    size: "44px"
  action-chip:
    backgroundColor: "{colors.n2-control}"
    textColor: "{colors.n9-ink}"
    rounded: "20px"
    height: "40px"
    padding: "0 12px 0 14px"
  row:
    textColor: "{colors.n9-ink}"
    typography: "{typography.row}"
    height: "52px"
    padding: "8px 16px"
  input:
    backgroundColor: "{colors.n2-control}"
    textColor: "{colors.n9-ink}"
    rounded: "{rounded.s}"
  section-header:
    textColor: "{colors.n7-secondary}"
    typography: "{typography.section-label}"
    height: "48px"
    padding: "0 16px"
  nav-tab:
    backgroundColor: "{colors.n0-pit}"
    textColor: "{colors.n7-secondary}"
    typography: "{typography.label}"
    height: "64px"
  nav-tab-active:
    textColor: "{colors.n9-ink}"
  switch:
    backgroundColor: "{colors.n4-track}"
    rounded: "{rounded.bar}"
    width: "52px"
    height: "32px"
  switch-on:
    backgroundColor: "{colors.n9-ink}"
  automation-pill:
    backgroundColor: "{colors.n2-control}"
    textColor: "{colors.n7-secondary}"
    rounded: "{rounded.pill}"
    height: "44px"
    padding: "0 10px 0 14px"
  mini-combat-bar:
    backgroundColor: "{colors.n2-control}"
    rounded: "{rounded.bar}"
    height: "56px"
  modal-sheet:
    backgroundColor: "{colors.n1-ground}"
    textColor: "{colors.n9-ink}"
    rounded: "{rounded.sheet}"
---

# Design System: PokeClicker (redesign layer)

## Overview

**Creative North Star: "Trading card anatomy without the card rectangle"**

The interface is a quiet, dark, neutral instrument. Everything the player operates (rows, buttons, tabs, sheets) is drawn from one fixed neutral ramp, and the only saturated colour on screen is the energy colour of whichever Pokémon or type is being shown: a radial halo behind the foe's sprite, its HP bar, the energy dots beside its types. Information is laid out the way a trading card reads (name left, HP figures right, type below, figures in pairs), but there is no card rectangle: modules are open sections separated by hairline seams on a single dark ground.

Density is high and phone-first: one player, short one-handed check-ins, 44px tap targets, edge-to-edge sections with a 16px gutter. Importance is carried by a fixed size ramp in a condensed figure face, not by colour. Meaning colours (ok, warn, bad) appear only as text and small marks, never as button fills.

**Scope and mergeability.** This system is a layer over the upstream PokeClicker client. Every rule is scoped under `html.rd`, so switching the redesign off restores the classic interface untouched. Upstream Bootstrap 4 markup and module roots are restyled and relocated into the six pages at runtime, never rewritten; new surfaces should follow the same approach (restyle upstream classes and attribute hooks under `html.rd`, add `rd-` markup only in the shell).

**Key Characteristics:**
- One dark ground (n1) with tonal steps for controls; no white surfaces.
- Saturated colour belongs to content (type energy), never to chrome.
- Hairline 1px seams between rows instead of boxes.
- Barlow Semi Condensed for names and every figure (tabular), Figtree for UI text.
- State marks are typographic: ● caught, ✶ shiny.
- The fight is always on screen: docked column on desktop, mini combat bar above the tabs on phones.

## Colors

A cool near-black neutral ramp carries the whole interface; eighteen type energies and three meaning colours are the only hues.

### Primary
- **Foe Energy** (`--foe`, `--foe-2`): not a fixed colour but a slot. `Shell.ts` sets it from the current foe's primary and secondary types using the energy table below, falling back to n5 when there is no foe. It paints the battle halo (34% / 18% mixes), the mini bar's left glow (26%), the HP bar fill, and the text selection tint.
- **Type Energies** (energy-normal … energy-fairy): the eighteen type colours, tuned for the dark ground. Used only on content: halos, HP bars, energy dots (14px circles with a faint inner ring), type labels.

### Tertiary (meaning)
- **Fresh Green** (ok): success text, an automation that is running (the pill's dot), success progress bars.
- **Signal Yellow** (warn): warnings, the shiny ✶ mark in the Pokémon grid, warning progress bars.
- **Soft Coral** (bad): errors, danger buttons as text colour, failing automation messages.
- Status backgrounds from upstream (`.bg-success` etc.) become a 14% tint of the meaning colour, with n9 text.

### Neutral
- **Pit** (n0-pit): the bottom tab bar, the deepest layer.
- **Ground** (n1-ground): page, top bar, modal sheets. The one surface.
- **Control** (n2-control): buttons, inputs, chips, pills, the mini bar, row hover.
- **Raised** (n3-raised): button hover, badges, active pill, toasts, tooltips, empty progress track.
- **Track** (n4-track): pressed buttons, switch off-track, HP bar track in the mini bar, scrollbar thumb, sheet grabber.
- **Idle** (n5-idle): inactive status dot, foe fallback.
- **Disabled** (n6-disabled): disabled text, collapsed section headers.
- **Secondary** (n7-secondary): secondary text, icons at rest, section labels, figure units.
- **Ink** (n9-ink): primary text, active tab, switch on-track, focus outline.
- **Seam** (line-seam): every 1px divider: rows, headers, tables, top/bottom bars, rail.

The ramp deliberately has no n8; do not add one.

### Named Rules
**The Energy Belongs to Content Rule.** Saturated hue appears only on what the player is looking at (the Pokémon, its type, its HP). Chrome, controls and navigation stay on the neutral ramp.

**The Fixed Ramp Rule.** The nine neutral steps and the seam colour are the only tonal tokens. New surfaces pick a step; they do not mix new greys.

**The Meaning-as-Text Rule.** ok, warn and bad colour text and small marks. A button never gets a coloured fill; an upstream `btn-danger` becomes an n2 button with coral text.

## Typography

**Display / Figure Font:** Barlow Semi Condensed 500/600/700 (with Figtree, system-ui)
**Body Font:** Figtree 400/500/600 (with system-ui, -apple-system, Segoe UI)

Both faces are self-hosted woff2 in `src/assets/fonts/redesign/`, `font-display: swap`.

**Character:** a condensed, slightly technical figure face for names and numbers, like the stats line of a card, paired with a friendly geometric sans for everything the player reads as interface.

### Hierarchy
- **Figure Display** (600, 34px, 1): the foe's current HP in the card line.
- **Headline** (700, 30px, 1): the foe's name.
- **Page Title** (700, 28px, 1.1): page headings; the Combat page uses 22px.
- **Title** (700, 22px, 1.1): top bar route name, modal titles.
- **Figure** (600, 14–18px, tabular): attack, DPS, currencies, ball counts, levels. Always Barlow with `tabular-nums`.
- **Section Label** (600, 12–13px, 0.08em, uppercase, n7): module headers and section/group titles. Each one labels the section it opens; it is the heading itself, not a tag above another heading.
- **Row** (500, 16px, 1.3): menu and list rows.
- **Body** (400, 15px, 1.4): default UI text; descriptions capped at 48–60ch.
- **Label** (500, 11px): bottom tab labels, ball names under counts.

### Named Rules
**The Figures Are Condensed Rule.** Every number on screen is Barlow Semi Condensed with tabular figures, so columns align and values don't jitter as the game ticks.

**The Size Carries Importance Rule.** Hierarchy comes from the fixed size ramp and weight, not from colour.

## Layout

Mobile first, single column, edge to edge with a 16px gutter. Spacing steps are 4, 8, 12, 16 and 24px; every tap target is at least 44px.

- **Phone (< 700px):** sticky top bar (60px plus safe area) with region, route, defeated count and the Menu button; a fixed five-tab bottom bar (64px plus safe area) on n0; on non-combat pages a floating mini combat bar (56px) sits 8px above the tabs, and on the Combat page the automation pill takes that position. A solid n1 band under these floating elements keeps scrolled content from showing around them. Main content pads its bottom to clear them.
- **Tablet (700–1099px):** the same column centred at 760px max; the mini bar and pill centre at 744px.
- **Desktop (≥ 1100px):** a three-column grid: an 88px navigation rail (Menu pinned at the bottom), a docked combat column (380–440px, sticky, scrolls on its own), and the page. The mini bar is hidden because combat is always visible. Activities, Progress and Items lay modules side by side in an auto-fill grid of 440px minimum columns with 24px gaps.
- **Grids of content:** the Pokémon list is a dense edge-to-edge grid of 76px cells, 56px sprites at fixed pixelated scale; Poké Balls are one column per filter (ball over count); currencies are two columns of hairline rows; attack/DPS read as a two-column pair.
- **Modals:** bottom sheets on phones (rise from the bottom edge, 94vh max, grabber bar), centred panels from 700px.
- Toasts stack above the thumb zone on phones (three at most), bottom right at 360px on desktop.

## Elevation & Depth

Surfaces are flat: depth comes from tonal steps of the ramp (n0 under n1 under n2 under n3) and hairline seams. Nothing resting on the page casts a shadow, and upstream Bootstrap box-shadows on buttons are removed. Only floating layers that sit above the page (dropdowns, popovers, toasts, modals, the tutorial tooltip) carry a soft, diffuse ambient shadow so they separate from the dark ground.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 12px 32px rgba(0, 0, 0, .5)`): dropdown menus, popovers, notifications.
- **Toast** (`box-shadow: 0 10px 28px rgba(0, 0, 0, .5)`): the toast stack.
- **Sheet** (`box-shadow: 0 24px 64px rgba(0, 0, 0, .6)`): modal panels, over a black 60% backdrop.
- **Energy halo** (radial gradients of `--foe` at 34% and `--foe-2` at 18%): not a shadow but the only luminous depth, behind the foe's sprite.

### Named Rules
**The Flat Ground Rule.** Anything that sits on the page is flat. A shadow only appears on something floating above it, and it is always ambient and blurred, never a hard offset.

## Shapes

Gently rounded: 8px for buttons, inputs and tooltips; 12px for icon buttons, dropdowns, alerts, grid cells and hover backgrounds; 16px for the mini combat bar and switch track; 20px for modal sheets (top corners only on phones) and chips; 22px for the automation pill. Sections themselves have no corners because they have no box: an upstream `.card` becomes an open section with a 1px seam under its header. Round shapes are reserved for the energy dot, the status dot and the switch knob. Sprites stay pixelated at fixed scale.

## Components

### Buttons
Quiet and tonal, one level of emphasis.
- **Shape:** gently rounded (8px).
- **Default:** n2 fill, n9 text, Figtree 500, no border, no shadow. Every upstream variant (`btn-primary`, `btn-outline-*`, etc.) maps to this.
- **Hover / Active:** n3 on hover, n4 when pressed; colour transitions of 0.15s on the house ease (`cubic-bezier(.16, 1, .3, 1)`).
- **Meaning variants:** success / danger / warning keep the n2 fill and take ok / bad / warn as text colour.
- **Icon button:** 44px square, transparent, n7 icon at rest, n9 on n2 at hover, 12px radius. Icons are Lucide outlines from the local sprite (`icons.svg`), 20–22px.

### Chips
- **Action chip:** 40px tall, 20px radius, n2 fill, n9 text with an n7 16px icon; scrolls horizontally in a row of quick links above a page's modules.
- **Nav pills (upstream):** n7 text, active on n3.

### Cards / Containers
- **No container:** upstream cards become open sections on the ground: transparent, no border, no radius, 4px between modules.
- **Header:** 48px, uppercase section label in n7 (n6 when collapsed), 1px seam below. Header tools (help, settings) are transparent 40px buttons at the right; the help "?" glyph is replaced by the drawn `help.svg` icon.
- **Rows:** 52px minimum, 8px 16px padding, 1px seam below, n2 on hover; a value or hint in n7 at the right.
- **Tables:** hairline rows, no stripes, uppercase n7 head labels, 16px gutter on first and last cells.

### Inputs / Fields
- **Style:** n2 fill, 1px n3 border, 8px radius, n9 text, n7 placeholder.
- **Focus:** border shifts to n6, no glow. Global keyboard focus is a 2px n9 outline at 2px offset.
- **Disabled:** n1 fill, n6 text. Checkboxes, radios and ranges use n9 as accent colour.

### Navigation
- **Bottom tabs (phone):** five equal tabs (Combat, Progrès, Objets, Pokémon, Activités) on n0 with a seam above; 22px Lucide icon over an 11px label; n7 at rest, n9 when active with the icon stroke thickening from 1.8 to 2.4.
- **Rail (desktop):** the same buttons stacked at 64px in the 88px rail, Menu at the bottom.
- **Tabs (upstream):** n7 text, the active tab gets n9 text and a 2px n9 underline; scroll horizontally, never wrap.

### Switch
Neutral, 52 × 32px track with a 24px knob. Off: n4 track, n7 knob. On: n9 track, n1 knob, knob slides 20px over 0.2s on the house ease.

### Combat Card Line (signature)
The foe area is a 300px field: name at 30px on the left with energy dot + type label below, HP figures at 34px on the right with a 15px unit, the sprite at 160px centred over the energy halo, a 6px HP bar in `--foe` on an n3 track. Attack and DPS figures follow as a two-column pair of hairline rows, then Poké Balls as a horizontal strip of columns (26px ball, 17px count, 11px name) and currencies as two columns of hairline rows.

### Mini Combat Bar (signature)
On every non-combat phone page: a 56px floating bar on n2 with a 1px n3 border and 16px radius, a left glow of the foe's energy, a 56px tappable sprite (scales to 92% when pressed), the name in 17px Barlow and HP in n7, and a 4px HP bar in `--foe`.

### Automation Pill and Rows
- **Pill:** 44px (48px when floating on phones), 22px radius, n2, an 8px status dot (n5 off, ok on), n7 text with the running count in n9, a chevron to the settings.
- **Automation row:** name in Figtree 600 16px, a two-line clamped n7 description (n9 when on), the switch at the right, a seam below; warnings in warn, errors in bad.

### State Marks
● all caught, ✶ shiny (warn on the Pokémon grid, n7 next to the route name). The contract also names ✚ for Pokérus; the build does not render it yet. Marks are typographic, never boxed badges. Gender marks are rendered greyscale so they don't read as energy.

## Do's and Don'ts

### Do:
- **Do** scope every new rule under `html.rd` and restyle upstream Bootstrap 4 classes and attribute hooks rather than editing upstream templates.
- **Do** take every tonal value from the n0–n9 ramp and every divider from the seam colour (#24242b, 1px).
- **Do** route saturated colour through `--foe` / `--foe-2` or the type energy table, and only onto content.
- **Do** set every number in Barlow Semi Condensed with tabular figures.
- **Do** keep tap targets at 44px minimum and the 16px page gutter.
- **Do** honour `prefers-reduced-motion`: sheets and halo transitions switch off.

### Don't:
- **Don't** put a white or light surface anywhere, or bring back the decorative background.
- **Don't** fill a button, tab or chip with a meaning or energy colour; meaning lives in text and small marks.
- **Don't** wrap modules in bordered card rectangles; use open sections and hairline seams.
- **Don't** cast a shadow from anything resting on the page; shadows belong to floating layers only.
- **Don't** add a second emphasis level of buttons; there is one tonal button.
- **Don't** replace drawn icons with text glyphs (such as "?"); interface icons come from the Lucide sprite.
