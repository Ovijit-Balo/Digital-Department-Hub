import ImageUploadField from '../../../components/ui/ImageUploadField';
import useCmsFormText from '../cmsFormText';

export function GalleryItemEditor({ index, item, onRemove, onChange, onCaptionChange }) {
  const t = useCmsFormText();

  return (
    <article className="surface-card inner-card">
      <div className="section-head section-head-tight">
        <h4>
          {t('itemPrefix')} {index + 1}
        </h4>
        <button type="button" className="btn btn-ghost" onClick={() => onRemove(index)}>
          {t('remove')}
        </button>
      </div>

      <div className="form-grid">
        <label>
          {t('mediaType')}
          <select
            value={item.mediaType}
            onChange={(event) => onChange(index, 'mediaType', event.target.value)}
          >
            <option value="image">{t('image')}</option>
            <option value="video">{t('video')}</option>
          </select>
        </label>

        <ImageUploadField
          label={t('mediaUploadLabel')}
          value={item.mediaUrl}
          onChange={(url) => onChange(index, 'mediaUrl', url)}
          folder="digital-department-hub/gallery"
          accept={item.mediaType === 'video' ? 'video/*' : 'image/*'}
          resourceType={item.mediaType === 'video' ? 'video' : 'image'}
        />

        <label>
          {t('thumbnailUrl')}
          <input
            value={item.thumbnailUrl}
            onChange={(event) => onChange(index, 'thumbnailUrl', event.target.value)}
            placeholder="https://..."
          />
        </label>

        <label>
          {t('captionEn')}
          <input
            value={item.caption?.en || ''}
            onChange={(event) => onCaptionChange(index, 'en', event.target.value)}
          />
        </label>

        <label>
          {t('captionBn')}
          <input
            value={item.caption?.bn || ''}
            onChange={(event) => onCaptionChange(index, 'bn', event.target.value)}
          />
        </label>

        <label>
          {t('order')}
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
