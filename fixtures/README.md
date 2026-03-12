# Test Data

Replace the contents of `test-data.json` with your exported localStorage data.

**To export from the browser:** Open DevTools (F12) → Console, then run:

```javascript
const data = {
  games: JSON.parse(localStorage.getItem('65ers_games') || '[]'),
  players: JSON.parse(localStorage.getItem('65ers_custom_players') || '[]')
};
copy(JSON.stringify(data, null, 2));
```

Paste the result into `test-data.json`, replacing the existing content.

In the **Archive** view, when no games are saved, a "Load test data" button appears. Click it to load this file into localStorage.
