import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Header from './components/Header'
import Home from './pages/Home'
import Auth from './pages/Auth'
import Profile from './pages/Profile'
import Recommend from './pages/Recommend'
import WatchLater from './pages/WatchLater'

function App() {
  const [user, setUser] = useState(null)
  const [favorites, setFavorites] = useState(new Set())
  const [watchLater, setWatchLater] = useState(new Set())

  return (
    <Router>
      <div className="app">
        <Header user={user} setUser={setUser} setFavorites={setFavorites} setWatchLater={setWatchLater} />
        <main className="main">
          <Routes>
            <Route path="/" element={<Home user={user} favorites={favorites} setFavorites={setFavorites} watchLater={watchLater} setWatchLater={setWatchLater} />} />
            <Route path="/auth" element={<Auth setUser={setUser} />} />
            <Route path="/profile" element={user ? <Profile user={user} favorites={favorites} setFavorites={setFavorites} /> : <Navigate to="/auth" />} />
            <Route path="/recommend" element={<Recommend user={user} favorites={favorites} setFavorites={setFavorites} watchLater={watchLater} setWatchLater={setWatchLater} />} />
            <Route path="/watch-later" element={user ? <WatchLater user={user} watchLater={watchLater} setWatchLater={setWatchLater} /> : <Navigate to="/auth" />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
