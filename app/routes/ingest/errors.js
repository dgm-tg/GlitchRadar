const express = require('express');
const router  = express.Router();
const { requireApiKey } = require('../../middleware/apiKey');
const { ingestError }   = require('../../controllers/errorController');

router.post('/', requireApiKey, ingestError);

module.exports = router;
