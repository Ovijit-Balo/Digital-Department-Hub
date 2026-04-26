const { StatusCodes } = require('http-status-codes');
const ContactInquiry = require('./contactInquiry.model');
const User = require('../auth/user.model');
const { ROLES } = require('../../config/roles');
const { dispatchNotification } = require('../notification/notification.service');
const logger = require('../../config/logger');
const ApiError = require('../../utils/ApiError');

const buildPagination = ({ page, limit }) => {
  const parsedPage = Number(page || 1);
  const parsedLimit = Number(limit || 20);

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit
  };
};

const notifyAdminsOnInquiry = async (inquiry) => {
  const recipients = await User.find({
    isActive: true,
    roles: { $in: [ROLES.ADMIN, ROLES.MANAGER] }
  }).select('_id');

  await Promise.all(
    recipients.map(async (recipient) => {
      try {
        await dispatchNotification({
          payload: {
            recipient: recipient._id,
            channel: 'in_app',
            subject: `New inquiry: ${inquiry.subject}`,
            message: `New contact inquiry from ${inquiry.name} (${inquiry.email})`,
            metadata: {
              inquiryId: inquiry._id.toString(),
              source: 'contact-form'
            }
          }
        });
      } catch (error) {
        logger.warn(`Failed to dispatch contact inquiry notification: ${error.message}`);
      }
    })
  );
};

const submitInquiry = async (payload) => {
  const inquiry = await ContactInquiry.create(payload);
  await notifyAdminsOnInquiry(inquiry);
  return inquiry;
};

const listInquiries = async (query) => {
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.search) {
    filter.$text = { $search: query.search };
  }

  const { page, limit, skip } = buildPagination(query);

  const [items, total] = await Promise.all([
    ContactInquiry.find(filter)
      .populate('handledBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ContactInquiry.countDocuments(filter)
  ]);

  return {
    items,
    page,
    limit,
    total
  };
};

const updateInquiryStatus = async ({ inquiryId, status, resolutionNote, actorId }) => {
  const inquiry = await ContactInquiry.findById(inquiryId);

  if (!inquiry) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Inquiry not found');
  }

  inquiry.status = status;
  inquiry.resolutionNote = resolutionNote || '';
  inquiry.handledBy = actorId;

  if (status === 'resolved') {
    inquiry.resolvedAt = new Date();
  } else {
    inquiry.resolvedAt = null;
  }

  await inquiry.save();
  return inquiry;
};

module.exports = {
  submitInquiry,
  listInquiries,
  updateInquiryStatus
};
