# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Fork of the open-source PokeClicker client (pokeclicker/pokeclicker, v0.10.26 at fork time, 29/10/2026): TypeScript, Knockout templates, gulp/webpack build. Delivered as a hosted, privately deployed site (Vercel) that installs as a PWA on the phone and also runs in desktop browsers. Kept in a new private repository, independent of any other repo.

## Users

A single player (the owner) who plays PokeClicker mostly on a phone, in short check-ins between other things, with long idle stretches where automation keeps progressing. Also plays on a desktop browser at times.

## Product Purpose

A personal, cleaner way to play PokeClicker: the same game and save, with a rebuilt interface that works properly on a phone, and with the community automation scripts built in as native, maintained features instead of external userscripts that break on game updates.

Success: every part of the game is reachable on a phone one-handed without pinch-zooming; the player can see progress and toggle automation in seconds; the scripts work on the current game version.

## Positioning

The upstream game is desktop-first, with Bootstrap cards and modals over a decorative background. This fork reorganises the same systems into a small number of task-based pages and treats automation as a first-class system with its own page and settings.

## Operating Context

- The game runs continuously in a tab; progress is driven by the game tick, and much of it happens while the screen is not being watched.
- Check-ins are short: check currencies and quests, collect eggs, replant the farm, change route or dungeon, toggle automation.
- Saves live in browser localStorage per domain. Moving from pokeclicker.com means a one-time save export/import.
- Upstream releases often. The redesign must stay mergeable: new shell, theme and automation module sit beside the game code, with game source edits kept minimal and documented.

## Capabilities and Constraints

- Page structure required by the owner:
  1. Combat, Map, Poké Balls, Currency
  2. Achievements, Quests
  3. Oak Items, Battle Items
  4. Pokémon list
  5. Hatchery, Farm, Underground, Shortcuts
  6. Menu
- Integrated automation (all requested, from Ephenia/Pokeclicker-Scripts, GPL-3.0): vanilla scripts (enhanced auto clicker, auto hatchery, auto mine, auto farm, auto Battle Frontier, auto battle items, catch filters, visual settings), custom gameplay-altering scripts (auto quests, auto Safari, catch speed, weather, unlimited Oak items, berry growth, Pokérus, seasonal events, challenge modes, etc.) and the debug/cheat tools. Broken scripts must be repaired against the current game version.
- Save-altering tools (debug/cheat) need explicit warnings and a save backup step before use.
- Licensing: the scripts are GPL-3.0; integrating them makes this fork GPL-3.0-bound if it is ever distributed. Private personal use only for now; no public deployment decided.
- Undecided: final hosting name/URL; whether to ever make it public.

## Brand Commitments

- Owner's explicit brief: drop the decorative background, drop the white rectangles (cards) and the coloured buttons; a more modern, more functional interface.
- Pokémon sprites, item icons and game content come from the upstream game and stay as they are.

## Evidence on Hand

- Upstream game source: `upstream/game` (not tracked).
- Scripts source: `upstream/scripts-ephenia` (not tracked).
- No custom assets yet.

## Product Principles

1. Glanceable first: the state that matters (current fight, currencies, quests, automation status) is readable in one look on a phone.
2. One-handed reach: frequent actions in the bottom of the screen; rare ones go into the menu.
3. Automation is a system, not a hack: every script has a visible on/off state, its own settings and a clear indication of what it is doing.
4. Stay mergeable: never fork what can be layered.
5. The game's content is the colour: sprites, types and items carry the colour; the interface chrome stays quiet.

## Accessibility & Inclusion

Touch targets of at least 44×44 px on mobile; respect reduced motion; text contrast WCAG AA.
