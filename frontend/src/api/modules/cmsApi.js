import apiClient from '../client';

export const cmsApi = {
  // Signed-in author's editorial action queue (own drafts + scheduled items).
  getEditorialQueue() {
    return apiClient.get('/cms/manage/editorial-queue');
  },
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
  getNewsById(newsId) {
    return apiClient.get(`/cms/news/${newsId}`);
  },
  getNewsBySlug(slug) {
    return apiClient.get(`/cms/news/slug/${slug}`);
  },
  getGalleryById(galleryId) {
    return apiClient.get(`/cms/galleries/${galleryId}`);
  },
  getGalleryBySlug(slug) {
    return apiClient.get(`/cms/galleries/slug/${slug}`);
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
  },
  deletePage(pageId) {
    return apiClient.delete(`/cms/pages/${pageId}`);
  },
  deleteNews(newsId) {
    return apiClient.delete(`/cms/news/${newsId}`);
  },
  deleteBlog(blogId) {
    return apiClient.delete(`/cms/blogs/${blogId}`);
  },
  deleteGallery(galleryId) {
    return apiClient.delete(`/cms/galleries/${galleryId}`);
  }
};
