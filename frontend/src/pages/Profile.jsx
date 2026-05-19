import { useState, useEffect } from 'react'
import MovieCard from '../components/MovieCard'
import MovieModal from '../components/MovieModal'
import { getMoviesByIds } from '../utils/movieCache'

function Profile({ user, favorites, setFavorites, watchLater, setWatchLater, selected, setSelected, disliked, setDisliked, movieCache, setMovieCache }) {
  const [movies, setMovies] = useState([])
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadFavorites()
    }
  }, [user])

  useEffect(() => {
    setMovies((currentMovies) => currentMovies.filter((movie) => favorites.has(movie.id)))
  }, [favorites])

  const loadFavorites = async () => {
    setLoading(true)

    try {
      const res = await fetch(`/api/favorites/${user.id}`)
      const data = await res.json()
      const movieIds = data.favorite_movies || []

      setFavorites(new Set(movieIds))
      setMovies(await getMoviesByIds(movieIds, movieCache, setMovieCache))
    } catch (err) {
      console.error('Error loading favorites:', err)
    } finally {
      setLoading(false)
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
      {loading ? (
        <p className="empty-state">Loading favorites...</p>
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
        <p className="empty-state">You have no favorite movies yet</p>
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
          disliked={disliked}
          setDisliked={setDisliked}
        />
      )}
    </div>
  )
}

export default Profile
