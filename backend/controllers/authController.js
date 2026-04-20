const bcrypt = require('bcrypt');
const { users_pool } = require('../config/database');

async function register(req, res) {
    const { login, email, password } = req.body;

    if (!login || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await users_pool.query(
            'INSERT INTO users (login, email, password_hash) VALUES ($1, $2, $3) RETURNING id, login, email, created_at',
            [login, email, hashedPassword]
        );

        res.status(201).json({
            message: 'Registration successful!',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Registration error:', error);

        if (error.code === '23505') {
            const field = error.constraint.includes('login') ? 'login' : 'email';
            return res.status(409).json({ error: `User with this ${field} already exists` });
        }

        res.status(500).json({ error: 'Server error' });
    }
}

async function login(req, res) {
    const { login, password } = req.body;

    if (!login || !password) {
        return res.status(400).json({ error: 'Enter login and password' });
    }

    try {
        const result = await users_pool.query(
            'SELECT * FROM users WHERE login = $1',
            [login]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid login or password' });
        }

        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid login or password' });
        }

        res.json({
            message: 'Login successful!',
            user: { id: user.id, login: user.login, email: user.email }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
}

async function getUsers(req, res) {
    try {
        const result = await users_pool.query('SELECT id, login, email, created_at FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching data' });
    }
}

module.exports = {
    register,
    login,
    getUsers
};