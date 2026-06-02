import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import MovieCard from '../components/MovieCard'
import MovieModal from '../components/MovieModal'

const emptyFilters = {
  genres: [],
  countries: [],
  languages: [],
  collections: [],
  yearFrom: '',
  yearTo: '',
  ratingFrom: '',
  ratingTo: '',
  runtimeFrom: '',
  runtimeTo: ''
}

const listFilterKeys = ['genres', 'countries', 'languages', 'collections']
const rangeFilterKeys = ['yearFrom', 'yearTo', 'ratingFrom', 'ratingTo', 'runtimeFrom', 'runtimeTo']
const listFilterLabels = {
  genres: 'Genre',
  countries: 'Country',
  languages: 'Language',
  collections: 'Collection'
}
const rangeFilterLabels = {
  yearFrom: 'Year from',
  yearTo: 'Year to',
  ratingFrom: 'Rating from',
  ratingTo: 'Rating to',
  runtimeFrom: 'Runtime from',
  runtimeTo: 'Runtime to'
}
const initialOpenFilterGroups = {
  genres: false,
  countries: false,
  languages: false,
  collections: false,
  year: false,
  rating: false,
  runtime: false
}

function getFiltersFromParams(params) {
  const filters = { ...emptyFilters }

  listFilterKeys.forEach((key) => {
    filters[key] = params.getAll(key).flatMap((value) => value.split(',')).map((value) => value.trim()).filter(Boolean)
  })

  rangeFilterKeys.forEach((key) => {
    filters[key] = params.get(key) || ''
  })

  return filters
}

function hasActiveFilters(filters) {
  return listFilterKeys.some((key) => filters[key].length > 0) || rangeFilterKeys.some((key) => filters[key])
}

function createRandomSeed() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function buildMoviesUrl({ limit, offset, search, filters, randomSeed }) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  const shouldShuffle = !search && !hasActiveFilters(filters)

  if (search) params.set('search', search)
  if (shouldShuffle) {
    params.set('shuffle', '1')
    params.set('seed', randomSeed)
  }

  listFilterKeys.forEach((key) => {
    filters[key].forEach((value) => params.append(key, value))
  })

  rangeFilterKeys.forEach((key) => {
    if (filters[key]) params.set(key, filters[key])
  })

  return `/api/movies?${params.toString()}`
}

function Home({ user, favorites, setFavorites, watchLater, setWatchLater, selected, setSelected, disliked, setDisliked }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSearch = searchParams.get('search') || ''
  const initialFilters = getFiltersFromParams(searchParams)

  const [movies, setMovies] = useState([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [search, setSearch] = useState(initialSearch)
  const [searchInput, setSearchInput] = useState(initialSearch)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filters, setFilters] = useState(initialFilters)
  const [filterOptions, setFilterOptions] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [openFilterGroups, setOpenFilterGroups] = useState(initialOpenFilterGroups)
  const [randomSeed] = useState(createRandomSeed)
  const limit = 40
  const appliedFilters = getFiltersFromParams(searchParams)

  useEffect(() => {
    loadFilterOptions()
  }, [])

  useEffect(() => {
    const nextSearch = searchParams.get('search') || ''
    const nextFilters = getFiltersFromParams(searchParams)

    setSearch(nextSearch)
    setSearchInput(nextSearch)
    setFilters(nextFilters)
    setOffset(0)
    setHasMore(true)
    loadMovies(true, nextSearch, nextFilters)
  }, [searchParams])

  useEffect(() => {
    const query = searchInput.trim()

    if (query.length < 2) {
      setSuggestions([])
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/movies/suggest?q=${encodeURIComponent(query)}&limit=8`, {
          signal: controller.signal
        })
        const data = await res.json()
        setSuggestions(data.suggestions || [])
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error loading suggestions:', err)
        }
      }
    }, 250)

    return () => {
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [searchInput])

  const loadFilterOptions = async () => {
    try {
      const res = await fetch('/api/movies/filters')
      const data = await res.json()
      setFilterOptions(data)
    } catch (err) {
      console.error('Error loading filters:', err)
    }
  }

  const loadMovies = async (reset = false, searchTerm = search, activeFilters = filters) => {
    try {
      const currentOffset = reset ? 0 : offset
      const res = await fetch(buildMoviesUrl({
        limit,
        offset: currentOffset,
        search: searchTerm,
        filters: activeFilters,
        randomSeed
      }))
      const data = await res.json()
      const nextMovies = data.movies || []

      if (reset) {
        setMovies(nextMovies)
        setOffset(nextMovies.length)
      } else {
        setMovies((currentMovies) => [...currentMovies, ...nextMovies])
        setOffset(currentOffset + nextMovies.length)
      }

      setHasMore(nextMovies.length >= limit)
    } catch (err) {
      console.error('Error loading movies:', err)
    }
  }

  const updateSearchParams = (nextSearch, nextFilters) => {
    const params = new URLSearchParams()

    if (nextSearch) params.set('search', nextSearch)

    listFilterKeys.forEach((key) => {
      nextFilters[key].forEach((value) => params.append(key, value))
    })

    rangeFilterKeys.forEach((key) => {
      if (nextFilters[key]) params.set(key, nextFilters[key])
    })

    setSearchParams(params)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    const query = searchInput.trim()

    setShowSuggestions(false)
    updateSearchParams(query, filters)
  }

  const handleSuggestionSelect = (suggestion) => {
    const query = suggestion.title

    setSearchInput(query)
    setSuggestions([])
    setShowSuggestions(false)
    updateSearchParams(query, filters)
  }

  const toggleListFilter = (key, value) => {
    setFilters((currentFilters) => {
      const exists = currentFilters[key].includes(value)
      return {
        ...currentFilters,
        [key]: exists
          ? currentFilters[key].filter((item) => item !== value)
          : [...currentFilters[key], value]
      }
    })
  }

  const updateRangeFilter = (key, value) => {
    setFilters((currentFilters) => ({ ...currentFilters, [key]: value }))
  }

  const applyFilters = () => {
    updateSearchParams(searchInput.trim(), filters)
  }

  const clearFilters = () => {
    const nextFilters = { ...emptyFilters }
    setFilters(nextFilters)
    updateSearchParams(searchInput.trim(), nextFilters)
  }

  const removeSearch = () => {
    setSearchInput('')
    updateSearchParams('', appliedFilters)
  }

  const removeAppliedListFilter = (key, value) => {
    const nextFilters = {
      ...appliedFilters,
      [key]: appliedFilters[key].filter((item) => item !== value)
    }

    setFilters(nextFilters)
    updateSearchParams(search, nextFilters)
  }

  const removeAppliedRangeFilter = (key) => {
    const nextFilters = { ...appliedFilters, [key]: '' }

    setFilters(nextFilters)
    updateSearchParams(search, nextFilters)
  }

  const handleMovieClick = (movie) => {
    setSelectedMovie(movie)
  }

  const handleSurpriseMe = () => {
    if (movies.length === 0) return
    const randomIndex = Math.floor(Math.random() * movies.length)
    setSelectedMovie(movies[randomIndex])
  }

  const toggleFilterGroup = (key) => {
    setOpenFilterGroups((currentGroups) => ({
      ...currentGroups,
      [key]: !currentGroups[key]
    }))
  }

  const renderFilterGroup = (title, key, children) => {
    const isOpen = openFilterGroups[key]

    return (
      <section className={`filter-group ${isOpen ? 'filter-group--open' : ''}`}>
        <button type="button" className="filter-group__toggle" onClick={() => toggleFilterGroup(key)}>
          <span>{title}</span>
          <span className="filter-group__chevron">{isOpen ? '-' : '+'}</span>
        </button>
        {isOpen && <div className="filter-group__content">{children}</div>}
      </section>
    )
  }

  const renderFacetList = (title, key, options = [], maxVisible = 12) => {
    const visibleOptions = options.slice(0, maxVisible)

    return renderFilterGroup(
      title,
      key,
      <div className="filter-options">
        {visibleOptions.map((option) => (
          <label key={option.value} className="filter-option">
            <input
              type="checkbox"
              checked={filters[key].includes(option.value)}
              onChange={() => toggleListFilter(key, option.value)}
            />
            <span className="filter-option__label">{option.value}</span>
            <span className="filter-option__count">{option.count}</span>
          </label>
        ))}
      </div>
    )
  }

  const activeFilterChips = [
    ...listFilterKeys.flatMap((key) => appliedFilters[key].map((value) => ({
      key: `${key}:${value}`,
      label: `${listFilterLabels[key]}: ${value}`,
      onRemove: () => removeAppliedListFilter(key, value)
    }))),
    ...rangeFilterKeys
      .filter((key) => appliedFilters[key])
      .map((key) => ({
        key,
        label: `${rangeFilterLabels[key]}: ${appliedFilters[key]}`,
        onRemove: () => removeAppliedRangeFilter(key)
      }))
  ]

  return (
    <div className="container">
      <section className="home-hero">
        <p className="home-hero__eyebrow">Curated cinema discovery</p>
        <h1 className="home-hero__title">Find a film for the mood you are in.</h1>
        <p className="home-hero__text">
          Explore a warm, weighted catalog where popularity guides the feed, filters refine the mood, and your lists shape future recommendations.
        </p>

        <form className="search-form home-hero__search" onSubmit={handleSearch}>
          <div className="search-field">
            <input
              type="text"
              className="search-input"
              placeholder="Search movies..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="search-suggestions">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    className="search-suggestion"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSuggestionSelect(suggestion)}
                  >
                    <span className="search-suggestion__title">{suggestion.title}</span>
                    {suggestion.release_date && (
                      <span className="search-suggestion__year">
                        {new Date(suggestion.release_date).getFullYear()}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="submit" className="btn btn--primary">Search</button>
          <button type="button" className="btn btn--secondary filters-toggle" onClick={() => setShowFilters(!showFilters)}>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          <button type="button" className="btn btn--accent surprise-btn" onClick={handleSurpriseMe}>
            Surprise Me
          </button>
        </form>
      </section>

      <div className={`movies-layout ${showFilters ? 'movies-layout--with-filters' : ''}`}>
        {showFilters && (
        <aside className="filters-panel">
          <div className="filters-panel__header">
            <h2>Filters</h2>
            {hasActiveFilters(filters) && (
              <button type="button" className="filters-panel__clear" onClick={clearFilters}>Clear</button>
            )}
          </div>

          {filterOptions ? (
            <>
              {renderFacetList('Genres', 'genres', filterOptions.genres, 20)}
              {renderFacetList('Countries', 'countries', filterOptions.countries, 14)}
              {renderFacetList('Languages', 'languages', filterOptions.languages, 12)}
              {renderFacetList('Collections', 'collections', filterOptions.collections, 10)}

              {renderFilterGroup('Year', 'year',
                <div className="range-filter">
                  <input
                    type="number"
                    placeholder={filterOptions.yearRange?.min || 'From'}
                    value={filters.yearFrom}
                    onChange={(e) => updateRangeFilter('yearFrom', e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder={filterOptions.yearRange?.max || 'To'}
                    value={filters.yearTo}
                    onChange={(e) => updateRangeFilter('yearTo', e.target.value)}
                  />
                </div>
              )}

              {renderFilterGroup('Rating', 'rating',
                <div className="range-filter">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    placeholder="From"
                    value={filters.ratingFrom}
                    onChange={(e) => updateRangeFilter('ratingFrom', e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    placeholder="To"
                    value={filters.ratingTo}
                    onChange={(e) => updateRangeFilter('ratingTo', e.target.value)}
                  />
                </div>
              )}

              {renderFilterGroup('Runtime', 'runtime',
                <div className="range-filter">
                  <input
                    type="number"
                    min="0"
                    placeholder="From"
                    value={filters.runtimeFrom}
                    onChange={(e) => updateRangeFilter('runtimeFrom', e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="To"
                    value={filters.runtimeTo}
                    onChange={(e) => updateRangeFilter('runtimeTo', e.target.value)}
                  />
                </div>
              )}

              <button type="button" className="btn btn--primary btn--full" onClick={applyFilters}>Apply Filters</button>
            </>
          ) : (
            <p className="filters-panel__loading">Loading filters...</p>
          )}
        </aside>
        )}

        <section className="movies-results">
          {(search || activeFilterChips.length > 0) && (
            <div className="active-filters">
              {search && (
                <button type="button" className="active-filter-chip" onClick={removeSearch}>
                  Search: {search} <span aria-hidden="true">&times;</span>
                </button>
              )}
              {activeFilterChips.map((chip) => (
                <button type="button" key={chip.key} className="active-filter-chip" onClick={chip.onRemove}>
                  {chip.label} <span aria-hidden="true">&times;</span>
                </button>
              ))}
              {activeFilterChips.length > 1 && (
                <button type="button" className="active-filter-chip active-filter-chip--clear" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </div>
          )}

          <div className="movies-grid">
            {movies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onClick={() => handleMovieClick(movie)}
              />
            ))}
          </div>

          {movies.length === 0 && !hasMore && (
            <p className="movies-empty">No movies found for these search filters.</p>
          )}

          {hasMore && movies.length > 0 && (
            <div className="pagination">
              <button className="btn btn--secondary" onClick={() => loadMovies()}>
                Load More
              </button>
            </div>
          )}
        </section>
      </div>

      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          user={user}
          favorites={favorites}
          setFavorites={setFavorites}
          watchLater={watchLater}
          setWatchLater={setWatchLater}
          selected={selected}
          setSelected={setSelected}
          disliked={disliked}
          setDisliked={setDisliked}
        />
      )}
    </div>
  )
}

export default Home
