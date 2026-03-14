import testData from '../fixtures/stored-games.json';
import { supabase } from './supabase.js';

const FIXTURE_PLAYERS = testData?.players ?? [];

const GAMES_KEY = '65ers_games';
const PLAYERS_KEY = '65ers_custom_players';
const TEST_DATA_IGNORED = '65ers_test_data_ignored';
const TEST_DATA_GAME_IDS = '65ers_test_data_game_ids';
const DRAFT_KEY = '65ers_draft';

export function hasTestData() {
  return !!(testData?.games?.length);
}

export function getTestDataGameCount() {
  return (testData?.games ?? []).length;
}

export function getTestDataGameIds() {
  return new Set((testData?.games ?? []).map(g => g.id).filter(Boolean));
}

export async function loadTestData(force = false) {
  if (!force && localStorage.getItem(TEST_DATA_IGNORED)) return;
  if (!testData?.games?.length) return;

  for (const name of FIXTURE_PLAYERS) {
    await supabase.from('players').upsert({ name }, { onConflict: 'name', ignoreDuplicates: true });
  }

  const rows = testData.games.map(g => ({
    id: g.id,
    date: g.date,
    players: g.players,
    winner: g.winner,
    totals: g.totals ?? {},
    rounds: g.rounds ?? [],
    scratch: g.scratch ?? false,
    source: 'fixture',
  }));

  const { error } = await supabase.from('games').upsert(rows, { onConflict: 'id' });
  if (error) throw error;

  localStorage.removeItem(TEST_DATA_IGNORED);
}

export async function clearData() {
  const { error } = await supabase.from('games').delete().eq('source', 'fixture');
  if (error) throw error;
  localStorage.setItem(TEST_DATA_IGNORED, '1');
}

export function clearTestDataIgnored() {
  localStorage.removeItem(TEST_DATA_IGNORED);
}

export async function saveGame(game) {
  const row = {
    id: game.id,
    date: game.date,
    players: game.players,
    winner: game.winner,
    totals: game.totals ?? {},
    rounds: game.rounds ?? [],
    scratch: game.scratch ?? false,
    source: game.source ?? null,
  };
  const { error } = await supabase.from('games').insert(row);
  if (error) throw error;
}

export async function loadGames() {
  const { data, error } = await supabase
    .from('games')
    .select('id, date, players, winner, totals, rounds, scratch, source, created_at')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToGame);
}

function rowToGame(row) {
  return {
    id: row.id,
    date: row.date,
    players: row.players ?? [],
    winner: row.winner,
    totals: row.totals ?? {},
    rounds: row.rounds ?? [],
    scratch: row.scratch ?? false,
    source: row.source,
  };
}

export function isTestDataGame(gameId) {
  return getTestDataGameIds().has(gameId);
}

export async function deleteGame(gameId) {
  const { error } = await supabase.from('games').delete().eq('id', gameId);
  if (error) throw error;
}

export async function updateGame(gameId, updates) {
  const row = {};
  if (updates.date != null) row.date = updates.date;
  if (updates.players != null) row.players = updates.players;
  if (updates.winner != null) row.winner = updates.winner;
  if (updates.totals != null) row.totals = updates.totals;
  if (updates.rounds != null) row.rounds = updates.rounds;
  if (updates.scratch != null) row.scratch = updates.scratch;
  if (updates.source != null) row.source = updates.source;
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase.from('games').update(row).eq('id', gameId);
  if (error) throw error;
}

export function isScratchGame(game) {
  return game && (game.scratch === true || game.scratch === 'true');
}

export async function getExportData() {
  const players = await getAllPlayerNames();
  const allGames = await loadGames();
  const games = allGames.filter(g => !isScratchGame(g));
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
  const base = getBasePlayers();
  const all = base.length > 0
    ? [...base, ...custom.filter(c => !base.some(b => b.toLowerCase() === c.toLowerCase()))]
    : custom;
  all.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  return { players: all };
}

export async function getAllPlayerNames() {
  const custom = await loadCustomPlayers();
  const base = getBasePlayers();
  return base.length > 0
    ? [...base, ...custom.filter(c => !base.some(b => b.toLowerCase() === c.toLowerCase()))]
    : custom;
}

export async function addCustomPlayer(name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const all = await getAllPlayerNames();
  if (all.some(n => n.toLowerCase() === trimmed.toLowerCase())) return;
  const { error } = await supabase.from('players').insert({ name: trimmed });
  if (error) throw error;
}

export async function removeCustomPlayer(name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  if (getBasePlayers().some(b => b.toLowerCase() === trimmed.toLowerCase())) return;
  const { data } = await supabase.from('players').select('id').ilike('name', trimmed).maybeSingle();
  if (!data) return;
  const { error } = await supabase.from('players').delete().eq('id', data.id);
  if (error) throw error;
}

export async function getCustomPlayers() {
  return loadCustomPlayers();
}

function getBasePlayers() {
  return localStorage.getItem(TEST_DATA_IGNORED) ? [] : FIXTURE_PLAYERS;
}

async function loadCustomPlayers() {
  const { data, error } = await supabase.from('players').select('name').order('name');
  if (error) throw error;
  return (data ?? []).map(r => r.name);
}
