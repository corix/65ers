import { supabase } from './supabase.js';

const DRAFT_KEY = '65ers_draft';

let gamesCache = null;
let playersCache = null;

export function invalidateGamesCache() {
  gamesCache = null;
}

export function invalidatePlayersCache() {
  playersCache = null;
}

export async function saveGame(game) {
  invalidateGamesCache();
  invalidatePlayersCache();
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

export async function loadGames() {
  if (gamesCache) return gamesCache;
  const { data, error } = await supabase
    .from('games')
    .select('id, date, players, winner, totals, rounds, source')
    .order('date', { ascending: false });
  if (error) throw error;
  gamesCache = (data ?? []).map(rowToGame);
  return gamesCache;
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

export async function deleteGame(gameId, playersInGame = []) {
  invalidateGamesCache();
  invalidatePlayersCache();
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

export async function updateGame(gameId, updates) {
  invalidateGamesCache();
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
  const players = await loadCustomPlayers();
  players.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  return { players };
}

export async function getAllPlayerNames() {
  return loadCustomPlayers();
}

/** Returns { players, customPlayers } from a single fetch. Use for form setup. */
export async function getPlayerRowsAndCustom() {
  const players = await loadCustomPlayers();
  players.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const customPlayers = new Set(players.map(n => n.toLowerCase()));
  return { players, customPlayers };
}

export async function cleanOrphanedPlayers(draftPlayers = [], gamesOverride = null) {
  const [playersData, games] = await Promise.all([
    supabase.from('players').select('id, name'),
    gamesOverride ? Promise.resolve(gamesOverride) : loadGames(),
  ]);
  if (playersData.error) throw playersData.error;

  const inGames = new Set(
    games.flatMap((g) => (g.players ?? []).map((p) => String(p).trim().toLowerCase()))
  );
  const inDraft = new Set(
    (draftPlayers ?? []).map((p) => String(p).trim().toLowerCase())
  );

  for (const row of playersData.data ?? []) {
    const key = (row.name || '').trim().toLowerCase();
    if (inGames.has(key) || inDraft.has(key)) continue;
    await supabase.from('players').delete().eq('id', row.id);
  }
  invalidatePlayersCache();
}

export async function addCustomPlayer(name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  invalidatePlayersCache();
  const all = await getAllPlayerNames();
  if (all.some(n => n.toLowerCase() === trimmed.toLowerCase())) return;
  const { error } = await supabase.from('players').insert({ name: trimmed });
  if (error) throw error;
}

export async function removeCustomPlayer(name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  invalidatePlayersCache();
  const { data } = await supabase.from('players').select('id').ilike('name', trimmed).maybeSingle();
  if (!data) return;
  const { error } = await supabase.from('players').delete().eq('id', data.id);
  if (error) throw error;
}

export async function getCustomPlayers() {
  return loadCustomPlayers();
}

async function loadCustomPlayers() {
  if (playersCache) return playersCache;
  const { data, error } = await supabase.from('players').select('name').order('name');
  if (error) throw error;
  playersCache = (data ?? []).map((r) => r.name);
  return playersCache;
}
