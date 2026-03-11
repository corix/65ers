import './style.css';
import { renderForm } from './form.js';
import { renderArchive } from './archive.js';

const app = document.getElementById('app');
const navBtns = document.querySelectorAll('.nav-btn');

function showView(view) {
  navBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  if (view === 'entry') {
    renderForm(app);
  } else {
    renderArchive(app);
  }
}

navBtns.forEach(btn => {
  btn.addEventListener('click', () => showView(btn.dataset.view));
});

showView('entry');
