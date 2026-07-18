const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const workqueueService = require('./workqueue.service');

// GET /workqueue/staff — unified, aged approval queue for the staff/manager desk.
const getStaffWorkQueue = asyncHandler(async (req, res) => {
  const perKindLimit = Number(req.query.perKindLimit);
  const result = await workqueueService.getStaffWorkQueue(
    Number.isFinite(perKindLimit) && perKindLimit > 0 ? { perKindLimit } : {}
  );

  res.status(StatusCodes.OK).json(result);
});

module.exports = {
  getStaffWorkQueue
};
