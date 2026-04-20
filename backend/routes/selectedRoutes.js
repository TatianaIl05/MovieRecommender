const express = require('express');
const router = express.Router();
const selectedController = require('../controllers/selectedController');

router.get('/selected/:user_id', selectedController.getSelected);
router.post('/selected/:user_id', selectedController.addSelected);
router.delete('/selected/:user_id/:movie_id', selectedController.removeSelected);

module.exports = router;