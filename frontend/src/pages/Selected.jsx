import { useState, useEffect } from 'react'
import MovieCard from '../components/MovieCard'
import MovieModal from '../components/MovieModal'
import { getMoviesByIds } from '../utils/movieCache'

function Selected({ user, favorites, setFavorites, watchLater, setWatchLater, selected, setSelected, disliked, setDisliked, movieCache, setMovieCache }) {
  const [movies, setMovies] = useState([])
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadSelected()
    }
  }, [user])

  useEffect(() => {
    setMovies((currentMovies) => currentMovies.filter((movie) => selected.has(movie.id)))
  }, [selected])

  const loadSelected = async () => {
    setLoading(true)

    try {
      const res = await fetch(`/api/selected/${user.id}`)
      const data = await res.json()
      const movieIds = data.selected_movies || []

      setSelected(new Set(movieIds))
      setMovies(await getMoviesByIds(movieIds, movieCache, setMovieCache))
    } catch (err) {
      console.error('Error loading selected list:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (movieId) => {
    try {
      const res = await fetch(`/api/selected/${user.id}/${movieId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setMovies(movies.filter(m => m.id !== movieId))
        const newSelected = new Set(selected)
        newSelected.delete(movieId)
        setSelected(newSelected)
      }
    } catch (err) {
      console.error('Error removing from selected list:', err)
    }
  }

  return (
    <div className="container">
      <h1 className="page__title">Selected</h1>
      {loading ? (
        <p className="empty-state">Loading selected list...</p>
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
        <p className="empty-state">You have no movies in your Selected list</p>
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

export default Selected
