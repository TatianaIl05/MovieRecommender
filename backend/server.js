const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { connectToMovies, connectToUsers, movies_pool, users_pool } = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const moviesRoutes = require('./routes/moviesRoutes');
const userListsRoutes = require('./routes/userListsRoutes');

const app = express();

app.use(compression());
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Simple in-memory rate limiter
const requestCounts = new Map();
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_REQUESTS = 120;

function simpleRateLimit(req, res, next) {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - RATE_WINDOW_MS;

    const requests = requestCounts.get(key) || [];
    const recentRequests = requests.filter(time => time > windowStart);

    if (recentRequests.length >= RATE_MAX_REQUESTS) {
        return res.status(429).json({ error: 'Too many requests, please try again later.' });
    }

    recentRequests.push(now);
    requestCounts.set(key, recentRequests);

    if (requestCounts.size > 1000) {
        for (const [k, times] of requestCounts) {
            const filtered = times.filter(t => t > windowStart);
            if (filtered.length === 0) requestCounts.delete(k);
            else requestCounts.set(k, filtered);
        }
    }

    next();
}

app.use('/api', simpleRateLimit);
app.use('/api', authRoutes);
app.use('/api', moviesRoutes);
app.use('/api', userListsRoutes);

app.get('/health', async (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {}
    };

    try {
        await movies_pool.query('SELECT 1');
        health.services.movies_db = 'connected';
    } catch (err) {
        health.services.movies_db = 'error';
        health.status = 'degraded';
    }

    try {
        await users_pool.query('SELECT 1');
        health.services.users_db = 'connected';
    } catch (err) {
        health.services.users_db = 'error';
        health.status = 'degraded';
    }

    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

(async () => {
    await connectToMovies();
    await connectToUsers();

    const server = app.listen(PORT, HOST, () => {
        console.log(`Server running on ${HOST}:${PORT}`);
    });

    const gracefulShutdown = (signal) => {
        console.log(`Received ${signal}, shutting down gracefully...`);
        server.close(() => {
            console.log('HTTP server closed');
            Promise.all([
                movies_pool.end(),
                users_pool.end()
            ]).then(() => {
                console.log('Database pools closed');
                process.exit(0);
            }).catch((err) => {
                console.error('Error closing pools:', err);
                process.exit(1);
            });
        });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
})();