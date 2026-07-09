# Homepage images

Drop image files here and they are served at `/images/<filename>`.

## Feature cards (homepage "Frequently used services")

Add these three files to show real photos instead of the gradient placeholders:

| File name                     | Card        |
| ----------------------------- | ----------- |
| `feature-scholarship.jpg`     | Scholarships |
| `feature-event.jpg`           | Events       |
| `feature-venue.jpg`           | Facilities   |

Recommended: landscape photos, ~800×450px (16:9-ish), JPG or WebP, under ~200 KB each.

If a file is missing or fails to load, the card automatically falls back to its
cardinal gradient — so the page never looks broken.

To change which files the cards use, edit `featureCards` in
`src/pages/public/HomePage.jsx`.

## News cards (homepage "Latest News")

Each news post shows its own **cover image** from the CMS when one is set
(recommended — different photo per article). For posts without a cover image,
add this file to show a default photo instead of the gradient:

| File name           | Used for                          |
| ------------------- | --------------------------------- |
| `news-default.jpg`  | Any news post with no cover image |

Recommended: landscape ~800×450px (16:9), JPG or WebP, under ~200 KB.
