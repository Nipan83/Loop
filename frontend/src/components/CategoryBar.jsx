import { memo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './CategoryBar.css'

const CategoryBar = memo(function CategoryBar({ categories }) {
  const location = useLocation()
  const currentPath = location.pathname

  return (
    <nav className="category-bar" role="navigation" aria-label="Categories">
      <Link 
        to="/" 
        className={`category-item ${currentPath === '/' ? 'active' : ''}`}
      >
        <span className="category-icon">✨</span>
        <span className="category-name">Discover</span>
      </Link>
      {categories.map(category => (
        <Link
          key={category.id}
          to={`/category/${category.slug}`}
          className={`category-item ${currentPath === `/category/${category.slug}` ? 'active' : ''}`}
        >
          <span className="category-icon">{category.icon}</span>
          <span className="category-name">{category.name}</span>
          {category.post_count > 0 && (
            <span className="category-count">{category.post_count}</span>
          )}
        </Link>
      ))}
    </nav>
  )
})

export default CategoryBar