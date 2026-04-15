const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const auditService = require('./audit.service');

const listAuditLogs = asyncHandler(async (req, res) => {
  const data = await auditService.listAuditLogs(req.query);
  res.status(StatusCodes.OK).json(data);
});

module.exports = {
  listAuditLogs
};
