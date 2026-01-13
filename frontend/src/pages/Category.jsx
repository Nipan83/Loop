import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import PostCard from "../components/PostCard";
import { PostListSkeleton, LoadingMore } from "../components/SkeletonLoader";
import "./Category.css";

const POSTS_PER_PAGE = 10;

export default function Category() {
  const { slug } = useParams();
  const { categories } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [sort, setSort] = useState("upvotes");
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  // Get category info from context
  const category = categories.find((c) => c.slug === slug);

  // Reset state when category or sort changes
  useEffect(() => {
    setPosts([]);
    setHasMore(true);
    setLoading(true);
    fetchPosts(0, true);
  }, [slug, sort]);

  const fetchPosts = async (offset = 0, isInitial = false) => {
    try {
      if (!isInitial) {
        setLoadingMore(true);
      }

      const response = await api.get(
        `/posts?category=${slug}&sort=${sort}&limit=${POSTS_PER_PAGE}&offset=${offset}`,
      );

      const newPosts = response.data.posts || response.data;
      const total = response.data.total || newPosts.length;

      if (isInitial) {
        setPosts(newPosts);
        setTotalCount(total);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }

      // Check if there are more posts to load
      setHasMore(
        newPosts.length === POSTS_PER_PAGE && offset + newPosts.length < total,
      );
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Infinite scroll observer
  useEffect(() => {
    if (loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchPosts(posts.length, false);
        }
      },
      { threshold: 0.1, rootMargin: "100px" },
    );

    observerRef.current = observer;

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, hasMore, loadingMore, posts.length, slug, sort]);

  const handlePostUpdate = useCallback((updatedPost) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)),
    );
  }, []);

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
              <span className="category-post-count">
                {totalCount || category.post_count} discussions
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="category-controls">
        <div className="results-count">
          {!loading &&
            `Showing ${posts.length}${totalCount ? ` of ${totalCount}` : ""} posts`}
        </div>
        <div className="sort-options">
          <span className="sort-label">Sort:</span>
          <button
            className={`sort-btn ${sort === "upvotes" ? "active" : ""}`}
            onClick={() => setSort("upvotes")}
          >
            🔥 Top
          </button>
          <button
            className={`sort-btn ${sort === "newest" ? "active" : ""}`}
            onClick={() => setSort("newest")}
          >
            ✨ New
          </button>
        </div>
      </div>

      {loading ? (
        <PostListSkeleton count={5} />
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No posts yet</h3>
          <p>Be the first to start a discussion in {category?.name}!</p>
        </div>
      ) : (
        <>
          <div className="posts-list">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onUpdate={handlePostUpdate} />
            ))}
          </div>

          {/* Infinite scroll trigger */}
          <div ref={loadMoreRef} className="load-more-trigger">
            {loadingMore && <LoadingMore />}
            {!hasMore && posts.length > 0 && (
              <div className="end-of-list">
                <span>🎉 You've reached the end!</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
