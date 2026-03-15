# Fixtures

`exported-games.json` contains:

- `players` — player names (single list, no primary/secondary distinction)
- `games` — saved game records

## Export and import backup JSON

### main branch

The **Archive** view has an **Export** button in the toolbar. Clicking it downloads `exported-games.json` containing the current player list and all saved games. Use this to back up your data or refresh the fixtures file.

### dev-mode branch

On the **dev-mode** branch, Export is disabled. Use the **Read backup** toggle in the header kebab menu to load games and players from `exported-games.json` (read-only).