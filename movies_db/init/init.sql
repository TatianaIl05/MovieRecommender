CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS movies (
    id INTEGER,
    imdb_id TEXT,
    title TEXT,
    original_title TEXT,
    belongs_to_collection TEXT,
    genres TEXT[],
    production_countries TEXT[],
    spoken_languages TEXT[],
    tagline TEXT,
    overview TEXT,
    release_date DATE,
    popularity_norm REAL,
    vote_average REAL,
    runtime REAL,
    poster_path TEXT
);

CREATE TEMP TABLE movies_raw (
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

\COPY movies_raw FROM '/csv_data/movies.csv' WITH (FORMAT csv, HEADER true, DELIMITER ',', ENCODING 'UTF8');

INSERT INTO movies (
    id,
    imdb_id,
    title,
    original_title,
    belongs_to_collection,
    genres,
    production_countries,
    spoken_languages,
    tagline,
    overview,
    release_date,
    popularity_norm,
    vote_average,
    runtime,
    poster_path
)
SELECT
    id,
    imdb_id,
    title,
    original_title,
    belongs_to_collection,
    CASE WHEN NULLIF(genres, '') IS NULL THEN NULL ELSE string_to_array(genres, ', ') END,
    CASE WHEN NULLIF(production_countries, '') IS NULL THEN NULL ELSE string_to_array(production_countries, ', ') END,
    CASE WHEN NULLIF(spoken_languages, '') IS NULL THEN NULL ELSE string_to_array(spoken_languages, ', ') END,
    tagline,
    overview,
    release_date,
    popularity_norm,
    vote_average,
    runtime,
    poster_path
FROM movies_raw;

CREATE INDEX IF NOT EXISTS movies_title_trgm_idx ON movies USING GIN (lower(title) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS movies_original_title_trgm_idx ON movies USING GIN (lower(original_title) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS movies_genres_gin_idx ON movies USING GIN (genres);
CREATE INDEX IF NOT EXISTS movies_production_countries_gin_idx ON movies USING GIN (production_countries);
CREATE INDEX IF NOT EXISTS movies_spoken_languages_gin_idx ON movies USING GIN (spoken_languages);
CREATE INDEX IF NOT EXISTS movies_collection_idx ON movies (belongs_to_collection);
CREATE INDEX IF NOT EXISTS movies_release_date_idx ON movies (release_date);
CREATE INDEX IF NOT EXISTS movies_vote_average_idx ON movies (vote_average);
CREATE INDEX IF NOT EXISTS movies_runtime_idx ON movies (runtime);
