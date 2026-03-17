const DEMO_MODE_KEY = '65ers_demo_mode';

export function isDemoMode() {
  return localStorage.getItem(DEMO_MODE_KEY) === '1';
}

export function setDemoMode(on) {
  localStorage.setItem(DEMO_MODE_KEY, on ? '1' : '0');
  window.dispatchEvent(new CustomEvent('demo-mode-change'));
}

export function initDemoModeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const demo = params.get('demo');
  if (demo === '1') {
    setDemoMode(true);
  } else if (demo === '0') {
    setDemoMode(false);
  }
  // Migrate from old key (65ers_supabase_disabled) if demo mode was never explicitly set
  const current = localStorage.getItem(DEMO_MODE_KEY);
  if (current === null) {
    const legacy = localStorage.getItem('65ers_supabase_disabled');
    if (legacy === '1') setDemoMode(true);
    else if (legacy === '0') setDemoMode(false);
  }
}
