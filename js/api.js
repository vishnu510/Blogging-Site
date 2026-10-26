/**
 * NEXUS HORIZON - Centralized API, Live Backend & GitHub Pages Standalone Engine
 * Seamlessly connects to live Node.js/SQLite backend, with automatic offline/GitHub Pages
 * standalone database fallback and real-time tab synchronization via BroadcastChannel.
 */

// Route helpers for seamless routing between Express and GitHub Pages
function getPostUrl(slug) {
  if (isStaticHost()) {
    return `post.html?slug=${encodeURIComponent(slug)}`;
  }
  return `/post/${slug}`;
}

function getHomeUrl() {
  if (isStaticHost()) {
    return 'index.html';
  }
  return '/';
}

function getAdminUrl() {
  if (isStaticHost()) {
    return 'admin.html';
  }
  return '/admin';
}

function getLoginUrl() {
  if (isStaticHost()) {
    return 'login.html';
  }
  return '/admin/login';
}

function isStaticHost() {
  return window.location.hostname.includes('github.io') ||
         window.location.protocol === 'file:' ||
         window.location.pathname.endsWith('.html');
}

/**
 * CLIENT-SIDE STANDALONE DATABASE ENGINE (For GitHub Pages & Offline)
 */
const ClientDB = {
  SETTINGS_KEY: 'nexus_settings',
  POSTS_KEY: 'nexus_posts',
  CATEGORIES_KEY: 'nexus_categories',
  COMMENTS_KEY: 'nexus_comments',

  init() {
    if (!localStorage.getItem(this.SETTINGS_KEY)) {
      const defaultSettings = {
        site_name: 'Nexus Horizon',
        site_tagline: 'Deep dives into engineering, cutting-edge architecture, and creative tech.',
        site_description: 'An open, highly responsive publishing hub built for deep technical guides, thought leadership, and modern design insights.',
        site_domain: window.location.hostname,
        hero_title: 'Exploring the frontiers of technology & design.',
        hero_subtitle: 'Curated stories, architectural deep-dives, and insights from industry practitioners.',
        primary_color: '#6366f1',
        secondary_color: '#06b6d4',
        footer_text: '© 2026 Nexus Horizon. Dynamically managed, fully scalable & real-time synchronized.',
        social_twitter: 'https://twitter.com',
        social_github: 'https://github.com',
        social_linkedin: 'https://linkedin.com'
      };
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(defaultSettings));
    }

    if (!localStorage.getItem(this.CATEGORIES_KEY)) {
      const defaultCategories = [
        { id: 1, name: 'Architecture', slug: 'architecture', description: 'Scalable backends, distributed systems, and cloud computing.', color: '#6366f1' },
        { id: 2, name: 'Engineering', slug: 'engineering', description: 'Deep dives into modern languages, runtimes, and performance.', color: '#10b981' },
        { id: 3, name: 'Design Systems', slug: 'design-systems', description: 'Crafting accessible, consistent, and beautiful digital experiences.', color: '#ec4899' },
        { id: 4, name: 'Artificial Intelligence', slug: 'artificial-intelligence', description: 'Machine intelligence, agentic workflows, and the future of work.', color: '#f59e0b' }
      ];
      localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(defaultCategories));
    }

    if (!localStorage.getItem(this.POSTS_KEY)) {
      const defaultPosts = [
        {
          id: 1,
          title: 'Architecting Next-Generation Distributed Systems for Zero-Latency Scale',
          slug: 'architecting-next-generation-distributed-systems',
          excerpt: 'Explore how edge compute, modern relational backends, and decoupled asynchronous event buses achieve sub-millisecond responsiveness across global regions.',
          content: `
            <p class="lead">Building applications that handle massive traffic spikes without sacrificing sub-millisecond response times is one of the definitive engineering challenges of modern computing.</p>
            <h2>1. The Evolution from Monolithic to Globally Distributed</h2>
            <p>In traditional tiered architectures, every request traveled round-trip to a centralized database cluster. Modern applications leverage edge caching and localized read replicas.</p>
            <blockquote>"Latency is the silent killer of user engagement. Every 100ms delay degrades user retention by up to 7%."</blockquote>
            <h3>Key Tenets of Modern Scale:</h3>
            <ul>
              <li><strong>Read/Write Segregation (CQRS):</strong> Decouple heavy analytical reporting from transactional mutations.</li>
              <li><strong>Edge Caching:</strong> Serve static and dynamic assets directly from the network perimeter.</li>
              <li><strong>Asynchronous Event Broadcasting:</strong> Leverage lightweight streaming protocols like Server-Sent Events (SSE) and WebSockets.</li>
            </ul>
          `,
          cover_image: './uploads/cloud-architecture.jpg',
          category_id: 1,
          category_name: 'Architecture',
          category_slug: 'architecture',
          category_color: '#6366f1',
          author_name: 'Elena Rostova',
          status: 'published',
          featured: 1,
          views: 342,
          likes: 48,
          read_time: 5,
          created_at: new Date(Date.now() - 86400000 * 2).toISOString()
        },
        {
          id: 2,
          title: 'Design Systems in 2026: The Convergence of Tokens, Micro-Interactions, and Dark Mode',
          slug: 'design-systems-in-2026-tokens-micro-interactions',
          excerpt: 'How modern UI engineering harmonizes atomic design tokens, glassmorphism, and seamless dark-mode transitions into delightful user experiences.',
          content: `
            <p class="lead">A design system is far more than a UI component kit; it is the shared visual vocabulary of an entire organization.</p>
            <h2>The Power of Dynamic Token Architecture</h2>
            <p>Hardcoding hex colors and arbitrary pixel paddings creates technical debt that slows down product iterations. Modern systems treat design tokens as single sources of truth.</p>
            <h2>Crafting Meaningful Micro-Interactions</h2>
            <p>Micro-interactions provide sensory feedback that reassures users without distraction.</p>
          `,
          cover_image: './uploads/design-systems.jpg',
          category_id: 3,
          category_name: 'Design Systems',
          category_slug: 'design-systems',
          category_color: '#ec4899',
          author_name: 'Marcus Vance',
          status: 'published',
          featured: 1,
          views: 215,
          likes: 39,
          read_time: 4,
          created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: 3,
          title: 'The Rise of Agentic AI Workflows: Beyond Prompt Engineering',
          slug: 'the-rise-of-agentic-ai-workflows',
          excerpt: 'Autonomous loops, tool integration, and continuous reasoning environments are replacing brittle prompt templates in production AI applications.',
          content: `
            <p class="lead">The paradigm of interacting with language models is shifting rapidly from single-turn completions to iterative, agentic problem-solving loops equipped with real tools.</p>
            <h2>From Chatbots to Autonomous Executors</h2>
            <p>Early AI applications treated models like question-answering engines. Today, agentic architectures grant models access to APIs, databases, and browsers.</p>
          `,
          cover_image: './uploads/agentic-ai.jpg',
          category_id: 4,
          category_name: 'Artificial Intelligence',
          category_slug: 'artificial-intelligence',
          category_color: '#f59e0b',
          author_name: 'Dr. Sophia Chen',
          status: 'published',
          featured: 0,
          views: 189,
          likes: 27,
          read_time: 4,
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem(this.POSTS_KEY, JSON.stringify(defaultPosts));
    }

    if (!localStorage.getItem(this.COMMENTS_KEY)) {
      const defaultComments = [
        { id: 1, post_id: 1, author_name: 'Alexander Gray', author_email: 'alex@example.com', content: 'Incredible breakdown! The section on Write-Ahead Logging mirrors our recent production migration.', created_at: new Date().toISOString() },
        { id: 2, post_id: 2, author_name: 'Sarah Lin', author_email: 'sarah@designlab.io', content: 'The emphasis on design tokens and accessibility is spot on. Beautifully explained!', created_at: new Date().toISOString() }
      ];
      localStorage.setItem(this.COMMENTS_KEY, JSON.stringify(defaultComments));
    }
  },

  getSettings() {
    this.init();
    return JSON.parse(localStorage.getItem(this.SETTINGS_KEY));
  },

  setSettings(newSettings) {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updated));
    SyncChannel.broadcast('SETTINGS_UPDATED', updated);
    return updated;
  },

  getCategories() {
    this.init();
    const cats = JSON.parse(localStorage.getItem(this.CATEGORIES_KEY) || '[]');
    const posts = this.getPosts();
    return cats.map(c => ({
      ...c,
      post_count: posts.filter(p => p.category_id === c.id && p.status === 'published').length,
      total_post_count: posts.filter(p => p.category_id === c.id).length
    }));
  },

  addCategory(name, color = '#6366f1', description = '', slug = '') {
    const cats = this.getCategories();
    const cleanSlug = slug || name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');
    const newCat = {
      id: Date.now(),
      name,
      slug: cleanSlug,
      color,
      description
    };
    cats.push(newCat);
    localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(cats));
    SyncChannel.broadcast('CATEGORY_CREATED', newCat);
    return newCat;
  },

  deleteCategory(id) {
    let cats = this.getCategories();
    cats = cats.filter(c => c.id !== id);
    localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(cats));
    SyncChannel.broadcast('CATEGORY_DELETED', { id });
  },

  getPosts() {
    this.init();
    return JSON.parse(localStorage.getItem(this.POSTS_KEY) || '[]');
  },

  getPostBySlug(slug) {
    const posts = this.getPosts();
    const post = posts.find(p => p.slug === slug);
    if (!post) return null;
    post.views = (post.views || 0) + 1;
    this.savePost(post, false);
    const comments = this.getComments(post.id);
    const relatedPosts = posts.filter(p => p.category_id === post.category_id && p.id !== post.id && p.status === 'published').slice(0, 3);
    return { post, comments, relatedPosts };
  },

  savePost(postData, broadcast = true) {
    const posts = this.getPosts();
    const cats = this.getCategories();
    const cat = cats.find(c => c.id == postData.category_id);

    if (cat) {
      postData.category_name = cat.name;
      postData.category_slug = cat.slug;
      postData.category_color = cat.color;
    }

    if (!postData.id) {
      postData.id = Date.now();
      postData.created_at = new Date().toISOString();
      postData.views = 0;
      postData.likes = 0;
      posts.unshift(postData);
      localStorage.setItem(this.POSTS_KEY, JSON.stringify(posts));
      if (broadcast) SyncChannel.broadcast('POST_CREATED', postData);
    } else {
      const idx = posts.findIndex(p => p.id === postData.id);
      if (idx !== -1) {
        posts[idx] = { ...posts[idx], ...postData, updated_at: new Date().toISOString() };
        localStorage.setItem(this.POSTS_KEY, JSON.stringify(posts));
        if (broadcast) SyncChannel.broadcast('POST_UPDATED', posts[idx]);
      }
    }
    return postData;
  },

  deletePost(id) {
    let posts = this.getPosts();
    const post = posts.find(p => p.id === id);
    posts = posts.filter(p => p.id !== id);
    localStorage.setItem(this.POSTS_KEY, JSON.stringify(posts));
    if (post) SyncChannel.broadcast('POST_DELETED', { id, title: post.title, slug: post.slug });
  },

  likePost(id) {
    const posts = this.getPosts();
    const post = posts.find(p => p.id === id);
    if (post) {
      post.likes = (post.likes || 0) + 1;
      localStorage.setItem(this.POSTS_KEY, JSON.stringify(posts));
      SyncChannel.broadcast('POST_LIKED', { id, likes: post.likes });
      return post.likes;
    }
    return 0;
  },

  getComments(postId) {
    this.init();
    const comments = JSON.parse(localStorage.getItem(this.COMMENTS_KEY) || '[]');
    return comments.filter(c => c.post_id === postId);
  },

  addComment(postId, author_name, author_email, content) {
    this.init();
    const comments = JSON.parse(localStorage.getItem(this.COMMENTS_KEY) || '[]');
    const newComment = {
      id: Date.now(),
      post_id: parseInt(postId, 10),
      author_name,
      author_email,
      content,
      created_at: new Date().toISOString()
    };
    comments.unshift(newComment);
    localStorage.setItem(this.COMMENTS_KEY, JSON.stringify(comments));
    SyncChannel.broadcast('NEW_COMMENT', { postId: parseInt(postId, 10), comment: newComment });
    return newComment;
  },

  deleteComment(id) {
    let comments = JSON.parse(localStorage.getItem(this.COMMENTS_KEY) || '[]');
    comments = comments.filter(c => c.id !== id);
    localStorage.setItem(this.COMMENTS_KEY, JSON.stringify(comments));
  },

  getStats() {
    const posts = this.getPosts();
    const comments = JSON.parse(localStorage.getItem(this.COMMENTS_KEY) || '[]');
    const categories = this.getCategories();
    return {
      totalPosts: posts.length,
      publishedPosts: posts.filter(p => p.status === 'published').length,
      draftPosts: posts.filter(p => p.status === 'draft').length,
      totalViews: posts.reduce((sum, p) => sum + (p.views || 0), 0),
      totalLikes: posts.reduce((sum, p) => sum + (p.likes || 0), 0),
      categoriesCount: categories.length,
      commentsCount: comments.length,
      topPosts: posts.filter(p => p.status === 'published').sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5)
    };
  }
};

/**
 * Real-Time Tab Synchronization via BroadcastChannel (Works on GitHub Pages & Static Hosts)
 */
const SyncChannel = {
  channel: null,
  init() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('nexus_blog_sync');
      this.channel.onmessage = (e) => {
        const { type, data } = e.data;
        window.dispatchEvent(new CustomEvent('blog:sync', { detail: { type, data } }));
        if (type === 'SETTINGS_UPDATED') {
          applyDynamicSettings(data);
          showToast('Site Settings Updated', 'Branding refreshed dynamically.', 'success');
        } else if (type === 'POST_CREATED') {
          window.dispatchEvent(new CustomEvent('blog:post_created', { detail: data }));
        } else if (type === 'POST_UPDATED') {
          window.dispatchEvent(new CustomEvent('blog:post_updated', { detail: data }));
        } else if (type === 'POST_DELETED') {
          window.dispatchEvent(new CustomEvent('blog:post_deleted', { detail: data }));
        } else if (type === 'NEW_COMMENT') {
          window.dispatchEvent(new CustomEvent('blog:new_comment', { detail: data }));
        }
      };
    }
  },
  broadcast(type, data) {
    if (this.channel) {
      this.channel.postMessage({ type, data });
    }
    // Dispatch locally as well
    window.dispatchEvent(new CustomEvent('blog:sync', { detail: { type, data } }));
  }
};

SyncChannel.init();

/**
 * Universal API Client with Automatic Static/GitHub Pages Fallback
 */
let isServerOnline = null;

const API = {
  getToken() {
    return localStorage.getItem('blog_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('blog_token', token);
    } else {
      localStorage.removeItem('blog_token');
    }
  },

  getHeaders(isMultipart = false) {
    const headers = {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  },

  async checkServer() {
    if (isServerOnline !== null) return isServerOnline;
    if (isStaticHost()) {
      isServerOnline = false;
      return false;
    }
    try {
      const res = await fetch('/api/health', { signal: AbortSignal.timeout(1500) });
      isServerOnline = res.ok;
      return res.ok;
    } catch {
      isServerOnline = false;
      return false;
    }
  },

  async request(endpoint, options = {}) {
    const serverOk = await this.checkServer();

    // If server is not running or on GitHub Pages, use ClientDB
    if (!serverOk) {
      return this.handleClientDbRequest(endpoint, options);
    }

    const config = {
      ...options,
      headers: {
        ...this.getHeaders(options.isMultipart),
        ...(options.headers || {})
      }
    };

    try {
      const res = await fetch(endpoint, config);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP error! Status: ${res.status}`);
      }
      return data;
    } catch (err) {
      // Fallback to ClientDB if server fails
      console.warn(`Server request failed for ${endpoint}. Falling back to ClientDB:`, err);
      return this.handleClientDbRequest(endpoint, options);
    }
  },

  handleClientDbRequest(endpoint, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body) : {};

    // Auth
    if (endpoint === '/api/auth/login') {
      const { username, password } = body;
      if (username === 'admin' && password === 'admin123') {
        const fakeToken = 'gh-pages-demo-token-' + Date.now();
        this.setToken(fakeToken);
        return { message: 'Login successful (Static Mode)', token: fakeToken, user: { id: 1, username: 'admin', email: 'admin@example.com' } };
      }
      throw new Error('Invalid credentials. Use admin / admin123');
    }

    if (endpoint === '/api/auth/me') {
      const token = this.getToken();
      if (!token) throw new Error('Unauthenticated');
      return { user: { id: 1, username: 'admin', email: 'admin@example.com' } };
    }

    // Settings
    if (endpoint === '/api/settings') {
      if (method === 'GET') return ClientDB.getSettings();
      if (method === 'PUT') return { message: 'Settings saved', settings: ClientDB.setSettings(body) };
    }

    // Categories
    if (endpoint === '/api/categories') {
      if (method === 'GET') return ClientDB.getCategories();
      if (method === 'POST') return { message: 'Category created', category: ClientDB.addCategory(body.name, body.color, body.description, body.slug) };
    }
    if (endpoint.startsWith('/api/categories/')) {
      const catId = parseInt(endpoint.split('/').pop(), 10);
      if (method === 'DELETE') {
        ClientDB.deleteCategory(catId);
        return { message: 'Category deleted' };
      }
    }

    // Posts Stats
    if (endpoint === '/api/posts/stats') {
      return ClientDB.getStats();
    }

    // Featured Post
    if (endpoint === '/api/posts/featured') {
      const posts = ClientDB.getPosts().filter(p => p.status === 'published');
      const featured = posts.find(p => p.featured === 1) || posts[0] || null;
      return featured;
    }

    // Admin All Posts
    if (endpoint === '/api/posts/admin/all') {
      return ClientDB.getPosts();
    }

    // Posts Feed
    if (endpoint.startsWith('/api/posts?') || endpoint === '/api/posts') {
      if (method === 'GET') {
        const urlParams = new URLSearchParams(endpoint.includes('?') ? endpoint.split('?')[1] : '');
        const cat = urlParams.get('category');
        const search = urlParams.get('search');
        let posts = ClientDB.getPosts().filter(p => p.status === 'published');
        if (cat) posts = posts.filter(p => p.category_slug === cat);
        if (search) {
          const s = search.toLowerCase();
          posts = posts.filter(p => (p.title || '').toLowerCase().includes(s) || (p.excerpt || '').toLowerCase().includes(s));
        }
        return {
          posts,
          pagination: { page: 1, limit: 12, totalPosts: posts.length, totalPages: 1, hasNext: false, hasPrev: false }
        };
      }
      if (method === 'POST') {
        const newPost = ClientDB.savePost(body, true);
        return { message: 'Post created', post: newPost };
      }
    }

    // Single Post by ID
    if (endpoint.startsWith('/api/posts/id/')) {
      const id = parseInt(endpoint.split('/').pop(), 10);
      const post = ClientDB.getPosts().find(p => p.id === id);
      if (!post) throw new Error('Post not found');
      return post;
    }

    // Single Post by Slug or Post Update/Delete
    if (endpoint.startsWith('/api/posts/')) {
      const parts = endpoint.split('/').filter(Boolean);
      // /api/posts/:id/like
      if (parts.length === 4 && parts[3] === 'like') {
        const id = parseInt(parts[2], 10);
        return { likes: ClientDB.likePost(id) };
      }
      // /api/posts/:id (PUT / DELETE)
      if (parts.length === 3 && !isNaN(parts[2])) {
        const id = parseInt(parts[2], 10);
        if (method === 'PUT') {
          body.id = id;
          return { message: 'Post updated', post: ClientDB.savePost(body, true) };
        }
        if (method === 'DELETE') {
          ClientDB.deletePost(id);
          return { message: 'Post deleted' };
        }
      }
      // /api/posts/:slug (GET)
      if (parts.length === 3) {
        const slug = parts[2];
        const res = ClientDB.getPostBySlug(slug);
        if (!res) throw new Error('Post not found');
        return res;
      }
    }

    // Comments
    if (endpoint.startsWith('/api/comments/admin/all')) {
      return JSON.parse(localStorage.getItem(ClientDB.COMMENTS_KEY) || '[]');
    }
    if (endpoint.startsWith('/api/comments/')) {
      const parts = endpoint.split('/').filter(Boolean);
      // POST /api/comments/:postId
      if (method === 'POST') {
        const postId = parts[2];
        const c = ClientDB.addComment(postId, body.author_name, body.author_email, body.content);
        return { message: 'Comment submitted', comment: c };
      }
      // DELETE /api/comments/:id
      if (method === 'DELETE') {
        const id = parseInt(parts[2], 10);
        ClientDB.deleteComment(id);
        return { message: 'Comment deleted' };
      }
    }

    return {};
  },

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  async uploadFile(file) {
    const serverOk = await this.checkServer();
    if (!serverOk) {
      // Convert to Base64 Data URL for standalone GitHub Pages mode
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            message: 'Image attached (Local Base64)',
            url: e.target.result,
            filename: file.name,
            size: file.size
          });
        };
        reader.readAsDataURL(file);
      });
    }

    const formData = new FormData();
    formData.append('image', file);
    return this.request('/api/upload', {
      method: 'POST',
      body: formData,
      isMultipart: true
    });
  }
};

/**
 * Toast Notifications
 */
function showToast(title, message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(title)}</div>
      <div class="toast-message">${escapeHtml(message)}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px) scale(0.95)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Theme Management (Light / Dark)
 */
const ThemeManager = {
  init() {
    const saved = localStorage.getItem('blog_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    this.setTheme(theme);
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('blog_theme', theme);
    const toggles = document.querySelectorAll('.theme-toggle-btn');
    toggles.forEach(btn => {
      btn.innerHTML = theme === 'dark' 
        ? `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`
        : `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>`;
    });
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    this.setTheme(current === 'dark' ? 'light' : 'dark');
  }
};

/**
 * Real-Time SSE Listener (When connected to live backend)
 */
function initLiveSync() {
  if (isStaticHost()) {
    // Already synced via BroadcastChannel!
    document.querySelectorAll('.live-sync-indicator').forEach(b => {
      b.style.display = 'inline-flex';
    });
    return;
  }

  const eventSource = new EventSource('/api/events');

  eventSource.onopen = () => {
    document.querySelectorAll('.live-sync-indicator').forEach(b => {
      b.style.display = 'inline-flex';
    });
  };

  eventSource.onmessage = (e) => {
    try {
      const payload = JSON.parse(e.data);
      if (payload.type === 'CONNECTED') return;

      window.dispatchEvent(new CustomEvent('blog:sync', { detail: payload }));

      if (payload.type === 'SETTINGS_UPDATED') {
        applyDynamicSettings(payload.data);
        showToast('Site Settings Updated', 'Branding and configuration refreshed dynamically.', 'success');
      } else if (payload.type === 'POST_CREATED') {
        window.dispatchEvent(new CustomEvent('blog:post_created', { detail: payload.data }));
      } else if (payload.type === 'POST_UPDATED') {
        window.dispatchEvent(new CustomEvent('blog:post_updated', { detail: payload.data }));
      } else if (payload.type === 'POST_DELETED') {
        window.dispatchEvent(new CustomEvent('blog:post_deleted', { detail: payload.data }));
      } else if (payload.type === 'NEW_COMMENT') {
        window.dispatchEvent(new CustomEvent('blog:new_comment', { detail: payload.data }));
      }
    } catch (err) {
      console.warn('Error parsing SSE message:', err);
    }
  };

  eventSource.onerror = () => {
    // Auto handled
  };
}

/**
 * Apply Dynamic Settings to Page (Site Name, Tagline, Colors, etc.)
 */
function applyDynamicSettings(settings) {
  if (!settings) return;

  if (settings.site_name) {
    document.querySelectorAll('.dynamic-site-name').forEach(el => {
      el.textContent = settings.site_name;
    });

    if (document.body.dataset.page === 'home') {
      document.title = `${settings.site_name} — ${settings.site_tagline || 'Modern Publishing'}`;
    }
  }

  if (settings.site_tagline) {
    document.querySelectorAll('.dynamic-site-tagline').forEach(el => {
      el.textContent = settings.site_tagline;
    });
  }

  if (settings.site_description) {
    document.querySelectorAll('.dynamic-site-desc').forEach(el => {
      el.textContent = settings.site_description;
    });
  }

  if (settings.site_domain) {
    document.querySelectorAll('.dynamic-site-domain').forEach(el => {
      el.textContent = settings.site_domain;
    });
  }

  if (settings.primary_color) {
    document.documentElement.style.setProperty('--primary', settings.primary_color);
  }
  if (settings.secondary_color) {
    document.documentElement.style.setProperty('--secondary', settings.secondary_color);
  }

  if (settings.footer_text) {
    document.querySelectorAll('.dynamic-footer-text').forEach(el => {
      el.textContent = settings.footer_text;
    });
  }

  if (settings.logo_url) {
    document.querySelectorAll('.dynamic-brand-logo').forEach(el => {
      el.src = settings.logo_url;
      el.style.display = 'block';
    });
    document.querySelectorAll('.dynamic-brand-icon').forEach(el => {
      el.style.display = 'none';
    });
  }

  // Dynamic OpenGraph and Twitter SEO updates
  const fullTitle = `${settings.site_name || 'Nexus Horizon'} — ${settings.site_tagline || 'Modern Publishing'}`;
  const fullDesc = settings.site_description || settings.site_tagline || '';

  document.querySelectorAll('.dynamic-og-title, .dynamic-twitter-title').forEach(el => el.setAttribute('content', fullTitle));
  document.querySelectorAll('.dynamic-og-desc, .dynamic-twitter-desc').forEach(el => el.setAttribute('content', fullDesc));
  document.querySelectorAll('.dynamic-og-site').forEach(el => el.setAttribute('content', settings.site_name || 'Nexus Horizon'));

  // Update homepage JSON-LD Schema
  const structuredDataEl = document.getElementById('structured-data-schema');
  if (structuredDataEl && document.body.dataset.page === 'home') {
    structuredDataEl.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Blog',
      'name': settings.site_name || 'Nexus Horizon',
      'url': window.location.href,
      'description': fullDesc,
      'publisher': {
        '@type': 'Organization',
        'name': settings.site_name || 'Nexus Horizon'
      }
    });
  }
}

// Auto init theme and live sync
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  initLiveSync();
});
