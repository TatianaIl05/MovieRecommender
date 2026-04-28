import { useState, useEffect } from 'react'
import MovieCard from '../components/MovieCard'
import MovieModal from '../components/MovieModal'

const RECOMMENDER_URL = '/recommender'

function Recommend({ user, favorites, setFavorites, watchLater, setWatchLater, selected, setSelected }) {
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
      loadRecommendations()
    }
  }, [user?.id])

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
      const data = await res.json()

      if (data.favorite_movies && data.favorite_movies.length > 0) {
        setNoFavorites(false)
        await getRecommendationsFromApi(data.favorite_movies, currentOffset)
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
      const allIds = favoriteIds
      let recommendIds = allRecommendIds

      if (currentOffset === 0) {
        const res = await fetch(`${RECOMMENDER_URL}/api/recommend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tmdb_ids: favoriteIds, k: 30000, alpha: 0.75 }),
        })

        const data = await res.json()

        if (data.recommendations && data.recommendations.length > 0) {
          recommendIds = data.recommendations.map(rec => rec.tmdb_id)
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

      const moviesData = await moviesRes.json()

      if (currentOffset === 0) {
        setMovies(moviesData)
      } else {
        setMovies([...movies, ...moviesData])
      }

      setOffset(currentOffset + moviesData.length)
      setHasMore(moviesData.length >= limit)
    } catch (err) {
      console.error('Error getting recommendations:', err)
      setError('Failed to load recommendations')
    }
  }

  const loadPopularMovies = async (currentOffset) => {
    try {
      const res = await fetch(`/api/movies/popular?limit=${limit}&offset=${currentOffset}`)
      const data = await res.json()

      if (data.movies && data.movies.length > 0) {
        const moviesWithDetails = await Promise.all(
          data.movies.map(async (movie) => {
            try {
              const detailRes = await fetch(`/api/movies/${movie.id}`)
              if (detailRes.ok) {
                const detail = await detailRes.json()
                return { ...movie, ...detail }
              }
              return movie
            } catch (err) {
              return movie
            }
          })
        )

        if (currentOffset === 0) {
          setMovies(moviesWithDetails)
        } else {
          setMovies([...movies, ...moviesWithDetails])
        }

        setOffset(currentOffset + data.movies.length)
        setHasMore(data.movies.length >= limit)
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

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>{noFavorites ? 'Loading popular movies...' : 'Finding recommendations...'}</p>
        </div>
      )}

      {error && !loading && (
        <p className="empty-state">{error}</p>
      )}

      {movies.length > 0 && !loading && (
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

      {hasMore && movies.length > 0 && !loading && (
        <div className="pagination">
          <button className="btn btn--secondary" onClick={() => loadRecommendations()}>
            Load More
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
        />
      )}
    </div>
  )
}

export default Recommend