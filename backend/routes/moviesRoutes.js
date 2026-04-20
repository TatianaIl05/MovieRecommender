const express = require('express');
const router = express.Router();
const moviesController = require('../controllers/moviesController');

router.get('/movies', moviesController.getMovies);
router.get('/movies/popular', moviesController.getPopularMovies);
router.post('/movies/by-ids', moviesController.getMoviesByIds);
router.get('/movies/:movie_id', moviesController.getMovieById);

module.exports = router;