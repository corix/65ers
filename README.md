# The 65 Almanac

Data entry tool for digitizing paper scoresheets from the card game "65."

## Features

- **New Game** — Date, players, scoresheet entry with keyboard shortcuts
- **Archive** — Record of past games
- **Stats** — Record cards, leaderboard, Chart.js visualizations
- **Backups** — See [fixtures/README.md](fixtures/README.md)

## Branches

- **main** — Production. Full Supabase read/write.
- **dev-mode** — Testing. Read-only Supabase, write-only localStorage. Dev controls: Read Supabase, Read backup, Clear local, Scratch entry, Fill sheet.

## Tech stack

Vite, vanilla JS, Chart.js, Supabase

## Roadmap

See [PLANNING.md](PLANNING.md) for the roadmap and implementation notes.
