const NewsPost = require('../cms/newsPost.model');
const BlogPost = require('../cms/blogPost.model');
const Page = require('../cms/page.model');
const ScholarshipNotice = require('../scholarship/scholarshipNotice.model');
const Event = require('../event/event.model');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Localized fields store { en, bn }; fall back to whichever language is populated.
const pickLocalized = (field) => (field && (field.en || field.bn)) || '';

const snippet = (text, length = 160) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length > length ? `${clean.slice(0, length)}…` : clean;
};

// Relevance-ranked lookup using the model's Mongo text index.
const textSearch = ({ model, filter, limit }) =>
  model
    .find(filter, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .lean();

/**
 * Search published content across the department hub and return grouped,
 * relevance-ranked results. News/blog/pages/scholarships use their Mongo text
 * indexes; events fall back to a case-insensitive regex (plain-string schema).
 */
const searchAll = async ({ q, limit = 6 }) => {
  const term = String(q).trim();
  const textFilter = { $text: { $search: term } };
  const eventRegex = new RegExp(escapeRegex(term), 'i');

  const [news, blogs, pages, scholarships, events] = await Promise.all([
    textSearch({ model: NewsPost, filter: { ...textFilter, status: 'published' }, limit }),
    textSearch({ model: BlogPost, filter: { ...textFilter, status: 'published' }, limit }),
    textSearch({ model: Page, filter: { ...textFilter, status: 'published' }, limit }),
    textSearch({
      model: ScholarshipNotice,
      filter: { ...textFilter, status: { $in: ['open', 'closed'] } },
      limit
    }),
    Event.find({
      status: 'published',
      $or: [{ title: eventRegex }, { description: eventRegex }, { location: eventRegex }]
    })
      .sort({ startTime: -1 })
      .limit(limit)
      .lean()
  ]);

  const results = [
    ...news.map((doc) => ({
      type: 'news',
      id: doc._id,
      title: pickLocalized(doc.title),
      snippet: snippet(pickLocalized(doc.summary) || pickLocalized(doc.body)),
      url: `/news/${doc._id}`,
      date: doc.publishedAt || doc.createdAt
    })),
    ...blogs.map((doc) => ({
      type: 'blog',
      id: doc._id,
      title: pickLocalized(doc.title),
      snippet: snippet(pickLocalized(doc.excerpt) || pickLocalized(doc.body)),
      url: `/blogs/${doc.slug}`,
      date: doc.publishedAt || doc.createdAt
    })),
    ...pages.map((doc) => ({
      type: 'page',
      id: doc._id,
      title: pickLocalized(doc.title),
      snippet: snippet(pickLocalized(doc.content)),
      url: `/pages/${doc.slug}`,
      date: doc.updatedAt
    })),
    ...scholarships.map((doc) => ({
      type: 'scholarship',
      id: doc._id,
      title: pickLocalized(doc.title),
      snippet: snippet(pickLocalized(doc.description)),
      url: '/scholarship',
      date: doc.deadline
    })),
    ...events.map((doc) => ({
      type: 'event',
      id: doc._id,
      title: doc.title,
      snippet: snippet(doc.description),
      url: '/events',
      date: doc.startTime
    }))
  ];

  const counts = {
    news: news.length,
    blog: blogs.length,
    page: pages.length,
    scholarship: scholarships.length,
    event: events.length
  };

  return { query: term, total: results.length, counts, results };
};

module.exports = { searchAll };
