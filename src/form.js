import { getPlayerNames, addCustomPlayer, saveGame, ROUNDS } from './store.js';

let selectedPlayers = [];

export function renderForm(container) {
  container.innerHTML = '';
  selectedPlayers = [];

  const wrapper = document.createElement('div');
  wrapper.className = 'form-view';
  wrapper.innerHTML = buildSetupHTML();
  container.appendChild(wrapper);

  bindSetupEvents(wrapper);
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function buildSetupHTML() {
  const players = getPlayerNames();
  return `
    <section class="game-setup card">
      <h2>Game Setup</h2>
      <div class="field">
        <label for="game-date">Date</label>
        <input type="date" id="game-date" value="${todayString()}">
      </div>
      <fieldset class="field">
        <legend>Players</legend>
        <div class="player-checkboxes">
          ${players.map(name => `
            <label class="player-check">
              <input type="checkbox" value="${name}"> ${name}
            </label>
          `).join('')}
        </div>
        <div class="add-player-row">
          <input type="text" id="new-player-name" placeholder="Add new player…">
          <button type="button" id="add-player-btn">Add</button>
        </div>
      </fieldset>
      <button type="button" id="start-game-btn" class="primary-btn" disabled>Start Scoresheet</button>
    </section>
    <section id="scoresheet-area"></section>
  `;
}

function bindSetupEvents(wrapper) {
  const checkboxes = wrapper.querySelectorAll('.player-checkboxes input[type="checkbox"]');
  const startBtn = wrapper.querySelector('#start-game-btn');

  checkboxes.forEach(cb => cb.addEventListener('change', () => {
    selectedPlayers = [...wrapper.querySelectorAll('.player-checkboxes input:checked')].map(c => c.value);
    startBtn.disabled = selectedPlayers.length < 2;
  }));

  wrapper.querySelector('#add-player-btn').addEventListener('click', () => {
    const input = wrapper.querySelector('#new-player-name');
    const name = input.value.trim();
    if (!name) return;
    addCustomPlayer(name);
    const allNames = getPlayerNames();
    if (!allNames.includes(name)) return;

    const container = wrapper.querySelector('.player-checkboxes');
    const label = document.createElement('label');
    label.className = 'player-check';
    label.innerHTML = `<input type="checkbox" value="${name}" checked> ${name}`;
    container.appendChild(label);
    label.querySelector('input').addEventListener('change', () => {
      selectedPlayers = [...wrapper.querySelectorAll('.player-checkboxes input:checked')].map(c => c.value);
      startBtn.disabled = selectedPlayers.length < 2;
    });

    selectedPlayers.push(name);
    startBtn.disabled = selectedPlayers.length < 2;
    input.value = '';
  });

  startBtn.addEventListener('click', () => {
    const date = wrapper.querySelector('#game-date').value;
    renderScoresheet(wrapper.querySelector('#scoresheet-area'), date, selectedPlayers);
    wrapper.querySelector('.game-setup').classList.add('collapsed');
  });
}

function renderScoresheet(container, date, players) {
  container.innerHTML = `
    <section class="scoresheet card">
      <h2>Scoresheet &mdash; ${date}</h2>
      <p class="players-label">${players.join(', ')}</p>
      <div class="table-wrap">
        <table class="scoresheet-table">
          <thead>
            <tr>
              <th class="round-col">Round</th>
              ${players.map(p => `<th>${p}</th>`).join('')}
              <th class="tunk-col">Tunk</th>
            </tr>
          </thead>
          <tbody>
            ${ROUNDS.map(round => `
              <tr data-round="${round}">
                <td class="round-label">${round}</td>
                ${players.map(p => `
                  <td>
                    <input type="number" min="0" class="score-input"
                      data-round="${round}" data-player="${p}"
                      inputmode="numeric">
                  </td>
                `).join('')}
                <td>
                  <select class="tunk-select" data-round="${round}">
                    <option value="">—</option>
                    ${players.map(p => `<option value="${p}">${p}</option>`).join('')}
                  </select>
                </td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="totals-row">
              <td class="round-label">Total</td>
              ${players.map(p => `<td class="total-cell" data-player="${p}">0</td>`).join('')}
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <details class="false-tunks-section">
        <summary>False Tunks (rare)</summary>
        <div class="false-tunks-grid">
          ${ROUNDS.map(round => `
            <div class="ft-round">
              <span class="ft-round-label">Round ${round}:</span>
              ${players.map(p => `
                <label class="ft-check">
                  <input type="checkbox" class="false-tunk-cb"
                    data-round="${round}" data-player="${p}"> ${p}
                </label>
              `).join('')}
            </div>
          `).join('')}
        </div>
      </details>

      <div class="form-actions">
        <button type="button" id="save-game-btn" class="primary-btn">Save Game</button>
      </div>
      <div id="save-feedback"></div>
    </section>
  `;

  bindScoresheetEvents(container, date, players);
}

function bindScoresheetEvents(container, date, players) {
  const table = container.querySelector('.scoresheet-table');

  table.querySelectorAll('.tunk-select').forEach(select => {
    select.addEventListener('change', () => {
      const round = select.dataset.round;
      const tunkPlayer = select.value;
      table.querySelectorAll(`.score-input[data-round="${round}"]`).forEach(input => {
        if (input.dataset.player === tunkPlayer) {
          input.value = 0;
          input.readOnly = true;
          input.classList.add('tunk-locked');
        } else {
          input.readOnly = false;
          input.classList.remove('tunk-locked');
        }
      });
      recalcTotals(table, players);
    });
  });

  table.querySelectorAll('.score-input').forEach(input => {
    input.addEventListener('input', () => recalcTotals(table, players));
  });

  container.querySelectorAll('.false-tunk-cb').forEach(cb => {
    cb.addEventListener('change', () => recalcTotals(table, players));
  });

  container.querySelector('#save-game-btn').addEventListener('click', () => {
    handleSave(container, date, players);
  });
}

function recalcTotals(table, players) {
  const falseTunkCbs = table.closest('.scoresheet')
    .querySelectorAll('.false-tunk-cb');
  const falseTunks = new Set();
  falseTunkCbs.forEach(cb => {
    if (cb.checked) falseTunks.add(`${cb.dataset.round}::${cb.dataset.player}`);
  });

  const totals = {};
  players.forEach(p => { totals[p] = 0; });

  ROUNDS.forEach(round => {
    players.forEach(p => {
      const input = table.querySelector(`.score-input[data-round="${round}"][data-player="${p}"]`);
      let val = parseInt(input.value, 10) || 0;

      const tunkSelect = table.querySelector(`.tunk-select[data-round="${round}"]`);
      const isTunk = tunkSelect.value === p;

      if (isTunk) {
        val = 0;
      } else if (val === 65) {
        val = 0; // magic 65
      }

      if (falseTunks.has(`${round}::${p}`)) {
        val += 65;
      }

      totals[p] += val;
    });
  });

  let minScore = Infinity;
  players.forEach(p => { if (totals[p] < minScore) minScore = totals[p]; });

  players.forEach(p => {
    const cell = table.querySelector(`.total-cell[data-player="${p}"]`);
    cell.textContent = totals[p];
    cell.classList.toggle('winner-cell', totals[p] === minScore && minScore < Infinity);
  });
}

function handleSave(container, date, players) {
  const table = container.querySelector('.scoresheet-table');
  const feedback = container.querySelector('#save-feedback');

  const rounds = [];
  let allFilled = true;

  ROUNDS.forEach(round => {
    const tunkSelect = table.querySelector(`.tunk-select[data-round="${round}"]`);
    const tunkPlayer = tunkSelect.value || null;
    const scores = {};
    const tinks = [];
    const magic65s = [];
    const falseTunksList = [];

    players.forEach(p => {
      const input = table.querySelector(`.score-input[data-round="${round}"][data-player="${p}"]`);
      const raw = input.value;
      if (raw === '' && p !== tunkPlayer) allFilled = false;
      let val = parseInt(raw, 10) || 0;

      if (p === tunkPlayer) {
        val = 0;
      }

      if (val === 0 && p !== tunkPlayer) {
        tinks.push(p);
      }

      const ftCb = container.querySelector(`.false-tunk-cb[data-round="${round}"][data-player="${p}"]`);
      if (ftCb && ftCb.checked) {
        falseTunksList.push(p);
      }

      const rawVal = parseInt(raw, 10) || 0;
      if (rawVal === 65 && p !== tunkPlayer) {
        magic65s.push(p);
      }

      scores[p] = val;
    });

    rounds.push({
      round,
      scores,
      tunk: tunkPlayer,
      tinks,
      magic65s,
      falseTunks: falseTunksList,
    });
  });

  if (!allFilled) {
    feedback.textContent = 'Please fill in all scores before saving.';
    feedback.className = 'feedback error';
    return;
  }

  const totals = {};
  players.forEach(p => { totals[p] = 0; });
  rounds.forEach(r => {
    players.forEach(p => {
      let val = r.scores[p];
      if (r.magic65s.includes(p)) val = 0;
      if (r.falseTunks.includes(p)) val += 65;
      totals[p] += val;
    });
  });

  let minScore = Infinity;
  let winner = '';
  players.forEach(p => {
    if (totals[p] < minScore) {
      minScore = totals[p];
      winner = p;
    }
  });

  const game = {
    id: crypto.randomUUID(),
    date,
    players,
    rounds,
    totals,
    winner,
  };

  saveGame(game);
  feedback.textContent = `Game saved! Winner: ${winner} (${minScore} pts)`;
  feedback.className = 'feedback success';
  container.querySelector('#save-game-btn').disabled = true;
}
