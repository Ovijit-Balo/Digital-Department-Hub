import 'react-quill/dist/quill.snow.css';
import ReactQuill from 'react-quill';

const toolbarModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    ['link', 'image', 'blockquote', 'code-block'],
    ['clean']
  ]
};

const formats = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'bullet',
  'indent',
  'align',
  'link',
  'image',
  'blockquote',
  'code-block'
];

function RichTextEditor({ value, onChange, placeholder }) {
  return (
    <div className="rich-editor-wrap">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={toolbarModules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
}

export default RichTextEditor;
