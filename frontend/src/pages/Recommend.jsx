import { useState, useEffect } from 'react'
import LoadMoreSentinel from '../components/LoadMoreSentinel'
import MovieGridSkeleton from '../components/MovieGridSkeleton'
import MovieModal from '../components/MovieModal'
import VirtualMovieGrid from '../components/VirtualMovieGrid'

const RECOMMENDER_URL = '/recommender'
const RECOMMENDATION_MIXES = {
  balanced: { label: 'Balanced', alpha: 0.6, k: 200 },
  popular: { label: 'More popular', alpha: 0.45, k: 200 },
  niche: { label: 'More niche', alpha: 0.85, k: 200 },
  rated: { label: 'Higher rated', alpha: 0.55, k: 240, sortByRating: true }
}

function Recommend({ user, favorites, setFavorites, watchLater, setWatchLater, selected, setSelected, disliked, setDisliked }) {
  const [movies, setMovies] = useState([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [noFavorites, setNoFavorites] = useState(false)
  const [allRecommendIds, setAllRecommendIds] = useState([])
  const [recommendationMix, setRecommendationMix] = useState('balanced')
  const [compareMode, setCompareMode] = useState(false)
  const [compareSelection, setCompareSelection] = useState([])
  const [compareSourceIds, setCompareSourceIds] = useState(null)
  const limit = 40
  const activeMix = RECOMMENDATION_MIXES[recommendationMix]

  useEffect(() => {
    if (user?.id) {
      loadRecommendations(true)
    }
  }, [user?.id, recommendationMix])

  useEffect(() => {
    setMovies((currentMovies) => currentMovies.filter((movie) => !disliked.has(movie.id)))
    setAllRecommendIds((currentIds) => currentIds.filter((id) => !disliked.has(id)))
  }, [disliked])

  const loadRecommendations = async (reset = false, sourceIds = compareSourceIds) => {
    if (!reset && loading) return

    const currentOffset = reset ? 0 : offset

    setLoading(true)
    setError('')

    if (reset) {
      setMovies([])
      setAllRecommendIds([])
    }

    try {
      if (sourceIds?.length) {
        setNoFavorites(false)
        await getRecommendationsFromApi(sourceIds, currentOffset)
        return
      }

      const res = await fetch(`/api/favorites/${user.id}`)
      if (!res.ok) {
        throw new Error('Failed to load favorites')
      }

      const data = await res.json()

      if (data.favorite_movies && data.favorite_movies.length > 0) {
        const availableFavoriteIds = data.favorite_movies.filter((id) => !disliked.has(id))
        if (availableFavoriteIds.length > 0) {
          setNoFavorites(false)
          await getRecommendationsFromApi(availableFavoriteIds, currentOffset)
        } else {
          setNoFavorites(true)
          await loadPopularMovies(currentOffset)
        }
      } else {
        setNoFavorites(true)
        await loadPopularMovies(currentOffset)
      }
    } catch (err) {
      console.error('Error loading favorites:', err)
      setNoFavorites(true)
      await loadPopularMovies(currentOffset)
    } finally {
      setLoading(false)
    }
  }

  const getRecommendationsFromApi = async (favoriteIds, currentOffset) => {
    try {
      let recommendIds = allRecommendIds

      if (currentOffset === 0) {
        const res = await fetch(`${RECOMMENDER_URL}/api/recommend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tmdb_ids: favoriteIds, k: activeMix.k, alpha: activeMix.alpha }),
        })

        if (!res.ok) {
          throw new Error('Failed to load recommendations')
        }

        const data = await res.json()

        if (data.recommendations && data.recommendations.length > 0) {
          recommendIds = data.recommendations
            .map(rec => rec.tmdb_id)
            .filter((id) => !disliked.has(id))
          setAllRecommendIds(recommendIds)
        } else {
          setError('No recommendations found')
          return
        }
      }

      const pageIds = recommendIds.slice(currentOffset, currentOffset + limit)

      if (pageIds.length === 0) {
        setHasMore(false)
        return
      }

      const moviesRes = await fetch('/api/movies/by-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: pageIds }),
      })

      if (!moviesRes.ok) {
        throw new Error('Failed to load recommended movies')
      }

      const moviesData = await moviesRes.json()
      const nextMovies = activeMix.sortByRating
        ? [...moviesData].sort((a, b) => Number(b.vote_average || 0) - Number(a.vote_average || 0))
        : moviesData

      setMovies((currentMovies) => currentOffset === 0 ? nextMovies : [...currentMovies, ...nextMovies])

      setOffset(currentOffset + pageIds.length)
      setHasMore(currentOffset + pageIds.length < recommendIds.length)
    } catch (err) {
      console.error('Error getting recommendations:', err)
      setError('Failed to load recommendations')
    }
  }

  const loadPopularMovies = async (currentOffset) => {
    try {
      const res = await fetch(`/api/movies/popular?limit=${limit}&offset=${currentOffset}`)
      if (!res.ok) {
        throw new Error('Failed to load popular movies')
      }

      const data = await res.json()

      if (data.movies && data.movies.length > 0) {
        const allowedMovies = data.movies.filter((movie) => !disliked.has(movie.id))

        if (allowedMovies.length === 0 && data.hasMore !== false) {
          setOffset(currentOffset + data.movies.length)
          await loadPopularMovies(currentOffset + data.movies.length)
          return
        }

        setMovies((currentMovies) => currentOffset === 0 ? allowedMovies : [...currentMovies, ...allowedMovies])

        setOffset(currentOffset + data.movies.length)
        setHasMore(data.hasMore !== false)
      } else {
        setHasMore(false)
      }
    } catch (err) {
      console.error('Error loading popular movies:', err)
    }
  }

  const handleMixChange = (mixKey) => {
    setRecommendationMix(mixKey)
    setCompareSourceIds(null)
    setAllRecommendIds([])
    setOffset(0)
    setHasMore(true)
  }

  const toggleCompareMode = () => {
    setCompareMode((current) => !current)
    setCompareSelection([])
  }

  const toggleCompareMovie = (movie) => {
    setCompareSelection((currentSelection) => {
      const exists = currentSelection.some((item) => item.id === movie.id)
      if (exists) return currentSelection.filter((item) => item.id !== movie.id)
      if (currentSelection.length >= 3) return currentSelection
      return [...currentSelection, movie]
    })
  }

  const runCompareRecommendations = async () => {
    if (compareSelection.length < 2) {
      setError('Select at least 2 movies to compare')
      return
    }

    const ids = compareSelection.map((movie) => movie.id)
    setLoading(true)
    setError('')
    setNoFavorites(false)
    setMovies([])
    setAllRecommendIds([])
    setOffset(0)
    setHasMore(true)
    setCompareSourceIds(ids)

    try {
      await getRecommendationsFromApi(ids, 0)
    } finally {
      setLoading(false)
    }
  }

  const clearCompareRecommendations = () => {
    setCompareSourceIds(null)
    setCompareSelection([])
    setCompareMode(false)
    setAllRecommendIds([])
    setOffset(0)
    setHasMore(true)
    loadRecommendations(true, null)
  }

  return (
    <div className="container">
      <h1 className="page__title">Recommendations</h1>

      <div className="recommend-toolbar">
        <div className="recommend-toolbar__group">
          {Object.entries(RECOMMENDATION_MIXES).map(([key, mix]) => (
            <button
              type="button"
              key={key}
              className={`recommend-chip ${recommendationMix === key ? 'recommend-chip--active' : ''}`}
              onClick={() => handleMixChange(key)}
            >
              {mix.label}
            </button>
          ))}
        </div>
        <div className="recommend-toolbar__group">
          <button type="button" className={`recommend-chip ${compareMode ? 'recommend-chip--active' : ''}`} onClick={toggleCompareMode}>
            Compare mode
          </button>
          {compareSourceIds && (
            <button type="button" className="recommend-chip" onClick={clearCompareRecommendations}>
              Back to favourites
            </button>
          )}
        </div>
      </div>

      {compareMode && (
        <div className="compare-panel">
          <div>
            <strong>Compare selection:</strong> {compareSelection.length}/3
            {compareSelection.length > 0 && (
              <span className="compare-panel__titles">
                {' '}{compareSelection.map((movie) => movie.title).join(', ')}
              </span>
            )}
          </div>
          <button type="button" className="btn btn--primary" onClick={runCompareRecommendations} disabled={loading || compareSelection.length < 2}>
            Find Similar
          </button>
        </div>
      )}

      {noFavorites && (
        <div className="empty-state">
          <p>Add 5-10 favorite movies to get personalized recommendations</p>
        </div>
      )}

      {loading && movies.length === 0 && <MovieGridSkeleton count={12} />}

      {error && !loading && (
        <p className="empty-state">{error}</p>
      )}

      {movies.length > 0 && (
        <VirtualMovieGrid
          movies={movies}
          onMovieClick={setSelectedMovie}
          compareMode={compareMode}
          selectedIds={new Set(compareSelection.map((movie) => movie.id))}
          onToggleSelect={toggleCompareMovie}
        />
      )}

      {hasMore && movies.length > 0 && (
        <>
          <LoadMoreSentinel enabled={!loading} loading={loading} onLoadMore={() => loadRecommendations()} />
          <div className="pagination">
            <button className="btn btn--secondary" onClick={() => loadRecommendations()} disabled={loading}>
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        </>
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

export default Recommend
