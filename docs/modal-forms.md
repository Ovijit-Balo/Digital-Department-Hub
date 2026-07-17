# Reusable Modal & Modal-Form Structure

A single, shared modal shell so every pop-up **form submission** across the app
looks and behaves the same. Use this instead of hand-rolling `modal-overlay` /
`modal-content` markup per page.

## Component

`src/components/ui/Modal.jsx`

```jsx
import Modal from '../../components/ui/Modal';

<Modal isOpen={open} onClose={() => setOpen(false)} title="Apply for Scholarship" size="md">
  {/* your form here */}
</Modal>
```

Props: `isOpen`, `onClose`, `title`, `size` (`sm` | `md` | `lg`, default `md`),
`children`.

The shell provides, for free:
- Backdrop + centered card, **above the sticky headers** (`z-index: 1000`).
- Header with the title and a working **×** close button.
- **Escape-to-close**, **backdrop-click-to-close**, and **body scroll lock**.
- A scrollable `.modal-body` wrapper around your content.

## Form layout inside a modal

Use `className="modal-form form-grid"` on the `<form>`. This forces a clean
**single-column** layout even on desk pages (whose `.form-grid` is multi-column).
Helpers:

- `.modal-form__lead` — a muted context line under the title (e.g. the notice name).
- `.modal-form__row` — a two-up row for short fields (collapses to one column on
  narrow screens). e.g. GPA + Department.
- `.modal-form__actions` — the right-aligned button bar (Cancel + Submit) with a
  top divider. Keep it **inside** the `<form>` so the submit button works.

### Template

```jsx
<Modal isOpen={open} onClose={close} title="Title">
  <form className="modal-form form-grid" onSubmit={handleSubmit}>
    <p className="modal-form__lead">Context line</p>

    <label>
      Statement
      <textarea rows={6} value={v} onChange={…} required />
    </label>

    <div className="modal-form__row">
      <label>GPA<input … /></label>
      <label>Department<input … /></label>
    </div>

    <div className="modal-form__actions">
      <button type="button" className="btn btn-ghost" onClick={close}>Cancel</button>
      <button type="submit" className="btn btn-primary">Submit</button>
    </div>
  </form>
</Modal>
```

## Already using it
- **Scholarship application** — "Apply Now" opens this modal
  (`src/pages/public/ScholarshipPage.jsx`).
- **Scholarship review** — the reviewer's decision modal
  (`src/features/scholarship/components/ReviewModal.jsx`).

## Candidates to convert next
Any page with an inline submission form can adopt the same structure: **event
registration** (EventsPage), **venue booking** (BookingPage), **contact**
(ContactPage), and the CMS/notice **create/edit** forms. Wrap the existing form
in `<Modal>` and swap its container class to `modal-form form-grid`.

## Styling
All rules live in `src/styles/refinements.css` (modal shell + `.modal-form*`).
`.modal-content--sm/lg` change the width; `md` is the 560px default.
