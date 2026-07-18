import { useState } from 'react';
import { scholarshipApi } from '../../../api/modules';
import { useToast } from '../../../context/ToastContext';
import { getApiErrorMessage } from '../../../utils/http';
import ReviewModal from './ReviewModal';
import useLanguage from '../../../hooks/useLanguage';
import { toLocalizedText } from '../../../utils/localized';

const T = {
  heading: { en: 'Applications to Review', bn: 'পর্যালোচনার আবেদন' },
  empty: { en: 'No applications to review.', bn: 'পর্যালোচনার জন্য কোনো আবেদন নেই।' },
  unknown: { en: 'Unknown', bn: 'অজানা' },
  categoryLabel: { en: 'Category:', bn: 'বিভাগ:' },
  readMore: { en: '...read more', bn: '...আরও পড়ুন' },
  review: { en: 'Review', bn: 'পর্যালোচনা' },
  reviewSaved: { en: 'Review saved', bn: 'পর্যালোচনা সংরক্ষিত' },
  reviewFailed: { en: 'Review failed', bn: 'পর্যালোচনা ব্যর্থ' },
  updateFailed: { en: 'Failed to update review status.', bn: 'পর্যালোচনার অবস্থা আপডেট করতে ব্যর্থ।' },
  applicationReviewed: { en: 'Application reviewed.', bn: 'আবেদন পর্যালোচিত।' }
};

function ReviewPanel({ applications, onRefresh }) {
  const { success, error: toastError } = useToast();
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);

  const handleReviewClick = (application) => {
    setSelectedApplication(application);
    setModalOpen(true);
  };

  const handleReviewConfirm = async (reviewData) => {
    try {
      await scholarshipApi.reviewApplication(selectedApplication._id, reviewData);
      success(t('applicationReviewed'), { title: t('reviewSaved') });
      setModalOpen(false);
      setSelectedApplication(null);
      onRefresh();
    } catch (apiError) {
      const message = getApiErrorMessage(apiError, t('updateFailed'));
      toastError(message, { title: t('reviewFailed') });
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      submitted: 'status-badge status-badge--pending',
      documents_verified: 'status-badge status-badge--review',
      under_review: 'status-badge status-badge--review',
      shortlisted: 'status-badge status-badge--review',
      approved: 'status-badge status-badge--approved',
      rejected: 'status-badge status-badge--rejected'
    };
    return styles[status] || 'status-badge';
  };

  if (applications.length === 0) {
    return (
      <div className="review-panel">
        <h3 className="section-header">{t('heading')}</h3>
        <p className="empty-state">{t('empty')}</p>
      </div>
    );
  }

  return (
    <div className="review-panel">
      <h3 className="section-header">{t('heading')}</h3>
      <div className="application-list">
        {applications.map((app) => (
          <article key={app._id} className="application-item">
            <div className="application-header">
              <span className={getStatusBadge(app.status)}>{app.status}</span>
              <span className="application-date">
                {new Date(app.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="application-details">
              <h4 className="applicant-name">{app.student?.fullName || t('unknown')}</h4>
              <p className="applicant-info">
                {app.student?.email} • {app.department} • GPA: {app.gpa}
              </p>
              {app.selectedCategoryCode && (
                <p className="applicant-category">
                  {t('categoryLabel')} {app.selectedCategoryCode}
                </p>
              )}
              <p className="applicant-statement">
                {app.statement.substring(0, 200)}
                {app.statement.length > 200 && t('readMore')}
              </p>
            </div>
            <div className="application-actions">
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => handleReviewClick(app)}
              >
                {t('review')}
              </button>
            </div>
          </article>
        ))}
      </div>

      <ReviewModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedApplication(null);
        }}
        applicationId={selectedApplication?._id}
        currentStatus={selectedApplication?.status}
        fallbackCategoryCode={selectedApplication?.selectedCategoryCode}
        reviewHistory={selectedApplication?.reviewHistory}
        onConfirm={handleReviewConfirm}
      />
    </div>
  );
}

export default ReviewPanel;
