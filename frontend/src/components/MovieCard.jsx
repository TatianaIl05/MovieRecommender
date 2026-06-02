import { useState } from 'react'
import moviePlaceholder from '../assets/movie-placeholder.svg'

const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w500'

function MovieCard({ movie, onClick, onRemove, showRemove = false }) {
  const [posterLoaded, setPosterLoaded] = useState(false)

  const getPosterUrl = (path) => {
    if (!path) return null
    if (path.startsWith('http')) return path
    return `${TMDB_IMG_BASE}${path}`
  }

  const posterUrl = getPosterUrl(movie.poster_path) || moviePlaceholder
  const year = movie.release_date ? String(movie.release_date).split('-')[0] : null
  const rating = Number(movie.vote_average)
  const ratingLabel = Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : null
  const primaryGenre = Array.isArray(movie.genres)
    ? movie.genres[0]
    : String(movie.genres || '').split(',').map((genre) => genre.trim()).filter(Boolean)[0]

  return (
    <div className="movie-card" onClick={onClick}>
      <img
        className={`movie-card__poster ${!posterLoaded ? 'movie-card__poster--placeholder' : ''}`}
        src={posterUrl}
        alt={movie.title || 'Movie poster'}
        onLoad={() => setPosterLoaded(true)}
        onError={(e) => {
          if (!e.currentTarget.dataset.fallback) {
            e.currentTarget.dataset.fallback = 'true'
            e.currentTarget.src = moviePlaceholder
          }
        }}
      />
      {(ratingLabel || year || primaryGenre) && (
        <div className="movie-card__badges">
          {ratingLabel && <span className="movie-card__badge movie-card__badge--rating">★ {ratingLabel}</span>}
          {year && <span className="movie-card__badge">{year}</span>}
          {primaryGenre && <span className="movie-card__badge movie-card__badge--genre">{primaryGenre}</span>}
        </div>
      )}
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
