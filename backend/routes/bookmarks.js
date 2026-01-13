const express = require('express');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Get user's bookmarks
router.get('/', requireAuth, (req, res) => {
  try {
    const bookmarks = db.prepare(`
      SELECT p.*, u.username, c.name as category_name, c.slug as category_slug, c.icon as category_icon,
             COUNT(DISTINCT r.id) as reply_count, b.created_at as bookmarked_at
      FROM bookmarks b
      JOIN posts p ON b.post_id = p.id
      JOIN users u ON p.user_id = u.id
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN replies r ON p.id = r.post_id
      WHERE b.user_id = ?
      GROUP BY p.id
      ORDER BY b.created_at DESC
    `).all(req.user.id);

    // Check user's upvotes
    const userUpvotes = db.prepare('SELECT post_id FROM post_upvotes WHERE user_id = ?').all(req.user.id);
    const upvotedPosts = new Set(userUpvotes.map(u => u.post_id));

    bookmarks.forEach(post => {
      post.hasUpvoted = upvotedPosts.has(post.id);
      post.isBookmarked = true;
    });

    res.json(bookmarks);
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

// Toggle bookmark
router.post('/:postId', requireAuth, (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.id;

    // Check if post exists
    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if already bookmarked
    const existingBookmark = db.prepare('SELECT id FROM bookmarks WHERE user_id = ? AND post_id = ?').get(userId, postId);

    if (existingBookmark) {
      // Remove bookmark
      db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND post_id = ?').run(userId, postId);
      res.json({ isBookmarked: false, message: 'Bookmark removed' });
    } else {
      // Add bookmark
      db.prepare('INSERT INTO bookmarks (user_id, post_id) VALUES (?, ?)').run(userId, postId);
      res.json({ isBookmarked: true, message: 'Post bookmarked' });
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    res.status(500).json({ error: 'Failed to toggle bookmark' });
  }
});

module.exports = router;