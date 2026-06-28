import { useState, useEffect } from 'react';

function ReviewModal({
  isOpen,
  onClose,
  currentStatus,
  fallbackCategoryCode,
  initialStatus = 'under_review',
  categories = [],
  onConfirm
}) {
  const [status, setStatus] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [awardedCategoryCode, setAwardedCategoryCode] = useState('');
  const [awardedAmount, setAwardedAmount] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setStatus(initialStatus || currentStatus || 'under_review');
      setDecisionNote('');
      setAwardedCategoryCode(fallbackCategoryCode || categories[0]?.code || '');
      setAwardedAmount('');
      setErrors({});
    }
  }, [isOpen, currentStatus, fallbackCategoryCode, initialStatus, categories]);

  const validate = () => {
    const newErrors = {};

    if (status === 'approved' && categories.length && !awardedCategoryCode) {
      newErrors.awardedCategoryCode = 'Select an award category before approving.';
    }

    if (awardedAmount && (Number(awardedAmount) < 0 || Number.isNaN(Number(awardedAmount)))) {
      newErrors.awardedAmount = 'Award amount must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (validate()) {
      onConfirm({
        status,
        decisionNote,
        awardedCategoryCode: awardedCategoryCode || undefined,
        awardedAmount: awardedAmount ? Number(awardedAmount) : undefined
      });
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-content"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
      >
        <div className="modal-header">
          <h2 id="review-modal-title">Review Application</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body form-grid">
          <label htmlFor="review-status">
            Decision *
            <select
              id="review-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              required
            >
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>

          <label htmlFor="decision-note">
            Decision Note
            <textarea
              id="decision-note"
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
              placeholder="Add notes about this decision..."
              rows={3}
              maxLength={1000}
            />
          </label>

          {status === 'approved' && (
            <>
              {categories.length ? (
                <label htmlFor="awarded-category">
                  Award Category *
                  <select
                    id="awarded-category"
                    value={awardedCategoryCode}
                    onChange={(event) => setAwardedCategoryCode(event.target.value)}
                    required
                    aria-invalid={errors.awardedCategoryCode ? 'true' : 'false'}
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.code} value={category.code}>
                        {category.name?.en || category.code} ({category.amount})
                      </option>
                    ))}
                  </select>
                  {errors.awardedCategoryCode && (
                    <p className="form-error" role="alert">
                      {errors.awardedCategoryCode}
                    </p>
                  )}
                </label>
              ) : (
                <label htmlFor="awarded-category">
                  Award Category (optional)
                  <input
                    id="awarded-category"
                    type="text"
                    value={awardedCategoryCode}
                    onChange={(event) => setAwardedCategoryCode(event.target.value)}
                    placeholder="e.g., merit"
                  />
                </label>
              )}

              <label htmlFor="awarded-amount">
                Award Amount (optional)
                <input
                  id="awarded-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={awardedAmount}
                  onChange={(event) => setAwardedAmount(event.target.value)}
                  placeholder="0.00"
                  aria-invalid={errors.awardedAmount ? 'true' : 'false'}
                />
                {errors.awardedAmount && (
                  <p className="form-error" role="alert">
                    {errors.awardedAmount}
                  </p>
                )}
              </label>
            </>
          )}

          <div className="modal-footer inline-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Decision
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReviewModal;
