import './archive.css';
import { loadGames, getExportData, deleteGame, updateGame, cleanOrphanedPlayers, loadDraft } from './api.js';
import { createScratchGameInArchive } from './scratch.js';
import { formatDate } from './utils.js';

const TRASH_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';

const PENCIL_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>';

const DELETE_CONFIRM_TEXT = 'DELETE';

let archiveDocClickListener = null;

function showDeleteConfirmModal(container, gameId, onConfirm, gameItem) {
  const modal = document.createElement('div');
  modal.className = 'delete-confirm-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'delete-confirm-title');
  modal.innerHTML = `
    <div class="delete-confirm-backdrop"></div>
    <div class="delete-confirm-content">
      <h3 id="delete-confirm-title">Delete game?</h3>
      <p class="delete-confirm-instruction">Type ${DELETE_CONFIRM_TEXT} to confirm</p>
      <input type="text" class="delete-confirm-input" autocomplete="off" spellcheck="false">
      <div class="delete-confirm-actions">
        <button type="button" class="delete-confirm-cancel">Cancel</button>
        <button type="button" class="delete-confirm-submit" disabled>Delete</button>
      </div>
    </div>
  `;

  const input = modal.querySelector('.delete-confirm-input');
  const submitBtn = modal.querySelector('.delete-confirm-submit');
  const cancelBtn = modal.querySelector('.delete-confirm-cancel');
  const backdrop = modal.querySelector('.delete-confirm-backdrop');

  if (gameItem) gameItem.classList.add('archive-item--delete-pending');

  const close = () => {
    if (gameItem) gameItem.classList.remove('archive-item--delete-pending');
    modal.remove();
  };

  const checkInput = () => {
    submitBtn.disabled = input.value.trim().toUpperCase() !== DELETE_CONFIRM_TEXT;
  };

  input.addEventListener('input', checkInput);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });

  submitBtn.addEventListener('click', async () => {
    if (submitBtn.disabled) return;
    submitBtn.disabled = true;
    await onConfirm();
    close();
  });

  cancelBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);

  document.body.appendChild(modal);
  requestAnimationFrame(() => input.focus());
}

export async function renderArchive(container) {
  const games = await loadGames();
  await cleanOrphanedPlayers(loadDraft()?.players ?? []);
  container.innerHTML = '';

  if (games.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'archive-empty';
    emptyDiv.innerHTML = `
      <div class="card empty-state">
        <p>No games saved yet. Go to <strong>New Game</strong> to add one.</p>
        <button type="button" class="scratch-entry-btn" title="Dev: generate test game">Scratch entry</button>
      </div>
    `;
    const scratchBtn = emptyDiv.querySelector('.scratch-entry-btn');
    if (scratchBtn) {
      scratchBtn.addEventListener('click', async () => {
        await createScratchGameInArchive();
        container.innerHTML = '';
        await renderArchive(container);
      });
    }
    container.appendChild(emptyDiv);
    return;
  }

  const toolbar = document.createElement('div');
  toolbar.className = 'archive-toolbar';
  toolbar.innerHTML = `
    <button type="button" class="scratch-entry-btn" title="Dev: generate test game">Scratch entry</button>
  `;
  const scratchToolbarBtn = toolbar.querySelector('.scratch-entry-btn');
  if (scratchToolbarBtn) {
    scratchToolbarBtn.addEventListener('click', async () => {
      await createScratchGameInArchive();
      container.innerHTML = '';
      await renderArchive(container);
    });
  }
  container.appendChild(toolbar);

  const list = document.createElement('div');
  list.className = 'archive-list';

  const hideAllReveals = () => {
    list.querySelectorAll('.archive-delete-wrap--revealed').forEach(w => w.classList.remove('archive-delete-wrap--revealed'));
    list.querySelectorAll('.archive-edit-wrap--revealed').forEach(w => w.classList.remove('archive-edit-wrap--revealed'));
  };

  const handleDocumentClick = (e) => {
    if (!list.isConnected) return;
    if (list.contains(e.target) && (e.target.closest('.archive-delete-wrap') || e.target.closest('.archive-edit-wrap'))) return;
    hideAllReveals();
  };

  if (archiveDocClickListener) {
    document.removeEventListener('click', archiveDocClickListener);
  }
  document.addEventListener('click', handleDocumentClick);
  archiveDocClickListener = handleDocumentClick;

  games.forEach(game => {
    const canDelete = !!game.id;
    const item = document.createElement('div');
    item.className = 'archive-item card';
    item.dataset.gameId = game.id || '';
    item.innerHTML = `
      <div class="archive-header-row" ${canDelete ? 'data-can-delete' : ''}>
        <div class="archive-header" role="button" tabindex="0" aria-expanded="false">
          <span class="archive-date">${formatDate(game.date)}</span>
          ${canDelete ? `
            <span class="archive-edit-wrap">
              <button type="button" class="archive-edit-btn" aria-label="Edit date" title="Edit date">${PENCIL_ICON}</button>
            </span>
          ` : ''}
          <span class="archive-players">${game.players.join(', ')}</span>
          <span class="archive-header-right">
            <span class="archive-winner">Winner: ${game.winner}</span>
            <span class="archive-chevron" aria-hidden="true">&#9662;</span>
          </span>
        </div>
        ${canDelete ? `
          <div class="archive-delete-wrap">
            <button type="button" class="archive-delete-btn" aria-label="Delete game" title="Delete game">${TRASH_ICON}</button>
          </div>
        ` : ''}
      </div>
      <div class="archive-body" hidden>
        ${buildArchiveTable(game)}
      </div>
    `;

    if (canDelete) {
      const headerRow = item.querySelector('.archive-header-row');
      const deleteWrap = item.querySelector('.archive-delete-wrap');
      const deleteBtn = item.querySelector('.archive-delete-btn');
      const editWrap = item.querySelector('.archive-edit-wrap');
      const editBtn = item.querySelector('.archive-edit-btn');

      const revealActions = (e) => {
        if (e) e.preventDefault();
        hideAllReveals();
        deleteWrap.classList.add('archive-delete-wrap--revealed');
        editWrap.classList.add('archive-edit-wrap--revealed');
      };

      headerRow.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        revealActions();
      });

      let longPressTimer = null;
      headerRow.addEventListener('touchstart', (e) => {
        longPressTimer = setTimeout(() => {
          longPressTimer = null;
          revealActions(e);
        }, 500);
      });
      headerRow.addEventListener('touchend', () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      });
      headerRow.addEventListener('touchcancel', () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      });

      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        hideAllReveals();
        showDeleteConfirmModal(container, game.id, async () => {
          await deleteGame(game.id, game.players ?? []);
          container.innerHTML = '';
          await renderArchive(container);
        }, item);
      });

      const startDateEdit = () => {
        const dateSpan = item.querySelector('.archive-date');
        if (!game.id || dateSpan.dataset.editing === 'true') return;
        dateSpan.dataset.editing = 'true';
        const originalDate = game.date;
        const input = document.createElement('input');
        input.type = 'date';
        input.value = originalDate;
        input.className = 'archive-date-input';
        dateSpan.replaceWith(input);
        input.focus();
        input.select?.();

        let cancelled = false;
        const commit = async () => {
          if (cancelled) return;
          const newDate = input.value?.trim();
          if (newDate && newDate !== originalDate) {
            await updateGame(game.id, { date: newDate });
            game.date = newDate;
          }
          dateSpan.textContent = formatDate(game.date);
          input.replaceWith(dateSpan);
          dateSpan.dataset.editing = '';
          item.dataset.justCommittedDate = '1';
        };

        const cancel = () => {
          cancelled = true;
          dateSpan.textContent = formatDate(originalDate);
          input.replaceWith(dateSpan);
          dateSpan.dataset.editing = '';
        };

        input.addEventListener('blur', () => {
          if (!cancelled) commit();
        }, { once: true });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
          }
        });
      };

      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hideAllReveals();
        startDateEdit();
      });
    }

    const header = item.querySelector('.archive-header');
    const toggleExpand = (e) => {
      if (e && e.target.closest('.archive-date-input')) return;
      if (e && e.target.closest('.archive-edit-wrap')) return;
      if (item.dataset.justCommittedDate) {
        delete item.dataset.justCommittedDate;
        return;
      }
      const expanded = header.getAttribute('aria-expanded') === 'true';

      list.querySelectorAll('.archive-item').forEach(other => {
        other.querySelector('.archive-header').setAttribute('aria-expanded', 'false');
        other.querySelector('.archive-body').hidden = true;
      });

      header.setAttribute('aria-expanded', String(!expanded));
      item.querySelector('.archive-body').hidden = expanded;
    };

    header.addEventListener('click', toggleExpand);
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleExpand();
      }
    });

    item.querySelector('.archive-body')?.addEventListener('click', (e) => {
      const roundsToggle = e.target.closest('.rounds-toggle');
      if (roundsToggle) {
        const accordion = roundsToggle.closest('.rounds-accordion');
        if (accordion) {
          const collapsed = accordion.dataset.collapsed === 'true';
          accordion.dataset.collapsed = String(!collapsed);
          roundsToggle.setAttribute('aria-expanded', String(collapsed));
        }
        return;
      }
      const btn = e.target.closest('.round-toggle');
      if (!btn) return;
      if (!window.matchMedia('(max-width: 540px)').matches) return;
      const row = btn.closest('.round-row');
      const isExpanded = row?.getAttribute('aria-expanded') === 'true';
      const table = btn.closest('table');
      if (!table) return;
      table.querySelectorAll('.round-row').forEach(r => r.setAttribute('aria-expanded', 'false'));
      table.querySelectorAll('.round-toggle').forEach(b => b.setAttribute('aria-expanded', 'false'));
      if (!isExpanded) {
        row.setAttribute('aria-expanded', 'true');
        btn.setAttribute('aria-expanded', 'true');
      }
    });

    list.appendChild(item);
  });

  container.appendChild(list);
}

function buildArchiveTable(game) {
  const { players, rounds, totals, winner } = game;

  const headerCells = players.map(p => `<th>${p}</th>`).join('');

  const bodyRows = rounds.map((r, i) => {
    const cells = players.map(p => {
      const score = r.scores[p];
      const isTunk = r.tunk === p;
      const isTink = r.tinks && r.tinks.includes(p);
      const isMagic = r.magic65s && r.magic65s.includes(p);
      const isFalseTunk = r.falseTunks && r.falseTunks.includes(p);

      let display;
      let cls = 'archive-score-cell ';

      if (isTunk) {
        display = '&#9733;'; // star
        cls += 'cell-tunk';
      } else if (isMagic) {
        display = '(65)';
        cls += 'cell-magic';
      } else if (isTink) {
        display = '0';
        cls += 'cell-tink';
      } else {
        display = score;
      }

      if (isFalseTunk) {
        display = `<span class="score-num">${display}</span><span class="ft-badge">+65</span>`;
        cls += ' cell-false-tunk';
      }

      return `<td class="${cls}" data-player="${p}"><span class="player-col-label">${p}</span><span class="cell-value">${display}</span></td>`;
    }).join('');

    return `<tr data-round="${r.round}" class="round-row" aria-expanded="${i === 0}">
      <td class="round-label" data-round="${r.round}">
        <button type="button" class="round-toggle" aria-expanded="${i === 0}"><span class="round-title" data-round="${r.round}">Round ${r.round}</span></button>
      </td>${cells}</tr>`;
  }).join('');

  const totalCells = players.map(p => {
    const isWinner = p === winner;
    return `<td class="total-cell ${isWinner ? 'winner-cell' : ''}" data-player="${p}"><span class="player-col-label">${p}</span><span class="total-value">${totals[p]}</span></td>`;
  }).join('');

  return `
    <div class="rounds-accordion" data-collapsed="true">
      <div class="table-wrap">
        <table class="scoresheet-table archive-table">
          <thead><tr><th class="round-col">Round</th>${headerCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
          <tfoot><tr class="totals-row"><td class="round-label">Total</td>${totalCells}</tr></tfoot>
        </table>
        <button type="button" class="rounds-toggle" aria-expanded="false">Rounds</button>
      </div>
    </div>
  `;
}
