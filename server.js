const express = require('express');
const path = require('path');
const cors = require('cors');
const { sseHandler } = require('./server/sse');
const { seedInitialData } = require('./server/seed');

// Routes
const authRoutes = require('./server/routes/auth');
const settingsRoutes = require('./server/routes/settings');
const categoriesRoutes = require('./server/routes/categories');
const postsRoutes = require('./server/routes/posts');
const commentsRoutes = require('./server/routes/comments');
const uploadRoutes = require('./server/routes/upload');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and body parsing
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static files
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// SSE Endpoint for real-time synchronization between User and Admin
app.get('/api/events', sseHandler);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Clean frontend route fallbacks
app.get('/post/:slug', (req, res) => {
  res.sendFile(path.join(publicDir, 'post.html'));
});

app.get('/category/:slug', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(publicDir, 'login.html'));
});

app.get(/^\/admin(\/.*)?$/, (req, res) => {
  res.sendFile(path.join(publicDir, 'admin.html'));
});

// Fallback to index.html for client-side navigation
app.use((req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Seed data
seedInitialData();

// Start server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Modern Blogging Platform Server running!`);
  console.log(`🌐 Public User View:  http://localhost:${PORT}`);
  console.log(`⚡ Admin Dashboard:   http://localhost:${PORT}/admin`);
  console.log(`🔐 Admin Login:       http://localhost:${PORT}/admin/login`);
  console.log(`   Default credentials: username: admin / password: admin123`);
  console.log(`=======================================================`);
});
