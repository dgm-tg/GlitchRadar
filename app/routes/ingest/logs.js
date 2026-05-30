const express = require('express');
const router  = express.Router();
const { requireApiKey } = require('../../middleware/apiKey');
const { ingestLog }     = require('../../controllers/logController');

router.post('/', requireApiKey, ingestLog);

module.exports = router;
