import { useState, useEffect } from 'react'
import MovieCard from '../components/MovieCard'
import MovieModal from '../components/MovieModal'

function Selected({ user, selected, setSelected }) {
  const [movies, setMovies] = useState([])
  const [selectedMovie, setSelectedMovie] = useState(null)

  useEffect(() => {
    if (user) {
      loadSelected()
    }
  }, [user])

  const loadSelected = async () => {
    try {
      const res = await fetch(`/api/selected/${user.id}`)
      const data = await res.json()

      if (data.selected_movies && data.selected_movies.length > 0) {
        const moviesWithDetails = await Promise.all(
          data.selected_movies.map(async (movieId) => {
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
        setSelected(new Set(data.selected_movies))
      }
    } catch (err) {
      console.error('Error loading selected list:', err)
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
        <p className="empty-state">You have no movies in your Selected list</p>
      )}
      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          user={user}
          favorites={new Set()}
          setFavorites={() => {}}
          watchLater={new Set()}
          setWatchLater={() => {}}
          selected={selected}
          setSelected={setSelected}
        />
      )}
    </div>
  )
}

export default Selected
