import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cmsApi } from '../../api/modules';
import BlogForm from '../../features/cms/components/BlogForm';
import GalleryForm from '../../features/cms/components/GalleryForm';
import NewsForm from '../../features/cms/components/NewsForm';
import PageForm from '../../features/cms/components/PageForm';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import RichTextPreview from '../../components/ui/RichTextPreview';
import useRole from '../../hooks/useRole';
import useLanguage from '../../hooks/useLanguage';
import { useToast } from '../../context/ToastContext';
import { defaultTranslationWorkflow } from '../../data/cmsTranslations';
import { getApiErrorMessage } from '../../utils/http';
import { toIsoDate, toLocalDateTime, toLocalizedText } from '../../utils/localized';

const PAGE_SIZE = 10;

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
  scheduledAt: '',
  seo: { metaTitle: { ...initialLocalized }, metaDescription: { ...initialLocalized } },
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
  scheduledAt: '',
  seo: { metaTitle: { ...initialLocalized }, metaDescription: { ...initialLocalized } },
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
  scheduledAt: '',
  seo: { metaTitle: { ...initialLocalized }, metaDescription: { ...initialLocalized } },
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

function normalizeSeo(seo) {
  return {
    metaTitle: { en: seo?.metaTitle?.en || '', bn: seo?.metaTitle?.bn || '' },
    metaDescription: { en: seo?.metaDescription?.en || '', bn: seo?.metaDescription?.bn || '' }
  };
}

// Convert a stored ISO timestamp into a value the datetime-local input accepts.
function toDateTimeLocalValue(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const localMs = date.getTime() - date.getTimezoneOffset() * 60000;
  return new Date(localMs).toISOString().slice(0, 16);
}

function toScheduledIso(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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
  return (
    value
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim().length > 0
  );
}

function isScheduledFuture(item) {
  return Boolean(item?.scheduledAt) && new Date(item.scheduledAt) > new Date();
}

const SECTION_TITLES = {
  pages: { en: 'Dynamic Pages', bn: 'ডাইনামিক পাতা' },
  news: { en: 'News & Announcements', bn: 'সংবাদ ও ঘোষণা' },
  blogs: { en: 'Blogs', bn: 'ব্লগ' },
  gallery: { en: 'Gallery', bn: 'গ্যালারি' }
};

const FIELD_LABELS = {
  Title: { en: 'Title', bn: 'শিরোনাম' },
  Content: { en: 'Content', bn: 'বিষয়বস্তু' },
  Summary: { en: 'Summary', bn: 'সারসংক্ষেপ' },
  Body: { en: 'Body', bn: 'মূল অংশ' },
  Excerpt: { en: 'Excerpt', bn: 'উদ্ধৃতাংশ' }
};

const T = {
  noPermission: { en: 'You do not have permission to access CMS Studio.', bn: 'সিএমএস স্টুডিও ব্যবহারের অনুমতি আপনার নেই।' },
  title: { en: 'CMS Studio', bn: 'সিএমএস স্টুডিও' },
  refresh: { en: 'Refresh', bn: 'রিফ্রেশ' },
  lead: {
    en: 'WYSIWYG content authoring, bilingual translation workflow tracking, media uploads, SEO metadata, scheduled publishing, and gallery management for non-technical staff.',
    bn: 'অ-প্রযুক্তিগত কর্মীদের জন্য WYSIWYG কনটেন্ট রচনা, দ্বিভাষিক অনুবাদ ওয়ার্কফ্লো, মিডিয়া আপলোড, এসইও মেটাডেটা, নির্ধারিত প্রকাশনা ও গ্যালারি ব্যবস্থাপনা।'
  },
  resetForms: { en: 'Reset Forms', bn: 'ফর্ম রিসেট' },
  editing: { en: 'Editing:', bn: 'সম্পাদনা:' },
  untitled: { en: 'Untitled', bn: 'শিরোনামহীন' },
  newPrefix: { en: 'New', bn: 'নতুন' },
  cancelEdit: { en: 'Cancel edit', bn: 'সম্পাদনা বাতিল' },
  workflowHint: {
    en: 'Translation workflow: complete source-language content first, then add translation content in the other language.',
    bn: 'অনুবাদ ওয়ার্কফ্লো: প্রথমে উৎস-ভাষার বিষয়বস্তু সম্পূর্ণ করুন, তারপর অন্য ভাষায় অনুবাদ যোগ করুন।'
  },
  existing: { en: 'Existing', bn: 'বিদ্যমান' },
  total: { en: 'total', bn: 'মোট' },
  searchPrefix: { en: 'Search', bn: 'খুঁজুন' },
  allStatuses: { en: 'All statuses', bn: 'সব অবস্থা' },
  draft: { en: 'Draft', bn: 'খসড়া' },
  published: { en: 'Published', bn: 'প্রকাশিত' },
  loadingPrefix: { en: 'Loading', bn: 'লোড হচ্ছে' },
  noItems: { en: 'No items match your filters.', bn: 'আপনার ফিল্টারের সাথে কোনো আইটেম মেলেনি।' },
  edit: { en: 'Edit', bn: 'সম্পাদনা' },
  preview: { en: 'Preview', bn: 'প্রিভিউ' },
  publishBtn: { en: 'Publish', bn: 'প্রকাশ' },
  unpublish: { en: 'Unpublish', bn: 'অপ্রকাশ' },
  delete: { en: 'Delete', bn: 'মুছুন' },
  scheduled: { en: 'Scheduled', bn: 'নির্ধারিত' },
  updated: { en: 'Updated:', bn: 'আপডেট:' },
  slug: { en: 'Slug', bn: 'স্লাগ' },
  typeLabel: { en: 'Type', bn: 'ধরন' },
  mediaItems: { en: 'Media items', bn: 'মিডিয়া আইটেম' },
  previous: { en: 'Previous', bn: 'পূর্ববর্তী' },
  next: { en: 'Next', bn: 'পরবর্তী' },
  pageOf: { en: 'Page', bn: 'পৃষ্ঠা' },
  ofWord: { en: 'of', bn: '/' },
  deleteTitle: { en: 'Delete this item?', bn: 'এই আইটেমটি মুছবেন?' },
  // messages / toasts
  missingPrefix: { en: 'Missing', bn: 'অনুপস্থিত' },
  sourceContentFor: { en: 'source content for:', bn: 'উৎস বিষয়বস্তু নেই:' },
  msgNoPermissionAccess: { en: 'You do not have permission to access CMS Studio.', bn: 'সিএমএস স্টুডিও ব্যবহারের অনুমতি আপনার নেই।' },
  msgLoadFailed: { en: 'Failed to load CMS studio data.', bn: 'সিএমএস স্টুডিও ডেটা লোড করতে ব্যর্থ।' },
  pageUpdated: { en: 'Page updated successfully.', bn: 'পাতা সফলভাবে আপডেট হয়েছে।' },
  pageCreated: { en: 'Page created successfully.', bn: 'পাতা সফলভাবে তৈরি হয়েছে।' },
  pageSaveFailed: { en: 'Failed to save page.', bn: 'পাতা সংরক্ষণে ব্যর্থ।' },
  newsUpdated: { en: 'News item updated successfully.', bn: 'সংবাদ আইটেম সফলভাবে আপডেট হয়েছে।' },
  newsCreated: { en: 'News item created successfully.', bn: 'সংবাদ আইটেম সফলভাবে তৈরি হয়েছে।' },
  newsSaveFailed: { en: 'Failed to save news item.', bn: 'সংবাদ আইটেম সংরক্ষণে ব্যর্থ।' },
  blogUpdated: { en: 'Blog updated successfully.', bn: 'ব্লগ সফলভাবে আপডেট হয়েছে।' },
  blogCreated: { en: 'Blog created successfully.', bn: 'ব্লগ সফলভাবে তৈরি হয়েছে।' },
  blogSaveFailed: { en: 'Failed to save blog.', bn: 'ব্লগ সংরক্ষণে ব্যর্থ।' },
  galleryUpdated: { en: 'Gallery updated successfully.', bn: 'গ্যালারি সফলভাবে আপডেট হয়েছে।' },
  galleryCreated: { en: 'Gallery created successfully.', bn: 'গ্যালারি সফলভাবে তৈরি হয়েছে।' },
  gallerySaveFailed: { en: 'Failed to save gallery.', bn: 'গ্যালারি সংরক্ষণে ব্যর্থ।' },
  publishedToast: { en: 'Published.', bn: 'প্রকাশিত হয়েছে।' },
  movedToDraft: { en: 'Moved to draft.', bn: 'খসড়ায় সরানো হয়েছে।' },
  statusFailed: { en: 'Failed to update status.', bn: 'অবস্থা আপডেট করতে ব্যর্থ।' },
  deletedToast: { en: 'Deleted.', bn: 'মুছে ফেলা হয়েছে।' },
  deleteFailed: { en: 'Failed to delete.', bn: 'মুছতে ব্যর্থ।' },
  previewTitle: { en: 'Preview', bn: 'প্রিভিউ' },
  deleteBtn: { en: 'Delete', bn: 'মুছুন' }
};

const VALID_STATUSES = ['draft', 'published', 'archived'];

function CmsStudioPage() {
  const canManageContent = useRole('admin', 'editor');
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);
  const toast = useToast();

  const getMissingSourceContentMessage = (sourceLanguage, requiredChecks) => {
    const missing = requiredChecks
      .filter((item) => !item.ok)
      .map((item) => toLocalizedText(FIELD_LABELS[item.label] || { en: item.label, bn: item.label }, language));

    if (!missing.length) {
      return '';
    }

    return `${t('missingPrefix')} ${sourceLanguage.toUpperCase()} ${t('sourceContentFor')} ${missing.join(', ')}`;
  };

  // Deep-linkable state: /admin/cms?section=news&status=draft lets dashboards
  // link straight to a filtered list.
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionParam = searchParams.get('section');
  const statusParam = searchParams.get('status');

  const [activeSection, setActiveSection] = useState(
    SECTION_TITLES[sectionParam] ? sectionParam : 'pages'
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // List + filtering state (server-driven, per active section).
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [listPage, setListPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(
    VALID_STATUSES.includes(statusParam) ? statusParam : ''
  );

  const [pageForm, setPageForm] = useState(initialPageForm);
  const [newsForm, setNewsForm] = useState(initialNewsForm);
  const [blogForm, setBlogForm] = useState(initialBlogForm);
  const [galleryForm, setGalleryForm] = useState(initialGalleryForm);

  const [preview, setPreview] = useState({ open: false, type: '', item: null });
  const [confirm, setConfirm] = useState({ open: false, type: '', item: null });
  const [deleting, setDeleting] = useState(false);

  const sectionTitle = toLocalizedText(SECTION_TITLES[activeSection], language);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const reload = useCallback(async () => {
    if (!canManageContent) {
      setError(t('msgNoPermissionAccess'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const params = { page: listPage, limit: PAGE_SIZE };
    if (search.trim()) {
      params.search = search.trim();
    }
    if (statusFilter) {
      params.status = statusFilter;
    }

    try {
      let response;
      if (activeSection === 'pages') {
        response = await cmsApi.listManagePages(params);
      } else if (activeSection === 'news') {
        response = await cmsApi.listManageNews(params);
      } else if (activeSection === 'blogs') {
        response = await cmsApi.listManageBlogs(params);
      } else {
        response = await cmsApi.listManageGalleries(params);
      }

      setItems(response.data.items || []);
      setTotal(response.data.total || 0);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, t('msgLoadFailed')));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, listPage, search, statusFilter, canManageContent]);

  // Debounced reload so typing in the search box does not spam the API.
  useEffect(() => {
    const timer = setTimeout(reload, 300);
    return () => clearTimeout(timer);
  }, [reload]);

  const syncUrlParams = useCallback(
    (section, status) => {
      const next = {};
      if (section && section !== 'pages') {
        next.section = section;
      }
      if (status) {
        next.status = status;
      }
      setSearchParams(next, { replace: true });
    },
    [setSearchParams]
  );

  // Follow external navigation (e.g. a dashboard card linking to
  // /admin/cms?section=news&status=draft while the studio is already open).
  useEffect(() => {
    const nextSection = SECTION_TITLES[sectionParam] ? sectionParam : 'pages';
    const nextStatus = VALID_STATUSES.includes(statusParam) ? statusParam : '';

    setActiveSection((prev) => (prev === nextSection ? prev : nextSection));
    setStatusFilter((prev) => (prev === nextStatus ? prev : nextStatus));
  }, [sectionParam, statusParam]);

  const switchSection = (section) => {
    if (section === activeSection) {
      return;
    }
    setActiveSection(section);
    setListPage(1);
    setSearch('');
    setStatusFilter('');
    syncUrlParams(section, '');
  };

  const resetForms = () => {
    setPageForm(initialPageForm);
    setNewsForm(initialNewsForm);
    setBlogForm(initialBlogForm);
    setGalleryForm(initialGalleryForm);
  };

  const cancelEdit = () => {
    if (activeSection === 'pages') setPageForm(initialPageForm);
    else if (activeSection === 'news') setNewsForm(initialNewsForm);
    else if (activeSection === 'blogs') setBlogForm(initialBlogForm);
    else setGalleryForm(initialGalleryForm);
  };

  // --- Generic localized / workflow / seo change helpers ---
  const makeLocalizedChange = (setForm) => (field, locale, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: { ...prev[field], [locale]: value }
    }));
  };

  const makeWorkflowChange = (setForm) => (field, value) => {
    setForm((prev) => ({
      ...prev,
      translationWorkflow: { ...prev.translationWorkflow, [field]: value }
    }));
  };

  const makeSeoChange = (setForm) => (field, locale, value) => {
    setForm((prev) => ({
      ...prev,
      seo: {
        ...prev.seo,
        [field]: { ...prev.seo[field], [locale]: value }
      }
    }));
  };

  const makeFieldChange = (setForm) => (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onPageLocalizedChange = makeLocalizedChange(setPageForm);
  const onPageWorkflowChange = makeWorkflowChange(setPageForm);
  const onPageSeoChange = makeSeoChange(setPageForm);

  const onNewsLocalizedChange = makeLocalizedChange(setNewsForm);
  const onNewsWorkflowChange = makeWorkflowChange(setNewsForm);
  const onNewsSeoChange = makeSeoChange(setNewsForm);

  const onBlogLocalizedChange = makeLocalizedChange(setBlogForm);
  const onBlogWorkflowChange = makeWorkflowChange(setBlogForm);
  const onBlogSeoChange = makeSeoChange(setBlogForm);

  const onGalleryLocalizedChange = makeLocalizedChange(setGalleryForm);
  const onGalleryWorkflowChange = makeWorkflowChange(setGalleryForm);

  // --- Submit handlers ---
  const submitPage = async (event) => {
    event.preventDefault();
    setError('');

    const sourceLanguage = getSourceLanguage(pageForm.translationWorkflow);
    const validationMessage = getMissingSourceContentMessage(sourceLanguage, [
      { label: 'Title', ok: Boolean(getLocalizedValue(pageForm.title, sourceLanguage)) },
      { label: 'Content', ok: hasRichTextContent(pageForm.content?.[sourceLanguage] || '') }
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
        scheduledAt: toScheduledIso(pageForm.scheduledAt),
        seo: pageForm.seo,
        translationWorkflow: pageForm.translationWorkflow
      };

      if (pageForm.id) {
        await cmsApi.updatePage(pageForm.id, payload);
        toast.success(t('pageUpdated'));
      } else {
        await cmsApi.createPage(payload);
        toast.success(t('pageCreated'));
      }

      setPageForm(initialPageForm);
      await reload();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, t('pageSaveFailed')));
    }
  };

  const editPage = (item) => {
    setPageForm({
      id: item._id,
      slug: item.slug,
      title: item.title || { ...initialLocalized },
      content: item.content || { ...initialLocalized },
      status: item.status || 'draft',
      scheduledAt: toDateTimeLocalValue(item.scheduledAt),
      seo: normalizeSeo(item.seo),
      translationWorkflow: normalizeWorkflow(item.translationWorkflow)
    });
    setActiveSection('pages');
  };

  const submitNews = async (event) => {
    event.preventDefault();
    setError('');

    const sourceLanguage = getSourceLanguage(newsForm.translationWorkflow);
    const validationMessage = getMissingSourceContentMessage(sourceLanguage, [
      { label: 'Title', ok: Boolean(getLocalizedValue(newsForm.title, sourceLanguage)) },
      { label: 'Summary', ok: Boolean(getLocalizedValue(newsForm.summary, sourceLanguage)) },
      { label: 'Body', ok: hasRichTextContent(newsForm.body?.[sourceLanguage] || '') }
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
        scheduledAt: toScheduledIso(newsForm.scheduledAt),
        seo: newsForm.seo,
        translationWorkflow: newsForm.translationWorkflow
      };

      if (newsForm.id) {
        await cmsApi.updateNews(newsForm.id, payload);
        toast.success(t('newsUpdated'));
      } else {
        await cmsApi.createNews(payload);
        toast.success(t('newsCreated'));
      }

      setNewsForm(initialNewsForm);
      await reload();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, t('newsSaveFailed')));
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
      scheduledAt: toDateTimeLocalValue(item.scheduledAt),
      seo: normalizeSeo(item.seo),
      translationWorkflow: normalizeWorkflow(item.translationWorkflow)
    });
    setActiveSection('news');
  };

  const submitBlog = async (event) => {
    event.preventDefault();
    setError('');

    const sourceLanguage = getSourceLanguage(blogForm.translationWorkflow);
    const validationMessage = getMissingSourceContentMessage(sourceLanguage, [
      { label: 'Title', ok: Boolean(getLocalizedValue(blogForm.title, sourceLanguage)) },
      { label: 'Excerpt', ok: Boolean(getLocalizedValue(blogForm.excerpt, sourceLanguage)) },
      { label: 'Body', ok: hasRichTextContent(blogForm.body?.[sourceLanguage] || '') }
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
        scheduledAt: toScheduledIso(blogForm.scheduledAt),
        seo: blogForm.seo,
        translationWorkflow: blogForm.translationWorkflow
      };

      if (blogForm.id) {
        await cmsApi.updateBlog(blogForm.id, payload);
        toast.success(t('blogUpdated'));
      } else {
        await cmsApi.createBlog(payload);
        toast.success(t('blogCreated'));
      }

      setBlogForm(initialBlogForm);
      await reload();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, t('blogSaveFailed')));
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
      scheduledAt: toDateTimeLocalValue(item.scheduledAt),
      seo: normalizeSeo(item.seo),
      translationWorkflow: normalizeWorkflow(item.translationWorkflow)
    });
    setActiveSection('blogs');
  };

  const updateGalleryItem = (index, field, value) => {
    setGalleryForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const updateGalleryItemCaption = (index, locale, value) => {
    setGalleryForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, caption: { ...item.caption, [locale]: value } }
          : item
      )
    }));
  };

  const addGalleryItem = () => {
    setGalleryForm((prev) => ({ ...prev, items: [...prev.items, createGalleryItem()] }));
  };

  const removeGalleryItem = (index) => {
    setGalleryForm((prev) => {
      const next = prev.items.filter((_, itemIndex) => itemIndex !== index);
      return { ...prev, items: next.length ? next : [createGalleryItem()] };
    });
  };

  const submitGallery = async (event) => {
    event.preventDefault();
    setError('');

    const sourceLanguage = getSourceLanguage(galleryForm.translationWorkflow);
    const validationMessage = getMissingSourceContentMessage(sourceLanguage, [
      { label: 'Title', ok: Boolean(getLocalizedValue(galleryForm.title, sourceLanguage)) }
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
        toast.success(t('galleryUpdated'));
      } else {
        await cmsApi.createGallery(payload);
        toast.success(t('galleryCreated'));
      }

      setGalleryForm(initialGalleryForm);
      await reload();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, t('gallerySaveFailed')));
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

  const editHandlers = {
    pages: editPage,
    news: editNews,
    blogs: editBlog,
    gallery: editGallery
  };

  // --- Publish toggle / delete ---
  const togglePublish = async (type, item) => {
    const updaters = {
      pages: cmsApi.updatePage,
      news: cmsApi.updateNews,
      blogs: cmsApi.updateBlog,
      gallery: cmsApi.updateGallery
    };
    const nextStatus = item.status === 'published' ? 'draft' : 'published';

    try {
      await updaters[type](item._id, { status: nextStatus });
      toast.success(nextStatus === 'published' ? t('publishedToast') : t('movedToDraft'));
      await reload();
    } catch (apiError) {
      toast.error(getApiErrorMessage(apiError, t('statusFailed')));
    }
  };

  const requestDelete = (type, item) => {
    setConfirm({ open: true, type, item });
  };

  const confirmDelete = async () => {
    const removers = {
      pages: cmsApi.deletePage,
      news: cmsApi.deleteNews,
      blogs: cmsApi.deleteBlog,
      gallery: cmsApi.deleteGallery
    };

    setDeleting(true);
    try {
      await removers[confirm.type](confirm.item._id);
      toast.success(t('deletedToast'));
      setConfirm({ open: false, type: '', item: null });
      // If we deleted the item currently being edited, clear the form.
      cancelEdit();
      await reload();
    } catch (apiError) {
      toast.error(getApiErrorMessage(apiError, t('deleteFailed')));
    } finally {
      setDeleting(false);
    }
  };

  const openPreview = (type, item) => {
    setPreview({ open: true, type, item });
  };

  const pageSourceLanguage = getSourceLanguage(pageForm.translationWorkflow);
  const newsSourceLanguage = getSourceLanguage(newsForm.translationWorkflow);
  const blogSourceLanguage = getSourceLanguage(blogForm.translationWorkflow);
  const gallerySourceLanguage = getSourceLanguage(galleryForm.translationWorkflow);

  const activeFormId = useMemo(() => {
    if (activeSection === 'pages') return pageForm.id;
    if (activeSection === 'news') return newsForm.id;
    if (activeSection === 'blogs') return blogForm.id;
    return galleryForm.id;
  }, [activeSection, pageForm.id, newsForm.id, blogForm.id, galleryForm.id]);

  const activeFormTitle = useMemo(() => {
    const titles = {
      pages: pageForm.title,
      news: newsForm.title,
      blogs: blogForm.title,
      gallery: galleryForm.title
    };
    return toLocalizedText(titles[activeSection], language);
  }, [activeSection, pageForm.title, newsForm.title, blogForm.title, galleryForm.title, language]);

  if (!canManageContent) {
    return (
      <section className="page-wrap">
        <p className="error-text">{t('noPermission')}</p>
      </section>
    );
  }

  const renderStatusMeta = (item, extra = '') => (
    <p className="meta cms-status-line">
      <span className={`status-badge status-${item.status}`}>{item.status}</span>
      {isScheduledFuture(item) ? (
        <span className="status-badge status-scheduled">
          {t('scheduled')} · {toLocalDateTime(item.scheduledAt)}
        </span>
      ) : null}
      {extra}
      {` • ${t('updated')} `}
      {toIsoDate(item.updatedAt)}
    </p>
  );

  const renderActions = (type, item) => (
    <div className="action-row action-row-tight">
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => editHandlers[type](item)}>
        {t('edit')}
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openPreview(type, item)}>
        {t('preview')}
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => togglePublish(type, item)}
      >
        {item.status === 'published' ? t('unpublish') : t('publishBtn')}
      </button>
      <button
        type="button"
        className="btn btn-danger btn-sm"
        onClick={() => requestDelete(type, item)}
      >
        {t('delete')}
      </button>
    </div>
  );

  const renderPreviewBody = () => {
    const { type, item } = preview;
    if (!item) {
      return null;
    }

    const title = toLocalizedText(item.title, language);
    const cover = item.coverImageUrl;

    if (type === 'gallery') {
      return (
        <div className="cms-preview">
          <h2>{title}</h2>
          <p className="meta">{toLocalizedText(item.description, language)}</p>
          <div className="cms-preview__gallery">
            {(item.items || []).map((media, index) => (
              <figure key={`preview-media-${index}`}>
                {media.mediaType === 'video' ? (
                  <video src={media.mediaUrl} controls />
                ) : (
                  <img src={media.thumbnailUrl || media.mediaUrl} alt={toLocalizedText(media.caption, language)} />
                )}
                {toLocalizedText(media.caption, language) ? (
                  <figcaption className="meta">{toLocalizedText(media.caption, language)}</figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </div>
      );
    }

    const summary = toLocalizedText(item.summary || item.excerpt, language);
    const body = toLocalizedText(item.content || item.body, language);

    return (
      <div className="cms-preview">
        {cover ? <img className="cms-preview__cover" src={cover} alt={title} /> : null}
        <h2>{title}</h2>
        {summary ? <p className="cms-preview__lead">{summary}</p> : null}
        <RichTextPreview html={body} />
      </div>
    );
  };

  return (
    <section className="page-wrap desk-page cms-page">
      <div className="section-head">
        <h1>{t('title')}</h1>
        <button type="button" className="btn btn-ghost" onClick={reload}>
          {t('refresh')}
        </button>
      </div>

      <p className="meta">{t('lead')}</p>

      {error && <p className="error-text">{error}</p>}

      <article className="surface-card">
        <div className="action-row">
          {['pages', 'news', 'blogs', 'gallery'].map((section) => (
            <button
              key={section}
              type="button"
              className={`btn ${activeSection === section ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => switchSection(section)}
            >
              {toLocalizedText(SECTION_TITLES[section], language)}
            </button>
          ))}
          <button type="button" className="btn btn-ghost" onClick={resetForms}>
            {t('resetForms')}
          </button>
        </div>
      </article>

      <article className="surface-card">
        <div className="section-head section-head-tight">
          <h3>
            {activeFormId
              ? `${t('editing')} ${activeFormTitle || t('untitled')}`
              : `${t('newPrefix')} ${sectionTitle}`}
          </h3>
          {activeFormId ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEdit}>
              {t('cancelEdit')}
            </button>
          ) : null}
        </div>
        <p className="meta">{t('workflowHint')}</p>

        {activeSection === 'pages' && (
          <PageForm
            form={pageForm}
            sourceLanguage={pageSourceLanguage}
            onFieldChange={makeFieldChange(setPageForm)}
            onLocalizedChange={onPageLocalizedChange}
            onWorkflowChange={onPageWorkflowChange}
            onSeoChange={onPageSeoChange}
            onSubmit={submitPage}
          />
        )}

        {activeSection === 'news' && (
          <NewsForm
            form={newsForm}
            sourceLanguage={newsSourceLanguage}
            onFieldChange={makeFieldChange(setNewsForm)}
            onLocalizedChange={onNewsLocalizedChange}
            onWorkflowChange={onNewsWorkflowChange}
            onSeoChange={onNewsSeoChange}
            onSubmit={submitNews}
          />
        )}

        {activeSection === 'blogs' && (
          <BlogForm
            form={blogForm}
            sourceLanguage={blogSourceLanguage}
            onFieldChange={makeFieldChange(setBlogForm)}
            onLocalizedChange={onBlogLocalizedChange}
            onWorkflowChange={onBlogWorkflowChange}
            onSeoChange={onBlogSeoChange}
            onSubmit={submitBlog}
          />
        )}

        {activeSection === 'gallery' && (
          <GalleryForm
            form={galleryForm}
            sourceLanguage={gallerySourceLanguage}
            onFieldChange={makeFieldChange(setGalleryForm)}
            onLocalizedChange={onGalleryLocalizedChange}
            onWorkflowChange={onGalleryWorkflowChange}
            onSubmit={submitGallery}
            onAddItem={addGalleryItem}
            onRemoveItem={removeGalleryItem}
            onItemChange={updateGalleryItem}
            onItemCaptionChange={updateGalleryItemCaption}
          />
        )}
      </article>

      <article className="surface-card">
        <div className="section-head section-head-tight">
          <h3>
            {t('existing')} {sectionTitle}
          </h3>
          <span className="meta">
            {total} {t('total')}
          </span>
        </div>

        <div className="cms-toolbar">
          <input
            type="search"
            className="cms-toolbar__search"
            placeholder={`${t('searchPrefix')} ${sectionTitle}...`}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setListPage(1);
            }}
          />
          <select
            className="cms-toolbar__filter"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setListPage(1);
              syncUrlParams(activeSection, event.target.value);
            }}
          >
            <option value="">{t('allStatuses')}</option>
            <option value="draft">{t('draft')}</option>
            <option value="published">{t('published')}</option>
          </select>
        </div>

        {loading && (
          <p>
            {t('loadingPrefix')} {sectionTitle}...
          </p>
        )}
        {!loading && !items.length && <p className="meta">{t('noItems')}</p>}

        {activeSection === 'pages' &&
          items.map((item) => (
            <article key={item._id} className="surface-card inner-card">
              <div className="section-head section-head-tight">
                <h4>{toLocalizedText(item.title, language)}</h4>
                {renderActions('pages', item)}
              </div>
              {renderStatusMeta(item, ` • ${t('slug')}: ${item.slug}`)}
            </article>
          ))}

        {activeSection === 'news' &&
          items.map((item) => (
            <article key={item._id} className="surface-card inner-card">
              <div className="section-head section-head-tight">
                <h4>{toLocalizedText(item.title, language)}</h4>
                {renderActions('news', item)}
              </div>
              {renderStatusMeta(item, ` • ${t('typeLabel')}: ${item.category || 'news'}`)}
            </article>
          ))}

        {activeSection === 'blogs' &&
          items.map((item) => (
            <article key={item._id} className="surface-card inner-card">
              <div className="section-head section-head-tight">
                <h4>{toLocalizedText(item.title, language)}</h4>
                {renderActions('blogs', item)}
              </div>
              {renderStatusMeta(item, ` • ${t('slug')}: ${item.slug}`)}
            </article>
          ))}

        {activeSection === 'gallery' &&
          items.map((item) => (
            <article key={item._id} className="surface-card inner-card">
              <div className="section-head section-head-tight">
                <h4>{toLocalizedText(item.title, language)}</h4>
                {renderActions('gallery', item)}
              </div>
              {renderStatusMeta(item, ` • ${t('mediaItems')}: ${item.items?.length || 0}`)}
            </article>
          ))}

        {totalPages > 1 && (
          <div className="cms-pager">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={listPage <= 1}
              onClick={() => setListPage((current) => Math.max(1, current - 1))}
            >
              {t('previous')}
            </button>
            <span className="meta">
              {t('pageOf')} {listPage} {t('ofWord')} {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={listPage >= totalPages}
              onClick={() => setListPage((current) => Math.min(totalPages, current + 1))}
            >
              {t('next')}
            </button>
          </div>
        )}
      </article>

      <Modal
        isOpen={preview.open}
        onClose={() => setPreview({ open: false, type: '', item: null })}
        title={t('previewTitle')}
        size="lg"
      >
        {renderPreviewBody()}
      </Modal>

      <ConfirmDialog
        isOpen={confirm.open}
        onClose={() => setConfirm({ open: false, type: '', item: null })}
        onConfirm={confirmDelete}
        title={t('deleteTitle')}
        message={
          confirm.item
            ? toLocalizedText(
                {
                  en: `“${toLocalizedText(confirm.item.title, language) || confirm.item.slug}” will be permanently removed. This cannot be undone.`,
                  bn: `“${toLocalizedText(confirm.item.title, language) || confirm.item.slug}” স্থায়ীভাবে মুছে ফেলা হবে। এটি ফেরানো যাবে না।`
                },
                language
              )
            : ''
        }
        confirmLabel={t('deleteBtn')}
        busy={deleting}
      />
    </section>
  );
}

export default CmsStudioPage;
