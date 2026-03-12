import './archive.css';
import { loadGames, hasTestData, loadTestData } from './api.js';

export async function renderArchive(container) {
  const games = (await loadGames()).sort((a, b) => b.date.localeCompare(a.date));
  container.innerHTML = '';

  if (games.length === 0) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'card empty-state';
    emptyEl.innerHTML = '<p>No games saved yet. Go to <strong>New Game</strong> to add one.</p>';
    if (hasTestData()) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'primary-btn';
      btn.textContent = 'Load test data';
      btn.style.marginTop = '1rem';
      btn.addEventListener('click', async () => {
        await loadTestData();
        await renderArchive(container);
      });
      emptyEl.appendChild(btn);
    }
    container.appendChild(emptyEl);
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
        <span class="archive-winner">Winner: ${game.winner}</span>
        <span class="archive-chevron" aria-hidden="true">&#9662;</span>
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

  const bodyRows = rounds.map(r => {
    const cells = players.map(p => {
      const score = r.scores[p];
      const isTunk = r.tunk === p;
      const isTink = r.tinks && r.tinks.includes(p);
      const isMagic = r.magic65s && r.magic65s.includes(p);
      const isFalseTunk = r.falseTunks && r.falseTunks.includes(p);

      let display;
      let cls = '';

      if (isTunk) {
        display = '&#9733;'; // star
        cls = 'cell-tunk';
      } else if (isMagic) {
        display = '65<span class="magic-marker">*</span>';
        cls = 'cell-magic';
      } else if (isTink) {
        display = '0';
        cls = 'cell-tink';
      } else {
        display = score;
      }

      if (isFalseTunk) {
        display += ' <span class="ft-badge">FT</span>';
        cls += ' cell-false-tunk';
      }

      return `<td class="${cls}">${display}</td>`;
    }).join('');

    return `<tr><td class="round-label">${r.round}</td>${cells}</tr>`;
  }).join('');

  const totalCells = players.map(p => {
    const isWinner = p === winner;
    return `<td class="${isWinner ? 'winner-cell' : ''}">${totals[p]}</td>`;
  }).join('');

  return `
    <div class="table-wrap">
      <table class="scoresheet-table archive-table">
        <thead><tr><th class="round-col">Round</th>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
        <tfoot><tr class="totals-row"><td class="round-label">Total</td>${totalCells}</tr></tfoot>
      </table>
    </div>
  `;
}
