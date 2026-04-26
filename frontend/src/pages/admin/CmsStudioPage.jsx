import { useCallback, useEffect, useMemo, useState } from 'react';
import { cmsApi } from '../../api/modules';
import RichTextEditor from '../../components/common/RichTextEditor';
import useRole from '../../hooks/useRole';
import useLanguage from '../../hooks/useLanguage';
import {
  defaultTranslationWorkflow,
  sourceLanguageOptions,
  translationStatusOptions
} from '../../data/cmsTranslations';
import { getApiErrorMessage } from '../../utils/http';
import { toIsoDate, toLocalizedText } from '../../utils/localized';

const initialLocalized = {
  en: '',
  bn: ''
};

const initialPageForm = {
  id: '',
  slug: '',
  title: { ...initialLocalized },
  content: { ...initialLocalized },
  status: 'draft',
  translationWorkflow: { ...defaultTranslationWorkflow }
};

const initialNewsForm = {
  id: '',
  category: 'news',
  title: { ...initialLocalized },
  summary: { ...initialLocalized },
  body: { ...initialLocalized },
  coverImageUrl: '',
  tagsInput: '',
  status: 'draft',
  translationWorkflow: { ...defaultTranslationWorkflow }
};

const initialBlogForm = {
  id: '',
  slug: '',
  title: { ...initialLocalized },
  excerpt: { ...initialLocalized },
  body: { ...initialLocalized },
  coverImageUrl: '',
  tagsInput: '',
  status: 'draft',
  translationWorkflow: { ...defaultTranslationWorkflow }
};

const createGalleryItem = () => ({
  mediaType: 'image',
  mediaUrl: '',
  thumbnailUrl: '',
  caption: { ...initialLocalized },
  order: 0
});

const initialGalleryForm = {
  id: '',
  slug: '',
  title: { ...initialLocalized },
  description: { ...initialLocalized },
  status: 'draft',
  translationWorkflow: { ...defaultTranslationWorkflow },
  items: [createGalleryItem()]
};

function toSlug(value) {
  return (value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function normalizeWorkflow(workflow) {
  return {
    ...defaultTranslationWorkflow,
    ...(workflow || {})
  };
}

function parseTags(input) {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getSourceLanguage(workflow) {
  return workflow?.sourceLanguage === 'bn' ? 'bn' : 'en';
}

function getLocalizedValue(localized, locale) {
  const raw = localized?.[locale];
  return typeof raw === 'string' ? raw.trim() : '';
}

function hasRichTextContent(value = '') {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().length > 0;
}

function getMissingSourceContentMessage(sourceLanguage, requiredChecks) {
  const missing = requiredChecks.filter((item) => !item.ok).map((item) => item.label);

  if (!missing.length) {
    return '';
  }

  return `Missing ${sourceLanguage.toUpperCase()} source content for: ${missing.join(', ')}`;
}

function TranslationWorkflowFields({ value, onChange }) {
  return (
    <div className="workflow-grid">
      <label>
        Source Language
        <select
          value={value.sourceLanguage}
          onChange={(event) => onChange('sourceLanguage', event.target.value)}
        >
          {sourceLanguageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        EN Translation Status
        <select value={value.enStatus} onChange={(event) => onChange('enStatus', event.target.value)}>
          {translationStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        BN Translation Status
        <select value={value.bnStatus} onChange={(event) => onChange('bnStatus', event.target.value)}>
          {translationStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function CmsStudioPage() {
  const canManageContent = useRole('admin', 'editor');
  const { language } = useLanguage();

  const [activeSection, setActiveSection] = useState('pages');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [pages, setPages] = useState([]);
  const [newsItems, setNewsItems] = useState([]);
  const [blogItems, setBlogItems] = useState([]);
  const [galleries, setGalleries] = useState([]);

  const [pageForm, setPageForm] = useState(initialPageForm);
  const [newsForm, setNewsForm] = useState(initialNewsForm);
  const [blogForm, setBlogForm] = useState(initialBlogForm);
  const [galleryForm, setGalleryForm] = useState(initialGalleryForm);

  const sectionTitle = useMemo(() => {
    if (activeSection === 'pages') {
      return 'Dynamic Pages';
    }
    if (activeSection === 'news') {
      return 'News & Announcements';
    }
    if (activeSection === 'blogs') {
      return 'Blogs';
    }
    return 'Gallery';
  }, [activeSection]);

  const loadData = useCallback(async () => {
    if (!canManageContent) {
      setError('You do not have permission to access CMS Studio.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [pagesResponse, newsResponse, blogsResponse, galleriesResponse] = await Promise.all([
        cmsApi.listManagePages({ limit: 100 }),
        cmsApi.listManageNews({ limit: 100 }),
        cmsApi.listManageBlogs({ limit: 100 }),
        cmsApi.listManageGalleries({ limit: 100 })
      ]);

      setPages(pagesResponse.data.items || []);
      setNewsItems(newsResponse.data.items || []);
      setBlogItems(blogsResponse.data.items || []);
      setGalleries(galleriesResponse.data.items || []);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to load CMS studio data.'));
    } finally {
      setLoading(false);
    }
  }, [canManageContent]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForms = () => {
    setPageForm(initialPageForm);
    setNewsForm(initialNewsForm);
    setBlogForm(initialBlogForm);
    setGalleryForm(initialGalleryForm);
  };

  const onPageLocalizedChange = (field, locale, value) => {
    setPageForm((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [locale]: value
      }
    }));
  };

  const onPageWorkflowChange = (field, value) => {
    setPageForm((prev) => ({
      ...prev,
      translationWorkflow: {
        ...prev.translationWorkflow,
        [field]: value
      }
    }));
  };

  const submitPage = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    const sourceLanguage = getSourceLanguage(pageForm.translationWorkflow);
    const validationMessage = getMissingSourceContentMessage(sourceLanguage, [
      {
        label: 'Title',
        ok: Boolean(getLocalizedValue(pageForm.title, sourceLanguage))
      },
      {
        label: 'Content',
        ok: hasRichTextContent(pageForm.content?.[sourceLanguage] || '')
      }
    ]);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    try {
      const payload = {
        slug: toSlug(pageForm.slug),
        title: pageForm.title,
        content: pageForm.content,
        status: pageForm.status,
        translationWorkflow: pageForm.translationWorkflow
      };

      if (pageForm.id) {
        await cmsApi.updatePage(pageForm.id, payload);
        setMessage('Page updated successfully.');
      } else {
        await cmsApi.createPage(payload);
        setMessage('Page created successfully.');
      }

      setPageForm(initialPageForm);
      await loadData();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to save page.'));
    }
  };

  const editPage = (item) => {
    setPageForm({
      id: item._id,
      slug: item.slug,
      title: item.title || { ...initialLocalized },
      content: item.content || { ...initialLocalized },
      status: item.status || 'draft',
      translationWorkflow: normalizeWorkflow(item.translationWorkflow)
    });
    setActiveSection('pages');
  };

  const onNewsLocalizedChange = (field, locale, value) => {
    setNewsForm((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [locale]: value
      }
    }));
  };

  const onNewsWorkflowChange = (field, value) => {
    setNewsForm((prev) => ({
      ...prev,
      translationWorkflow: {
        ...prev.translationWorkflow,
        [field]: value
      }
    }));
  };

  const submitNews = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    const sourceLanguage = getSourceLanguage(newsForm.translationWorkflow);
    const validationMessage = getMissingSourceContentMessage(sourceLanguage, [
      {
        label: 'Title',
        ok: Boolean(getLocalizedValue(newsForm.title, sourceLanguage))
      },
      {
        label: 'Summary',
        ok: Boolean(getLocalizedValue(newsForm.summary, sourceLanguage))
      },
      {
        label: 'Body',
        ok: hasRichTextContent(newsForm.body?.[sourceLanguage] || '')
      }
    ]);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    try {
      const payload = {
        category: newsForm.category,
        title: newsForm.title,
        summary: newsForm.summary,
        body: newsForm.body,
        coverImageUrl: newsForm.coverImageUrl || undefined,
        tags: parseTags(newsForm.tagsInput),
        status: newsForm.status,
        translationWorkflow: newsForm.translationWorkflow
      };

      if (newsForm.id) {
        await cmsApi.updateNews(newsForm.id, payload);
        setMessage('News item updated successfully.');
      } else {
        await cmsApi.createNews(payload);
        setMessage('News item created successfully.');
      }

      setNewsForm(initialNewsForm);
      await loadData();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to save news item.'));
    }
  };

  const editNews = (item) => {
    setNewsForm({
      id: item._id,
      category: item.category || 'news',
      title: item.title || { ...initialLocalized },
      summary: item.summary || { ...initialLocalized },
      body: item.body || { ...initialLocalized },
      coverImageUrl: item.coverImageUrl || '',
      tagsInput: Array.isArray(item.tags) ? item.tags.join(', ') : '',
      status: item.status || 'draft',
      translationWorkflow: normalizeWorkflow(item.translationWorkflow)
    });
    setActiveSection('news');
  };

  const onBlogLocalizedChange = (field, locale, value) => {
    setBlogForm((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [locale]: value
      }
    }));
  };

  const onBlogWorkflowChange = (field, value) => {
    setBlogForm((prev) => ({
      ...prev,
      translationWorkflow: {
        ...prev.translationWorkflow,
        [field]: value
      }
    }));
  };

  const submitBlog = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    const sourceLanguage = getSourceLanguage(blogForm.translationWorkflow);
    const validationMessage = getMissingSourceContentMessage(sourceLanguage, [
      {
        label: 'Title',
        ok: Boolean(getLocalizedValue(blogForm.title, sourceLanguage))
      },
      {
        label: 'Excerpt',
        ok: Boolean(getLocalizedValue(blogForm.excerpt, sourceLanguage))
      },
      {
        label: 'Body',
        ok: hasRichTextContent(blogForm.body?.[sourceLanguage] || '')
      }
    ]);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    try {
      const payload = {
        slug: toSlug(blogForm.slug),
        title: blogForm.title,
        excerpt: blogForm.excerpt,
        body: blogForm.body,
        coverImageUrl: blogForm.coverImageUrl || undefined,
        tags: parseTags(blogForm.tagsInput),
        status: blogForm.status,
        translationWorkflow: blogForm.translationWorkflow
      };

      if (blogForm.id) {
        await cmsApi.updateBlog(blogForm.id, payload);
        setMessage('Blog updated successfully.');
      } else {
        await cmsApi.createBlog(payload);
        setMessage('Blog created successfully.');
      }

      setBlogForm(initialBlogForm);
      await loadData();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to save blog.'));
    }
  };

  const editBlog = (item) => {
    setBlogForm({
      id: item._id,
      slug: item.slug,
      title: item.title || { ...initialLocalized },
      excerpt: item.excerpt || { ...initialLocalized },
      body: item.body || { ...initialLocalized },
      coverImageUrl: item.coverImageUrl || '',
      tagsInput: Array.isArray(item.tags) ? item.tags.join(', ') : '',
      status: item.status || 'draft',
      translationWorkflow: normalizeWorkflow(item.translationWorkflow)
    });
    setActiveSection('blogs');
  };

  const onGalleryLocalizedChange = (field, locale, value) => {
    setGalleryForm((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [locale]: value
      }
    }));
  };

  const onGalleryWorkflowChange = (field, value) => {
    setGalleryForm((prev) => ({
      ...prev,
      translationWorkflow: {
        ...prev.translationWorkflow,
        [field]: value
      }
    }));
  };

  const updateGalleryItem = (index, field, value) => {
    setGalleryForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value
            }
          : item
      )
    }));
  };

  const updateGalleryItemCaption = (index, locale, value) => {
    setGalleryForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              caption: {
                ...item.caption,
                [locale]: value
              }
            }
          : item
      )
    }));
  };

  const addGalleryItem = () => {
    setGalleryForm((prev) => ({
      ...prev,
      items: [...prev.items, createGalleryItem()]
    }));
  };

  const removeGalleryItem = (index) => {
    setGalleryForm((prev) => {
      const next = prev.items.filter((_, itemIndex) => itemIndex !== index);

      return {
        ...prev,
        items: next.length ? next : [createGalleryItem()]
      };
    });
  };

  const submitGallery = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    const sourceLanguage = getSourceLanguage(galleryForm.translationWorkflow);
    const validationMessage = getMissingSourceContentMessage(sourceLanguage, [
      {
        label: 'Title',
        ok: Boolean(getLocalizedValue(galleryForm.title, sourceLanguage))
      }
    ]);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    try {
      const payload = {
        slug: toSlug(galleryForm.slug),
        title: galleryForm.title,
        description: galleryForm.description,
        status: galleryForm.status,
        translationWorkflow: galleryForm.translationWorkflow,
        items: galleryForm.items
          .filter((item) => item.mediaUrl)
          .map((item, index) => ({
            mediaType: item.mediaType || 'image',
            mediaUrl: item.mediaUrl,
            thumbnailUrl: item.thumbnailUrl || '',
            caption: item.caption || { ...initialLocalized },
            order: Number(item.order ?? index)
          }))
      };

      if (galleryForm.id) {
        await cmsApi.updateGallery(galleryForm.id, payload);
        setMessage('Gallery updated successfully.');
      } else {
        await cmsApi.createGallery(payload);
        setMessage('Gallery created successfully.');
      }

      setGalleryForm(initialGalleryForm);
      await loadData();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to save gallery.'));
    }
  };

  const editGallery = (item) => {
    setGalleryForm({
      id: item._id,
      slug: item.slug,
      title: item.title || { ...initialLocalized },
      description: item.description || { ...initialLocalized },
      status: item.status || 'draft',
      translationWorkflow: normalizeWorkflow(item.translationWorkflow),
      items:
        item.items?.map((mediaItem) => ({
          mediaType: mediaItem.mediaType || 'image',
          mediaUrl: mediaItem.mediaUrl || '',
          thumbnailUrl: mediaItem.thumbnailUrl || '',
          caption: mediaItem.caption || { ...initialLocalized },
          order: mediaItem.order || 0
        })) || [createGalleryItem()]
    });
    setActiveSection('gallery');
  };

  const pageSourceLanguage = getSourceLanguage(pageForm.translationWorkflow);
  const newsSourceLanguage = getSourceLanguage(newsForm.translationWorkflow);
  const blogSourceLanguage = getSourceLanguage(blogForm.translationWorkflow);
  const gallerySourceLanguage = getSourceLanguage(galleryForm.translationWorkflow);

  if (!canManageContent) {
    return (
      <section className="page-wrap">
        <p className="error-text">You do not have permission to access CMS Studio.</p>
      </section>
    );
  }

  return (
    <section className="page-wrap">
      <div className="section-head">
        <h1>CMS Studio</h1>
        <button type="button" className="btn btn-ghost" onClick={loadData}>
          Refresh
        </button>
      </div>

      <p className="meta">
        WYSIWYG content authoring, bilingual translation workflow tracking, and gallery media management
        for non-technical staff.
      </p>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="meta">{message}</p>}
      {loading && <p>Loading CMS studio...</p>}

      <article className="surface-card">
        <div className="action-row">
          <button
            type="button"
            className={`btn ${activeSection === 'pages' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveSection('pages')}
          >
            Pages
          </button>
          <button
            type="button"
            className={`btn ${activeSection === 'news' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveSection('news')}
          >
            News & Announcements
          </button>
          <button
            type="button"
            className={`btn ${activeSection === 'blogs' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveSection('blogs')}
          >
            Blogs
          </button>
          <button
            type="button"
            className={`btn ${activeSection === 'gallery' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveSection('gallery')}
          >
            Gallery
          </button>
          <button type="button" className="btn btn-ghost" onClick={resetForms}>
            Reset Forms
          </button>
        </div>
      </article>

      <article className="surface-card">
        <h3>{sectionTitle}</h3>
        <p className="meta">
          Translation workflow: complete source-language content first, then add translation content in
          the other language.
        </p>

        {activeSection === 'pages' && (
          <form className="form-grid" onSubmit={submitPage}>
            <label>
              Page Slug
              <input
                value={pageForm.slug}
                onChange={(event) => setPageForm((prev) => ({ ...prev, slug: event.target.value }))}
                onBlur={(event) =>
                  setPageForm((prev) => ({ ...prev, slug: toSlug(event.target.value) }))
                }
                placeholder="about-department"
                required
              />
            </label>

            <label>
              Title (EN)
              <input
                value={pageForm.title.en}
                onChange={(event) => onPageLocalizedChange('title', 'en', event.target.value)}
                required={pageSourceLanguage === 'en'}
              />
            </label>

            <label>
              Title (BN)
              <input
                value={pageForm.title.bn}
                onChange={(event) => onPageLocalizedChange('title', 'bn', event.target.value)}
                required={pageSourceLanguage === 'bn'}
              />
            </label>

            <label>
              Content (EN)
              <RichTextEditor
                value={pageForm.content.en}
                onChange={(value) => onPageLocalizedChange('content', 'en', value)}
                placeholder="Write page content in English"
              />
            </label>

            <label>
              Content (BN)
              <RichTextEditor
                value={pageForm.content.bn}
                onChange={(value) => onPageLocalizedChange('content', 'bn', value)}
                placeholder="Write page content in Bangla"
              />
            </label>

            <label>
              Publish Status
              <select
                value={pageForm.status}
                onChange={(event) => setPageForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>

            <TranslationWorkflowFields
              value={pageForm.translationWorkflow}
              onChange={onPageWorkflowChange}
            />

            <button type="submit" className="btn btn-primary">
              {pageForm.id ? 'Update Page' : 'Create Page'}
            </button>
          </form>
        )}

        {activeSection === 'news' && (
          <form className="form-grid" onSubmit={submitNews}>
            <label>
              Post Type
              <select
                value={newsForm.category}
                onChange={(event) => setNewsForm((prev) => ({ ...prev, category: event.target.value }))}
              >
                <option value="news">News</option>
                <option value="announcement">Announcement</option>
              </select>
            </label>

            <label>
              Title (EN)
              <input
                value={newsForm.title.en}
                onChange={(event) => onNewsLocalizedChange('title', 'en', event.target.value)}
                required={newsSourceLanguage === 'en'}
              />
            </label>

            <label>
              Title (BN)
              <input
                value={newsForm.title.bn}
                onChange={(event) => onNewsLocalizedChange('title', 'bn', event.target.value)}
                required={newsSourceLanguage === 'bn'}
              />
            </label>

            <label>
              Summary (EN)
              <textarea
                value={newsForm.summary.en}
                onChange={(event) => onNewsLocalizedChange('summary', 'en', event.target.value)}
                required={newsSourceLanguage === 'en'}
              />
            </label>

            <label>
              Summary (BN)
              <textarea
                value={newsForm.summary.bn}
                onChange={(event) => onNewsLocalizedChange('summary', 'bn', event.target.value)}
                required={newsSourceLanguage === 'bn'}
              />
            </label>

            <label>
              Body (EN)
              <RichTextEditor
                value={newsForm.body.en}
                onChange={(value) => onNewsLocalizedChange('body', 'en', value)}
                placeholder="Write detailed news body in English"
              />
            </label>

            <label>
              Body (BN)
              <RichTextEditor
                value={newsForm.body.bn}
                onChange={(value) => onNewsLocalizedChange('body', 'bn', value)}
                placeholder="Write detailed news body in Bangla"
              />
            </label>

            <label>
              Cover Image URL (optional)
              <input
                value={newsForm.coverImageUrl}
                onChange={(event) =>
                  setNewsForm((prev) => ({ ...prev, coverImageUrl: event.target.value }))
                }
              />
            </label>

            <label>
              Tags (comma separated)
              <input
                value={newsForm.tagsInput}
                onChange={(event) => setNewsForm((prev) => ({ ...prev, tagsInput: event.target.value }))}
              />
            </label>

            <label>
              Publish Status
              <select
                value={newsForm.status}
                onChange={(event) => setNewsForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>

            <TranslationWorkflowFields
              value={newsForm.translationWorkflow}
              onChange={onNewsWorkflowChange}
            />

            <button type="submit" className="btn btn-primary">
              {newsForm.id ? 'Update Item' : 'Create Item'}
            </button>
          </form>
        )}

        {activeSection === 'blogs' && (
          <form className="form-grid" onSubmit={submitBlog}>
            <label>
              Blog Slug
              <input
                value={blogForm.slug}
                onChange={(event) => setBlogForm((prev) => ({ ...prev, slug: event.target.value }))}
                onBlur={(event) =>
                  setBlogForm((prev) => ({ ...prev, slug: toSlug(event.target.value) }))
                }
                placeholder="student-research-highlights"
                required
              />
            </label>

            <label>
              Title (EN)
              <input
                value={blogForm.title.en}
                onChange={(event) => onBlogLocalizedChange('title', 'en', event.target.value)}
                required={blogSourceLanguage === 'en'}
              />
            </label>

            <label>
              Title (BN)
              <input
                value={blogForm.title.bn}
                onChange={(event) => onBlogLocalizedChange('title', 'bn', event.target.value)}
                required={blogSourceLanguage === 'bn'}
              />
            </label>

            <label>
              Excerpt (EN)
              <textarea
                value={blogForm.excerpt.en}
                onChange={(event) => onBlogLocalizedChange('excerpt', 'en', event.target.value)}
                required={blogSourceLanguage === 'en'}
              />
            </label>

            <label>
              Excerpt (BN)
              <textarea
                value={blogForm.excerpt.bn}
                onChange={(event) => onBlogLocalizedChange('excerpt', 'bn', event.target.value)}
                required={blogSourceLanguage === 'bn'}
              />
            </label>

            <label>
              Body (EN)
              <RichTextEditor
                value={blogForm.body.en}
                onChange={(value) => onBlogLocalizedChange('body', 'en', value)}
                placeholder="Write blog body in English"
              />
            </label>

            <label>
              Body (BN)
              <RichTextEditor
                value={blogForm.body.bn}
                onChange={(value) => onBlogLocalizedChange('body', 'bn', value)}
                placeholder="Write blog body in Bangla"
              />
            </label>

            <label>
              Cover Image URL (optional)
              <input
                value={blogForm.coverImageUrl}
                onChange={(event) =>
                  setBlogForm((prev) => ({ ...prev, coverImageUrl: event.target.value }))
                }
              />
            </label>

            <label>
              Tags (comma separated)
              <input
                value={blogForm.tagsInput}
                onChange={(event) => setBlogForm((prev) => ({ ...prev, tagsInput: event.target.value }))}
              />
            </label>

            <label>
              Publish Status
              <select
                value={blogForm.status}
                onChange={(event) => setBlogForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>

            <TranslationWorkflowFields
              value={blogForm.translationWorkflow}
              onChange={onBlogWorkflowChange}
            />

            <button type="submit" className="btn btn-primary">
              {blogForm.id ? 'Update Blog' : 'Create Blog'}
            </button>
          </form>
        )}

        {activeSection === 'gallery' && (
          <form className="form-grid" onSubmit={submitGallery}>
            <label>
              Gallery Slug
              <input
                value={galleryForm.slug}
                onChange={(event) =>
                  setGalleryForm((prev) => ({ ...prev, slug: event.target.value }))
                }
                onBlur={(event) =>
                  setGalleryForm((prev) => ({ ...prev, slug: toSlug(event.target.value) }))
                }
                placeholder="dept-convocation-2026"
                required
              />
            </label>

            <label>
              Title (EN)
              <input
                value={galleryForm.title.en}
                onChange={(event) => onGalleryLocalizedChange('title', 'en', event.target.value)}
                required={gallerySourceLanguage === 'en'}
              />
            </label>

            <label>
              Title (BN)
              <input
                value={galleryForm.title.bn}
                onChange={(event) => onGalleryLocalizedChange('title', 'bn', event.target.value)}
                required={gallerySourceLanguage === 'bn'}
              />
            </label>

            <label>
              Description (EN)
              <textarea
                value={galleryForm.description.en}
                onChange={(event) =>
                  onGalleryLocalizedChange('description', 'en', event.target.value)
                }
              />
            </label>

            <label>
              Description (BN)
              <textarea
                value={galleryForm.description.bn}
                onChange={(event) =>
                  onGalleryLocalizedChange('description', 'bn', event.target.value)
                }
              />
            </label>

            <label>
              Publish Status
              <select
                value={galleryForm.status}
                onChange={(event) =>
                  setGalleryForm((prev) => ({ ...prev, status: event.target.value }))
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>

            <TranslationWorkflowFields
              value={galleryForm.translationWorkflow}
              onChange={onGalleryWorkflowChange}
            />

            <div className="surface-card inner-card">
              <div className="section-head section-head-tight">
                <h4>Gallery Media Items</h4>
                <button type="button" className="btn btn-ghost" onClick={addGalleryItem}>
                  Add Media
                </button>
              </div>

              <div className="stack-list">
                {galleryForm.items.map((item, index) => (
                  <article key={`gallery-item-${index}`} className="surface-card inner-card">
                    <div className="section-head section-head-tight">
                      <h4>Item {index + 1}</h4>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => removeGalleryItem(index)}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="form-grid">
                      <label>
                        Media Type
                        <select
                          value={item.mediaType}
                          onChange={(event) =>
                            updateGalleryItem(index, 'mediaType', event.target.value)
                          }
                        >
                          <option value="image">Image</option>
                          <option value="video">Video</option>
                        </select>
                      </label>

                      <label>
                        Media URL
                        <input
                          value={item.mediaUrl}
                          onChange={(event) =>
                            updateGalleryItem(index, 'mediaUrl', event.target.value)
                          }
                          placeholder="https://..."
                          required
                        />
                      </label>

                      <label>
                        Thumbnail URL (optional)
                        <input
                          value={item.thumbnailUrl}
                          onChange={(event) =>
                            updateGalleryItem(index, 'thumbnailUrl', event.target.value)
                          }
                          placeholder="https://..."
                        />
                      </label>

                      <label>
                        Caption (EN)
                        <input
                          value={item.caption?.en || ''}
                          onChange={(event) =>
                            updateGalleryItemCaption(index, 'en', event.target.value)
                          }
                        />
                      </label>

                      <label>
                        Caption (BN)
                        <input
                          value={item.caption?.bn || ''}
                          onChange={(event) =>
                            updateGalleryItemCaption(index, 'bn', event.target.value)
                          }
                        />
                      </label>

                      <label>
                        Order
                        <input
                          type="number"
                          min="0"
                          value={item.order}
                          onChange={(event) =>
                            updateGalleryItem(index, 'order', Number(event.target.value))
                          }
                        />
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary">
              {galleryForm.id ? 'Update Gallery' : 'Create Gallery'}
            </button>
          </form>
        )}
      </article>

      <article className="surface-card">
        <h3>Existing {sectionTitle}</h3>

        {activeSection === 'pages' &&
          pages.map((item) => (
            <article key={item._id} className="surface-card inner-card">
              <div className="section-head section-head-tight">
                <h4>{toLocalizedText(item.title, language)}</h4>
                <button type="button" className="btn btn-ghost" onClick={() => editPage(item)}>
                  Edit
                </button>
              </div>
              <p className="meta">
                Slug: {item.slug} • Status: {item.status} • Updated: {toIsoDate(item.updatedAt)}
              </p>
            </article>
          ))}

        {activeSection === 'news' &&
          newsItems.map((item) => (
            <article key={item._id} className="surface-card inner-card">
              <div className="section-head section-head-tight">
                <h4>{toLocalizedText(item.title, language)}</h4>
                <button type="button" className="btn btn-ghost" onClick={() => editNews(item)}>
                  Edit
                </button>
              </div>
              <p className="meta">
                Type: {item.category || 'news'} • Status: {item.status} • Updated:{' '}
                {toIsoDate(item.updatedAt)}
              </p>
            </article>
          ))}

        {activeSection === 'blogs' &&
          blogItems.map((item) => (
            <article key={item._id} className="surface-card inner-card">
              <div className="section-head section-head-tight">
                <h4>{toLocalizedText(item.title, language)}</h4>
                <button type="button" className="btn btn-ghost" onClick={() => editBlog(item)}>
                  Edit
                </button>
              </div>
              <p className="meta">
                Slug: {item.slug} • Status: {item.status} • Updated: {toIsoDate(item.updatedAt)}
              </p>
            </article>
          ))}

        {activeSection === 'gallery' &&
          galleries.map((item) => (
            <article key={item._id} className="surface-card inner-card">
              <div className="section-head section-head-tight">
                <h4>{toLocalizedText(item.title, language)}</h4>
                <button type="button" className="btn btn-ghost" onClick={() => editGallery(item)}>
                  Edit
                </button>
              </div>
              <p className="meta">
                Slug: {item.slug} • Media items: {item.items?.length || 0} • Status: {item.status}
              </p>
            </article>
          ))}
      </article>
    </section>
  );
}

export default CmsStudioPage;
