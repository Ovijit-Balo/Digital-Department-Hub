# Navigation Bar Redesign (2026-07-17)

The public site header's right-hand cluster had five full-width controls sitting
side by side — a always-open search box, a text **Dark mode** button, a labelled
**Language** select, **Register**, and **Sign In** (or, when signed in, a
Workspace button + identity chip + Sign Out). It read as a crowded, unbalanced
strip and pushed the primary nav. Reworked into the pattern modern app headers
use: compact icon utilities + a single account dropdown.

## What changed

### Utilities collapsed to icons (`nav-utilities` group)

- **Search** is now an icon button that expands the input inline on click
  (`nav-search--open`), focuses it, and collapses again on blur when empty.
  Submitting still routes to `/search?q=`. Escape closes it.
- **Theme toggle** is an icon-only round button (sun / moon SVG) instead of the
  full-text "Dark mode" / "Light mode" label. `title` + `aria-label` carry the
  meaning.
- **Language** shows just `EN` / `বাং` as a compact pill; the "Language" label is
  screen-reader-only (`sr-only`).

### Account controls → one avatar dropdown (`user-menu`)

Signed-in users previously saw three separate elements (Workspace button,
identity chip, Sign Out). These now collapse behind a single trigger showing an
**initials avatar + name + caret**. Opening it reveals a menu:

- name + role header
- **Workspace** link (public header only — jumps to the role's workspace)
- **My Profile**
- divider
- **Sign Out** (danger styling)

Closes on outside click, Escape, route change, or selecting an item. Guests are
unchanged — they still see plain **Register** + **Sign In** buttons, which is the
correct low-friction call to action for a first visit.

## Applied to both headers

The same `user-menu` dropdown, icon theme toggle, and compact language pill were
applied to the **workspace top bar** (`WorkspaceLayout`) so the signed-in
experience is visually consistent with the public site. The workspace menu omits
the Workspace link (you're already in it) and keeps the **View public site**
button outside the dropdown.

## Files

- `components/layout/SiteHeader.jsx` — collapsible search, icon theme toggle,
  compact language pill, `user-menu` dropdown (initials via `userInitials`
  memo), outside-click / Escape / blur handling.
- `components/layout/WorkspaceLayout.jsx` — same dropdown + icon utilities.
- `styles/pages/discovery.css` — `.nav-search` now collapsed-by-default, expands
  on `.nav-search--open` (width/opacity transition).
- `styles/pages/desk.css` — new `.nav-utilities`, `.theme-toggle--icon`,
  `.lang-switch--compact`, and the full `.user-menu*` dropdown styles
  (avatar, caret rotation, panel, danger item, dark-mode variants, mobile
  left-align). Replaced the old `.account-actions` divider block.

## Cardinal frame (follow-up)

Both headers now carry a **red (`--primary`) 2px hairline on the top and bottom
edge**, framing the bar as a single cardinal band. The separate 4px app-shell
"masthead" line above the nav was removed so the two don't stack into a chunky
6px block. The public header's `.top-nav--public` (which previously forced a
transparent/grey bottom border) and the dark-mode override in `layout.css`
(which forced `border-color` to grey) are both re-pointed at the red so the
frame holds in every state — resting, scrolled, light, and dark. The workspace
top bar (`.workspace-topbar`) gets the same red top/bottom frame for
consistency.

## Modern polish pass (follow-up)

A cohesion layer added in `refinements.css` so the whole bar reads as one flat,
contemporary system rather than a mix of styles:

- **Flat dropdown triggers** — the *News & Media* / *Services* triggers were
  heavy gradient pills sitting next to flat text links. They're now flat like
  the links, with the **same animated cardinal underline** and a **chevron that
  rotates up** when the panel opens. Text + chevron take the cardinal tint on
  hover / open / active.
- **Unified ghost utilities** — search (collapsed), theme, and language are now
  a consistent set of circular ghost controls (transparent, hairline border);
  the collapsed search is a ghost circle instead of a solid red dot (red only
  returns when it expands into the submit button). All lift 1px and tint red on
  hover, and share one cardinal `:focus-visible` ring.
- **Condense on scroll** — the bar's vertical padding eases down
  (`1rem → 0.62rem`) once the page scrolls, the modern "shrinking header" feel,
  on top of the existing frost + shadow transition.
- **Primary CTA presence** — the header **Sign In** button gets a soft cardinal
  glow and a 1px hover lift so it stands out as the main action.
- **Softer dropdown panel** — larger radius + deeper, softer shadow.

All of this is re-asserted for dark mode (layout/components CSS otherwise force
opaque fills + grey borders on these elements in dark theme).

## Verification

- Both components lint clean (`eslint` → no warnings).
- `vite build` passes.
- Accessibility: dropdown trigger is a real `<button>` with `aria-haspopup` /
  `aria-expanded`; panel has `role="menu"` + `tabIndex={-1}`; divider is a
  native `<hr>`; every control keeps an `aria-label` / `title`.
