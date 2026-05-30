const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/projectController');

router.get('/',       ctrl.listProjects);
router.post('/',      ctrl.createProject);
router.delete('/:id', ctrl.deleteProject);

module.exports = router;
