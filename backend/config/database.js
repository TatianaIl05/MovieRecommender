const { Pool } = require('pg');

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
            console.log('Connected to movies database');
            return;
        } catch (err) {
            retries--;
            console.log(`Waiting for movies... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    console.error('Failed to connect to movies database');
    process.exit(1);
}

async function connectToUsers() {
    let retries = 20;
    while (retries > 0) {
        try {
            await users_pool.query('SELECT 1');
            console.log('Connected to users database');
            return;
        } catch (err) {
            retries--;
            console.log(`Waiting for users... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    console.error('Failed to connect to users database');
    process.exit(1);
}

module.exports = {
    movies_pool,
    users_pool,
    connectToMovies,
    connectToUsers
};