import testData from '../fixtures/test-data.json';

const FIXTURE_PLAYERS = testData?.players ?? [];

const GAMES_KEY = '65ers_games';
const PLAYERS_KEY = '65ers_custom_players';
const TEST_DATA_FLAG = '65ers_test_data';

export function hasTestData() {
  return !!(testData?.games?.length);
}

export async function loadTestData() {
  if (testData?.games?.length) {
    localStorage.setItem(GAMES_KEY, JSON.stringify(testData.games));
    localStorage.setItem(TEST_DATA_FLAG, '1');
  }
}

export function clearData() {
  localStorage.removeItem(GAMES_KEY);
  localStorage.removeItem(PLAYERS_KEY);
  localStorage.removeItem(TEST_DATA_FLAG);
}

/** Clear test data on page load/refresh so the app starts fresh. */
export function clearTestDataOnLoad() {
  if (localStorage.getItem(TEST_DATA_FLAG)) {
    clearData();
  }
}

export async function saveGame(game) {
  const games = await loadGames();
  games.push(game);
  localStorage.setItem(GAMES_KEY, JSON.stringify(games));
  localStorage.removeItem(TEST_DATA_FLAG);
}

export async function loadGames() {
  const raw = localStorage.getItem(GAMES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function getPlayerRows() {
  const games = await loadGames();
  if (games.length === 0) return { players: [] };
  const custom = await loadCustomPlayers();
  const all = [...FIXTURE_PLAYERS, ...custom];
  all.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  return { players: all };
}

export async function getAllPlayerNames() {
  const games = await loadGames();
  if (games.length === 0) return [];
  const custom = await loadCustomPlayers();
  return [...FIXTURE_PLAYERS, ...custom];
}

export async function addCustomPlayer(name) {
  const games = await loadGames();
  if (games.length === 0) return;
  const custom = await loadCustomPlayers();
  const trimmed = name.trim();
  if (!trimmed) return;
  const all = [...FIXTURE_PLAYERS, ...custom];
  if (all.some(n => n.toLowerCase() === trimmed.toLowerCase())) return;
  custom.push(trimmed);
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(custom));
}

async function loadCustomPlayers() {
  const raw = localStorage.getItem(PLAYERS_KEY);
  return raw ? JSON.parse(raw) : [];
}
