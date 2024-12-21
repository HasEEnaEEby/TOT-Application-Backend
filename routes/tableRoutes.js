const express = require('express');
const tableController = require('../controller/TableController');
const router = express.Router();

router.post('/assign', tableController.assignTable);
router.post('/release', tableController.releaseTable);
router.get('/:tableNumber/status', tableController.getTableStatus);

module.exports = router;
