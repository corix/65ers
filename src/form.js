import { getPlayerRows, getAllPlayerNames, addCustomPlayer, saveGame, ROUNDS } from './store.js';

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

function todayShort() {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
}

function parseShortDate(str) {
  const parts = str.trim().split('/');
  if (parts.length !== 3) return null;
  const [m, d, y] = parts.map(Number);
  if (!m || !d || isNaN(y)) return null;
  const fullYear = y < 100 ? 2000 + y : y;
  return `${fullYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function pillHTML(name, selected) {
  return `<button type="button" class="pill${selected ? ' selected' : ''}" draggable="true" data-player="${name}">${name}</button>`;
}

function buildSetupHTML() {
  const { primary, secondary } = getPlayerRows();
  return `
    <section class="game-setup card">
      <h2>Game Setup</h2>
      <div class="field">
        <label for="game-date">Date <span class="hint">(M/D/YY)</span></label>
        <input type="text" id="game-date" value="${todayShort()}" placeholder="3/11/26" inputmode="numeric">
      </div>
      <fieldset class="field">
        <legend>Players <span class="hint">tap to select, drag to reorder</span></legend>
        <div class="player-pills">
          ${primary.map(n => pillHTML(n, false)).join('')}
          ${secondary.map(n => pillHTML(n, false)).join('')}
          <button type="button" class="pill pill-add" id="add-pill-btn">+</button>
        </div>
        <div class="add-player-row" hidden>
          <input type="text" id="new-player-name" placeholder="New player name…">
          <button type="button" id="add-player-btn">Add</button>
        </div>
      </fieldset>
      <button type="button" id="start-game-btn" class="primary-btn">Start Scoresheet</button>
    </section>
    <section id="scoresheet-area"></section>
  `;
}

function syncSelectedPlayers(wrapper, reorder = true) {
  const container = wrapper.querySelector('.player-pills');
  const addBtn = container.querySelector('.pill-add');

  if (reorder) {
    const selected = [...container.querySelectorAll('.pill.selected')];
    const unselected = [...container.querySelectorAll('.pill:not(.selected):not(.pill-add)')];
    selected.forEach(p => container.insertBefore(p, addBtn));
    unselected.forEach(p => container.insertBefore(p, addBtn));
  }

  selectedPlayers = [...container.querySelectorAll('.pill.selected')].map(p => p.dataset.player);
  wrapper.querySelector('#start-game-btn').disabled = selectedPlayers.length < 2;
}

function bindSetupEvents(wrapper) {
  const pillsContainer = wrapper.querySelector('.player-pills');
  const startBtn = wrapper.querySelector('#start-game-btn');
  syncSelectedPlayers(wrapper);

  pillsContainer.addEventListener('click', (e) => {
    const pill = e.target.closest('.pill');
    if (!pill || pill.classList.contains('pill-add')) return;
    pill.classList.toggle('selected');
    syncSelectedPlayers(wrapper);
  });

  let draggedPill = null;

  pillsContainer.addEventListener('dragstart', (e) => {
    const pill = e.target.closest('.pill');
    if (!pill || pill.classList.contains('pill-add')) return;
    draggedPill = pill;
    pill.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  pillsContainer.addEventListener('dragend', () => {
    if (draggedPill) draggedPill.classList.remove('dragging');
    draggedPill = null;
    syncSelectedPlayers(wrapper, false);
  });

  pillsContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!draggedPill) return;
    const target = e.target.closest('.pill');
    if (!target || target === draggedPill) return;
    const rect = target.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    if (e.clientX < midX) {
      pillsContainer.insertBefore(draggedPill, target);
    } else {
      pillsContainer.insertBefore(draggedPill, target.nextSibling);
    }
  });

  // Touch-based drag for mobile
  let touchClone = null;
  let touchStarted = false;

  pillsContainer.addEventListener('touchstart', (e) => {
    const pill = e.target.closest('.pill');
    if (!pill || pill.classList.contains('pill-add')) return;
    draggedPill = pill;
    touchStarted = false;
  }, { passive: true });

  pillsContainer.addEventListener('touchmove', (e) => {
    if (!draggedPill) return;
    e.preventDefault();
    const touch = e.touches[0];

    if (!touchStarted) {
      touchStarted = true;
      draggedPill.classList.add('dragging');
      touchClone = draggedPill.cloneNode(true);
      touchClone.classList.add('pill-ghost');
      document.body.appendChild(touchClone);
    }

    touchClone.style.left = `${touch.clientX - touchClone.offsetWidth / 2}px`;
    touchClone.style.top = `${touch.clientY - touchClone.offsetHeight / 2}px`;

    const target = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.pill');
    if (target && target !== draggedPill && pillsContainer.contains(target)) {
      const rect = target.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      if (touch.clientX < midX) {
        pillsContainer.insertBefore(draggedPill, target);
      } else {
        pillsContainer.insertBefore(draggedPill, target.nextSibling);
      }
    }
  }, { passive: false });

  pillsContainer.addEventListener('touchend', () => {
    if (touchClone) {
      touchClone.remove();
      touchClone = null;
    }
    if (draggedPill) {
      draggedPill.classList.remove('dragging');
      if (!touchStarted) {
        draggedPill.classList.toggle('selected');
        syncSelectedPlayers(wrapper);
      } else {
        syncSelectedPlayers(wrapper, false);
      }
      draggedPill = null;
    }
    touchStarted = false;
  });

  const addRow = wrapper.querySelector('.add-player-row');
  const addPillBtn = wrapper.querySelector('#add-pill-btn');

  addPillBtn.addEventListener('click', () => {
    addRow.hidden = !addRow.hidden;
    if (!addRow.hidden) wrapper.querySelector('#new-player-name').focus();
  });

  function commitNewPlayer() {
    const input = wrapper.querySelector('#new-player-name');
    const name = input.value.trim();
    if (!name) return;
    addCustomPlayer(name);
    const allNames = getAllPlayerNames();
    if (!allNames.includes(name)) return;

    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'pill selected';
    pill.draggable = true;
    pill.dataset.player = name;
    pill.textContent = name;
    pillsContainer.insertBefore(pill, addPillBtn);
    syncSelectedPlayers(wrapper);
    input.value = '';
    input.focus();
  }

  wrapper.querySelector('#add-player-btn').addEventListener('click', commitNewPlayer);
  wrapper.querySelector('#new-player-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitNewPlayer(); }
  });

  startBtn.addEventListener('click', () => {
    const raw = wrapper.querySelector('#game-date').value;
    const date = parseShortDate(raw);
    if (!date) {
      wrapper.querySelector('#game-date').classList.add('input-error');
      return;
    }
    wrapper.querySelector('#game-date').classList.remove('input-error');
    renderScoresheet(wrapper.querySelector('#scoresheet-area'), date, raw, selectedPlayers);
    wrapper.querySelector('.game-setup').classList.add('collapsed');
  });
}

function renderScoresheet(container, date, displayDate, players) {
  container.innerHTML = `
    <section class="scoresheet card">
      <h2>Scoresheet &mdash; ${displayDate}</h2>
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
                    <input type="text" class="score-input"
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

      <details class="penalties-section">
        <summary>Penalties</summary>
        <div class="penalty-add-row">
          <select id="penalty-round">
            <option value="">Round</option>
            ${ROUNDS.map(r => `<option value="${r}">${r}</option>`).join('')}
          </select>
          <select id="penalty-player">
            <option value="">Player</option>
            ${players.map(p => `<option value="${p}">${p}</option>`).join('')}
          </select>
          <button type="button" id="add-penalty-btn">Add</button>
        </div>
        <ul class="penalty-list"></ul>
      </details>

      <div class="form-actions">
        <button type="button" id="save-game-btn" class="primary-btn">Save Game</button>
      </div>
      <div id="save-feedback"></div>
    </section>
  `;

  bindScoresheetEvents(container, date, players);
}

function setTunk(table, round, tunkPlayer, players) {
  const select = table.querySelector(`.tunk-select[data-round="${round}"]`);
  select.value = tunkPlayer;
  table.querySelectorAll(`.score-input[data-round="${round}"]`).forEach(input => {
    if (input.dataset.player === tunkPlayer) {
      input.value = '\u2605';
      input.classList.add('tunk-locked');
      input.classList.remove('magic-65');
    } else {
      if (input.classList.contains('tunk-locked')) {
        input.value = '';
      }
      input.classList.remove('tunk-locked');
    }
  });
  recalcTotals(table, players);
}

function addPenalty(container, table, round, player, players) {
  const list = container.querySelector('.penalty-list');
  const key = `${round}::${player}`;
  if (list.querySelector(`[data-penalty="${key}"]`)) return;

  const li = document.createElement('li');
  li.dataset.penalty = key;
  li.innerHTML = `Round ${round} &mdash; ${player} (+65) <button type="button" class="remove-penalty">&times;</button>`;
  li.querySelector('.remove-penalty').addEventListener('click', () => {
    li.remove();
    recalcTotals(table, players);
  });
  list.appendChild(li);
  recalcTotals(table, players);
}

function bindScoresheetEvents(container, date, players) {
  const table = container.querySelector('.scoresheet-table');

  table.querySelectorAll('.tunk-select').forEach(select => {
    select.addEventListener('change', () => {
      const round = select.dataset.round;
      if (select.value) {
        setTunk(table, round, select.value, players);
      } else {
        table.querySelectorAll(`.score-input[data-round="${round}"]`).forEach(input => {
          input.classList.remove('tunk-locked');
          if (input.value === '\u2605') input.value = '';
        });
        recalcTotals(table, players);
      }
    });
  });

  table.querySelectorAll('.score-input').forEach(input => {
    input.addEventListener('input', () => {
      const val = input.value;
      const round = input.dataset.round;
      const player = input.dataset.player;

      if (val.includes('***')) {
        const score = parseInt(val.replace(/\*/g, ''), 10) || 0;
        input.value = score;
        input.classList.remove('tunk-locked', 'magic-65');
        const tunkSelect = table.querySelector(`.tunk-select[data-round="${round}"]`);
        if (tunkSelect.value === player) {
          tunkSelect.value = '';
        }
        addPenalty(container, table, round, player, players);
        return;
      }

      if (val.includes('*')) {
        input.classList.remove('magic-65');
        setTunk(table, round, player, players);
        return;
      }

      if (input.classList.contains('tunk-locked') && val !== '\u2605') {
        input.classList.remove('tunk-locked');
        const tunkSelect = table.querySelector(`.tunk-select[data-round="${round}"]`);
        if (tunkSelect.value === player) {
          tunkSelect.value = '';
        }
      }

      input.classList.toggle('magic-65', parseInt(val, 10) === 65);
      recalcTotals(table, players);
    });
  });

  container.querySelector('#add-penalty-btn').addEventListener('click', () => {
    const roundSel = container.querySelector('#penalty-round');
    const playerSel = container.querySelector('#penalty-player');
    if (!roundSel.value || !playerSel.value) return;
    addPenalty(container, table, roundSel.value, playerSel.value, players);
    roundSel.value = '';
    playerSel.value = '';
  });

  container.querySelector('#save-game-btn').addEventListener('click', () => {
    handleSave(container, date, players);
  });
}

function getPenalties(table) {
  const penalties = new Set();
  table.closest('.scoresheet').querySelectorAll('.penalty-list [data-penalty]').forEach(li => {
    penalties.add(li.dataset.penalty);
  });
  return penalties;
}

function recalcTotals(table, players) {
  const penalties = getPenalties(table);

  const totals = {};
  players.forEach(p => { totals[p] = 0; });
  let allFilled = true;

  ROUNDS.forEach(round => {
    const tunkSelect = table.querySelector(`.tunk-select[data-round="${round}"]`);
    const tunkPlayer = tunkSelect.value;
    let roundHasValues = !!tunkPlayer;

    players.forEach(p => {
      const input = table.querySelector(`.score-input[data-round="${round}"][data-player="${p}"]`);
      const isTunk = tunkPlayer === p;
      let val = parseInt(input.value, 10) || 0;

      if (isTunk) {
        val = 0;
      } else {
        if (input.value === '' || input.value === '\u2605') {
          if (!isTunk) allFilled = false;
        } else {
          roundHasValues = true;
        }
        if (val === 65) val = 0;
      }

      if (penalties.has(`${round}::${p}`)) {
        val += 65;
      }

      totals[p] += val;
    });

    if (!roundHasValues) allFilled = false;
  });

  let minScore = Infinity;
  players.forEach(p => { if (totals[p] < minScore) minScore = totals[p]; });

  const showWinner = allFilled && minScore < Infinity;

  players.forEach(p => {
    const cell = table.querySelector(`.total-cell[data-player="${p}"]`);
    cell.textContent = totals[p];
    cell.classList.toggle('winner-cell', showWinner && totals[p] === minScore);
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

    const penalties = getPenalties(table);

    players.forEach(p => {
      const input = table.querySelector(`.score-input[data-round="${round}"][data-player="${p}"]`);
      const raw = input.value;
      const isTunk = p === tunkPlayer;
      if (raw === '' && !isTunk) allFilled = false;
      let val = isTunk ? 0 : (parseInt(raw, 10) || 0);

      if (val === 0 && !isTunk) {
        tinks.push(p);
      }

      if (penalties.has(`${round}::${p}`)) {
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
