const express = require('express');
const router = express.Router();

module.exports = (recommenderService, db) => {
  // GET /users/:user_id/recommendations-with-favorites
  router.get('/users/:user_id/recommendations-with-favorites', async (req, res, next) => {
    try {
      const userId = parseInt(req.params.user_id);
      const limit = parseInt(req.query.limit) || 10;
      
      const recommendations = await recommenderService.getRecommendationsByUser(userId, limit);
      
      if (recommendations.length === 0) {
        return res.status(404).json({ error: 'No recommendations found' });
      }
      
      // Получаем первый избранный фильм для ответа
      const favoritesResult = await db.query(
        'SELECT movie_id FROM user_favorite_movies WHERE user_id = $1 LIMIT 1',
        [userId]
      );
      
      res.json({
        user_id: userId,
        based_on_favorite_movie: favoritesResult.rows[0]?.movie_id || null,
        recommendations: recommendations
      });
    } catch (error) {
      next(error);
    }
  });
  
  return router;
};