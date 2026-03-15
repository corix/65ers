import './stats.css';
import { loadGames } from './api.js';
import { ROUNDS, PLAYER_COLORS, CHART_PLAYER_COLORS } from './constants.js';
import { computeStats, linearRegression } from './stats-compute.js';
import { formatDate } from './utils.js';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

let activeCharts = [];

export async function renderStats(container) {
  activeCharts.forEach(c => c.destroy());
  activeCharts = [];

  container.innerHTML = '<div class="stats-loading"><p>Loading…</p></div>';
  const games = await loadGames();
  container.innerHTML = '';

  if (games.length === 0) {
    container.innerHTML = '<div class="card empty-state"><p>No games saved yet. Play some games first!</p></div>';
    return;
  }

  const stats = computeStats(games);
  const wrapper = document.createElement('div');
  wrapper.className = 'stats-view';
  wrapper.innerHTML = buildChartHTML('Most Recent Game', 'recent-game-chart')
    + buildLeaderboardHTML(stats)
    + buildRecordsHTML(stats)
    + buildChartHTML('Average Score by Round', 'avg-round-chart');
  container.appendChild(wrapper);

  bindLeaderboardPopout(wrapper);

  const allPlayerNames = [...new Set(games.flatMap(g => g.players))];
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const colors = isDark ? CHART_PLAYER_COLORS : PLAYER_COLORS;
  const playerColorMap = {};
  allPlayerNames.forEach((p, i) => {
    playerColorMap[p] = colors[i % colors.length];
  });

  // Defer chart rendering so records/leaderboard paint first
  requestAnimationFrame(() => {
    renderRecentGameChart(wrapper.querySelector('#recent-game-chart'), games, playerColorMap);
    renderAvgRoundChart(wrapper.querySelector('#avg-round-chart'), games, playerColorMap);
  });
}

// --- Written stats HTML ---

function buildRecordsHTML(stats) {
  const { lowScore, highWinScore, mostTunks } = stats;
  return `
    <section class="stats-records">
      <div class="record-card card">
        <div class="record-label">Lowest All-Time Score</div>
        <div class="record-value">${lowScore.score}</div>
        <div class="record-detail">${lowScore.player} &mdash; ${formatDate(lowScore.date, true)}</div>
      </div>
      <div class="record-card card">
        <div class="record-label">Most Tunks in a Game</div>
        <div class="record-value">${mostTunks.count}</div>
        <div class="record-detail">${mostTunks.player} &mdash; ${formatDate(mostTunks.date, true)}</div>
      </div>
      <div class="record-card card">
        <div class="record-label">Highest Winning Score</div>
        <div class="record-value">${highWinScore.score}</div>
        <div class="record-detail">${highWinScore.player} &mdash; ${formatDate(highWinScore.date, true)}</div>
      </div>
    </section>
  `;
}

const LEADERBOARD_VISIBLE = 5;

function buildLeaderboardHTML(stats) {
  const leaderboard = stats.leaderboard;
  const hasMore = leaderboard.length > LEADERBOARD_VISIBLE;
  const rows = leaderboard.map((p, i) => {
    const overflowClass = i >= LEADERBOARD_VISIBLE ? ' leaderboard-row-overflow' : '';
    return `
    <tr class="leaderboard-row${overflowClass}" data-player="${p.name}">
      <td class="rank-cell">${i + 1}</td>
      <td class="player-name-cell">${p.name}</td>
      <td>${p.wins}</td>
      <td>${p.games}</td>
      <td>${p.winRate}%</td>
    </tr>
    <tr class="player-detail-head${overflowClass}" hidden>
      <td colspan="2"></td>
      <th>Avg Score</th>
      <th>Tunks</th>
      <th>Tinks</th>
    </tr>
    <tr class="player-detail-body${overflowClass}" hidden>
      <td colspan="2"></td>
      <td>${p.avgScore}</td>
      <td>${p.totalTunks} <span class="detail-sub">(${p.avgTunks}/g)</span></td>
      <td>${p.totalTinks} <span class="detail-sub">(${p.avgTinks}/g)</span></td>
    </tr>
    <tr class="player-detail-head${overflowClass}" hidden>
      <td colspan="2"></td>
      <th>Best Game</th>
      <th>Worst Game</th>
      <th>Penalties</th>
    </tr>
    <tr class="player-detail-body${overflowClass}" hidden>
      <td colspan="2"></td>
      <td>${p.bestGame}</td>
      <td>${p.worstGame}</td>
      <td>${p.totalPenalties}</td>
    </tr>
    <tr class="player-detail-head${overflowClass}" hidden>
      <td colspan="2"></td>
      <th>Zeros/G</th>
      <th>Win Streak</th>
      <th>Magic 65s</th>
    </tr>
    <tr class="player-detail-body player-detail-last${overflowClass}" hidden>
      <td colspan="2"></td>
      <td>${p.avgZeros}</td>
      <td>${p.bestStreak}</td>
      <td>${p.totalMagic65s}</td>
    </tr>
  `;
  }).join('');

  const toggleBtn = hasMore
    ? `<button type="button" class="leaderboard-toggle-btn" aria-expanded="false">Show all</button>`
    : '';

  return `
    <section class="card leaderboard-section" data-collapsed="true">
      <h2>Leaderboard</h2>
      <div class="table-wrap">
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Wins</th>
              <th>Games</th>
              <th>Win %</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${toggleBtn}
    </section>
  `;
}

function bindLeaderboardPopout(wrapper) {
  const detailSelectors = '.player-detail-head, .player-detail-body';
  const section = wrapper.querySelector('.leaderboard-section');
  const toggleBtn = wrapper.querySelector('.leaderboard-toggle-btn');
  if (section && toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const collapsed = section.dataset.collapsed === 'true';
      section.dataset.collapsed = String(!collapsed);
      toggleBtn.setAttribute('aria-expanded', String(collapsed));
      toggleBtn.textContent = collapsed ? 'Show less' : 'Show all';
    });
  }

  wrapper.querySelectorAll('.leaderboard-row').forEach(row => {
    row.addEventListener('click', () => {
      const details = [];
      let sibling = row.nextElementSibling;
      while (sibling && !sibling.classList.contains('leaderboard-row')) {
        details.push(sibling);
        sibling = sibling.nextElementSibling;
      }
      const isOpen = details.length > 0 && !details[0].hidden;

      wrapper.querySelectorAll(detailSelectors).forEach(r => { r.hidden = true; });
      wrapper.querySelectorAll('.leaderboard-row').forEach(r => r.classList.remove('expanded'));

      if (!isOpen) {
        details.forEach(r => { r.hidden = false; });
        row.classList.add('expanded');
      }
    });
  });
}

// --- Charts ---

function buildChartHTML(title, canvasId) {
  return `
    <section class="card chart-card">
      <h2>${title}</h2>
      <div class="chart-container">
        <canvas id="${canvasId}"></canvas>
      </div>
      <div class="chart-legend" id="${canvasId}-legend"></div>
    </section>
  `;
}

function renderRecentGameChart(canvas, games, playerColorMap) {
  const game = games.sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!game) return;

  const GRAY = getComputedStyle(document.documentElement).getPropertyValue('--chart-inactive').trim() || '#e4e4e4';
  const labels = ['', ...ROUNDS];

  const ranked = [...game.players].sort((a, b) => game.totals[a] - game.totals[b]);

  const roundScores = {};
  const numPlayers = ranked.length;

  const datasets = ranked.map((player) => {
    let cumulative = 0;
    roundScores[player] = [0];
    const data = [0, ...game.rounds.map(r => {
      let val = r.scores[player] || 0;
      if (r.tunk === player) val = 0;
      else if (val === 65 && r.magic65s && r.magic65s.includes(player)) val = 0;
      if (r.falseTunks && r.falseTunks.includes(player)) val += 65;
      roundScores[player].push(val);
      cumulative += val;
      return cumulative;
    })];

    const color = playerColorMap[player];

    return {
      label: `${player}  \u2013 ${game.totals[player]}`,
      playerName: player,
      _realColor: color,
      data,
      borderColor: GRAY,
      backgroundColor: GRAY,
      pointBackgroundColor: GRAY,
      pointBorderColor: 'transparent',
      pointHoverBorderColor: 'transparent',
      pointStyle: 'circle',
      borderWidth: 1.5,
      tension: 0,
      pointRadius: 4,
      fill: false,
    };
  });

  const bringToFrontPlugin = {
    id: 'bringToFrontRecent',
    afterDatasetsDraw(chart) {
      const idx = chart._highlightIdx;
      if (idx != null) {
        chart.getDatasetMeta(idx).controller.draw();
      }
    },
  };

  const state = { highlightIdx: null };

  const chart = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    plugins: [bringToFrontPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      hover: { mode: null },
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `Game on ${formatDate(game.date, true)}`,
          font: { size: 14 },
        },
        tooltip: { enabled: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          reverse: true,
          title: { display: true, text: 'Cumulative Score' },
        },
      },
    },
  });

  const legendEl = document.getElementById(canvas.id + '-legend');
  let lockedIdx = null;

  function highlightPlayer(idx) {
    state.highlightIdx = idx;
    chart._highlightIdx = idx;
    for (let j = 0; j < numPlayers; j++) {
      const active = j === idx;
      const c = active ? datasets[j]._realColor : GRAY;
      const meta = chart.getDatasetMeta(j);
      meta.dataset.options.borderColor = c;
      meta.data.forEach(pt => {
        pt.options.backgroundColor = c;
        pt.options.hoverBackgroundColor = c;
      });
    }
    chart.draw();
  }

  function clearHighlight() {
    state.highlightIdx = null;
    chart._highlightIdx = null;
    for (let j = 0; j < numPlayers; j++) {
      const meta = chart.getDatasetMeta(j);
      meta.dataset.options.borderColor = GRAY;
      meta.data.forEach(pt => {
        pt.options.backgroundColor = GRAY;
        pt.options.hoverBackgroundColor = GRAY;
      });
    }
    const tip = canvas.parentNode.querySelector('.avg-tooltip');
    if (tip) tip.style.display = 'none';
    chart.draw();
  }

  ranked.forEach((player, i) => {
    const color = datasets[i]._realColor;
    const item = document.createElement('span');
    item.className = 'chart-legend-item';
    item.innerHTML = `<span class="chart-legend-dot" style="background:${color}"></span>${player}  \u2013 ${game.totals[player]}`;
    item.addEventListener('mouseenter', () => {
      if (lockedIdx === null) highlightPlayer(i);
    });
    item.addEventListener('mouseleave', () => {
      if (lockedIdx === null) clearHighlight();
    });
    item.addEventListener('click', () => {
      legendEl.querySelectorAll('.chart-legend-item').forEach(el => el.classList.remove('active'));
      if (lockedIdx === i) {
        lockedIdx = null;
        clearHighlight();
      } else {
        lockedIdx = i;
        item.classList.add('active');
        highlightPlayer(i);
      }
    });
    legendEl.appendChild(item);
  });

  canvas.addEventListener('click', () => {
    if (lockedIdx !== null) {
      lockedIdx = null;
      legendEl.querySelectorAll('.chart-legend-item').forEach(el => el.classList.remove('active'));
      clearHighlight();
    }
  });

  // Manual tooltip
  const tipEl = document.createElement('div');
  tipEl.className = 'avg-tooltip';
  canvas.parentNode.appendChild(tipEl);

  canvas.addEventListener('mousemove', (e) => {
    if (state.highlightIdx == null) { tipEl.style.display = 'none'; return; }
    const elements = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, false);
    const hit = elements.find(el => el.datasetIndex === state.highlightIdx);
    if (!hit) { tipEl.style.display = 'none'; return; }
    const ds = datasets[hit.datasetIndex];
    const player = ds.playerName;
    const idx = hit.index;
    const rs = roundScores[player][idx];
    const cum = ds.data[idx];
    tipEl.textContent = `${player}: ${rs} / ${cum}`;
    tipEl.style.display = 'block';
    tipEl.style.left = hit.element.x + 'px';
    tipEl.style.top = hit.element.y + 'px';
  });

  canvas.addEventListener('mouseleave', () => {
    tipEl.style.display = 'none';
  });

  activeCharts.push(chart);
}

function renderAvgRoundChart(canvas, games, playerColorMap) {
  const playerCumulativeTotals = {};
  const playerGameCounts = {};

  games.forEach(game => {
    game.players.forEach(player => {
      if (!playerCumulativeTotals[player]) {
        playerCumulativeTotals[player] = {};
        playerGameCounts[player] = 0;
        ROUNDS.forEach(r => { playerCumulativeTotals[player][r] = 0; });
      }
      playerGameCounts[player]++;

      let cumulative = 0;
      game.rounds.forEach(r => {
        let val = r.scores[player] || 0;
        if (r.tunk === player) val = 0;
        else if (val === 65 && r.magic65s && r.magic65s.includes(player)) val = 0;
        if (r.falseTunks && r.falseTunks.includes(player)) val += 65;
        cumulative += val;
        playerCumulativeTotals[player][r.round] += cumulative;
      });
    });
  });

  const lastRound = ROUNDS[ROUNDS.length - 1];
  const allPlayers = Object.keys(playerCumulativeTotals).sort((a, b) => {
    const gamesA = playerGameCounts[a];
    const gamesB = playerGameCounts[b];
    if (gamesB !== gamesA) return gamesB - gamesA;
    const avgFinalA = gamesA ? playerCumulativeTotals[a][lastRound] / gamesA : 0;
    const avgFinalB = gamesB ? playerCumulativeTotals[b][lastRound] / gamesB : 0;
    return avgFinalA - avgFinalB;
  });
  const visiblePlayers = allPlayers.filter(p => playerGameCounts[p] > 1);
  const singleGamePlayers = allPlayers.filter(p => playerGameCounts[p] === 1);
  const showAllDefault = false;

  const playerSlopes = {};
  allPlayers.forEach(player => {
    const pts = ROUNDS.map((r, i) => ({
      x: i,
      y: playerGameCounts[player] ? Math.round(playerCumulativeTotals[player][r] / playerGameCounts[player]) : 0,
    }));
    playerSlopes[player] = linearRegression(pts).slope;
  });

  const GRAY = getComputedStyle(document.documentElement).getPropertyValue('--chart-inactive').trim() || '#e4e4e4';
  const LINE_HIGHLIGHT = getComputedStyle(document.documentElement).getPropertyValue('--chart-line-highlight').trim() || '#888';
  const numPlayers = allPlayers.length;

  const lineDatasets = [];
  const scatterDatasets = [];

  allPlayers.forEach((player, i) => {
    const color = playerColorMap[player];
    const isSingleGame = playerGameCounts[player] === 1;
    const hidden = isSingleGame && !showAllDefault;

    const scatterData = ROUNDS.map((r, idx) => ({
      x: idx,
      y: playerGameCounts[player] ? Math.round(playerCumulativeTotals[player][r] / playerGameCounts[player]) : 0,
    }));

    const { slope, intercept } = linearRegression(scatterData);
    const xEnd = ROUNDS.length - 1;

    lineDatasets.push({
      label: '',
      data: [{ x: 0, y: intercept }, { x: xEnd, y: slope * xEnd + intercept }],
      _realColor: color,
      _isRegression: true,
      type: 'line',
      borderColor: 'transparent',
      borderWidth: 1.5,
      pointRadius: 0,
      pointHitRadius: 0,
      tension: 0,
      hidden,
    });

    scatterDatasets.push({
      label: player,
      data: scatterData,
      _realColor: color,
      backgroundColor: GRAY,
      pointBackgroundColor: GRAY,
      borderColor: 'transparent',
      pointBorderColor: 'transparent',
      pointHoverBorderColor: 'transparent',
      pointStyle: 'circle',
      pointRadius: 5,
      pointHoverRadius: 7,
      hidden,
    });
  });

  const datasets = [...lineDatasets, ...scatterDatasets];

  const bringToFrontPlugin = {
    id: 'bringToFront',
    afterDatasetsDraw(chart) {
      const idx = chart._highlightIdx;
      if (idx != null) {
        chart.getDatasetMeta(idx).controller.draw();
        chart.getDatasetMeta(idx + numPlayers).controller.draw();
      }
    },
  };

  const state = { highlightIdx: null };

  const chart = new Chart(canvas, {
    type: 'scatter',
    data: { datasets },
    plugins: [bringToFrontPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      hover: { mode: null },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      scales: {
        x: {
          type: 'linear',
          min: -0.5,
          max: ROUNDS.length - 0.5,
          ticks: {
            stepSize: 1,
            callback: (val) => ROUNDS[val] ?? '',
          },
          title: { display: false },
        },
        y: {
          beginAtZero: true,
          reverse: true,
          title: { display: true, text: 'Avg Cumulative Score' },
        },
      },
    },
  });

  const legendEl = document.getElementById(canvas.id + '-legend');
  let lockedIdx = null;

  function highlightPlayer(idx) {
    state.highlightIdx = idx;
    chart._highlightIdx = idx;
    for (let j = 0; j < numPlayers; j++) {
      const active = j === idx;
      const c = active ? datasets[j]._realColor : GRAY;
      chart.getDatasetMeta(j).dataset.options.borderColor = active ? LINE_HIGHLIGHT : 'transparent';
      chart.getDatasetMeta(j + numPlayers).data.forEach(pt => {
        pt.options.backgroundColor = c;
        pt.options.hoverBackgroundColor = c;
      });
    }
    chart.draw();
  }

  function clearHighlight() {
    state.highlightIdx = null;
    chart._highlightIdx = null;
    for (let j = 0; j < numPlayers; j++) {
      chart.getDatasetMeta(j).dataset.options.borderColor = 'transparent';
      chart.getDatasetMeta(j + numPlayers).data.forEach(pt => {
        pt.options.backgroundColor = GRAY;
        pt.options.hoverBackgroundColor = GRAY;
      });
    }
    const tip = canvas.parentNode.querySelector('.avg-tooltip');
    if (tip) tip.style.display = 'none';
    chart.draw();
  }

  const singleStartIdx = visiblePlayers.length;
  let showAll = showAllDefault;

  function addLegendItem(player, i) {
    const color = scatterDatasets[i]._realColor;
    const n = playerGameCounts[player] ?? 0;
    const item = document.createElement('span');
    item.className = 'chart-legend-item';
    item.dataset.playerIdx = String(i);
    item.innerHTML = `<span class="chart-legend-dot" style="background:${color}"></span>${player} (${n})`;
    item.addEventListener('mouseenter', () => {
      if (lockedIdx === null) highlightPlayer(i);
    });
    item.addEventListener('mouseleave', () => {
      if (lockedIdx === null) clearHighlight();
    });
    item.addEventListener('click', () => {
      legendEl.querySelectorAll('.chart-legend-item').forEach(el => el.classList.remove('active'));
      if (lockedIdx === i) {
        lockedIdx = null;
        clearHighlight();
      } else {
        lockedIdx = i;
        item.classList.add('active');
        highlightPlayer(i);
      }
    });
    return item;
  }

  visiblePlayers.forEach((player, i) => {
    legendEl.appendChild(addLegendItem(player, i));
  });

  let toggleBtn = null;
  if (singleGamePlayers.length > 0) {
    toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'chart-toggle-btn';
    toggleBtn.textContent = 'Show all';
    toggleBtn.addEventListener('click', () => {
      showAll = !showAll;
      for (let i = singleStartIdx; i < numPlayers; i++) {
        chart.data.datasets[i].hidden = !showAll;
        chart.data.datasets[numPlayers + i].hidden = !showAll;
      }
      chart.update();

      if (showAll) {
        for (let j = singleGamePlayers.length - 1; j >= 0; j--) {
          const player = singleGamePlayers[j];
          const i = singleStartIdx + j;
          legendEl.insertBefore(addLegendItem(player, i), toggleBtn);
        }
        toggleBtn.textContent = 'Show less';
      } else {
        legendEl.querySelectorAll('.chart-legend-item').forEach((item) => {
          const idx = parseInt(item.dataset.playerIdx, 10);
          if (idx >= singleStartIdx) item.remove();
        });
        toggleBtn.textContent = 'Show all';
        if (lockedIdx !== null && lockedIdx >= singleStartIdx) {
          lockedIdx = null;
          clearHighlight();
        }
      }
    });
    legendEl.appendChild(toggleBtn);
  }

  canvas.addEventListener('click', () => {
    if (lockedIdx !== null) {
      lockedIdx = null;
      legendEl.querySelectorAll('.chart-legend-item').forEach(el => el.classList.remove('active'));
      clearHighlight();
    }
  });

  // Manual tooltip on mousemove
  const tipEl = document.createElement('div');
  tipEl.className = 'avg-tooltip';
  canvas.parentNode.appendChild(tipEl);

  canvas.addEventListener('mousemove', (e) => {
    if (state.highlightIdx == null) { tipEl.style.display = 'none'; return; }
    const scatterIdx = state.highlightIdx + numPlayers;
    const elements = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, false);
    const hit = elements.find(el => el.datasetIndex === scatterIdx);
    if (!hit) { tipEl.style.display = 'none'; return; }
    const pt = datasets[scatterIdx].data[hit.index];
    const round = ROUNDS[pt.x];
    tipEl.textContent = `${round}: ${pt.y}`;
    tipEl.style.display = 'block';
    tipEl.style.left = hit.element.x + 'px';
    tipEl.style.top = hit.element.y + 'px';
  });

  canvas.addEventListener('mouseleave', () => {
    tipEl.style.display = 'none';
  });

  activeCharts.push(chart);
}
