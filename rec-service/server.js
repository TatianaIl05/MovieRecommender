const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(express.json());
app.use(require('cors')());

// Подключение к PostgreSQL
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'movierec',
});

// Проверка подключения
pool.connect((err, client, release) => {
    if (err) {
        console.error('Ошибка подключения к PostgreSQL:', err.message);
    } else {
        console.log('Подключено к PostgreSQL');
        release();
    }
});

// health
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Получить все фильмы
app.get('/movies', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        
        const result = await pool.query(
            'SELECT movie_id, title, genres FROM movies ORDER BY movie_id LIMIT $1 OFFSET $2',
            [limit, offset]
        );
        
        const total = await pool.query('SELECT COUNT(*) FROM movies');
        
        res.json({
            total: parseInt(total.rows[0].count),
            limit,
            offset,
            movies: result.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Получить фильм по ID
app.get('/movies/:movie_id', async (req, res) => {
    try {
        const { movie_id } = req.params;
        const result = await pool.query(
            'SELECT movie_id, title, genres FROM movies WHERE movie_id = $1',
            [movie_id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Movie not found' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Поиск фильмов
app.get('/movies/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'Query parameter q is required' });
        }
        
        const result = await pool.query(
            'SELECT movie_id, title, genres FROM movies WHERE title ILIKE $1 LIMIT 20',
            [`%${query}%`]
        );
        
        res.json({
            query,
            total_found: result.rows.length,
            movies: result.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Количество фильмов
app.get('/movies/count', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM movies');
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Получить избранное пользователя
app.get('/favorites/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        const result = await pool.query(
            `SELECT id, user_id, movie_id, movie_title, created_at 
             FROM user_favorite_movies 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
            [user_id]
        );
        
        res.json({
            user_id: parseInt(user_id),
            favorite_movies: result.rows,
            total_count: result.rows.length
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Добавить в избранное
app.post('/favorites/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        const { movies } = req.body;
        
        if (!movies || !Array.isArray(movies)) {
            return res.status(400).json({ error: 'movies is required and must be an array' });
        }
        
        const added = [];
        const skipped = [];
        
        for (const movie of movies) {
            // Проверяем, есть ли уже
            const check = await pool.query(
                'SELECT id FROM user_favorite_movies WHERE user_id = $1 AND movie_id = $2',
                [user_id, movie.movie_id]
            );
            
            if (check.rows.length > 0) {
                skipped.push(movie);
                continue;
            }
            
            // Добавляем
            await pool.query(
                'INSERT INTO user_favorite_movies (user_id, movie_id, movie_title) VALUES ($1, $2, $3)',
                [user_id, movie.movie_id, movie.title]
            );
            added.push(movie);
        }
        
        res.json({
            status: 'success',
            message: `Added ${added.length} movies`,
            details: {
                added,
                skipped,
                total_added: added.length,
                total_skipped: skipped.length
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Удалить из избранного
app.delete('/favorites/:user_id/:movie_id', async (req, res) => {
    try {
        const { user_id, movie_id } = req.params;
        const result = await pool.query(
            'DELETE FROM user_favorite_movies WHERE user_id = $1 AND movie_id = $2',
            [user_id, movie_id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Favorite movie not found' });
        }
        
        res.json({
            status: 'success',
            message: `Movie ${movie_id} removed from favorites`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Проверить наличие в избранном
app.get('/favorites/:user_id/check/:movie_id', async (req, res) => {
    try {
        const { user_id, movie_id } = req.params;
        const result = await pool.query(
            'SELECT id FROM user_favorite_movies WHERE user_id = $1 AND movie_id = $2',
            [user_id, movie_id]
        );
        
        res.json({
            user_id: parseInt(user_id),
            movie_id: parseInt(movie_id),
            is_favorite: result.rows.length > 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Список названий избранного
app.get('/favorites/:user_id/list', async (req, res) => {
    try {
        const { user_id } = req.params;
        const result = await pool.query(
            'SELECT movie_title FROM user_favorite_movies WHERE user_id = $1 ORDER BY created_at DESC',
            [user_id]
        );
        
        const favorites = result.rows.map(row => row.movie_title);
        
        if (favorites.length === 0) {
            return res.json({
                user_id: parseInt(user_id),
                favorites: [],
                message: 'Нет избранных фильмов'
            });
        }
        
        res.json({
            user_id: parseInt(user_id),
            favorites: favorites,
            count: favorites.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Статистика
app.get('/favorites/stats', async (req, res) => {
    try {
        const total = await pool.query('SELECT COUNT(*) FROM user_favorite_movies');
        const users = await pool.query('SELECT COUNT(DISTINCT user_id) FROM user_favorite_movies');
        const top = await pool.query(`
            SELECT movie_id, movie_title, COUNT(*) as count
            FROM user_favorite_movies
            GROUP BY movie_id, movie_title
            ORDER BY count DESC
            LIMIT 10
        `);
        
        res.json({
            total_favorites: parseInt(total.rows[0].count),
            unique_users: parseInt(users.rows[0].count),
            top_favorite_movies: top.rows.map(row => ({
                movie_id: row.movie_id,
                title: row.movie_title,
                count: parseInt(row.count)
            }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Рекомендации на основе избранного
app.get('/users/:user_id/recommendations-with-favorites', async (req, res) => {
    try {
        const { user_id } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        
        // Получаем первый избранный фильм
        const favorite = await pool.query(
            'SELECT movie_id FROM user_favorite_movies WHERE user_id = $1 LIMIT 1',
            [user_id]
        );
        
        if (favorite.rows.length === 0) {
            return res.status(404).json({ error: 'No favorite movies found' });
        }
        
        const favoriteMovieId = favorite.rows[0].movie_id;
        
        // Получаем фильм для поиска похожих
        const movie = await pool.query(
            'SELECT title, genres FROM movies WHERE movie_id = $1',
            [favoriteMovieId]
        );
        
        let recommendations = [];
        
        if (movie.rows.length > 0) {
            const genres = movie.rows[0].genres.split('|');
            
            // Поиск фильмов с похожими жанрами
            const genreConditions = genres.map((_, i) => `genres LIKE $${i + 2}`).join(' OR ');
            const params = [favoriteMovieId, ...genres.map(g => `%${g}%`), limit];
            
            const recs = await pool.query(
                `SELECT movie_id, title, genres 
                 FROM movies 
                 WHERE movie_id != $1 AND (${genreConditions})
                 LIMIT $${params.length}`,
                params
            );
            
            recommendations = recs.rows.map(r => ({
                movie_id: r.movie_id,
                title: r.title,
                genres: r.genres,
                score: 0.5
            }));
        }
        
        // Если нет похожих, просто берем другие фильмы
        if (recommendations.length === 0) {
            const recs = await pool.query(
                'SELECT movie_id, title, genres FROM movies WHERE movie_id != $1 LIMIT $2',
                [favoriteMovieId, limit]
            );
            recommendations = recs.rows.map(r => ({
                movie_id: r.movie_id,
                title: r.title,
                genres: r.genres,
                score: 0.3
            }));
        }
        
        res.json({
            user_id: parseInt(user_id),
            based_on_favorite_movie: favoriteMovieId,
            recommendations: recommendations
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`
Movie Recommender Service
Server running on http://localhost:${PORT}
API: http://localhost:${PORT}/health
PostgreSQL connected
    `);
});