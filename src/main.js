import './shared.css';
import { isSupabaseDisabled, setSupabaseDisabled, isExportedDataEnabled, setExportedDataEnabled, clearLocalData } from './api.js';
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

// Header kebab (Archive options)
const headerKebab = document.getElementById('header-nav-kebab');
const kebabBtn = headerKebab?.querySelector('.header-kebab-btn');
const kebabMenu = headerKebab?.querySelector('.header-kebab-menu');
  if (kebabBtn && kebabMenu) {
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

  kebabBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !kebabMenu.hidden;
    kebabMenu.hidden = isOpen;
    if (!kebabMenu.hidden) {
      updateLocalOnlyCaption();
      updateExportedDataCaption();
      document.addEventListener('click', () => { kebabMenu.hidden = true; }, { once: true });
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
