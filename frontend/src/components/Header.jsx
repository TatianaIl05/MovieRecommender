import { Link, useLocation } from 'react-router-dom'

function Header({ user, setUser, setFavorites, setWatchLater, setSelected }) {
  const location = useLocation()

  const handleLogout = () => {
    setUser(null)
    setFavorites(new Set())
    setWatchLater(new Set())
    setSelected(new Set())
  }

  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="logo">MovieRec</Link>
        <nav className="nav">
          <Link to="/" className={`nav__link ${location.pathname === '/' ? 'active' : ''}`}>Movies</Link>
          <Link to="/recommend" className={`nav__link ${location.pathname === '/recommend' ? 'active' : ''}`}>Recommendations</Link>
          <Link to="/watch-later" className={`nav__link ${location.pathname === '/watch-later' ? 'active' : ''}`}>Watch Later</Link>
          <Link to="/selected" className={`nav__link ${location.pathname === '/selected' ? 'active' : ''}`}>Selected</Link>
          {user ? (
            <>
              <Link to="/profile" className={`nav__link ${location.pathname === '/profile' ? 'active' : ''}`}>{user.login}</Link>
              <button className="btn btn--logout" onClick={handleLogout}>Logout</button>
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
