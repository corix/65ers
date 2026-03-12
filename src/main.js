import './style.css';
import { renderForm } from './form.js';
import { renderArchive } from './archive.js';
import { renderStats } from './stats.js';

const app = document.getElementById('app');
const navBtns = document.querySelectorAll('.nav-btn');

function showView(view) {
  navBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  if (view === 'entry') {
    renderForm(app);
  } else if (view === 'archive') {
    renderArchive(app);
  } else if (view === 'stats') {
    renderStats(app);
  }
}

navBtns.forEach(btn => {
  btn.addEventListener('click', () => showView(btn.dataset.view));
});

showView('entry');
