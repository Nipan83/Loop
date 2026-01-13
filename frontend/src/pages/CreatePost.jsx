import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./CreatePost.css";

export default function CreatePost() {
  const { user, loading: authLoading, refreshCategories } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category_id: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get("/categories");
      setCategories(response.data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }

    if (formData.title.length < 5) {
      setError("Title must be at least 5 characters");
      return;
    }

    if (!formData.content.trim()) {
      setError("Content is required");
      return;
    }

    if (formData.content.length < 20) {
      setError("Content must be at least 20 characters");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        content: formData.content,
      };

      // Only include category_id if one is selected
      if (formData.category_id) {
        payload.category_id = parseInt(formData.category_id);
      }

      const response = await api.post("/posts", payload);

      // Refresh categories to update post counts
      await refreshCategories();

      navigate(`/post/${response.data.id}`);
    } catch (error) {
      setError(error.message || "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="create-post">
      <div className="create-post-container">
        <h1>Create a New Post</h1>
        <p className="create-subtitle">
          Share your question, idea, or start a discussion
        </p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="What's your question or topic?"
              maxLength={200}
            />
            <span className="char-count">{formData.title.length}/200</span>
          </div>

          <div className="form-group">
            <label htmlFor="content">Content</label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="Provide details, context, or explain your idea..."
              rows={8}
            />
          </div>

          <div className="form-group">
            <label htmlFor="category_id">Category (optional)</label>
            <select
              id="category_id"
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
            >
              <option value="">Auto-detect category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
            <span className="help-text">
              Leave blank to automatically categorize based on your content
            </span>
          </div>

          <div className="form-actions">
            <Link to="/" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? "Creating..." : "Create Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
