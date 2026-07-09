import RichTextEditor from '../../../components/ui/RichTextEditor';
import TranslationWorkflowFields from './TranslationWorkflowFields';

export function NewsForm({
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
        Post Type
        <select
          value={form.category}
          onChange={(event) => onFieldChange('category', event.target.value)}
        >
          <option value="news">News</option>
          <option value="announcement">Announcement</option>
        </select>
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
        Summary (EN)
        <textarea
          value={form.summary.en}
          onChange={(event) => onLocalizedChange('summary', 'en', event.target.value)}
          required={sourceLanguage === 'en'}
        />
      </label>

      <label>
        Summary (BN)
        <textarea
          value={form.summary.bn}
          onChange={(event) => onLocalizedChange('summary', 'bn', event.target.value)}
          required={sourceLanguage === 'bn'}
        />
      </label>

      <label>
        Body (EN)
        <RichTextEditor
          value={form.body.en}
          onChange={(value) => onLocalizedChange('body', 'en', value)}
          placeholder="Write detailed news body in English"
        />
      </label>

      <label>
        Body (BN)
        <RichTextEditor
          value={form.body.bn}
          onChange={(value) => onLocalizedChange('body', 'bn', value)}
          placeholder="Write detailed news body in Bangla"
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
        {form.id ? 'Update Item' : 'Create Item'}
      </button>
    </form>
  );
}

export default NewsForm;
