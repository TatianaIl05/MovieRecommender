const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));



const movies_pool = new Pool({
    user: 'admin',
    host: 'movies_db',
    database: 'movies',
    password: 'password',
    port: 5432,
});

const users_pool = new Pool({
    user: 'admin',
    host: 'users_db',
    database: 'users',
    password: 'password',
    port: 5432,
});




async function connectToMovies() {
    let retries = 20;
    while (retries > 0) {
        try {
            await movies_pool.query('SELECT 1');
            console.log('Подключение к movies установлено');
            return;
        } catch (err) {
            retries--;
            console.log(`Ожидание movies... (${retries} попыток осталось)`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    console.error('❌ Не удалось подключиться к movies');
    process.exit(1);
}

async function connectToUsers() {
    let retries = 20;
    while (retries > 0) {
        try {
            await users_pool.query('SELECT 1');
            console.log('Подключение к users установлено');
            return;
        } catch (err) {
            retries--;
            console.log(`Ожидание users... (${retries} попыток осталось)`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    console.error('❌ Не удалось подключиться к users');
    process.exit(1);
}


app.post('/api/register', async (req, res) => {
    const { login, email, password } = req.body;

    if (!login || !email || !password) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await users_pool.query(
            'INSERT INTO users (login, email, password_hash) VALUES ($1, $2, $3) RETURNING id, login, email, created_at',
            [login, email, hashedPassword]
        );

        res.status(201).json({ 
            message: 'Регистрация успешна!', 
            user: result.rows[0] 
        });
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        
        if (error.code === '23505') {
            const field = error.constraint.includes('login') ? 'login' : 'email';
            return res.status(409).json({ error: `Пользователь с таким ${field} уже существует` });
        }
        
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});


app.post('/api/login', async (req, res) => {
    const { login, password } = req.body;

    if (!login || !password) {
        return res.status(400).json({ error: 'Введите login и пароль' });
    }

    try {
        const result = await users_pool.query(
            'SELECT * FROM users WHERE login = $1',
            [login]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Неверный login или пароль' });
        }

        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid) {
            return res.status(401).json({ error: 'Неверный login или пароль' });
        }

        res.json({ 
            message: 'Вход успешен!', 
            user: { id: user.id, login: user.login, email: user.email } 
        });
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const result = await users_pool.query('SELECT id, login, email, created_at FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при получении данных' });
    }
});





app.get('/api/movies', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        
        const result = await movies_pool.query(
            'SELECT id, title, release_date FROM movies ORDER BY id LIMIT $1 OFFSET $2',
            [limit, offset]
        );
        
        const total = await movies_pool.query('SELECT COUNT(*) FROM movies');
        
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


app.get('/api/movies/:movie_id', async (req, res) => {
    try {
        const { movie_id } = req.params;
        const result = await movies_pool.query(
            'SELECT id, title, genres, overview, release_date, vote_average, poster_path FROM movies WHERE id = $1',
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


app.get('/api/favorites/:user_id', async (req, res) => {
    try {
        const user_id = parseInt(req.params.user_id, 10);
        if (isNaN(user_id)) {
            return res.status(400).json({ error: 'Неверный формат user_id' });
        }

        const result = await users_pool.query(
            `SELECT UNNEST(favorite_movie_ids) AS movie_id 
            FROM users_fav 
            WHERE user_id = $1`,
            [user_id]
        );

        const movieIds = result.rows.map(row => row.movie_id);

        res.json({
            user_id,
            favorite_movies: movieIds,
            total_count: movieIds.length
        });
    } catch (err) {
        console.error('Ошибка при получении избранного:', err);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

app.post('/api/favorites/:user_id', async (req, res) => {
    try {
        const user_id = parseInt(req.params.user_id, 10);
        const { movies } = req.body;
        
        if (!movies || !Array.isArray(movies)) {
            return res.status(400).json({ error: 'movies is required and must be an array' });
        }
        if (isNaN(user_id)) {
            return res.status(400).json({ error: 'Неверный user_id' });
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
        console.error('Ошибка добавления в избранное:', err);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});



app.delete('/api/favorites/:user_id/:movie_id', async (req, res) => {
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
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


const PORT = 3000;

(async () => {
    await connectToMovies();
    await connectToUsers();
    
    
    app.listen(PORT, () => {
        console.log(`Сервер запущен: http://localhost:${PORT}`);
    });
})();
