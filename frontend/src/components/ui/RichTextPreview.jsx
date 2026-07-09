import DOMPurify from 'dompurify';

function RichTextPreview({ html }) {
  if (!html) {
    return <p className="meta">No content available.</p>;
  }

  const sanitizedHtml = DOMPurify.sanitize(html);

  return <div className="rich-preview" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}

export default RichTextPreview;
