import RichTextEditor from '../../../components/ui/RichTextEditor';
import ImageUploadField from '../../../components/ui/ImageUploadField';
import TranslationWorkflowFields from './TranslationWorkflowFields';
import SeoScheduleFields from './SeoScheduleFields';
import useCmsFormText from '../cmsFormText';

export function NewsForm({
  form,
  sourceLanguage,
  onFieldChange,
  onLocalizedChange,
  onWorkflowChange,
  onSeoChange,
  onSubmit
}) {
  const t = useCmsFormText();

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label>
        {t('postType')}
        <select
          value={form.category}
          onChange={(event) => onFieldChange('category', event.target.value)}
        >
          <option value="news">{t('news')}</option>
          <option value="announcement">{t('announcement')}</option>
        </select>
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
        {t('summaryEn')}
        <textarea
          value={form.summary.en}
          onChange={(event) => onLocalizedChange('summary', 'en', event.target.value)}
          required={sourceLanguage === 'en'}
        />
      </label>

      <label>
        {t('summaryBn')}
        <textarea
          value={form.summary.bn}
          onChange={(event) => onLocalizedChange('summary', 'bn', event.target.value)}
          required={sourceLanguage === 'bn'}
        />
      </label>

      <label>
        {t('bodyEn')}
        <RichTextEditor
          value={form.body.en}
          onChange={(value) => onLocalizedChange('body', 'en', value)}
          placeholder={t('writeNewsEn')}
        />
      </label>

      <label>
        {t('bodyBn')}
        <RichTextEditor
          value={form.body.bn}
          onChange={(value) => onLocalizedChange('body', 'bn', value)}
          placeholder={t('writeNewsBn')}
        />
      </label>

      <ImageUploadField
        label={t('coverImage')}
        value={form.coverImageUrl}
        onChange={(url) => onFieldChange('coverImageUrl', url)}
        folder="digital-department-hub/news"
      />

      <label>
        {t('tags')}
        <input
          value={form.tagsInput}
          onChange={(event) => onFieldChange('tagsInput', event.target.value)}
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

      <SeoScheduleFields
        seo={form.seo}
        scheduledAt={form.scheduledAt}
        onSeoChange={onSeoChange}
        onFieldChange={onFieldChange}
      />

      <button type="submit" className="btn btn-primary">
        {form.id ? t('updateItem') : t('createItem')}
      </button>
    </form>
  );
}

export default NewsForm;
