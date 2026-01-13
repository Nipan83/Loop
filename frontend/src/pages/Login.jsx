import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

export default function Login() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in
  if (user) {
    navigate('/')
    return null
  }

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.email || !formData.password) {
      setError('All fields are required')
      return
    }

    setLoading(true)
    try {
      await login(formData.email, formData.password)
      navigate('/')
    } catch (error) {
      setError(error.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">
            <svg viewBox="0 0 100 100" width="48" height="48">
              <circle cx="50" cy="50" r="45" fill="none" stroke="var(--primary)" strokeWidth="8"/>
              <circle cx="50" cy="50" r="25" fill="none" stroke="var(--primary-light)" strokeWidth="6"/>
              <circle cx="50" cy="50" r="8" fill="var(--primary)"/>
            </svg>
          </div>
          <h1>Welcome back</h1>
          <p>Login to join the discussion</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Don't have an account? <Link to="/signup">Sign up</Link></p>
        </div>

        <div className="demo-accounts">
          <p className="demo-title">Demo accounts (password: password123)</p>
          <div className="demo-list">
            <span>traveler_jane@example.com</span>
            <span>techguru@example.com</span>
            <span>moviebuff@example.com</span>
          </div>
        </div>
      </div>
    </div>
  )
}