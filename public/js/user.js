/**
 * NEXUS HORIZON - User Public Feed & Homepage Logic
 */

let currentCategory = '';
let currentSearch = '';
let currentSort = 'latest';
let currentPage = 1;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadInitialData();
  setupRealtimeListeners();
});

async function loadInitialData() {
  try {
    // 1. Load dynamic site settings (site name, tagline, branding, domain)
    const settings = await API.get('/api/settings');
    applyDynamicSettings(settings);

    // 2. Load categories
    await loadCategories();

    // 3. Load featured post for Hero
    await loadFeaturedPost();

    // 4. Load posts feed
    await loadPosts();
  } catch (err) {
    console.error('Initialization error:', err);
  }
}

function setupEventListeners() {
  // Theme toggle
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => ThemeManager.toggle());
  });

  // Search input with debounce
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        currentSearch = e.target.value;
        currentPage = 1;
        loadPosts();
      }, 300);
    });
  }

  // Quick keyboard shortcut Ctrl+K / Cmd+K
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const input = document.getElementById('search-input');
      if (input) {
        input.focus();
        input.select();
      }
    }
  });

  // Sort dropdown
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      currentPage = 1;
      loadPosts();
    });
  }
}

async function loadCategories() {
  try {
    const categories = await API.get('/api/categories');
    const container = document.getElementById('category-pills');
    if (!container) return;

    let html = `
      <button class="cat-pill ${currentCategory === '' ? 'active' : ''}" onclick="selectCategory('')">
        <span>All Stories</span>
      </button>
    `;

    categories.forEach(cat => {
      const activeClass = currentCategory === cat.slug ? 'active' : '';
      html += `
        <button class="cat-pill ${activeClass}" onclick="selectCategory('${cat.slug}')">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${cat.color}"></span>
          <span>${escapeHtml(cat.name)}</span>
          <span class="cat-pill-count">${cat.post_count || 0}</span>
        </button>
      `;
    });

    container.innerHTML = html;
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

function selectCategory(slug) {
  currentCategory = slug;
  currentPage = 1;
  loadCategories();
  loadPosts();
}

async function loadFeaturedPost() {
  const heroContainer = document.getElementById('hero-container');
  if (!heroContainer) return;

  try {
    const post = await API.get('/api/posts/featured');
    if (!post || !post.id) {
      heroContainer.style.display = 'none';
      return;
    }

    heroContainer.style.display = 'block';
    const cover = post.cover_image || '/uploads/cloud-architecture.jpg';

    heroContainer.innerHTML = `
      <div class="hero-featured-card">
        <img class="hero-bg-img" src="${cover}" alt="${escapeHtml(post.title)}" />
        <div class="hero-gradient-overlay"></div>
        <div class="hero-content">
          <div class="hero-badge-row">
            <span class="badge" style="background:${post.category_color || 'var(--primary)'};color:#fff">
              ${escapeHtml(post.category_name || 'Featured')}
            </span>
            <span class="badge" style="background:rgba(255,255,255,0.2);color:#fff">Featured Story</span>
          </div>
          <h1 class="hero-title">${escapeHtml(post.title)}</h1>
          <p class="hero-excerpt">${escapeHtml(post.excerpt || '')}</p>
          <div class="hero-meta">
            <span>
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              ${escapeHtml(post.author_name)}
            </span>
            <span>
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              ${new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span>
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              ${post.read_time || 3} min read
            </span>
            <span>
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              ${post.views || 0} views
            </span>
          </div>
          <div style="margin-top:0.75rem;">
            <a href="${getPostUrl(post.slug)}" class="btn btn-primary btn-lg">
              Read Complete Article
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </a>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Featured post load error:', err);
  }
}

async function loadPosts() {
  const grid = document.getElementById('posts-grid');
  const paginationContainer = document.getElementById('pagination-container');
  if (!grid) return;

  grid.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted)">
      <div style="display:inline-block;width:32px;height:32px;border:3px solid var(--border-strong);border-top-color:var(--primary);border-radius:50%;animation:spin 1s linear infinite"></div>
      <p style="margin-top:1rem;font-size:var(--text-sm)">Discovering stories...</p>
    </div>
  `;

  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit: 9,
      sort: currentSort
    });

    if (currentCategory) params.append('category', currentCategory);
    if (currentSearch) params.append('search', currentSearch);

    const data = await API.get(`/api/posts?${params.toString()}`);
    totalPages = data.pagination.totalPages;

    if (!data.posts || data.posts.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 5rem 1rem;">
          <svg style="width:54px;height:54px;color:var(--text-muted);margin:0 auto 1rem;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
          <h3 style="font-size:var(--text-xl);margin-bottom:0.5rem">No stories found</h3>
          <p style="color:var(--text-muted);font-size:var(--text-sm)">Try adjusting your search criteria or selecting a different category.</p>
        </div>
      `;
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    }

    grid.innerHTML = data.posts.map(post => renderPostCard(post)).join('');
    renderPagination(data.pagination);
  } catch (err) {
    console.error('Error loading posts:', err);
    grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--danger)">Failed to load articles.</div>`;
  }
}

function renderPostCard(post) {
  const cover = post.cover_image || '/uploads/cloud-architecture.jpg';
  const categoryColor = post.category_color || 'var(--primary)';
  const formattedDate = new Date(post.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return `
    <article class="post-card" id="post-card-${post.id}">
      <a href="${getPostUrl(post.slug)}" class="card-img-link">
        <img class="card-img" src="${cover}" alt="${escapeHtml(post.title)}" loading="lazy" />
        <span class="badge card-badge" style="background:${categoryColor};color:#ffffff">
          ${escapeHtml(post.category_name || 'General')}
        </span>
      </a>
      <div class="card-body">
        <div class="card-meta-top">
          <span>${formattedDate}</span>
          <span>•</span>
          <span>${post.read_time || 3} min read</span>
        </div>
        <h2 class="card-title">
          <a href="${getPostUrl(post.slug)}">${escapeHtml(post.title)}</a>
        </h2>
        <p class="card-excerpt">${escapeHtml(post.excerpt || '')}</p>
        <div class="card-footer">
          <span class="card-author">${escapeHtml(post.author_name)}</span>
          <div class="card-stats">
            <span class="card-stat-item" title="Views">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              ${post.views || 0}
            </span>
            <button class="card-stat-item btn-ghost" style="padding:2px;border:none;cursor:pointer" onclick="handleLikePost(${post.id}, this)">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
              <span class="like-num">${post.likes || 0}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderPagination(pagination) {
  const container = document.getElementById('pagination-container');
  if (!container || pagination.totalPages <= 1) {
    if (container) container.innerHTML = '';
    return;
  }

  let html = `<div style="display:flex;align-items:center;justify-content:center;gap:0.5rem;margin:3rem 0">`;

  if (pagination.hasPrev) {
    html += `
      <button class="btn btn-secondary btn-sm" onclick="goToPage(${pagination.page - 1})">
        ← Previous
      </button>
    `;
  }

  for (let i = 1; i <= pagination.totalPages; i++) {
    const isCurrent = i === pagination.page;
    html += `
      <button class="btn btn-sm ${isCurrent ? 'btn-primary' : 'btn-ghost'}" onclick="goToPage(${i})">
        ${i}
      </button>
    `;
  }

  if (pagination.hasNext) {
    html += `
      <button class="btn btn-secondary btn-sm" onclick="goToPage(${pagination.page + 1})">
        Next →
      </button>
    `;
  }

  html += `</div>`;
  container.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  loadPosts();
  window.scrollTo({ top: document.getElementById('posts-section').offsetTop - 80, behavior: 'smooth' });
}

async function handleLikePost(postId, buttonEl) {
  try {
    const res = await API.post(`/api/posts/${postId}/like`);
    const countEl = buttonEl.querySelector('.like-num');
    if (countEl) countEl.textContent = res.likes;
    buttonEl.style.color = 'var(--accent)';
    buttonEl.classList.add('liked');
  } catch (err) {
    console.error('Like error:', err);
  }
}

/**
 * Setup Real-time SSE synchronization
 */
function setupRealtimeListeners() {
  window.addEventListener('blog:post_created', (e) => {
    showToast('New Story Published!', `"${e.detail.title}" is now live.`, 'success');
    loadCategories();
    loadPosts();
  });

  window.addEventListener('blog:post_updated', (e) => {
    // If the post is currently on screen, refresh feed smoothly
    loadPosts();
  });

  window.addEventListener('blog:post_deleted', (e) => {
    const card = document.getElementById(`post-card-${e.detail.id}`);
    if (card) {
      card.style.transition = 'all 0.5s ease';
      card.style.opacity = '0';
      card.style.transform = 'scale(0.9)';
      setTimeout(() => card.remove(), 500);
    }
    loadCategories();
  });
}
