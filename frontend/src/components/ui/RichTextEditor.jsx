import 'react-quill/dist/quill.snow.css';
import ReactQuill, { Quill } from 'react-quill';
import { useState, useCallback } from 'react';
import { cmsApi } from '../../api/modules';
import { useToast } from '../../context/ToastContext';

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
        // Get upload signature from backend
        const { data: signature } = await cmsApi.createUploadSignature({ folder: 'editor' });
        
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
      } catch (error) {
        toastError('Failed to upload image. Please try again.');
      } finally {
        setUploading(false);
      }
    };
  }, []);

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
          <div className="editor-upload-spinner">Uploading image...</div>
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
