import './SkeletonLoader.css'

export function PostCardSkeleton() {
  return (
    <div className="post-card-skeleton">
      <div className="post-card-skeleton-inner">
        <div className="skeleton-header">
          <div className="skeleton-category skeleton-pulse"></div>
          <div className="skeleton-time skeleton-pulse"></div>
        </div>

        <div className="skeleton-title skeleton-pulse"></div>
        <div className="skeleton-content">
          <div className="skeleton-line skeleton-pulse"></div>
          <div className="skeleton-line skeleton-line-short skeleton-pulse"></div>
        </div>

        <div className="skeleton-footer">
          <div className="skeleton-author">
            <div className="skeleton-avatar skeleton-pulse"></div>
            <div className="skeleton-name skeleton-pulse"></div>
          </div>
          <div className="skeleton-actions">
            <div className="skeleton-action skeleton-pulse"></div>
            <div className="skeleton-action skeleton-pulse"></div>
            <div className="skeleton-action-small skeleton-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CategorySectionSkeleton({ postCount = 3 }) {
  return (
    <section className="category-section-skeleton">
      <div className="skeleton-section-header">
        <div className="skeleton-section-title">
          <div className="skeleton-section-icon skeleton-pulse"></div>
          <div className="skeleton-section-name skeleton-pulse"></div>
        </div>
        <div className="skeleton-see-all skeleton-pulse"></div>
      </div>
      <div className="skeleton-posts-grid">
        {Array(postCount).fill(0).map((_, index) => (
          <PostCardSkeleton key={index} />
        ))}
      </div>
    </section>
  )
}

export function HomeSkeleton({ categoryCount = 4 }) {
  return (
    <div className="home-skeleton">
      {/* Hero skeleton */}
      <div className="hero-skeleton">
        <div className="skeleton-badge skeleton-pulse"></div>
        <div className="skeleton-h1 skeleton-pulse"></div>
        <div className="skeleton-h1-sub skeleton-pulse"></div>
        <div className="skeleton-description skeleton-pulse"></div>
        <div className="skeleton-stats">
          <div className="skeleton-stat">
            <div className="skeleton-stat-number skeleton-pulse"></div>
            <div className="skeleton-stat-label skeleton-pulse"></div>
          </div>
          <div className="skeleton-stat">
            <div className="skeleton-stat-number skeleton-pulse"></div>
            <div className="skeleton-stat-label skeleton-pulse"></div>
          </div>
          <div className="skeleton-stat">
            <div className="skeleton-stat-number skeleton-pulse"></div>
            <div className="skeleton-stat-label skeleton-pulse"></div>
          </div>
        </div>
      </div>

      {/* Category sections skeleton */}
      <div className="skeleton-category-sections">
        {Array(categoryCount).fill(0).map((_, index) => (
          <CategorySectionSkeleton key={index} />
        ))}
      </div>
    </div>
  )
}

export function PostListSkeleton({ count = 5 }) {
  return (
    <div className="post-list-skeleton">
      {Array(count).fill(0).map((_, index) => (
        <PostCardSkeleton key={index} />
      ))}
    </div>
  )
}

export function LoadingMore() {
  return (
    <div className="loading-more">
      <div className="loading-more-spinner"></div>
      <span>Loading more posts...</span>
    </div>
  )
}

export default { HomeSkeleton, CategorySectionSkeleton, PostCardSkeleton, PostListSkeleton, LoadingMore }
