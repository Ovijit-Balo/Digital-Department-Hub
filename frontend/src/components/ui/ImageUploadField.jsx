import { useRef, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import uploadImage from '../../utils/uploadImage';

/**
 * Reusable media field: paste a URL or upload a file from the computer.
 * On upload it signs + pushes to Cloudinary, falling back to an inline data
 * URL when no media provider is configured. Returns the resulting URL via
 * `onChange`.
 */
function ImageUploadField({
  label = 'Image',
  value = '',
  onChange,
  folder = 'digital-department-hub/cms',
  accept = 'image/*',
  resourceType = 'image',
  placeholder = 'https://... or upload a file'
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const { success, error: toastError } = useToast();

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    try {
      const { url, provider } = await uploadImage(file, { folder, resourceType });
      onChange(url);
      success(
        provider === 'cloudinary'
          ? 'Image uploaded.'
          : 'Image embedded (no media provider configured).'
      );
    } catch (uploadError) {
      toastError(uploadError.message || 'Failed to upload image.');
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div className="image-field">
      <span className="image-field__label">{label}</span>

      {value ? (
        <div className="image-field__preview">
          <img src={value} alt={label} />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onChange('')}
          >
            Remove
          </button>
        </div>
      ) : null}

      <div className="image-field__controls">
        <input
          type="url"
          value={value.startsWith('data:') ? '' : value}
          placeholder={value.startsWith('data:') ? 'Embedded image in use' : placeholder}
          disabled={value.startsWith('data:')}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          onChange={handleFile}
        />
      </div>
    </div>
  );
}

export default ImageUploadField;
