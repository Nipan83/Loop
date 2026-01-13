const express = require('express');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Create a reply
router.post('/', requireAuth, (req, res) => {
  try {
    const { content, post_id, parent_reply_id } = req.body;

    if (!content || !post_id) {
      return res.status(400).json({ error: 'Content and post_id are required' });
    }

    if (content.length < 2) {
      return res.status(400).json({ error: 'Reply must be at least 2 characters' });
    }

    // Check if post exists
    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(post_id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // If parent_reply_id provided, verify it exists and belongs to the same post
    if (parent_reply_id) {
      const parentReply = db.prepare('SELECT id, post_id FROM replies WHERE id = ?').get(parent_reply_id);
      if (!parentReply) {
        return res.status(404).json({ error: 'Parent reply not found' });
      }
      if (parentReply.post_id !== post_id) {
        return res.status(400).json({ error: 'Parent reply does not belong to this post' });
      }
    }

    const result = db.prepare(`
      INSERT INTO replies (content, user_id, post_id, parent_reply_id)
      VALUES (?, ?, ?, ?)
    `).run(content, req.user.id, post_id, parent_reply_id || null);

    const newReply = db.prepare(`
      SELECT r.*, u.username
      FROM replies r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `).get(result.lastInsertRowid);

    newReply.children = [];

    res.status(201).json(newReply);
  } catch (error) {
    console.error('Error creating reply:', error);
    res.status(500).json({ error: 'Failed to create reply' });
  }
});

// Upvote/remove upvote from reply
router.post('/:id/upvote', requireAuth, (req, res) => {
  try {
    const replyId = req.params.id;
    const userId = req.user.id;

    // Check if reply exists
    const reply = db.prepare('SELECT id, upvotes FROM replies WHERE id = ?').get(replyId);
    if (!reply) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    // Check if already upvoted
    const existingUpvote = db.prepare('SELECT id FROM reply_upvotes WHERE user_id = ? AND reply_id = ?').get(userId, replyId);

    if (existingUpvote) {
      // Remove upvote
      db.prepare('DELETE FROM reply_upvotes WHERE user_id = ? AND reply_id = ?').run(userId, replyId);
      db.prepare('UPDATE replies SET upvotes = upvotes - 1 WHERE id = ?').run(replyId);
      
      const updatedReply = db.prepare('SELECT upvotes FROM replies WHERE id = ?').get(replyId);
      res.json({ upvotes: updatedReply.upvotes, hasUpvoted: false });
    } else {
      // Add upvote
      db.prepare('INSERT INTO reply_upvotes (user_id, reply_id) VALUES (?, ?)').run(userId, replyId);
      db.prepare('UPDATE replies SET upvotes = upvotes + 1 WHERE id = ?').run(replyId);
      
      const updatedReply = db.prepare('SELECT upvotes FROM replies WHERE id = ?').get(replyId);
      res.json({ upvotes: updatedReply.upvotes, hasUpvoted: true });
    }
  } catch (error) {
    console.error('Error upvoting reply:', error);
    res.status(500).json({ error: 'Failed to upvote reply' });
  }
});

module.exports = router;