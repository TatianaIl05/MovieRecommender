import { useState } from 'react'

const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w500'

function MovieCard({ movie, onClick, onRemove, showRemove = false }) {
  const [posterLoaded, setPosterLoaded] = useState(false)

  const getPosterUrl = (path) => {
    if (!path) return null
    if (path.startsWith('http')) return path
    return `${TMDB_IMG_BASE}${path}`
  }

  return (
    <div className="movie-card" onClick={onClick}>
      <img
        className={`movie-card__poster ${!posterLoaded ? 'movie-card__poster--placeholder' : ''}`}
        src={getPosterUrl(movie.poster_path)}
        alt={movie.title}
        onLoad={() => setPosterLoaded(true)}
      />
      <div className="movie-card__title">{movie.title || 'No Title'}</div>
      {showRemove && (
        <button
          className="movie-card__remove"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(movie.id)
          }}
        >
          &times;
        </button>
      )}
    </div>
  )
}

export default MovieCard
