const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Ensure data folder exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'blog.db');
const db = new Database(dbPath);

// Enable WAL mode for high concurrency & speed
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#6366f1',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT NOT NULL,
    cover_image TEXT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    author_name TEXT DEFAULT 'Editorial Staff',
    status TEXT DEFAULT 'published',
    featured INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    read_time INTEGER DEFAULT 3,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    author_email TEXT,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'approved',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
  CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
  CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);
  CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
`);

// Helper to get all settings as key-value object
function getSettings() {
  const rows = db.prepare('SELECT key, value FROM site_settings').all();
  const settings = {};
  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }
  return settings;
}

// Helper to set a setting
function setSetting(key, value) {
  const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
  const stmt = db.prepare(`
    INSERT INTO site_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  stmt.run(key, serialized);
}

// Seed default settings if not exists
const defaultSettings = {
  site_name: 'Nexus Horizon',
  site_tagline: 'Deep dives into engineering, cutting-edge architecture, and creative tech.',
  site_description: 'An open, highly responsive publishing hub built for deep technical guides, thought leadership, and modern design insights.',
  site_domain: 'nexus-horizon.dev',
  hero_title: 'Exploring the frontiers of technology & design.',
  hero_subtitle: 'Curated stories, architectural deep-dives, and insights from industry practitioners.',
  primary_color: '#6366f1',
  secondary_color: '#06b6d4',
  footer_text: '© 2026 Nexus Horizon. Dynamically managed, fully scalable & real-time synchronized.',
  social_twitter: 'https://twitter.com',
  social_github: 'https://github.com',
  social_linkedin: 'https://linkedin.com',
  posts_per_page: 9
};

const existingSettingsCount = db.prepare('SELECT COUNT(*) as count FROM site_settings').get().count;
if (existingSettingsCount === 0) {
  const insertStmt = db.prepare('INSERT INTO site_settings (key, value) VALUES (?, ?)');
  for (const [key, val] of Object.entries(defaultSettings)) {
    insertStmt.run(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
  }
}

// Seed default admin if none exists
const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get().count;
if (adminCount === 0) {
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('admin123', salt);
  db.prepare(`
    INSERT INTO admins (username, email, password_hash)
    VALUES (?, ?, ?)
  `).run('admin', 'admin@example.com', passwordHash);
  console.log('✅ Default admin user created: username="admin", password="admin123"');
}

// Seed categories if none exist
const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
if (categoryCount === 0) {
  const insertCat = db.prepare('INSERT INTO categories (name, slug, description, color) VALUES (?, ?, ?, ?)');
  insertCat.run('Architecture', 'architecture', 'Scalable backends, distributed systems, and cloud computing.', '#6366f1');
  insertCat.run('Engineering', 'engineering', 'Deep dives into modern languages, runtimes, and performance.', '#10b981');
  insertCat.run('Design Systems', 'design-systems', 'Crafting accessible, consistent, and beautiful digital experiences.', '#ec4899');
  insertCat.run('Artificial Intelligence', 'artificial-intelligence', 'Machine intelligence, agentic workflows, and the future of work.', '#f59e0b');
  console.log('✅ Default categories created');
}

module.exports = {
  db,
  getSettings,
  setSetting
};
