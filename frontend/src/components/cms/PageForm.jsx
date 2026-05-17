import RichTextEditor from '../common/RichTextEditor';
import TranslationWorkflowFields from './TranslationWorkflowFields';

export function PageForm({
  form,
  sourceLanguage,
  onFieldChange,
  onLocalizedChange,
  onWorkflowChange,
  onSubmit
}) {
  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label>
        Page Slug
        <input
          value={form.slug}
          onChange={(event) => onFieldChange('slug', event.target.value)}
          onBlur={(event) => onFieldChange('slug', event.target.value)}
          placeholder="about-department"
          required
        />
      </label>

      <label>
        Title (EN)
        <input
          value={form.title.en}
          onChange={(event) => onLocalizedChange('title', 'en', event.target.value)}
          required={sourceLanguage === 'en'}
        />
      </label>

      <label>
        Title (BN)
        <input
          value={form.title.bn}
          onChange={(event) => onLocalizedChange('title', 'bn', event.target.value)}
          required={sourceLanguage === 'bn'}
        />
      </label>

      <label>
        Content (EN)
        <RichTextEditor
          value={form.content.en}
          onChange={(value) => onLocalizedChange('content', 'en', value)}
          placeholder="Write page content in English"
        />
      </label>

      <label>
        Content (BN)
        <RichTextEditor
          value={form.content.bn}
          onChange={(value) => onLocalizedChange('content', 'bn', value)}
          placeholder="Write page content in Bangla"
        />
      </label>

      <label>
        Publish Status
        <select
          value={form.status}
          onChange={(event) => onFieldChange('status', event.target.value)}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </label>

      <TranslationWorkflowFields value={form.translationWorkflow} onChange={onWorkflowChange} />

      <button type="submit" className="btn btn-primary">
        {form.id ? 'Update Page' : 'Create Page'}
      </button>
    </form>
  );
}

export default PageForm;
