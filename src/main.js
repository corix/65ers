// Remove critical-theme style after first paint so shared.css transitions apply
requestAnimationFrame(() => { document.getElementById('critical-theme')?.remove(); });

import { initDemoModeFromUrl, isDemoMode, setDemoMode } from './demo-mode.js';
import { getSession, signOut, onAuthStateChange, renderSignInForm } from './auth.js';
initDemoModeFromUrl();

import './shared.css';
import { isSupabaseDisabled, setSupabaseDisabled, isExportedDataEnabled, setExportedDataEnabled, resetDemoDataSourcesToOff, hasLocalData, clearLocalData, clearLocalPlayerData, clearDraft, getSupabaseGameCount, getExportedGameCount, getLocalGameCount, loadGames, getPlayerRowsAndCustom, getExportData, getDownloadBackupCounts, getLastExportedAt, setLastExportedAt } from './api.js';
import { formatDurationAgo } from './utils.js';
import { renderForm, flushDraftToStorage } from './form.js';
import { renderArchive } from './archive.js';
import { renderStats } from './stats.js';
import { showBugReportModal, renderBugs, getBugCount } from './bugs.js';

const VIEW_KEY = '65ers_view';
const VALID_VIEWS = ['entry', 'archive', 'stats', 'bugs'];
const DEMO_DATA_RESET_DELAY_MS = 5 * 60 * 1000; // 5 minutes

const app = document.getElementById('app');
const nav = document.querySelector('nav');
const navBtns = document.querySelectorAll('.nav-btn');
const navSlider = document.querySelector('.nav-slider');
const headerEl = document.querySelector('header');

function bindMobileNavAutoHide() {
  if (!nav) return;

  let lastY = window.scrollY;
  let ticking = false;
  let navHiddenPx = 0;
  let maxHiddenPx = nav.getBoundingClientRect().height || 0;

  const reset = () => {
    navHiddenPx = 0;
    nav.classList.remove('nav-hidden');
    nav.style.transform = '';
    nav.style.opacity = '';
    nav.style.pointerEvents = '';
  };

  const updateMax = () => {
    maxHiddenPx = nav.getBoundingClientRect().height || 0;
    navHiddenPx = Math.min(navHiddenPx, maxHiddenPx);
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const isMobile = window.matchMedia('(max-width: 540px)').matches;
      const y = window.scrollY;
      const dy = y - lastY;

      if (!isMobile) {
        reset();
        lastY = y;
        return;
      }

      if (maxHiddenPx <= 0) updateMax();
      if (maxHiddenPx <= 0) {
        lastY = y;
        return;
      }

      // Move nav at the same rate as the page scroll delta.
      navHiddenPx = Math.min(maxHiddenPx, Math.max(0, navHiddenPx + dy));
      const translateY = -navHiddenPx;
      nav.style.transform = `translateY(${translateY}px)`;
      nav.style.opacity = String(1 - navHiddenPx / maxHiddenPx);
      nav.style.pointerEvents = navHiddenPx >= maxHiddenPx ? 'none' : 'auto';

      lastY = y;
    });
  };

  updateMax();
  reset();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    updateMax();
    const isMobile = window.matchMedia('(max-width: 540px)').matches;
    if (!isMobile) reset();
  });
}

function bindMobileHeaderCollapse() {
  if (!headerEl || !app) return;

  let lastY = window.scrollY;
  let ticking = false;
  let maxHeight = headerEl.getBoundingClientRect().height;
  const minHeight = 60;
  let collapsedPx = 0; // 0 = fully expanded, (maxHeight-minHeight) = fully collapsed
  let basePaddingTop = parseFloat(getComputedStyle(headerEl).paddingTop) || 0;
  let basePaddingBottom = parseFloat(getComputedStyle(headerEl).paddingBottom) || 0;

  const clampCollapsed = () => {
    const maxCollapsed = Math.max(0, maxHeight - minHeight);
    collapsedPx = Math.min(maxCollapsed, Math.max(0, collapsedPx));
  };

  const apply = () => {
    const currentHeight = Math.max(minHeight, maxHeight - collapsedPx);
    // Shrink header height; title + right controls are pinned via mobile CSS.
    headerEl.style.clipPath = '';
    headerEl.style.webkitClipPath = '';
    headerEl.style.height = `${currentHeight}px`;
    app.style.paddingTop = `${currentHeight}px`;
    // Keep sticky elements (e.g. Rounds) aligned under the current header height.
    document.documentElement.style.setProperty('--header-offset', `${currentHeight}px`);
  };

  const reset = () => {
    maxHeight = headerEl.getBoundingClientRect().height;
    basePaddingTop = parseFloat(getComputedStyle(headerEl).paddingTop) || 0;
    basePaddingBottom = parseFloat(getComputedStyle(headerEl).paddingBottom) || 0;
    collapsedPx = 0;
    headerEl.style.clipPath = '';
    headerEl.style.webkitClipPath = '';
    headerEl.style.height = '';
    app.style.paddingTop = '';
    document.documentElement.style.setProperty('--header-offset', `${maxHeight}px`);
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      ticking = false;
      const isMobile = window.matchMedia('(max-width: 540px)').matches;
      if (!isMobile) {
        reset();
        lastY = window.scrollY;
        return;
      }

      if (maxHeight < minHeight) maxHeight = minHeight;

      const y = window.scrollY;
      const dy = y - lastY;

      // Scroll down => dy>0 => collapse; scroll up => dy<0 => expand.
      collapsedPx += dy;
      clampCollapsed();
      apply();

      lastY = y;
    });
  };

  const onResize = () => {
    const isMobile = window.matchMedia('(max-width: 540px)').matches;
    if (!isMobile) {
      reset();
      return;
    }
    // Re-measure and keep current collapse ratio relative to new maxHeight.
    const prevMax = maxHeight;
    maxHeight = headerEl.getBoundingClientRect().height;
    basePaddingTop = parseFloat(getComputedStyle(headerEl).paddingTop) || 0;
    basePaddingBottom = parseFloat(getComputedStyle(headerEl).paddingBottom) || 0;
    if (prevMax > 0 && maxHeight > 0) {
      const ratio = prevMax > minHeight ? (collapsedPx / (prevMax - minHeight)) : 0;
      collapsedPx = ratio * Math.max(0, maxHeight - minHeight);
    }
    clampCollapsed();
    apply();
  };

  // Init on load
  reset();
  maxHeight = headerEl.getBoundingClientRect().height;
  collapsedPx = 0;
  clampCollapsed();
  apply();

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
}

let currentView = 'entry';
let formRenderId = 0;
let demoDataResetTimeout = null;

function getStoredView() {
  const stored = localStorage.getItem(VIEW_KEY);
  return VALID_VIEWS.includes(stored) ? stored : 'entry';
}

const viewContainers = {};
const initialView = getStoredView();
['entry', 'archive', 'stats', 'bugs'].forEach(view => {
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

async function showView(view, { animateNav = false, animateContent = false, openGameId } = {}) {
  if (view === 'bugs') {
    const { data } = await getSession();
    if (!data?.session) {
      return showView('entry', { animateNav, animateContent, openGameId });
    }
  }

  currentView = view;
  localStorage.setItem(VIEW_KEY, view);
  nav?.setAttribute('data-active-view', view);
  navBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  updateNavSlider(animateNav);

  Object.entries(viewContainers).forEach(([v, el]) => {
    el.hidden = v !== view;
  });

  const container = viewContainers[view];
  if (view === 'bugs') {
    container.innerHTML = '';
    await renderBugs(container);
  } else if (view === 'archive' || view === 'stats') {
    container.innerHTML = '';
    if (view === 'archive') {
      await renderArchive(container, { openGameId });
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
  } else if (view === 'entry') {
    container.innerHTML = '';
    formRenderId += 1;
    container.dataset.formRenderId = String(formRenderId);
    await renderForm(container);
  }
}

window.addEventListener('navigate-to-view', (e) => {
  const { view, animateNav = false, animateContent = false, openGameId } = e.detail || {};
  if (view && VALID_VIEWS.includes(view)) {
    showView(view, { animateNav, animateContent, openGameId });
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
  updateHeaderOffsetVar();
  // Preload games and players so Archive/Stats/New Game are fast when user navigates
  const stored = getStoredView();
  if (stored !== 'archive' && stored !== 'stats') loadGames();
  if (stored !== 'entry') getPlayerRowsAndCustom();
  // Prime Supabase count for demo mode (persisted, never overwritten with 0)
  if (!isSupabaseDisabled()) getSupabaseGameCount();
})();

// Use ResizeObserver on nav so we update when its layout changes (e.g. at 850px breakpoint).
// Double rAF ensures layout has settled before measuring.
function scheduleSliderUpdate() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => updateNavSlider());
  });
}

function updateHeaderOffsetVar() {
  const px = headerEl?.offsetHeight || 0;
  document.documentElement.style.setProperty('--header-offset', `${px}px`);
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
  updateHeaderOffsetVar();
  requestAnimationFrame(() => { resizeTicking = false; });
});

bindMobileNavAutoHide();
bindMobileHeaderCollapse();

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

function updateDemoModeUI() {
  const on = isDemoMode();
  document.title = on ? 'The 65 Almanac | DEMO' : 'The 65 Almanac';
  const badge = document.getElementById('demo-mode-badge');
  if (badge) badge.hidden = !on;
  if (headerKebab) headerKebab.dataset.demoMode = on ? 'true' : '';
  document.querySelectorAll('.demo-controls-only').forEach((el) => {
    el.classList.toggle('demo-controls-visible', on);
  });
  const toggle = document.getElementById('demo-mode-toggle');
  if (toggle) toggle.classList.toggle('toggle-slider--on', on);
  const demoOption = headerKebab?.querySelector('.header-kebab-option[data-action="demo-mode"]');
  if (demoOption) demoOption.setAttribute('aria-pressed', String(on));
}

window.addEventListener('demo-mode-change', updateDemoModeUI);

if (kebabBtn && kebabMenu) {
  async function updateLocalOnlyCaption() {
    const titleEl = headerKebab?.querySelector('.header-kebab-option[data-action="local-only"] .header-kebab-option-title');
    const caption = document.getElementById('local-only-caption');
    if (titleEl) {
      const count = await getSupabaseGameCount();
      titleEl.textContent = count > 0 ? `Live source data (${count})` : 'Live source data';
    }
    if (caption) {
      const on = !isSupabaseDisabled();
      caption.dataset.status = on ? 'on' : 'off';
      caption.textContent = on ? 'On' : 'Off';
      caption.setAttribute('aria-label', on ? 'On' : 'Off');
    }
  }

  function updateExportedDataCaption() {
    const titleEl = headerKebab?.querySelector('.header-kebab-option[data-action="exported-data"] .header-kebab-option-title');
    const caption = document.getElementById('exported-data-caption');
    if (titleEl) {
      const count = getExportedGameCount();
      titleEl.textContent = count > 0 ? `Backup data (${count})` : 'Backup data';
    }
    if (caption) {
      const on = isExportedDataEnabled();
      caption.dataset.status = on ? 'on' : 'off';
      caption.textContent = on ? 'On' : 'Off';
      caption.setAttribute('aria-label', on ? 'On' : 'Off');
    }
  }

  function updateClearDataTitle() {
    const titleEl = headerKebab?.querySelector('.header-kebab-option[data-action="clear-local"] .header-kebab-option-title');
    if (titleEl) {
      const count = getLocalGameCount();
      titleEl.textContent = count > 0 ? `Clear demo data (${count})` : 'Clear demo data';
    }
  }

  function updateClearDataVisibility() {
    const clearBtn = headerKebab?.querySelector('.header-kebab-option[data-action="clear-local"]');
    if (!clearBtn) return;
    const hidden = !isDemoMode() || !hasLocalData();
    if (isDemoMode()) updateClearDataTitle();
    clearBtn.hidden = hidden;
    const prevDivider = clearBtn.previousElementSibling;
    if (prevDivider?.classList.contains('header-kebab-option-divider')) prevDivider.hidden = hidden;
  }

  async function updateBugsCaption() {
    const { data } = await getSession();
    if (!data?.session) return;
    const titleEl = document.getElementById('bugs-title');
    if (!titleEl) return;
    try {
      const count = await getBugCount();
      titleEl.textContent = `Feedback (${count})`;
    } catch (_) {
      titleEl.textContent = 'Feedback';
    }
  }

  async function updateDownloadBackupCaption() {
    if (isDemoMode()) return;
    const caption = document.getElementById('download-backup-caption');
    const titleEl = document.getElementById('download-backup-title');
    if (!caption) return;
    const { total, backedUp } = await getDownloadBackupCounts();
    if (titleEl) titleEl.textContent = `Download archive (${total})`;
    let duration = formatDurationAgo(getLastExportedAt());
    if (!duration) {
      const buildMtime =
        typeof __EXPORTED_GAMES_MTIME__ !== 'undefined' &&
        __EXPORTED_GAMES_MTIME__ !== 'null' &&
        __EXPORTED_GAMES_MTIME__
          ? __EXPORTED_GAMES_MTIME__
          : null;
      duration = formatDurationAgo(buildMtime);
    }
    if (!duration) {
      try {
        const res = await fetch(new URL('/exported-games.json', window.location.origin), {
          cache: 'no-store',
        });
        const lastMod = res.ok && res.headers.get('Last-Modified');
        if (lastMod) duration = formatDurationAgo(new Date(lastMod).toISOString());
      } catch (_) {}
    }
    if (total === 0) {
      caption.textContent = 'No games yet';
      caption.setAttribute('aria-label', 'No games yet');
    } else {
      const hasHistory = getLastExportedAt() != null;
      const line1 = hasHistory && duration
        ? `Last saved ${duration}`
        : null;
      const line2 = `${backedUp} backed up`;
      caption.innerHTML = line1 ? `${line1}<br>${line2}` : line2;
      caption.setAttribute('aria-label', line1 ? `${line1}. ${line2}.` : `${line2}.`);
    }
  }

  function updateSignInSignOutUI() {
    getSession().then(({ data }) => {
      const authenticated = !!data?.session;
      document.querySelectorAll('.sign-in-only').forEach((el) => {
        el.classList.toggle('sign-in-visible', !authenticated);
      });
      document.querySelectorAll('.sign-out-only').forEach((el) => {
        el.classList.toggle('sign-out-visible', authenticated);
      });
      const showDownload = authenticated && !isDemoMode();
      document.querySelectorAll('.download-backup-only').forEach((el) => {
        el.classList.toggle('download-backup-visible', showDownload);
      });
      const showBugs = authenticated;
      document.querySelectorAll('.bugs-only').forEach((el) => {
        el.classList.toggle('bugs-visible', showBugs);
      });
    });
  }

  window.addEventListener('demo-mode-change', updateSignInSignOutUI);

  function showSignInModal() {
    const modal = document.createElement('div');
    modal.className = 'sign-in-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'sign-in-modal-title');
    modal.innerHTML = `
      <div class="sign-in-modal-backdrop"></div>
      <div class="sign-in-modal-content">
        <div id="sign-in-modal-form-container"></div>
      </div>
    `;
    const container = modal.querySelector('#sign-in-modal-form-container');
    const backdrop = modal.querySelector('.sign-in-modal-backdrop');
    const close = () => modal.remove();
    renderSignInForm(container, {
      onSuccess: () => {
        close();
        // Optimistically show Download button immediately (user just signed in)
        document.querySelectorAll('.sign-in-only').forEach((el) => {
          el.classList.toggle('sign-in-visible', false);
        });
        document.querySelectorAll('.sign-out-only').forEach((el) => {
          el.classList.toggle('sign-out-visible', true);
        });
        if (!isDemoMode()) {
          document.querySelectorAll('.download-backup-only').forEach((el) => {
            el.classList.add('download-backup-visible');
          });
        }
        document.querySelectorAll('.bugs-only').forEach((el) => {
          el.classList.add('bugs-visible');
        });
        updateSignInSignOutUI();
        updateBugsCaption();
        if (!isDemoMode()) updateDownloadBackupCaption();
      },
    });
    container.querySelector('h3')?.setAttribute('id', 'sign-in-modal-title');
    backdrop.addEventListener('click', close);
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
    document.body.appendChild(modal);
    container.querySelector('#auth-email')?.focus();
  }

  window.addEventListener('open-sign-in-modal', showSignInModal);

  updateThemeToggleUI();
  updateDemoModeUI();
  updateSignInSignOutUI();
  kebabBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const isOpen = !kebabMenu.hidden;
    kebabMenu.hidden = isOpen;
    if (!kebabMenu.hidden) {
      updateThemeToggleUI();
      updateDemoModeUI();
      updateSignInSignOutUI();
      await updateLocalOnlyCaption();
      updateExportedDataCaption();
      updateClearDataVisibility();
      updateBugsCaption();
      updateDownloadBackupCaption();
      document.addEventListener('click', () => { kebabMenu.hidden = true; }, { once: true });
    }
  });
  const demoModeOption = headerKebab.querySelector('.header-kebab-option[data-action="demo-mode"]');
  demoModeOption?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const turningOn = !isDemoMode();
    if (!turningOn) {
      if (demoDataResetTimeout) {
        clearTimeout(demoDataResetTimeout);
        demoDataResetTimeout = null;
      }
      clearLocalPlayerData();
      // Don't clear draft — preserve scoresheet in progress when switching out of demo
      setDemoMode(turningOn);
      // Schedule reset of live source/backup to both off if user stays out of demo mode
      demoDataResetTimeout = setTimeout(() => {
        demoDataResetTimeout = null;
        if (!isDemoMode()) {
          resetDemoDataSourcesToOff();
        }
      }, DEMO_DATA_RESET_DELAY_MS);
    } else {
      if (demoDataResetTimeout) {
        clearTimeout(demoDataResetTimeout);
        demoDataResetTimeout = null;
      }
      setDemoMode(turningOn);
    }
    updateDemoModeUI();
    updateSignInSignOutUI();
    await updateLocalOnlyCaption();
    updateExportedDataCaption();
    updateClearDataVisibility();
    if (currentView === 'entry') flushDraftToStorage(viewContainers.entry);
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
    await updateLocalOnlyCaption();
    if (currentView === 'entry') flushDraftToStorage(viewContainers.entry);
    viewContainers[currentView].innerHTML = '';
    await showView(currentView, { animateNav: false });
  });
  headerKebab.querySelector('.header-kebab-option[data-action="exported-data"]')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    setExportedDataEnabled(!isExportedDataEnabled());
    updateExportedDataCaption();
    if (currentView === 'entry') flushDraftToStorage(viewContainers.entry);
    viewContainers[currentView].innerHTML = '';
    await showView(currentView, { animateNav: false });
  });
  headerKebab.querySelector('.header-kebab-option[data-action="clear-local"]')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    clearLocalData();
    updateClearDataVisibility();
    viewContainers[currentView].innerHTML = '';
    await showView(currentView, { animateNav: false });
  });
  headerKebab.querySelector('.header-kebab-option[data-action="download-backup"]')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    kebabMenu.hidden = true;
    const data = await getExportData();
    setLastExportedAt();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const date = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `65_Almanac_Backup_${date}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  document.getElementById('header-bug-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    showBugReportModal({
      onBugSubmitted: async () => {
        if (currentView === 'bugs') {
          await renderBugs(viewContainers.bugs);
        }
      },
    });
  });
  headerKebab.querySelector('.header-kebab-option[data-action="view-bugs"]')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    kebabMenu.hidden = true;
    await showView('bugs', { animateNav: true });
  });
  headerKebab.querySelector('.header-kebab-option[data-action="sign-in"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    kebabMenu.hidden = true;
    showSignInModal();
  });
  // Preload caption data in background when authenticated (so kebab opens with data ready)
  function preloadCaptions() {
    getSession().then(({ data }) => {
      if (data?.session) {
        updateBugsCaption();
        if (!isDemoMode()) updateDownloadBackupCaption();
      }
    });
  }
  preloadCaptions();
  onAuthStateChange(({ session }) => {
    if (session) {
      updateBugsCaption();
      if (!isDemoMode()) updateDownloadBackupCaption();
    }
  });

  headerKebab.querySelector('.header-kebab-option[data-action="sign-out"]')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    kebabMenu.hidden = true;
    await signOut();
    setDemoMode(false);
    updateSignInSignOutUI();
    updateDemoModeUI();
    if (currentView === 'entry') flushDraftToStorage(viewContainers.entry);
    viewContainers.entry.innerHTML = '';
    await showView('entry', { animateNav: false });
  });
}

onAuthStateChange(async ({ event }) => {
  const { data } = await getSession();
  const authenticated = !!data?.session;
  if (event === 'SIGNED_OUT') {
    setDemoMode(false);
    updateDemoModeUI();
  }
  document.querySelectorAll('.sign-in-only').forEach((el) => {
    el.classList.toggle('sign-in-visible', !authenticated);
  });
  document.querySelectorAll('.sign-out-only').forEach((el) => {
    el.classList.toggle('sign-out-visible', authenticated);
  });
  const showDownload = authenticated && !isDemoMode();
  document.querySelectorAll('.download-backup-only').forEach((el) => {
    el.classList.toggle('download-backup-visible', showDownload);
  });
  const showBugs = authenticated;
  document.querySelectorAll('.bugs-only').forEach((el) => {
    el.classList.toggle('bugs-visible', showBugs);
  });
  if (viewContainers.entry) {
    if (currentView === 'entry') flushDraftToStorage(viewContainers.entry);
    const viewToShow = authenticated ? currentView : 'entry';
    viewContainers[viewToShow].innerHTML = '';
    await showView(viewToShow, { animateNav: false });
  }
});
