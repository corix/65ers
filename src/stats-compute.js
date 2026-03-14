import { ROUNDS } from './constants.js';

export function computeStats(games) {
  let lowScore = { player: '', score: Infinity, date: '' };
  let highWinScore = { player: '', score: -Infinity, date: '' };
  let mostTunks = { player: '', count: 0, date: '' };
  let mostTinks = { player: '', count: 0, date: '' };

  const playerMap = {};

  const sortedGames = [...games].sort((a, b) => a.date.localeCompare(b.date));

  sortedGames.forEach(game => {
    game.players.forEach(p => {
      if (!playerMap[p]) {
        playerMap[p] = {
          games: 0, wins: 0, totalScore: 0, totalTunks: 0, totalTinks: 0, totalMagic65s: 0,
          bestGame: Infinity, worstGame: -Infinity, totalPenalties: 0, totalZeros: 0,
          currentStreak: 0, bestStreak: 0,
        };
      }
      const pm = playerMap[p];
      pm.games++;
      pm.totalScore += game.totals[p];

      if (game.winner === p) {
        pm.wins++;
        pm.currentStreak++;
        if (pm.currentStreak > pm.bestStreak) pm.bestStreak = pm.currentStreak;
      } else {
        pm.currentStreak = 0;
      }

      let gameTunks = 0;
      let gameTinks = 0;
      game.rounds.forEach(r => {
        if (r.tunk === p) { pm.totalTunks++; gameTunks++; pm.totalZeros++; }
        if (r.tinks && r.tinks.includes(p)) { pm.totalTinks++; gameTinks++; pm.totalZeros++; }
        if (r.magic65s && r.magic65s.includes(p)) { pm.totalMagic65s++; pm.totalZeros++; }
        if (r.falseTunks && r.falseTunks.includes(p)) pm.totalPenalties++;
      });

      if (gameTunks > mostTunks.count) {
        mostTunks = { player: p, count: gameTunks, date: game.date };
      }
      if (gameTinks > mostTinks.count) {
        mostTinks = { player: p, count: gameTinks, date: game.date };
      }

      const total = game.totals[p];
      if (total < pm.bestGame) pm.bestGame = total;
      if (total > pm.worstGame) pm.worstGame = total;
      if (total < lowScore.score) {
        lowScore = { player: p, score: total, date: game.date };
      }
      if (game.winner === p && total > highWinScore.score) {
        highWinScore = { player: p, score: total, date: game.date };
      }
    });
  });

  const leaderboard = Object.entries(playerMap)
    .map(([name, s]) => ({
      name,
      ...s,
      avgScore: s.games ? Math.round(s.totalScore / s.games) : 0,
      avgTunks: s.games ? (s.totalTunks / s.games).toFixed(1) : '0',
      avgTinks: s.games ? (s.totalTinks / s.games).toFixed(1) : '0',
      avgZeros: s.games ? (s.totalZeros / s.games).toFixed(1) : '0',
      winRate: s.games ? Math.round((s.wins / s.games) * 100) : 0,
      bestGame: s.bestGame === Infinity ? '-' : s.bestGame,
      worstGame: s.worstGame === -Infinity ? '-' : s.worstGame,
    }))
    .sort((a, b) => b.wins - a.wins || a.avgScore - b.avgScore);

  return { lowScore, highWinScore, mostTunks, mostTinks, leaderboard };
}

export function linearRegression(points) {
  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  points.forEach(({ x, y }) => { sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x; });
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}
