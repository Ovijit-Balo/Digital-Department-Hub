import { useState } from 'react';
import { scholarshipApi } from '../../../api/modules';
import { useToast } from '../../../context/ToastContext';
import { getApiErrorMessage } from '../../../utils/http';
import ReviewModal from './ReviewModal';
import useLanguage from '../../../hooks/useLanguage';

function ReviewPanel({ applications, onRefresh }) {
  const { success, error: toastError } = useToast();
  const { language } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);

  const handleReviewClick = (application) => {
    setSelectedApplication(application);
    setModalOpen(true);
  };

  const handleReviewConfirm = async (reviewData) => {
    try {
      await scholarshipApi.reviewApplication(selectedApplication._id, reviewData);
      success(`Application ${reviewData.status}.`, { title: 'Review saved' });
      setModalOpen(false);
      setSelectedApplication(null);
      onRefresh();
    } catch (apiError) {
      const message = getApiErrorMessage(apiError, 'Failed to update review status.');
      toastError(message, { title: 'Review failed' });
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      submitted: 'status-badge status-badge--pending',
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
        <h3 className="section-header">Applications to Review</h3>
        <p className="empty-state">No applications to review.</p>
      </div>
    );
  }

  return (
    <div className="review-panel">
      <h3 className="section-header">Applications to Review</h3>
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
              <h4 className="applicant-name">{app.student?.fullName || 'Unknown'}</h4>
              <p className="applicant-info">
                {app.student?.email} • {app.department} • GPA: {app.gpa}
              </p>
              {app.selectedCategoryCode && (
                <p className="applicant-category">
                  Category: {app.selectedCategoryCode}
                </p>
              )}
              <p className="applicant-statement">
                {app.statement.substring(0, 200)}
                {app.statement.length > 200 && '...read more'}
              </p>
            </div>
            <div className="application-actions">
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => handleReviewClick(app)}
              >
                Review
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
        onConfirm={handleReviewConfirm}
      />
    </div>
  );
}

export default ReviewPanel;
