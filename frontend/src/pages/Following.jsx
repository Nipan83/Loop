import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import PostCard from '../components/PostCard'
import { PostListSkeleton } from '../components/SkeletonLoader'
import './Following.css'

export default function Following() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState({ following: [], recentPosts: [], totalFollowing: 0 })
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
    }
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (user) {
      fetchFollowing()
    }
  }, [user, expanded])

  const fetchFollowing = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/follows${expanded ? '?expanded=true' : ''}`)
      setData(response.data)
    } catch (error) {
      console.error('Failed to fetch following:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUnfollow = async (userId, username) => {
    try {
      await api.post(`/follows/${userId}`)
      // Remove from local state
      setData(prev => ({
        ...prev,
        following: prev.following.filter(u => u.id !== userId),
        recentPosts: prev.recentPosts.filter(p => p.user_id !== userId),
        totalFollowing: prev.totalFollowing - 1
      }))
    } catch (error) {
      console.error('Failed to unfollow:', error)
    }
  }

  const handlePostUpdate = useCallback((updatedPost) => {
    setData(prev => ({
      ...prev,
      recentPosts: prev.recentPosts.map(p =>
        p.id === updatedPost.id ? updatedPost : p
      )
    }))
  }, [])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (authLoading) {
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
    <div className="following-page">
      <div className="following-header">
        <h1>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          Following
        </h1>
        <p>Authors you follow and their recent posts</p>
      </div>

      {loading ? (
        <>
          <div className="following-authors-skeleton">
            {[1, 2, 3].map(i => (
              <div key={i} className="author-card-skeleton">
                <div className="skeleton-avatar skeleton-pulse"></div>
                <div className="skeleton-info">
                  <div className="skeleton-name skeleton-pulse"></div>
                  <div className="skeleton-stats skeleton-pulse"></div>
                </div>
              </div>
            ))}
          </div>
          <PostListSkeleton count={3} />
        </>
      ) : data.totalFollowing === 0 ? (
        <div className="empty-following">
          <div className="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <h3>Not following anyone yet</h3>
          <p>When you follow authors, their posts will appear here. Discover interesting authors by browsing posts!</p>
          <Link to="/" className="btn btn-primary">Explore Posts</Link>
        </div>
      ) : (
        <>
          {/* Authors Section */}
          <div className="following-authors-section">
            <div className="section-title-row">
              <h2>Authors You Follow</h2>
              <span className="author-count">{data.totalFollowing} following</span>
            </div>
            <div className="authors-grid">
              {data.following.map(author => (
                <div key={author.id} className="author-card">
                  <div className="author-avatar-large">
                    {author.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="author-details">
                    <span className="author-username">@{author.username}</span>
                    <div className="author-stats">
                      <span>{author.post_count} posts</span>
                      <span>•</span>
                      <span>{author.follower_count} followers</span>
                    </div>
                    <span className="author-since">Following since {formatDate(author.followed_at)}</span>
                  </div>
                  <button
                    className="unfollow-btn"
                    onClick={() => handleUnfollow(author.id, author.username)}
                    title={`Unfollow @${author.username}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="8.5" cy="7" r="4"></circle>
                      <line x1="18" y1="8" x2="23" y2="13"></line>
                      <line x1="23" y1="8" x2="18" y2="13"></line>
                    </svg>
                    Unfollow
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Posts Section */}
          <div className="following-posts-section">
            <div className="section-title-row">
              <h2>Recent Posts</h2>
              {data.recentPosts.length >= 6 && !expanded && (
                <button className="expand-btn" onClick={() => setExpanded(true)}>
                  View More
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
              )}
            </div>

            {data.recentPosts.length === 0 ? (
              <div className="no-posts-message">
                <p>No recent posts from authors you follow.</p>
              </div>
            ) : (
              <div className="following-posts-list">
                {data.recentPosts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onUpdate={handlePostUpdate}
                    showFollowBadge
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
