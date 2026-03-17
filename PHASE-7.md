# Phase 7: Stats 2.0 — Ideas [stub]

See [PLANNING.md](PLANNING.md) Phase 7.

## Overview

- **Goal:** Build out more insights and charts in the Stats page
- **Current state:** [stats.js](src/stats.js) renders the view; [stats-compute.js](src/stats-compute.js) does the math

---

## Current

### Charts

- **Most Recent Game** — Line chart of cumulative scores by round
- **Leaderboard** — Wins, games, win %; expandable details (avg score, tunks, tinks, etc.)

### Records

- **Record cards** — Lowest Score, Most Tunks, Highest Winning Score
- **Typical score per round** — Scatter + regression lines by player

---

## Ideas

### Records

- **Most Tinks in a Game** — Already computed; add record card. *Low*
- **Most Penalties in a Game** — Single-game record. *Medium*
- **Longest Win Streak** — `bestStreak` already computed; surface it. *Low*
- **Most Magic 65s in a Game** — Single-game record. *Medium*

### Charts

- **Game picker** — Choose which game to view (not just latest). *Medium*
- **Date range filter** — Filter charts by date. *Medium*
- **Wins over time** — Cumulative wins per player. *Medium*
- **Round difficulty** — Which rounds are toughest. *Medium*

### Leaderboard

- **Sort options** — Sort by wins, games, avg score, tunks, etc. *Low*
- **Head-to-head** — Matchup record for two players. *High*
- **Date range filter** — Limit to games in range. *Medium*

### Filtering & Time

- **Global date range** — One control for all Stats. *Medium*
- **Last N games** — "Last 10", "Last 50", etc. *Low*
- **Filter by player count** — 4-player games only, etc. *Medium*

### Other

- **Export chart** — Download as PNG. *Low*
- **Trends over time** — Win rate / avg score over time. *Medium*
- **Accessibility** — Screen reader, keyboard nav. *Medium*

---

## Files


| File                                     | Purpose                   |
| ---------------------------------------- | ------------------------- |
| [stats.js](src/stats.js)                 | View, charts, leaderboard |
| [stats-compute.js](src/stats-compute.js) | Stats computation         |
| [stats.css](src/stats.css)               | Styles                    |


