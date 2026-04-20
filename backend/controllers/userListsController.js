const { users_pool } = require('../config/database');

async function getFavorites(req, res) {
    try {
        const user_id = parseInt(req.params.user_id, 10);
        if (isNaN(user_id)) {
            return res.status(400).json({ error: 'Invalid user_id format' });
        }

        const result = await users_pool.query(
            `SELECT favorite_movie_ids
            FROM users_fav
            WHERE user_id = $1`,
            [user_id]
        );

        const movieIds = result.rows.length > 0 ? (result.rows[0].favorite_movie_ids || []) : [];

        res.json({
            user_id,
            favorite_movies: movieIds,
            total_count: movieIds.length
        });
    } catch (err) {
        console.error('Error fetching favorites:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function addFavorite(req, res) {
    try {
        const user_id = parseInt(req.params.user_id, 10);
        const { movies } = req.body;

        if (!movies || !Array.isArray(movies)) {
            return res.status(400).json({ error: 'movies is required and must be an array' });
        }
        if (isNaN(user_id)) {
            return res.status(400).json({ error: 'Invalid user_id' });
        }

        const movieIds = movies.map(m => m.movie_id);

        const user = await users_pool.query(
            `SELECT favorite_movie_ids FROM users_fav WHERE user_id = $1`,
            [user_id]
        );

        if (user.rows.length === 0) {
            await users_pool.query(
                `INSERT INTO users_fav (user_id, favorite_movie_ids) 
                VALUES ($1, $2)`,
                [user_id, movieIds]
            );
        } else {
            const current = user.rows[0].favorite_movie_ids || [];
            const newIds = [...new Set([...current, ...movieIds])];

            await users_pool.query(
                `UPDATE users_fav SET favorite_movie_ids = $1 WHERE user_id = $2`,
                [newIds, user_id]
            );
        }

        res.json({
            status: 'success',
            message: `Processed ${movies.length} movies`,
            added_count: movieIds.length
        });

    } catch (err) {
        console.error('Error adding to favorites:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function removeFavorite(req, res) {
    try {
        const user_id = parseInt(req.params.user_id, 10);
        const movie_id = parseInt(req.params.movie_id, 10);

        const result = await users_pool.query(
            `UPDATE users_fav 
            SET favorite_movie_ids = ARRAY_REMOVE(favorite_movie_ids, $1) 
            WHERE user_id = $2 AND $1 = ANY(favorite_movie_ids)
            RETURNING favorite_movie_ids`,
            [movie_id, user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Movie not in favorites' });
        }

        res.json({
            status: 'success',
            message: `Movie ${movie_id} removed`,
            remaining_count: result.rows[0].favorite_movie_ids.length
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getWatchLater(req, res) {
    try {
        const user_id = parseInt(req.params.user_id, 10);
        if (isNaN(user_id)) {
            return res.status(400).json({ error: 'Invalid user_id format' });
        }

        const result = await users_pool.query(
            `SELECT watch_later_movie_ids
            FROM users_fav
            WHERE user_id = $1`,
            [user_id]
        );

        const movieIds = result.rows.length > 0 ? (result.rows[0].watch_later_movie_ids || []) : [];

        res.json({
            user_id,
            watch_later_movies: movieIds,
            total_count: movieIds.length
        });
    } catch (err) {
        console.error('Error fetching watch later list:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function addWatchLater(req, res) {
    try {
        const user_id = parseInt(req.params.user_id, 10);
        const { movies } = req.body;

        if (!movies || !Array.isArray(movies)) {
            return res.status(400).json({ error: 'movies is required and must be an array' });
        }
        if (isNaN(user_id)) {
            return res.status(400).json({ error: 'Invalid user_id' });
        }

        const movieIds = movies.map(m => m.movie_id);

        const user = await users_pool.query(
            `SELECT watch_later_movie_ids FROM users_fav WHERE user_id = $1`,
            [user_id]
        );

        if (user.rows.length === 0) {
            await users_pool.query(
                `INSERT INTO users_fav (user_id, watch_later_movie_ids)
                VALUES ($1, $2)`,
                [user_id, movieIds]
            );
        } else {
            const current = user.rows[0].watch_later_movie_ids || [];
            const newIds = [...new Set([...current, ...movieIds])];

            await users_pool.query(
                `UPDATE users_fav SET watch_later_movie_ids = $1 WHERE user_id = $2`,
                [newIds, user_id]
            );
        }

        res.json({
            status: 'success',
            message: `Processed ${movies.length} movies`,
            added_count: movieIds.length
        });

    } catch (err) {
        console.error('Error adding to watch later list:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function removeWatchLater(req, res) {
    try {
        const user_id = parseInt(req.params.user_id, 10);
        const movie_id = parseInt(req.params.movie_id, 10);

        const result = await users_pool.query(
            `UPDATE users_fav
            SET watch_later_movie_ids = ARRAY_REMOVE(watch_later_movie_ids, $1)
            WHERE user_id = $2 AND $1 = ANY(watch_later_movie_ids)
            RETURNING watch_later_movie_ids`,
            [movie_id, user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Movie not in watch later list' });
        }

        res.json({
            status: 'success',
            message: `Movie ${movie_id} removed`,
            remaining_count: result.rows[0].watch_later_movie_ids.length
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getSelected(req, res) {
    try {
        const user_id = parseInt(req.params.user_id, 10);
        if (isNaN(user_id)) {
            return res.status(400).json({ error: 'Invalid user_id format' });
        }

        const result = await users_pool.query(
            `SELECT selected_movie_ids
            FROM users_fav
            WHERE user_id = $1`,
            [user_id]
        );

        const movieIds = result.rows.length > 0 ? (result.rows[0].selected_movie_ids || []) : [];

        res.json({
            user_id,
            selected_movies: movieIds,
            total_count: movieIds.length
        });
    } catch (err) {
        console.error('Error fetching selected movies:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function addSelected(req, res) {
    try {
        const user_id = parseInt(req.params.user_id, 10);
        const { movies } = req.body;

        if (!movies || !Array.isArray(movies)) {
            return res.status(400).json({ error: 'movies is required and must be an array' });
        }
        if (isNaN(user_id)) {
            return res.status(400).json({ error: 'Invalid user_id' });
        }

        const movieIds = movies.map(m => m.movie_id);

        const user = await users_pool.query(
            `SELECT selected_movie_ids FROM users_fav WHERE user_id = $1`,
            [user_id]
        );

        if (user.rows.length === 0) {
            await users_pool.query(
                `INSERT INTO users_fav (user_id, selected_movie_ids)
                VALUES ($1, $2)`,
                [user_id, movieIds]
            );
        } else {
            const current = user.rows[0].selected_movie_ids || [];
            const newIds = [...new Set([...current, ...movieIds])];

            await users_pool.query(
                `UPDATE users_fav SET selected_movie_ids = $1 WHERE user_id = $2`,
                [newIds, user_id]
            );
        }

        res.json({
            status: 'success',
            message: `Processed ${movies.length} movies`,
            added_count: movieIds.length
        });

    } catch (err) {
        console.error('Error adding to selected movies:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function removeSelected(req, res) {
    try {
        const user_id = parseInt(req.params.user_id, 10);
        const movie_id = parseInt(req.params.movie_id, 10);

        const result = await users_pool.query(
            `UPDATE users_fav
            SET selected_movie_ids = ARRAY_REMOVE(selected_movie_ids, $1)
            WHERE user_id = $2 AND $1 = ANY(selected_movie_ids)
            RETURNING selected_movie_ids`,
            [movie_id, user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Movie not in selected list' });
        }

        res.json({
            status: 'success',
            message: `Movie ${movie_id} removed`,
            remaining_count: result.rows[0].selected_movie_ids.length
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
}


module.exports = {
    getFavorites,
    addFavorite,
    removeFavorite,
    getWatchLater,
    addWatchLater,
    removeWatchLater,
    getSelected,
    addSelected,
    removeSelected
};