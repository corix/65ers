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
- Edit date/delete entries
  - Right-click on the entry to expose controls
  - Delete via trash icon; type DELETE to confirm in modal
  - Date can be changed with input and picker
- A tunk is visually represented as a star (★) 
- A tink is shown as a number ("0") 
- A magic 65 is shown as "(65)"
- False tunks (Penalties) show a red badge with "+65"
- Export button (header kebab: Download archive) downloads `65_Almanac_Backup_YYYY-MM-DD.json` (see [fixtures/README.md](fixtures/README.md) for format)

### 3. Stats

Data insights and visualizations (display order):

- Most Recent Game chart — line chart of cumulative scores by round
- Player leaderboard — ranked by wins, then avg score with clickable names that expand to show detailed stats
- Record cards: Lowest All-Time Score, Most Tunks in a Game, Highest Winning Score
- Average Score by Round chart — scatter plot with regression lines

### Additional features

- Download JSON backups with last save date (compares exported entries to DB)
- Theme toggle (header kebab: Dark/Light mode) with system preference fallback; persisted in localStorage

### Out of scope / not doing

- Ability to edit entries — delete and date-edit are supported; further edits not needed
- Multiple databases/different types of entries — only one collection of scoresheets, for one type of game
- The game itself (playing 65 with the computer) — this tool is just to store the scoresheets and show insights about the players
- CSV export — no real value

---

## Roadmap

These are the building stages for this project.


| Phase | Name                           | Status  |
| ----- | ------------------------------ | ------- |
| 1     | Prototype web form             | done    |
| 2     | Test data insights             | done    |
| 3     | Deploy to Netlify              | done    |
| 4     | Integrate Supabase             | done    |
| 5     | Auth + Demo mode               | done    |
| (5.5) | Bug Tracker (collect feedback) | done    |
| 6     | Scan Paper Scoresheet (OCR)    | planned |
| 7     | Stats 2.0                      | planned |


---

### 1. Phase 1 — Prototype web form 🟢 complete

- Web form with player pill selection, scoresheet grid, tunk/penalty shortcuts, and auto-computed totals
- Archive view with expandable game cards
- All data persisted in localStorage
- Vanilla JS and Vite, no framework

### 2. Phase 2 — Test data insights 🟢 complete

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

### 4. Phase 4 — Integrate Supabase 🟢 complete


| Todo                 | Purpose                                             | Task(s)                                                                                                                                                    | Status 🚥                                            |
| -------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Set up schema        | Define DB structure for persistence                 | - Create Supabase project - Games and players tables - Run migrations                                                                                      | 🟢 Tables exist; ready to connect                    |
| Create env variables | Enable app to connect to Supabase                   | - Get `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` from Supabase dashboard - Create `.env` in project root, add vars - Add to Netlify dashboard          | 🟢 Credentials in place; ready to wire up client     |
| Decide fixture flow  | Unblock Replace api.js                              | See *Implementation notes*                                                                                                                                 | 🟢 Decision made; implementation path clear          |
| Replace api.js       | Switch app from localStorage to Supabase            | - Install `@supabase/supabase-js` - Initialize Supabase client - Keep drafts in localStorage (saveDraft, loadDraft, clearDraft)                            | 🟢 Supabase connected; main uses it for reads/writes |
| Migrate entries      | Populate Supabase with existing data                | - Run manual migration script on `exported-games.json` to insert into players and games via Supabase client - Verify row counts and spot-check a few games | 🟢 Data lives in Supabase; begin testing             |
| Test                 | Verify everything works in production               | - Redeploy to Netlify - Test New Game → game exists in DB - Test Archive → game is removed from DB - Test Stats → players included/removed                 | 🟢 Everything works; ready to document               |
| Document             | Document fixture behavior (decisions and failsafes) | dev-mode branch configured for migration to Demo mode                                                                                                      | 🟢 Fallback behavior documented                      |


### 5. Phase 5 — Auth + Demo mode 🟢 complete

See [archive/PHASE-5_DONE.md](archive/PHASE-5_DONE.md)


| Todo             | Purpose                                   | Task(s)                                                                                                                                                                                                                                                           | Status 🚥 |
| ---------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Set up Demo mode | Add toggle for guests to make temp writes | - Merge demo-mode controls into main - Create `demo-mode.js` (isDemoMode, setDemoMode, initDemoModeFromUrl) - Refactor api.js to branch on isDemoMode - Kebab menu toggle - Scratch entry, Fill sheet when demo - Styles (.demo-mode-badge, .local-storage-entry) | 🟢 Done   |
| Hook up auth     | Email sign-in                             | - Disable self-signup in Supabase Dashboard - Create auth.js (signIn, signOut, onAuthStateChange, renderSignInForm) - main.js session check - index.html auth container                                                                                           | 🟢 Done   |
| Define RLS       | Gate writes by auth state                 | Migration: drop anon write policies; authenticated full access on games and players                                                                                                                                                                               | 🟢 Done   |
| Gate UI          | Hide Edit/Delete when not authenticated   | - archive.js: canWrite = authenticated or isDemoMode - form.js: sign-in form + Try Demo when not authenticated - main.js kebab: Demo toggle for all, Sign Out for authenticated                                                                                   | 🟢 Done   |
| Admin QA         | Restrict signups; verify flows            | - Disable Email Signup in Supabase - Test unauthenticated (read-only, Demo) and authenticated (full write) flows                                                                                                                                                  | 🟢 Done   |


### 5.5. Phase 5.5 — Bug Tracker 🟢 complete

See [BUGS.md](BUGS.md)


| Todo               | Purpose                        | Task(s)                                                                                                              | Status  |
| ------------------ | ------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ------- |
| Supabase schema    | Store bugs and gate access     | bugs table + RLS                                                                                                     | 🟢 Done |
| Report entry point | Let users submit feedback      | Bug icon in header (all users); kebab "Feedback (N)" when signed in                                                  | 🟢 Done |
| Bug report modal   | Collect description and author | showBugReportModal; description + name (anon only); device_info capture; toast on success                            | 🟢 Done |
| Bugs page          | View and manage feedback       | renderBugs; compact cards; author/time, description (truncate 500 chars), details; right-click trash; delete confirm | 🟢 Done |
| API (bugs.js)      | Persistence and counts         | submitBug, loadBugs, getBugCount, deleteBug                                                                          | 🟢 Done |


### 6. Phase 6 — Scan Paper Scoresheet (OCR)

See [PHASE-6.md](PHASE-6.md)

### 7. Phase 7 - Stats 2.0

See [PHASE-7.md](PHASE-7.md)

---

## Implementation notes

### Tech stack

Vite, vanilla JS, Chart.js, Supabase. No framework.

### Code structure

- `main.js` — Nav, view switching (persists last view in localStorage); header kebab
- `form.js` — New Game form and scoresheet
- `archive.js` — Archive view, export, delete, date edit
- `stats.js` — Stats view and charts
- `stats-compute.js` — Stats computation (`computeStats`, `linearRegression`, `median`) used by stats.js
- `demo-mode.js` — Runtime toggle (`isDemoMode`, `setDemoMode`, `initDemoModeFromUrl`); persists in localStorage
- `auth.js` — Sign in/out, session check, `renderSignInForm`
- `api.js` — Persistence: when Demo Mode OFF and authenticated = full Supabase; when Demo Mode ON or unauthenticated = hybrid (read Supabase + optional backup, write localStorage). RLS gates writes to authenticated users.
- `supabase.js` — Supabase client initialization (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- `utils.js` — Shared helpers: `formatDate`, `todayShort`, `todayISO`
- `scratch.js` — Dev/test data generation
- Styles: `shared.css`, `form.css`, `archive.css`, `stats.css` (imported by stats.js)

### Dev setup

- **Env vars:** `.env` in project root with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (from Supabase dashboard). `.env` is gitignored.
- **Migration:** `pnpm run migrate` (or `npm run migrate`) runs `scripts/migrate-to-supabase.js` with `--env-file=.env` to seed Supabase from `exported-games.json`.

### Data model

Game and Round schema are defined in `src/constants.js`. Each round tracks `scores`, `tunk`, `tinks`, `magic65s`, and `falseTunks` per player.

**Schema** (reference: `src/constants.js` Game/Round typedefs; `fixtures/exported-games.json` for sample data)

- **players**
  - `id` (uuid, pk)
  - `name` (text, unique)
  - `created_at` (timestamptz, default now())
  - Single table for all player names; migration seeds from fixture file (e.g. `exported-games.json`); `getAllPlayerNames` = select from this table
- **games**
  - `id` (uuid, pk)
  - `date` (text)
  - `players` (jsonb) — array of strings, e.g. `["Asha", "Clancy", "Pete"]`
  - `winner` (text)
  - `totals` (jsonb)
  - `rounds` (jsonb) — array of objects; each has `round`, `scores`, `tunk`, `tinks`, `magic65s`, `falseTunks`
  - `source` (text, optional) — `'fixture'` for migration-sourced games
  - `created_at` (timestamptz, default now())
- **Recommendations**
  - Use `default gen_random_uuid()` for `id` columns
  - Index `games (date desc)` for archive "newest first" queries
  - Index `games (source)` for fixture filtering

### Current architecture

- **main** — Single production branch. Demo Mode is a runtime toggle (kebab menu); no separate dev-mode branch.
- **Auth:** Authenticated users get full Supabase read/write. Unauthenticated users get read-only; they can enable Demo Mode to write to localStorage.
- **Demo Mode controls** (visible in kebab when Demo Mode is on): Live source data, Backup data, Clear demo data, Scratch entry, Fill sheet.
- **Auth controls** (kebab): Sign in (when not authenticated), Sign out (when authenticated), Download archive (authenticated and not in Demo Mode).

### Dev controls for testing and fixtures

- **Live source data** — Toggle (On/Off). When On, games and players are read from Supabase (read-only).
- **Backup data** — Toggle (On/Off). When On, games and players are read from `fixtures/exported-games.json` (read-only).
- **Clear demo data** — Deletes all localStorage data (draft, local games, custom players, hidden IDs, overrides).
- **Scratch entry** — ("Quick add") New Game: generates a test draft. Archive: generates a test game.
- **Fill sheet** — Scoresheet toolbar button that fills the sheet with realistic scores, or clears when already filled.
- **Download archive** — Downloads `65_Almanac_Backup_YYYY-MM-DD.json`. Shown only when authenticated and not in Demo Mode.

### Deprecated

**Load / Ignore stored games** — Before Supabase was implemented, the app used a Load/Ignore flow. When `fixtures/exported-games.json` (then `stored-games.json`) had games, "Load stored games (N)" or "Ignore stored games (N)" appears on New Game and Archive. Load merged fixture data into localStorage; Ignore cleared fixture rows. This was removed once Supabase was hooked up.

The migration script in `scripts/migrate-to-supabase.js` serves as a failsafe, where `exported-games.json` can populate Supabase directly if needed. In Demo Mode, this fixture data can be toggled on/off on its own.