# Phase 5: Auth and Role-Based Access Control

One plan to add password protection and role-based access. Implement in order — later phases depend on earlier ones.

## Overview

- **Goal:** Admin has full write access; Editor can create/update but not delete games; Demo has read-only Supabase access plus Dev Mode to play with the UI via localStorage.
- **Current state:** main branch uses full Supabase read/write with anon key. dev-mode branch (separate codebase) has read-only Supabase, write-only localStorage, and dev controls. The two diverge in 7 files.
- **Approach:**
  1. Merge dev-mode into main as a runtime toggle
  2. Add Supabase Auth
  3. Add roles (admin, editor, demo) via RLS and Auth Hook
  4. Gate UI by role

### Rollout Strategy: Passwords First, Logins Later

- **Phase A (initial):**
  - Single password prompt
  - User enters one of 3 passwords; Edge Function validates and signs them in as the matching role's Supabase user
  - No email field, no signup
  - Passwords stay server-side
- **Phase 5.6 (optional):** Migration to email logins — add sign-up/sign-in; each person gets their own account; admin assigns roles. Optionally deprecate the password flow.
- **Why this order:** Passwords are simpler to ship (no signup flow, no email verification). The schema (`user_roles`, RLS, Auth Hook) is identical for both — only the auth UI and flow change. Migration is additive: add email login, optionally remove the password Edge Function.

---

## Phase 5.1 — Dev Mode Runtime Toggle

Prerequisite for Demo users. Merge dev-mode logic so it can be toggled at runtime instead of requiring a separate branch.

### Approach

Introduce `isDevMode()` that switches behavior. When ON: hybrid data (read Supabase + backup, write localStorage) and dev controls. When OFF: full Supabase read/write.

### Tasks

- **5.1.1** Create [src/dev-mode.js](src/dev-mode.js):
  - `isDevMode()`, `setDevMode(on)`, `initDevModeFromUrl()` (check `?dev=1` / `?dev=0`)
  - Persist in localStorage (`65ers_dev_mode`)
  - Hidden gesture (triple-click header) to toggle
- **5.1.2** Refactor [src/api.js](src/api.js) to branch on `isDevMode()`:
  - Production = Supabase
  - Dev = localStorage writes, merged reads (Supabase optional + exported backup + local games)
  - Merge helpers: `getLocalGames`, `setLocalGames`, `isSupabaseDisabled`, `setSupabaseDisabled`, `isExportedDataEnabled`, `setExportedDataEnabled`, `clearLocalData`
- **5.1.3** Update [src/main.js](src/main.js):
  - Call `initDevModeFromUrl()` on load
  - Build kebab menu dynamically
  - Add dev-mode gesture
  - Re-render on toggle
- **5.1.4** Update [src/archive.js](src/archive.js) and [src/form.js](src/form.js):
  - Render Scratch entry, Fill sheet only when `isDevMode()`
  - Import from [src/scratch.js](src/scratch.js)
- **5.1.5** Merge dev-mode styles into [src/shared.css](src/shared.css) and [src/archive.css](src/archive.css):
  - `.dev-mode-badge`, `.scratch-entry-btn`, `.archive-toolbar`

### Files

- New: `src/dev-mode.js`
- Modify: `api.js`, `main.js`, `archive.js`, `form.js`, `shared.css`, `archive.css`

---

## Phase 5.2 — Supabase Auth (Password-First)

Gate the app behind auth. Initial rollout: single password prompt; Edge Function maps password to role and signs in.

### Tasks

- **5.2.1** Create 3 Supabase users (one per role):
  - e.g. `admin@65ers.local`, `editor@65ers.local`, `demo@65ers.local`
  - Set a password for each
  - Add each to `user_roles` via migration or manual SQL
- **5.2.2** Create Edge Function `supabase/functions/auth-with-password`:
  - Receives `{ password }`
  - Checks against 3 env vars (`ADMIN_PASSWORD`, `EDITOR_PASSWORD`, `DEMO_PASSWORD`)
  - Signs in as the matching user via `supabase.auth.signInWithPassword`
  - Returns session to client
- **5.2.3** Create [src/auth.js](src/auth.js):
  - Single password input (no email)
  - Submit → call Edge Function → store session
  - Sign-out, `onAuthStateChange` listener
  - Gate app: no session → render password form; session → render main app
- **5.2.4** Update [src/main.js](src/main.js): check session before rendering; pass session to views
- **5.2.5** Update [index.html](index.html): add auth container or keep single app div for auth/main swap

### Files

- New: `src/auth.js`, `supabase/functions/auth-with-password/`
- Modify: `main.js`, `index.html`

---

## Phase 5.3 — Roles and RLS

Add `user_roles` table, Auth Hook, and role-based RLS policies.

### Role Summary

| Role       | Supabase                                                              | UI                                                                           |
| ---------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Admin**  | Full read/write (SELECT, INSERT, UPDATE, DELETE) on games and players | All features: New Game, Archive (delete, date edit), Stats, Export, Dev Mode |
| **Editor** | SELECT, INSERT, UPDATE only (no DELETE on games)                      | New Game, Archive (date edit only, no delete), Stats, Export                 |
| **Demo**   | SELECT only                                                           | Archive, Stats (read-only). Dev Mode toggle to play with UI via localStorage |

### Tasks

- **5.3.1** Migration `supabase/migrations/YYYYMMDD_auth_roles.sql`:
  - `app_role` enum (`admin`, `editor`, `demo`)
  - `user_roles` table (`user_id`, `role`)
  - RLS on `user_roles` (service_role full access; `supabase_auth_admin` select)
  - `custom_access_token_hook` function to add `user_role` to JWT
- **5.3.2** Migration `supabase/migrations/YYYYMMDD_rls_policies.sql`:
  - Drop existing anon policies on `games` and `players`
  - Add authenticated policies: SELECT for all roles; INSERT/UPDATE for admin, editor; DELETE for admin only
  - Optional: `user_role()` helper for cleaner policies
  - Editor: allow DELETE on players (for orphan cleanup; "no delete" = no delete games)
- **5.3.3** Supabase Dashboard: Authentication > Hooks > Customize Access Token → select `custom_access_token_hook`

### Files

- New: migrations

---

## Phase 5.4 — Role-Aware UI

Wire role into views. Decode role from JWT (`jwt-decode`).

### Tasks

- **5.4.1** Add `jwt-decode` to [package.json](package.json). Decode `user_role` from `session.access_token`
- **5.4.2** [src/archive.js](src/archive.js):
  - `canDelete` = `role === 'admin'` (hide delete)
  - `canEditDate` = admin or editor (hide date edit for demo)
- **5.4.3** [src/form.js](src/form.js): `canCreateGame` = admin or editor (hide New Game for demo)
- **5.4.4** [src/main.js](src/main.js) kebab:
  - `canExport` = admin or editor
  - `canToggleDevMode` = demo only (or all roles). Show Dev Mode toggle for Demo
- **5.4.5** Unauthenticated: no access. Redirect to login

### Files

- Modify: `main.js`, `archive.js`, `form.js`, `package.json`

---

## Phase 5.5 — Admin Setup and Testing

Bootstrap the 3 shared accounts and verify.

### Tasks

- **5.5.1** Create 3 users in Supabase Dashboard (Authentication > Users > Add user):
  - `admin@65ers.local`, `editor@65ers.local`, `demo@65ers.local`
  - Set passwords
  - Store those passwords in Edge Function env vars
- **5.5.2** Run SQL to add each to `user_roles`:
  ```sql
  insert into public.user_roles (user_id, role) values
    ('<admin-uuid>', 'admin'),
    ('<editor-uuid>', 'editor'),
    ('<demo-uuid>', 'demo');
  ```
- **5.5.3** Test: enter each password, verify role restrictions (admin full access, editor no delete, demo read-only + Dev Mode)

---

## Phase 5.6 — Migration to Email Logins (optional)

Only if you want per-user accounts instead of shared passwords.

| Step | Action |
| ---- | ------ |
| 1 | Add sign-up and sign-in UI (email + password) |
| 2 | New users create accounts; admin assigns roles via `insert into public.user_roles` |
| 3 | Optionally deprecate the password Edge Function and remove the password auth flow |
| 4 | Schema unchanged — `user_roles`, RLS, Auth Hook stay the same |

---

## Reference

### Dev Mode Toggle

- Query param: `?dev=1` / `?dev=0`
- Hidden gesture: triple-click "The 65 Almanac" in header
- Persistence: localStorage `65ers_dev_mode`

### Auth Hook (excerpt)

```sql
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable as $$
declare
  claims jsonb;
  user_role public.app_role;
begin
  select role into user_role from public.user_roles where user_id = (event->>'user_id')::uuid;
  claims := event->'claims';
  if user_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  else
    claims := jsonb_set(claims, '{user_role}', 'null');
  end if;
  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;
```

### Role Detection (client)

```js
import { jwtDecode } from 'jwt-decode';
const role = session?.access_token ? jwtDecode(session.access_token).user_role : null;
```

### Files Summary

| File                                     | Phase      | Action                                      |
| ---------------------------------------- | ---------- | ------------------------------------------- |
| `src/dev-mode.js`                        | 5.1        | New                                         |
| `src/api.js`                             | 5.1        | Merge dev-mode logic                        |
| `src/main.js`                            | 5.1, 5.2, 5.4 | Dev toggle, auth gate, role-aware kebab |
| `src/archive.js`                         | 5.1, 5.4   | Scratch entry, role-based delete/edit       |
| `src/form.js`                            | 5.1, 5.4   | Scratch entry, role-based New Game          |
| `src/auth.js`                            | 5.2        | New: password form, signOut                 |
| `supabase/functions/auth-with-password/` | 5.2        | New: validate password, sign in, return session |
| `supabase/migrations/*_auth_roles.sql`   | 5.3        | New: user_roles, Auth Hook                  |
| `supabase/migrations/*_rls_policies.sql` | 5.3        | New: role-based RLS                         |
| `src/shared.css`, `src/archive.css`      | 5.1        | Merge dev-mode styles                       |
| `index.html`                             | 5.2        | Auth container                              |
| `package.json`                           | 5.4        | Add `jwt-decode`                            |
