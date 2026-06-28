import { useState } from 'react';
import useLanguage from '../../hooks/useLanguage';

const createEmptyCategory = () => ({
  code: '',
  nameEn: '',
  nameBn: '',
  amount: '',
  slots: 1
});

function NoticeEditor({ notice, onSave, onCancel, isEdit = false }) {
  const { language } = useLanguage();
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
        throw new Error('Category codes must be unique.');
      }
      codes.add(item.code);
    }

    return normalized;
  };

  const validate = () => {
    const newErrors = {};

    if (!form.title.en.trim()) newErrors.titleEn = 'English title is required';
    if (!form.title.bn.trim()) newErrors.titleBn = 'Bangla title is required';
    if (!form.description.en.trim()) newErrors.descriptionEn = 'English description is required';
    if (!form.description.bn.trim()) newErrors.descriptionBn = 'Bangla description is required';
    if (!form.eligibility.en.trim()) newErrors.eligibilityEn = 'English eligibility is required';
    if (!form.eligibility.bn.trim()) newErrors.eligibilityBn = 'Bangla eligibility is required';
    if (!form.applicationWindowStart) newErrors.applicationWindowStart = 'Window start is required';
    if (!form.applicationWindowEnd) newErrors.applicationWindowEnd = 'Window end is required';
    if (!form.deadline) newErrors.deadline = 'Deadline is required';

    if (form.applicationWindowStart >= form.applicationWindowEnd) {
      newErrors.applicationWindowEnd = 'Window end must be after window start';
    }

    if (form.applicationWindowEnd > form.deadline) {
      newErrors.deadline = 'Deadline must be after window end';
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
        <h3>{isEdit ? 'Edit Scholarship Notice' : 'Create Scholarship Notice'}</h3>
        <div className="editor-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>

      {errors.general && <p className="form-error form-error--block">{errors.general}</p>}

      <div className="form-section">
        <h4>Basic Information</h4>
        
        <div className="form-group">
          <label>Title (English) *</label>
          <input
            type="text"
            value={form.title.en}
            onChange={(e) => updateLocalized('title', 'en', e.target.value)}
            aria-invalid={errors.titleEn ? 'true' : 'false'}
          />
          {errors.titleEn && <p className="form-error">{errors.titleEn}</p>}
        </div>

        <div className="form-group">
          <label>Title (Bangla) *</label>
          <input
            type="text"
            value={form.title.bn}
            onChange={(e) => updateLocalized('title', 'bn', e.target.value)}
            aria-invalid={errors.titleBn ? 'true' : 'false'}
          />
          {errors.titleBn && <p className="form-error">{errors.titleBn}</p>}
        </div>

        <div className="form-group">
          <label>Description (English) *</label>
          <textarea
            value={form.description.en}
            onChange={(e) => updateLocalized('description', 'en', e.target.value)}
            rows={4}
            aria-invalid={errors.descriptionEn ? 'true' : 'false'}
          />
          {errors.descriptionEn && <p className="form-error">{errors.descriptionEn}</p>}
        </div>

        <div className="form-group">
          <label>Description (Bangla) *</label>
          <textarea
            value={form.description.bn}
            onChange={(e) => updateLocalized('description', 'bn', e.target.value)}
            rows={4}
            aria-invalid={errors.descriptionBn ? 'true' : 'false'}
          />
          {errors.descriptionBn && <p className="form-error">{errors.descriptionBn}</p>}
        </div>

        <div className="form-group">
          <label>Eligibility (English) *</label>
          <textarea
            value={form.eligibility.en}
            onChange={(e) => updateLocalized('eligibility', 'en', e.target.value)}
            rows={3}
            aria-invalid={errors.eligibilityEn ? 'true' : 'false'}
          />
          {errors.eligibilityEn && <p className="form-error">{errors.eligibilityEn}</p>}
        </div>

        <div className="form-group">
          <label>Eligibility (Bangla) *</label>
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
        <h4>Timing & Status</h4>
        
        <div className="form-row">
          <div className="form-group">
            <label>Scholarship Type</label>
            <select
              value={form.scholarshipType}
              onChange={(e) => setForm({ ...form, scholarshipType: e.target.value })}
            >
              <option value="one_off">One-time</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Application Window Start *</label>
            <input
              type="date"
              value={form.applicationWindowStart}
              onChange={(e) => setForm({ ...form, applicationWindowStart: e.target.value })}
              aria-invalid={errors.applicationWindowStart ? 'true' : 'false'}
            />
            {errors.applicationWindowStart && <p className="form-error">{errors.applicationWindowStart}</p>}
          </div>

          <div className="form-group">
            <label>Application Window End *</label>
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
          <label>Deadline *</label>
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
          <h4>Categories</h4>
          <button type="button" className="btn btn-sm btn-outline" onClick={addCategoryRow}>
            + Add Category
          </button>
        </div>

        {form.categories.map((category, index) => (
          <div key={index} className="category-row">
            <div className="form-row">
              <div className="form-group">
                <label>Code</label>
                <input
                  type="text"
                  value={category.code}
                  onChange={(e) => updateCategoryField(index, 'code', e.target.value)}
                  placeholder="e.g., merit"
                  pattern="[a-z0-9_-]+"
                />
              </div>

              <div className="form-group">
                <label>Amount</label>
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
                <label>Slots</label>
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
                <label>Name (English)</label>
                <input
                  type="text"
                  value={category.nameEn}
                  onChange={(e) => updateCategoryField(index, 'nameEn', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Name (Bangla)</label>
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
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </form>
  );
}

export default NoticeEditor;
