import 'react-quill/dist/quill.snow.css';
import ReactQuill, { Quill } from 'react-quill';
import { useState, useCallback } from 'react';
import { cmsApi } from '../../api/modules';
import { useToast } from '../../context/ToastContext';
import useLanguage from '../../hooks/useLanguage';
import { toLocalizedText } from '../../utils/localized';

const T = {
  uploadFailed: {
    en: 'Failed to upload image. Please try again.',
    bn: 'ছবি আপলোড করতে ব্যর্থ। অনুগ্রহ করে আবার চেষ্টা করুন।'
  },
  uploading: { en: 'Uploading image...', bn: 'ছবি আপলোড হচ্ছে...' }
};

// Register image handler
const ImageBlot = Quill.import('formats/image');
class CustomImageBlot extends ImageBlot {
  static create(value) {
    const img = super.create();
    img.setAttribute('src', value.src);
    img.setAttribute('alt', value.alt || '');
    if (value.width) img.setAttribute('width', value.width);
    if (value.height) img.setAttribute('height', value.height);
    return img;
  }

  static value(node) {
    return {
      src: node.getAttribute('src'),
      alt: node.getAttribute('alt'),
      width: node.getAttribute('width'),
      height: node.getAttribute('height')
    };
  }
}
Quill.register(CustomImageBlot, true);

const toolbarModules = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: [] }],
    [{ size: ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    ['link', 'image', 'video', 'blockquote', 'code-block'],
    ['clean']
  ]
};

const formats = [
  'header',
  'font',
  'size',
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'background',
  'list',
  'bullet',
  'indent',
  'align',
  'link',
  'image',
  'video',
  'blockquote',
  'code-block'
];

function RichTextEditor({ value, onChange, placeholder }) {
  const [uploading, setUploading] = useState(false);
  const { error: toastError } = useToast();
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);

  const imageHandler = useCallback(async () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      setUploading(true);
      try {
        // Get upload signature from backend (response shape: { signature: {...} })
        const { data: signatureResponse } = await cmsApi.createUploadSignature({ folder: 'editor' });
        const signature = signatureResponse.signature;

        // Upload to Cloudinary
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', signature.apiKey);
        formData.append('timestamp', signature.timestamp);
        formData.append('signature', signature.signature);
        formData.append('folder', signature.folder);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
          method: 'POST',
          body: formData
        });

        const data = await response.json();
        
        if (data.secure_url) {
          const quill = Quill.find(document.querySelector('.ql-editor'));
          const range = quill.getSelection();
          quill.insertEmbed(range.index, 'image', {
            src: data.secure_url,
            alt: file.name
          });
        }
      } catch {
        toastError(t('uploadFailed'));
      } finally {
        setUploading(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const modules = {
    ...toolbarModules,
    toolbar: {
      ...toolbarModules.toolbar,
      handlers: {
        image: imageHandler
      }
    }
  };

  return (
    <div className="rich-editor-wrap">
      {uploading && (
        <div className="editor-upload-overlay">
          <div className="editor-upload-spinner">{t('uploading')}</div>
        </div>
      )}
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
}

export default RichTextEditor;
