import './shared.css';
import { renderForm } from './form.js';
import { renderArchive } from './archive.js';
import { renderStats } from './stats.js';

const app = document.getElementById('app');
const navBtns = document.querySelectorAll('.nav-btn');

async function showView(view) {
  navBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  if (view === 'entry') {
    await renderForm(app);
  } else if (view === 'archive') {
    await renderArchive(app);
  } else if (view === 'stats') {
    await renderStats(app);
  }
}

navBtns.forEach(btn => {
  btn.addEventListener('click', () => showView(btn.dataset.view));
});

showView('entry');
