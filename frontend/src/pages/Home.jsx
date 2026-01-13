import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import PostCard from '../components/PostCard'
import './Home.css'

export default function Home() {
  const [topPosts, setTopPosts] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const response = await api.get('/posts/top')
      setTopPosts(response.data)
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePostUpdate = useCallback((categorySlug, updatedPost) => {
    setTopPosts(prev => ({
      ...prev,
      [categorySlug]: {
        ...prev[categorySlug],
        posts: prev[categorySlug].posts.map(p => 
          p.id === updatedPost.id ? updatedPost : p
        )
      }
    }))
  }, [])

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>Loading discussions...</span>
      </div>
    )
  }

  return (
    <div className="home">
      <div className="home-hero">
        <div className="hero-content">
          <div className="hero-badge">🔥 Community Powered</div>
          <h1>Where curious minds<br /><span className="gradient-text">connect & grow</span></h1>
          <p>Join the conversation. Ask questions, share ideas, and discover insights from a community that cares.</p>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">{Object.values(topPosts).reduce((acc, cat) => acc + cat.posts.length, 0)}+</span>
              <span className="stat-label">Discussions</span>
            </div>
            <div className="stat">
              <span className="stat-number">{Object.keys(topPosts).length}</span>
              <span className="stat-label">Categories</span>
            </div>
            <div className="stat">
              <span className="stat-number">∞</span>
              <span className="stat-label">Possibilities</span>
            </div>
          </div>
        </div>
      </div>

      <div className="category-sections">
        {Object.entries(topPosts).map(([slug, data]) => (
          data.posts.length > 0 && (
            <section key={slug} className="category-section">
              <div className="section-header">
                <h2 className="section-title">
                  <span className="section-icon">{data.category.icon}</span>
                  {data.category.name}
                </h2>
                <Link to={`/category/${slug}`} className="see-all-link">
                  See all
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
              </div>
              <div className="posts-grid">
                {data.posts.map(post => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    onUpdate={(updated) => handlePostUpdate(slug, updated)}
                  />
                ))}
              </div>
            </section>
          )
        ))}
      </div>
    </div>
  )
}