import { Link, useLocation } from 'react-router-dom'

function Header({ user, setUser, setFavorites, setWatchLater, setSelected, setDisliked, setMovieCache }) {
  const location = useLocation()
  const userInitial = user?.login?.charAt(0)?.toUpperCase() || '?'

  const handleLogout = () => {
    setUser(null)
    setFavorites(new Set())
    setWatchLater(new Set())
    setSelected(new Set())
    setDisliked(new Set())
    setMovieCache(new Map())
    localStorage.removeItem('user')
  }

  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="logo" aria-label="MovieRec home">
          <span className="logo__mark" aria-hidden="true">MR</span>
          <span className="logo__copy">
            <span className="logo__name">MovieRec</span>
            <span className="logo__tagline">curated cinema</span>
          </span>
        </Link>
        <nav className="nav">
          <Link to="/" className={`nav__link ${location.pathname === '/' ? 'active' : ''}`}>Movies</Link>
          <Link to="/recommend" className={`nav__link ${location.pathname === '/recommend' ? 'active' : ''}`}>Recommendations</Link>
          <Link to="/watch-later" className={`nav__link ${location.pathname === '/watch-later' ? 'active' : ''}`}>Watch Later</Link>
          <Link to="/selected" className={`nav__link ${location.pathname === '/selected' ? 'active' : ''}`}>Selected</Link>
          <a
            href="https://github.com/TatianaIl05/MovieRecommender"
            target="_blank"
            rel="noopener noreferrer"
            className="nav__link nav__link--github"
          >
            <span className="nav__github-dot" aria-hidden="true" />
            GitHub
          </a>
          {user ? (
            <>
              <Link to="/profile" className={`nav__link nav__user ${location.pathname === '/profile' ? 'active' : ''}`}>
                <span className="nav__avatar" aria-hidden="true">{userInitial}</span>
              </Link>
              {location.pathname === '/profile' && (
                <button className="btn btn--logout" onClick={handleLogout}>Logout</button>
              )}
            </>
          ) : (
            <Link to="/auth" className="nav__link nav__link--auth">Login</Link>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Header
