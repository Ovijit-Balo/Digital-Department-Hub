const express = require('express');
const searchController = require('./search.controller');
const searchValidation = require('./search.validation');
const validate = require('../../middlewares/validate');

const router = express.Router();

// Public global search across published content.
router.get('/', validate(searchValidation.search), searchController.search);

module.exports = router;
