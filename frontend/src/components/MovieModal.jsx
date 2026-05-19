const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w1280'

function MovieModal({ movie, onClose, user, favorites, setFavorites, watchLater, setWatchLater, selected, setSelected, disliked, setDisliked }) {
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

  const formatList = (value) => {
    if (!value) return null
    return Array.isArray(value) ? value.join(', ') : value
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
        const newDisliked = new Set(disliked)
        newDisliked.delete(movie.id)
        setDisliked(newDisliked)
      }
    } catch (err) {
      console.error('Error adding to favorites:', err)
    }
  }

  const handleRemoveFromFavorites = async () => {
    if (!user || !movie.id) return

    try {
      const res = await fetch(`/api/favorites/${user.id}/${movie.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        const newFavorites = new Set(favorites)
        newFavorites.delete(movie.id)
        setFavorites(newFavorites)
      }
    } catch (err) {
      console.error('Error removing from favorites:', err)
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

  const handleRemoveFromWatchLater = async () => {
    if (!user || !movie.id) return

    try {
      const res = await fetch(`/api/watch-later/${user.id}/${movie.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        const newWatchLater = new Set(watchLater)
        newWatchLater.delete(movie.id)
        setWatchLater(newWatchLater)
      }
    } catch (err) {
      console.error('Error removing from watch later:', err)
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

  const handleRemoveFromSelected = async () => {
    if (!user || !movie.id) return

    try {
      const res = await fetch(`/api/selected/${user.id}/${movie.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        const newSelected = new Set(selected)
        newSelected.delete(movie.id)
        setSelected(newSelected)
      }
    } catch (err) {
      console.error('Error removing from selected:', err)
    }
  }

  const handleAddToDisliked = async () => {
    if (!user || !movie.id) return

    const nextDisliked = new Set(disliked)
    nextDisliked.add(movie.id)
    const nextFavorites = new Set(favorites)
    nextFavorites.delete(movie.id)

    setDisliked(nextDisliked)
    setFavorites(nextFavorites)

    try {
      const res = await fetch(`/api/disliked/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movies: [{ movie_id: movie.id }] }),
      })

      if (!res.ok) {
        throw new Error('Failed to add disliked movie')
      }
    } catch (err) {
      setDisliked(new Set(disliked))
      setFavorites(new Set(favorites))
      console.error('Error adding to disliked movies:', err)
    }
  }

  const handleRemoveFromDisliked = async () => {
    if (!user || !movie.id) return

    const nextDisliked = new Set(disliked)
    nextDisliked.delete(movie.id)

    setDisliked(nextDisliked)

    try {
      const res = await fetch(`/api/disliked/${user.id}/${movie.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to remove disliked movie')
      }
    } catch (err) {
      setDisliked(new Set(disliked))
      console.error('Error removing from disliked movies:', err)
    }
  }

  const isFavorite = favorites.has(movie.id)
  const isWatchLater = watchLater.has(movie.id)
  const isSelected = selected?.has(movie.id)
  const isDisliked = disliked?.has(movie.id)

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

            {formatList(movie.genres) && <p className="modal__genres">{formatList(movie.genres)}</p>}

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
                  className={`btn modal__dislike-btn ${isDisliked ? 'modal__dislike-btn--active' : ''}`}
                  onClick={isDisliked ? handleRemoveFromDisliked : handleAddToDisliked}
                  title={isDisliked ? 'Allow recommendations' : 'Do not recommend this movie'}
                  aria-label={isDisliked ? 'Allow recommendations' : 'Do not recommend this movie'}
                  aria-pressed={isDisliked}
                >
                  <span aria-hidden="true" className="modal__dislike-icon" />
                </button>
                <button
                  className="btn btn--primary"
                  onClick={isFavorite ? handleRemoveFromFavorites : handleAddToFavorites}
                >
                  {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                </button>
                <button
                  className="btn btn--secondary"
                  onClick={isWatchLater ? handleRemoveFromWatchLater : handleAddToWatchLater}
                >
                  {isWatchLater ? 'Remove from Watch Later' : 'Watch Later'}
                </button>
                <button
                  className="btn btn--secondary"
                  onClick={isSelected ? handleRemoveFromSelected : handleAddToSelected}
                >
                  {isSelected ? 'Remove from Selected' : 'Add to Selected'}
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
