# Test Data

`test-data.json` contains:

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

Paste the result into `test-data.json`, replacing the existing content.

**Load / Ignore test data** buttons appear on the **New Game** and **Archive** views when this file has games.
