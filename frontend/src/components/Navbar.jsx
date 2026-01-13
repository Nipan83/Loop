import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <div className="brand-icon">
            <svg viewBox="0 0 100 100" width="32" height="32">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8"/>
              <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="6" opacity="0.6"/>
              <circle cx="50" cy="50" r="8" fill="currentColor"/>
            </svg>
          </div>
          <span className="brand-name">Loop</span>
        </Link>

        <div className="navbar-actions">
          {user ? (
            <>
              <Link to="/create" className="btn btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Create Post
              </Link>
              <Link to="/bookmarks" className="btn btn-ghost">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
                Bookmarks
              </Link>
              <div className="user-menu">
                <span className="username">{user.username}</span>
                <button onClick={handleLogout} className="btn btn-ghost btn-sm">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}