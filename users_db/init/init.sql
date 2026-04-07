CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    login VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS users_fav (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    favorite_movie_ids INTEGER[] DEFAULT '{}',
    watch_later_movie_ids INTEGER[] DEFAULT '{}',
    selected_movie_ids INTEGER[] DEFAULT '{}'
);