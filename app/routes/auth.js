const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');

router.get('/login',   ctrl.showLogin);
router.get('/signup',  ctrl.showSignup);
router.post('/signup', ctrl.signup);
router.post('/login',  ctrl.login);
router.get('/logout',  ctrl.logout);

module.exports = router;
