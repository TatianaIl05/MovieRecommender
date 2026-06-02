import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import Auth from './pages/Auth'
import Profile from './pages/Profile'
import Recommend from './pages/Recommend'
import WatchLater from './pages/WatchLater'
import Selected from './pages/Selected'
import VerifyEmail from './pages/VerifyEmail'

const MOVIE_CACHE_KEY = 'movieCache'
const MOVIE_CACHE_TTL = 15 * 60 * 1000

function loadMovieCache() {
  try {
    const savedCache = sessionStorage.getItem(MOVIE_CACHE_KEY)
    if (!savedCache) return new Map()

    const { savedAt, movies } = JSON.parse(savedCache)
    if (!savedAt || Date.now() - savedAt > MOVIE_CACHE_TTL || !Array.isArray(movies)) {
      sessionStorage.removeItem(MOVIE_CACHE_KEY)
      return new Map()
    }

    return new Map(movies.map((movie) => [Number(movie.id), movie]))
  } catch (err) {
    console.error('Error loading movie cache:', err)
    sessionStorage.removeItem(MOVIE_CACHE_KEY)
    return new Map()
  }
}

function App() {
  const [user, setUser] = useState(null)
  const [favorites, setFavorites] = useState(new Set())
  const [watchLater, setWatchLater] = useState(new Set())
  const [selected, setSelected] = useState(new Set())
  const [disliked, setDisliked] = useState(new Set())
  const [movieCache, setMovieCache] = useState(loadMovieCache)

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (err) {
        console.error('Error parsing saved user:', err)
        localStorage.removeItem('user')
      }
    }
  }, [])

  useEffect(() => {
    if (!user) return

    const loadUserLists = async () => {
      try {
        const [favoritesRes, watchLaterRes, selectedRes, dislikedRes] = await Promise.all([
          fetch(`/api/favorites/${user.id}`),
          fetch(`/api/watch-later/${user.id}`),
          fetch(`/api/selected/${user.id}`),
          fetch(`/api/disliked/${user.id}`)
        ])

        const [favoritesData, watchLaterData, selectedData, dislikedData] = await Promise.all([
          favoritesRes.json(),
          watchLaterRes.json(),
          selectedRes.json(),
          dislikedRes.json()
        ])

        setFavorites(new Set(favoritesData.favorite_movies || []))
        setWatchLater(new Set(watchLaterData.watch_later_movies || []))
        setSelected(new Set(selectedData.selected_movies || []))
        setDisliked(new Set(dislikedData.disliked_movies || []))
      } catch (err) {
        console.error('Error loading user lists:', err)
      }
    }

    loadUserLists()
  }, [user])

  useEffect(() => {
    if (movieCache.size === 0) {
      sessionStorage.removeItem(MOVIE_CACHE_KEY)
      return
    }

    sessionStorage.setItem(MOVIE_CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      movies: [...movieCache.values()]
    }))
  }, [movieCache])

  return (
    <Router>
      <div className="app">
        <Header user={user} setUser={setUser} setFavorites={setFavorites} setWatchLater={setWatchLater} setSelected={setSelected} setDisliked={setDisliked} setMovieCache={setMovieCache} />
        <main className="main">
          <Routes>
            <Route path="/" element={<Home user={user} favorites={favorites} setFavorites={setFavorites} watchLater={watchLater} setWatchLater={setWatchLater} selected={selected} setSelected={setSelected} disliked={disliked} setDisliked={setDisliked} />} />
            <Route path="/auth" element={<Auth setUser={setUser} />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/profile" element={user ? <Profile user={user} favorites={favorites} setFavorites={setFavorites} watchLater={watchLater} setWatchLater={setWatchLater} selected={selected} setSelected={setSelected} disliked={disliked} setDisliked={setDisliked} movieCache={movieCache} setMovieCache={setMovieCache} /> : <Navigate to="/auth" />} />
            <Route path="/recommend" element={user ? <Recommend user={user} favorites={favorites} setFavorites={setFavorites} watchLater={watchLater} setWatchLater={setWatchLater} selected={selected} setSelected={setSelected} disliked={disliked} setDisliked={setDisliked} /> : <Navigate to="/auth" />} />
            <Route path="/watch-later" element={user ? <WatchLater user={user} favorites={favorites} setFavorites={setFavorites} watchLater={watchLater} setWatchLater={setWatchLater} selected={selected} setSelected={setSelected} disliked={disliked} setDisliked={setDisliked} movieCache={movieCache} setMovieCache={setMovieCache} /> : <Navigate to="/auth" />} />
            <Route path="/selected" element={user ? <Selected user={user} favorites={favorites} setFavorites={setFavorites} watchLater={watchLater} setWatchLater={setWatchLater} selected={selected} setSelected={setSelected} disliked={disliked} setDisliked={setDisliked} movieCache={movieCache} setMovieCache={setMovieCache} /> : <Navigate to="/auth" />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App
