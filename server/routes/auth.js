const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username/email and password are required.' });
  }

  const admin = db.prepare('SELECT * FROM admins WHERE username = ? OR email = ?').get(username, username);
  if (!admin) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const match = bcrypt.compareSync(password, admin.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const token = jwt.sign(
    { id: admin.id, username: admin.username, email: admin.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: admin.id,
      username: admin.username,
      email: admin.email
    }
  });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const admin = db.prepare('SELECT id, username, email, created_at FROM admins WHERE id = ?').get(req.user.id);
  if (!admin) {
    return res.status(404).json({ error: 'User not found.' });
  }
  res.json({ user: admin });
});

// PUT /api/auth/password
router.put('/password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.user.id);
  if (!admin || !bcrypt.compareSync(currentPassword, admin.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);

  res.json({ message: 'Password updated successfully.' });
});

module.exports = router;
