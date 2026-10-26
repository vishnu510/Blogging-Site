const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { broadcast } = require('../sse');

// POST /api/comments/:postId - Public: submit comment on a post
router.post('/:postId', (req, res) => {
  try {
    const { postId } = req.params;
    const { author_name, author_email, content } = req.body;

    if (!author_name || !author_name.trim()) {
      return res.status(400).json({ error: 'Name is required.' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment message is required.' });
    }

    const post = db.prepare('SELECT id, title, slug FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const info = db.prepare(`
      INSERT INTO comments (post_id, author_name, author_email, content)
      VALUES (?, ?, ?, ?)
    `).run(postId, author_name.trim(), (author_email || '').trim(), content.trim());

    const newComment = db.prepare('SELECT * FROM comments WHERE id = ?').get(info.lastInsertRowid);

    broadcast('NEW_COMMENT', {
      postId: parseInt(postId, 10),
      comment: newComment,
      postTitle: post.title
    });

    res.status(201).json({ message: 'Comment submitted successfully.', comment: newComment });
  } catch (err) {
    console.error('Comment submission error:', err);
    res.status(500).json({ error: 'Failed to submit comment.' });
  }
});

// GET /api/comments/admin/all - Admin: view all comments
router.get('/admin/all', authMiddleware, (req, res) => {
  try {
    const comments = db.prepare(`
      SELECT 
        c.*,
        p.title as post_title,
        p.slug as post_slug
      FROM comments c
      JOIN posts p ON p.id = c.post_id
      ORDER BY c.created_at DESC
      LIMIT 100
    `).all();

    res.json(comments);
  } catch (err) {
    console.error('Comments admin error:', err);
    res.status(500).json({ error: 'Failed to retrieve comments.' });
  }
});

// DELETE /api/comments/:id - Admin: delete a comment
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    db.prepare('DELETE FROM comments WHERE id = ?').run(id);

    broadcast('COMMENT_DELETED', { id: parseInt(id, 10), postId: comment.post_id });

    res.json({ message: 'Comment deleted successfully.' });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: 'Failed to delete comment.' });
  }
});

module.exports = router;
