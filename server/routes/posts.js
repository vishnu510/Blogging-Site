const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { broadcast } = require('../sse');

// Helper to make clean slug
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Calculate estimated reading time
function calculateReadingTime(htmlOrText) {
  if (!htmlOrText) return 1;
  const clean = htmlOrText.replace(/<[^>]+>/g, ' ').trim();
  const wordCount = clean.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

// Auto generate excerpt if not provided
function generateExcerpt(htmlOrText, length = 160) {
  if (!htmlOrText) return '';
  const clean = htmlOrText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length <= length) return clean;
  return clean.substring(0, length).trim() + '...';
}

// GET /api/posts - Public: feed with filtering, search, sorting & pagination
router.get('/', (req, res) => {
  try {
    const { category, search, sort = 'latest', featured, page = 1, limit = 9 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 9));
    const offset = (pageNum - 1) * limitNum;

    let whereClauses = ["p.status = 'published'"];
    let params = [];

    if (category) {
      whereClauses.push('c.slug = ?');
      params.push(category);
    }

    if (search && search.trim()) {
      whereClauses.push('(p.title LIKE ? OR p.excerpt LIKE ? OR p.content LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (featured === 'true' || featured === '1') {
      whereClauses.push('p.featured = 1');
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let orderSql = 'ORDER BY p.created_at DESC';
    if (sort === 'popular') {
      orderSql = 'ORDER BY p.views DESC, p.created_at DESC';
    } else if (sort === 'oldest') {
      orderSql = 'ORDER BY p.created_at ASC';
    } else if (sort === 'likes') {
      orderSql = 'ORDER BY p.likes DESC, p.created_at DESC';
    }

    // Get total count for pagination
    const countRow = db.prepare(`
      SELECT COUNT(p.id) as total
      FROM posts p
      LEFT JOIN categories c ON c.id = p.category_id
      ${whereSql}
    `).get(...params);

    const totalPosts = countRow ? countRow.total : 0;
    const totalPages = Math.ceil(totalPosts / limitNum);

    // Get posts list
    const posts = db.prepare(`
      SELECT 
        p.id, 
        p.title, 
        p.slug, 
        p.excerpt, 
        p.cover_image, 
        p.author_name, 
        p.status, 
        p.featured, 
        p.views, 
        p.likes, 
        p.read_time, 
        p.created_at, 
        p.updated_at,
        c.id as category_id,
        c.name as category_name,
        c.slug as category_slug,
        c.color as category_color,
        (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) as comment_count
      FROM posts p
      LEFT JOIN categories c ON c.id = p.category_id
      ${whereSql}
      ${orderSql}
      LIMIT ? OFFSET ?
    `).all(...params, limitNum, offset);

    res.json({
      posts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPosts,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Failed to fetch posts.' });
  }
});

// GET /api/posts/featured - Quick featured article for Hero section
router.get('/featured', (req, res) => {
  try {
    let post = db.prepare(`
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        c.color as category_color,
        (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) as comment_count
      FROM posts p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.status = 'published' AND p.featured = 1
      ORDER BY p.created_at DESC
      LIMIT 1
    `).get();

    if (!post) {
      // Fallback to latest published
      post = db.prepare(`
        SELECT 
          p.*,
          c.name as category_name,
          c.slug as category_slug,
          c.color as category_color,
          (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) as comment_count
        FROM posts p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.status = 'published'
        ORDER BY p.created_at DESC
        LIMIT 1
      `).get();
    }

    res.json(post || null);
  } catch (err) {
    console.error('Error fetching featured post:', err);
    res.status(500).json({ error: 'Failed to fetch featured post.' });
  }
});

// GET /api/posts/stats - Admin Dashboard statistics
router.get('/stats', authMiddleware, (req, res) => {
  try {
    const totalPosts = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
    const publishedPosts = db.prepare("SELECT COUNT(*) as count FROM posts WHERE status = 'published'").get().count;
    const draftPosts = db.prepare("SELECT COUNT(*) as count FROM posts WHERE status = 'draft'").get().count;
    const totalViews = db.prepare('SELECT SUM(views) as count FROM posts').get().count || 0;
    const totalLikes = db.prepare('SELECT SUM(likes) as count FROM posts').get().count || 0;
    const categoriesCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
    const commentsCount = db.prepare('SELECT COUNT(*) as count FROM comments').get().count;

    const topPosts = db.prepare(`
      SELECT id, title, slug, views, likes, created_at
      FROM posts
      WHERE status = 'published'
      ORDER BY views DESC
      LIMIT 5
    `).all();

    res.json({
      totalPosts,
      publishedPosts,
      draftPosts,
      totalViews,
      totalLikes,
      categoriesCount,
      commentsCount,
      topPosts
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to retrieve stats.' });
  }
});

// GET /api/posts/admin/all - Admin: get all posts with full details
router.get('/admin/all', authMiddleware, (req, res) => {
  try {
    const posts = db.prepare(`
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        c.color as category_color,
        (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) as comment_count
      FROM posts p
      LEFT JOIN categories c ON c.id = p.category_id
      ORDER BY p.created_at DESC
    `).all();

    res.json(posts);
  } catch (err) {
    console.error('Admin all posts error:', err);
    res.status(500).json({ error: 'Failed to fetch admin posts.' });
  }
});

// GET /api/posts/id/:id - Admin: get single post by id for editing
router.get('/id/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const post = db.prepare(`
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug
      FROM posts p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ?
    `).get(id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    res.json(post);
  } catch (err) {
    console.error('Fetch post by id error:', err);
    res.status(500).json({ error: 'Failed to fetch post.' });
  }
});

// GET /api/posts/:slug - Public: get single post by slug, increment views, get comments & related
router.get('/:slug', (req, res) => {
  try {
    const { slug } = req.params;

    const post = db.prepare(`
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        c.color as category_color
      FROM posts p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.slug = ?
    `).get(slug);

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    // Increment views asynchronously
    db.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').run(post.id);
    post.views += 1;

    // Fetch approved comments
    const comments = db.prepare(`
      SELECT id, author_name, content, created_at
      FROM comments
      WHERE post_id = ? AND status = 'approved'
      ORDER BY created_at DESC
    `).all(post.id);

    // Fetch up to 3 related posts in same category
    const relatedPosts = db.prepare(`
      SELECT 
        id, title, slug, excerpt, cover_image, read_time, created_at
      FROM posts
      WHERE category_id = ? AND id != ? AND status = 'published'
      ORDER BY created_at DESC
      LIMIT 3
    `).all(post.category_id || 0, post.id);

    res.json({
      post,
      comments,
      relatedPosts
    });
  } catch (err) {
    console.error('Fetch post by slug error:', err);
    res.status(500).json({ error: 'Failed to fetch post.' });
  }
});

// POST /api/posts - Admin: Create new blog post
router.post('/', authMiddleware, (req, res) => {
  try {
    let {
      title,
      slug,
      excerpt,
      content,
      cover_image,
      category_id,
      status = 'published',
      featured = 0,
      author_name = 'Admin'
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required.' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Blog content is required.' });
    }

    title = title.trim();
    slug = slug ? slugify(slug) : slugify(title);

    // Ensure slug uniqueness
    let finalSlug = slug;
    let counter = 1;
    while (db.prepare('SELECT id FROM posts WHERE slug = ?').get(finalSlug)) {
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    const calculatedReadTime = calculateReadingTime(content);
    const calculatedExcerpt = excerpt && excerpt.trim() ? excerpt.trim() : generateExcerpt(content);

    const info = db.prepare(`
      INSERT INTO posts (
        title, slug, excerpt, content, cover_image, 
        category_id, author_name, status, featured, 
        views, likes, read_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
    `).run(
      title,
      finalSlug,
      calculatedExcerpt,
      content,
      cover_image || '',
      category_id || null,
      author_name || 'Admin',
      status,
      featured ? 1 : 0,
      calculatedReadTime
    );

    const newPost = db.prepare(`
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        c.color as category_color
      FROM posts p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ?
    `).get(info.lastInsertRowid);

    // Real-time broadcast to user & admin views!
    broadcast('POST_CREATED', newPost);

    res.status(201).json({ message: 'Post created successfully.', post: newPost });
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Failed to create post.' });
  }
});

// PUT /api/posts/:id - Admin: Update existing blog post
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    let {
      title,
      slug,
      excerpt,
      content,
      cover_image,
      category_id,
      status,
      featured,
      author_name
    } = req.body;

    title = (title || existing.title).trim();
    content = content !== undefined ? content : existing.content;

    let finalSlug = existing.slug;
    if (slug && slug.trim()) {
      finalSlug = slugify(slug);
      // Check conflict
      const conflict = db.prepare('SELECT id FROM posts WHERE slug = ? AND id != ?').get(finalSlug, id);
      if (conflict) {
        return res.status(400).json({ error: 'A post with this slug already exists.' });
      }
    }

    const calculatedReadTime = calculateReadingTime(content);
    const calculatedExcerpt = excerpt !== undefined && excerpt.trim() ? excerpt.trim() : generateExcerpt(content);

    db.prepare(`
      UPDATE posts SET
        title = ?,
        slug = ?,
        excerpt = ?,
        content = ?,
        cover_image = ?,
        category_id = ?,
        author_name = ?,
        status = ?,
        featured = ?,
        read_time = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title,
      finalSlug,
      calculatedExcerpt,
      content,
      cover_image !== undefined ? cover_image : existing.cover_image,
      category_id !== undefined ? (category_id || null) : existing.category_id,
      author_name !== undefined ? author_name : existing.author_name,
      status !== undefined ? status : existing.status,
      featured !== undefined ? (featured ? 1 : 0) : existing.featured,
      calculatedReadTime,
      id
    );

    const updatedPost = db.prepare(`
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        c.color as category_color
      FROM posts p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ?
    `).get(id);

    // Real-time broadcast!
    broadcast('POST_UPDATED', updatedPost);

    res.json({ message: 'Post updated successfully.', post: updatedPost });
  } catch (err) {
    console.error('Error updating post:', err);
    res.status(500).json({ error: 'Failed to update post.' });
  }
});

// DELETE /api/posts/:id - Admin: Delete blog post
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const post = db.prepare('SELECT id, title, slug FROM posts WHERE id = ?').get(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    db.prepare('DELETE FROM posts WHERE id = ?').run(id);

    // Real-time broadcast
    broadcast('POST_DELETED', { id: parseInt(id, 10), slug: post.slug, title: post.title });

    res.json({ message: 'Post deleted successfully.' });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ error: 'Failed to delete post.' });
  }
});

// POST /api/posts/:id/like - Public: Like a post
router.post('/:id/like', (req, res) => {
  try {
    const { id } = req.params;
    const post = db.prepare('SELECT id, likes FROM posts WHERE id = ?').get(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    db.prepare('UPDATE posts SET likes = likes + 1 WHERE id = ?').run(id);
    const newLikes = post.likes + 1;

    broadcast('POST_LIKED', { id: parseInt(id, 10), likes: newLikes });

    res.json({ likes: newLikes });
  } catch (err) {
    console.error('Error liking post:', err);
    res.status(500).json({ error: 'Failed to like post.' });
  }
});

module.exports = router;
