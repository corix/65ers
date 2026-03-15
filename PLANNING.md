# The 65 Almanac

Note: This is a living document for planned and executed work.

## Overview

Data entry tool for digitizing paper scoresheets from a family card game called "65."

### Game rules

- Each game has 11 rounds
- The player with the lowest final score wins
- The first player to get to 0 in the round is the round winner — this move is called a "tunk"
- When a player scores 0 points in a round, but is not a tunk, this is called a "tink"
- If a player scores exactly 65 points in a round, this counts as a "magic 65" and is calculated as 0 points toward their total game score. A magic 65 is not possible in rounds 3 or 4.
- Tunks, tinks, and magic 65s are mutually exclusive — players can only tunk, or tink, or get a magic 65 in a round
- No matter how many tunks, tinks, or magic 65s a player gets, they still must have the lowest total score after the 11th round to be the game winner
- In rare cases, a player will have a "false tunk," and will be penalized by adding 65 points to their score for that round
- The rounds are named: 3, 4, 5, 6, 7, 8, 9, 10, J (for Jacks), Q (for Queens), and K (for Kings)

Terminology note: "tunk" and "tink" are both verbs and nouns. Examples:

- "I got a tink."
- "Did you just tunk?" / "Yes, I tunked."
- "Read 'em and weep: sixty-five." / "Nice! Zero points for you."

---

## Features

The app has 3 main features:

### 1. Web form

Creates new entries, which entails:

- New Game setup
  - Date — entered as short text in M/D/YY format (stored internally as ISO YYYY-MM-DD). Usually 1 entry per date, but in rare cases there may be multiple games in a day.
  - Number of players — varies, typically 4 to 7, rarely fewer or more
  - Players — selected via draggable pills, ordered by the user's arrangement. A "+" pill reveals a form to add and save new player names. "manage" toggles manage mode (custom players show trash icon to remove); "clear" / "select all" toggle selection.
- Scoresheet entry
  - 11 rounds, with score per player per round; player columns are draggable to reorder
  - Cumulative scores after first round
  - Winning player of each round (the "tunk")
  - Total scores per player, with the winning player (lowest score) highlighted only after all 11 rounds are completed
  - Clear (restart icon) and Start over (trash icon with confirmation)
  - Keyboard shortcuts modal (ℹ button)
    - **Tunk** — `*` or `t` in the score input. Tunk inputs display as a star (★); editable.
    - **Penalty** — Score + `x`, e.g. `9x`, or via "Add Penalty" (round/player). Adds +65 to that round. Each penalty has a × button to remove it.
    - **Magic 65** — `65` or `!` in the score input (not available in rounds 3 or 4).
  - After saving, a success state shows "View in Archive" to navigate to the Archive view
  - Drafts persist across navigation; returning to New Game restores unsaved data

### 2. Archive

All past game scoresheets, displayed as tabular data:

- Games listed newest-first in an accordion; only one game can be expanded at a time
- Export button downloads `exported-games.json`
- Delete (trash icon, two-click confirm) for non-fixture games
- Editable dates (double-click)
- A tunk is visually represented as a star (★) with a green highlight
- A tink is shown as a number ("0") in green text, no highlight
- A magic 65 is shown as "65*" with a blue highlight
- False tunks show a red "FT" badge

Stored locally; Phase 4 migrates to Supabase (DB primary, `stored-games.json` fallback).

### 3. Stats

Data insights and visualizations (display order):

1. Most Recent Game chart (line chart of cumulative scores by round)
2. Player leaderboard (ranked by wins, then avg score) with clickable names that expand to show detailed stats
3. Record cards: Lowest All-Time Score, Most Tunks in a Game, Highest Winning Score
4. Average Score by Round chart (scatter plot with regression lines, players ordered by slope)

---

## Ideas

### Backlog

- Additional chart types or filters
- Nice-to-haves
  - CSV export

### Completed

- Data insights (written stats)
  - Highest and lowest all-time final scores
  - Most tunks (rounds won) in a single game
  - Player leaderboard (ranked by games won, ranked by average final score)
  - Individual player stats — total games won, total rounds won, average rounds won per game
- Data visualizations (graphs)
  - Most recent game (multiple line graph, each line is a player, Y axis is score and X axis is rounds)
  - Average player performance (scatter plot of how a player tends to score in each round)

### Out of scope

- Ability to edit entries — delete and date-edit (double-click in Archive) are supported; further edits not needed
- Multiple databases/different types of entries — only one collection of scoresheets, for one type of game
- The game itself (playing 65 with the computer) — this tool is just to store the scoresheets and show insights about the players

---

## Roadmap

These are the building stages for this project.

### 1. Phase 1 — Testing web form (complete)

- Web form with player pill selection, scoresheet grid, tunk/penalty shortcuts, and auto-computed totals
- Archive view with expandable game cards
- All data persisted in localStorage
- Vanilla JS and Vite, no framework

### 2. Phase 2 — Testing data insights (complete)

- Create Stats tab
- Top three record cards: Lowest All-Time Score, Most Tunks in a Game, Highest Winning Score
- Leaderboard with wins, games, win %
  - Click a player name to expand detailed stats (avg score, tunks/tinks per game, best/worst game, penalties, zeros per game, best win streak, magic 65s)
- Two interactive Chart.js charts
  - Most Recent Game (cumulative score by round, inverted Y-axis), Average Score by Round (scatter with regression lines, legend-ordered by slope)
  - Hover/click legend to highlight a player; tooltips show round and score for highlighted player only

### 3. 👉 Phase 3 — Deploy to Netlify [WE ARE HERE]

- Deploy static build through Netlify (connect GitHub repo; build command: `vite build`; publish directory: `dist/`)
- App runs in production with localStorage; validates deployment pipeline
- No backend or env vars required yet

### 4. Phase 4 — Integrate Supabase


| Todo                 | Purpose                                  | Task(s)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Outcome                                          |
| -------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Set up schema        | Define DB structure for persistence      | <ul><li>Create Supabase project</li><li>Define players table</li><li>Define games table (rounds as JSONB, <code>source</code> for fixture marking)</li><li>Run migrations in Supabase</li><li>Add RLS policies: allow anon read/write on players and games (open for Phase 4; tighten in Phase 5 with auth)</li></ul> | Tables exist; ready to connect                   |
| Create env variables | Enable app to connect to Supabase        | <ul><li>Get <code>VITE_SUPABASE_URL</code> from Supabase dashboard</li><li>Get <code>VITE_SUPABASE_ANON_KEY</code> from Supabase dashboard</li><li>Create <code>.env</code> in project root (if not exists)</li><li>Add vars to <code>.env</code></li><li>Add to Netlify dashboard</li></ul> | Credentials in place; ready to wire up client    |
| Decide fixture flow  | Unblock Replace api.js                   | <ul><li>Keep Load/Ignore: DB is primary; <code>stored-games.json</code> is fallback</li><li>Load = insert from JSON into DB (set <code>source: 'fixture'</code>)</li><li>Ignore = delete rows where <code>source = 'fixture'</code></li></ul> | Decision made; implementation path clear         |
| Replace api.js       | Switch app from localStorage to Supabase | <ul><li>Install <code>@supabase/supabase-js</code></li><li>Initialize Supabase client</li><li>Replace games CRUD (loadGames, saveGame, deleteGame, updateGame)</li><li>Replace players CRUD (getAllPlayerNames, getPlayerRows, addCustomPlayer, removeCustomPlayer, getCustomPlayers)</li><li>Replace Load/Ignore (loadTestData, clearData, hasTestData, isTestDataGame, getTestDataGameIds, clearTestDataIgnored)</li><li>Replace getExportData from DB</li><li>Keep drafts in localStorage (saveDraft, loadDraft, clearDraft)</li></ul> | Supabase connected; app uses it for reads/writes |
| Migrate entries      | Populate Supabase with existing data     | <ul><li>Export from localStorage (Archive Export button) and/or use <code>stored-games.json</code></li><li>Run one-time migration script: read JSON, insert into players and games via Supabase client</li><li>Verify row counts and spot-check a few games</li></ul> | Data lives in Supabase; begin testing            |
| Test                 | Verify everything works in production    | <ul><li>Redeploy to Netlify</li><li>Verify New Game flow</li><li>Verify Archive (list, expand, delete non-fixture)</li><li>Verify Stats (charts, leaderboard)</li><li>Verify Load/Ignore stored games flow</li></ul> | Everything works; ready to document fallback     |
| Plan fallback        | Document stored-games as fallback        | <ul><li>Confirm: DB primary, <code>stored-games.json</code> fallback</li><li>Document fallback behavior (Load = import into DB; Ignore = clear fixture rows; Export = backup from DB)</li><li>Update <code>fixtures/README.md</code> with new behavior</li></ul> | Fallback behavior documented                     |


**Schema** (reference: `src/constants.js` Game/Round typedefs; `fixtures/stored-games.json` for sample data)

- **players**
  - `id` (uuid, pk)
  - `name` (text, unique)
  - Single table for all player names; migration seeds from `stored-games.json`.players and localStorage; `getAllPlayerNames` = select from this table
- **games**
  - `id` (uuid, pk)
  - `date` (text)
  - `players` (jsonb) — array of strings, e.g. `["Asha", "Clancy", "Pete"]`
  - `winner` (text)
  - `totals` (jsonb)
  - `rounds` (jsonb) — array of objects; each has `round`, `scores`, `tunk`, `tinks`, `magic65s`, `falseTunks`
  - `scratch` (boolean)
  - `source` (text, optional) — `'fixture'` for Load/Ignore flow
- **Recommendations**
  - Add `created_at timestamptz default now()` to both tables
  - Use `default gen_random_uuid()` for `id` columns
  - Index `games (date desc)` for archive "newest first" queries
  - Index `games (source)` for Ignore flow

**Migration:** One-time Node script (e.g. `scripts/migrate-to-supabase.js`) that loads `stored-games.json` and/or exported JSON, then inserts into Supabase via `@supabase/supabase-js`. Insert players first, then games. Set `source: 'fixture'` for games from stored-games.json. Use upsert for idempotency. Use `dotenv` or `--env-file` so the script reads `.env`. Run after env vars are set.

### 5. Phase 5 — Password protection and auth

- Password protection (Supabase Auth)
- Optionally explore login credentials

### 6. Phase 6 — Explore more features

- More player stats metrics and chart visualizations
- Player vs player matchups
- Upload/scan a photo of a paper scoresheet to auto-populate the form (OCR or similar)

---

## Implementation notes

### Code structure

- `main.js` — Nav, view switching, Load/Ignore control
- `form.js` — New Game form and scoresheet
- `archive.js` — Archive view, export, delete, date edit
- `stats.js` — Stats view and charts
- `api.js` — Persistence (localStorage)
- `scratch.js` — Dev/test data generation

### Data model

Game and Round schema are defined in `src/constants.js`. Each round tracks `scores`, `tunk`, `tinks`, `magic65s`, and `falseTunks` per player.

### Testing

Dev controls for testing and fixtures:

- **Load / Ignore stored games** — When `fixtures/stored-games.json` has games, "Load stored games (N)" or "Ignore stored games (N)" appears on New Game and Archive, where N is the fixture game count. Load merges fixture data into storage; Ignore clears fixture rows. See `fixtures/README.md` for export/load instructions.
- **Scratch entry** — New Game: generates a test draft. Archive: generates a test game. Both use realistic scores borrowed from stored games (round scores and totals capped to match real data).
- **Fill sheet** — Scoresheet toolbar button that fills the sheet with realistic scores from stored games and tunks, or clears when already filled.
- **Export** — Archive Export button downloads `exported-games.json` excluding scratch entries.