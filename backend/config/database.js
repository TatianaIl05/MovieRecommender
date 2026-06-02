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
            await ensureMovieSearchSupport();
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

async function ensureMovieSearchSupport() {
    await movies_pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    await ensureMovieArrayColumn('genres');
    await ensureMovieArrayColumn('production_countries');
    await ensureMovieArrayColumn('spoken_languages');
    await movies_pool.query('CREATE INDEX IF NOT EXISTS movies_title_trgm_idx ON movies USING GIN (lower(title) gin_trgm_ops)');
    await movies_pool.query('CREATE INDEX IF NOT EXISTS movies_original_title_trgm_idx ON movies USING GIN (lower(original_title) gin_trgm_ops)');
    await movies_pool.query('CREATE INDEX IF NOT EXISTS movies_genres_gin_idx ON movies USING GIN (genres)');
    await movies_pool.query('CREATE INDEX IF NOT EXISTS movies_production_countries_gin_idx ON movies USING GIN (production_countries)');
    await movies_pool.query('CREATE INDEX IF NOT EXISTS movies_spoken_languages_gin_idx ON movies USING GIN (spoken_languages)');
    await movies_pool.query('CREATE INDEX IF NOT EXISTS movies_collection_idx ON movies (belongs_to_collection)');
    await movies_pool.query('CREATE INDEX IF NOT EXISTS movies_release_date_idx ON movies (release_date)');
    await movies_pool.query('CREATE INDEX IF NOT EXISTS movies_vote_average_idx ON movies (vote_average)');
    await movies_pool.query('CREATE INDEX IF NOT EXISTS movies_runtime_idx ON movies (runtime)');
}

async function ensureMovieArrayColumn(columnName) {
    const allowedColumns = new Set(['genres', 'production_countries', 'spoken_languages']);
    if (!allowedColumns.has(columnName)) {
        throw new Error(`Unsupported movie array column: ${columnName}`);
    }

    const result = await movies_pool.query(
        `
            SELECT data_type
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'movies'
              AND column_name = $1
        `,
        [columnName]
    );

    if (result.rows[0]?.data_type === 'ARRAY') {
        return;
    }

    await movies_pool.query(`
        ALTER TABLE movies
        ALTER COLUMN ${columnName} TYPE text[]
        USING CASE
            WHEN ${columnName} IS NULL OR ${columnName} = '' THEN NULL
            ELSE string_to_array(${columnName}, ', ')
        END
    `);
}

async function connectToUsers() {
    let retries = 20;
    while (retries > 0) {
        try {
            await users_pool.query('SELECT 1');
            await ensureUserAuthSupport();
            await ensureUserListSupport();
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

async function ensureUserAuthSupport() {
    await users_pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT TRUE NOT NULL
    `);
    await users_pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS email_verification_token TEXT
    `);
    await users_pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP
    `);
    await users_pool.query('CREATE INDEX IF NOT EXISTS users_email_verification_token_idx ON users (email_verification_token)');
}

async function ensureUserListSupport() {
    await users_pool.query(`
        ALTER TABLE users_fav
        ADD COLUMN IF NOT EXISTS disliked_movie_ids INTEGER[] DEFAULT '{}'
    `);
}

module.exports = {
    movies_pool,
    users_pool,
    connectToMovies,
    connectToUsers
};
