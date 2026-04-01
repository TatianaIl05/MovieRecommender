// Сервис для работы с фильмами
class MovieService {
  constructor(db) {
    this.db = db;
  }

  // Получить все фильмы с пагинацией
  async getAllMovies(limit = 20, offset = 0) {
    const result = await this.db.query(
      `SELECT movie_id, title, genres 
       FROM movies 
       ORDER BY movie_id 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    const countResult = await this.db.query(
      'SELECT COUNT(*) FROM movies'
    );
    
    return {
      total: parseInt(countResult.rows[0].count),
      limit,
      offset,
      movies: result.rows
    };
  }

  // Получить фильм по ID
  async getMovieById(movieId) {
    const result = await this.db.query(
      'SELECT movie_id, title, genres FROM movies WHERE movie_id = $1',
      [movieId]
    );
    return result.rows[0] || null;
  }

  // Поиск фильмов
  async searchMovies(query, limit = 20) {
    const result = await this.db.query(
      `SELECT movie_id, title, genres 
       FROM movies 
       WHERE title ILIKE $1 
       LIMIT $2`,
      [`%${query}%`, limit]
    );
    
    return {
      query,
      total_found: result.rows.length,
      movies: result.rows
    };
  }

  // Получить количество фильмов
  async getMoviesCount() {
    const result = await this.db.query('SELECT COUNT(*) FROM movies');
    return parseInt(result.rows[0].count);
  }
}

module.exports = MovieService;