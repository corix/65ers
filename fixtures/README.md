# Stored Games

`stored-games.json` contains:

- `players` — player names (single list, no primary/secondary distinction)
- `games` — saved game records

**To export from the browser:** Open DevTools (F12) → Console, then run:

```javascript
const data = {
  players: ["Asha", "Clancy", "Pete", "Tim", "Will", "Larry", "Cori"],
  games: JSON.parse(localStorage.getItem('65ers_games') || '[]')
};
copy(JSON.stringify(data, null, 2));
```

Paste the result into `stored-games.json`, replacing the existing content.

**Load / Ignore stored games** buttons appear on the **New Game** and **Archive** views when this file has games.

## Export button

The **Archive** view has an **Export** button in the toolbar. Clicking it downloads `exported-games.json` containing the current player list and all saved games (excluding scratch entries). Use this to back up your data or refresh the fixtures file without using DevTools.
