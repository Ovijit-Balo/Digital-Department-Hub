const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const searchService = require('./search.service');

const search = asyncHandler(async (req, res) => {
  const data = await searchService.searchAll({ q: req.query.q, limit: req.query.limit });
  res.status(StatusCodes.OK).json(data);
});

module.exports = { search };
