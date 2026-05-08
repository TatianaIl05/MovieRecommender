CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS movies (
    id INTEGER,
    imdb_id TEXT,
    title TEXT,
    original_title TEXT,
    belongs_to_collection TEXT,
    genres TEXT,
    production_countries TEXT,
    spoken_languages TEXT,
    tagline TEXT,
    overview TEXT,
    release_date DATE,
    popularity_norm REAL,
    vote_average REAL,
    runtime REAL,
    poster_path TEXT
);

\COPY movies FROM '/csv_data/movies.csv' WITH (FORMAT csv, HEADER true, DELIMITER ',', ENCODING 'UTF8');

CREATE INDEX IF NOT EXISTS movies_title_trgm_idx ON movies USING GIN (lower(title) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS movies_original_title_trgm_idx ON movies USING GIN (lower(original_title) gin_trgm_ops);
