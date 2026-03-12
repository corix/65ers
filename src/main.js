import './shared.css';
import { renderForm } from './form.js';
import { renderArchive } from './archive.js';
import { renderStats } from './stats.js';
import { hasTestData, loadTestData, clearData } from './api.js';

const app = document.getElementById('app');
const nav = document.querySelector('nav');
const navBtns = document.querySelectorAll('.nav-btn');
const navSlider = document.querySelector('.nav-slider');
const testDataEl = document.getElementById('test-data-control');

let currentView = 'entry';

const viewContainers = {};
['entry', 'archive', 'stats'].forEach(view => {
  const el = document.createElement('div');
  el.id = `view-${view}`;
  el.className = 'view-container';
  el.hidden = view !== 'entry';
  app.appendChild(el);
  viewContainers[view] = el;
});

function updateNavSlider(animate = false) {
  const active = nav?.querySelector('.nav-btn.active');
  if (!active || !navSlider) return;

  if (animate) {
    navSlider.classList.add('is-animating');
  } else {
    navSlider.classList.remove('is-animating');
  }

  const navRect = nav.getBoundingClientRect();
  const btnRect = active.getBoundingClientRect();
  navSlider.style.left = `${btnRect.left - navRect.left}px`;
  navSlider.style.width = `${btnRect.width}px`;

  if (animate) {
    navSlider.addEventListener('transitionend', function removeAnimating() {
      navSlider.removeEventListener('transitionend', removeAnimating);
      navSlider.classList.remove('is-animating');
    }, { once: true });
  }
}

async function showView(view, { animateNav = false } = {}) {
  currentView = view;
  navBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  updateNavSlider(animateNav);

  Object.entries(viewContainers).forEach(([v, el]) => {
    el.hidden = v !== view;
  });

  const container = viewContainers[view];
  if (container.children.length === 0) {
    if (view === 'entry') {
      await renderForm(container);
    } else if (view === 'archive') {
      await renderArchive(container);
    } else if (view === 'stats') {
      await renderStats(container);
    }
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
    viewContainers.entry.innerHTML = '';
    viewContainers.archive.innerHTML = '';
    viewContainers.stats.innerHTML = '';
    await showView(currentView);
  });
  testDataEl.appendChild(link);
}

navBtns.forEach(btn => {
  btn.addEventListener('click', () => showView(btn.dataset.view, { animateNav: true }));
});

loadTestData();
showView('entry');
requestAnimationFrame(() => updateNavSlider());

// Use ResizeObserver on nav so we update when its layout changes (e.g. at 850px breakpoint).
// Double rAF ensures layout has settled before measuring.
function scheduleSliderUpdate() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => updateNavSlider());
  });
}

if (nav) {
  const ro = new ResizeObserver(scheduleSliderUpdate);
  ro.observe(nav);
}

let resizeTicking = false;
window.addEventListener('resize', () => {
  if (resizeTicking) return;
  resizeTicking = true;
  scheduleSliderUpdate();
  requestAnimationFrame(() => { resizeTicking = false; });
});
