import './shared.css';
import { renderForm } from './form.js';
import { renderArchive } from './archive.js';
import { renderStats } from './stats.js';
import { loadGames, hasTestData, loadTestData, clearData } from './api.js';

const app = document.getElementById('app');
const navBtns = document.querySelectorAll('.nav-btn');
const testDataEl = document.getElementById('test-data-control');

let currentView = 'entry';

async function showView(view) {
  currentView = view;
  navBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  if (view === 'entry') {
    await renderForm(app);
  } else if (view === 'archive') {
    await renderArchive(app);
  } else if (view === 'stats') {
    await renderStats(app);
  }
  renderTestDataControl();
}

function renderTestDataControl() {
  testDataEl.innerHTML = '';
  if (!hasTestData()) return;

  const games = JSON.parse(localStorage.getItem('65ers_games') || '[]');
  const link = document.createElement('button');
  link.type = 'button';
  link.className = 'test-data-link';
  link.textContent = games.length === 0 ? 'Load test data' : 'Ignore test data';
  link.addEventListener('click', async () => {
    if (games.length === 0) {
      await loadTestData();
    } else {
      clearData();
    }
    await showView(currentView);
  });
  testDataEl.appendChild(link);
}

navBtns.forEach(btn => {
  btn.addEventListener('click', () => showView(btn.dataset.view));
});

showView('entry');
