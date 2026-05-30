const express = require('express');
const router  = express.Router();
const { requireApiKey }       = require('../../middleware/apiKey');
const { ingestTransaction }   = require('../../controllers/transactionController');

router.post('/', requireApiKey, ingestTransaction);

module.exports = router;
