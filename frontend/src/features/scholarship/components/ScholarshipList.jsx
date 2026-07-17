import { toLocalizedText, toIsoDate } from '../../../utils/localized';
import useLanguage from '../../../hooks/useLanguage';

const T = {
  heading: { en: 'Scholarship Notices', bn: 'বৃত্তি বিজ্ঞপ্তি' },
  empty: { en: 'No scholarship notices available.', bn: 'কোনো বৃত্তি বিজ্ঞপ্তি নেই।' },
  deadline: { en: 'Deadline:', bn: 'শেষ তারিখ:' },
  category: { en: 'category', bn: 'বিভাগ' },
  categories: { en: 'categories', bn: 'বিভাগ' }
};

function ScholarshipList({ notices, selectedNoticeId, onSelectNotice }) {
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);

  return (
    <div className="scholarship-list">
      <h3 className="section-header">{t('heading')}</h3>
      {notices.length === 0 ? (
        <p className="empty-state">{t('empty')}</p>
      ) : (
        <div className="notice-cards">
          {notices.map((notice) => {
            const state = notice.applicationState || notice.status;
            const isSelected = notice._id === selectedNoticeId;
            
            return (
              <article
                key={notice._id}
                className={`notice-card${isSelected ? ' is-selected' : ''}`}
                onClick={() => onSelectNotice(notice._id)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectNotice(notice._id);
                  }
                }}
              >
                <div className={`notice-status notice-status--${state}`}>
                  {state}
                </div>
                <h4 className="notice-title">
                  {toLocalizedText(notice.title, language)}
                </h4>
                <p className="notice-deadline">
                  {t('deadline')} {toIsoDate(notice.deadline)}
                </p>
                <div className="notice-meta">
                  <span className="notice-type">{notice.scholarshipType}</span>
                  {notice.categories?.length > 0 && (
                    <span className="notice-categories">
                      {notice.categories.length}{' '}
                      {notice.categories.length === 1 ? t('category') : t('categories')}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ScholarshipList;
