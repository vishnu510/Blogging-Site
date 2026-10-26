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
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// GET /api/categories - Public: Get all categories with post count
router.get('/', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT 
        c.id, 
        c.name, 
        c.slug, 
        c.description, 
        c.color, 
        c.created_at,
        COUNT(CASE WHEN p.status = 'published' THEN 1 END) as post_count,
        COUNT(p.id) as total_post_count
      FROM categories c
      LEFT JOIN posts p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all();

    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// POST /api/categories - Admin: Create new category
router.post('/', authMiddleware, (req, res) => {
  try {
    let { name, slug, description, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required.' });
    }

    name = name.trim();
    slug = slug ? slugify(slug) : slugify(name);
    color = color || '#6366f1';
    description = description ? description.trim() : '';

    // Check if slug or name exists
    const existing = db.prepare('SELECT id FROM categories WHERE slug = ? OR name = ?').get(slug, name);
    if (existing) {
      return res.status(400).json({ error: 'A category with this name or slug already exists.' });
    }

    const info = db.prepare(`
      INSERT INTO categories (name, slug, description, color)
      VALUES (?, ?, ?, ?)
    `).run(name, slug, description, color);

    const newCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
    newCategory.post_count = 0;
    newCategory.total_post_count = 0;

    broadcast('CATEGORY_CREATED', newCategory);

    res.status(201).json({ message: 'Category created successfully.', category: newCategory });
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: 'Failed to create category.' });
  }
});

// PUT /api/categories/:id - Admin: Update category
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    let { name, slug, description, color } = req.body;

    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    name = (name || existing.name).trim();
    slug = slug ? slugify(slug) : slugify(name);
    color = color || existing.color;
    description = description !== undefined ? description.trim() : existing.description;

    // Check conflict with other category
    const conflict = db.prepare('SELECT id FROM categories WHERE (slug = ? OR name = ?) AND id != ?').get(slug, name, id);
    if (conflict) {
      return res.status(400).json({ error: 'Another category with this name or slug already exists.' });
    }

    db.prepare(`
      UPDATE categories
      SET name = ?, slug = ?, description = ?, color = ?
      WHERE id = ?
    `).run(name, slug, description, color, id);

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    broadcast('CATEGORY_UPDATED', updated);

    res.json({ message: 'Category updated successfully.', category: updated });
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ error: 'Failed to update category.' });
  }
});

// DELETE /api/categories/:id - Admin: Delete category
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    broadcast('CATEGORY_DELETED', { id: parseInt(id, 10), name: existing.name });

    res.json({ message: 'Category deleted successfully.' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: 'Failed to delete category.' });
  }
});

module.exports = router;
