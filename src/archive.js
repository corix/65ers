import './archive.css';
import { loadGames } from './api.js';

export async function renderArchive(container) {
  const games = (await loadGames()).sort((a, b) => b.date.localeCompare(a.date));
  container.innerHTML = '';

  if (games.length === 0) {
    container.innerHTML = '<div class="card empty-state"><p>No games saved yet. Go to <strong>New Game</strong> to add one.</p></div>';
    return;
  }

  const list = document.createElement('div');
  list.className = 'archive-list';

  games.forEach(game => {
    const item = document.createElement('div');
    item.className = 'archive-item card';
    item.innerHTML = `
      <button class="archive-header" aria-expanded="false">
        <span class="archive-date">${formatDate(game.date)}</span>
        <span class="archive-players">${game.players.join(', ')}</span>
        <span class="archive-header-right">
          <span class="archive-winner">Winner: ${game.winner}</span>
          <span class="archive-chevron" aria-hidden="true">&#9662;</span>
        </span>
      </button>
      <div class="archive-body" hidden>
        ${buildArchiveTable(game)}
      </div>
    `;

    item.querySelector('.archive-header').addEventListener('click', () => {
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

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(m)}/${parseInt(d)}/${y}`;
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
