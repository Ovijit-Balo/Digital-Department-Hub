# Teacher (Editor) Functionality Audit & Improvements (2026-07-17)

Every surface reachable by the **teacher portal** (the `editor` role) was audited
against what real-world editorial tools (WordPress, Ghost, Medium's writer
stats) provide. Follow-up to `docs/admin-improvements.md`.

| Area | Route | Verdict before |
| --- | --- | --- |
| Teacher Dashboard | `/admin/teacher` | Static draft counts, cards not clickable, **zero visibility into how content performs** |
| CMS Studio | `/admin/cms` | Feature-complete (see `docs/cms-studio.md`), but not deep-linkable — no way to link to "draft news" from a dashboard |
| Operations Dashboard | `/admin` | Editors allowed in; all fetches correctly role-gated (verified live — no 403 breakage) |
| Scholarship / Events / Contact desks | `/scholarship`, `/events`, `/contact` | Functional for editors (notice management, full event CRUD + check-in, inquiry handling) |
| Analytics module | *(backend only)* | **A dead feature**: view tracking + popular-content + summary endpoints existed with editor access, but no frontend code ever called them |

## Improvements implemented

### 1. Content Insights on the Teacher Dashboard (flagship)

Real editorial tools always answer "how is my content doing?". The backend
already tracked views on public content reads — the data was simply never
shown to anyone.

- **`api/modules/analyticsApi.js`** (new): `getSummary`, `getPopularContent`,
  `getEntityAnalytics` client methods.
- **Teacher Dashboard** gains two insight widgets:
  - **Content Views** — total views plus per-type bars (news / blogs /
    galleries / pages).
  - **Most Viewed Content** — top-5 list with a type switcher; each row shows
    the localized title (linked to the public page), publication status,
    signed-in viewer count, and total views.
- Analytics calls are treated as decoration: if they fail, the dashboard still
  loads (draft counts are never blocked by the insights).

### 2. Popular-content API now returns usable rows (backend)

`GET /analytics/popular/:entityType` returned bare ObjectIds
(`{entityId, viewCount}`) — meaningless to any UI. The service now joins each
row to its content document and returns `title`, `slug`, and `status`
alongside the counts. Views of since-deleted content are filtered out.

### 3. Analytics summary opened to editors (backend)

`GET /analytics/summary` (total views by content type) was admin-only while
the per-entity and popular endpoints already allowed editors. Content-view
totals are editorial data, so the summary now allows `admin` + `editor`.

### 4. View tracking made consistent (backend correctness fix)

The by-slug public reads tracked views but the **by-id** public reads
(`GET /cms/news/:id`, `GET /cms/galleries/:id`) did not — even though they
serve the same public detail pages (NewsDetailPage falls back to id lookup;
gallery links commonly use ids). Both now track views exactly like their slug
counterparts, so counts no longer depend on which URL form a visitor used.

### 5. CMS Studio is deep-linkable + dashboard cards are clickable

- **CMS Studio** reads and maintains `?section=…&status=…` URL parameters
  (`/admin/cms?section=news&status=draft` opens the news list filtered to
  drafts). Tab clicks and status-filter changes keep the URL in sync, and
  navigating to a new deep link while the studio is open is honoured.
- **Teacher Dashboard KPI cards** are now links, matching the admin
  dashboard: each draft card jumps straight into the CMS Studio list it
  counts, and the published-content cards open the corresponding public page.

## Not changed (deliberately)

- **No view de-duplication** — every public read counts as a view (a visitor
  refreshing five times = five views). Real analytics dedupe per
  session/day; left as a future improvement since the app has no session
  infrastructure and the counts are directional, not billing-grade.
- **Audit log stays admin/manager-only** — editors do not need the
  platform-wide audit stream; their own actions are still recorded in it.
- Pre-existing lint debt (2 unused imports in `analytics.service.js` are part
  of the known baseline) untouched.

## Verification

- Frontend build passes (`vite build`); backend suite **19/19 pass**.
- Changed files lint clean (only known-baseline issues remain).
- Live checks as `teacher@example.com`:
  - `/analytics/summary` → **200** for editor (was 403), returns
    `{totalViews, byType}`.
  - `/analytics/popular/blog` → rows now carry `title`/`slug`/`status`.
  - By-id news read → view count incremented (`before=0 after=1`).
  - All editor desk endpoints (manage news/galleries, scholarship notices,
    events, notifications) return 200; admin-only endpoints correctly 403.
