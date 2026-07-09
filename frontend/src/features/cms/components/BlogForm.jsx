import RichTextEditor from '../../../components/ui/RichTextEditor';
import TranslationWorkflowFields from './TranslationWorkflowFields';

export function BlogForm({
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
        Blog Slug
        <input
          value={form.slug}
          onChange={(event) => onFieldChange('slug', event.target.value)}
          onBlur={(event) => onFieldChange('slug', event.target.value)}
          placeholder="student-research-highlights"
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
        Excerpt (EN)
        <textarea
          value={form.excerpt.en}
          onChange={(event) => onLocalizedChange('excerpt', 'en', event.target.value)}
          required={sourceLanguage === 'en'}
        />
      </label>

      <label>
        Excerpt (BN)
        <textarea
          value={form.excerpt.bn}
          onChange={(event) => onLocalizedChange('excerpt', 'bn', event.target.value)}
          required={sourceLanguage === 'bn'}
        />
      </label>

      <label>
        Body (EN)
        <RichTextEditor
          value={form.body.en}
          onChange={(value) => onLocalizedChange('body', 'en', value)}
          placeholder="Write blog body in English"
        />
      </label>

      <label>
        Body (BN)
        <RichTextEditor
          value={form.body.bn}
          onChange={(value) => onLocalizedChange('body', 'bn', value)}
          placeholder="Write blog body in Bangla"
        />
      </label>

      <label>
        Cover Image URL (optional)
        <input
          value={form.coverImageUrl}
          onChange={(event) => onFieldChange('coverImageUrl', event.target.value)}
        />
      </label>

      <label>
        Tags (comma separated)
        <input
          value={form.tagsInput}
          onChange={(event) => onFieldChange('tagsInput', event.target.value)}
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
        {form.id ? 'Update Blog' : 'Create Blog'}
      </button>
    </form>
  );
}

export default BlogForm;
