const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../../utils/asyncHandler');
const notificationService = require('./notification.service');
const { ROLES } = require('../../config/roles');

const privilegedRoles = [ROLES.ADMIN, ROLES.MANAGER];

const dispatch = asyncHandler(async (req, res) => {
  const notification = await notificationService.dispatchNotification({ payload: req.body });

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

module.exports = {
  dispatch,
  list,
  markRead
};
