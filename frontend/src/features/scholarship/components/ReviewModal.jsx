import { useState, useEffect, useMemo } from 'react';
import Modal from '../../../components/ui/Modal';
import useLanguage from '../../../hooks/useLanguage';
import { useAuth } from '../../../context/AuthContext';
import { toLocalizedText } from '../../../utils/localized';
import { nextReviewSteps } from '../workflow';

const T = {
  selectAwardErr: { en: 'Select an award category before approving.', bn: 'অনুমোদনের আগে একটি পুরস্কার বিভাগ নির্বাচন করুন।' },
  amountErr: { en: 'Award amount must be a positive number', bn: 'পুরস্কারের পরিমাণ একটি ধনাত্মক সংখ্যা হতে হবে' },
  title: { en: 'Review Application', bn: 'আবেদন পর্যালোচনা' },
  decision: { en: 'Decision *', bn: 'সিদ্ধান্ত *' },
  documents_verified: { en: 'Verify Documents', bn: 'নথি যাচাই করুন' },
  underReview: { en: 'Move to Under Review', bn: 'পর্যালোচনাধীন করুন' },
  shortlisted: { en: 'Shortlist', bn: 'সংক্ষিপ্ত তালিকাভুক্ত করুন' },
  approved: { en: 'Approve (Award)', bn: 'অনুমোদন (পুরস্কার)' },
  rejected: { en: 'Reject', bn: 'প্রত্যাখ্যান' },
  decisionNote: { en: 'Decision Note', bn: 'সিদ্ধান্ত নোট' },
  notePlaceholder: { en: 'Add notes about this decision...', bn: 'এই সিদ্ধান্ত সম্পর্কে নোট যোগ করুন...' },
  awardCategoryReq: { en: 'Award Category *', bn: 'পুরস্কার বিভাগ *' },
  selectCategory: { en: 'Select category', bn: 'বিভাগ নির্বাচন করুন' },
  awardCategoryOptional: { en: 'Award Category (optional)', bn: 'পুরস্কার বিভাগ (ঐচ্ছিক)' },
  awardAmountOptional: { en: 'Award Amount (optional)', bn: 'পুরস্কারের পরিমাণ (ঐচ্ছিক)' },
  cancel: { en: 'Cancel', bn: 'বাতিল' },
  saveDecision: { en: 'Save Decision', bn: 'সিদ্ধান্ত সংরক্ষণ' },
  currentStep: { en: 'Current step', bn: 'বর্তমান ধাপ' },
  noActions: { en: 'No review actions are available to you at this stage.', bn: 'এই পর্যায়ে আপনার জন্য কোনো পর্যালোচনা পদক্ষেপ উপলব্ধ নেই।' },
  history: { en: 'Review Trail', bn: 'পর্যালোচনার ধারা' }
};

// Human labels for a status value, reused for the "current step" line.
const STATUS_LABELS = {
  submitted: { en: 'Submitted', bn: 'জমা দেওয়া হয়েছে' },
  documents_verified: { en: 'Documents Verified', bn: 'নথি যাচাইকৃত' },
  under_review: { en: 'Under Review', bn: 'পর্যালোচনাধীন' },
  shortlisted: { en: 'Shortlisted', bn: 'সংক্ষিপ্ত তালিকাভুক্ত' },
  approved: { en: 'Approved', bn: 'অনুমোদিত' },
  rejected: { en: 'Rejected', bn: 'প্রত্যাখ্যাত' }
};

function ReviewModal({
  isOpen,
  onClose,
  currentStatus,
  fallbackCategoryCode,
  initialStatus = 'under_review',
  categories = [],
  reviewHistory = [],
  onConfirm
}) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const t = (key) => toLocalizedText(T[key], language);
  const [status, setStatus] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [awardedCategoryCode, setAwardedCategoryCode] = useState('');
  const [awardedAmount, setAwardedAmount] = useState('');
  const [errors, setErrors] = useState({});

  // Only the transitions this user is permitted to make from the current step.
  const availableSteps = useMemo(
    () => nextReviewSteps(currentStatus || 'submitted', user?.roles || []),
    [currentStatus, user]
  );

  useEffect(() => {
    if (isOpen) {
      // Prefer the caller's suggested step if it is legal, else the first
      // available step so the form never opens on an invalid transition.
      const preferred = initialStatus && availableSteps.includes(initialStatus)
        ? initialStatus
        : availableSteps[0] || '';
      setStatus(preferred);
      setDecisionNote('');
      setAwardedCategoryCode(fallbackCategoryCode || categories[0]?.code || '');
      setAwardedAmount('');
      setErrors({});
    }
  }, [isOpen, currentStatus, fallbackCategoryCode, initialStatus, categories, availableSteps]);

  const validate = () => {
    const newErrors = {};

    if (status === 'approved' && categories.length && !awardedCategoryCode) {
      newErrors.awardedCategoryCode = t('selectAwardErr');
    }

    if (awardedAmount && (Number(awardedAmount) < 0 || Number.isNaN(Number(awardedAmount)))) {
      newErrors.awardedAmount = t('amountErr');
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('title')}>
      <form onSubmit={handleSubmit} className="modal-form form-grid">
          <p className="meta">
            {t('currentStep')}: {toLocalizedText(STATUS_LABELS[currentStatus] || {}, language) || currentStatus}
          </p>

          {!!reviewHistory.length && (
            <div className="review-trail">
              <span className="meta">{t('history')}</span>
              <ol className="review-trail__list">
                {reviewHistory.map((entry, index) => (
                  <li key={`${entry.toStatus}-${entry.at}-${index}`} className="review-trail__item">
                    <span className="review-trail__status">
                      {toLocalizedText(STATUS_LABELS[entry.toStatus] || {}, language) || entry.toStatus}
                    </span>
                    <span className="meta">
                      {entry.actorRole ? `${entry.actorRole} • ` : ''}
                      {entry.at ? new Date(entry.at).toLocaleString() : ''}
                    </span>
                    {entry.note && <span className="review-trail__note">{entry.note}</span>}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {!availableSteps.length ? (
            <p className="form-error" role="alert">{t('noActions')}</p>
          ) : (
            <label htmlFor="review-status">
              {t('decision')}
              <select
                id="review-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                required
              >
                {availableSteps.map((step) => (
                  <option key={step} value={step}>
                    {t(step === 'under_review' ? 'underReview' : step)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label htmlFor="decision-note">
            {t('decisionNote')}
            <textarea
              id="decision-note"
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
              placeholder={t('notePlaceholder')}
              rows={3}
              maxLength={1000}
            />
          </label>

          {status === 'approved' && (
            <>
              {categories.length ? (
                <label htmlFor="awarded-category">
                  {t('awardCategoryReq')}
                  <select
                    id="awarded-category"
                    value={awardedCategoryCode}
                    onChange={(event) => setAwardedCategoryCode(event.target.value)}
                    required
                    aria-invalid={errors.awardedCategoryCode ? 'true' : 'false'}
                  >
                    <option value="">{t('selectCategory')}</option>
                    {categories.map((category) => (
                      <option key={category.code} value={category.code}>
                        {category.name?.[language] || category.name?.en || category.code} ({category.amount})
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
                  {t('awardCategoryOptional')}
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
                {t('awardAmountOptional')}
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

          <div className="modal-form__actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t('cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={!availableSteps.length}>
              {t('saveDecision')}
            </button>
          </div>
        </form>
    </Modal>
  );
}

export default ReviewModal;
