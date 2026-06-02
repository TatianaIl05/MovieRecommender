const { movies_pool } = require('../config/database');

const MOVIE_LIST_FIELDS = `
    id,
    title,
    original_title,
    genres,
    production_countries,
    spoken_languages,
    overview,
    release_date,
    vote_average,
    runtime,
    poster_path,
    tagline,
    belongs_to_collection
`;

function parseListParam(value) {
    if (!value) return [];

    const values = Array.isArray(value) ? value : [value];
    return values
        .flatMap(item => String(item).split(','))
        .map(item => item.trim())
        .filter(Boolean);
}

function parseNumberParam(value) {
    if (value === undefined || value === null || value === '') return null;

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function buildMovieFilters(query) {
    return {
        search: (query.search || '').trim(),
        genres: parseListParam(query.genres),
        countries: parseListParam(query.countries),
        languages: parseListParam(query.languages),
        collections: parseListParam(query.collections),
        yearFrom: parseNumberParam(query.yearFrom),
        yearTo: parseNumberParam(query.yearTo),
        ratingFrom: parseNumberParam(query.ratingFrom),
        ratingTo: parseNumberParam(query.ratingTo),
        runtimeFrom: parseNumberParam(query.runtimeFrom),
        runtimeTo: parseNumberParam(query.runtimeTo)
    };
}

function hasActiveFilters(filters) {
    return filters.genres.length > 0
        || filters.countries.length > 0
        || filters.languages.length > 0
        || filters.collections.length > 0
        || filters.yearFrom !== null
        || filters.yearTo !== null
        || filters.ratingFrom !== null
        || filters.ratingTo !== null
        || filters.runtimeFrom !== null
        || filters.runtimeTo !== null;
}

function buildMoviesWhereClause(filters) {
    const clauses = [];
    const params = [];

    const addParam = (value) => {
        params.push(value);
        return `$${params.length}`;
    };

    let searchParam = null;
    if (filters.search) {
        searchParam = addParam(filters.search);
        clauses.push(`(
            lower(title) LIKE '%' || lower(${searchParam}) || '%'
            OR lower(original_title) LIKE '%' || lower(${searchParam}) || '%'
            OR lower(title) % lower(${searchParam})
            OR lower(original_title) % lower(${searchParam})
        )`);
    }

    if (filters.genres.length > 0) {
        clauses.push(`genres && ${addParam(filters.genres)}::text[]`);
    }

    if (filters.countries.length > 0) {
        clauses.push(`production_countries && ${addParam(filters.countries)}::text[]`);
    }

    if (filters.languages.length > 0) {
        clauses.push(`spoken_languages && ${addParam(filters.languages)}::text[]`);
    }

    if (filters.collections.length > 0) {
        clauses.push(`belongs_to_collection = ANY(${addParam(filters.collections)}::text[])`);
    }

    if (filters.yearFrom !== null) {
        clauses.push(`release_date >= make_date(${addParam(filters.yearFrom)}::int, 1, 1)`);
    }

    if (filters.yearTo !== null) {
        clauses.push(`release_date <= make_date(${addParam(filters.yearTo)}::int, 12, 31)`);
    }

    if (filters.ratingFrom !== null) {
        clauses.push(`vote_average >= ${addParam(filters.ratingFrom)}`);
    }

    if (filters.ratingTo !== null) {
        clauses.push(`vote_average <= ${addParam(filters.ratingTo)}`);
    }

    if (filters.runtimeFrom !== null) {
        clauses.push(`runtime >= ${addParam(filters.runtimeFrom)}`);
    }

    if (filters.runtimeTo !== null) {
        clauses.push(`runtime <= ${addParam(filters.runtimeTo)}`);
    }

    return {
        whereSql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
        params,
        searchParam
    };
}

function buildSeededRandomExpression(shuffleParam) {
    return `((('x' || substr(md5(id::text || ${shuffleParam}), 1, 8))::bit(32)::bigint + 1)::double precision / 4294967297.0)`;
}

function buildMoviesOrderClause(searchParam, shuffleParam) {
    if (!searchParam) {
        if (shuffleParam) {
            const seededRandom = buildSeededRandomExpression(shuffleParam);
            return `
                ORDER BY
                    (-ln(${seededRandom}) / (0.05 + GREATEST(COALESCE(popularity_norm, 0), 0))) ASC,
                    popularity_norm DESC NULLS LAST,
                    vote_average DESC NULLS LAST
            `;
        }

        return 'ORDER BY popularity_norm DESC NULLS LAST, vote_average DESC NULLS LAST';
    }

    return `
        ORDER BY
            CASE
                WHEN lower(title) = lower(${searchParam}) OR lower(original_title) = lower(${searchParam}) THEN 0
                WHEN lower(title) LIKE lower(${searchParam}) || '%' OR lower(original_title) LIKE lower(${searchParam}) || '%' THEN 1
                WHEN lower(title) LIKE '%' || lower(${searchParam}) || '%' OR lower(original_title) LIKE '%' || lower(${searchParam}) || '%' THEN 2
                ELSE 3
            END,
            GREATEST(
                COALESCE(similarity(lower(title), lower(${searchParam})), 0),
                COALESCE(similarity(lower(original_title), lower(${searchParam})), 0)
            ) DESC,
            popularity_norm DESC NULLS LAST
    `;
}

async function getMovies(req, res) {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = parseInt(req.query.offset) || 0;
        const filters = buildMovieFilters(req.query);
        const { whereSql, params, searchParam } = buildMoviesWhereClause(filters);
        const shouldShuffle = req.query.shuffle === '1' && !filters.search && !hasActiveFilters(filters);
        const shuffleParam = shouldShuffle ? `$${params.length + 1}` : null;
        const orderSql = buildMoviesOrderClause(searchParam, shuffleParam);

        const queryParams = [...params];
        if (shouldShuffle) {
            queryParams.push(String(req.query.seed || 'default'));
        }

        const limitParam = `$${queryParams.length + 1}`;
        const offsetParam = `$${queryParams.length + 2}`;

        const result = await movies_pool.query(
            `
                SELECT ${MOVIE_LIST_FIELDS}
                FROM movies
                ${whereSql}
                ${orderSql}
                LIMIT ${limitParam} OFFSET ${offsetParam}
            `,
            [...queryParams, limit, offset]
        );

        const total = await movies_pool.query(
            `
                SELECT COUNT(*)
                FROM movies
                ${whereSql}
            `,
            params
        );

        res.json({
            total: parseInt(total.rows[0].count),
            limit,
            offset,
            movies: result.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

async function getMovieById(req, res) {
    try {
        const { movie_id } = req.params;
        const result = await movies_pool.query(
            `SELECT ${MOVIE_LIST_FIELDS} FROM movies WHERE id = $1`,
            [movie_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getMovieSuggestions(req, res) {
    try {
        const search = (req.query.q || '').trim();
        const limit = Math.min(parseInt(req.query.limit) || 8, 12);

        if (search.length < 2) {
            return res.json({ suggestions: [] });
        }

        const result = await movies_pool.query(
            `
                SELECT id, title, original_title, release_date
                FROM movies
                WHERE
                    lower(title) LIKE '%' || lower($1) || '%'
                    OR lower(original_title) LIKE '%' || lower($1) || '%'
                    OR lower(title) % lower($1)
                    OR lower(original_title) % lower($1)
                ORDER BY
                    CASE
                        WHEN lower(title) = lower($1) OR lower(original_title) = lower($1) THEN 0
                        WHEN lower(title) LIKE lower($1) || '%' OR lower(original_title) LIKE lower($1) || '%' THEN 1
                        WHEN lower(title) LIKE '%' || lower($1) || '%' OR lower(original_title) LIKE '%' || lower($1) || '%' THEN 2
                        ELSE 3
                    END,
                    GREATEST(
                        COALESCE(similarity(lower(title), lower($1)), 0),
                        COALESCE(similarity(lower(original_title), lower($1)), 0)
                    ) DESC,
                    popularity_norm DESC
                LIMIT $2
            `,
            [search, limit]
        );

        res.json({ suggestions: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

async function getPopularMovies(req, res) {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = parseInt(req.query.offset) || 0;

        const result = await movies_pool.query(
            `SELECT ${MOVIE_LIST_FIELDS} FROM movies ORDER BY popularity_norm DESC NULLS LAST, vote_average DESC NULLS LAST LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        res.json({
            limit,
            offset,
            movies: result.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

async function getMoviesByIds(req, res) {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'ids is required and must be an array' });
        }

        const result = await movies_pool.query(
            `SELECT ${MOVIE_LIST_FIELDS} FROM movies WHERE id = ANY($1)`,
            [ids]
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

async function getMovieFilters(req, res) {
    try {
        const [genres, countries, languages, collections, ranges] = await Promise.all([
            getArrayFacet('genres'),
            getArrayFacet('production_countries'),
            getArrayFacet('spoken_languages'),
            getCollectionFacet(),
            getFilterRanges()
        ]);

        res.json({
            genres,
            countries,
            languages,
            collections,
            yearRange: {
                min: ranges.min_year ? parseInt(ranges.min_year) : null,
                max: ranges.max_year ? parseInt(ranges.max_year) : null
            },
            ratingRange: {
                min: ranges.min_rating !== null ? Number(ranges.min_rating) : null,
                max: ranges.max_rating !== null ? Number(ranges.max_rating) : null
            },
            runtimeRange: {
                min: ranges.min_runtime !== null ? Number(ranges.min_runtime) : null,
                max: ranges.max_runtime !== null ? Number(ranges.max_runtime) : null
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

async function getArrayFacet(columnName) {
    const allowedColumns = new Set(['genres', 'production_countries', 'spoken_languages']);
    if (!allowedColumns.has(columnName)) {
        throw new Error(`Unsupported facet column: ${columnName}`);
    }

    const result = await movies_pool.query(`
        SELECT value, COUNT(*)::int AS count
        FROM movies, unnest(${columnName}) AS value
        WHERE value IS NOT NULL AND value <> ''
        GROUP BY value
        ORDER BY count DESC, value ASC
    `);

    return result.rows;
}

async function getCollectionFacet() {
    const result = await movies_pool.query(`
        SELECT belongs_to_collection AS value, COUNT(*)::int AS count
        FROM movies
        WHERE belongs_to_collection IS NOT NULL AND belongs_to_collection <> ''
        GROUP BY belongs_to_collection
        ORDER BY count DESC, value ASC
    `);

    return result.rows;
}

async function getFilterRanges() {
    const result = await movies_pool.query(`
        SELECT
            MIN(EXTRACT(YEAR FROM release_date))::int AS min_year,
            MAX(EXTRACT(YEAR FROM release_date))::int AS max_year,
            MIN(vote_average) AS min_rating,
            MAX(vote_average) AS max_rating,
            MIN(runtime) AS min_runtime,
            MAX(runtime) AS max_runtime
        FROM movies
    `);

    return result.rows[0];
}

module.exports = {
    getMovies,
    getMovieById,
    getMovieSuggestions,
    getPopularMovies,
    getMoviesByIds,
    getMovieFilters
};
