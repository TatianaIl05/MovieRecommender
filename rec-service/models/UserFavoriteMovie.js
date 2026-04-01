// Модель для работы с избранными фильмами
class UserFavoriteMovie {
  constructor(db) {
    this.db = db;
  }

  // Добавить фильмы в избранное
  async addMovies(userId, movies) {
    const added = [];
    const skipped = [];

    for (const movie of movies) {
      try {
        // Проверяем, существует ли уже
        const checkResult = await this.db.query(
          'SELECT id FROM user_favorite_movies WHERE user_id = $1 AND movie_id = $2',
          [userId, movie.movie_id]
        );

        if (checkResult.rows.length > 0) {
          skipped.push(movie);
          continue;
        }

        // Добавляем новый фильм
        await this.db.query(
          `INSERT INTO user_favorite_movies (user_id, movie_id, movie_title)
           VALUES ($1, $2, $3)`,
          [userId, movie.movie_id, movie.title]
        );
        
        added.push(movie);
      } catch (error) {
        console.error(`Ошибка добавления фильма ${movie.movie_id}:`, error);
        throw error;
      }
    }

    return {
      added,
      skipped,
      total_added: added.length,
      total_skipped: skipped.length
    };
  }

  // Получить все избранные фильмы пользователя
  async getUserFavorites(userId, limit = null) {
    let query = `
      SELECT id, user_id, movie_id, movie_title, created_at
      FROM user_favorite_movies
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    
    const params = [userId];
    
    if (limit) {
      query += ` LIMIT $2`;
      params.push(limit);
    }
    
    const result = await this.db.query(query, params);
    return result.rows;
  }

  // Получить количество избранных фильмов
  async getFavoritesCount(userId) {
    const result = await this.db.query(
      'SELECT COUNT(*) FROM user_favorite_movies WHERE user_id = $1',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  // Удалить фильм из избранного
  async deleteFavorite(userId, movieId) {
    const result = await this.db.query(
      'DELETE FROM user_favorite_movies WHERE user_id = $1 AND movie_id = $2',
      [userId, movieId]
    );
    return result.rowCount > 0;
  }

  // Проверить, есть ли фильм в избранном
  async isFavorite(userId, movieId) {
    const result = await this.db.query(
      'SELECT id FROM user_favorite_movies WHERE user_id = $1 AND movie_id = $2',
      [userId, movieId]
    );
    return result.rows.length > 0;
  }

  // Получить статистику
  async getStats() {
    const totalResult = await this.db.query(
      'SELECT COUNT(*) FROM user_favorite_movies'
    );
    const usersResult = await this.db.query(
      'SELECT COUNT(DISTINCT user_id) FROM user_favorite_movies'
    );
    
    const topMoviesResult = await this.db.query(`
      SELECT movie_id, movie_title, COUNT(*) as count
      FROM user_favorite_movies
      GROUP BY movie_id, movie_title
      ORDER BY count DESC
      LIMIT 10
    `);
    
    return {
      total_favorites: parseInt(totalResult.rows[0].count),
      unique_users: parseInt(usersResult.rows[0].count),
      top_favorite_movies: topMoviesResult.rows.map(row => ({
        movie_id: row.movie_id,
        title: row.movie_title,
        count: parseInt(row.count)
      }))
    };
  }

  // Получить список названий избранных фильмов
  async getFavoritesList(userId) {
    const result = await this.db.query(
      `SELECT movie_title FROM user_favorite_movies 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows.map(row => row.movie_title);
  }
}

module.exports = UserFavoriteMovie;