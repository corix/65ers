import { supabase } from './supabase.js';

export async function getSession() {
  return supabase.auth.getSession();
}

export async function isAuthenticated() {
  const { data } = await getSession();
  return !!data?.session;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback({ event, session });
  });
}

export function renderSignInForm(container, { onSuccess } = {}) {
  container.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'auth-sign-in-wrap';
  wrapper.innerHTML = `
    <form class="auth-sign-in-form card" id="auth-sign-in-form">
      <h3>Sign in</h3>
      <div class="auth-sign-in-field">
        <label for="auth-email">Email</label>
        <input type="email" id="auth-email" name="email" required autocomplete="email">
      </div>
      <div class="auth-sign-in-field">
        <label for="auth-password">Password</label>
        <input type="password" id="auth-password" name="password" required autocomplete="current-password">
      </div>
      <p class="auth-error" id="auth-error" hidden></p>
      <button type="submit" class="primary-btn">Sign in</button>
    </form>
  `;
  container.appendChild(wrapper);

  const form = wrapper.querySelector('#auth-sign-in-form');
  const errorEl = wrapper.querySelector('#auth-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    const email = form.querySelector('#auth-email').value.trim();
    const password = form.querySelector('#auth-password').value;
    try {
      await signIn(email, password);
      onSuccess?.();
    } catch (err) {
      errorEl.textContent = err?.message || 'Sign in failed';
      errorEl.hidden = false;
    }
  });
}
