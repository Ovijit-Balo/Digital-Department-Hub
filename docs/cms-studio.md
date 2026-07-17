# CMS Studio — Content Management (Admin / Editor)

The CMS Studio (`/admin/cms`, roles **admin** + **editor**) manages four content
types — **Pages**, **News & Announcements**, **Blogs**, **Galleries** — with a
full authoring lifecycle. Students and other roles can only *read* published
content.

## Capabilities

| Capability | Notes |
| --- | --- |
| Create / Edit | Bilingual (EN/BN) with translation-workflow tracking + rich-text body |
| **Delete** | Per-item, guarded by a confirmation dialog (`ConfirmDialog`) |
| **Publish / Unpublish** | One-click status toggle directly from the list |
| **Preview** | Renders title, cover, lead and sanitised body in a modal before publishing |
| **Search** | Full-text search per section (debounced, server-side `$text`) |
| **Status filter** | All / Draft / Published |
| **Pagination** | 10 items per page, server-driven (`page`/`limit`/`total`) |
| **Image upload** | Cover images + gallery media, file upload or URL |
| **SEO metadata** | Optional meta title + meta description (EN/BN) per page/news/blog |
| **Scheduled publishing** | Publish now, or set a future go-live time |
| Edit-mode banner | Shows "Editing: <title>" with a Cancel-edit button |
| Toasts | Success/error feedback auto-dismisses (via `ToastContext`) |

## Image upload

`components/ui/ImageUploadField.jsx` + `utils/uploadImage.js`:

1. Requests a signed upload from `POST /cms/uploads/signature`.
2. Uploads the file directly to Cloudinary and stores the returned `secure_url`.
3. **Fallback:** if no media provider is configured (or the upload fails), small
   files (≤ 2 MB) are embedded inline as a `data:` URL so authoring still works
   in demo environments. Larger files prompt the user to paste a URL instead.

To enable real cloud uploads set `STORAGE_PROVIDER=cloudinary` plus
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in the
backend `.env`.

## Scheduled publishing (no cron required)

- Authors set `scheduledAt` and mark the item **Published**.
- `publishedAt` is set to `scheduledAt`.
- Public reads (`listPublic*`, `getBySlug`, `getPublicNewsPostById`) apply a
  **live-visibility gate** (`liveScheduleClause` in `cms.service.js`): an item is
  only returned when it is published **and** (`scheduledAt` is empty or already
  in the past). No background job is needed — the query does the gating.
- Admins/editors still see scheduled items in the Studio (the gate is only
  applied to public endpoints via `onlyLive: true`).

Scheduling + SEO apply to **pages, news, blogs**. Galleries support upload,
delete, publish toggle, preview, search, filter and pagination (no SEO/schedule).

## SEO metadata

Stored under `seo.metaTitle` / `seo.metaDescription` (bilingual). Public detail
pages (`DynamicPageView`, `BlogDetailPage`, `NewsDetailPage`) resolve the page
`<title>` and `<meta name="description">` via `utils/seo.js#resolveSeoMeta`,
preferring the author overrides and falling back to the item's own
title/summary/body.

## Reusable pieces added

- `components/ui/ImageUploadField.jsx` — media field (upload or URL) for any form.
- `components/ui/ConfirmDialog.jsx` — confirmation modal built on the shared `Modal`.
- `utils/uploadImage.js` — signed-upload helper with inline fallback.
- `utils/seo.js` — SEO meta resolver.
- `features/cms/components/SeoScheduleFields.jsx` — collapsible SEO + schedule fields.

## Backend surface

Models `page/newsPost/blogPost` gained `seo` + `scheduledAt`. Validation accepts
`seo`, `scheduledAt`, and `data:`-scheme cover images. Delete + bulk endpoints
already existed; the controller now imports the models it references in the bulk
handlers (fixes a latent `ReferenceError`).
