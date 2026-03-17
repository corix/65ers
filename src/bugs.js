import { supabase } from './supabase.js';
import { getSession } from './auth.js';
import { formatDurationAgo } from './utils.js';

const TRASH_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';
const DELETE_CONFIRM_TEXT = 'DELETE';

function getDeviceInfo() {
  const info = {};
  const safe = (key, fn) => {
    try {
      const v = fn();
      if (v != null && v !== '') info[key] = v;
    } catch (_) {}
  };
  safe('user_agent', () => navigator.userAgent);
  safe('viewport_width', () => window.innerWidth);
  safe('viewport_height', () => window.innerHeight);
  safe('screen_width', () => screen.width);
  safe('screen_height', () => screen.height);
  safe('device_pixel_ratio', () => window.devicePixelRatio);
  safe('platform', () => navigator.platform);
  safe('language', () => navigator.language);
  safe('device_memory', () => navigator.deviceMemory);
  safe('hardware_concurrency', () => navigator.hardwareConcurrency);
  safe('max_touch_points', () => navigator.maxTouchPoints);
  return info;
}

function generateBugId() {
  return new Date().toISOString().slice(0, 19).replace(/[-:]/g, '');
}

export async function submitBug({ id, description, author, viewport_width, device_info }) {
  const { error } = await supabase.from('bugs').insert({
    id,
    description,
    author,
    viewport_width,
    device_info,
  });
  if (error) throw error;
}

export async function loadBugs() {
  const { data, error } = await supabase
    .from('bugs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getBugCount() {
  const { count, error } = await supabase
    .from('bugs')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function deleteBug(id) {
  const { data, error } = await supabase.from('bugs').delete().eq('id', id).select();
  if (error) throw error;
  if (!data?.length) throw new Error('Bug not found or could not be deleted');
}

export function showBugReportModal({ onBugSubmitted } = {}) {
  const modal = document.createElement('div');
  modal.className = 'sign-in-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'bug-report-modal-title');
  modal.innerHTML = `
    <div class="sign-in-modal-backdrop"></div>
    <div class="sign-in-modal-content">
      <div id="bug-report-form-container"></div>
    </div>
  `;
  const container = modal.querySelector('#bug-report-form-container');
  const backdrop = modal.querySelector('.sign-in-modal-backdrop');

  getSession().then(({ data }) => {
    const authenticated = !!data?.session;
    const author = data?.session?.user?.email ?? '';

    const wrapper = document.createElement('div');
    wrapper.className = 'auth-sign-in-wrap bug-report-wrap';
    wrapper.innerHTML = `
      <form class="auth-sign-in-form card bug-report-form" id="bug-report-form">
        <h3 id="bug-report-modal-title">Leave feedback</h3>
        <div class="auth-sign-in-field">
          <label for="bug-description">Description<span class="required-asterisk">*</span></label>
          <textarea id="bug-description" name="description" rows="4" required placeholder="What would you like Cori to know?"></textarea>
        </div>
        ${!authenticated ? `
        <div class="auth-sign-in-field">
          <label for="bug-name">Your name<span class="required-asterisk">*</span></label>
          <input type="text" id="bug-name" name="name" required >
        </div>
        ` : ''}
        <p class="auth-error" id="bug-error" hidden></p>
        <button type="submit" class="primary-btn" id="bug-submit-btn" disabled>Submit</button>
      </form>
    `;
    container.appendChild(wrapper);

    const form = wrapper.querySelector('#bug-report-form');
    const errorEl = wrapper.querySelector('#bug-error');
    const submitBtn = wrapper.querySelector('#bug-submit-btn');
    const descriptionInput = wrapper.querySelector('#bug-description');
    const nameInput = wrapper.querySelector('#bug-name');

    const close = () => modal.remove();

    const updateSubmitState = () => {
      const descFilled = descriptionInput.value.trim().length > 0;
      const nameFilled = authenticated || (nameInput?.value?.trim().length ?? 0) > 0;
      submitBtn.disabled = !(descFilled && nameFilled);
    };

    descriptionInput.addEventListener('input', updateSubmitState);
    descriptionInput.addEventListener('change', updateSubmitState);
    nameInput?.addEventListener('input', updateSubmitState);
    nameInput?.addEventListener('change', updateSubmitState);
    updateSubmitState();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.hidden = true;
      const description = form.querySelector('#bug-description').value.trim();
      const nameInput = form.querySelector('#bug-name');
      const authorValue = authenticated ? author : (nameInput?.value?.trim() ?? '');

      if (!description) {
        errorEl.textContent = 'Please enter a description.';
        errorEl.hidden = false;
        return;
      }
      if (!authorValue) {
        errorEl.textContent = 'Please enter your name.';
        errorEl.hidden = false;
        return;
      }

      const id = generateBugId();
      const viewport_width = window.innerWidth;
      const device_info = getDeviceInfo();

      try {
        await submitBug({ id, description, author: authorValue, viewport_width, device_info });
        close();
        showBugReportToast();
        onBugSubmitted?.();
      } catch (err) {
        errorEl.textContent = err?.message || 'Failed to submit bug. Try again.';
        errorEl.hidden = false;
      }
    });

    backdrop.addEventListener('click', close);
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
    document.body.appendChild(modal);
    wrapper.querySelector('#bug-description')?.focus();
  });
}

function showDeleteConfirmModal(container, bugId, onConfirm, cardEl) {
  const modal = document.createElement('div');
  modal.className = 'delete-confirm-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'delete-confirm-title');
  modal.innerHTML = `
    <div class="delete-confirm-backdrop"></div>
    <div class="delete-confirm-content">
      <h3 id="delete-confirm-title">Delete feedback?</h3>
      <p class="delete-confirm-instruction">Type ${DELETE_CONFIRM_TEXT} to confirm</p>
      <input type="text" class="delete-confirm-input" autocomplete="off" spellcheck="false">
      <p class="auth-error delete-confirm-error" id="delete-confirm-error" hidden></p>
      <div class="delete-confirm-actions">
        <button type="button" class="delete-confirm-cancel">Cancel</button>
        <button type="button" class="delete-confirm-submit" disabled>Delete</button>
      </div>
    </div>
  `;

  const input = modal.querySelector('.delete-confirm-input');
  const submitBtn = modal.querySelector('.delete-confirm-submit');
  const cancelBtn = modal.querySelector('.delete-confirm-cancel');
  const backdrop = modal.querySelector('.delete-confirm-backdrop');
  const errorEl = modal.querySelector('#delete-confirm-error');

  if (cardEl) cardEl.classList.add('archive-item--delete-pending');

  const close = () => {
    if (cardEl) cardEl.classList.remove('archive-item--delete-pending');
    modal.remove();
  };

  const checkInput = () => {
    submitBtn.disabled = input.value.trim().toUpperCase() !== DELETE_CONFIRM_TEXT;
  };

  input.addEventListener('input', () => {
    errorEl.hidden = true;
    checkInput();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Enter' && !submitBtn.disabled) {
      e.preventDefault();
      submitBtn.click();
    }
  });

  submitBtn.addEventListener('click', async () => {
    if (submitBtn.disabled) return;
    submitBtn.disabled = true;
    errorEl.hidden = true;
    try {
      await onConfirm();
      close();
    } catch (err) {
      errorEl.textContent = err?.message || 'Failed to delete. Try again.';
      errorEl.hidden = false;
      submitBtn.disabled = false;
    }
  });

  cancelBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);

  document.body.appendChild(modal);
  requestAnimationFrame(() => input.focus());
}

function showBugReportToast() {
  const toast = document.createElement('div');
  toast.className = 'bug-report-toast';
  toast.textContent = "Thanks for your feedback! You're the best :)";
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('bug-report-toast--visible'));
  setTimeout(() => {
    toast.classList.remove('bug-report-toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

let bugsDocClickListener = null;

export async function renderBugs(container) {
  container.innerHTML = '<div class="archive-loading"><p>Loading…</p></div>';
  try {
    const bugs = await loadBugs();
    container.innerHTML = '';

    if (bugs.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'archive-empty';
      empty.innerHTML = `
        <div class="card empty-state">
          <p>No bugs reported yet.</p>
        </div>
      `;
      container.appendChild(empty);
      return;
    }

    const list = document.createElement('div');
    list.className = 'bugs-list';

    const hideAllReveals = () => {
      list.querySelectorAll('.bugs-delete-wrap').forEach((w) => w.classList.remove('archive-delete-wrap--revealed'));
    };

    const handleDocumentClick = (e) => {
      if (!list.isConnected) return;
      if (list.contains(e.target) && e.target.closest('.bugs-delete-wrap')) return;
      hideAllReveals();
    };

    if (bugsDocClickListener) {
      document.removeEventListener('click', bugsDocClickListener);
    }
    document.addEventListener('click', handleDocumentClick);
    bugsDocClickListener = handleDocumentClick;

    bugs.forEach((bug) => {
      const card = document.createElement('div');
      card.className = 'card bugs-card';
      const deviceSummary = bug.device_info
        ? [bug.device_info.user_agent?.slice(0, 50), bug.viewport_width ? `${bug.viewport_width}px` : null]
            .filter(Boolean)
            .join(' · ')
        : '';
      const createdAgo = formatDurationAgo(bug.created_at) || 'just now';
      const desc = bug.description || '';
      const isLong = desc.length > 500;
      const truncated = isLong ? desc.slice(0, 500) : desc;
      const descriptionHtml = isLong
        ? `<span class="bugs-card-description-collapsed">${escapeHtml(truncated)}… <button type="button" class="bugs-card-description-toggle">Show more</button></span><span class="bugs-card-description-expanded" hidden>${escapeHtml(desc)} <button type="button" class="bugs-card-description-toggle">Show less</button></span>`
        : escapeHtml(desc);
      card.innerHTML = `
        <div class="bugs-card-header">
          <span class="bugs-card-meta">${escapeHtml(bug.author)} · ${createdAgo}</span>
          <p class="bugs-card-description">${descriptionHtml}</p>
        </div>
        <details class="bugs-card-details">
          <summary>Details</summary>
          <div class="bugs-card-details-content">
            <div class="bugs-card-id">ID: ${escapeHtml(bug.id)}</div>
            ${bug.viewport_width ? `<div>Viewport: ${bug.viewport_width}px</div>` : ''}
            ${deviceSummary ? `<div class="bugs-card-device-summary" title="${escapeHtml(JSON.stringify(bug.device_info))}">${escapeHtml(deviceSummary)}</div>` : ''}
            <pre class="bugs-card-device-json">${escapeHtml(JSON.stringify(bug.device_info ?? {}, null, 2))}</pre>
          </div>
        </details>
        <div class="bugs-delete-wrap archive-delete-wrap">
          <button type="button" class="archive-delete-btn" aria-label="Delete feedback" title="Delete feedback">${TRASH_ICON}</button>
        </div>
      `;

      const deleteWrap = card.querySelector('.bugs-delete-wrap');
      const deleteBtn = card.querySelector('.archive-delete-btn');

      const revealActions = (e) => {
        if (e) e.preventDefault();
        hideAllReveals();
        deleteWrap.classList.add('archive-delete-wrap--revealed');
      };

      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        revealActions();
      });

      let longPressTimer = null;
      card.addEventListener('touchstart', () => {
        longPressTimer = setTimeout(() => {
          longPressTimer = null;
          revealActions();
        }, 500);
      });
      card.addEventListener('touchend', () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      });
      card.addEventListener('touchcancel', () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      });

      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        hideAllReveals();
        showDeleteConfirmModal(container, bug.id, async () => {
          await deleteBug(bug.id);
          container.innerHTML = '';
          await renderBugs(container);
        }, card);
      });

      if (isLong) {
        const collapsed = card.querySelector('.bugs-card-description-collapsed');
        const expanded = card.querySelector('.bugs-card-description-expanded');
        card.querySelectorAll('.bugs-card-description-toggle').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const showMore = btn.textContent === 'Show more';
            collapsed.hidden = showMore;
            expanded.hidden = !showMore;
          });
        });
      }

      list.appendChild(card);
    });
    container.appendChild(list);
  } catch (err) {
    container.innerHTML = `
      <div class="card empty-state">
        <p>Could not load bugs: ${escapeHtml(err?.message || 'Unknown error')}</p>
      </div>
    `;
  }
}

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}
