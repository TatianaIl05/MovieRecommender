import { useState, useEffect } from 'react'
import MovieCard from '../components/MovieCard'
import MovieGridSkeleton from '../components/MovieGridSkeleton'
import MovieModal from '../components/MovieModal'

const RECOMMENDER_URL = '/recommender'

function Recommend({ user, favorites, setFavorites, watchLater, setWatchLater, selected, setSelected, disliked, setDisliked }) {
  const [movies, setMovies] = useState([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [noFavorites, setNoFavorites] = useState(false)
  const [allRecommendIds, setAllRecommendIds] = useState([])
  const limit = 40

  useEffect(() => {
    if (user?.id) {
      loadRecommendations(true)
    }
  }, [user?.id])

  useEffect(() => {
    setMovies((currentMovies) => currentMovies.filter((movie) => !disliked.has(movie.id)))
    setAllRecommendIds((currentIds) => currentIds.filter((id) => !disliked.has(id)))
  }, [disliked])

  const loadRecommendations = async (reset = false) => {
    const currentOffset = reset ? 0 : offset

    setLoading(true)
    setError('')

    if (reset) {
      setMovies([])
      setAllRecommendIds([])
    }

    try {
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
          body: JSON.stringify({ tmdb_ids: favoriteIds, k: 200, alpha: 0.6 }),
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

      setMovies((currentMovies) => currentOffset === 0 ? moviesData : [...currentMovies, ...moviesData])

      setOffset(currentOffset + pageIds.length)
      setHasMore(pageIds.length >= limit)
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

  return (
    <div className="container">
      <h1 className="page__title">Recommendations</h1>

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
        <div className="movies-grid">
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onClick={() => setSelectedMovie(movie)}
            />
          ))}
        </div>
      )}

      {hasMore && movies.length > 0 && (
        <div className="pagination">
          <button className="btn btn--secondary" onClick={() => loadRecommendations()} disabled={loading}>
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
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
