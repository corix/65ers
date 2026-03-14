import './archive.css';
import { loadGames, getExportData, isTestDataGame, deleteGame, updateGame } from './api.js';
import { createScratchGameInArchive } from './scratch.js';
import { formatDate } from './utils.js';

const TRASH_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';

export async function renderArchive(container) {
  const loaded = await loadGames();
  const games = loaded
    .map((g, i) => ({ game: g, i }))
    .sort((a, b) => b.game.date.localeCompare(a.game.date) || b.i - a.i)
    .map(({ game }) => game);
  container.innerHTML = '';

  if (games.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'archive-empty';
    emptyDiv.innerHTML = `
      <div class="card empty-state"><p>No games saved yet. Go to <strong>New Game</strong> to add one.</p></div>
      <div class="archive-toolbar archive-toolbar--empty">
        <button type="button" class="scratch-entry-btn" title="Dev: generate test game entry">Scratch entry</button>
      </div>
    `;
    emptyDiv.querySelector('.scratch-entry-btn').addEventListener('click', async () => {
      await createScratchGameInArchive();
      container.innerHTML = '';
      await renderArchive(container);
    });
    container.appendChild(emptyDiv);
    return;
  }

  const toolbar = document.createElement('div');
  toolbar.className = 'archive-toolbar';
  toolbar.innerHTML = `
    <button type="button" class="scratch-entry-btn" title="Dev: generate test game entry">Scratch entry</button>
    <button type="button" class="archive-export-btn primary-btn">Export</button>
  `;
  toolbar.querySelector('.archive-export-btn').addEventListener('click', async () => {
    const data = await getExportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'stored-games.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  toolbar.querySelector('.scratch-entry-btn').addEventListener('click', async () => {
    await createScratchGameInArchive();
    container.innerHTML = '';
    await renderArchive(container);
  });
  container.appendChild(toolbar);

  const list = document.createElement('div');
  list.className = 'archive-list';

  let awaitingDeleteGameId = null;
  let deleteConfirmTimeout = null;

  const hideAllDeleteTooltips = () => {
    list.querySelectorAll('.archive-delete-tooltip').forEach(t => { t.hidden = true; });
  };

  games.forEach(game => {
    const canDelete = game.id && !isTestDataGame(game.id);
    const item = document.createElement('div');
    item.className = 'archive-item card';
    item.dataset.gameId = game.id || '';
    item.innerHTML = `
      <div class="archive-header-row">
        <button class="archive-header" aria-expanded="false">
          <span class="archive-date">${formatDate(game.date)}</span>
          <span class="archive-players">${game.players.join(', ')}</span>
          <span class="archive-header-right">
            <span class="archive-winner">Winner: ${game.winner}</span>
            <span class="archive-chevron" aria-hidden="true">&#9662;</span>
          </span>
        </button>
        ${canDelete ? `
          <div class="archive-delete-wrap">
            <div class="archive-delete-tooltip" hidden>Click again to delete</div>
            <button type="button" class="archive-delete-btn" aria-label="Delete game" title="Delete game">${TRASH_ICON}</button>
          </div>
        ` : ''}
      </div>
      <div class="archive-body" hidden>
        ${buildArchiveTable(game)}
      </div>
    `;

    if (canDelete) {
      const deleteBtn = item.querySelector('.archive-delete-btn');
      const tooltip = item.querySelector('.archive-delete-tooltip');

      const scheduleCancel = () => {
        if (deleteConfirmTimeout) clearTimeout(deleteConfirmTimeout);
        deleteConfirmTimeout = setTimeout(() => {
          awaitingDeleteGameId = null;
          hideAllDeleteTooltips();
          deleteConfirmTimeout = null;
        }, 1000);
      };

      const cancelSchedule = () => {
        if (deleteConfirmTimeout) {
          clearTimeout(deleteConfirmTimeout);
          deleteConfirmTimeout = null;
        }
      };

      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (awaitingDeleteGameId === game.id) {
          cancelSchedule();
          awaitingDeleteGameId = null;
          hideAllDeleteTooltips();
          await deleteGame(game.id);
          container.innerHTML = '';
          await renderArchive(container);
        } else {
          cancelSchedule();
          hideAllDeleteTooltips();
          awaitingDeleteGameId = game.id;
          tooltip.hidden = false;
        }
      });

      deleteBtn.addEventListener('mouseleave', () => {
        if (awaitingDeleteGameId === game.id) scheduleCancel();
      });

      deleteBtn.addEventListener('blur', () => {
        if (awaitingDeleteGameId === game.id) scheduleCancel();
      });

      deleteBtn.addEventListener('mouseenter', () => {
        if (awaitingDeleteGameId === game.id) cancelSchedule();
      });

      deleteBtn.addEventListener('focus', () => {
        if (awaitingDeleteGameId === game.id) cancelSchedule();
      });
    }

    const dateSpan = item.querySelector('.archive-date');
    if (game.id) {
      dateSpan.title = 'Double-click to edit date';
    }
    dateSpan.addEventListener('dblclick', (e) => {
      if (!game.id) return;
      e.stopPropagation();
      if (dateSpan.dataset.editing === 'true') return;
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
    });

    item.querySelector('.archive-header').addEventListener('click', (e) => {
      if (e.target.closest('.archive-date-input')) return;
      const btn = item.querySelector('.archive-header');
      const expanded = btn.getAttribute('aria-expanded') === 'true';

      list.querySelectorAll('.archive-item').forEach(other => {
        other.querySelector('.archive-header').setAttribute('aria-expanded', 'false');
        other.querySelector('.archive-body').hidden = true;
      });

      btn.setAttribute('aria-expanded', String(!expanded));
      item.querySelector('.archive-body').hidden = expanded;
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
