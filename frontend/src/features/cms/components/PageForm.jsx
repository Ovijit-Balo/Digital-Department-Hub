import RichTextEditor from '../../../components/ui/RichTextEditor';
import TranslationWorkflowFields from './TranslationWorkflowFields';
import SeoScheduleFields from './SeoScheduleFields';
import useCmsFormText from '../cmsFormText';

export function PageForm({
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
        {t('pageSlug')}
        <input
          value={form.slug}
          onChange={(event) => onFieldChange('slug', event.target.value)}
          onBlur={(event) => onFieldChange('slug', event.target.value)}
          placeholder="about-department"
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
        {t('contentEn')}
        <RichTextEditor
          value={form.content.en}
          onChange={(value) => onLocalizedChange('content', 'en', value)}
          placeholder={t('writeContentEn')}
        />
      </label>

      <label>
        {t('contentBn')}
        <RichTextEditor
          value={form.content.bn}
          onChange={(value) => onLocalizedChange('content', 'bn', value)}
          placeholder={t('writeContentBn')}
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
        {form.id ? t('updatePage') : t('createPage')}
      </button>
    </form>
  );
}

export default PageForm;
