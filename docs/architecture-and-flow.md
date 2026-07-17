# Architecture & First-Visit Flow Review (2026-07-17)

A whole-project review of (a) code organization and (b) how easily a
first-time visitor understands what the app is and where to go.

## Verdict: what was already well organized

The project largely follows modern conventions and did **not** need a
restructure:

- **Backend** — modular per SRS module (`modules/<name>/` with
  `routes / controller / service / validation / model` per module), shared
  `middlewares/`, `config/`, `utils/`, `jobs/`, central error handling,
  request context + audit middleware. This is the standard "feature-module"
  Express layout.
- **Frontend** — `api/` (client + per-module API), `components/`
  (`ui` / `layout`), `features/<domain>/`, `pages/`, `context/`, `hooks/`,
  `i18n/` + `locales/`, `styles/` (token-driven), route-level code splitting
  for the signed-in workspace.
- **Routing** — three clear layout shells: `PublicLayout` (header/footer
  site), `DeskLayout` (service desks, adapts to auth state), and
  `WorkspaceLayout` (role-guarded dashboards).

## Structural issues found & fixed

### 1. Two competing API barrels (real bug source)

`src/api/modules.js` **and** `src/api/modules/index.js` both re-exported the
API modules with a hand-maintained list — they had already drifted once
(a new module was added to one but not the other, breaking the build).
`modules.js` was deleted; the directory index is now the **single** barrel and
all 29 importers resolve to it unchanged.

### 2. Workspace pages scattered across misleading folders

`pages/admin/` contained the teacher and staff dashboards (not admin-only),
while the student dashboard lived in `pages/public/` (it is a role-guarded
workspace page). Renamed/moved so folders say what they contain:

```
pages/
  public/      ← everything reachable without signing in
  auth/        ← login / register / password flows
  workspace/   ← ALL role-guarded dashboards & tools (admin, teacher,
                 staff, student, CMS studio, notification center, access control)
```

### 3. Inconsistent backend route mounting

`analytics` and `admin` were mounted directly in `app.js` while every other
module went through `routes/routeModules.js`. Both are now registered in
`routeModules.js` — one place lists every API module (URLs unchanged,
verified live).

## First-visit flow: the real gap

Code structure aside, a first-time visitor had no orientation: the homepage
showed *content* (news, events, stats) but never explained the app's shape —
that everything is readable publicly, that actions need an account, and that
each role has its own portal. The `/portals` guide existed but was only
reachable through the Sign In button.

### Improvements

1. **"How the hub works" band** (right after the hero, EN + BN):
   three numbered steps —
   *Browse freely* (all content is public) →
   *Create your account* (students self-register; staff/faculty are elevated
   by admin) →
   *Work from your portal* (role workspaces) —
   with **Create an account** and **Explore the portals** actions
   (signed-in visitors see **Open my workspace** instead).
2. **Role-aware hero CTA** — guests now get **Create an account** as the
   primary action (was "View scholarships", which dead-ends at a login when
   you try to apply); signed-in users get **Open my workspace** pointing at
   their own dashboard.
3. **Role-aware closing CTA band** — guests: **Create your account** +
   "Already have an account? Choose your portal →" (links the portal guide);
   signed-in users keep the scholarship CTA.

### Resulting first-visit journey

```
Land on / ──► hero explains the platform, CTA = Create an account
          ──► "How the hub works": browse → account → portal   (30-second mental model)
          ──► services, news, scholarships, events, venues (all browsable)
          ──► closing CTA: register, or pick a portal if you have an account
Sign in  ──► auto-routed to the right workspace for your role
```

## Not changed (deliberately)

- No folder-by-type flattening or extra abstraction layers — the existing
  feature-module organization is the right size for this project.
- `features/` currently holds only `cms/` and `scholarship/`; other domains
  are simple enough to live in their page files. Splitting them now would be
  structure for its own sake.
- Known lint debt (duplicate CSS selectors in theme-override blocks, a few
  unused vars) remains tracked but untouched.

## Verification

- Frontend build passes after the barrel deletion + folder moves.
- Backend suite **19/19 pass**; server restarted and every remounted route
  answers live (`/api/v1/analytics/*`, `/api/v1/admin/dashboard/stats`,
  spot-checks on cms/search).
- Changed files lint clean.
- File moves done with `git mv` so history follows the files.
