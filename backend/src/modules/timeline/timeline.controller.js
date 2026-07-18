const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const timelineService = require('./timeline.service');

// GET /timeline/me — the signed-in user's personal, time-ordered feed of
// upcoming deadlines, registered events, and recent decisions.
const getMyTimeline = asyncHandler(async (req, res) => {
  const data = await timelineService.getUserTimeline(req.user._id);
  res.status(StatusCodes.OK).json(data);
});

module.exports = {
  getMyTimeline
};
