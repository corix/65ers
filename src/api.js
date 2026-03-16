import { supabase } from './supabase.js';
import { isDemoMode, setDemoMode } from './demo-mode.js';
import exportedData from '../fixtures/exported-games.json';

const DRAFT_KEY = '65ers_draft';
const EXPORTED_DATA_ENABLED_KEY = '65ers_read_exported_data';
const READ_SUPABASE_KEY = '65ers_read_supabase';
const SUPABASE_COUNT_KEY = '65ers_supabase_count';
const LAST_SAVE_KEY = '65ers_last_save';
const LAST_EXPORTED_AT_KEY = '65ers_last_exported_at';
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

export function isLocalGame(gameId) {
  return getLocalGames().some((g) => g.id === gameId);
}

export function isSupabaseDisabled() {
  if (!isDemoMode()) return false;
  return localStorage.getItem(READ_SUPABASE_KEY) !== '1';
}

export function setSupabaseDisabled(disabled) {
  if (isDemoMode()) {
    localStorage.setItem(READ_SUPABASE_KEY, disabled ? '0' : '1');
  } else if (disabled) {
    setDemoMode(true);
  }
}

export function isExportedDataEnabled() {
  return localStorage.getItem(EXPORTED_DATA_ENABLED_KEY) === '1';
}

export function setExportedDataEnabled(enabled) {
  localStorage.setItem(EXPORTED_DATA_ENABLED_KEY, enabled ? '1' : '0');
}

export function getLastExportedAt() {
  return localStorage.getItem(LAST_EXPORTED_AT_KEY);
}

export function setLastExportedAt() {
  localStorage.setItem(LAST_EXPORTED_AT_KEY, new Date().toISOString());
}

const CLEARABLE_KEYS = [
  DRAFT_KEY,
  LAST_SAVE_KEY,
  LOCAL_GAMES_KEY,
  HIDDEN_GAME_IDS_KEY,
  GAME_OVERRIDES_KEY,
  CUSTOM_PLAYERS_KEY,
  HIDDEN_PLAYER_NAMES_KEY,
];

export function hasLocalData() {
  return CLEARABLE_KEYS.some((key) => localStorage.getItem(key) != null);
}

/** Count of games in Supabase. Persisted so it's available when Supabase is disabled; never overwritten with 0. */
export async function getSupabaseGameCount() {
  if (!isSupabaseDisabled()) {
    const result = await supabase.from('games').select('*', { count: 'exact', head: true });
    const count = result.count ?? 0;
    if (count > 0) localStorage.setItem(SUPABASE_COUNT_KEY, String(count));
  }
  const persisted = localStorage.getItem(SUPABASE_COUNT_KEY);
  return persisted != null ? parseInt(persisted, 10) : 0;
}

/** Count of games in exported-games.json. */
export function getExportedGameCount() {
  const games = exportedData?.games ?? [];
  return games.filter((g) => g.id).length;
}

/** Count of local games in localStorage. */
export function getLocalGameCount() {
  return getLocalGames().length;
}

export function clearLocalData() {
  for (const key of CLEARABLE_KEYS) {
    localStorage.removeItem(key);
  }
}

/** Clear player names stored in localStorage (custom players, hidden names). */
export function clearLocalPlayerData() {
  localStorage.removeItem(CUSTOM_PLAYERS_KEY);
  localStorage.removeItem(HIDDEN_PLAYER_NAMES_KEY);
}

export async function saveGame(game) {
  if (isDemoMode()) {
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
    localStorage.setItem(LAST_SAVE_KEY, new Date().toISOString());
  } else {
    const playerNames = game.players ?? [];
    for (const name of playerNames) {
      const trimmed = String(name).trim();
      if (!trimmed) continue;
      await supabase.from('players').upsert({ name: trimmed }, { onConflict: 'name', ignoreDuplicates: true });
    }
    const row = {
      id: game.id,
      date: game.date,
      players: game.players,
      winner: game.winner,
      totals: game.totals ?? {},
      rounds: game.rounds ?? [],
      source: game.source ?? null,
    };
    const { error } = await supabase.from('games').insert(row);
    if (error) throw error;
  }
  localStorage.setItem(LAST_SAVE_KEY, new Date().toISOString());
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
  if (isDemoMode() && isExportedDataEnabled() && exportedData?.games?.length) {
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

  const localForMerge = isDemoMode() ? localGames : [];
  // In demo mode: prefer local > exported > Supabase so localStorage/backup data is never overwritten
  const byId = new Map();
  for (const g of supabaseGames) byId.set(g.id, g);
  for (const g of exportedGames) byId.set(g.id, g);
  for (const g of localForMerge) byId.set(g.id, g);
  const merged = [...byId.values()].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return merged;
}

/** Returns { total, backedUp } for the Download archive caption. */
export async function getDownloadBackupCounts() {
  const fixtureGames = exportedData?.games ?? [];
  const fixtureIds = new Set(fixtureGames.map((g) => g.id).filter(Boolean));
  const allResult = await supabase.from('games').select('*', { count: 'exact', head: true });
  return { total: allResult.count ?? 0, backedUp: fixtureIds.size };
}

export async function deleteGame(gameId, playersInGame = []) {
  if (isDemoMode()) {
    if (isLocalGame(gameId)) {
      const localGames = getLocalGames().filter((g) => g.id !== gameId);
      setLocalGames(localGames);
    } else {
      addHiddenGameId(gameId);
    }
  } else {
    const { error } = await supabase.from('games').delete().eq('id', gameId);
    if (error) throw error;
    const remainingGames = await loadGames();
    const playersStillInGames = new Set(
      remainingGames.flatMap((g) => (g.players ?? []).map((p) => String(p).trim().toLowerCase()))
    );
    for (const name of playersInGame) {
      const trimmed = String(name).trim();
      if (!trimmed) continue;
      if (playersStillInGames.has(trimmed.toLowerCase())) continue;
      const { data: row } = await supabase.from('players').select('id').ilike('name', trimmed).maybeSingle();
      if (row) await supabase.from('players').delete().eq('id', row.id);
    }
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
  if (isDemoMode()) {
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
  } else {
    const row = {};
    if (updates.date != null) row.date = updates.date;
    if (updates.players != null) row.players = updates.players;
    if (updates.winner != null) row.winner = updates.winner;
    if (updates.totals != null) row.totals = updates.totals;
    if (updates.rounds != null) row.rounds = updates.rounds;
    if (updates.source != null) row.source = updates.source;
    if (Object.keys(row).length === 0) return;
    const { error } = await supabase.from('games').update(row).eq('id', gameId);
    if (error) throw error;
  }
}

export async function getExportData() {
  const [allGames, players] = await Promise.all([
    loadGames(),
    getAllPlayerNames(),
  ]);
  return { games: allGames, players };
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
  if (isDemoMode() && isExportedDataEnabled() && exportedData?.players?.length) {
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
