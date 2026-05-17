import TranslationWorkflowFields from './TranslationWorkflowFields';
import GalleryItemEditor from './GalleryItemEditor';

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
  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label>
        Gallery Slug
        <input
          value={form.slug}
          onChange={(event) => onFieldChange('slug', event.target.value)}
          onBlur={(event) => onFieldChange('slug', event.target.value)}
          placeholder="dept-convocation-2026"
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
        Description (EN)
        <textarea
          value={form.description.en}
          onChange={(event) => onLocalizedChange('description', 'en', event.target.value)}
        />
      </label>

      <label>
        Description (BN)
        <textarea
          value={form.description.bn}
          onChange={(event) => onLocalizedChange('description', 'bn', event.target.value)}
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

      <div className="surface-card inner-card">
        <div className="section-head section-head-tight">
          <h4>Gallery Media Items</h4>
          <button type="button" className="btn btn-ghost" onClick={onAddItem}>
            Add Media
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
        {form.id ? 'Update Gallery' : 'Create Gallery'}
      </button>
    </form>
  );
}

export default GalleryForm;
