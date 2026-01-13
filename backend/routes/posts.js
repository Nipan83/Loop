const express = require('express');
const db = require('../config/database');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Keywords for auto-categorization
const categoryKeywords = {
  travel: ['travel', 'trip', 'vacation', 'destination', 'flight', 'hotel', 'backpack', 'tourist', 'visa', 'airport', 'beach', 'mountain', 'adventure', 'explore', 'country', 'city', 'abroad'],
  technology: ['tech', 'programming', 'code', 'software', 'hardware', 'app', 'api', 'developer', 'javascript', 'python', 'react', 'database', 'ai', 'machine learning', 'computer', 'web', 'mobile', 'cloud', 'security', 'crypto', 'blockchain'],
  career: ['job', 'career', 'salary', 'interview', 'resume', 'hire', 'workplace', 'promotion', 'manager', 'remote work', 'freelance', 'negotiate', 'profession', 'employment', 'skills'],
  movie: ['movie', 'film', 'cinema', 'actor', 'director', 'watch', 'netflix', 'streaming', 'series', 'tv show', 'oscar', 'review', 'blockbuster', 'scene', 'plot', 'character'],
  news: ['news', 'politics', 'government', 'election', 'economy', 'market', 'world', 'breaking', 'current events', 'policy', 'law', 'climate', 'crisis']
};

// Auto-categorize post based on content
function autoCategorize(title, content) {
  const text = (title + ' ' + content).toLowerCase();
  const scores = {};

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    scores[category] = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        scores[category]++;
      }
    }
  }

  // Find category with highest score
  let bestCategory = 'general';
  let bestScore = 0;

  for (const [category, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  // Get category ID
  const category = db.prepare('SELECT id FROM categories WHERE slug = ?').get(bestCategory);
  return category ? category.id : db.prepare('SELECT id FROM categories WHERE slug = ?').get('general').id;
}

// Get all posts (with optional category filter)
router.get('/', optionalAuth, (req, res) => {
  try {
    const { category, sort = 'newest', limit = 20, offset = 0 } = req.query;
    
    let query = `
      SELECT p.*, u.username, c.name as category_name, c.slug as category_slug, c.icon as category_icon,
             COUNT(DISTINCT r.id) as reply_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN replies r ON p.id = r.post_id
    `;

    const params = [];

    if (category) {
      query += ' WHERE c.slug = ?';
      params.push(category);
    }

    query += ' GROUP BY p.id';

    if (sort === 'upvotes') {
      query += ' ORDER BY p.upvotes DESC, p.created_at DESC';
    } else {
      query += ' ORDER BY p.created_at DESC';
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const posts = db.prepare(query).all(...params);

    // If user is logged in, check their upvotes and bookmarks
    if (req.user) {
      const userUpvotes = db.prepare('SELECT post_id FROM post_upvotes WHERE user_id = ?').all(req.user.id);
      const userBookmarks = db.prepare('SELECT post_id FROM bookmarks WHERE user_id = ?').all(req.user.id);
      
      const upvotedPosts = new Set(userUpvotes.map(u => u.post_id));
      const bookmarkedPosts = new Set(userBookmarks.map(b => b.post_id));

      posts.forEach(post => {
        post.hasUpvoted = upvotedPosts.has(post.id);
        post.isBookmarked = bookmarkedPosts.has(post.id);
      });
    }

    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get top posts from each category (for landing page)
router.get('/top', optionalAuth, (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories').all();
    const result = {};

    for (const category of categories) {
      const posts = db.prepare(`
        SELECT p.*, u.username, c.name as category_name, c.slug as category_slug, c.icon as category_icon,
               COUNT(DISTINCT r.id) as reply_count
        FROM posts p
        JOIN users u ON p.user_id = u.id
        JOIN categories c ON p.category_id = c.id
        LEFT JOIN replies r ON p.id = r.post_id
        WHERE c.id = ?
        GROUP BY p.id
        ORDER BY p.upvotes DESC, p.created_at DESC
        LIMIT 3
      `).all(category.id);

      // If user is logged in, check their upvotes and bookmarks
      if (req.user) {
        const userUpvotes = db.prepare('SELECT post_id FROM post_upvotes WHERE user_id = ?').all(req.user.id);
        const userBookmarks = db.prepare('SELECT post_id FROM bookmarks WHERE user_id = ?').all(req.user.id);
        
        const upvotedPosts = new Set(userUpvotes.map(u => u.post_id));
        const bookmarkedPosts = new Set(userBookmarks.map(b => b.post_id));

        posts.forEach(post => {
          post.hasUpvoted = upvotedPosts.has(post.id);
          post.isBookmarked = bookmarkedPosts.has(post.id);
        });
      }

      result[category.slug] = {
        category,
        posts
      };
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching top posts:', error);
    res.status(500).json({ error: 'Failed to fetch top posts' });
  }
});

// Get single post with replies
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const post = db.prepare(`
      SELECT p.*, u.username, c.name as category_name, c.slug as category_slug, c.icon as category_icon
      FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Get replies
    const { sort = 'upvotes' } = req.query;
    let orderBy = sort === 'newest' ? 'r.created_at DESC' : 'r.upvotes DESC, r.created_at DESC';

    const replies = db.prepare(`
      SELECT r.*, u.username
      FROM replies r
      JOIN users u ON r.user_id = u.id
      WHERE r.post_id = ?
      ORDER BY ${orderBy}
    `).all(req.params.id);

    // If user is logged in, check their upvotes
    if (req.user) {
      const postUpvote = db.prepare('SELECT id FROM post_upvotes WHERE user_id = ? AND post_id = ?').get(req.user.id, post.id);
      post.hasUpvoted = !!postUpvote;

      const bookmark = db.prepare('SELECT id FROM bookmarks WHERE user_id = ? AND post_id = ?').get(req.user.id, post.id);
      post.isBookmarked = !!bookmark;

      const replyUpvotes = db.prepare('SELECT reply_id FROM reply_upvotes WHERE user_id = ?').all(req.user.id);
      const upvotedReplies = new Set(replyUpvotes.map(u => u.reply_id));

      replies.forEach(reply => {
        reply.hasUpvoted = upvotedReplies.has(reply.id);
      });
    }

    // Build thread structure
    const threadedReplies = buildThreadedReplies(replies);

    res.json({ ...post, replies: threadedReplies });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Helper function to build threaded replies
function buildThreadedReplies(replies) {
  const replyMap = {};
  const topLevel = [];

  // First pass: create a map of all replies
  replies.forEach(reply => {
    replyMap[reply.id] = { ...reply, children: [] };
  });

  // Second pass: build the tree structure
  replies.forEach(reply => {
    if (reply.parent_reply_id) {
      if (replyMap[reply.parent_reply_id]) {
        replyMap[reply.parent_reply_id].children.push(replyMap[reply.id]);
      }
    } else {
      topLevel.push(replyMap[reply.id]);
    }
  });

  return topLevel;
}

// Create new post
router.post('/', requireAuth, (req, res) => {
  try {
    const { title, content, category_id } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    if (title.length < 5) {
      return res.status(400).json({ error: 'Title must be at least 5 characters' });
    }

    if (content.length < 20) {
      return res.status(400).json({ error: 'Content must be at least 20 characters' });
    }

    // Auto-categorize if no category provided
    const finalCategoryId = category_id || autoCategorize(title, content);

    const result = db.prepare(`
      INSERT INTO posts (title, content, user_id, category_id)
      VALUES (?, ?, ?, ?)
    `).run(title, content, req.user.id, finalCategoryId);

    const newPost = db.prepare(`
      SELECT p.*, u.username, c.name as category_name, c.slug as category_slug, c.icon as category_icon
      FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newPost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Upvote/remove upvote from post
router.post('/:id/upvote', requireAuth, (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    // Check if post exists
    const post = db.prepare('SELECT id, upvotes FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if already upvoted
    const existingUpvote = db.prepare('SELECT id FROM post_upvotes WHERE user_id = ? AND post_id = ?').get(userId, postId);

    if (existingUpvote) {
      // Remove upvote
      db.prepare('DELETE FROM post_upvotes WHERE user_id = ? AND post_id = ?').run(userId, postId);
      db.prepare('UPDATE posts SET upvotes = upvotes - 1 WHERE id = ?').run(postId);
      
      const updatedPost = db.prepare('SELECT upvotes FROM posts WHERE id = ?').get(postId);
      res.json({ upvotes: updatedPost.upvotes, hasUpvoted: false });
    } else {
      // Add upvote
      db.prepare('INSERT INTO post_upvotes (user_id, post_id) VALUES (?, ?)').run(userId, postId);
      db.prepare('UPDATE posts SET upvotes = upvotes + 1 WHERE id = ?').run(postId);
      
      const updatedPost = db.prepare('SELECT upvotes FROM posts WHERE id = ?').get(postId);
      res.json({ upvotes: updatedPost.upvotes, hasUpvoted: true });
    }
  } catch (error) {
    console.error('Error upvoting post:', error);
    res.status(500).json({ error: 'Failed to upvote post' });
  }
});

module.exports = router;