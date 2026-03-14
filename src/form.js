import './form.css';
import { getPlayerRows, getAllPlayerNames, addCustomPlayer, removeCustomPlayer, getCustomPlayers, saveGame, saveDraft, loadDraft, clearDraft } from './api.js';
import { createScratchDraftInNewGame } from './scratch.js';
import { formatDate, todayShort } from './utils.js';
import { ROUNDS, PLAYER_COLORS } from './constants.js';

const PILL_TRASH_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';

let selectedPlayers = [];

export async function renderForm(container) {
  container.innerHTML = '';
  selectedPlayers = [];

  const draft = loadDraft();
  const wrapper = document.createElement('div');
  wrapper.className = 'form-view';
  wrapper.innerHTML = await buildSetupHTML(draft);
  container.appendChild(wrapper);

  bindSetupEvents(wrapper);

  if (draft?.players?.length >= 2) {
    const raw = wrapper.querySelector('#game-date').value;
    const date = parseShortDate(raw) || draft.date;
    const displayDate = raw || draft.displayDate;
    renderScoresheet(wrapper.querySelector('#scoresheet-area'), date, displayDate, draft.players);
    wrapper.querySelector('.game-setup')?.classList.add('collapsed');
    restoreDraft(wrapper, draft);
  }
}

function parseShortDate(str) {
  const parts = str.trim().split('/');
  if (parts.length !== 3) return null;
  const [m, d, y] = parts.map(Number);
  if (!m || !d || isNaN(y)) return null;
  const fullYear = y < 100 ? 2000 + y : y;
  return `${fullYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function pillHTML(name, selected, colorIndex, isCustom = false) {
  const color = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
  return `<button type="button" class="pill${selected ? ' selected' : ''}" draggable="true" data-player="${name}" data-custom="${isCustom}" style="--pill-color: ${color}">${name}<span class="pill-remove" aria-label="Deselect">×</span></button>`;
}

async function buildSetupHTML(draft = null) {
  const { players } = await getPlayerRows();
  const customPlayers = new Set((await getCustomPlayers()).map(n => n.toLowerCase()));
  const initialDate = draft?.displayDate ?? todayShort();
  const selectedSet = draft?.players?.length ? new Set(draft.players) : new Set(players);
  const pillOrder = draft?.players?.length
    ? [...draft.players, ...players.filter(p => !selectedSet.has(p))]
    : players;
  return `
    <section class="game-setup card">
      <div class="field">
        <label for="game-date">Date <span class="hint">(M/D/YY)</span></label>
        <input type="text" id="game-date" value="${initialDate}" placeholder="3/11/26" inputmode="numeric">
      </div>
      <fieldset class="field">
        <legend>Players <span class="hint">tap to select, drag to reorder</span><span class="players-actions"> · <button type="button" class="players-clear-link" id="players-clear-btn">clear</button> · <button type="button" class="players-manage-link" id="players-manage-btn">manage</button></span></legend>
        <div class="player-pills" data-original-order="${JSON.stringify(players).replace(/"/g, '&quot;')}">
          ${pillOrder.map((n, i) => pillHTML(n, selectedSet.has(n), i, customPlayers.has(n.toLowerCase()))).join('')}
          <button type="button" class="pill pill-add" id="add-pill-btn">+</button>
        </div>
        <div class="add-player-row" hidden>
          <input type="text" id="new-player-name" placeholder="Player name">
          <button type="button" id="add-player-btn">Add</button>
        </div>
      </fieldset>
      <button type="button" id="start-game-btn" class="primary-btn">Start Scoresheet</button>
      <button type="button" class="scratch-entry-btn" title="Dev: generate test scoresheet (unsaved)">Scratch entry</button>
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
    const originalOrder = JSON.parse(container?.dataset.originalOrder || '[]');
    unselected.sort((a, b) => {
      const ai = originalOrder.indexOf(a.dataset.player);
      const bi = originalOrder.indexOf(b.dataset.player);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    selected.forEach(p => container.insertBefore(p, addBtn));
    unselected.forEach(p => container.insertBefore(p, addBtn));
  }

  selectedPlayers = [...container.querySelectorAll('.pill.selected')].map(p => p.dataset.player);
  wrapper.querySelector('#start-game-btn').disabled = selectedPlayers.length < 2;

  const pillCount = container?.querySelectorAll('.pill:not(.pill-add)').length ?? 0;
  const actionsSpan = wrapper.querySelector('.players-actions');
  if (actionsSpan) actionsSpan.hidden = pillCount === 0;

  if (container) container.dataset.empty = pillCount === 0 ? 'true' : '';
  const addRow = wrapper.querySelector('.add-player-row');
  if (addRow && pillCount === 0) addRow.hidden = false;

  if (pillCount === 0) {
    if (container?.dataset.manageMode === 'true') {
      container.dataset.manageMode = 'false';
      const fieldset = container?.closest('.field');
      if (fieldset) fieldset.dataset.manageMode = '';
      const manageBtn = wrapper.querySelector('#players-manage-btn');
      if (manageBtn) manageBtn.textContent = 'manage';
      updatePillIcons(wrapper);
    }
  }

  const clearBtn = wrapper.querySelector('#players-clear-btn');
  if (clearBtn) {
    clearBtn.textContent = selectedPlayers.length > 0 ? 'clear' : 'select all';
    const manageMode = container?.dataset.manageMode === 'true';
    clearBtn.disabled = !!manageMode;
  }
}

function updatePillIcons(wrapper) {
  const pillsContainer = wrapper.querySelector('.player-pills');
  const manageMode = pillsContainer?.dataset.manageMode === 'true';
  pillsContainer?.querySelectorAll('.pill:not(.pill-add)').forEach(pill => {
    const removeSpan = pill.querySelector('.pill-remove');
    if (!removeSpan) return;
    const isCustom = pill.dataset.custom === 'true';
    if (manageMode && isCustom) {
      removeSpan.innerHTML = PILL_TRASH_ICON;
      removeSpan.setAttribute('aria-label', 'Remove');
    } else {
      removeSpan.textContent = '×';
      removeSpan.setAttribute('aria-label', 'Deselect');
    }
  });
}

function bindSetupEvents(wrapper) {
  const pillsContainer = wrapper.querySelector('.player-pills');
  const startBtn = wrapper.querySelector('#start-game-btn');
  syncSelectedPlayers(wrapper);

  pillsContainer.addEventListener('click', async (e) => {
    const pill = e.target.closest('.pill');
    if (!pill || pill.classList.contains('pill-add')) return;
    const manageMode = pillsContainer.dataset.manageMode === 'true';
    if (manageMode && pill.dataset.custom === 'true') {
      await removeCustomPlayer(pill.dataset.player);
      const order = JSON.parse(pillsContainer.dataset.originalOrder || '[]');
      const updated = order.filter(n => n.toLowerCase() !== pill.dataset.player.toLowerCase());
      pillsContainer.dataset.originalOrder = JSON.stringify(updated);
      pill.remove();
      syncSelectedPlayers(wrapper);
      return;
    }
    if (e.target.closest('.pill-remove')) {
      pill.classList.remove('selected');
      syncSelectedPlayers(wrapper);
      return;
    }
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
    if (draggedPill) {
      const wasUnselected = !draggedPill.classList.contains('selected');
      if (wasUnselected) draggedPill.classList.add('selected');
      draggedPill.classList.remove('dragging');
      syncSelectedPlayers(wrapper, wasUnselected);
      draggedPill = null;
    }
  });

  pillsContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!draggedPill) return;
    const target = e.target.closest('.pill');
    if (!target || target === draggedPill || target.classList.contains('pill-add')) return;
    if (draggedPill.classList.contains('selected') && !target.classList.contains('selected')) return;
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
    if (target && target !== draggedPill && pillsContainer.contains(target) && !target.classList.contains('pill-add') && (draggedPill.classList.contains('selected') ? target.classList.contains('selected') : true)) {
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
        const wasUnselected = !draggedPill.classList.contains('selected');
        if (wasUnselected) draggedPill.classList.add('selected');
        syncSelectedPlayers(wrapper, wasUnselected);
      }
      draggedPill = null;
    }
    touchStarted = false;
  });

  wrapper.querySelector('#players-manage-btn')?.addEventListener('click', () => {
    const manageMode = pillsContainer.dataset.manageMode === 'true';
    pillsContainer.dataset.manageMode = manageMode ? 'false' : 'true';
    const inManage = pillsContainer.dataset.manageMode === 'true';
    const fieldset = pillsContainer.closest('.field');
    if (fieldset) fieldset.dataset.manageMode = inManage ? 'true' : '';
    wrapper.querySelector('#players-manage-btn').textContent = manageMode ? 'manage' : 'done';
    wrapper.querySelector('#players-clear-btn').disabled = !manageMode;
    updatePillIcons(wrapper);
    syncSelectedPlayers(wrapper);
  });

  wrapper.querySelector('#players-clear-btn')?.addEventListener('click', () => {
    addRow.hidden = true;
    const selected = pillsContainer.querySelectorAll('.pill.selected');
    const addBtn = pillsContainer.querySelector('.pill-add');
    if (selected.length > 0) {
      pillsContainer.querySelectorAll('.pill.selected').forEach(p => p.classList.remove('selected'));
      const originalOrder = JSON.parse(pillsContainer.dataset.originalOrder || '[]');
      const pillsByPlayer = new Map();
      pillsContainer.querySelectorAll('.pill:not(.pill-add)').forEach(p => {
        pillsByPlayer.set(p.dataset.player, p);
      });
      const customPills = [...pillsContainer.querySelectorAll('.pill:not(.pill-add)')]
        .filter(p => !originalOrder.includes(p.dataset.player));
      const targetOrder = [...originalOrder, ...customPills.map(p => p.dataset.player)];
      targetOrder.reverse().forEach(name => {
        const pill = pillsByPlayer.get(name);
        if (pill) pillsContainer.insertBefore(pill, addBtn);
      });
    } else {
      pillsContainer.querySelectorAll('.pill:not(.pill-add)').forEach(p => p.classList.add('selected'));
    }
    syncSelectedPlayers(wrapper);
  });

  const addRow = wrapper.querySelector('.add-player-row');
  const addPillBtn = wrapper.querySelector('#add-pill-btn');

  addPillBtn.addEventListener('click', () => {
    addRow.hidden = !addRow.hidden;
    if (!addRow.hidden) wrapper.querySelector('#new-player-name').focus();
  });

  async function commitNewPlayer() {
    const input = wrapper.querySelector('#new-player-name');
    const name = input.value.trim();
    if (!name) return;
    await addCustomPlayer(name);
    const allNames = await getAllPlayerNames();
    if (!allNames.includes(name)) return;

    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'pill selected';
    pill.draggable = true;
    pill.dataset.player = name;
    pill.dataset.custom = 'true';
    const colorIndex = pillsContainer.querySelectorAll('.pill:not(.pill-add)').length;
    const color = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
    pill.style.setProperty('--pill-color', color);
    const manageMode = pillsContainer.dataset.manageMode === 'true';
    const removeContent = manageMode ? PILL_TRASH_ICON : '×';
    const removeLabel = manageMode ? 'Remove' : 'Deselect';
    pill.innerHTML = `${name}<span class="pill-remove" aria-label="${removeLabel}">${removeContent}</span>`;
    pillsContainer.insertBefore(pill, addPillBtn);
    syncSelectedPlayers(wrapper);
    input.value = '';
    input.focus();
  }

  wrapper.querySelector('#add-player-btn').addEventListener('click', commitNewPlayer);
  wrapper.querySelector('#new-player-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitNewPlayer(); }
  });

  const scratchBtn = wrapper.querySelector('.scratch-entry-btn');
  if (scratchBtn) {
    scratchBtn.addEventListener('click', async () => {
      createScratchDraftInNewGame();
      const container = wrapper.closest('.view-container') || wrapper.parentElement;
      container.innerHTML = '';
      await renderForm(container);
    });
  }

  startBtn.addEventListener('click', () => {
    const raw = wrapper.querySelector('#game-date').value;
    const date = parseShortDate(raw);
    if (!date) {
      wrapper.querySelector('#game-date').classList.add('input-error');
      return;
    }
    wrapper.querySelector('#game-date').classList.remove('input-error');
    clearDraft();
    renderScoresheet(wrapper.querySelector('#scoresheet-area'), date, raw, selectedPlayers);
    wrapper.querySelector('.game-setup').classList.add('collapsed');
    persistDraft(wrapper);
  });
}

function renderScoresheet(container, date, displayDate, players) {
  container.innerHTML = `
    <section class="scoresheet card">
      <div class="scoresheet-header">
        <h2>Scoresheet &mdash; ${displayDate} <button type="button" class="scoresheet-shortcuts-btn" aria-label="Keyboard shortcuts">ℹ</button></h2>
        <div class="scoresheet-header-actions">
          <button type="button" class="fill-sheet-btn scratch-entry-btn" title="Dev: fill with zeros and tunks">Fill sheet</button>
          <button type="button" class="scoresheet-clear-btn text-btn icon-btn" aria-label="Clear scores"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
          <div class="start-over-wrap">
            <div class="start-over-tooltip" id="start-over-tooltip" hidden>Click to start over</div>
            <button type="button" id="start-over-btn" class="text-btn start-over-btn icon-btn" aria-label="Start over"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
          </div>
        </div>
      </div>
      <div class="scoresheet-shortcuts-modal" id="shortcuts-modal" role="dialog" aria-modal="true" aria-labelledby="shortcuts-modal-title" hidden>
        <div class="scoresheet-shortcuts-modal-backdrop"></div>
        <div class="scoresheet-shortcuts-modal-content">
          <h3 id="shortcuts-modal-title">Keyboard Shortcuts</h3>
          <table class="shortcuts-table">
            <tbody>
              <tr><td class="shortcut-desc">Tunk</td><td><kbd>*</kbd> or <kbd>t</kbd></td></tr>
              <tr><td class="shortcut-desc">Penalty</td><td>Score + x, ex. <kbd>9x</kbd></td></tr>
              <tr><td class="shortcut-desc">Magic 65</td><td><kbd>65</kbd> or <kbd>!</kbd></td></tr>
            </tbody>
          </table>
          <button type="button" class="shortcuts-modal-close" aria-label="Close">×</button>
        </div>
      </div>
      <div class="rounds-accordion" data-collapsed="true">
        <div class="table-wrap">
        <table class="scoresheet-table">
          <thead>
            <tr>
              <th class="round-col">Round</th>
              ${players.map(p => `<th class="player-col-header" data-player="${p}" draggable="true">${p}</th>`).join('')}
              <th class="tunk-col">Tunk</th>
            </tr>
          </thead>
          <tbody>
            ${ROUNDS.map((round, i) => `
              <tr data-round="${round}" class="round-row" aria-expanded="${i === 0}">
                <td class="round-label" data-round="${round}">
                  <button type="button" class="round-toggle" aria-expanded="${i === 0}" tabindex="-1"><span class="round-title" data-round="${round}">Round ${round}</span></button>
                </td>
                ${players.map(p => `
                  <td class="score-cell" data-player="${p}">
                    <span class="player-col-label">${p}</span>
                    <span class="score-input-wrap">
                      <input type="text" class="score-input"
                        data-round="${round}" data-player="${p}"
                        inputmode="numeric">
                      <span class="penalty-suffix" hidden>+65</span>
                    </span>
                  </td>
                `).join('')}
                <td class="tunk-cell">
                  <span class="tunk-col-label">Tunk</span>
                  <select class="tunk-select" data-round="${round}" tabindex="-1">
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
              ${players.map(p => `<td class="total-cell" data-player="${p}"><span class="player-col-label">${p}</span><span class="total-value">0</span></td>`).join('')}
              <td class="tunk-col-spacer"></td>
            </tr>
          </tfoot>
        </table>
        <button type="button" class="rounds-toggle" aria-expanded="false">Rounds</button>
        </div>
      </div>

      <div class="penalties-section">
        <ul class="penalty-list"></ul>
        <button type="button" class="penalties-heading" id="add-penalty-toggle">+ Add Penalty</button>
        <div class="penalty-add-row" hidden>
          <select id="penalty-player">
            <option value="">Player</option>
            ${players.map(p => `<option value="${p}">${p}</option>`).join('')}
          </select>
          <select id="penalty-round">
            <option value="">Round</option>
            ${ROUNDS.map(r => `<option value="${r}">${r}</option>`).join('')}
          </select>
          <button type="button" id="add-penalty-btn">Add</button>
          <button type="button" id="cancel-penalty-btn" class="cancel-x-btn" aria-label="Cancel">×</button>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" id="save-game-btn" class="primary-btn">Save Game</button>
      </div>
      <div id="save-feedback"></div>
    </section>
  `;

  bindScoresheetEvents(container, date, players);
}

function getDraftFromScoresheet(wrapper) {
  const scoresheet = wrapper.querySelector('.scoresheet');
  if (!scoresheet) return null;
  const table = scoresheet.querySelector('.scoresheet-table');
  const dateInput = wrapper.querySelector('#game-date');
  const players = getPlayersFromTable(table);
  if (!players.length) return null;

  const parts = (dateInput?.value || '').trim().split('/').map(Number);
  const [m, d, y] = parts.length === 3 ? parts : [0, 0, 0];
  const fullYear = y < 100 ? 2000 + (y || 0) : y;
  const date = dateInput?.value ? `${fullYear}-${String(m || 0).padStart(2, '0')}-${String(d || 0).padStart(2, '0')}` : null;
  if (!date) return null;

  const scores = {};
  const tunks = {};
  ROUNDS.forEach(round => {
    scores[round] = {};
    const tunkSelect = table.querySelector(`.tunk-select[data-round="${round}"]`);
    if (tunkSelect?.value) tunks[round] = tunkSelect.value;
    players.forEach(p => {
      const input = table.querySelector(`.score-input[data-round="${round}"][data-player="${p}"]`);
      scores[round][p] = input?.value ?? '';
    });
  });

  const penalties = [...getPenalties(table)];

  return { date, displayDate: dateInput?.value ?? '', players, scores, tunks, penalties };
}

function restoreDraft(wrapper, draft) {
  const table = wrapper.querySelector('.scoresheet-table');
  if (!table || !draft) return;

  const players = draft.players || [];

  ROUNDS.forEach(round => {
    const tunkSelect = table.querySelector(`.tunk-select[data-round="${round}"]`);
    if (tunkSelect && draft.tunks?.[round]) tunkSelect.value = draft.tunks[round];
    players.forEach(p => {
      const input = table.querySelector(`.score-input[data-round="${round}"][data-player="${p}"]`);
      const val = draft.scores?.[round]?.[p];
      if (input && val !== undefined) input.value = val;
    });
  });

  ROUNDS.forEach(round => {
    const tunkPlayer = draft.tunks?.[round];
    if (tunkPlayer && players.includes(tunkPlayer)) {
      setTunk(table, round, tunkPlayer, players);
    }
  });

  ROUNDS.forEach(round => {
    const tunkPlayer = draft.tunks?.[round];
    const magic65Allowed = round !== '3' && round !== '4';
    players.forEach(p => {
      const input = table.querySelector(`.score-input[data-round="${round}"][data-player="${p}"]`);
      if (!input || input.classList.contains('tunk-locked')) return;
      const val = parseInt(input.value, 10);
      if (magic65Allowed && val === 65) {
        input.classList.add('magic-65');
      }
    });
  });

  const list = wrapper.querySelector('.penalty-list');
  if (list && draft.penalties?.length) {
    draft.penalties.forEach(key => {
      const [round, player] = key.split('::');
      if (round && player && draft.players?.includes(player)) {
        addPenalty(wrapper, table, round, player, draft.players);
      }
    });
  }

  recalcTotals(table, draft.players || []);
  wrapper.dispatchEvent(new CustomEvent('scoresheet-restored', { bubbles: true }));
}

function getPlayersFromTable(table) {
  return [...table.querySelectorAll('thead .player-col-header')].map(th => th.dataset.player);
}

function bindColumnReorder(table, wrapper) {
  const headers = table.querySelectorAll('.player-col-header');
  if (headers.length === 0) return;

  let draggedPlayer = null;

  headers.forEach(th => {
    th.addEventListener('dragstart', (e) => {
      if (!window.matchMedia('(min-width: 541px)').matches) return;
      draggedPlayer = th.dataset.player;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', draggedPlayer);
      th.classList.add('dragging');
    });

    th.addEventListener('dragend', () => {
      th.classList.remove('dragging');
      table.querySelectorAll('.player-col-header').forEach(h => h.classList.remove('drag-over'));
      draggedPlayer = null;
    });

    th.addEventListener('dragover', (e) => {
      if (!window.matchMedia('(min-width: 541px)').matches) return;
      if (!draggedPlayer || th.dataset.player === draggedPlayer) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      th.classList.add('drag-over');
    });

    th.addEventListener('dragleave', () => {
      th.classList.remove('drag-over');
    });

    th.addEventListener('drop', (e) => {
      if (!window.matchMedia('(min-width: 541px)').matches) return;
      e.preventDefault();
      th.classList.remove('drag-over');
      const dropPlayer = th.dataset.player;
      if (!draggedPlayer || dropPlayer === draggedPlayer) return;

      const players = getPlayersFromTable(table);
      const fromIdx = players.indexOf(draggedPlayer);
      const toIdx = players.indexOf(dropPlayer);
      if (fromIdx === -1 || toIdx === -1) return;

      const reordered = [...players];
      reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, draggedPlayer);

      reorderColumns(table, reordered);
      persistDraft(wrapper);
    });
  });
}

function reorderColumns(table, players) {
  const rows = [
    ...table.querySelectorAll('thead tr'),
    ...table.querySelectorAll('tbody tr'),
    ...table.querySelectorAll('tfoot tr'),
  ];

  rows.forEach(tr => {
    const roundCell = tr.querySelector('.round-col, .round-label');
    const tunkCell = tr.querySelector('.tunk-col, .tunk-cell');
    const emptyCell = tr.querySelector('.tunk-col-spacer');

    const playerCells = players.map(p => {
      const cell = tr.querySelector(`[data-player="${p}"]`);
      return cell;
    }).filter(Boolean);

    const fragment = document.createDocumentFragment();
    if (roundCell) fragment.appendChild(roundCell);
    playerCells.forEach(cell => fragment.appendChild(cell));
    if (tunkCell) fragment.appendChild(tunkCell);
    if (emptyCell) fragment.appendChild(emptyCell);

    while (tr.firstChild) tr.removeChild(tr.firstChild);
    tr.appendChild(fragment);
  });

  recalcTotals(table, players);
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
  li.innerHTML = `${player} (+65) in Round ${round} <button type="button" class="remove-penalty">&times;</button>`;
  const wrapper = container.closest('.form-view');
  li.querySelector('.remove-penalty').addEventListener('click', () => {
    li.remove();
    recalcTotals(table, players);
    persistDraft(wrapper);
  });
  list.appendChild(li);
  recalcTotals(table, players);
  persistDraft(wrapper);
}

let persistDraftTimer = null;
function persistDraft(wrapper) {
  if (!wrapper) return;
  clearTimeout(persistDraftTimer);
  persistDraftTimer = setTimeout(() => {
    const draft = getDraftFromScoresheet(wrapper);
    if (draft) saveDraft(draft);
  }, 300);
}

function bindScoresheetEvents(container, date, players) {
  const table = container.querySelector('.scoresheet-table');
  const wrapper = container.closest('.form-view');

  const shortcutsBtn = container.querySelector('.scoresheet-shortcuts-btn');
  const shortcutsModal = container.querySelector('#shortcuts-modal');
  if (shortcutsBtn && shortcutsModal) {
    const openModal = () => {
      shortcutsModal.hidden = false;
      shortcutsModal.querySelector('.shortcuts-modal-close')?.focus();
      document.addEventListener('keydown', handleEscape);
    };
    const closeModal = () => {
      shortcutsModal.hidden = true;
      document.removeEventListener('keydown', handleEscape);
      shortcutsBtn.focus();
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    shortcutsBtn.addEventListener('click', openModal);
    shortcutsModal.querySelector('.shortcuts-modal-close')?.addEventListener('click', closeModal);
    shortcutsModal.querySelector('.scoresheet-shortcuts-modal-backdrop')?.addEventListener('click', closeModal);
  }

  const fillSheetBtn = container.querySelector('.fill-sheet-btn');
  function updateFillSheetButtonState() {
    if (!fillSheetBtn) return;
    const allTunksFilled = ROUNDS.every(round => {
      const sel = table.querySelector(`.tunk-select[data-round="${round}"]`);
      return sel?.value?.trim();
    });
    const allScoresFilled = table.querySelectorAll('.score-input').length > 0 &&
      [...table.querySelectorAll('.score-input')].every(input => input.value.trim() !== '');
    fillSheetBtn.textContent = allTunksFilled && allScoresFilled ? 'Clear sheet' : 'Fill sheet';
  }

  if (fillSheetBtn) {
    fillSheetBtn.addEventListener('click', () => {
      const allTunksFilled = ROUNDS.every(round => {
        const sel = table.querySelector(`.tunk-select[data-round="${round}"]`);
        return sel?.value?.trim();
      });
      const allScoresFilled = table.querySelectorAll('.score-input').length > 0 &&
        [...table.querySelectorAll('.score-input')].every(input => input.value.trim() !== '');

      if (allTunksFilled && allScoresFilled) {
        table.querySelectorAll('.score-input').forEach(input => {
          input.value = '';
          input.classList.remove('tunk-locked', 'magic-65');
        });
        table.querySelectorAll('.tunk-select').forEach(select => {
          select.value = '';
        });
        container.querySelectorAll('.penalty-list [data-penalty]').forEach(li => li.remove());
        recalcTotals(table, players);
        clearDraft();
      } else {
        const dateInput = wrapper.querySelector('#game-date');
        const scores = {};
        const tunks = {};
        ROUNDS.forEach(round => {
          scores[round] = {};
          players.forEach(p => { scores[round][p] = '0'; });
          tunks[round] = players[Math.floor(Math.random() * players.length)];
        });
        const draft = {
          date: date || '',
          displayDate: dateInput?.value ?? '',
          players,
          scores,
          tunks,
          penalties: [],
        };
        restoreDraft(wrapper, draft);
      }
      persistDraft(wrapper);
      updateFillSheetButtonState();
    });
    updateFillSheetButtonState();
  }

  table.addEventListener('input', updateFillSheetButtonState);
  table.addEventListener('change', updateFillSheetButtonState);
  wrapper.addEventListener('scoresheet-restored', updateFillSheetButtonState);

  const clearBtn = container.querySelector('.scoresheet-clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      table.querySelectorAll('.score-input').forEach(input => {
        input.value = '';
        input.classList.remove('tunk-locked', 'magic-65');
      });
      table.querySelectorAll('.tunk-select').forEach(select => {
        select.value = '';
      });
      container.querySelectorAll('.penalty-list [data-penalty]').forEach(li => li.remove());
      recalcTotals(table, players);
      clearDraft();
      persistDraft(wrapper);
      updateFillSheetButtonState();
    });
  }

  const roundsAccordion = container.querySelector('.rounds-accordion');
  const roundsToggle = container.querySelector('.rounds-toggle');
  if (roundsAccordion && roundsToggle) {
    roundsToggle.addEventListener('click', () => {
      const collapsed = roundsAccordion.dataset.collapsed === 'true';
      roundsAccordion.dataset.collapsed = String(!collapsed);
      roundsToggle.setAttribute('aria-expanded', String(collapsed));
    });
  }

  bindColumnReorder(table, wrapper);

  table.querySelectorAll('.round-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!window.matchMedia('(max-width: 540px)').matches) return;
      const row = btn.closest('.round-row');
      const isExpanded = row.getAttribute('aria-expanded') === 'true';
      table.querySelectorAll('.round-row').forEach(r => {
        r.setAttribute('aria-expanded', 'false');
      });
      table.querySelectorAll('.round-toggle').forEach(b => {
        b.setAttribute('aria-expanded', 'false');
      });
      if (!isExpanded) {
        row.setAttribute('aria-expanded', 'true');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

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
      persistDraft(wrapper);
    });
  });

  const validScoreChars = /^[0-9*\u2605tunkx!]*$/i;
  table.querySelectorAll('.score-input').forEach(input => {
    input.addEventListener('input', () => {
      const val = input.value;
      const round = input.dataset.round;
      const player = input.dataset.player;

      if (!validScoreChars.test(val)) {
        input.value = '';
        const key = `${round}::${player}`;
        const penaltyLi = container.querySelector(`.penalty-list [data-penalty="${key}"]`);
        if (penaltyLi) penaltyLi.remove();
        recalcTotals(table, players);
        persistDraft(wrapper);
        return;
      }

      if (val.includes('x')) {
        const score = parseInt(val.replace(/x/gi, ''), 10) || 0;
        input.value = String(score);
        input.classList.remove('tunk-locked', 'magic-65');
        const tunkSelect = table.querySelector(`.tunk-select[data-round="${round}"]`);
        if (tunkSelect?.value === player) {
          tunkSelect.value = '';
        }
        addPenalty(container, table, round, player, players);
        recalcTotals(table, players);
        persistDraft(wrapper);
        return;
      }

      if (val.includes('!')) {
        const parsed = parseInt(val.replace(/!/g, ''), 10);
        const score = isNaN(parsed) ? 65 : parsed;
        const magic65Allowed = round !== '3' && round !== '4';
        input.value = String(score);
        input.classList.remove('tunk-locked');
        input.classList.toggle('magic-65', magic65Allowed && score === 65);
        recalcTotals(table, players);
        persistDraft(wrapper);
        return;
      }

      const isTunkShortcut = val.includes('*') || /^t(unk)?$/i.test(val.trim());
      if (isTunkShortcut) {
        input.classList.remove('magic-65');
        setTunk(table, round, player, players);
        return;
      }

      if (input.classList.contains('tunk-locked') && val !== '\u2605') {
        input.classList.remove('tunk-locked');
        input.value = val.replace(/\u2605/g, '');
        const tunkSelect = table.querySelector(`.tunk-select[data-round="${round}"]`);
        if (tunkSelect?.value === player) {
          tunkSelect.value = '';
        }
      }

      if (val === '' || val.trim() === '') {
        const key = `${round}::${player}`;
        const penaltyLi = container.querySelector(`.penalty-list [data-penalty="${key}"]`);
        if (penaltyLi) penaltyLi.remove();
      }

      const parsed = parseInt(val, 10);
      const round3Over = round === '3' && !isNaN(parsed) && parsed >= 51;
      const round4Over = round === '4' && !isNaN(parsed) && parsed >= 61;
      const round5Over = round === '5' && !isNaN(parsed) && parsed >= 71;
      const round6Over = round === '6' && !isNaN(parsed) && parsed >= 81;
      const round7Over = round === '7' && !isNaN(parsed) && parsed >= 91;
      const round8Over = round === '8' && !isNaN(parsed) && parsed >= 101;
      if (round3Over || round4Over || round5Over || round6Over || round7Over || round8Over) {
        input.value = '';
        input.classList.remove('magic-65');
        recalcTotals(table, players);
        persistDraft(wrapper);
        return;
      }

      input.classList.toggle('magic-65', parsed === 65);
      recalcTotals(table, players);
      persistDraft(wrapper);
    });

    input.addEventListener('focus', () => {
      if (input.classList.contains('tunk-locked')) {
        input.value = '';
        input.classList.remove('tunk-locked');
        const round = input.dataset.round;
        const player = input.dataset.player;
        const tunkSelect = table.querySelector(`.tunk-select[data-round="${round}"]`);
        if (tunkSelect?.value === player) {
          tunkSelect.value = '';
        }
        recalcTotals(table, players);
        persistDraft(wrapper);
      }
    });

    input.addEventListener('blur', () => {
      if (input.classList.contains('tunk-locked')) return;
      const val = input.value;
      const round = input.dataset.round;
      const parsed = parseInt(val.replace(/[^\d]/g, ''), 10);
      if (isNaN(parsed)) return;
      const round3Over = round === '3' && parsed >= 51;
      const round4Over = round === '4' && parsed >= 61;
      const round5Over = round === '5' && parsed >= 71;
      const round6Over = round === '6' && parsed >= 81;
      const round7Over = round === '7' && parsed >= 91;
      const round8Over = round === '8' && parsed >= 101;
      if (round3Over || round4Over || round5Over || round6Over || round7Over || round8Over) {
        input.value = '';
        input.classList.remove('magic-65');
        recalcTotals(table, players);
        persistDraft(wrapper);
      }
    });
  });

  const addPenaltyToggle = container.querySelector('#add-penalty-toggle');
  const penaltyAddRow = container.querySelector('.penalty-add-row');

  addPenaltyToggle.addEventListener('click', () => {
    addPenaltyToggle.hidden = true;
    penaltyAddRow.hidden = false;
  });

  container.querySelector('#cancel-penalty-btn').addEventListener('click', () => {
    penaltyAddRow.hidden = true;
    addPenaltyToggle.hidden = false;
  });

  container.querySelector('#add-penalty-btn').addEventListener('click', () => {
    const roundSel = container.querySelector('#penalty-round');
    const playerSel = container.querySelector('#penalty-player');
    if (!roundSel.value || !playerSel.value) return;
    addPenalty(container, table, roundSel.value, playerSel.value, players);
    roundSel.value = '';
    playerSel.value = '';
    penaltyAddRow.hidden = true;
    addPenaltyToggle.hidden = false;
  });

  container.querySelector('#save-game-btn').addEventListener('click', () => {
    handleSave(container, date, players);
  });

  (() => {
    const btn = container.querySelector('#start-over-btn');
    const tooltip = container.querySelector('#start-over-tooltip');
    let confirmTimeout;
    let awaitingConfirm = false;

    const doStartOver = () => {
      clearDraft();
      const entryContainer = container.closest('#view-entry');
      if (entryContainer) {
        entryContainer.innerHTML = '';
        renderForm(entryContainer);
      }
    };

    const cancelConfirm = () => {
      awaitingConfirm = false;
      tooltip.hidden = true;
      if (confirmTimeout) clearTimeout(confirmTimeout);
    };

    btn.addEventListener('click', () => {
      if (awaitingConfirm) {
        cancelConfirm();
        doStartOver();
      } else {
        awaitingConfirm = true;
        tooltip.hidden = false;
        confirmTimeout = setTimeout(cancelConfirm, 3000);
      }
    });
  })();
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
      const isMagic65 = val === 65 && !isTunk;

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

      const isTink = val === 0 && !isTunk && !isMagic65 && input.value?.trim() === '0';
      input.classList.toggle('tink', isTink);

      const hasPenalty = penalties.has(`${round}::${p}`);
      const cell = input.closest('.score-cell');
      const suffix = cell?.querySelector('.penalty-suffix');
      cell?.classList.toggle('has-penalty', hasPenalty);
      if (suffix) suffix.hidden = !hasPenalty;

      if (hasPenalty) {
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
    const valEl = cell.querySelector('.total-value');
    (valEl || cell).textContent = totals[p];
    cell.classList.toggle('winner-cell', showWinner && totals[p] === minScore);
  });
}

async function handleSave(container, date, players) {
  const table = container.querySelector('.scoresheet-table');
  const feedback = container.querySelector('#save-feedback');
  const currentPlayers = getPlayersFromTable(table);

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

    currentPlayers.forEach(p => {
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

  const roundsMissingTunk = ROUNDS.filter(round => {
    const tunkSelect = table.querySelector(`.tunk-select[data-round="${round}"]`);
    if (tunkSelect?.value) return false;
    const hasValues = currentPlayers.some(p => {
      const input = table.querySelector(`.score-input[data-round="${round}"][data-player="${p}"]`);
      return input?.value?.trim() !== '';
    });
    return hasValues;
  });

  const hasRound3OverLimit = rounds.some(r => r.round === '3' && currentPlayers.some(p => r.scores[p] > 50));
  const hasRound4OverLimit = rounds.some(r => r.round === '4' && currentPlayers.some(p => r.scores[p] > 60));
  const hasRound5OverLimit = rounds.some(r => r.round === '5' && currentPlayers.some(p => r.scores[p] > 70));
  const hasRound6OverLimit = rounds.some(r => r.round === '6' && currentPlayers.some(p => r.scores[p] > 80));
  const hasRound7OverLimit = rounds.some(r => r.round === '7' && currentPlayers.some(p => r.scores[p] > 90));
  const hasRound8OverLimit = rounds.some(r => r.round === '8' && currentPlayers.some(p => r.scores[p] > 100));

  const errors = [];
  if (hasRound3OverLimit) {
    errors.push(`Round 3 scores cannot exceed 50 (not counting penalties).`);
  }
  if (hasRound4OverLimit) {
    errors.push(`Round 4 scores cannot exceed 60 (not counting penalties).`);
  }
  if (hasRound5OverLimit) {
    errors.push(`Round 5 scores cannot exceed 70 (not counting penalties).`);
  }
  if (hasRound6OverLimit) {
    errors.push(`Round 6 scores cannot exceed 80 (not counting penalties).`);
  }
  if (hasRound7OverLimit) {
    errors.push(`Round 7 scores cannot exceed 90 (not counting penalties).`);
  }
  if (hasRound8OverLimit) {
    errors.push(`Round 8 scores cannot exceed 100 (not counting penalties).`);
  }
  if (roundsMissingTunk.length > 0) {
    errors.push(`Select a tunk for round${roundsMissingTunk.length > 1 ? 's' : ''} ${roundsMissingTunk.join(', ')}.`);
  }
  if (!allFilled) {
    errors.push('Please fill in all scores before saving.');
  }
  if (errors.length > 0) {
    feedback.innerHTML = errors.map(e => `<p class="feedback-message">${e}</p>`).join('');
    feedback.className = 'feedback error';
    return;
  }

  const totals = {};
  currentPlayers.forEach(p => { totals[p] = 0; });
  rounds.forEach(r => {
    currentPlayers.forEach(p => {
      let val = r.scores[p];
      if (r.magic65s.includes(p)) val = 0;
      if (r.falseTunks.includes(p)) val += 65;
      totals[p] += val;
    });
  });

  let minScore = Infinity;
  let winner = '';
  currentPlayers.forEach(p => {
    if (totals[p] < minScore) {
      minScore = totals[p];
      winner = p;
    }
  });

  const game = {
    id: crypto.randomUUID(),
    date,
    players: currentPlayers,
    rounds,
    totals,
    winner,
  };

  await saveGame(game);
  clearDraft();

  const entryContainer = container.closest('#view-entry');
  const formView = container.closest('.form-view');
  if (entryContainer && formView) {
    formView.classList.add('scoresheet-exiting');
    formView.addEventListener('animationend', () => {
      formView.classList.remove('scoresheet-exiting');
      entryContainer.innerHTML = '';
      const preview = document.createElement('div');
      preview.className = 'save-success-preview';
      preview.innerHTML = `
        <p class="save-success-message">Game saved!</p>
        <div class="archive-item card save-preview-item">
          <div class="archive-header-row">
            <div class="archive-header archive-header-preview">
              <span class="archive-date">${formatDate(date)}</span>
              <span class="archive-players">${currentPlayers.join(', ')}</span>
              <span class="archive-header-right">
                <span class="archive-winner">Winner: ${winner}</span>
              </span>
            </div>
          </div>
        </div>
      `;
      entryContainer.appendChild(preview);

      setTimeout(() => {
        preview.classList.add('fade-out');
        preview.addEventListener('animationend', async () => {
          entryContainer.innerHTML = '';
          entryContainer.classList.add('form-entering');
          await renderForm(entryContainer);
          const newFormView = entryContainer.querySelector('.form-view');
          if (newFormView) {
            newFormView.addEventListener('animationend', () => {
              entryContainer.classList.remove('form-entering');
            }, { once: true });
          } else {
            entryContainer.classList.remove('form-entering');
          }
        }, { once: true });
      }, 900);
    }, { once: true });
  } else {
    feedback.textContent = `Game saved! Winner: ${winner} (${minScore} pts)`;
    feedback.className = 'feedback success';
    container.querySelector('#save-game-btn').disabled = true;
  }
}
