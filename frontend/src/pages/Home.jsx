import { useState, useEffect } from 'react'
import MovieCard from '../components/MovieCard'
import MovieModal from '../components/MovieModal'

function Home({ user, favorites, setFavorites, watchLater, setWatchLater, selected, setSelected }) {
  const [movies, setMovies] = useState([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const limit = 40

  useEffect(() => {
    loadMovies()
  }, [])

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

  const loadMovies = async (reset = false, searchTerm = search) => {
    try {
      const currentOffset = reset ? 0 : offset
      const res = await fetch(`/api/movies?limit=${limit}&offset=${currentOffset}${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`)
      const data = await res.json()

      if (data.movies && data.movies.length > 0) {
        const moviesWithDetails = await Promise.all(
          data.movies.map(async (movie) => {
            try {
              const detailRes = await fetch(`/api/movies/${movie.id}`)
              if (detailRes.ok) {
                const detail = await detailRes.json()
                return { ...movie, ...detail }
              }
              return movie
            } catch (err) {
              return movie
            }
          })
        )

        if (reset) {
          setMovies(moviesWithDetails)
          setOffset(data.movies.length)
        } else {
          setMovies([...movies, ...moviesWithDetails])
          setOffset(offset + data.movies.length)
        }
        setHasMore(data.movies.length >= limit)
      } else {
        if (reset) setMovies([])
        setHasMore(false)
      }
    } catch (err) {
      console.error('Error loading movies:', err)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    const query = searchInput.trim()

    setSearch(query)
    setOffset(0)
    setHasMore(true)
    setShowSuggestions(false)
    loadMovies(true, query)
  }

  const handleSuggestionSelect = (suggestion) => {
    const query = suggestion.title

    setSearchInput(query)
    setSearch(query)
    setSuggestions([])
    setShowSuggestions(false)
    setOffset(0)
    setHasMore(true)
    loadMovies(true, query)
  }

  const handleMovieClick = (movie) => {
    setSelectedMovie(movie)
  }

  return (
    <div className="container">
      <h1 className="page__title">Movies</h1>
      <form className="search-form" onSubmit={handleSearch}>
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
      </form>
      <div className="movies-grid">
        {movies.map((movie) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            onClick={() => handleMovieClick(movie)}
          />
        ))}
      </div>
      {hasMore && movies.length > 0 && (
        <div className="pagination">
          <button className="btn btn--secondary" onClick={() => loadMovies()}>
            Load More
          </button>
        </div>
      )}
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
        />
      )}
    </div>
  )
}

export default Home
