import { useState, useEffect } from 'react'
import MovieCard from '../components/MovieCard'
import MovieModal from '../components/MovieModal'

function WatchLater({ user, watchLater, setWatchLater }) {
  const [movies, setMovies] = useState([])
  const [selectedMovie, setSelectedMovie] = useState(null)

  useEffect(() => {
    if (user) {
      loadWatchLater()
    }
  }, [user])

  const loadWatchLater = async () => {
    try {
      const res = await fetch(`/api/watch-later/${user.id}`)
      const data = await res.json()

      if (data.favorite_movies && data.favorite_movies.length > 0) {
        const moviesWithDetails = await Promise.all(
          data.favorite_movies.map(async (movieId) => {
            try {
              const detailRes = await fetch(`/api/movies/${movieId}`)
              if (detailRes.ok) {
                const detail = await detailRes.json()
                return detail
              }
              return null
            } catch (err) {
              return null
            }
          })
        )

        const validMovies = moviesWithDetails.filter(m => m !== null)
        setMovies(validMovies)
        setWatchLater(new Set(data.favorite_movies))
      }
    } catch (err) {
      console.error('Error loading watch later list:', err)
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
      {movies.length > 0 ? (
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
          favorites={new Set()}
          setFavorites={() => {}}
          watchLater={watchLater}
          setWatchLater={setWatchLater}
        />
      )}
    </div>
  )
}

export default WatchLater
