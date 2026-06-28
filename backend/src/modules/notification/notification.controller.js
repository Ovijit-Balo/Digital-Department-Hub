const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const notificationService = require('./notification.service');
const User = require('../auth/user.model');
const ApiError = require('../../utils/ApiError');
const { ROLES } = require('../../config/roles');

const privilegedRoles = [ROLES.ADMIN, ROLES.MANAGER];

const dispatch = asyncHandler(async (req, res) => {
  const recipient = await User.findById(req.body.recipient).select('email fullName isActive');

  if (!recipient || !recipient.isActive) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Recipient not found');
  }

  const notification = await notificationService.dispatchNotification({
    payload: {
      ...req.body,
      recipientEmail: recipient.email
    }
  });

  res.locals.auditMeta = {
    action: 'DISPATCH_NOTIFICATION',
    entityType: 'NotificationLog',
    entityId: notification._id.toString(),
    after: { recipient: notification.recipient, channel: notification.channel }
  };

  res.status(StatusCodes.ACCEPTED).json({ notification });
});

const list = asyncHandler(async (req, res) => {
  const isPrivileged = req.user.roles.some((role) => privilegedRoles.includes(role));

  const data = await notificationService.listNotifications({
    query: req.query,
    requester: req.user,
    isPrivileged
  });

  res.status(StatusCodes.OK).json(data);
});

const markRead = asyncHandler(async (req, res) => {
  const isPrivileged = req.user.roles.some((role) => privilegedRoles.includes(role));

  const notification = await notificationService.markNotificationRead({
    notificationId: req.params.notificationId,
    requester: req.user,
    isPrivileged
  });

  res.locals.auditMeta = {
    action: 'READ_NOTIFICATION',
    entityType: 'NotificationLog',
    entityId: notification._id.toString(),
    after: { readAt: notification.readAt }
  };

  res.status(StatusCodes.OK).json({ notification });
});

const getUserNotifications = asyncHandler(async (req, res) => {
  const data = await notificationService.getUserNotifications({
    userId: req.user._id,
    query: req.query
  });

  res.status(StatusCodes.OK).json(data);
});

const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markNotificationAsRead({
    notificationId: req.params.notificationId,
    userId: req.user._id
  });

  res.status(StatusCodes.OK).json({ notification });
});

const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllNotificationsAsRead({
    userId: req.user._id
  });

  res.status(StatusCodes.OK).json(result);
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const result = await notificationService.getUnreadCount({
    userId: req.user._id
  });

  res.status(StatusCodes.OK).json(result);
});

module.exports = {
  dispatch,
  list,
  markRead,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount
};
