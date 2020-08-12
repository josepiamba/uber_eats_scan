const { Router } = require('express');
const router = Router();

const webRoutes = require('./web.routes');
const apiRoutes = require('./api.routes');
const { route } = require('./web.routes');

router.use('/', webRoutes);

router.use('/api', apiRoutes);

module.exports = router;