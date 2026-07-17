import { useState, useEffect } from 'react';
import useLanguage from '../../../hooks/useLanguage';
import { toLocalizedText } from '../../../utils/localized';

const T = {
  statementRequired: { en: 'Statement is required', bn: 'বিবৃতি আবশ্যক' },
  statementMin: { en: 'Statement must be at least 30 characters', bn: 'বিবৃতি কমপক্ষে ৩০ অক্ষরের হতে হবে' },
  statementMax: { en: 'Statement must be less than 5000 characters', bn: 'বিবৃতি ৫০০০ অক্ষরের কম হতে হবে' },
  gpaRequired: { en: 'GPA is required', bn: 'জিপিএ আবশ্যক' },
  gpaRange: { en: 'GPA must be between 0 and 4', bn: 'জিপিএ ০ থেকে ৪ এর মধ্যে হতে হবে' },
  departmentRequired: { en: 'Department is required', bn: 'বিভাগ আবশ্যক' },
  selectCategoryErr: { en: 'Please select a category', bn: 'অনুগ্রহ করে একটি বিভাগ নির্বাচন করুন' },
  selectToApply: { en: 'Select a scholarship notice to apply.', bn: 'আবেদন করতে একটি বৃত্তি বিজ্ঞপ্তি নির্বাচন করুন।' },
  windowClosed: { en: 'Application window is closed for this scholarship.', bn: 'এই বৃত্তির আবেদন সময়সীমা বন্ধ।' },
  applyHeading: { en: 'Apply for Scholarship', bn: 'বৃত্তির জন্য আবেদন করুন' },
  personalStatement: { en: 'Personal Statement *', bn: 'ব্যক্তিগত বিবৃতি *' },
  charHint: { en: '30-5000 characters', bn: '৩০-৫০০০ অক্ষর' },
  statementPlaceholder: { en: 'Explain why you deserve this scholarship...', bn: 'কেন আপনি এই বৃত্তির যোগ্য তা ব্যাখ্যা করুন...' },
  gpaLabel: { en: 'GPA *', bn: 'জিপিএ *' },
  departmentLabel: { en: 'Department *', bn: 'বিভাগ *' },
  departmentPlaceholder: { en: 'e.g., Computer Science', bn: 'যেমন, কম্পিউটার সায়েন্স' },
  categoryLabel: { en: 'Scholarship Category *', bn: 'বৃত্তির বিভাগ *' },
  selectCategory: { en: 'Select a category', bn: 'একটি বিভাগ নির্বাচন করুন' },
  submitting: { en: 'Submitting...', bn: 'জমা হচ্ছে...' },
  submitApplication: { en: 'Submit Application', bn: 'আবেদন জমা দিন' }
};

function ApplicationForm({
  notice,
  categories,
  applicationForm,
  onFormChange,
  onSubmit,
  isSubmitting,
  isClosed
}) {
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setErrors({});
  }, [notice?._id]);

  const validate = () => {
    const newErrors = {};

    if (!applicationForm.statement.trim()) {
      newErrors.statement = t('statementRequired');
    } else if (applicationForm.statement.length < 30) {
      newErrors.statement = t('statementMin');
    } else if (applicationForm.statement.length > 5000) {
      newErrors.statement = t('statementMax');
    }

    if (!applicationForm.gpa) {
      newErrors.gpa = t('gpaRequired');
    } else if (Number(applicationForm.gpa) < 0 || Number(applicationForm.gpa) > 4) {
      newErrors.gpa = t('gpaRange');
    }

    if (!applicationForm.department.trim()) {
      newErrors.department = t('departmentRequired');
    }

    if (categories.length > 0 && !applicationForm.selectedCategoryCode) {
      newErrors.selectedCategoryCode = t('selectCategoryErr');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(e);
    }
  };

  if (!notice) {
    return (
      <div className="application-form-placeholder">
        <p>{t('selectToApply')}</p>
      </div>
    );
  }

  if (isClosed) {
    return (
      <div className="application-form-placeholder">
        <p className="closed-notice">{t('windowClosed')}</p>
      </div>
    );
  }

  return (
    <form id="scholarship-application-form" className="application-form" onSubmit={handleSubmit}>
      <h3 className="section-header">{t('applyHeading')}</h3>

      <div className="form-group">
        <label htmlFor="statement">
          {t('personalStatement')}
          <span className="form-hint">{t('charHint')}</span>
        </label>
        <textarea
          id="statement"
          value={applicationForm.statement}
          onChange={(e) => onFormChange({ ...applicationForm, statement: e.target.value })}
          placeholder={t('statementPlaceholder')}
          rows={6}
          maxLength={5000}
          aria-invalid={errors.statement ? 'true' : 'false'}
          aria-describedby={errors.statement ? 'statement-error' : undefined}
        />
        {errors.statement && (
          <p id="statement-error" className="form-error" role="alert">
            {errors.statement}
          </p>
        )}
        <p className="char-count">
          {applicationForm.statement.length} / 5000
        </p>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="gpa">{t('gpaLabel')}</label>
          <input
            id="gpa"
            type="number"
            step="0.01"
            min="0"
            max="4"
            value={applicationForm.gpa}
            onChange={(e) => onFormChange({ ...applicationForm, gpa: e.target.value })}
            placeholder="0.00 - 4.00"
            aria-invalid={errors.gpa ? 'true' : 'false'}
            aria-describedby={errors.gpa ? 'gpa-error' : undefined}
          />
          {errors.gpa && (
            <p id="gpa-error" className="form-error" role="alert">
              {errors.gpa}
            </p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="department">{t('departmentLabel')}</label>
          <input
            id="department"
            type="text"
            value={applicationForm.department}
            onChange={(e) => onFormChange({ ...applicationForm, department: e.target.value })}
            placeholder={t('departmentPlaceholder')}
            maxLength={120}
            aria-invalid={errors.department ? 'true' : 'false'}
            aria-describedby={errors.department ? 'department-error' : undefined}
          />
          {errors.department && (
            <p id="department-error" className="form-error" role="alert">
              {errors.department}
            </p>
          )}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="form-group">
          <label htmlFor="category">{t('categoryLabel')}</label>
          <select
            id="category"
            value={applicationForm.selectedCategoryCode}
            onChange={(e) => onFormChange({ ...applicationForm, selectedCategoryCode: e.target.value })}
            aria-invalid={errors.selectedCategoryCode ? 'true' : 'false'}
            aria-describedby={errors.selectedCategoryCode ? 'category-error' : undefined}
          >
            <option value="">{t('selectCategory')}</option>
            {categories.map((cat) => (
              <option key={cat.code} value={cat.code}>
                {cat.name[language]} - ${cat.amount}
              </option>
            ))}
          </select>
          {errors.selectedCategoryCode && (
            <p id="category-error" className="form-error" role="alert">
              {errors.selectedCategoryCode}
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={isSubmitting}
      >
        {isSubmitting ? t('submitting') : t('submitApplication')}
      </button>
    </form>
  );
}

export default ApplicationForm;
