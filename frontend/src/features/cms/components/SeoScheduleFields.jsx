import useCmsFormText from '../cmsFormText';

const emptySeo = { metaTitle: { en: '', bn: '' }, metaDescription: { en: '', bn: '' } };

/**
 * Optional SEO metadata + scheduled-publishing controls shared by the
 * page/news/blog authoring forms. Collapsed by default to keep the form tidy.
 */
export function SeoScheduleFields({ seo = emptySeo, scheduledAt = '', onSeoChange, onFieldChange }) {
  const t = useCmsFormText();
  const metaTitle = seo.metaTitle || { en: '', bn: '' };
  const metaDescription = seo.metaDescription || { en: '', bn: '' };

  return (
    <details className="cms-advanced">
      <summary>{t('seoSchedule')}</summary>

      <div className="form-grid">
        <label>
          {t('metaTitleEn')}
          <input
            value={metaTitle.en}
            maxLength={70}
            onChange={(event) => onSeoChange('metaTitle', 'en', event.target.value)}
            placeholder={t('metaTitlePlaceholder')}
          />
        </label>
        <label>
          {t('metaTitleBn')}
          <input
            value={metaTitle.bn}
            maxLength={70}
            onChange={(event) => onSeoChange('metaTitle', 'bn', event.target.value)}
          />
        </label>

        <label>
          {t('metaDescEn')}
          <textarea
            value={metaDescription.en}
            maxLength={180}
            onChange={(event) => onSeoChange('metaDescription', 'en', event.target.value)}
            placeholder={t('metaDescPlaceholder')}
          />
        </label>
        <label>
          {t('metaDescBn')}
          <textarea
            value={metaDescription.bn}
            maxLength={180}
            onChange={(event) => onSeoChange('metaDescription', 'bn', event.target.value)}
          />
        </label>

        <label>
          {t('scheduleAt')}
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => onFieldChange('scheduledAt', event.target.value)}
          />
          <span className="meta">{t('scheduleHint')}</span>
        </label>
      </div>
    </details>
  );
}

export default SeoScheduleFields;
