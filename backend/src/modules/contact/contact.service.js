const { StatusCodes } = require('http-status-codes');
const ContactInquiry = require('./contactInquiry.model');
const User = require('../auth/user.model');
const { ROLES } = require('../../config/roles');
const { dispatchNotification } = require('../notification/notification.service');
const EmailService = require('../../services/emailService');
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

const notifySubmitterOnInquiryUpdate = async ({
  inquiry,
  previousStatus,
  previousResolutionNote
}) => {
  const hasChanged =
    previousStatus !== inquiry.status || previousResolutionNote !== inquiry.resolutionNote;

  if (!hasChanged) {
    return;
  }

  const recipient = await User.findOne({
    isActive: true,
    email: inquiry.email
  }).select('_id');

  if (!recipient) {
    return;
  }

  const statusLabel = inquiry.status.replace(/_/g, ' ');
  const noteSnippet = inquiry.resolutionNote ? ` Note: ${inquiry.resolutionNote}` : '';

  try {
    await dispatchNotification({
      payload: {
        recipient: recipient._id,
        channel: 'in_app',
        subject: `Inquiry update: ${inquiry.subject}`,
        message: `Your inquiry status is now ${statusLabel}.${noteSnippet}`,
        metadata: {
          inquiryId: inquiry._id.toString(),
          previousStatus,
          status: inquiry.status,
          source: 'contact-desk'
        }
      }
    });
  } catch (error) {
    logger.warn(`Failed to dispatch inquiry status notification: ${error.message}`);
  }
};

const notifyAdminsOnInquiry = async (inquiry) => {
  const recipients = await User.find({
    isActive: true,
    roles: { $in: [ROLES.ADMIN, ROLES.MANAGER] }
  }).select('_id email');

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

      // Also alert by email so the desk is reachable without opening the app.
      if (recipient.email) {
        try {
          await EmailService.sendContactAlert(inquiry, recipient.email);
        } catch (error) {
          logger.warn(`Failed to email contact alert to ${recipient.email}: ${error.message}`);
        }
      }
    })
  );
};

const acknowledgeSubmitter = async (inquiry) => {
  try {
    await EmailService.sendContactAcknowledgement(inquiry);
  } catch (error) {
    // Delivery failure must never fail the submission itself.
    logger.warn(`Failed to send contact acknowledgement to ${inquiry.email}: ${error.message}`);
  }
};

const submitInquiry = async (payload) => {
  const inquiry = await ContactInquiry.create(payload);
  await Promise.all([notifyAdminsOnInquiry(inquiry), acknowledgeSubmitter(inquiry)]);
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

const listMyInquiries = async ({ email, query }) => {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedEmail) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User email is required');
  }

  const filter = { email: normalizedEmail };

  if (query.status) {
    filter.status = query.status;
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

  const previousStatus = inquiry.status;
  const previousResolutionNote = inquiry.resolutionNote;

  inquiry.status = status;
  inquiry.resolutionNote = resolutionNote || '';
  inquiry.handledBy = actorId;

  if (status === 'resolved') {
    inquiry.resolvedAt = new Date();
  } else {
    inquiry.resolvedAt = null;
  }

  await inquiry.save();

  await notifySubmitterOnInquiryUpdate({
    inquiry,
    previousStatus,
    previousResolutionNote
  });

  return inquiry;
};

module.exports = {
  submitInquiry,
  listInquiries,
  listMyInquiries,
  updateInquiryStatus
};
