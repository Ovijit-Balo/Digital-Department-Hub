import RichTextEditor from '../../../components/ui/RichTextEditor';
import ImageUploadField from '../../../components/ui/ImageUploadField';
import TranslationWorkflowFields from './TranslationWorkflowFields';
import SeoScheduleFields from './SeoScheduleFields';
import useCmsFormText from '../cmsFormText';

export function BlogForm({
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
        {t('blogSlug')}
        <input
          value={form.slug}
          onChange={(event) => onFieldChange('slug', event.target.value)}
          onBlur={(event) => onFieldChange('slug', event.target.value)}
          placeholder="student-research-highlights"
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
        {t('excerptEn')}
        <textarea
          value={form.excerpt.en}
          onChange={(event) => onLocalizedChange('excerpt', 'en', event.target.value)}
          required={sourceLanguage === 'en'}
        />
      </label>

      <label>
        {t('excerptBn')}
        <textarea
          value={form.excerpt.bn}
          onChange={(event) => onLocalizedChange('excerpt', 'bn', event.target.value)}
          required={sourceLanguage === 'bn'}
        />
      </label>

      <label>
        {t('bodyEn')}
        <RichTextEditor
          value={form.body.en}
          onChange={(value) => onLocalizedChange('body', 'en', value)}
          placeholder={t('writeBlogEn')}
        />
      </label>

      <label>
        {t('bodyBn')}
        <RichTextEditor
          value={form.body.bn}
          onChange={(value) => onLocalizedChange('body', 'bn', value)}
          placeholder={t('writeBlogBn')}
        />
      </label>

      <ImageUploadField
        label={t('coverImage')}
        value={form.coverImageUrl}
        onChange={(url) => onFieldChange('coverImageUrl', url)}
        folder="digital-department-hub/blog"
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
        {form.id ? t('updateBlog') : t('createBlog')}
      </button>
    </form>
  );
}

export default BlogForm;
