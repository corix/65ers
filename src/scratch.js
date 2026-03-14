import { ROUNDS } from './constants.js';
import { saveDraft, saveGame } from './api.js';
import { todayShort } from './utils.js';

const SCRATCH_PLAYERS = [
  'Anders', 'Bikram', 'Cici', 'Daisuke', 'Elena', 'Fatima',
  'Gustav', 'Hana', 'Ivan', 'Jin', 'Kira', 'Lars',
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function createScratchDraft() {
  const shuffled = shuffle(SCRATCH_PLAYERS);
  const players = shuffled.slice(0, 4 + Math.floor(Math.random() * 3)); // 4–6 players
  const date = todayISO();
  const displayDate = todayShort();

  const scores = {};
  const tunks = {};
  ROUNDS.forEach(round => {
    scores[round] = {};
    players.forEach(p => { scores[round][p] = '0'; });
    tunks[round] = players[Math.floor(Math.random() * players.length)];
  });

  return {
    date,
    displayDate,
    players,
    scores,
    tunks,
    penalties: [],
  };
}

function createScratchGame() {
  const shuffled = shuffle(SCRATCH_PLAYERS);
  const players = shuffled.slice(0, 4 + Math.floor(Math.random() * 3));
  const date = todayISO();
  const usedRounds = ROUNDS.slice(0, 6);

  const rounds = usedRounds.map(round => {
    const tunk = players[Math.floor(Math.random() * players.length)];
    const scores = {};
    const tinks = [];
    players.forEach(p => {
      scores[p] = 0;
      if (p !== tunk) tinks.push(p);
    });
    return {
      round,
      scores,
      tunk,
      tinks,
      magic65s: [],
      falseTunks: [],
    };
  });

  const totals = {};
  players.forEach(p => { totals[p] = 0; });

  return {
    id: crypto.randomUUID(),
    date,
    players,
    rounds,
    totals,
    winner: players[0],
    scratch: true,
  };
}

export function createScratchDraftInNewGame() {
  const draft = createScratchDraft();
  saveDraft(draft);
}

export async function createScratchGameInArchive() {
  const game = createScratchGame();
  await saveGame(game);
}
