# The 65 Almanac

Note: This is a living document for planned and executed work.

## Overview

Data entry tool for digitizing paper scoresheets from a family card game called "65."

### Game rules

- Each game has 11 rounds
- The player with the lowest final score wins
- The first player to get to 0 in the round is the round winner — this move is called a "tunk"
- When a player scores 0 points in a round, but is not a tunk, this is called a "tink"
- If a player scores exactly 65 points in a round, this counts as a "magic 65" and is calculated as 0 points toward their total game score
- Tunks, tinks, and magic 65s are mutually exclusive — players can only tunk, or tink, or get a magic 65 in a round
- No matter how many tunks, tinks, or magic 65s a player gets, they still must have the lowest total score after the 11th round to be the game winner
- In rare cases, a player will have a "false tunk," and will be penalized by adding 65 points to their score for that round
- The rounds are named: 3, 4, 5, 6, 7, 8, 9, 10, J (for Jacks), Q (for Queens), and K (for Kings)

Terminology note: "tunk" and "tink" are both verbs and nouns. Examples: 

- "I got a tink."
- "Did you just tunk?" / "Yes, I tunked."
- "Read 'em and weep: sixty-five." / "Nice! Zero points for you."

### Features

The app has 3 main features:

#### 1. Web form

Creates new entries. Each entry consists of:

- New Game setup
  - Date — entered as short text in M/D/YY format (usually 1 entry per date, but in rare cases there may be multiple games in a day)
  - Number of players — varies, typically 4 to 7, rarely fewer or more
  - Players — selected via draggable pills, ordered by the user's arrangement. A "+" pill reveals a form to add and save new player names.
- Scoresheet entry
  - 11 rounds, with score per player per round
  - Winning player of each round (the "tunk")
  - Total scores per player, with the winning player (lowest score) highlighted only after all 11 rounds are completed
- Shortcuts
  - Tunks can be entered by typing `*` in the score input or by selecting from a dropdown per round. Tunk inputs display with a green highlight and a star character, and are editable so they can be corrected.
  - Penalties can be added by typing `***` after a score in the input, e.g. `10***` or via a dropdown (round/player).

#### 2. Archive

All past game scoresheets, displayed as tabular data

[For now, stored locally, later on in a database]

- Games listed newest-first in an accordion; only one game can be expanded at a time
- A tunk is visually represented as a star (★) with a green highlight
- A tink is shown as a number ("0") in green text, no highlight
- A magic 65 is shown as "65*" with a blue highlight
- False tunks show a red "FT" badge

#### 3. Stats

Data insights and visualizations

- Record cards: Lowest All-Time Score, Most Tunks in a Game, Highest Winning Score
- Player leaderboard (ranked by wins, then avg score) with clickable names that expand to show detailed stats
- Two Chart.js visualizations: Most Recent Game (line chart of cumulative scores by round), Average Score by Round (scatter plot with regression lines, players ordered by slope)

### Nice-to-haves

- Password-protected access or invite-based login credentials 
- CSV export

### Non-goals / definitely out of scope

- Ability to edit or remove entries — not necessary past the testing stage 
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
- Test data set up in `/fixtures/`; Archive shows "Load test data" when empty, "Ignore test data" when games exist
- Backend-ready structure: `api.js` (async persistence, swap for fetch in Phase 3), `constants.js` (game schema), `stats-compute.js` (pure stat logic), per-view CSS

### 3. 👉 Phase 3 — Set up database on the back end [WE ARE HERE]

- Supabase; replace `api.js` with fetch; players and games in DB

### 4. Phase 4 — Deploy and test

- Deploy through Netlify
- Test web form and data insights

---

## Ideas

### Backlog

- Additional chart types or filters
- Nice-to-haves

### ✅ Completed

#### Data insights (written stats)

- Highest and lowest all-time final scores
- Most tunks (rounds won) in a single game
- Player leaderboard (ranked by games won, ranked by average  
final score)
- Individual player stats — total games won, total rounds won,  
average rounds won per game

#### Data visualizations (graphs)

- Most recent game (multiple line graph, each line is a player, Y  
axis is score and X axis is rounds)
- Average player performance (scatter plot of how a player tends  
to score in each round)

