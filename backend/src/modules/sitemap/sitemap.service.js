const env = require('../../config/env');
const Page = require('../cms/page.model');
const NewsPost = require('../cms/newsPost.model');
const BlogPost = require('../cms/blogPost.model');
const Gallery = require('../cms/gallery.model');

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const toIsoDate = (value) => {
  if (!value) return new Date().toISOString();
  return new Date(value).toISOString();
};

const buildUrlEntry = (loc, lastmod) =>
  `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${escapeXml(lastmod)}</lastmod>\n  </url>`;

const generateSitemap = async () => {
  const baseUrl = env.FRONTEND_URL.split(',')[0].replace(/\/$/, '');

  const staticPaths = [
    { path: '/', lastmod: new Date() },
    { path: '/news', lastmod: new Date() },
    { path: '/announcements', lastmod: new Date() },
    { path: '/blogs', lastmod: new Date() },
    { path: '/gallery', lastmod: new Date() },
    { path: '/events', lastmod: new Date() },
    { path: '/scholarship', lastmod: new Date() },
    { path: '/booking', lastmod: new Date() },
    { path: '/contact', lastmod: new Date() }
  ];

  const [pages, newsPosts, blogPosts, galleries] = await Promise.all([
    Page.find({ status: 'published' }).select('slug updatedAt publishedAt').lean(),
    NewsPost.find({ status: 'published' }).select('slug updatedAt publishedAt').lean(),
    BlogPost.find({ status: 'published' }).select('slug updatedAt publishedAt').lean(),
    Gallery.find({ status: 'published' }).select('slug updatedAt publishedAt').lean()
  ]);

  const dynamicPaths = [
    ...pages.map((page) => ({
      path: `/pages/${page.slug}`,
      lastmod: page.updatedAt || page.publishedAt
    })),
    ...newsPosts.map((post) => ({
      path: `/news/${post.slug}`,
      lastmod: post.updatedAt || post.publishedAt
    })),
    ...blogPosts.map((post) => ({
      path: `/blogs/${post.slug}`,
      lastmod: post.updatedAt || post.publishedAt
    })),
    ...galleries.map((gallery) => ({
      path: `/gallery/${gallery.slug}`,
      lastmod: gallery.updatedAt || gallery.publishedAt
    }))
  ];

  const entries = [...staticPaths, ...dynamicPaths].map(({ path, lastmod }) =>
    buildUrlEntry(`${baseUrl}${path}`, toIsoDate(lastmod))
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>'
  ].join('\n');
};

module.exports = {
  generateSitemap
};
