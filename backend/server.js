const express = require('express');
const cors = require('cors');
const { connectToMovies, connectToUsers } = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const moviesRoutes = require('./routes/moviesRoutes');
const userListsRoutes = require('./routes/userListsRoutes');

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Simple in-memory rate limiter (replaces express-rate-limit)
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

    // Clean up old entries every 100 requests globally
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

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

(async () => {
    await connectToMovies();
    await connectToUsers();

    app.listen(PORT, HOST, () => {
        console.log(`Server running on ${HOST}:${PORT}`);
    });
})();
