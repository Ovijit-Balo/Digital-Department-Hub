export function GalleryItemEditor({ index, item, onRemove, onChange, onCaptionChange }) {
  return (
    <article className="surface-card inner-card">
      <div className="section-head section-head-tight">
        <h4>Item {index + 1}</h4>
        <button type="button" className="btn btn-ghost" onClick={() => onRemove(index)}>
          Remove
        </button>
      </div>

      <div className="form-grid">
        <label>
          Media Type
          <select
            value={item.mediaType}
            onChange={(event) => onChange(index, 'mediaType', event.target.value)}
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
        </label>

        <label>
          Media URL
          <input
            value={item.mediaUrl}
            onChange={(event) => onChange(index, 'mediaUrl', event.target.value)}
            placeholder="https://..."
            required
          />
        </label>

        <label>
          Thumbnail URL (optional)
          <input
            value={item.thumbnailUrl}
            onChange={(event) => onChange(index, 'thumbnailUrl', event.target.value)}
            placeholder="https://..."
          />
        </label>

        <label>
          Caption (EN)
          <input
            value={item.caption?.en || ''}
            onChange={(event) => onCaptionChange(index, 'en', event.target.value)}
          />
        </label>

        <label>
          Caption (BN)
          <input
            value={item.caption?.bn || ''}
            onChange={(event) => onCaptionChange(index, 'bn', event.target.value)}
          />
        </label>

        <label>
          Order
          <input
            type="number"
            min="0"
            value={item.order}
            onChange={(event) => onChange(index, 'order', Number(event.target.value))}
          />
        </label>
      </div>
    </article>
  );
}

export default GalleryItemEditor;
