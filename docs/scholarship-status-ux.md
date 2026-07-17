# Scholarship Notice — Status Clarity & Apply UX

Fixes the confusing case where a notice showed a green **OPEN** badge while it
was actually **closed** (deadline passed), so students couldn't submit and had
no idea why.

---

## The root ambiguity

A notice has **two** notions of "open":

| Concept | Source | Meaning |
|---------|--------|---------|
| `status` | admin toggle (`draft`/`open`/`closed`) | "an admin marked it open" |
| `applicationState` (**live state**) | computed from the window dates | "applications are actually accepted right now" |

The **live state** is the real gate for applying. If the window/decision date is
in the past, the live state is `closed` **even when `status` is `open`** — which
is exactly what happened with the demo notices (May 2026 dates, now in the past).

Previously the UI showed the raw `status` in the badge but enforced the live
state on submit, so the badge and behaviour disagreed.

---

## What changed (single source of truth = live state)

**Applicant-facing**
- The notice **badge now shows the live state** (`Open` / `Closed` / `Scheduled`
  / `Draft`), so a passed-deadline notice reads **Closed** everywhere.
- **"Apply Now" opens the application in a modal dialog** (centered popup) instead
  of scrolling to an inline form at the bottom of the page. The modal closes on
  cancel, on backdrop click, and automatically on a successful submit.
- The **apply form is guarded**: when a notice isn't accepting applications, a
  clear inline message explains why ("window closed", "opens on <date>",
  "still a draft") and the **Submit / Apply Now buttons are disabled**.
- Window/decision dates render `—` when unset instead of a blank `to`.

**Admin-facing**
- When a notice is toggled `open` but the live state is `closed`/`scheduled`, an
  **inline warning** appears explaining the mismatch and how to fix it.
- **"Open Window" now actually opens it**: if the window/deadline has passed, it
  extends the window (30 days from now) and marks the notice open, after a
  confirm dialog — instead of a status flip that left the live state `closed`.

**Shared UX**
- The previously **unstyled `InlineAlert`** component now has proper info /
  warning / error / success styling (colored left border + tint), improving
  every alert across the app.
- Added the missing `status-scheduled` badge style.

---

## Files changed

- **`src/pages/public/ScholarshipPage.jsx`** — live-state badge + labels
  (`STATE_META`, `stateLabel`, `stateBadgeClass`), `openApplicationWindow()`
  (reopen + extend), admin mismatch warnings, guarded/disabled apply form,
  `applyBlockedMessage()` helper.
- **`src/styles/pages/discovery.css`** — `.inline-alert` variants +
  `.status-scheduled`.

No backend changes — the backend already computed `applicationState` correctly;
this aligns the UI with it and makes the admin action match its label.

---

## How to verify
1. As admin, open a notice whose deadline has passed → badge reads **Closed**,
   with a warning that it's toggled open but the window ended.
2. Click **Open Window** → confirm the extension → badge flips to **Open**.
3. As a student, the apply form is now enabled and submits successfully.
