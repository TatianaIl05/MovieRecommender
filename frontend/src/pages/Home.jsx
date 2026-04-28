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
  const limit = 40

  useEffect(() => {
    loadMovies()
  }, [])

  useEffect(() => {
    if (!search) {
      loadMovies()
    }
  }, [search])

  const loadMovies = async (reset = false) => {
    try {
      const currentOffset = reset ? 0 : offset
      const res = await fetch(`/api/movies?limit=${limit}&offset=${currentOffset}${search ? `&search=${encodeURIComponent(search)}` : ''}`)
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
    setSearch(searchInput)
    setOffset(0)
    setHasMore(true)
    loadMovies(true)
  }

  const handleMovieClick = (movie) => {
    setSelectedMovie(movie)
  }

  return (
    <div className="container">
      <h1 className="page__title">Movies</h1>
      <form className="search-form" onSubmit={handleSearch}>
        <input
          type="text"
          className="search-input"
          placeholder="Search movies..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
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