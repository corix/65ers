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
  - Date — usually 1 entry per date, but in rare cases there may be multiple games in a day
  - Number of players — varies, typically 4 to 7, rarely fewer or more
  - Players — selected via draggable pills, ordered by the user's arrangement
- Scoresheet entry
  - 11 rounds, with score per player per round; player columns are draggable to reorder
  - Cumulative scores after first round
  - Winning player of each round (the "tunk")
  - Total scores per player, with the winning player (lowest score) highlighted only after all 11 rounds are completed
  - Clear and Start over 
  - Keyboard shortcuts
    - **Tunk** — `*` or `t` in the score input. Tunk inputs display as a star (★); editable.
    - **Penalty** — Score + `x`, e.g. `9x`, or via "Add Penalty" (round/player). Adds +65 to that round. Each penalty has a × button to remove it.
    - **Magic 65** — `65` or `!` in the score input (not available in rounds 3 or 4).
  - After saving, a success state shows "View in Archive" to navigate to the Archive view
  - Drafts persist across navigation; returning to New Game restores unsaved data

### 2. Archive

All past game scoresheets, displayed as tabular data:

- Games listed newest-first in an accordion; only one game can be expanded at a time
- Delete (trash icon, two-click confirm) for non-fixture games
- Editable dates (double-click)
- A tunk is visually represented as a star (★) 
- A tink is shown as a number ("0") 
- A magic 65 is shown as "65*" 
- False tunks show a red "FT" badge
- Export button (header kebab: Download backup) downloads `exported-games.json`

### 3. Stats

Data insights and visualizations (display order):

- Most Recent Game chart — line chart of cumulative scores by round
- Player leaderboard — ranked by wins, then avg score with clickable names that expand to show detailed stats
- Record cards: Lowest All-Time Score, Most Tunks in a Game, Highest Winning Score
- Average Score by Round chart — scatter plot with regression lines

### Out of scope / not doing

- Ability to edit entries — delete and date-edit are supported; further edits not needed
- Multiple databases/different types of entries — only one collection of scoresheets, for one type of game
- The game itself (playing 65 with the computer) — this tool is just to store the scoresheets and show insights about the players
- CSV export — no value

---

## Roadmap

These are the building stages for this project.

### 1. Phase 1 — Testing web form 🟢 complete

- Web form with player pill selection, scoresheet grid, tunk/penalty shortcuts, and auto-computed totals
- Archive view with expandable game cards
- All data persisted in localStorage
- Vanilla JS and Vite, no framework

### 2. Phase 2 — Testing data insights 🟢 complete

- Create Stats tab
- Top three record cards: Lowest All-Time Score, Most Tunks in a Game, Highest Winning Score
- Leaderboard with wins, games, win %
  - Click a player name to expand detailed stats (avg score, tunks/tinks per game, best/worst game, penalties, zeros per game, best win streak, magic 65s)
- Two interactive Chart.js charts
  - Most Recent Game (cumulative score by round, inverted Y-axis), Average Score by Round (scatter with regression lines, legend-ordered by slope)
  - Hover/click legend to highlight a player; tooltips show round and score for highlighted player only

### 3. Phase 3 — Deploy to Netlify 🟢 complete

- Deploy static build through Netlify (connect GitHub repo; build command: `vite build`; publish directory: `dist/`)
- App runs in production with localStorage; validates deployment pipeline
- No backend or env vars required yet

### 4. 👉 Phase 4 — Integrate Supabase [WE ARE HERE]


| Todo                 | Purpose                                             | Task(s)                                                                                                                                                    | Status 🚥                                            |
| -------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Set up schema        | Define DB structure for persistence                 | • Create Supabase project • Games and players tables • Run migrations                                                                                      | 🟢 Tables exist; ready to connect                    |
| Create env variables | Enable app to connect to Supabase                   | • Get `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` from Supabase dashboard • Create `.env` in project root, add vars • Add to Netlify dashboard          | 🟢 Credentials in place; ready to wire up client     |
| Decide fixture flow  | Unblock Replace api.js                              | See *Implementation notes*                                                                                                                                 | 🟢 Decision made; implementation path clear          |
| Replace api.js       | Switch app from localStorage to Supabase            | • Install `@supabase/supabase-js` • Initialize Supabase client • Keep drafts in localStorage (saveDraft, loadDraft, clearDraft)                            | 🟢 Supabase connected; main uses it for reads/writes |
| Migrate entries      | Populate Supabase with existing data                | • Run manual migration script on `exported-games.json` to insert into players and games via Supabase client • Verify row counts and spot-check a few games | 🟢 Data lives in Supabase; begin testing             |
| Test                 | Verify everything works in production               | • Redeploy to Netlify • Test New Game -> game exists in DB • Test Archive -> game is removed from DB • Test Stats -> players included/removed              | 🌕 Everything works; ready to document               |
| Document             | Document fixture behavior (decisions and failsafes) | • dev-mode branch configured                                                                                                                               | 🌕 Fallback behavior documented                      |


**Schema** (reference: `src/constants.js` Game/Round typedefs; `fixtures/exported-games.json` for sample data)

- **players**
  - `id` (uuid, pk)
  - `name` (text, unique)
  - Single table for all player names; migration seeds from `exported-games.json`.players and localStorage; `getAllPlayerNames` = select from this table
- **games**
  - `id` (uuid, pk)
  - `date` (text)
  - `players` (jsonb) — array of strings, e.g. `["Asha", "Clancy", "Pete"]`
  - `winner` (text)
  - `totals` (jsonb)
  - `rounds` (jsonb) — array of objects; each has `round`, `scores`, `tunk`, `tinks`, `magic65s`, `falseTunks`
  - `scratch` (boolean)
  - `source` (text, optional) — `'fixture'` for migration-sourced games
- **Recommendations**
  - Add `created_at timestamptz default now()` to both tables
  - Use `default gen_random_uuid()` for `id` columns
  - Index `games (date desc)` for archive "newest first" queries
  - Index `games (source)` for fixture filtering

**Migration:** One-time Node script (e.g. `scripts/migrate-to-supabase.js`) that loads `exported-games.json` and/or exported JSON, then inserts into Supabase via `@supabase/supabase-js`. Insert players first, then games. Set `source: 'fixture'` for games from exported-games.json. Use upsert for idempotency. Use `dotenv` or `--env-file` so the script reads `.env`. Run after env vars are set.

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

- `main.js` — Nav, view switching; header kebab
- `form.js` — New Game form and scoresheet
- `archive.js` — Archive view, export, delete, date edit
- `stats.js` — Stats view and charts
- `api.js` — Persistence: main = full Supabase; dev-mode = hybrid (read Supabase + optional backup, write localStorage)
- `scratch.js` — Dev/test data generation

### Data model

Game and Round schema are defined in `src/constants.js`. Each round tracks `scores`, `tunk`, `tinks`, `magic65s`, and `falseTunks` per player.

### Branches

- **main** — Production branch. Full Supabase read/write.
- **dev-mode** — Testing branch. Read-only Supabase, write-only localStorage. Used to validate UI and flows against live Supabase data without modifying it. Dev controls: Read Supabase, Read backup, Clear local, Scratch entry, Fill sheet.

Dev controls for testing and fixtures:

- **Read Supabase** — Toggle (On/Off) in header kebab. When On, games and players are read from Supabase. When Off, only localStorage and Read backup data are used.
- **Read backup** — Toggle (On/Off) in header kebab. When On, merges games and players from `fixtures/exported-games.json` (read-only).
- **Clear local** — Red option in header kebab. Deletes all localStorage data (draft, local games, custom players, hidden IDs, overrides).
- **Scratch entry** — New Game: generates a test draft. Archive: generates a test game. Both use realistic scores borrowed from stored games (round scores and totals capped to match real data).
- **Fill sheet** — Scoresheet toolbar button that fills the sheet with realistic scores from stored games and tunks, or clears when already filled.
- **Export** — Archive Export button downloads `exported-games.json` excluding scratch entries (main branch only; disabled on dev-mode).

### Deprecated

**Load / Ignore stored games** — Before Supabase was implemented, the app used a Load/Ignore flow. When `fixtures/exported-games.json` (then `stored-games.json`) had games, "Load stored games (N)" or "Ignore stored games (N)" appears on New Game and Archive. Load merged fixture data into localStorage; Ignore cleared fixture rows. This was removed once Supabase was hooked up.

The migration script in `scripts/migrate-to-supabase.js` serves as a failsafe, where `exported-games.json` can populate Supabase directly if needed. In dev-mode, this fixture data can be toggled on/off on its own.