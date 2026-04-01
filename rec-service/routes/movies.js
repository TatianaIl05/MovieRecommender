const express = require('express');
const router = express.Router();

module.exports = (movieService) => {
  // GET /movies - все фильмы
  router.get('/', async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      const result = await movieService.getAllMovies(limit, offset);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });
  
  // GET /movies/count - количество фильмов
  router.get('/count', async (req, res, next) => {
    try {
      const count = await movieService.getMoviesCount();
      res.json({ count });
    } catch (error) {
      next(error);
    }
  });
  
  // GET /movies/search - поиск
  router.get('/search', async (req, res, next) => {
    try {
      const query = req.query.q;
      if (!query) {
        return res.status(400).json({ error: 'Query parameter q is required' });
      }
      const limit = parseInt(req.query.limit) || 20;
      const result = await movieService.searchMovies(query, limit);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });
  
  // GET /movies/:movie_id - конкретный фильм
  router.get('/:movie_id', async (req, res, next) => {
    try {
      const movieId = parseInt(req.params.movie_id);
      const movie = await movieService.getMovieById(movieId);
      
      if (!movie) {
        return res.status(404).json({ error: 'Movie not found' });
      }
      
      res.json(movie);
    } catch (error) {
      next(error);
    }
  });
  
  return router;
};