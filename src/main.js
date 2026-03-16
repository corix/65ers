// Remove critical-theme style after first paint so shared.css transitions apply
requestAnimationFrame(() => { document.getElementById('critical-theme')?.remove(); });

import { initDemoModeFromUrl, isDemoMode, setDemoMode } from './demo-mode.js';
initDemoModeFromUrl();

import './shared.css';
import { isSupabaseDisabled, setSupabaseDisabled, isExportedDataEnabled, setExportedDataEnabled, clearLocalData, loadGames, getPlayerRowsAndCustom } from './api.js';
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

const THEME_KEY = '65ers_theme';

function getTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

function setTheme(theme) {
  document.documentElement.classList.add('theme-switching');
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem(THEME_KEY, 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem(THEME_KEY, 'light');
  }
  updateThemeToggleUI();
  setTimeout(() => {
    document.documentElement.classList.remove('theme-switching');
  }, 380);
  window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme } }));
}

function updateThemeToggleUI() {
  const isDark = getTheme() === 'dark';
  const toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.classList.toggle('toggle-slider--on', isDark);
  const label = document.querySelector('.header-kebab-option[data-action="theme"] .header-kebab-option-title');
  if (label) label.textContent = isDark ? 'Dark mode' : 'Light mode';
  const themeOption = document.querySelector('.header-kebab-option[data-action="theme"]');
  if (themeOption) themeOption.setAttribute('aria-label', isDark ? 'Dark mode toggle' : 'Light mode toggle');
  if (themeOption) themeOption.setAttribute('aria-pressed', String(isDark));
}

function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

// Header kebab (Archive options)
const headerKebab = document.getElementById('header-nav-kebab');
const kebabBtn = headerKebab?.querySelector('.header-kebab-btn');
const kebabMenu = headerKebab?.querySelector('.header-kebab-menu');
if (kebabBtn && kebabMenu) {
  function updateDemoModeUI() {
    const on = isDemoMode();
    document.title = on ? 'The 65 Almanac [DEMO]' : 'The 65 Almanac';
    const badge = document.getElementById('demo-mode-badge');
    if (badge) badge.hidden = !on;
    document.querySelectorAll('.demo-controls-only').forEach((el) => {
      el.classList.toggle('demo-controls-visible', on);
    });
    const toggle = document.getElementById('demo-mode-toggle');
    if (toggle) toggle.classList.toggle('toggle-slider--on', on);
    const demoOption = headerKebab?.querySelector('.header-kebab-option[data-action="demo-mode"]');
    if (demoOption) demoOption.setAttribute('aria-pressed', String(on));
  }

  function updateLocalOnlyCaption() {
    const caption = document.getElementById('local-only-caption');
    if (caption) {
      const on = !isSupabaseDisabled();
      caption.dataset.status = on ? 'on' : 'off';
      caption.textContent = on ? 'On' : 'Off';
      caption.setAttribute('aria-label', on ? 'On' : 'Off');
    }
  }

  function updateExportedDataCaption() {
    const caption = document.getElementById('exported-data-caption');
    if (caption) {
      const on = isExportedDataEnabled();
      caption.dataset.status = on ? 'on' : 'off';
      caption.textContent = on ? 'On' : 'Off';
      caption.setAttribute('aria-label', on ? 'On' : 'Off');
    }
  }

  updateThemeToggleUI();
  updateDemoModeUI();
  kebabBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const isOpen = !kebabMenu.hidden;
    kebabMenu.hidden = isOpen;
    if (!kebabMenu.hidden) {
      updateThemeToggleUI();
      updateDemoModeUI();
      updateLocalOnlyCaption();
      updateExportedDataCaption();
      document.addEventListener('click', () => { kebabMenu.hidden = true; }, { once: true });
    }
  });
  const demoModeOption = headerKebab.querySelector('.header-kebab-option[data-action="demo-mode"]');
  demoModeOption?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const turningOn = !isDemoMode();
    setDemoMode(turningOn);
    if (turningOn) {
      setSupabaseDisabled(true);
      setExportedDataEnabled(false);
    }
    updateDemoModeUI();
    updateLocalOnlyCaption();
    updateExportedDataCaption();
    viewContainers[currentView].innerHTML = '';
    await showView(currentView, { animateNav: false });
  });
  demoModeOption?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      demoModeOption.click();
    }
  });
  const themeOption = headerKebab.querySelector('.header-kebab-option[data-action="theme"]');
  themeOption?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleTheme();
    updateThemeToggleUI();
  });
  themeOption?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      themeOption.click();
    }
  });
  headerKebab.querySelector('.header-kebab-option[data-action="local-only"]')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    setSupabaseDisabled(!isSupabaseDisabled());
    updateLocalOnlyCaption();
    viewContainers[currentView].innerHTML = '';
    await showView(currentView, { animateNav: false });
  });
  headerKebab.querySelector('.header-kebab-option[data-action="exported-data"]')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    setExportedDataEnabled(!isExportedDataEnabled());
    updateExportedDataCaption();
    viewContainers[currentView].innerHTML = '';
    await showView(currentView, { animateNav: false });
  });
  headerKebab.querySelector('.header-kebab-option[data-action="clear-local"]')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    clearLocalData();
    viewContainers[currentView].innerHTML = '';
    await showView(currentView, { animateNav: false });
  });
}
