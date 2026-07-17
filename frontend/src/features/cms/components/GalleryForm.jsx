import TranslationWorkflowFields from './TranslationWorkflowFields';
import GalleryItemEditor from './GalleryItemEditor';
import useCmsFormText from '../cmsFormText';

export function GalleryForm({
  form,
  sourceLanguage,
  onFieldChange,
  onLocalizedChange,
  onWorkflowChange,
  onSubmit,
  onAddItem,
  onRemoveItem,
  onItemChange,
  onItemCaptionChange
}) {
  const t = useCmsFormText();

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label>
        {t('gallerySlug')}
        <input
          value={form.slug}
          onChange={(event) => onFieldChange('slug', event.target.value)}
          onBlur={(event) => onFieldChange('slug', event.target.value)}
          placeholder="dept-convocation-2026"
          required
        />
      </label>

      <label>
        {t('titleEn')}
        <input
          value={form.title.en}
          onChange={(event) => onLocalizedChange('title', 'en', event.target.value)}
          required={sourceLanguage === 'en'}
        />
      </label>

      <label>
        {t('titleBn')}
        <input
          value={form.title.bn}
          onChange={(event) => onLocalizedChange('title', 'bn', event.target.value)}
          required={sourceLanguage === 'bn'}
        />
      </label>

      <label>
        {t('descriptionEn')}
        <textarea
          value={form.description.en}
          onChange={(event) => onLocalizedChange('description', 'en', event.target.value)}
        />
      </label>

      <label>
        {t('descriptionBn')}
        <textarea
          value={form.description.bn}
          onChange={(event) => onLocalizedChange('description', 'bn', event.target.value)}
        />
      </label>

      <label>
        {t('publishStatus')}
        <select
          value={form.status}
          onChange={(event) => onFieldChange('status', event.target.value)}
        >
          <option value="draft">{t('draft')}</option>
          <option value="published">{t('published')}</option>
        </select>
      </label>

      <TranslationWorkflowFields value={form.translationWorkflow} onChange={onWorkflowChange} />

      <div className="surface-card inner-card">
        <div className="section-head section-head-tight">
          <h4>{t('galleryMediaItems')}</h4>
          <button type="button" className="btn btn-ghost" onClick={onAddItem}>
            {t('addMedia')}
          </button>
        </div>

        <div className="stack-list">
          {form.items.map((item, index) => (
            <GalleryItemEditor
              key={`gallery-item-${index}`}
              index={index}
              item={item}
              onRemove={onRemoveItem}
              onChange={onItemChange}
              onCaptionChange={onItemCaptionChange}
            />
          ))}
        </div>
      </div>

      <button type="submit" className="btn btn-primary">
        {form.id ? t('updateGallery') : t('createGallery')}
      </button>
    </form>
  );
}

export default GalleryForm;
