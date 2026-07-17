import { useState } from 'react';
import useLanguage from '../../../hooks/useLanguage';
import { toLocalizedText } from '../../../utils/localized';

const T = {
  titleEnReq: { en: 'English title is required', bn: 'ইংরেজি শিরোনাম আবশ্যক' },
  titleBnReq: { en: 'Bangla title is required', bn: 'বাংলা শিরোনাম আবশ্যক' },
  descEnReq: { en: 'English description is required', bn: 'ইংরেজি বিবরণ আবশ্যক' },
  descBnReq: { en: 'Bangla description is required', bn: 'বাংলা বিবরণ আবশ্যক' },
  eligEnReq: { en: 'English eligibility is required', bn: 'ইংরেজি যোগ্যতা আবশ্যক' },
  eligBnReq: { en: 'Bangla eligibility is required', bn: 'বাংলা যোগ্যতা আবশ্যক' },
  windowStartReq: { en: 'Window start is required', bn: 'সময়সীমার শুরু আবশ্যক' },
  windowEndReq: { en: 'Window end is required', bn: 'সময়সীমার শেষ আবশ্যক' },
  deadlineReq: { en: 'Deadline is required', bn: 'শেষ তারিখ আবশ্যক' },
  windowEndAfter: { en: 'Window end must be after window start', bn: 'সময়সীমার শেষ শুরুর পরে হতে হবে' },
  deadlineAfter: { en: 'Deadline must be after window end', bn: 'শেষ তারিখ সময়সীমার শেষের পরে হতে হবে' },
  uniqueCodes: { en: 'Category codes must be unique.', bn: 'বিভাগ কোড অনন্য হতে হবে।' },
  editHeading: { en: 'Edit Scholarship Notice', bn: 'বৃত্তি বিজ্ঞপ্তি সম্পাদনা' },
  createHeading: { en: 'Create Scholarship Notice', bn: 'বৃত্তি বিজ্ঞপ্তি তৈরি' },
  cancel: { en: 'Cancel', bn: 'বাতিল' },
  update: { en: 'Update', bn: 'আপডেট' },
  create: { en: 'Create', bn: 'তৈরি' },
  basicInfo: { en: 'Basic Information', bn: 'মৌলিক তথ্য' },
  titleEn: { en: 'Title (English) *', bn: 'শিরোনাম (ইংরেজি) *' },
  titleBn: { en: 'Title (Bangla) *', bn: 'শিরোনাম (বাংলা) *' },
  descEn: { en: 'Description (English) *', bn: 'বিবরণ (ইংরেজি) *' },
  descBn: { en: 'Description (Bangla) *', bn: 'বিবরণ (বাংলা) *' },
  eligEn: { en: 'Eligibility (English) *', bn: 'যোগ্যতা (ইংরেজি) *' },
  eligBn: { en: 'Eligibility (Bangla) *', bn: 'যোগ্যতা (বাংলা) *' },
  timingStatus: { en: 'Timing & Status', bn: 'সময় ও অবস্থা' },
  scholarshipType: { en: 'Scholarship Type', bn: 'বৃত্তির ধরন' },
  oneTime: { en: 'One-time', bn: 'এককালীন' },
  monthly: { en: 'Monthly', bn: 'মাসিক' },
  status: { en: 'Status', bn: 'অবস্থা' },
  draft: { en: 'Draft', bn: 'খসড়া' },
  open: { en: 'Open', bn: 'খোলা' },
  closed: { en: 'Closed', bn: 'বন্ধ' },
  windowStart: { en: 'Application Window Start *', bn: 'আবেদন সময়সীমার শুরু *' },
  windowEnd: { en: 'Application Window End *', bn: 'আবেদন সময়সীমার শেষ *' },
  deadline: { en: 'Deadline *', bn: 'শেষ তারিখ *' },
  categories: { en: 'Categories', bn: 'বিভাগসমূহ' },
  addCategory: { en: '+ Add Category', bn: '+ বিভাগ যোগ করুন' },
  code: { en: 'Code', bn: 'কোড' },
  amount: { en: 'Amount', bn: 'পরিমাণ' },
  slots: { en: 'Slots', bn: 'স্লট' },
  nameEn: { en: 'Name (English)', bn: 'নাম (ইংরেজি)' },
  nameBn: { en: 'Name (Bangla)', bn: 'নাম (বাংলা)' },
  remove: { en: 'Remove', bn: 'সরান' }
};

const createEmptyCategory = () => ({
  code: '',
  nameEn: '',
  nameBn: '',
  amount: '',
  slots: 1
});

function NoticeEditor({ notice, onSave, onCancel, isEdit = false }) {
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);
  const [form, setForm] = useState(
    notice
      ? {
          title: { en: notice.title?.en || '', bn: notice.title?.bn || '' },
          description: { en: notice.description?.en || '', bn: notice.description?.bn || '' },
          eligibility: { en: notice.eligibility?.en || '', bn: notice.eligibility?.bn || '' },
          scholarshipType: notice.scholarshipType || 'one_off',
          applicationWindowStart: notice.applicationWindowStart?.split('T')[0] || '',
          applicationWindowEnd: notice.applicationWindowEnd?.split('T')[0] || '',
          deadline: notice.deadline?.split('T')[0] || '',
          status: notice.status || 'draft',
          categories: (notice.categories || []).length
            ? notice.categories.map((cat) => ({
                code: cat.code || '',
                nameEn: cat.name?.en || '',
                nameBn: cat.name?.bn || '',
                amount: cat.amount ?? '',
                slots: cat.slots ?? 1
              }))
            : [createEmptyCategory()]
        }
      : {
          title: { en: '', bn: '' },
          description: { en: '', bn: '' },
          eligibility: { en: '', bn: '' },
          scholarshipType: 'one_off',
          applicationWindowStart: '',
          applicationWindowEnd: '',
          deadline: '',
          status: 'draft',
          categories: [createEmptyCategory()]
        }
  );
  const [errors, setErrors] = useState({});

  const updateLocalized = (field, locale, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: { ...prev[field], [locale]: value }
    }));
  };

  const updateCategoryField = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addCategoryRow = () => {
    setForm((prev) => ({
      ...prev,
      categories: [...prev.categories, createEmptyCategory()]
    }));
  };

  const removeCategoryRow = (index) => {
    setForm((prev) => {
      const next = prev.categories.filter((_, categoryIndex) => categoryIndex !== index);
      return {
        ...prev,
        categories: next.length ? next : [createEmptyCategory()]
      };
    });
  };

  const normalizeCategories = (categories) => {
    const normalized = categories
      .filter(
        (item) =>
          item.code.trim() &&
          item.nameEn.trim() &&
          item.nameBn.trim() &&
          item.amount !== '' &&
          Number(item.amount) >= 0
      )
      .map((item) => ({
        code: item.code.trim().toLowerCase(),
        name: {
          en: item.nameEn.trim(),
          bn: item.nameBn.trim()
        },
        amount: Number(item.amount),
        slots: Math.max(1, Number(item.slots || 1))
      }));

    if (!normalized.length) {
      return [];
    }

    const codes = new Set();
    for (const item of normalized) {
      if (codes.has(item.code)) {
        throw new Error(t('uniqueCodes'));
      }
      codes.add(item.code);
    }

    return normalized;
  };

  const validate = () => {
    const newErrors = {};

    if (!form.title.en.trim()) newErrors.titleEn = t('titleEnReq');
    if (!form.title.bn.trim()) newErrors.titleBn = t('titleBnReq');
    if (!form.description.en.trim()) newErrors.descriptionEn = t('descEnReq');
    if (!form.description.bn.trim()) newErrors.descriptionBn = t('descBnReq');
    if (!form.eligibility.en.trim()) newErrors.eligibilityEn = t('eligEnReq');
    if (!form.eligibility.bn.trim()) newErrors.eligibilityBn = t('eligBnReq');
    if (!form.applicationWindowStart) newErrors.applicationWindowStart = t('windowStartReq');
    if (!form.applicationWindowEnd) newErrors.applicationWindowEnd = t('windowEndReq');
    if (!form.deadline) newErrors.deadline = t('deadlineReq');

    if (form.applicationWindowStart >= form.applicationWindowEnd) {
      newErrors.applicationWindowEnd = t('windowEndAfter');
    }

    if (form.applicationWindowEnd > form.deadline) {
      newErrors.deadline = t('deadlineAfter');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    try {
      const categories = normalizeCategories(form.categories);
      if (!validate()) return;

      onSave({
        ...form,
        categories,
        applicationWindowStart: new Date(form.applicationWindowStart).toISOString(),
        applicationWindowEnd: new Date(form.applicationWindowEnd).toISOString(),
        deadline: new Date(form.deadline).toISOString()
      });
    } catch (err) {
      setErrors({ general: err.message });
    }
  };

  return (
    <form className="notice-editor" onSubmit={handleSubmit}>
      <div className="editor-header">
        <h3>{isEdit ? t('editHeading') : t('createHeading')}</h3>
        <div className="editor-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {t('cancel')}
          </button>
          <button type="submit" className="btn btn-primary">
            {isEdit ? t('update') : t('create')}
          </button>
        </div>
      </div>

      {errors.general && <p className="form-error form-error--block">{errors.general}</p>}

      <div className="form-section">
        <h4>{t('basicInfo')}</h4>

        <div className="form-group">
          <label>{t('titleEn')}</label>
          <input
            type="text"
            value={form.title.en}
            onChange={(e) => updateLocalized('title', 'en', e.target.value)}
            aria-invalid={errors.titleEn ? 'true' : 'false'}
          />
          {errors.titleEn && <p className="form-error">{errors.titleEn}</p>}
        </div>

        <div className="form-group">
          <label>{t('titleBn')}</label>
          <input
            type="text"
            value={form.title.bn}
            onChange={(e) => updateLocalized('title', 'bn', e.target.value)}
            aria-invalid={errors.titleBn ? 'true' : 'false'}
          />
          {errors.titleBn && <p className="form-error">{errors.titleBn}</p>}
        </div>

        <div className="form-group">
          <label>{t('descEn')}</label>
          <textarea
            value={form.description.en}
            onChange={(e) => updateLocalized('description', 'en', e.target.value)}
            rows={4}
            aria-invalid={errors.descriptionEn ? 'true' : 'false'}
          />
          {errors.descriptionEn && <p className="form-error">{errors.descriptionEn}</p>}
        </div>

        <div className="form-group">
          <label>{t('descBn')}</label>
          <textarea
            value={form.description.bn}
            onChange={(e) => updateLocalized('description', 'bn', e.target.value)}
            rows={4}
            aria-invalid={errors.descriptionBn ? 'true' : 'false'}
          />
          {errors.descriptionBn && <p className="form-error">{errors.descriptionBn}</p>}
        </div>

        <div className="form-group">
          <label>{t('eligEn')}</label>
          <textarea
            value={form.eligibility.en}
            onChange={(e) => updateLocalized('eligibility', 'en', e.target.value)}
            rows={3}
            aria-invalid={errors.eligibilityEn ? 'true' : 'false'}
          />
          {errors.eligibilityEn && <p className="form-error">{errors.eligibilityEn}</p>}
        </div>

        <div className="form-group">
          <label>{t('eligBn')}</label>
          <textarea
            value={form.eligibility.bn}
            onChange={(e) => updateLocalized('eligibility', 'bn', e.target.value)}
            rows={3}
            aria-invalid={errors.eligibilityBn ? 'true' : 'false'}
          />
          {errors.eligibilityBn && <p className="form-error">{errors.eligibilityBn}</p>}
        </div>
      </div>

      <div className="form-section">
        <h4>{t('timingStatus')}</h4>

        <div className="form-row">
          <div className="form-group">
            <label>{t('scholarshipType')}</label>
            <select
              value={form.scholarshipType}
              onChange={(e) => setForm({ ...form, scholarshipType: e.target.value })}
            >
              <option value="one_off">{t('oneTime')}</option>
              <option value="monthly">{t('monthly')}</option>
            </select>
          </div>

          <div className="form-group">
            <label>{t('status')}</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="draft">{t('draft')}</option>
              <option value="open">{t('open')}</option>
              <option value="closed">{t('closed')}</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t('windowStart')}</label>
            <input
              type="date"
              value={form.applicationWindowStart}
              onChange={(e) => setForm({ ...form, applicationWindowStart: e.target.value })}
              aria-invalid={errors.applicationWindowStart ? 'true' : 'false'}
            />
            {errors.applicationWindowStart && <p className="form-error">{errors.applicationWindowStart}</p>}
          </div>

          <div className="form-group">
            <label>{t('windowEnd')}</label>
            <input
              type="date"
              value={form.applicationWindowEnd}
              onChange={(e) => setForm({ ...form, applicationWindowEnd: e.target.value })}
              aria-invalid={errors.applicationWindowEnd ? 'true' : 'false'}
            />
            {errors.applicationWindowEnd && <p className="form-error">{errors.applicationWindowEnd}</p>}
          </div>
        </div>

        <div className="form-group">
          <label>{t('deadline')}</label>
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            aria-invalid={errors.deadline ? 'true' : 'false'}
          />
          {errors.deadline && <p className="form-error">{errors.deadline}</p>}
        </div>
      </div>

      <div className="form-section">
        <div className="section-header-with-action">
          <h4>{t('categories')}</h4>
          <button type="button" className="btn btn-sm btn-outline" onClick={addCategoryRow}>
            {t('addCategory')}
          </button>
        </div>

        {form.categories.map((category, index) => (
          <div key={index} className="category-row">
            <div className="form-row">
              <div className="form-group">
                <label>{t('code')}</label>
                <input
                  type="text"
                  value={category.code}
                  onChange={(e) => updateCategoryField(index, 'code', e.target.value)}
                  placeholder="e.g., merit"
                  pattern="[a-z0-9_-]+"
                />
              </div>

              <div className="form-group">
                <label>{t('amount')}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={category.amount}
                  onChange={(e) => updateCategoryField(index, 'amount', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label>{t('slots')}</label>
                <input
                  type="number"
                  min="1"
                  value={category.slots}
                  onChange={(e) => updateCategoryField(index, 'slots', e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{t('nameEn')}</label>
                <input
                  type="text"
                  value={category.nameEn}
                  onChange={(e) => updateCategoryField(index, 'nameEn', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>{t('nameBn')}</label>
                <input
                  type="text"
                  value={category.nameBn}
                  onChange={(e) => updateCategoryField(index, 'nameBn', e.target.value)}
                />
              </div>
            </div>

            {form.categories.length > 1 && (
              <button
                type="button"
                className="btn btn-sm btn-danger btn-ghost"
                onClick={() => removeCategoryRow(index)}
              >
                {t('remove')}
              </button>
            )}
          </div>
        ))}
      </div>
    </form>
  );
}

export default NoticeEditor;
