# Phase 5: Auth MVP — Email Login + Admin Invites

Plan for auth and write access. Implement in order — later phases depend on earlier ones.

**Status: Complete**

*(The previous 3-password, role-based plan is archived at [archive/PHASE-5-auth-roles_not-used.md](archive/PHASE-5-auth-roles_not-used.md).)*

## Overview

- **Goal:** Invited users get full write access via email + password login. Unauthenticated users get read-only access, or can toggle Demo Mode to write to localStorage.
- **Current state:** Demo Mode runtime toggle; Supabase Auth (email + password); RLS gates writes to authenticated users; UI gating by auth state.
- **Approach:**
  1. Merge `dev-mode` into main as a runtime toggle (branch stays after merge; optionally rename to `demo-mode` for consistency)
  2. Add Supabase Auth (email + password sign-in)
  3. Admin invites users; no self-signup
  4. RLS: anon = read-only; authenticated = full write
  5. Gate UI by auth state; Demo Mode available to all (signed in or not)

### User Management

- **Signup:** Disabled. Only the admin can add users.
- **Invite flow:** Admin invites via Supabase Dashboard (Authentication > Users > Invite user). User receives email, sets their own password on first use.
- **All invited users:** Same write access (no roles).

---

## Phase 5.1 — Demo Mode Runtime Toggle (Done)

Merge demo-mode logic so it can be toggled at runtime. 

- When ON: hybrid data (read Supabase + backup, write localStorage) and demo controls.
- When OFF: full Supabase read/write for authenticated users; read-only for unauthenticated; no demo controls.

### Tasks

- **5.1.1** Create [src/demo-mode.js](../src/demo-mode.js):
  - `isDemoMode()`, `setDemoMode(on)`, `initDemoModeFromUrl()` (check `?demo=1` / `?demo=0`)
  - Persist in localStorage (`65ers_demo_mode`)
- **5.1.2** Refactor [src/api.js](../src/api.js) to branch on `isDemoMode()`:
  - Production = Supabase
  - Demo = localStorage writes, merged reads (Supabase optional + exported backup + local games)
  - Merge helpers: `getLocalGames`, `setLocalGames`, `isSupabaseDisabled`, `setSupabaseDisabled`, `isExportedDataEnabled`, `setExportedDataEnabled`, `clearLocalData`
- **5.1.3** Update [src/main.js](../src/main.js):
  - Call `initDemoModeFromUrl()` on load
  - Build kebab menu dynamically; add Demo Mode toggle to kebab menu
  - Re-render on toggle
- **5.1.4** Update [src/archive.js](../src/archive.js) and [src/form.js](../src/form.js):
  - Render Scratch entry, Fill sheet only when `isDemoMode()`
  - Import from [src/scratch.js](../src/scratch.js)
- **5.1.5** Merge demo-mode styles into [src/shared.css](../src/shared.css) and [src/archive.css](../src/archive.css):
  - `.demo-mode-badge`, `.scratch-entry-btn`, `.archive-toolbar`
  - `.local-storage-entry`: red left border on entry cards for games saved to localStorage (Demo Mode)

### Files

- New: `src/demo-mode.js`
- Modify: `api.js`, `main.js`, `archive.js`, `form.js`, `shared.css`, `archive.css`

---

## Phase 5.2 — Supabase Auth (Email + Password) (Done)

Use Supabase Auth for sign-in. 

### Supabase Setup

- **5.2.0** Disable self-signup in Supabase Dashboard: Done
  - Authentication > Providers > Email: ensure "Enable Email Signup" is OFF (or use Auth settings to restrict signups)
  - Users can only be added via invite

### Tasks

- **5.2.1** Create [src/auth.js](../src/auth.js):
  - Email + password sign-in form
  - `signIn(email, password)` via `supabase.auth.signInWithPassword`
  - `signOut()`, `onAuthStateChange` listener
  - Gate app: no session → render login form; session → render main app
- **5.2.2** Update [src/main.js](../src/main.js): check session before rendering; pass session to views
- **5.2.3** Update [index.html](../index.html): add auth container or keep single app div for auth/main swap

### Files

- New: `src/auth.js`
- Modify: `main.js`, `index.html`

---

## Phase 5.3 — RLS (Done)

Add role-based policies. No `user_roles` table; authenticated vs. anon only.

### Tasks

- **5.3.1** Migration `supabase/migrations/YYYYMMDD_rls_write_gate.sql`:
  - Drop existing anon write policies on `games` and `players`
  - `games`: anon SELECT only; authenticated SELECT, INSERT, UPDATE, DELETE
  - `players`: same

### Files

- New: migration

---

## Phase 5.4 — UI Gating (Done)

Gate write actions by auth state. Demo Mode available to everyone.

### Tasks

- **5.4.1** Single check: `isAuthenticated` (has session).
- **5.4.2** [src/archive.js](../src/archive.js):
  - When not authenticated and not Demo Mode: hide Edit, Delete
  - When Demo Mode: show Scratch entry, allow localStorage writes
  - Apply `.local-storage-entry` class to entry cards for games from localStorage (red left border)
- **5.4.3** [src/form.js](../src/form.js):
  - When not authenticated and not Demo Mode: show sign-in form and instructions to turn on Demo Mode (instead of New Game)
  - Include a text link in the instructions that calls `setDemoMode(true)` so users can enable Demo Mode without opening the kebab menu
  - When Demo Mode: allow new entries (saved to localStorage)
- **5.4.4** [src/main.js](../src/main.js) kebab:
  - Demo Mode toggle available to all (signed in or not)
  - Export: admin/authenticated only (or all if read-only export is fine)
  - Sign Out: visible for authenticated users only; calls `signOut()` and returns to read-only view

### Unauthenticated Experience

- **Read-only:** Archive and Stats visible; Edit, Delete hidden. New Game area shows sign-in form and instructions with a text link to turn on Demo Mode.
- **Demo Mode:** Toggle to write to localStorage; Scratch entry, Fill sheet, new games saved locally. Entry cards for localStorage games show a red left border.

### Files

- Modify: `main.js`, `archive.js`, `form.js`

---

## Phase 5.5 — Admin Setup and Testing (Done)

### Tasks

- **5.5.1** Invite a test user via Supabase Dashboard: Skipped (admin has access)
  - Authentication > Users > Invite user
  - Enter email; user receives invite, sets password
- **5.5.2** Test flows: Done
  - Unauthenticated: read-only Archive/Stats; Demo Mode toggle works, localStorage writes work
  - Authenticated: full write access (New Game, Edit, Delete)

---

## Reference

### Demo Mode Toggle

- Query param: `?demo=1` / `?demo=0`
- Kebab menu: Demo Mode toggle visible in the menu (available to all users)
- Persistence: localStorage `65ers_demo_mode`
- Visual indicator: Entry cards for localStorage games have a red left border (`.local-storage-entry`)

### Auth Check (client)

```js
const session = supabase.auth.getSession();
const isAuthenticated = !!session?.data?.session;
```

### Files Summary


| File                                       | Phase         | Action                                |
| ------------------------------------------ | ------------- | ------------------------------------- |
| `src/demo-mode.js`                         | 5.1           | New                                   |
| `src/api.js`                               | 5.1           | Merge demo-mode logic                 |
| `src/main.js`                              | 5.1, 5.2, 5.4 | Dev toggle, auth gate, UI gating      |
| `src/archive.js`                           | 5.1, 5.4      | Scratch entry, auth-based edit/delete |
| `src/form.js`                              | 5.1, 5.4      | Scratch entry, auth-based New Game    |
| `src/auth.js`                              | 5.2           | New: email + password sign-in         |
| `supabase/migrations/*_rls_write_gate.sql` | 5.3           | New: anon SELECT, authenticated full  |
| `src/shared.css`, `src/archive.css`        | 5.1           | Merge demo-mode styles                |
| `index.html`                               | 5.2           | Auth container                        |


### What This MVP Does Not Include

- `user_roles` table and Auth Hook
- `jwt-decode` dependency
- Role-based UI distinctions
- Custom password Edge Function
