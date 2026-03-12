import testData from '../fixtures/test-data.json';

const PRIMARY_PLAYERS = ['Asha', 'Clancy', 'Pete', 'Tim', 'Will', 'Larry'];
const SECONDARY_PLAYERS = ['Cori'];

const GAMES_KEY = '65ers_games';
const PLAYERS_KEY = '65ers_custom_players';

export function hasTestData() {
  return !!(testData?.games?.length);
}

export async function loadTestData() {
  if (testData?.games?.length) {
    localStorage.setItem(GAMES_KEY, JSON.stringify(testData.games));
  }
  if (testData?.players?.length) {
    localStorage.setItem(PLAYERS_KEY, JSON.stringify(testData.players));
  }
}

export function clearData() {
  localStorage.removeItem(GAMES_KEY);
  localStorage.removeItem(PLAYERS_KEY);
}

export async function saveGame(game) {
  const games = await loadGames();
  games.push(game);
  localStorage.setItem(GAMES_KEY, JSON.stringify(games));
}

export async function loadGames() {
  const raw = localStorage.getItem(GAMES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function getPlayerRows() {
  const custom = await loadCustomPlayers();
  custom.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  return {
    primary: PRIMARY_PLAYERS,
    secondary: [...SECONDARY_PLAYERS, ...custom],
  };
}

export async function getAllPlayerNames() {
  const custom = await loadCustomPlayers();
  return [...PRIMARY_PLAYERS, ...SECONDARY_PLAYERS, ...custom];
}

export async function addCustomPlayer(name) {
  const custom = await loadCustomPlayers();
  const trimmed = name.trim();
  if (!trimmed) return;
  const all = [...PRIMARY_PLAYERS, ...SECONDARY_PLAYERS, ...custom];
  if (all.some(n => n.toLowerCase() === trimmed.toLowerCase())) return;
  custom.push(trimmed);
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(custom));
}

async function loadCustomPlayers() {
  const raw = localStorage.getItem(PLAYERS_KEY);
  return raw ? JSON.parse(raw) : [];
}
