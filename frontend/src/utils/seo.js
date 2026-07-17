import { toLocalizedText } from './localized';

function stripHtml(html) {
  return (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Derives page <title> / meta description for a CMS entity, preferring the
 * author-provided SEO overrides and falling back to the item's own content.
 */
export function resolveSeoMeta(item, { language = 'en', bodyField = 'body' } = {}) {
  if (!item) {
    return {};
  }

  const metaTitle = toLocalizedText(item.seo?.metaTitle, language);
  const title = metaTitle || toLocalizedText(item.title, language);

  const metaDescription = toLocalizedText(item.seo?.metaDescription, language);
  const fallbackDescription =
    toLocalizedText(item.summary || item.excerpt, language) ||
    stripHtml(toLocalizedText(item[bodyField], language)).slice(0, 160);
  const description = metaDescription || fallbackDescription;

  return {
    title: title || undefined,
    description: description || undefined
  };
}

export default resolveSeoMeta;
