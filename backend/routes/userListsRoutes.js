const express = require('express');
const router = express.Router();
const userListsController = require('../controllers/userListsController');

router.get('/favorites/:user_id', userListsController.getFavorites);
router.post('/favorites/:user_id', userListsController.addFavorite);
router.delete('/favorites/:user_id/:movie_id', userListsController.removeFavorite);

router.get('/watch-later/:user_id', userListsController.getWatchLater);
router.post('/watch-later/:user_id', userListsController.addWatchLater);
router.delete('/watch-later/:user_id/:movie_id', userListsController.removeWatchLater);

router.get('/selected/:user_id', userListsController.getSelected);
router.post('/selected/:user_id', userListsController.addSelected);
router.delete('/selected/:user_id/:movie_id', userListsController.removeSelected);

router.get('/disliked/:user_id', userListsController.getDisliked);
router.post('/disliked/:user_id', userListsController.addDisliked);
router.delete('/disliked/:user_id/:movie_id', userListsController.removeDisliked);

module.exports = router;
