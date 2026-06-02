CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    login VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE NOT NULL,
    email_verification_token TEXT,
    email_verification_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS users_email_verification_token_idx ON users (email_verification_token);


CREATE TABLE IF NOT EXISTS users_fav (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    favorite_movie_ids INTEGER[] DEFAULT '{}',
    watch_later_movie_ids INTEGER[] DEFAULT '{}',
    selected_movie_ids INTEGER[] DEFAULT '{}',
    disliked_movie_ids INTEGER[] DEFAULT '{}'
);
