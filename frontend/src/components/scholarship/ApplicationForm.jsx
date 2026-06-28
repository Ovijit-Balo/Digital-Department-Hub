import { useState, useEffect } from 'react';
import useLanguage from '../../hooks/useLanguage';
import { ui } from '../../i18n/publicUi';

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
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setErrors({});
  }, [notice?._id]);

  const validate = () => {
    const newErrors = {};
    
    if (!applicationForm.statement.trim()) {
      newErrors.statement = 'Statement is required';
    } else if (applicationForm.statement.length < 30) {
      newErrors.statement = 'Statement must be at least 30 characters';
    } else if (applicationForm.statement.length > 5000) {
      newErrors.statement = 'Statement must be less than 5000 characters';
    }

    if (!applicationForm.gpa) {
      newErrors.gpa = 'GPA is required';
    } else if (Number(applicationForm.gpa) < 0 || Number(applicationForm.gpa) > 4) {
      newErrors.gpa = 'GPA must be between 0 and 4';
    }

    if (!applicationForm.department.trim()) {
      newErrors.department = 'Department is required';
    }

    if (categories.length > 0 && !applicationForm.selectedCategoryCode) {
      newErrors.selectedCategoryCode = 'Please select a category';
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
        <p>Select a scholarship notice to apply.</p>
      </div>
    );
  }

  if (isClosed) {
    return (
      <div className="application-form-placeholder">
        <p className="closed-notice">Application window is closed for this scholarship.</p>
      </div>
    );
  }

  return (
    <form id="scholarship-application-form" className="application-form" onSubmit={handleSubmit}>
      <h3 className="section-header">Apply for Scholarship</h3>
      
      <div className="form-group">
        <label htmlFor="statement">
          Personal Statement *
          <span className="form-hint">30-5000 characters</span>
        </label>
        <textarea
          id="statement"
          value={applicationForm.statement}
          onChange={(e) => onFormChange({ ...applicationForm, statement: e.target.value })}
          placeholder="Explain why you deserve this scholarship..."
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
          <label htmlFor="gpa">GPA *</label>
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
          <label htmlFor="department">Department *</label>
          <input
            id="department"
            type="text"
            value={applicationForm.department}
            onChange={(e) => onFormChange({ ...applicationForm, department: e.target.value })}
            placeholder="e.g., Computer Science"
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
          <label htmlFor="category">Scholarship Category *</label>
          <select
            id="category"
            value={applicationForm.selectedCategoryCode}
            onChange={(e) => onFormChange({ ...applicationForm, selectedCategoryCode: e.target.value })}
            aria-invalid={errors.selectedCategoryCode ? 'true' : 'false'}
            aria-describedby={errors.selectedCategoryCode ? 'category-error' : undefined}
          >
            <option value="">Select a category</option>
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
        {isSubmitting ? 'Submitting...' : 'Submit Application'}
      </button>
    </form>
  );
}

export default ApplicationForm;
