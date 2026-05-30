const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/logController');

router.get('/',          ctrl.showLogs);
router.get('/services',  ctrl.listServices);  // must be before /:id-style routes
router.get('/api',       ctrl.listLogs);

module.exports = router;
