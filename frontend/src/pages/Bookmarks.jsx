import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import PostCard from '../components/PostCard'
import './Bookmarks.css'

export default function Bookmarks() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [bookmarks, setBookmarks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
    }
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (user) {
      fetchBookmarks()
    }
  }, [user])

  const fetchBookmarks = async () => {
    try {
      const response = await api.get('/bookmarks')
      setBookmarks(response.data)
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePostUpdate = (updatedPost) => {
    if (!updatedPost.isBookmarked) {
      // Remove from bookmarks list if unbookmarked
      setBookmarks(prev => prev.filter(p => p.id !== updatedPost.id))
    } else {
      setBookmarks(prev => prev.map(p => 
        p.id === updatedPost.id ? updatedPost : p
      ))
    }
  }

  if (authLoading || loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="bookmarks-page">
      <div className="bookmarks-header">
        <h1>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--warning)" stroke="var(--warning)" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          Your Bookmarks
        </h1>
        <p>{bookmarks.length} saved post{bookmarks.length !== 1 ? 's' : ''}</p>
      </div>

      {bookmarks.length === 0 ? (
        <div className="empty-bookmarks">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          <h3>No bookmarks yet</h3>
          <p>Save posts you want to read later by clicking the bookmark icon</p>
        </div>
      ) : (
        <div className="bookmarks-list">
          {bookmarks.map(post => (
            <PostCard 
              key={post.id} 
              post={post} 
              onUpdate={handlePostUpdate}
            />
          ))}
        </div>
      )}
    </div>
  )
}