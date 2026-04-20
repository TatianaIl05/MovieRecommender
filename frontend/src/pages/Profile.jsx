import { useState, useEffect } from 'react'
import MovieCard from '../components/MovieCard'
import MovieModal from '../components/MovieModal'

function Profile({ user, favorites, setFavorites }) {
  const [movies, setMovies] = useState([])
  const [selectedMovie, setSelectedMovie] = useState(null)

  useEffect(() => {
    if (user) {
      loadFavorites()
    }
  }, [user])

  const loadFavorites = async () => {
    try {
      const res = await fetch(`/api/favorites/${user.id}`)
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
        setFavorites(new Set(data.favorite_movies))
      }
    } catch (err) {
      console.error('Error loading favorites:', err)
    }
  }

  const handleRemove = async (movieId) => {
    try {
      const res = await fetch(`/api/favorites/${user.id}/${movieId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setMovies(movies.filter(m => m.id !== movieId))
        const newFavorites = new Set(favorites)
        newFavorites.delete(movieId)
        setFavorites(newFavorites)
      }
    } catch (err) {
      console.error('Error removing from favorites:', err)
    }
  }

  return (
    <div className="container">
      <h1 className="page__title">My Profile</h1>
      <div className="profile-info">
        <div className="profile-card">
          <h3>{user.login}</h3>
          <p className="profile-email">{user.email}</p>
        </div>
      </div>
      <h2 className="section-title">Favorites</h2>
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
        <p className="empty-state">You have no favorite movies yet</p>
      )}
      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          user={user}
          favorites={favorites}
          setFavorites={setFavorites}
          watchLater={new Set()}
          setWatchLater={() => {}}
        />
      )}
    </div>
  )
}

export default Profile
