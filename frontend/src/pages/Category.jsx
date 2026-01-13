import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import PostCard from '../components/PostCard'
import './Category.css'

export default function Category() {
  const { slug } = useParams()
  const { categories } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('upvotes')

  // Get category info from context
  const category = categories.find(c => c.slug === slug)

  useEffect(() => {
    fetchPosts()
  }, [slug, sort])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/posts?category=${slug}&sort=${sort}`)
      setPosts(response.data)
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePostUpdate = useCallback((updatedPost) => {
    setPosts(prev => prev.map(p => 
      p.id === updatedPost.id ? updatedPost : p
    ))
  }, [])

  return (
    <div className="category-page">
      {category && (
        <div className="category-header">
          <div className="category-header-bg"></div>
          <div className="category-header-content">
            <span className="category-icon-large">{category.icon}</span>
            <div className="category-info">
              <h1>{category.name}</h1>
              <p>{category.description}</p>
              <span className="category-post-count">{category.post_count} discussions</span>
            </div>
          </div>
        </div>
      )}

      <div className="category-controls">
        <div className="results-count">
          {!loading && `${posts.length} posts`}
        </div>
        <div className="sort-options">
          <span className="sort-label">Sort:</span>
          <button 
            className={`sort-btn ${sort === 'upvotes' ? 'active' : ''}`}
            onClick={() => setSort('upvotes')}
          >
            🔥 Top
          </button>
          <button 
            className={`sort-btn ${sort === 'newest' ? 'active' : ''}`}
            onClick={() => setSort('newest')}
          >
            ✨ New
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <span>Loading posts...</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No posts yet</h3>
          <p>Be the first to start a discussion in {category?.name}!</p>
        </div>
      ) : (
        <div className="posts-list">
          {posts.map(post => (
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