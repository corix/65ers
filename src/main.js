// Remove critical-theme style after first paint so shared.css transitions apply
requestAnimationFrame(() => { document.getElementById('critical-theme')?.remove(); });

import { getExportData, loadGames, getPlayerRowsAndCustom } from './api.js';
import { renderForm } from './form.js';
import { renderArchive } from './archive.js';
import { renderStats } from './stats.js';

const VIEW_KEY = '65ers_view';
const VALID_VIEWS = ['entry', 'archive', 'stats'];

const app = document.getElementById('app');
const nav = document.querySelector('nav');
const navBtns = document.querySelectorAll('.nav-btn');
const navSlider = document.querySelector('.nav-slider');

let currentView = 'entry';

function getStoredView() {
  const stored = localStorage.getItem(VIEW_KEY);
  return VALID_VIEWS.includes(stored) ? stored : 'entry';
}

const viewContainers = {};
const initialView = getStoredView();
['entry', 'archive', 'stats'].forEach(view => {
  const el = document.createElement('div');
  el.id = `view-${view}`;
  el.className = 'view-container';
  el.hidden = view !== initialView;
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

async function showView(view, { animateNav = false, animateContent = false } = {}) {
  currentView = view;
  localStorage.setItem(VIEW_KEY, view);
  nav?.setAttribute('data-active-view', view);
  navBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  updateNavSlider(animateNav);

  Object.entries(viewContainers).forEach(([v, el]) => {
    el.hidden = v !== view;
  });

  const container = viewContainers[view];
  if (view === 'archive' || view === 'stats') {
    container.innerHTML = '';
    if (view === 'archive') {
      await renderArchive(container);
      if (animateContent && container.children.length > 0) {
        const wrapper = document.createElement('div');
        wrapper.className = 'archive-view archive-entering';
        while (container.firstChild) {
          wrapper.appendChild(container.firstChild);
        }
        container.appendChild(wrapper);
        wrapper.addEventListener('animationend', () => {
          wrapper.classList.remove('archive-entering');
        }, { once: true });
      }
    } else {
      await renderStats(container);
    }
  } else if (container.children.length === 0) {
    await renderForm(container);
  }
}

window.addEventListener('navigate-to-view', (e) => {
  const { view, animateNav = false, animateContent = false } = e.detail || {};
  if (view && VALID_VIEWS.includes(view)) {
    showView(view, { animateNav, animateContent });
  }
});

window.addEventListener('theme-change', () => {
  if (currentView === 'stats') {
    const container = viewContainers.stats;
    if (container && !container.hidden) {
      renderStats(container);
    }
  }
});

navBtns.forEach(btn => {
  btn.addEventListener('click', () => showView(btn.dataset.view, { animateNav: true }));
});

window.addEventListener('storage', (e) => {
  if (e.key === VIEW_KEY && e.newValue && VALID_VIEWS.includes(e.newValue) && e.newValue !== currentView) {
    showView(e.newValue, { animateNav: true, animateContent: true });
  }
});

(async () => {
  await showView(getStoredView());
  requestAnimationFrame(() => updateNavSlider());
  // Preload games and players so Archive/Stats/New Game are fast when user navigates
  const stored = getStoredView();
  if (stored !== 'archive' && stored !== 'stats') loadGames();
  if (stored !== 'entry') getPlayerRowsAndCustom();
})();

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

const LAST_BACKUP_KEY = '65ers_last_backup_download';
const THEME_KEY = '65ers_theme';

function getTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

function setTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem(THEME_KEY, 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem(THEME_KEY, 'light');
  }
  updateThemeToggleLabel();
  window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme } }));
}

function updateThemeToggleLabel() {
  const label = document.getElementById('theme-toggle-label');
  if (label) label.textContent = getTheme() === 'dark' ? 'Light mode' : 'Dark mode';
}

function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

function formatLastBackup(iso) {
  if (!iso) return 'Not backed up';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  if (diffMs < 0) return 'Not backed up';
  const minutes = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (minutes === 0) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 31) return `${days}d ago`;
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  const dPlusMonths = new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
  const remainingDays = Math.floor((now - dPlusMonths) / (24 * 60 * 60 * 1000));
  return `${months}m ${remainingDays}d ago`;
}

function updateLastBackupCaption() {
  const caption = document.getElementById('last-backup-caption');
  if (caption) {
    const stored = localStorage.getItem(LAST_BACKUP_KEY);
    caption.textContent = formatLastBackup(stored);
  }
}

// Header kebab (Archive options)
const headerKebab = document.getElementById('header-nav-kebab');
const kebabBtn = headerKebab?.querySelector('.header-kebab-btn');
const kebabMenu = headerKebab?.querySelector('.header-kebab-menu');
if (kebabBtn && kebabMenu) {
  updateThemeToggleLabel();
  kebabBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !kebabMenu.hidden;
    kebabMenu.hidden = isOpen;
    if (!kebabMenu.hidden) {
      updateLastBackupCaption();
      document.addEventListener('click', () => { kebabMenu.hidden = true; }, { once: true });
    }
  });
  headerKebab.querySelector('.header-kebab-option[data-action="theme"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    kebabMenu.hidden = true;
    toggleTheme();
  });
  headerKebab.querySelector('.header-kebab-option[data-action="download"]')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    kebabMenu.hidden = true;
    const data = await getExportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    a.download = `65_Almanac_Backup_${y}-${m}-${d}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    localStorage.setItem(LAST_BACKUP_KEY, now.toISOString());
    updateLastBackupCaption();
  });
  window.addEventListener('storage', (e) => {
    if (e.key === LAST_BACKUP_KEY) updateLastBackupCaption();
  });
}
