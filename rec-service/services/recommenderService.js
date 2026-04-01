// Сервис рекомендаций (упрощенная версия)
class RecommenderService {
  constructor(db) {
    this.db = db;
    this.moviesCache = null;
  }

  // Загрузить фильмы в кэш
  async loadMovies() {
    if (!this.moviesCache) {
      const result = await this.db.query(
        'SELECT movie_id, title, genres FROM movies'
      );
      this.moviesCache = result.rows;
    }
    return this.moviesCache;
  }

  // Получить рекомендации на основе избранного фильма
  async getRecommendationsByMovie(movieId, limit = 10) {
    await this.loadMovies();
    
    // Находим фильм
    const movie = this.moviesCache.find(m => m.movie_id === movieId);
    if (!movie) return [];
    
    // Простая рекомендация: ищем фильмы с похожими жанрами
    const movieGenres = movie.genres.split('|');
    
    const recommendations = [];
    for (const otherMovie of this.moviesCache) {
      if (otherMovie.movie_id === movieId) continue;
      
      const otherGenres = otherMovie.genres.split('|');
      let matchScore = 0;
      
      // Считаем количество общих жанров
      for (const genre of movieGenres) {
        if (otherGenres.includes(genre)) {
          matchScore += 1;
        }
      }
      
      if (matchScore > 0) {
        recommendations.push({
          movie_id: otherMovie.movie_id,
          title: otherMovie.title,
          genres: otherMovie.genres,
          score: matchScore / Math.max(movieGenres.length, otherGenres.length)
        });
      }
    }
    
    // Сортируем по score и берем топ
    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.slice(0, limit);
  }

  // Получить рекомендации на основе избранного пользователя
  async getRecommendationsByUser(userId, limit = 10) {
    // Получаем первый избранный фильм пользователя
    const result = await this.db.query(
      'SELECT movie_id FROM user_favorite_movies WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return [];
    }
    
    const favoriteMovieId = result.rows[0].movie_id;
    return this.getRecommendationsByMovie(favoriteMovieId, limit);
  }
}

module.exports = RecommenderService;