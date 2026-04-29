const { movies_pool } = require('../config/database');

async function getMovies(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search || '';

        let query, params;

        if (search) {
            query = 'SELECT id, title, release_date FROM movies WHERE title ILIKE $1 ORDER BY popularity_norm DESC LIMIT $2 OFFSET $3';
            params = [`%${search}%`, limit, offset];
        } else {
            query = 'SELECT id, title, release_date FROM movies ORDER BY popularity_norm DESC LIMIT $1 OFFSET $2';
            params = [limit, offset];
        }

        const result = await movies_pool.query(query, params);

        let total;
        if (search) {
            total = await movies_pool.query('SELECT COUNT(*) FROM movies WHERE title ILIKE $1', [`%${search}%`]);
        } else {
            total = await movies_pool.query('SELECT COUNT(*) FROM movies');
        }

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
}

async function getMovieById(req, res) {
    try {
        const { movie_id } = req.params;
        const result = await movies_pool.query(
            'SELECT id, title, genres, overview, release_date, vote_average, poster_path, tagline, runtime, belongs_to_collection FROM movies WHERE id = $1',
            [movie_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getPopularMovies(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        const result = await movies_pool.query(
            'SELECT id, title, release_date FROM movies ORDER BY popularity_norm DESC, vote_average DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );

        res.json({
            limit,
            offset,
            movies: result.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

async function getMoviesByIds(req, res) {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'ids is required and must be an array' });
        }

        const result = await movies_pool.query(
            'SELECT id, title, genres, overview, release_date, vote_average, poster_path, tagline, runtime, belongs_to_collection FROM movies WHERE id = ANY($1)',
            [ids]
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    getMovies,
    getMovieById,
    getPopularMovies,
    getMoviesByIds
};
