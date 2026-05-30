const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/monitorController');

router.get('/',             ctrl.showMonitors);
router.get('/api',          ctrl.listMonitors);
router.post('/',            ctrl.createMonitor);
router.delete('/:id',       ctrl.deleteMonitor);
router.get('/:id/pings',    ctrl.getMonitorPings);

module.exports = router;
