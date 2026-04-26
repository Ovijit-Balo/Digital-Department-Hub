const express = require('express');
const routeModules = require('./routeModules');

const router = express.Router();

routeModules.forEach(({ path, router: moduleRouter }) => {
	router.use(path, moduleRouter);
});

module.exports = router;
