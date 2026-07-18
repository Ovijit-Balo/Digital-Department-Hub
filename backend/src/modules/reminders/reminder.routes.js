const express = require('express');
const reminderController = require('./reminder.controller');

const router = express.Router();

// Guarded by CRON_SECRET (checked in the controller), not user auth — this is
// called by an external scheduler, not the SPA. GET is allowed too so simple
// cron services that only issue GET requests can trigger it.
router.post('/run', reminderController.runReminders);
router.get('/run', reminderController.runReminders);

module.exports = router;
