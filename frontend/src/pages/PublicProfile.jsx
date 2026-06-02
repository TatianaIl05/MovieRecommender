import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import MovieGridSkeleton from '../components/MovieGridSkeleton'
import MovieModal from '../components/MovieModal'
import VirtualMovieGrid from '../components/VirtualMovieGrid'
import { getMoviesByIds } from '../utils/movieCache'

function formatJoinDate(value) {
  if (!value) return null

  try {
    return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(value))
  } catch (err) {
    return null
  }
}

function PublicProfile({ user, favorites, setFavorites, watchLater, setWatchLater, selected, setSelected, disliked, setDisliked, movieCache, setMovieCache }) {
  const { login } = useParams()
  const [profile, setProfile] = useState(null)
  const [movies, setMovies] = useState([])
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    loadPublicProfile(controller.signal)

    return () => controller.abort()
  }, [login])

  const loadPublicProfile = async (signal) => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(login)}/public`, { signal })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load profile')
      }

      const movieIds = data.favorite_movie_ids || []
      setProfile(data)
      setMovies(await getMoviesByIds(movieIds, movieCache, setMovieCache))
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to load profile')
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="public-profile-header public-profile-header--loading" />
        <MovieGridSkeleton count={12} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <div className="empty-state">
          <p>{error}</p>
          <Link to="/" className="btn btn--secondary auth-link-btn">Back to movies</Link>
        </div>
      </div>
    )
  }

  const joinDate = formatJoinDate(profile?.created_at)

  return (
    <div className="container">
      <section className="public-profile-header">
        <div className="public-profile-header__avatar" aria-hidden="true">
          {profile.login.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="public-profile-header__eyebrow">Public profile</p>
          <h1 className="page__title public-profile-header__title">{profile.login}'s favourites</h1>
          <p className="public-profile-header__meta">
            {profile.favorites_count} favourite {profile.favorites_count === 1 ? 'movie' : 'movies'}
            {joinDate ? ` · Joined ${joinDate}` : ''}
          </p>
        </div>
      </section>

      {movies.length > 0 ? (
        <VirtualMovieGrid movies={movies} onMovieClick={setSelectedMovie} />
      ) : (
        <p className="empty-state">This user has no favourite movies yet.</p>
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

export default PublicProfile
