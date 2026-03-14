import testData from '../fixtures/test-data.json';

const FIXTURE_PLAYERS = testData?.players ?? [];

const GAMES_KEY = '65ers_games';
const PLAYERS_KEY = '65ers_custom_players';
const TEST_DATA_IGNORED = '65ers_test_data_ignored';
const TEST_DATA_GAME_IDS = '65ers_test_data_game_ids';
const DRAFT_KEY = '65ers_draft';

export function hasTestData() {
  return !!(testData?.games?.length);
}

export function getTestDataGameIds() {
  return new Set((testData?.games ?? []).map(g => g.id).filter(Boolean));
}

export async function loadTestData(force = false) {
  if (!force && localStorage.getItem(TEST_DATA_IGNORED)) return;
  if (testData?.games?.length) {
    const existing = await loadGames();
    const testDataIds = testData.games.map(g => g.id).filter(Boolean);
    const kept = existing.filter(g => g.scratch || !testDataIds.includes(g.id));
    const merged = [...testData.games, ...kept];
    localStorage.setItem(GAMES_KEY, JSON.stringify(merged));
    if (testDataIds.length) localStorage.setItem(TEST_DATA_GAME_IDS, JSON.stringify(testDataIds));
    localStorage.removeItem(TEST_DATA_IGNORED);
  }
}

export async function clearData() {
  const games = await loadGames();
  const fixtureIds = new Set((testData?.games ?? []).map(g => g.id).filter(Boolean));
  const storedIds = (() => {
    const raw = localStorage.getItem(TEST_DATA_GAME_IDS);
    if (!raw) return null;
    try {
      const ids = JSON.parse(raw);
      return Array.isArray(ids) ? new Set(ids) : null;
    } catch {
      return null;
    }
  })();
  const testDataIds = (storedIds?.size ?? 0) > 0 ? storedIds : fixtureIds;
  const kept = games.filter(g => g.scratch || !testDataIds.has(g.id));
  localStorage.setItem(GAMES_KEY, JSON.stringify(kept));
  localStorage.removeItem(TEST_DATA_GAME_IDS);
  localStorage.setItem(TEST_DATA_IGNORED, '1');
}

export function clearTestDataIgnored() {
  localStorage.removeItem(TEST_DATA_IGNORED);
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

export function isTestDataGame(gameId) {
  const raw = localStorage.getItem(TEST_DATA_GAME_IDS);
  if (!raw) return false;
  try {
    const ids = JSON.parse(raw);
    return Array.isArray(ids) && ids.includes(gameId);
  } catch {
    return false;
  }
}

export async function deleteGame(gameId) {
  const games = await loadGames();
  const filtered = games.filter(g => g.id !== gameId);
  localStorage.setItem(GAMES_KEY, JSON.stringify(filtered));
}

export async function updateGame(gameId, updates) {
  const games = await loadGames();
  const idx = games.findIndex(g => g.id === gameId);
  if (idx === -1) return;
  games[idx] = { ...games[idx], ...updates };
  localStorage.setItem(GAMES_KEY, JSON.stringify(games));
}

export async function getExportData() {
  const players = await getAllPlayerNames();
  const allGames = await loadGames();
  const games = allGames.filter(g => !g.scratch);
  return { players, games };
}

export function saveDraft(draft) {
  if (draft) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } else {
    localStorage.removeItem(DRAFT_KEY);
  }
}

export function loadDraft() {
  const raw = localStorage.getItem(DRAFT_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

export async function getPlayerRows() {
  const custom = await loadCustomPlayers();
  const all = [...getBasePlayers(), ...custom];
  all.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  return { players: all };
}

export async function getAllPlayerNames() {
  const custom = await loadCustomPlayers();
  return [...getBasePlayers(), ...custom];
}

export async function addCustomPlayer(name) {
  const custom = await loadCustomPlayers();
  const trimmed = name.trim();
  if (!trimmed) return;
  const all = [...getBasePlayers(), ...custom];
  if (all.some(n => n.toLowerCase() === trimmed.toLowerCase())) return;
  custom.push(trimmed);
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(custom));
}

export async function removeCustomPlayer(name) {
  const custom = await loadCustomPlayers();
  const trimmed = name.trim();
  if (!trimmed) return;
  const filtered = custom.filter(n => n.toLowerCase() !== trimmed.toLowerCase());
  if (filtered.length === custom.length) return;
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(filtered));
}

export async function getCustomPlayers() {
  return loadCustomPlayers();
}

function getBasePlayers() {
  return localStorage.getItem(TEST_DATA_IGNORED) ? [] : FIXTURE_PLAYERS;
}

async function loadCustomPlayers() {
  const raw = localStorage.getItem(PLAYERS_KEY);
  return raw ? JSON.parse(raw) : [];
}
