const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/transactionController');

router.get('/',        ctrl.showGroupList);
router.get('/groups',  ctrl.listGroups);
router.get('/detail',  ctrl.showDetail);
router.get('/api',     ctrl.listTransactions);

module.exports = router;
