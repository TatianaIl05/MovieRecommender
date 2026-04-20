const express = require('express');
const router = express.Router();
const { getSelected, addSelected, removeSelected } = require('../controllers/userListsController');

router.get('/selected/:user_id', getSelected);
router.post('/selected/:user_id', addSelected);
router.delete('/selected/:user_id/:movie_id', removeSelected);

module.exports = router;