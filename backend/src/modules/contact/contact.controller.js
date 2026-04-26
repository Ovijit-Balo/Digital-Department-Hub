const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const contactService = require('./contact.service');

const submitInquiry = asyncHandler(async (req, res) => {
  const inquiry = await contactService.submitInquiry(req.body);

  res.locals.auditMeta = {
    action: 'SUBMIT_CONTACT_INQUIRY',
    entityType: 'ContactInquiry',
    entityId: inquiry._id.toString(),
    after: {
      email: inquiry.email,
      subject: inquiry.subject,
      status: inquiry.status
    }
  };

  res.status(StatusCodes.CREATED).json({ inquiry });
});

const listInquiries = asyncHandler(async (req, res) => {
  const data = await contactService.listInquiries(req.query);
  res.status(StatusCodes.OK).json(data);
});

const updateInquiryStatus = asyncHandler(async (req, res) => {
  const inquiry = await contactService.updateInquiryStatus({
    inquiryId: req.params.inquiryId,
    status: req.body.status,
    resolutionNote: req.body.resolutionNote,
    actorId: req.user._id
  });

  res.locals.auditMeta = {
    action: 'UPDATE_CONTACT_INQUIRY_STATUS',
    entityType: 'ContactInquiry',
    entityId: inquiry._id.toString(),
    after: {
      status: inquiry.status,
      handledBy: req.user._id.toString(),
      resolvedAt: inquiry.resolvedAt
    }
  };

  res.status(StatusCodes.OK).json({ inquiry });
});

module.exports = {
  submitInquiry,
  listInquiries,
  updateInquiryStatus
};
