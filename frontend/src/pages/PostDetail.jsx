import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import ReplyItem from "../components/ReplyItem";
import "./PostDetail.css";

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("upvotes");
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [id, sort]);

  const fetchPost = async () => {
    try {
      const response = await api.get(`/posts/${id}?sort=${sort}`);
      setPost(response.data);
    } catch (error) {
      console.error("Failed to fetch post:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleUpvote = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const response = await api.post(`/posts/${post.id}/upvote`);
      setPost((prev) => ({
        ...prev,
        upvotes: response.data.upvotes,
        hasUpvoted: response.data.hasUpvoted,
      }));
    } catch (error) {
      console.error("Failed to upvote:", error);
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const response = await api.post(`/bookmarks/${post.id}`);
      setPost((prev) => ({
        ...prev,
        isBookmarked: response.data.isBookmarked,
      }));
    } catch (error) {
      console.error("Failed to bookmark:", error);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    // Can't follow yourself
    if (user.id === post.user_id) {
      return;
    }

    try {
      const response = await api.post(`/follows/${post.user_id}`);
      setPost((prev) => ({
        ...prev,
        isFollowing: response.data.isFollowing,
      }));
    } catch (error) {
      console.error("Failed to follow:", error);
    }
  };

  const handleSubmitReply = async (e) => {
    e.preventDefault();

    if (!user) {
      navigate("/login");
      return;
    }

    if (!replyContent.trim()) return;

    setSubmitting(true);
    try {
      const response = await api.post("/replies", {
        content: replyContent,
        post_id: post.id,
      });

      setPost((prev) => ({
        ...prev,
        replies: [...prev.replies, response.data],
      }));
      setReplyContent("");
    } catch (error) {
      console.error("Failed to submit reply:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplyAdded = (newReply, parentId) => {
    const addReplyToTree = (replies) => {
      return replies.map((reply) => {
        if (reply.id === parentId) {
          return {
            ...reply,
            children: [...(reply.children || []), newReply],
          };
        }
        if (reply.children && reply.children.length > 0) {
          return {
            ...reply,
            children: addReplyToTree(reply.children),
          };
        }
        return reply;
      });
    };

    setPost((prev) => ({
      ...prev,
      replies: addReplyToTree(prev.replies),
    }));
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="not-found">
        <h2>Post not found</h2>
        <Link to="/" className="btn btn-primary">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="post-detail">
      <Link to={`/category/${post.category_slug}`} className="back-link">
        ← Back to {post.category_name}
      </Link>

      <article className="post-article">
        <div className="post-detail-header">
          <span className="post-detail-category">
            {post.category_icon} {post.category_name}
          </span>
          <div className="post-detail-meta">
            <div className="post-author-info">
              <span className="post-detail-author">@{post.username}</span>
              {user && user.id !== post.user_id && (
                <button
                  className={`follow-author-btn ${post.isFollowing ? "following" : ""}`}
                  onClick={handleFollow}
                >
                  {post.isFollowing ? (
                    <>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Following
                    </>
                  ) : (
                    <>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      Follow
                    </>
                  )}
                </button>
              )}
            </div>
            <span className="post-detail-time">
              {formatDate(post.created_at)}
            </span>
          </div>
        </div>

        <h1 className="post-detail-title">{post.title}</h1>
        <div className="post-detail-content">{post.content}</div>

        <div className="post-detail-actions">
          <button
            className={`action-btn ${post.hasUpvoted ? "active" : ""}`}
            onClick={handleUpvote}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={post.hasUpvoted ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
            <span>{post.upvotes} upvotes</span>
          </button>

          <button
            className={`action-btn ${post.isBookmarked ? "active bookmarked" : ""}`}
            onClick={handleBookmark}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={post.isBookmarked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>{post.isBookmarked ? "Bookmarked" : "Bookmark"}</span>
          </button>
        </div>
      </article>

      <section className="replies-section">
        <div className="replies-header">
          <h2>Replies ({post.replies.length})</h2>
          <div className="sort-options">
            <button
              className={`sort-btn ${sort === "upvotes" ? "active" : ""}`}
              onClick={() => setSort("upvotes")}
            >
              Top
            </button>
            <button
              className={`sort-btn ${sort === "newest" ? "active" : ""}`}
              onClick={() => setSort("newest")}
            >
              Newest
            </button>
          </div>
        </div>

        {user ? (
          <form onSubmit={handleSubmitReply} className="reply-form">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Share your thoughts..."
              rows={3}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !replyContent.trim()}
            >
              {submitting ? "Posting..." : "Post Reply"}
            </button>
          </form>
        ) : (
          <div className="login-prompt">
            <p>
              <Link to="/login">Login</Link> to join the discussion
            </p>
          </div>
        )}

        <div className="replies-list">
          {post.replies.length === 0 ? (
            <p className="no-replies">
              No replies yet. Be the first to respond!
            </p>
          ) : (
            post.replies.map((reply) => (
              <ReplyItem
                key={reply.id}
                reply={reply}
                postId={post.id}
                onReplyAdded={handleReplyAdded}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
