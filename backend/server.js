const express = require('express');
const cors = require('cors');
const { connectToMovies, connectToUsers } = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const moviesRoutes = require('./routes/moviesRoutes');
const userListsRoutes = require('./routes/userListsRoutes');
const selectedRoutes = require('./routes/selectedRoutes');

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

app.use('/api', authRoutes);
app.use('/api', moviesRoutes);
app.use('/api', userListsRoutes);
app.use('/api', selectedRoutes);

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