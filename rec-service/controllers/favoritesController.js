const UserFavoriteMovie = require('../models/UserFavoriteMovie');

class FavoritesController {
  constructor(db) {
    this.favoritesModel = new UserFavoriteMovie(db);
  }

  // Добавить фильмы в избранное
  async addFavorites(req, res, next) {
    try {
      const userId = parseInt(req.params.user_id);
      const { movies } = req.body;
      
      if (!movies || !Array.isArray(movies)) {
        return res.status(400).json({ error: 'movies is required and must be an array' });
      }
      
      if (movies.length < 5) {
        return res.status(400).json({ error: 'Minimum 5 movies required' });
      }
      
      if (movies.length > 10) {
        return res.status(400).json({ error: 'Maximum 10 movies allowed' });
      }
      
      const result = await this.favoritesModel.addMovies(userId, movies);
      
      res.json({
        status: 'success',
        message: `Added ${result.total_added} movies`,
        details: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Получить избранные фильмы
  async getFavorites(req, res, next) {
    try {
      const userId = parseInt(req.params.user_id);
      const limit = req.query.limit ? parseInt(req.query.limit) : null;
      
      const favorites = await this.favoritesModel.getUserFavorites(userId, limit);
      const totalCount = await this.favoritesModel.getFavoritesCount(userId);
      
      res.json({
        user_id: userId,
        favorite_movies: favorites,
        total_count: totalCount
      });
    } catch (error) {
      next(error);
    }
  }

  // Получить список названий
  async getFavoritesList(req, res, next) {
    try {
      const userId = parseInt(req.params.user_id);
      const favorites = await this.favoritesModel.getFavoritesList(userId);
      
      if (favorites.length === 0) {
        return res.json({
          user_id: userId,
          favorites: [],
          message: 'Нет избранных фильмов'
        });
      }
      
      res.json({
        user_id: userId,
        favorites: favorites,
        count: favorites.length
      });
    } catch (error) {
      next(error);
    }
  }

  // Удалить фильм из избранного
  async deleteFavorite(req, res, next) {
    try {
      const userId = parseInt(req.params.user_id);
      const movieId = parseInt(req.params.movie_id);
      
      const deleted = await this.favoritesModel.deleteFavorite(userId, movieId);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Favorite movie not found' });
      }
      
      res.json({
        status: 'success',
        message: `Movie ${movieId} removed from favorites`
      });
    } catch (error) {
      next(error);
    }
  }

  // Проверить наличие фильма в избранном
  async checkFavorite(req, res, next) {
    try {
      const userId = parseInt(req.params.user_id);
      const movieId = parseInt(req.params.movie_id);
      
      const isFavorite = await this.favoritesModel.isFavorite(userId, movieId);
      
      res.json({
        user_id: userId,
        movie_id: movieId,
        is_favorite: isFavorite
      });
    } catch (error) {
      next(error);
    }
  }

  // Получить статистику
  async getStats(req, res, next) {
    try {
      const stats = await this.favoritesModel.getStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = FavoritesController;