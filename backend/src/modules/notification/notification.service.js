const { StatusCodes } = require('http-status-codes');
const NotificationLog = require('./notificationLog.model');
const Notification = require('./notification.model');
const { getNotificationQueue } = require('../../jobs/queues/notificationQueue');
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

const dispatchNotification = async ({ payload }) => {
  const log = await NotificationLog.create({
    recipient: payload.recipient,
    channel: payload.channel,
    subject: payload.subject || '',
    message: payload.message,
    status: 'queued',
    metadata: payload.metadata || {}
  });

  // Create in-app notification
  if (payload.channel === 'in_app' || payload.channel === 'all') {
    await Notification.create({
      userId: payload.recipient,
      type: payload.metadata?.type || 'system',
      title: payload.subject || 'Notification',
      message: payload.message,
      link: payload.metadata?.link || null,
      metadata: payload.metadata || {}
    });
  }

  if (payload.channel === 'in_app') {
    log.status = 'sent';
    log.sentAt = new Date();
    await log.save();
    return log;
  }

  // Send email notification
  if (payload.channel === 'email' || payload.channel === 'all') {
    try {
      await EmailService.sendEmail({
        to: payload.recipientEmail,
        subject: payload.subject,
        html: payload.message
      });
      log.status = 'sent';
      log.sentAt = new Date();
      await log.save();
    } catch (error) {
      log.status = 'failed';
      log.error = error.message;
      await log.save();
      logger.error('Email notification failed:', error);
    }
    return log;
  }

  const notificationQueue = getNotificationQueue();

  if (!notificationQueue) {
    log.status = 'sent';
    log.sentAt = new Date();
    await log.save();
    logger.warn('Notification queue disabled, processed notification synchronously');
    return log;
  }

  await notificationQueue.add('dispatch-notification', {
    notificationLogId: log._id.toString()
  });

  return log;
};

const listNotifications = async ({ query, requester, isPrivileged }) => {
  const filter = {};

  if (!isPrivileged) {
    filter.recipient = requester._id;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.channel) {
    filter.channel = query.channel;
  }

  const { page, limit, skip } = buildPagination(query);

  const [items, total] = await Promise.all([
    NotificationLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('recipient', 'fullName email'),
    NotificationLog.countDocuments(filter)
  ]);

  return {
    items,
    page,
    limit,
    total
  };
};

const markNotificationRead = async ({ notificationId, requester, isPrivileged }) => {
  const item = await NotificationLog.findById(notificationId);

  if (!item) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found');
  }

  if (!isPrivileged && item.recipient.toString() !== requester._id.toString()) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Not allowed to update this notification');
  }

  item.readAt = new Date();
  await item.save();

  return item;
};

const getUserNotifications = async ({ userId, query }) => {
  const filter = { userId };
  
  if (query.unreadOnly) {
    filter.read = false;
  }

  const { page, limit, skip } = buildPagination(query);

  const [items, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter)
  ]);

  return {
    items,
    page,
    limit,
    total
  };
};

const markNotificationAsRead = async ({ notificationId, userId }) => {
  const notification = await Notification.findOne({ _id: notificationId, userId });

  if (!notification) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found');
  }

  notification.read = true;
  await notification.save();

  return notification;
};

const markAllNotificationsAsRead = async ({ userId }) => {
  await Notification.updateMany(
    { userId, read: false },
    { read: true }
  );

  return { success: true };
};

const getUnreadCount = async ({ userId }) => {
  const count = await Notification.countDocuments({ userId, read: false });
  return { count };
};

module.exports = {
  dispatchNotification,
  listNotifications,
  markNotificationRead,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount
};
