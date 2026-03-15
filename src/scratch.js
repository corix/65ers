import { ROUNDS } from './constants.js';
import { loadGames, saveDraft, saveGame } from './api.js';
import { todayShort } from './utils.js';

const SCRATCH_PLAYERS = [
  'Anders', 'Bikram', 'Cici', 'Daisuke', 'Elena', 'Fatima',
  'Gustav', 'Hana', 'Ivan', 'Jin', 'Kira', 'Lars',
];

const FALLBACK_ROUND = [0, 0, 2, 3, 5, 8, 10, 15];

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

function pickScoresForRound(roundSamples, round, players, maxTotal, runningTotals) {
  const samples = roundSamples[round];
  let scores;
  if (samples?.length) {
    const sample = samples[Math.floor(Math.random() * samples.length)];
    const shuffled = shuffle([...sample]);
    scores = players.map((_, i) => shuffled[i % shuffled.length] ?? 0);
  } else {
    scores = players.map(() =>
      FALLBACK_ROUND[Math.floor(Math.random() * FALLBACK_ROUND.length)]
    );
  }
  if (maxTotal != null) {
    scores = scores.map((s, i) => {
      const cap = maxTotal - (runningTotals[players[i]] ?? 0);
      return Math.min(s, Math.max(0, cap));
    });
  }
  return scores;
}

async function buildRoundSamples() {
  const games = await loadGames();
  const roundSamples = {};
  let maxTotal = null;
  ROUNDS.forEach(r => { roundSamples[r] = []; });
  games.forEach(game => {
    const playerTotals = {};
    game.rounds?.forEach(r => {
      const roundName = r.round;
      if (roundSamples[roundName]) {
        const vals = Object.values(r.scores || {}).filter(v => typeof v === 'number' && !isNaN(v));
        if (vals.length) {
          roundSamples[roundName].push(vals);
        }
      }
      Object.entries(r.scores || {}).forEach(([p, v]) => {
        if (typeof v === 'number' && !isNaN(v)) {
          playerTotals[p] = (playerTotals[p] || 0) + v;
        }
      });
    });
    Object.values(playerTotals).forEach(t => {
      if (maxTotal == null || t > maxTotal) maxTotal = t;
    });
  });
  return { roundSamples, maxTotal };
}

function createScratchDraft({ roundSamples, maxTotal }) {
  const shuffled = shuffle(SCRATCH_PLAYERS);
  const players = shuffled.slice(0, 4 + Math.floor(Math.random() * 3)); // 4–6 players
  const date = todayISO();
  const displayDate = todayShort();

  const scores = {};
  const tunks = {};
  const runningTotals = {};
  players.forEach(p => { runningTotals[p] = 0; });
  ROUNDS.forEach(round => {
    const roundScoresArr = pickScoresForRound(roundSamples, round, players, maxTotal, runningTotals);
    scores[round] = {};
    const roundScores = {};
    players.forEach((p, i) => {
      const val = roundScoresArr[i];
      roundScores[p] = val;
      scores[round][p] = String(val);
      runningTotals[p] += val;
    });
    const minScore = Math.min(...Object.values(roundScores));
    const lowest = players.filter(p => roundScores[p] === minScore);
    tunks[round] = lowest[Math.floor(Math.random() * lowest.length)];
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

function createScratchGame({ roundSamples, maxTotal }) {
  const shuffled = shuffle(SCRATCH_PLAYERS);
  const players = shuffled.slice(0, 4 + Math.floor(Math.random() * 3));
  const date = todayISO();
  const usedRounds = ROUNDS;

  const runningTotals = {};
  players.forEach(p => { runningTotals[p] = 0; });
  const rounds = usedRounds.map(round => {
    const roundScoresArr = pickScoresForRound(roundSamples, round, players, maxTotal, runningTotals);
    const scores = {};
    players.forEach((p, i) => {
      scores[p] = roundScoresArr[i];
      runningTotals[p] += roundScoresArr[i];
    });
    const minScore = Math.min(...Object.values(scores));
    const tunk = players.find(p => scores[p] === minScore);
    const tinks = players.filter(p => scores[p] === 0 && p !== tunk);
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
  rounds.forEach(r => {
    players.forEach(p => {
      totals[p] += r.scores[p];
    });
  });

  const minTotal = Math.min(...Object.values(totals));
  const winner = players.find(p => totals[p] === minTotal);

  return {
    id: crypto.randomUUID(),
    date,
    players,
    rounds,
    totals,
    winner,
  };
}

export async function createScratchDraftInNewGame() {
  const data = await buildRoundSamples();
  const draft = createScratchDraft(data);
  saveDraft(draft);
}

export async function createScratchGameInArchive() {
  const data = await buildRoundSamples();
  const game = createScratchGame(data);
  await saveGame(game);
}

export async function buildFillDraft(players, date = '', displayDate = '') {
  const { roundSamples, maxTotal } = await buildRoundSamples();
  const scores = {};
  const tunks = {};
  const runningTotals = {};
  players.forEach(p => { runningTotals[p] = 0; });
  ROUNDS.forEach(round => {
    const roundScoresArr = pickScoresForRound(roundSamples, round, players, maxTotal, runningTotals);
    scores[round] = {};
    const roundScores = {};
    players.forEach((p, i) => {
      const val = roundScoresArr[i];
      roundScores[p] = val;
      scores[round][p] = String(val);
      runningTotals[p] += val;
    });
    const minScore = Math.min(...Object.values(roundScores));
    const lowest = players.filter(p => roundScores[p] === minScore);
    tunks[round] = lowest[Math.floor(Math.random() * lowest.length)];
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
