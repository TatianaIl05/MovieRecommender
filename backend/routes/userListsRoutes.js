const express = require('express');
const router = express.Router();
const userListsController = require('../controllers/userListsController');

router.get('/favorites/:user_id', userListsController.getFavorites);
router.post('/favorites/:user_id', userListsController.addFavorite);
router.delete('/favorites/:user_id/:movie_id', userListsController.removeFavorite);

router.get('/watch-later/:user_id', userListsController.getWatchLater);
router.post('/watch-later/:user_id', userListsController.addWatchLater);
router.delete('/watch-later/:user_id/:movie_id', userListsController.removeWatchLater);

module.exports = router;