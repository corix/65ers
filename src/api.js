import { supabase } from './supabase.js';
import exportedData from '../fixtures/exported-games.json';

const DRAFT_KEY = '65ers_draft';
const SUPABASE_DISABLED_KEY = '65ers_supabase_disabled';
const EXPORTED_DATA_ENABLED_KEY = '65ers_read_exported_data';
const LOCAL_GAMES_KEY = '65ers_local_games';
const HIDDEN_GAME_IDS_KEY = '65ers_hidden_game_ids';
const GAME_OVERRIDES_KEY = '65ers_game_overrides';
const CUSTOM_PLAYERS_KEY = '65ers_custom_players';
const HIDDEN_PLAYER_NAMES_KEY = '65ers_hidden_player_names';

function getLocalGames() {
  const raw = localStorage.getItem(LOCAL_GAMES_KEY);
  return raw ? JSON.parse(raw) : [];
}

function setLocalGames(games) {
  localStorage.setItem(LOCAL_GAMES_KEY, JSON.stringify(games));
}

function getHiddenGameIds() {
  const raw = localStorage.getItem(HIDDEN_GAME_IDS_KEY);
  return raw ? new Set(JSON.parse(raw)) : new Set();
}

function addHiddenGameId(id) {
  const ids = getHiddenGameIds();
  ids.add(id);
  localStorage.setItem(HIDDEN_GAME_IDS_KEY, JSON.stringify([...ids]));
}

function getGameOverrides() {
  const raw = localStorage.getItem(GAME_OVERRIDES_KEY);
  return raw ? JSON.parse(raw) : {};
}

function setGameOverride(gameId, updates) {
  const overrides = getGameOverrides();
  overrides[gameId] = { ...(overrides[gameId] ?? {}), ...updates };
  localStorage.setItem(GAME_OVERRIDES_KEY, JSON.stringify(overrides));
}

function getLocalCustomPlayers() {
  const raw = localStorage.getItem(CUSTOM_PLAYERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function setCustomPlayers(players) {
  localStorage.setItem(CUSTOM_PLAYERS_KEY, JSON.stringify(players));
}

function getHiddenPlayerNames() {
  const raw = localStorage.getItem(HIDDEN_PLAYER_NAMES_KEY);
  return raw ? new Set(JSON.parse(raw)) : new Set();
}

function addHiddenPlayerName(name) {
  const names = getHiddenPlayerNames();
  names.add(name.trim().toLowerCase());
  localStorage.setItem(HIDDEN_PLAYER_NAMES_KEY, JSON.stringify([...names]));
}

function rowToGame(row) {
  return {
    id: row.id,
    date: row.date,
    players: row.players ?? [],
    winner: row.winner,
    totals: row.totals ?? {},
    rounds: row.rounds ?? [],
    source: row.source,
  };
}

function isLocalGame(gameId) {
  return getLocalGames().some((g) => g.id === gameId);
}

export function isSupabaseDisabled() {
  return localStorage.getItem(SUPABASE_DISABLED_KEY) === '1';
}

export function setSupabaseDisabled(disabled) {
  if (disabled) {
    localStorage.setItem(SUPABASE_DISABLED_KEY, '1');
  } else {
    localStorage.removeItem(SUPABASE_DISABLED_KEY);
  }
}

export function isExportedDataEnabled() {
  return localStorage.getItem(EXPORTED_DATA_ENABLED_KEY) === '1';
}

export function setExportedDataEnabled(enabled) {
  if (enabled) {
    localStorage.setItem(EXPORTED_DATA_ENABLED_KEY, '1');
  } else {
    localStorage.removeItem(EXPORTED_DATA_ENABLED_KEY);
  }
}

export function clearLocalData() {
  localStorage.removeItem(DRAFT_KEY);
  localStorage.removeItem(LOCAL_GAMES_KEY);
  localStorage.removeItem(HIDDEN_GAME_IDS_KEY);
  localStorage.removeItem(GAME_OVERRIDES_KEY);
  localStorage.removeItem(CUSTOM_PLAYERS_KEY);
  localStorage.removeItem(HIDDEN_PLAYER_NAMES_KEY);
}

export async function saveGame(game) {
  const localGames = getLocalGames();
  const row = {
    id: game.id,
    date: game.date,
    players: game.players,
    winner: game.winner,
    totals: game.totals ?? {},
    rounds: game.rounds ?? [],
    source: game.source ?? null,
  };
  localGames.push(row);
  setLocalGames(localGames);
}

export async function loadGames() {
  const [localGames, hiddenIds, overrides] = await Promise.all([
    Promise.resolve(getLocalGames()),
    Promise.resolve(getHiddenGameIds()),
    Promise.resolve(getGameOverrides()),
  ]);

  let supabaseGames = [];
  if (!isSupabaseDisabled()) {
    const supabaseResult = await supabase
      .from('games')
      .select('id, date, players, winner, totals, rounds, source')
      .order('date', { ascending: false });
    if (supabaseResult.error) throw supabaseResult.error;
    supabaseGames = (supabaseResult.data ?? [])
      .filter((row) => !hiddenIds.has(row.id))
      .map(rowToGame)
      .map((g) => {
        const o = overrides[g.id];
        return o ? { ...g, ...o } : g;
      });
  }

  let exportedGames = [];
  if (isExportedDataEnabled() && exportedData?.games?.length) {
    exportedGames = exportedData.games
      .filter((g) => g.id && !hiddenIds.has(g.id))
      .map((g) => ({
        id: g.id,
        date: g.date,
        players: g.players ?? [],
        winner: g.winner,
        totals: g.totals ?? {},
        rounds: g.rounds ?? [],
        source: 'exported',
      }))
      .map((g) => {
        const o = overrides[g.id];
        return o ? { ...g, ...o } : g;
      });
  }

  const merged = [...supabaseGames, ...exportedGames, ...localGames];
  merged.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return merged;
}

export async function deleteGame(gameId) {
  if (isLocalGame(gameId)) {
    const localGames = getLocalGames().filter((g) => g.id !== gameId);
    setLocalGames(localGames);
  } else {
    addHiddenGameId(gameId);
  }

  const remainingGames = await loadGames();
  const playersStillInGames = new Set(
    remainingGames.flatMap((g) => (g.players ?? []).map((p) => String(p).trim().toLowerCase()))
  );

  const customPlayers = getLocalCustomPlayers();
  const filtered = customPlayers.filter((name) => {
    const trimmed = String(name).trim();
    if (!trimmed) return false;
    return playersStillInGames.has(trimmed.toLowerCase());
  });
  setCustomPlayers(filtered);
}

export async function updateGame(gameId, updates) {
  if (isLocalGame(gameId)) {
    const localGames = getLocalGames();
    const idx = localGames.findIndex((g) => g.id === gameId);
    if (idx >= 0) {
      localGames[idx] = { ...localGames[idx], ...updates };
      setLocalGames(localGames);
    }
  } else {
    setGameOverride(gameId, updates);
  }
}

export async function getExportData() {
  const allGames = await loadGames();
  return { games: allGames };
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
  const players = await getCustomPlayers();
  players.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  return { players };
}

export async function getAllPlayerNames() {
  return getCustomPlayers();
}

/** Returns { players, customPlayers } from a single fetch. Use for form setup. */
export async function getPlayerRowsAndCustom() {
  const players = await getCustomPlayers();
  players.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const customPlayers = new Set(players.map((n) => n.toLowerCase()));
  return { players, customPlayers };
}

export async function cleanOrphanedPlayers(draftPlayers = []) {
  const games = await loadGames();
  const inGames = new Set(
    games.flatMap((g) => (g.players ?? []).map((p) => String(p).trim().toLowerCase()))
  );
  const inDraft = new Set(
    (draftPlayers ?? []).map((p) => String(p).trim().toLowerCase())
  );

  const customPlayers = getLocalCustomPlayers();
  const filtered = customPlayers.filter((name) => {
    const key = (name || '').trim().toLowerCase();
    return inGames.has(key) || inDraft.has(key);
  });
  setCustomPlayers(filtered);
}

export async function addCustomPlayer(name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const all = await getAllPlayerNames();
  if (all.some((n) => n.toLowerCase() === trimmed.toLowerCase())) return;
  const custom = getLocalCustomPlayers();
  custom.push(trimmed);
  setCustomPlayers(custom);
}

export async function removeCustomPlayer(name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const custom = getLocalCustomPlayers();
  const inLocal = custom.some((n) => n.toLowerCase() === trimmed.toLowerCase());
  if (inLocal) {
    setCustomPlayers(custom.filter((n) => n.toLowerCase() !== trimmed.toLowerCase()));
  } else {
    addHiddenPlayerName(trimmed);
  }
}

export async function getCustomPlayers() {
  const [games, localCustom, hiddenNames] = await Promise.all([
    loadGames(),
    Promise.resolve(getLocalCustomPlayers()),
    Promise.resolve(getHiddenPlayerNames()),
  ]);

  let fromSupabase = [];
  if (!isSupabaseDisabled()) {
    const supabaseResult = await supabase.from('players').select('name').order('name');
    if (supabaseResult.error) throw supabaseResult.error;
    fromSupabase = (supabaseResult.data ?? [])
      .map((r) => (r.name || '').trim())
      .filter((n) => n && !hiddenNames.has(n.toLowerCase()));
  }

  let fromExported = [];
  if (isExportedDataEnabled() && exportedData?.players?.length) {
    fromExported = (exportedData.players ?? [])
      .map((n) => String(n).trim())
      .filter((n) => n && !hiddenNames.has(n.toLowerCase()));
  }

  const fromGames = games.flatMap((g) =>
    (g.players ?? []).map((p) => String(p).trim()).filter(Boolean)
  );
  const fromGamesFiltered = fromGames.filter((n) => !hiddenNames.has(n.toLowerCase()));

  const merged = [...new Set([...fromSupabase, ...fromExported, ...fromGamesFiltered, ...localCustom])];
  merged.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  return merged;
}
