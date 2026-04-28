import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MovieCard from '../components/MovieCard'
import MovieModal from '../components/MovieModal'

const RECOMMENDER_URL = '/recommender'

function Recommend({ user, setUser, favorites, setFavorites, watchLater, setWatchLater }) {
  const [movies, setMovies] = useState([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [noFavorites, setNoFavorites] = useState(false)
  const [allRecommendIds, setAllRecommendIds] = useState([])
  const limit = 40

  const [activeTab, setActiveTab] = useState('login')
  const [loginData, setLoginData] = useState({ login: '', password: '' })
  const [registerData, setRegisterData] = useState({ login: '', email: '', password: '', passwordConfirm: '' })
  const [loginMessage, setLoginMessage] = useState({ text: '', type: '' })
  const [registerMessage, setRegisterMessage] = useState({ text: '', type: '' })
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.id) {
      loadRecommendations()
    }
  }, [user?.id])

  const showMessage = (setter, text, type) => {
    setter({ text, type })
    setTimeout(() => setter({ text: '', type: '' }), 5000)
  }

  const handleLogin = async (e) => {
    e.preventDefault()

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      })

      const data = await res.json()

      if (res.ok) {
        setUser(data.user)
      } else {
        showMessage(setLoginMessage, data.error || 'Login failed', 'error')
      }
    } catch (err) {
      showMessage(setLoginMessage, 'Network error', 'error')
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()

    if (registerData.password !== registerData.passwordConfirm) {
      return showMessage(setRegisterMessage, 'Passwords do not match', 'error')
    }

    if (registerData.password.length < 6) {
      return showMessage(setRegisterMessage, 'Password must be at least 6 characters', 'error')
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: registerData.login,
          email: registerData.email,
          password: registerData.password,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        showMessage(setRegisterMessage, 'Registration successful! Please login.', 'success')
        setRegisterData({ login: '', email: '', password: '', passwordConfirm: '' })
        setTimeout(() => setActiveTab('login'), 2000)
      } else {
        showMessage(setRegisterMessage, data.error || 'Registration failed', 'error')
      }
    } catch (err) {
      showMessage(setRegisterMessage, 'Network error', 'error')
    }
  }

  if (!user) {
    return (
      <div className="container container--narrow">
        <div className="auth-card">
          <div className="auth-tabs">
            <button
              className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => setActiveTab('login')}
            >
              Login
            </button>
            <button
              className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => setActiveTab('register')}
            >
              Register
            </button>
          </div>

          {activeTab === 'login' && (
            <form className="auth-form" onSubmit={handleLogin}>
              <h2 className="auth-form__title">Login to see recommendations</h2>
              <div className="form-group">
                <label htmlFor="loginLogin">Login</label>
                <input
                  type="text"
                  id="loginLogin"
                  placeholder="Your login"
                  value={loginData.login}
                  onChange={(e) => setLoginData({ ...loginData, login: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="loginPassword">Password</label>
                <input
                  type="password"
                  id="loginPassword"
                  placeholder="Your password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="btn btn--primary btn--full">Login</button>
              {loginMessage.text && (
                <div className={`form-message ${loginMessage.type}`}>{loginMessage.text}</div>
              )}
            </form>
          )}

          {activeTab === 'register' && (
            <form className="auth-form" onSubmit={handleRegister}>
              <h2 className="auth-form__title">Register to see recommendations</h2>
              <div className="form-group">
                <label htmlFor="regLogin">Login</label>
                <input
                  type="text"
                  id="regLogin"
                  placeholder="Choose a login"
                  value={registerData.login}
                  onChange={(e) => setRegisterData({ ...registerData, login: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="regEmail">Email</label>
                <input
                  type="email"
                  id="regEmail"
                  placeholder="your@email.com"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="regPassword">Password</label>
                <input
                  type="password"
                  id="regPassword"
                  placeholder="At least 6 characters"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="regPasswordConfirm">Confirm Password</label>
                <input
                  type="password"
                  id="regPasswordConfirm"
                  placeholder="Repeat password"
                  value={registerData.passwordConfirm}
                  onChange={(e) => setRegisterData({ ...registerData, passwordConfirm: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="btn btn--primary btn--full">Register</button>
              {registerMessage.text && (
                <div className={`form-message ${registerMessage.type}`}>{registerMessage.text}</div>
              )}
            </form>
          )}
        </div>
      </div>
    )
  }

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
        />
      )}
    </div>
  )
}

export default Recommend