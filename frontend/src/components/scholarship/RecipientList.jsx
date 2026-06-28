import { toLocalizedText } from '../../utils/localized';
import useLanguage from '../../hooks/useLanguage';

function RecipientList({ recipients, notice, isPublished, onPublishToggle, canPublish }) {
  const { language } = useLanguage();

  if (!notice) {
    return (
      <div className="recipient-list">
        <h3 className="section-header">Scholarship Recipients</h3>
        <p className="empty-state">Select a scholarship notice to view recipients.</p>
      </div>
    );
  }

  if (!isPublished && recipients.length === 0) {
    return (
      <div className="recipient-list">
        <h3 className="section-header">Scholarship Recipients</h3>
        <div className="recipient-placeholder">
          <p>Recipient list has not been published yet.</p>
          {canPublish && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onPublishToggle(true)}
            >
              Publish Recipients
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="recipient-list">
      <div className="recipient-header">
        <h3 className="section-header">Scholarship Recipients</h3>
        {canPublish && (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => onPublishToggle(!isPublished)}
          >
            {isPublished ? 'Unpublish' : 'Publish'}
          </button>
        )}
      </div>

      <div className="recipient-summary">
        <h4>{toLocalizedText(notice.title, language)}</h4>
        <p className="recipient-count">{recipients.length} recipient{recipients.length !== 1 ? 's' : ''}</p>
      </div>

      {recipients.length === 0 ? (
        <p className="empty-state">No recipients yet.</p>
      ) : (
        <div className="recipient-cards">
          {recipients.map((recipient) => (
            <article key={recipient._id} className="recipient-card">
              <div className="recipient-info">
                <h5 className="recipient-name">{recipient.student?.fullName || 'Unknown'}</h5>
                <p className="recipient-details">
                  {recipient.student?.department} • {recipient.student?.email}
                </p>
              </div>
              <div className="recipient-award">
                {recipient.awardedCategoryCode && (
                  <span className="award-category">{recipient.awardedCategoryCode}</span>
                )}
                {recipient.awardedAmount && (
                  <span className="award-amount">${recipient.awardedAmount}</span>
                )}
              </div>
              <div className="recipient-meta">
                <span className="gpa">GPA: {recipient.gpa}</span>
                {recipient.reviewedBy && (
                  <span className="reviewer">
                    Reviewed by {recipient.reviewedBy?.fullName}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default RecipientList;
