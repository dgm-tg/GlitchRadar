const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/orgController');

router.get('/:token',  ctrl.showInvite);
router.post('/:token', ctrl.acceptInvite);

module.exports = router;
