const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/errorController');

router.get('/',         ctrl.showIssueList);
router.get('/api',      ctrl.listIssues);
router.post('/bulk',    ctrl.bulkUpdateIssues);   // must come before /:id
router.get('/:id',      ctrl.showIssueDetail);
router.get('/:id/data', ctrl.getIssue);
router.patch('/:id',    ctrl.updateIssueStatus);

module.exports = router;
