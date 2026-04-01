-- Создание таблицы movies
CREATE TABLE IF NOT EXISTS movies (
    movie_id INTEGER PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    genres TEXT
);

-- Создание таблицы ratings
CREATE TABLE IF NOT EXISTS ratings (
    user_id INTEGER NOT NULL,
    movie_id INTEGER NOT NULL,
    rating REAL,
    PRIMARY KEY (user_id, movie_id)
);

-- Создание таблицы user_favorite_movies
CREATE TABLE IF NOT EXISTS user_favorite_movies (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    movie_id INTEGER NOT NULL,
    movie_title VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, movie_id)
);

-- Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_user_favorite_user_id ON user_favorite_movies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_movie_id ON user_favorite_movies(movie_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_movie_id ON ratings(movie_id);

-- Вставка тестовых данных
INSERT INTO movies (movie_id, title, genres) VALUES
(1, 'Inception', 'Action|Sci-Fi|Thriller'),
(2, 'The Matrix', 'Action|Sci-Fi'),
(3, 'Interstellar', 'Adventure|Drama|Sci-Fi'),
(4, 'The Dark Knight', 'Action|Crime|Drama'),
(5, 'Pulp Fiction', 'Crime|Drama'),
(6, 'Fight Club', 'Drama'),
(7, 'Forrest Gump', 'Comedy|Drama|Romance'),
(8, 'The Shawshank Redemption', 'Drama'),
(9, 'The Godfather', 'Crime|Drama'),
(10, 'The Lord of the Rings', 'Adventure|Fantasy'),
(11, 'Star Wars', 'Action|Adventure|Sci-Fi'),
(12, 'Jurassic Park', 'Adventure|Sci-Fi'),
(13, 'Titanic', 'Drama|Romance'),
(14, 'Avatar', 'Action|Adventure|Sci-Fi'),
(15, 'Gladiator', 'Action|Drama')
ON CONFLICT (movie_id) DO NOTHING;

INSERT INTO ratings (user_id, movie_id, rating) VALUES
(1, 1, 5.0), (1, 2, 4.5), (1, 3, 5.0), (1, 4, 4.0), (1, 5, 5.0),
(2, 1, 4.0), (2, 4, 5.0), (2, 6, 4.5), (2, 8, 5.0),
(3, 2, 4.5), (3, 3, 4.0), (3, 5, 5.0), (3, 7, 4.0),
(4, 1, 4.0), (4, 6, 4.5), (4, 9, 5.0), (4, 10, 4.5),
(5, 3, 5.0), (5, 4, 4.5), (5, 11, 4.0), (5, 12, 5.0)
ON CONFLICT (user_id, movie_id) DO NOTHING;

-- Вставка примеров избранного
INSERT INTO user_favorite_movies (user_id, movie_id, movie_title) VALUES
(1, 1, 'Inception'),
(1, 2, 'The Matrix'),
(1, 3, 'Interstellar'),
(2, 4, 'The Dark Knight'),
(2, 5, 'Pulp Fiction'),
(3, 1, 'Inception'),
(3, 8, 'The Shawshank Redemption'),
(3, 10, 'The Lord of the Rings')
ON CONFLICT (user_id, movie_id) DO NOTHING;