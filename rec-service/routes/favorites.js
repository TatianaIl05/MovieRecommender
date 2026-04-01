const express = require('express');
const router = express.Router();

module.exports = (favoritesController) => {
  // POST /favorites/:user_id - добавить избранные фильмы
  router.post('/:user_id', favoritesController.addFavorites.bind(favoritesController));
  
  // GET /favorites/:user_id - получить избранные фильмы
  router.get('/:user_id', favoritesController.getFavorites.bind(favoritesController));
  
  // GET /favorites/:user_id/list - получить список названий
  router.get('/:user_id/list', favoritesController.getFavoritesList.bind(favoritesController));
  
  // DELETE /favorites/:user_id/:movie_id - удалить из избранного
  router.delete('/:user_id/:movie_id', favoritesController.deleteFavorite.bind(favoritesController));
  
  // GET /favorites/:user_id/check/:movie_id - проверить наличие
  router.get('/:user_id/check/:movie_id', favoritesController.checkFavorite.bind(favoritesController));
  
  // GET /favorites/stats - статистика
  router.get('/stats', favoritesController.getStats.bind(favoritesController));
  
  return router;
};