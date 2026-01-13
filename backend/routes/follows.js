const express = require('express');
const db = require('../config/database');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get all users the current user follows with their recent posts
router.get('/', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const { expanded } = req.query;

    // Get all followed users
    const followedUsers = db.prepare(`
      SELECT u.id, u.username, u.created_at as user_since,
             f.created_at as followed_at,
             (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as post_count,
             (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as follower_count
      FROM follows f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = ?
      ORDER BY f.created_at DESC
    `).all(userId);

    // Get recent posts from followed users
    const postsLimit = expanded === 'true' ? 20 : 6;
    const recentPosts = db.prepare(`
      SELECT p.*, u.username, c.name as category_name, c.slug as category_slug, c.icon as category_icon,
             COUNT(DISTINCT r.id) as reply_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN replies r ON p.id = r.post_id
      WHERE p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ?
    `).all(userId, postsLimit);

    // Check upvotes and bookmarks for posts
    const userUpvotes = db.prepare('SELECT post_id FROM post_upvotes WHERE user_id = ?').all(userId);
    const userBookmarks = db.prepare('SELECT post_id FROM bookmarks WHERE user_id = ?').all(userId);

    const upvotedPosts = new Set(userUpvotes.map(u => u.post_id));
    const bookmarkedPosts = new Set(userBookmarks.map(b => b.post_id));

    recentPosts.forEach(post => {
      post.hasUpvoted = upvotedPosts.has(post.id);
      post.isBookmarked = bookmarkedPosts.has(post.id);
      post.isFollowing = true; // All these posts are from followed users
    });

    res.json({
      following: followedUsers,
      recentPosts,
      totalFollowing: followedUsers.length
    });
  } catch (error) {
    console.error('Error fetching followed users:', error);
    res.status(500).json({ error: 'Failed to fetch followed users' });
  }
});

// Get posts from a specific followed user
router.get('/user/:userId/posts', requireAuth, (req, res) => {
  try {
    const currentUserId = req.user.id;
    const targetUserId = req.params.userId;
    const { limit = 10, offset = 0 } = req.query;

    // Check if user exists
    const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(targetUserId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get posts from the user
    const posts = db.prepare(`
      SELECT p.*, u.username, c.name as category_name, c.slug as category_slug, c.icon as category_icon,
             COUNT(DISTINCT r.id) as reply_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN replies r ON p.id = r.post_id
      WHERE p.user_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(targetUserId, parseInt(limit), parseInt(offset));

    // Get total count
    const totalResult = db.prepare('SELECT COUNT(*) as total FROM posts WHERE user_id = ?').get(targetUserId);

    // Check upvotes and bookmarks
    const userUpvotes = db.prepare('SELECT post_id FROM post_upvotes WHERE user_id = ?').all(currentUserId);
    const userBookmarks = db.prepare('SELECT post_id FROM bookmarks WHERE user_id = ?').all(currentUserId);

    const upvotedPosts = new Set(userUpvotes.map(u => u.post_id));
    const bookmarkedPosts = new Set(userBookmarks.map(b => b.post_id));

    // Check if following
    const isFollowing = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?')
      .get(currentUserId, targetUserId);

    posts.forEach(post => {
      post.hasUpvoted = upvotedPosts.has(post.id);
      post.isBookmarked = bookmarkedPosts.has(post.id);
      post.isFollowing = !!isFollowing;
    });

    res.json({
      user: { ...user, isFollowing: !!isFollowing },
      posts,
      total: totalResult.total
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ error: 'Failed to fetch user posts' });
  }
});

// Follow or unfollow a user
router.post('/:userId', requireAuth, (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = parseInt(req.params.userId);

    // Can't follow yourself
    if (followerId === followingId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    // Check if user exists
    const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(followingId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already following
    const existingFollow = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?')
      .get(followerId, followingId);

    if (existingFollow) {
      // Unfollow
      db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?')
        .run(followerId, followingId);

      const followerCount = db.prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?')
        .get(followingId);

      res.json({
        isFollowing: false,
        followerCount: followerCount.count,
        message: `Unfollowed @${user.username}`
      });
    } else {
      // Follow
      db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)')
        .run(followerId, followingId);

      const followerCount = db.prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?')
        .get(followingId);

      res.json({
        isFollowing: true,
        followerCount: followerCount.count,
        message: `Now following @${user.username}`
      });
    }
  } catch (error) {
    console.error('Error toggling follow:', error);
    res.status(500).json({ error: 'Failed to update follow status' });
  }
});

// Check if following a specific user
router.get('/check/:userId', requireAuth, (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = req.params.userId;

    const follow = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?')
      .get(followerId, followingId);

    const followerCount = db.prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?')
      .get(followingId);

    res.json({
      isFollowing: !!follow,
      followerCount: followerCount.count
    });
  } catch (error) {
    console.error('Error checking follow status:', error);
    res.status(500).json({ error: 'Failed to check follow status' });
  }
});

module.exports = router;
