import { memo, useState } from 'react'
import moviePlaceholder from '../assets/movie-placeholder.svg'

const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w342'

function MovieCard({ movie, onClick, onRemove, showRemove = false }) {
  const [posterLoaded, setPosterLoaded] = useState(false)

  const getPosterUrl = (path) => {
    if (!path) return null
    if (path.startsWith('http')) return path
    return `${TMDB_IMG_BASE}${path}`
  }

  const posterUrl = getPosterUrl(movie.poster_path) || moviePlaceholder

  return (
    <div className="movie-card" onClick={onClick}>
      <img
        className={`movie-card__poster ${!posterLoaded ? 'movie-card__poster--placeholder' : ''}`}
        src={posterUrl}
        alt={movie.title || 'Movie poster'}
        loading="lazy"
        decoding="async"
        onLoad={() => setPosterLoaded(true)}
        onError={(e) => {
          if (!e.currentTarget.dataset.fallback) {
            e.currentTarget.dataset.fallback = 'true'
            e.currentTarget.src = moviePlaceholder
          }
        }}
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

export default memo(MovieCard)
