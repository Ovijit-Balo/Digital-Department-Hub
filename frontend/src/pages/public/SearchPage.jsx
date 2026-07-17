import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { searchApi } from '../../api/modules';
import InlineAlert from '../../components/ui/InlineAlert';
import usePageMeta from '../../hooks/usePageMeta';
import useLanguage from '../../hooks/useLanguage';
import { toLocalizedText } from '../../utils/localized';
import { getApiErrorMessage } from '../../utils/http';
import { toIsoDate } from '../../utils/localized';

const TYPE_META = {
  news: { label: { en: 'News', bn: 'সংবাদ' }, icon: '📰' },
  blog: { label: { en: 'Blog', bn: 'ব্লগ' }, icon: '✍️' },
  page: { label: { en: 'Page', bn: 'পাতা' }, icon: '📄' },
  scholarship: { label: { en: 'Scholarship', bn: 'বৃত্তি' }, icon: '🎓' },
  event: { label: { en: 'Event', bn: 'ইভেন্ট' }, icon: '📅' }
};

const T = {
  heading: { en: 'Search the Hub', bn: 'হাব-এ অনুসন্ধান করুন' },
  subtitle: {
    en: 'Find news, blogs, pages, scholarships, and events in one place.',
    bn: 'এক জায়গায় সংবাদ, ব্লগ, পাতা, বৃত্তি ও ইভেন্ট খুঁজুন।'
  },
  placeholder: { en: 'Search for anything…', bn: 'যেকোনো কিছু খুঁজুন…' },
  searchBtn: { en: 'Search', bn: 'অনুসন্ধান' },
  searching: { en: 'Searching…', bn: 'অনুসন্ধান হচ্ছে…' },
  resultsFor: { en: 'result', bn: 'ফলাফল' },
  resultsForPlural: { en: 'results', bn: 'ফলাফল' },
  forWord: { en: 'for', bn: '—' },
  noMatches: { en: 'No matches found', bn: 'কোনো ফলাফল পাওয়া যায়নি' },
  noMatchesHint: {
    en: 'Try different keywords or check your spelling.',
    bn: 'ভিন্ন কীওয়ার্ড দিয়ে চেষ্টা করুন অথবা বানান যাচাই করুন।'
  },
  getStarted: {
    en: 'Enter a search term above to get started.',
    bn: 'শুরু করতে উপরে একটি অনুসন্ধান শব্দ লিখুন।'
  },
  untitled: { en: 'Untitled', bn: 'শিরোনামহীন' },
  failed: { en: 'Search failed. Please try again.', bn: 'অনুসন্ধান ব্যর্থ হয়েছে। আবার চেষ্টা করুন।' }
};

function SearchPage() {
  const { language } = useLanguage();
  const t = (key) => toLocalizedText(T[key], language);
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const [inputValue, setInputValue] = useState(query);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  usePageMeta({
    title: query ? `${t('searchBtn')}: ${query}` : t('searchBtn'),
    description: toLocalizedText(T.subtitle, language)
  });

  useEffect(() => {
    setInputValue(query);
  }, [query]);

  const runSearch = useCallback(async (term) => {
    if (!term || term.trim().length < 2) {
      setData(null);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await searchApi.search({ q: term.trim(), limit: 8 });
      setData(response.data);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, toLocalizedText(T.failed, language)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    runSearch(query);
  }, [query, runSearch]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed.length < 2) {
      return;
    }
    setSearchParams({ q: trimmed });
  };

  const results = data?.results || [];

  return (
    <section className="page-wrap search-page">
      <header className="search-page__header">
        <h1>{t('heading')}</h1>
        <p className="search-page__subtitle">{t('subtitle')}</p>

        <form className="search-page__form" onSubmit={handleSubmit} role="search">
          <input
            type="search"
            className="search-page__input"
            placeholder={t('placeholder')}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            aria-label={t('heading')}
            autoFocus
          />
          <button type="submit" className="btn btn-primary" disabled={inputValue.trim().length < 2}>
            {t('searchBtn')}
          </button>
        </form>
      </header>

      {error && <InlineAlert type="error">{error}</InlineAlert>}
      {loading && <InlineAlert type="info">{t('searching')}</InlineAlert>}

      {!loading && !error && query.trim().length >= 2 && (
        <p className="search-page__summary">
          {data ? (
            <>
              <strong>{results.length}</strong>{' '}
              {results.length === 1 ? t('resultsFor') : t('resultsForPlural')} {t('forWord')}{' '}
              <strong>“{query}”</strong>
            </>
          ) : null}
        </p>
      )}

      {!loading && !error && query.trim().length >= 2 && results.length === 0 && data && (
        <div className="search-page__empty">
          <div className="search-page__empty-icon" aria-hidden="true">
            🔍
          </div>
          <h3>{t('noMatches')}</h3>
          <p>{t('noMatchesHint')}</p>
        </div>
      )}

      {!query && <InlineAlert type="info">{t('getStarted')}</InlineAlert>}

      {!loading && results.length > 0 && (
        <div className="search-results">
          {results.map((item) => {
            const meta = TYPE_META[item.type] || { label: { en: item.type, bn: item.type }, icon: '•' };
            return (
              <Link key={`${item.type}-${item.id}`} to={item.url} className="search-result">
                <span className="search-result__icon" aria-hidden="true">
                  {meta.icon}
                </span>
                <span className="search-result__body">
                  <span className="search-result__title-row">
                    <span className="search-result__title">{item.title || t('untitled')}</span>
                    <span className={`search-result__badge search-result__badge--${item.type}`}>
                      {toLocalizedText(meta.label, language)}
                    </span>
                  </span>
                  {item.snippet && <span className="search-result__snippet">{item.snippet}</span>}
                  {item.date && (
                    <span className="search-result__date">{toIsoDate(item.date)}</span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default SearchPage;
