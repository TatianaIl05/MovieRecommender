import { useState, useEffect } from 'react'
import MovieCard from '../components/MovieCard'
import MovieModal from '../components/MovieModal'
import { getMoviesByIds } from '../utils/movieCache'

function WatchLater({ user, favorites, setFavorites, watchLater, setWatchLater, selected, setSelected, movieCache, setMovieCache }) {
  const [movies, setMovies] = useState([])
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadWatchLater()
    }
  }, [user])

  useEffect(() => {
    setMovies((currentMovies) => currentMovies.filter((movie) => watchLater.has(movie.id)))
  }, [watchLater])

  const loadWatchLater = async () => {
    setLoading(true)

    try {
      const res = await fetch(`/api/watch-later/${user.id}`)
      const data = await res.json()
      const movieIds = data.watch_later_movies || []

      setWatchLater(new Set(movieIds))
      setMovies(await getMoviesByIds(movieIds, movieCache, setMovieCache))
    } catch (err) {
      console.error('Error loading watch later list:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (movieId) => {
    try {
      const res = await fetch(`/api/watch-later/${user.id}/${movieId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setMovies(movies.filter(m => m.id !== movieId))
        const newWatchLater = new Set(watchLater)
        newWatchLater.delete(movieId)
        setWatchLater(newWatchLater)
      }
    } catch (err) {
      console.error('Error removing from watch later list:', err)
    }
  }

  return (
    <div className="container">
      <h1 className="page__title">Watch Later</h1>
      {loading ? (
        <p className="empty-state">Loading watch later list...</p>
      ) : movies.length > 0 ? (
        <div className="movies-grid">
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onClick={() => setSelectedMovie(movie)}
              onRemove={handleRemove}
              showRemove={true}
            />
          ))}
        </div>
      ) : (
        <p className="empty-state">You have no movies in your Watch Later list</p>
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

export default WatchLater
