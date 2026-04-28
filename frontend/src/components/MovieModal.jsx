const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w1280'

function MovieModal({ movie, onClose, user, favorites, setFavorites, watchLater, setWatchLater, selected, setSelected }) {
  if (!movie) return null

  const getPosterUrl = (path) => {
    if (!path) return null
    if (path.startsWith('http')) return path
    return `${TMDB_IMG_BASE}${path}`
  }

  const getYear = (date) => {
    if (!date) return null
    return date.split('-')[0]
  }

  const getRuntime = (minutes) => {
    if (!minutes) return null
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const handleAddToFavorites = async () => {
    if (!user || !movie.id) return

    try {
      const res = await fetch(`/api/favorites/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movies: [{ movie_id: movie.id }] }),
      })

      if (res.ok) {
        setFavorites(new Set([...favorites, movie.id]))
      }
    } catch (err) {
      console.error('Error adding to favorites:', err)
    }
  }

  const handleAddToWatchLater = async () => {
    if (!user || !movie.id) return

    try {
      const res = await fetch(`/api/watch-later/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movies: [{ movie_id: movie.id }] }),
      })

      if (res.ok) {
        setWatchLater(new Set([...watchLater, movie.id]))
      }
    } catch (err) {
      console.error('Error adding to watch later:', err)
    }
  }

  const handleAddToSelected = async () => {
    if (!user || !movie.id) return

    try {
      const res = await fetch(`/api/selected/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movies: [{ movie_id: movie.id }] }),
      })

      if (res.ok) {
        setSelected(new Set([...selected, movie.id]))
      }
    } catch (err) {
      console.error('Error adding to selected:', err)
    }
  }

  const isFavorite = favorites.has(movie.id)
  const isWatchLater = watchLater.has(movie.id)
  const isSelected = selected?.has(movie.id)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={onClose}>&times;</button>
        <div className="modal__content">
          {movie.poster_path && (
            <img className="modal__poster" src={getPosterUrl(movie.poster_path)} alt={movie.title} />
          )}
          <div className="modal__info">
            <h2 className="modal__title">{movie.title || 'No Title'}</h2>
            
            {movie.tagline && <p className="modal__tagline">{movie.tagline}</p>}
            
            <div className="modal__meta">
              {getYear(movie.release_date) && (
                <span className="modal__year">{getYear(movie.release_date)}</span>
              )}
              {movie.runtime && (
                <span className="modal__runtime">{getRuntime(movie.runtime)}</span>
              )}
              {movie.vote_average && (
                <span className="modal__rating">★ {Number(movie.vote_average).toFixed(1)}</span>
              )}
            </div>

            {movie.genres && <p className="modal__genres">{movie.genres}</p>}

            {movie.overview && (
              <div className="modal__description">
                <h3>Overview</h3>
                <p>{movie.overview}</p>
              </div>
            )}

            {movie.belongs_to_collection && (
              <p className="modal__collection">
                <span className="modal__collection-label">Collection:</span> {movie.belongs_to_collection}
              </p>
            )}

            {user && (
              <div className="modal__actions">
                <button
                  className="btn btn--primary"
                  onClick={handleAddToFavorites}
                  disabled={isFavorite}
                >
                  {isFavorite ? 'In Favorites' : 'Add to Favorites'}
                </button>
                <button
                  className="btn btn--secondary"
                  onClick={handleAddToWatchLater}
                  disabled={isWatchLater}
                >
                  {isWatchLater ? 'In List' : 'Watch Later'}
                </button>
                <button
                  className="btn btn--secondary"
                  onClick={handleAddToSelected}
                  disabled={isSelected}
                >
                  {isSelected ? 'Selected' : 'Add to Selected'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MovieModal