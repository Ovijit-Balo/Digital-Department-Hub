import { toLocalizedText } from '../../../utils/localized';
import useLanguage from '../../../hooks/useLanguage';

const T = {
  heading: { en: 'Scholarship Recipients', bn: 'বৃত্তিপ্রাপ্ত' },
  selectNotice: { en: 'Select a scholarship notice to view recipients.', bn: 'বৃত্তিপ্রাপ্তদের দেখতে একটি বৃত্তি বিজ্ঞপ্তি নির্বাচন করুন।' },
  notPublished: { en: 'Recipient list has not been published yet.', bn: 'বৃত্তিপ্রাপ্তদের তালিকা এখনও প্রকাশ করা হয়নি।' },
  publishRecipients: { en: 'Publish Recipients', bn: 'বৃত্তিপ্রাপ্ত প্রকাশ করুন' },
  unpublish: { en: 'Unpublish', bn: 'অপ্রকাশ' },
  publish: { en: 'Publish', bn: 'প্রকাশ' },
  recipient: { en: 'recipient', bn: 'জন প্রাপক' },
  recipients: { en: 'recipients', bn: 'জন প্রাপক' },
  noRecipients: { en: 'No recipients yet.', bn: 'এখনও কোনো প্রাপক নেই।' },
  unknown: { en: 'Unknown', bn: 'অজানা' },
  reviewedBy: { en: 'Reviewed by', bn: 'পর্যালোচনা করেছেন' }
};

function RecipientList({ recipients, notice, isPublished, onPublishToggle, canPublish }) {
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);

  if (!notice) {
    return (
      <div className="recipient-list">
        <h3 className="section-header">{t('heading')}</h3>
        <p className="empty-state">{t('selectNotice')}</p>
      </div>
    );
  }

  if (!isPublished && recipients.length === 0) {
    return (
      <div className="recipient-list">
        <h3 className="section-header">{t('heading')}</h3>
        <div className="recipient-placeholder">
          <p>{t('notPublished')}</p>
          {canPublish && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onPublishToggle(true)}
            >
              {t('publishRecipients')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="recipient-list">
      <div className="recipient-header">
        <h3 className="section-header">{t('heading')}</h3>
        {canPublish && (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => onPublishToggle(!isPublished)}
          >
            {isPublished ? t('unpublish') : t('publish')}
          </button>
        )}
      </div>

      <div className="recipient-summary">
        <h4>{toLocalizedText(notice.title, language)}</h4>
        <p className="recipient-count">
          {recipients.length} {recipients.length !== 1 ? t('recipients') : t('recipient')}
        </p>
      </div>

      {recipients.length === 0 ? (
        <p className="empty-state">{t('noRecipients')}</p>
      ) : (
        <div className="recipient-cards">
          {recipients.map((recipient) => (
            <article key={recipient._id} className="recipient-card">
              <div className="recipient-info">
                <h5 className="recipient-name">{recipient.student?.fullName || t('unknown')}</h5>
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
                    {t('reviewedBy')} {recipient.reviewedBy?.fullName}
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
