import { memo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import './PostCard.css'

const PostCard = memo(function PostCard({ post, onUpdate }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const handleUpvote = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!user) {
      navigate('/login')
      return
    }

    try {
      const response = await api.post(`/posts/${post.id}/upvote`)
      if (onUpdate) {
        onUpdate({
          ...post,
          upvotes: response.data.upvotes,
          hasUpvoted: response.data.hasUpvoted
        })
      }
    } catch (error) {
      console.error('Failed to upvote:', error)
    }
  }, [user, post, onUpdate, navigate])

  const handleBookmark = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!user) {
      navigate('/login')
      return
    }

    try {
      const response = await api.post(`/bookmarks/${post.id}`)
      if (onUpdate) {
        onUpdate({
          ...post,
          isBookmarked: response.data.isBookmarked
        })
      }
    } catch (error) {
      console.error('Failed to bookmark:', error)
    }
  }, [user, post, onUpdate, navigate])

  return (
    <Link to={`/post/${post.id}`} className="post-card">
      <div className="post-card-inner">
        <div className="post-header">
          <span className="post-category">
            <span className="category-emoji">{post.category_icon}</span>
            {post.category_name}
          </span>
          <span className="post-time">{formatDate(post.created_at)}</span>
        </div>
        
        <h3 className="post-title">{post.title}</h3>
        <p className="post-content">{post.content}</p>
        
        <div className="post-footer">
          <div className="post-author">
            <div className="author-avatar">
              {post.username.charAt(0).toUpperCase()}
            </div>
            <span className="author-name">@{post.username}</span>
          </div>
          
          <div className="post-actions">
            <button 
              className={`post-action upvote ${post.hasUpvoted ? 'active' : ''}`}
              onClick={handleUpvote}
              aria-label="Upvote"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={post.hasUpvoted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
              <span>{post.upvotes}</span>
            </button>
            
            <div className="post-action replies">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>{post.reply_count || 0}</span>
            </div>
            
            <button 
              className={`post-action bookmark ${post.isBookmarked ? 'active' : ''}`}
              onClick={handleBookmark}
              aria-label="Bookmark"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={post.isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
})

export default PostCard