const express = require('express');
const sitemapService = require('./sitemap.service');

const router = express.Router();

const sendSitemap = async (req, res) => {
  try {
    const xml = await sitemapService.generateSitemap();
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.status(200).send(xml);
  } catch {
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'no-store');
    res
      .status(503)
      .send('<?xml version="1.0" encoding="UTF-8"?><error>Unable to generate sitemap</error>');
  }
};

router.get('/sitemap.xml', sendSitemap);

module.exports = router;
