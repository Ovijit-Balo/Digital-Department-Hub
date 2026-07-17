# Global Search

A single search box (in the site header) that queries **published content
across the whole hub** — news, blogs, pages, scholarships, and events — and
returns grouped, relevance-ranked results on a dedicated `/search` page.

---

## How it works

The backend runs one query per content type in parallel:

- **News, Blogs, Pages, Scholarship notices** use each collection's existing
  **Mongo text index** (`$text` search) with relevance scoring
  (`{ $meta: 'textScore' }`).
- **Events** use a case-insensitive regex (the event schema stores plain
  strings, not localized text, so it has no text index).

Only publicly visible records are searched (news/blog/page `status:
'published'`, scholarships `open`/`closed`, events `published`).

| Item | Value |
|------|-------|
| Endpoint | `GET /api/v1/search` |
| Auth | Public |
| Query | `q` (required, 2–100 chars), `limit` (per type, default 6, max 20) |
| Response | `{ query, total, counts, results[] }` |

Each result: `{ type, id, title, snippet, url, date }`, where `url` points at
the existing detail/list route (e.g. `/news/:id`, `/blogs/:slug`, `/pages/:slug`,
`/scholarship`, `/events`).

---

## How to use it

- **Header box:** type a term and press Enter / the ⌕ button → navigates to
  `/search?q=<term>`. (Hidden below 900px to keep the mobile header clean.)
- **Search page:** `/search` has its own input and reads `?q=` from the URL, so
  results are shareable/bookmarkable. Results are grouped with a type badge,
  snippet, and date; each links straight to the item.

### With curl
```bash
curl "http://localhost:5000/api/v1/search?q=scholarship&limit=5"
```

---

## Files changed / added

### Backend (`src/modules/search/`, new module)
- **`search.service.js`** — `searchAll({ q, limit })`; text search + event regex,
  localized-field handling, snippet builder.
- **`search.controller.js`**, **`search.validation.js`**, **`search.routes.js`**.
- **`src/routes/routeModules.js`** — mounts the module at `/search`.

> No schema changes were required — every searched collection already declared
> a text index (`title`/`body`/`content`/`description`).

### Frontend
- **`src/api/modules/searchApi.js`** *(new)* + exported from `api/modules/index.js`
  and `api/modules.js`.
- **`src/pages/public/SearchPage.jsx`** *(new)* — the `/search` results page.
- **`src/routes/AppRouter.jsx`** — public `/search` route.
- **`src/components/layout/SiteHeader.jsx`** — header search form + submit handler.
- **`src/styles/pages/discovery.css`** *(new)* — header box + results styling
  (theme-aware, imported from `styles/index.css`).

---

## Notes
- Text indexes are created automatically by Mongoose on model init in
  development. On a fresh production database, confirm the indexes exist
  (they build on first connect unless `autoIndex` is disabled).
- Ranking is per-type; results are concatenated in type order (news → blog →
  page → scholarship → event). A future enhancement could merge by `textScore`.
