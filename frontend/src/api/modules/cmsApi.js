import apiClient from '../client';

export const cmsApi = {
  listPages(params = {}) {
    return apiClient.get('/cms/pages', { params });
  },
  listManagePages(params = {}) {
    return apiClient.get('/cms/manage/pages', { params });
  },
  getPageBySlug(slug) {
    return apiClient.get(`/cms/pages/slug/${slug}`);
  },
  createPage(payload) {
    return apiClient.post('/cms/pages', payload);
  },
  updatePage(pageId, payload) {
    return apiClient.patch(`/cms/pages/${pageId}`, payload);
  },
  listNews(params = {}) {
    return apiClient.get('/cms/news', { params });
  },
  listManageNews(params = {}) {
    return apiClient.get('/cms/manage/news', { params });
  },
  createNews(payload) {
    return apiClient.post('/cms/news', payload);
  },
  updateNews(newsId, payload) {
    return apiClient.patch(`/cms/news/${newsId}`, payload);
  },
  listAnnouncements(params = {}) {
    return apiClient.get('/cms/news', {
      params: {
        ...params,
        category: 'announcement'
      }
    });
  },
  listBlogs(params = {}) {
    return apiClient.get('/cms/blogs', { params });
  },
  listManageBlogs(params = {}) {
    return apiClient.get('/cms/manage/blogs', { params });
  },
  getBlogBySlug(slug) {
    return apiClient.get(`/cms/blogs/slug/${slug}`);
  },
  createBlog(payload) {
    return apiClient.post('/cms/blogs', payload);
  },
  updateBlog(blogId, payload) {
    return apiClient.patch(`/cms/blogs/${blogId}`, payload);
  },
  listGalleries(params = {}) {
    return apiClient.get('/cms/galleries', { params });
  },
  listManageGalleries(params = {}) {
    return apiClient.get('/cms/manage/galleries', { params });
  },
  createGallery(payload) {
    return apiClient.post('/cms/galleries', payload);
  },
  updateGallery(galleryId, payload) {
    return apiClient.patch(`/cms/galleries/${galleryId}`, payload);
  }
};
