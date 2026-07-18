jest.mock('../../src/modules/cms/page.model');
jest.mock('../../src/modules/cms/newsPost.model');
jest.mock('../../src/modules/cms/blogPost.model');
jest.mock('../../src/modules/cms/gallery.model');
jest.mock('../../src/config/storage', () => ({ createCloudinaryUploadSignature: jest.fn() }));
jest.mock('../../src/services/imageService');

const mongoose = require('mongoose');
const Page = require('../../src/modules/cms/page.model');
const NewsPost = require('../../src/modules/cms/newsPost.model');
const BlogPost = require('../../src/modules/cms/blogPost.model');
const Gallery = require('../../src/modules/cms/gallery.model');
const cmsService = require('../../src/modules/cms/cms.service');

// Chainable query stub: find().sort().limit().select().lean() -> rows.
const query = (rows) => {
  const chain = {
    sort: () => chain,
    limit: () => chain,
    select: () => chain,
    lean: () => Promise.resolve(rows)
  };
  return chain;
};

const authorId = new mongoose.Types.ObjectId().toString();

describe('cmsService.getEditorialQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: every model returns nothing unless a test overrides it.
    [Page, NewsPost, BlogPost, Gallery].forEach((Model) => {
      Model.find.mockReturnValue(query([]));
    });
  });

  it('collects the author drafts across content types, newest-updated first', async () => {
    NewsPost.find.mockReturnValue(
      query([
        {
          _id: 'n1',
          title: { en: 'News draft' },
          slug: 'news-draft',
          status: 'draft',
          updatedAt: new Date('2026-01-10T00:00:00Z')
        }
      ])
    );
    BlogPost.find.mockReturnValue(
      query([
        {
          _id: 'b1',
          title: { en: 'Blog draft' },
          slug: 'blog-draft',
          status: 'draft',
          updatedAt: new Date('2026-01-20T00:00:00Z')
        }
      ])
    );

    const result = await cmsService.getEditorialQueue(authorId);

    expect(result.summary.draftCount).toBe(2);
    // Blog updated later, so it sorts ahead of the news draft.
    expect(result.drafts[0].kind).toBe('blog');
    expect(result.drafts[1].kind).toBe('news');
  });

  it('orders scheduled publishes by soonest go-live and excludes gallery', async () => {
    NewsPost.find.mockImplementation((filter) => {
      if (filter.status === 'published') {
        return query([
          { _id: 'n2', title: { en: 'Later' }, status: 'published', scheduledAt: new Date('2026-03-01T00:00:00Z') }
        ]);
      }
      return query([]);
    });
    Page.find.mockImplementation((filter) => {
      if (filter.status === 'published') {
        return query([
          { _id: 'p2', title: { en: 'Sooner' }, status: 'published', scheduledAt: new Date('2026-02-01T00:00:00Z') }
        ]);
      }
      return query([]);
    });

    const result = await cmsService.getEditorialQueue(authorId);

    expect(result.summary.scheduledCount).toBe(2);
    expect(result.scheduled[0].kind).toBe('page'); // Feb before Mar
    expect(result.scheduled[1].kind).toBe('news');
    // Gallery has no scheduledAt field, so it is never queried for scheduled.
    const galleryCalls = Gallery.find.mock.calls.filter(([f]) => f.status === 'published');
    expect(galleryCalls).toHaveLength(0);
  });

  it('returns empty groups when the author has no pending work', async () => {
    const result = await cmsService.getEditorialQueue(authorId);
    expect(result.drafts).toHaveLength(0);
    expect(result.scheduled).toHaveLength(0);
    expect(result.summary).toEqual({ draftCount: 0, scheduledCount: 0 });
  });
});
