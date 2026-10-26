/**
 * NEXUS HORIZON - Admin Dashboard Controller
 * Section routing, stats, post management, category CRUD, comments, dynamic settings
 */

let currentAdminSection = 'dashboard';

document.addEventListener('DOMContentLoaded', async () => {
  // Check auth
  const token = API.getToken();
  if (!token) {
    window.location.href = getLoginUrl();
    return;
  }

  try {
    const authData = await API.get('/api/auth/me');
    document.getElementById('admin-username-display').textContent = authData.user.username;
  } catch (err) {
    API.setToken(null);
    window.location.href = getLoginUrl();
    return;
  }

  setupAdminEvents();
  await loadAdminCategoriesDropdown();
  await showSection('dashboard');
  setupAdminRealtime();
});

function setupAdminEvents() {
  const sidebar = document.getElementById('admin-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const toggleBtn = document.getElementById('mobile-sidebar-toggle');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (backdrop) backdrop.classList.toggle('active');
    });
  }

  if (backdrop && sidebar) {
    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('active');
    });
  }

  // Section Navigation
  document.querySelectorAll('.admin-nav-item[data-section]').forEach(item => {
    item.addEventListener('click', () => {
      const section = item.getAttribute('data-section');
      showSection(section);
      if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        if (backdrop) backdrop.classList.remove('active');
      }
    });
  });

  // Theme toggle
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => ThemeManager.toggle());
  });

  // Logout button
  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      API.setToken(null);
      showToast('Logged Out', 'You have been signed out successfully.', 'info');
      setTimeout(() => {
        window.location.href = getLoginUrl();
      }, 500);
    });
  }

  // Settings Form Submit
  const settingsForm = document.getElementById('site-settings-form');
  if (settingsForm) {
    settingsForm.addEventListener('submit', handleSaveSettings);
  }

  // Quick Category Form Submit
  const quickCatForm = document.getElementById('quick-cat-form');
  if (quickCatForm) {
    quickCatForm.addEventListener('submit', handleQuickCategoryCreate);
  }

  // Category Manager Form Submit
  const catMgrForm = document.getElementById('category-manager-form');
  if (catMgrForm) {
    catMgrForm.addEventListener('submit', handleCategoryManagerSave);
  }

  // Color inputs sync
  const primaryColorPicker = document.getElementById('setting-primary-color');
  const primaryColorText = document.getElementById('setting-primary-color-text');
  if (primaryColorPicker && primaryColorText) {
    primaryColorPicker.addEventListener('input', (e) => primaryColorText.value = e.target.value);
    primaryColorText.addEventListener('input', (e) => primaryColorPicker.value = e.target.value);
  }
}

async function showSection(sectionName, param = null) {
  currentAdminSection = sectionName;

  // Update active sidebar nav item
  document.querySelectorAll('.admin-nav-item[data-section]').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-section') === sectionName);
  });

  // Hide all sections
  document.querySelectorAll('.admin-section-view').forEach(view => {
    view.style.display = 'none';
  });

  // Show target section
  const targetView = document.getElementById(`section-${sectionName}`);
  if (targetView) {
    targetView.style.display = 'block';
  }

  // Load section-specific data
  if (sectionName === 'dashboard') {
    await loadDashboardStats();
  } else if (sectionName === 'posts') {
    await loadPostsTable();
  } else if (sectionName === 'editor') {
    BlogEditor.init(param);
  } else if (sectionName === 'categories') {
    await loadCategoriesManager();
  } else if (sectionName === 'comments') {
    await loadCommentsManager();
  } else if (sectionName === 'settings') {
    await loadSiteSettingsForm();
  } else if (sectionName === 'media') {
    await loadMediaGallery();
  }
}

/**
 * 1. DASHBOARD OVERVIEW & STATS
 */
async function loadDashboardStats() {
  try {
    const stats = await API.get('/api/posts/stats');
    document.getElementById('stat-total-posts').textContent = stats.totalPosts || 0;
    document.getElementById('stat-total-views').textContent = (stats.totalViews || 0).toLocaleString();
    document.getElementById('stat-total-likes').textContent = (stats.totalLikes || 0).toLocaleString();
    document.getElementById('stat-published-posts').textContent = stats.publishedPosts || 0;
    document.getElementById('stat-draft-posts').textContent = stats.draftPosts || 0;
    document.getElementById('stat-comments-count').textContent = stats.commentsCount || 0;

    // Render top posts
    const topContainer = document.getElementById('dashboard-top-posts');
    if (topContainer && stats.topPosts) {
      if (stats.topPosts.length === 0) {
        topContainer.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No articles published yet.</td></tr>';
      } else {
        topContainer.innerHTML = stats.topPosts.map(p => `
          <tr>
            <td>
              <a href="${getPostUrl(p.slug)}" target="_blank" class="table-post-title">${escapeHtml(p.title)}</a>
              <span class="table-post-slug">/${p.slug}</span>
            </td>
            <td><strong>${(p.views || 0).toLocaleString()}</strong></td>
            <td><strong>${p.likes || 0}</strong></td>
            <td>
              <button class="btn btn-secondary btn-sm" onclick="showSection('editor', ${p.id})">Edit</button>
            </td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Error loading dashboard stats:', err);
  }
}

/**
 * 2. POSTS MANAGEMENT TABLE
 */
async function loadPostsTable() {
  const tbody = document.getElementById('posts-table-body');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem">Loading articles...</td></tr>';

  try {
    const posts = await API.get('/api/posts/admin/all');
    if (posts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:3rem;color:var(--text-muted)">No posts found. Click "+ New Post" to write your first article!</td></tr>';
      return;
    }

    tbody.innerHTML = posts.map(post => {
      const isPublished = post.status === 'published';
      const statusBadge = isPublished
        ? `<span class="badge" style="background:var(--success-bg);color:var(--success)">Published</span>`
        : `<span class="badge" style="background:var(--warning-bg);color:var(--warning)">Draft</span>`;

      return `
        <tr id="admin-post-row-${post.id}">
          <td>
            <div style="display:flex;align-items:center;gap:0.75rem">
              ${post.cover_image ? `<img src="${post.cover_image}" style="width:48px;height:34px;object-fit:cover;border-radius:4px" />` : ''}
              <div>
                <a href="javascript:void(0)" onclick="showSection('editor', ${post.id})" class="table-post-title">${escapeHtml(post.title)}</a>
                <span class="table-post-slug">/${post.slug}</span>
              </div>
            </div>
          </td>
          <td>
            <span class="badge" style="background:${post.category_color || 'var(--primary-light)'};color:#fff">
              ${escapeHtml(post.category_name || 'General')}
            </span>
          </td>
          <td>${statusBadge}</td>
          <td>
            <span title="Views">${post.views || 0} views</span> • 
            <span title="Likes">${post.likes || 0} likes</span>
          </td>
          <td>${new Date(post.created_at).toLocaleDateString()}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-secondary btn-sm" onclick="showSection('editor', ${post.id})">Edit</button>
              ${isPublished ? `<a href="${getPostUrl(post.slug)}" target="_blank" class="btn btn-ghost btn-sm">Preview ↗</a>` : ''}
              <button class="btn btn-danger btn-sm" onclick="confirmDeletePost(${post.id}, '${escapeHtml(post.title)}')">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger)">Error loading posts: ${err.message}</td></tr>`;
  }
}

async function confirmDeletePost(id, title) {
  if (confirm(`Are you sure you want to permanently delete "${title}"?`)) {
    try {
      await API.delete(`/api/posts/${id}`);
      showToast('Post Deleted', `"${title}" has been deleted.`, 'success');
      loadPostsTable();
    } catch (err) {
      showToast('Delete Failed', err.message, 'danger');
    }
  }
}

/**
 * 3. CATEGORIES MANAGEMENT
 */
async function loadAdminCategoriesDropdown() {
  try {
    const categories = await API.get('/api/categories');
    const select = document.getElementById('editor-category');
    if (select) {
      select.innerHTML = '<option value="">Select Category...</option>' + 
        categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    }
  } catch (err) {
    console.error('Error fetching categories for dropdown:', err);
  }
}

async function loadCategoriesManager() {
  const container = document.getElementById('categories-list-container');
  if (!container) return;

  try {
    const categories = await API.get('/api/categories');
    container.innerHTML = categories.map(cat => `
      <div class="glass-panel" style="padding:1.25rem;border-radius:var(--radius-md);margin-bottom:1rem;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:1rem">
          <div style="width:24px;height:24px;border-radius:50%;background-color:${cat.color}"></div>
          <div>
            <h4 style="font-size:var(--text-base);margin-bottom:0.2rem">${escapeHtml(cat.name)}</h4>
            <span style="font-size:var(--text-xs);color:var(--text-muted);font-family:var(--font-mono)">/${cat.slug} • ${cat.total_post_count || 0} articles</span>
          </div>
        </div>
        <button class="btn btn-danger btn-sm" onclick="handleDeleteCategory(${cat.id}, '${escapeHtml(cat.name)}')">Delete</button>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading categories:', err);
  }
}

async function handleQuickCategoryCreate(e) {
  e.preventDefault();
  const nameInput = document.getElementById('quick-cat-name');
  const colorInput = document.getElementById('quick-cat-color');
  const name = nameInput.value.trim();
  const color = colorInput.value;

  if (!name) return;

  try {
    const res = await API.post('/api/categories', { name, color });
    showToast('Category Created', `Category "${name}" is now available.`, 'success');
    nameInput.value = '';
    closeModal('modal-quick-category');
    await loadAdminCategoriesDropdown();
    // Select it automatically in editor
    const select = document.getElementById('editor-category');
    if (select) select.value = res.category.id;
  } catch (err) {
    showToast('Error', err.message, 'danger');
  }
}

async function handleCategoryManagerSave(e) {
  e.preventDefault();
  const name = document.getElementById('cat-mgr-name').value.trim();
  const slug = document.getElementById('cat-mgr-slug').value.trim();
  const color = document.getElementById('cat-mgr-color').value;
  const description = document.getElementById('cat-mgr-desc').value.trim();

  if (!name) {
    showToast('Validation Error', 'Category name is required.', 'warning');
    return;
  }

  try {
    await API.post('/api/categories', { name, slug, color, description });
    showToast('Category Added', `Category "${name}" created.`, 'success');
    e.target.reset();
    await loadCategoriesManager();
    await loadAdminCategoriesDropdown();
  } catch (err) {
    showToast('Error', err.message, 'danger');
  }
}

async function handleDeleteCategory(id, name) {
  if (confirm(`Delete category "${name}"? Posts in this category will become unassigned.`)) {
    try {
      await API.delete(`/api/categories/${id}`);
      showToast('Category Deleted', `"${name}" removed.`, 'success');
      await loadCategoriesManager();
      await loadAdminCategoriesDropdown();
    } catch (err) {
      showToast('Error', err.message, 'danger');
    }
  }
}

/**
 * 4. COMMENTS MODERATION
 */
async function loadCommentsManager() {
  const tbody = document.getElementById('comments-table-body');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem">Loading comments...</td></tr>';

  try {
    const comments = await API.get('/api/comments/admin/all');
    if (comments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:3rem;color:var(--text-muted)">No reader comments found.</td></tr>';
      return;
    }

    tbody.innerHTML = comments.map(c => `
      <tr>
        <td>
          <strong>${escapeHtml(c.author_name)}</strong>
          ${c.author_email ? `<div style="font-size:var(--text-xs);color:var(--text-muted)">${escapeHtml(c.author_email)}</div>` : ''}
        </td>
        <td>
          <a href="/post/${c.post_slug}" target="_blank" class="table-post-title">${escapeHtml(c.post_title)}</a>
        </td>
        <td style="max-width:320px;line-height:1.4">${escapeHtml(c.content)}</td>
        <td>${new Date(c.created_at).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="handleDeleteComment(${c.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--danger)">Error: ${err.message}</td></tr>`;
  }
}

async function handleDeleteComment(id) {
  if (confirm('Delete this comment?')) {
    try {
      await API.delete(`/api/comments/${id}`);
      showToast('Comment Removed', 'The comment has been deleted.', 'success');
      loadCommentsManager();
    } catch (err) {
      showToast('Error', err.message, 'danger');
    }
  }
}

/**
 * 5. DYNAMIC SITE SETTINGS FORM
 * "everything should be dynamically from admin no hard coding required"
 */
async function loadSiteSettingsForm() {
  try {
    const settings = await API.get('/api/settings');
    document.getElementById('setting-site-name').value = settings.site_name || '';
    document.getElementById('setting-site-tagline').value = settings.site_tagline || '';
    document.getElementById('setting-site-desc').value = settings.site_description || '';
    document.getElementById('setting-site-domain').value = settings.site_domain || '';
    document.getElementById('setting-hero-title').value = settings.hero_title || '';
    document.getElementById('setting-hero-subtitle').value = settings.hero_subtitle || '';
    document.getElementById('setting-primary-color').value = settings.primary_color || '#6366f1';
    document.getElementById('setting-primary-color-text').value = settings.primary_color || '#6366f1';
    document.getElementById('setting-logo-url').value = settings.logo_url || '';
    document.getElementById('setting-footer-text').value = settings.footer_text || '';
    document.getElementById('setting-twitter').value = settings.social_twitter || '';
    document.getElementById('setting-github').value = settings.social_github || '';
    document.getElementById('setting-linkedin').value = settings.social_linkedin || '';
  } catch (err) {
    showToast('Error', 'Failed to load site settings.', 'danger');
  }
}

async function handleSaveSettings(e) {
  e.preventDefault();

  const payload = {
    site_name: document.getElementById('setting-site-name').value.trim(),
    site_tagline: document.getElementById('setting-site-tagline').value.trim(),
    site_description: document.getElementById('setting-site-desc').value.trim(),
    site_domain: document.getElementById('setting-site-domain').value.trim(),
    hero_title: document.getElementById('setting-hero-title').value.trim(),
    hero_subtitle: document.getElementById('setting-hero-subtitle').value.trim(),
    primary_color: document.getElementById('setting-primary-color').value,
    logo_url: document.getElementById('setting-logo-url').value.trim(),
    footer_text: document.getElementById('setting-footer-text').value.trim(),
    social_twitter: document.getElementById('setting-twitter').value.trim(),
    social_github: document.getElementById('setting-github').value.trim(),
    social_linkedin: document.getElementById('setting-linkedin').value.trim()
  };

  try {
    const res = await API.put('/api/settings', payload);
    applyDynamicSettings(res.settings);
    showToast('Settings Saved Successfully!', 'Changes are now live across both user and admin views.', 'success');
  } catch (err) {
    showToast('Save Failed', err.message, 'danger');
  }
}

/**
 * 6. MEDIA GALLERY
 */
async function loadMediaGallery() {
  const container = document.getElementById('media-gallery-grid');
  if (!container) return;

  container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem">Loading media library...</div>';

  try {
    const media = await API.get('/api/upload/gallery');
    if (media.length === 0) {
      container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted)">No media uploaded yet. You can attach images when writing articles.</div>';
      return;
    }

    container.innerHTML = media.map(m => `
      <div class="glass-panel" style="border-radius:var(--radius-md);overflow:hidden;border:1px solid var(--border-subtle)">
        <img src="${m.url}" style="width:100%;height:140px;object-fit:cover;display:block" />
        <div style="padding:0.75rem">
          <div style="font-size:var(--text-xs);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${m.filename}">${escapeHtml(m.filename)}</div>
          <div style="font-size:10px;color:var(--text-muted);margin:0.25rem 0 0.5rem">${Math.round(m.size / 1024)} KB</div>
          <button class="btn btn-secondary btn-sm" style="width:100%" onclick="copyMediaUrl('${m.url}')">Copy URL</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div style="grid-column:1/-1;color:var(--danger)">Failed to load media: ${err.message}</div>`;
  }
}

function copyMediaUrl(url) {
  navigator.clipboard.writeText(url).then(() => {
    showToast('Copied', 'Image URL copied to clipboard.', 'info');
  });
}

/**
 * Modal helpers
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

/**
 * Real-time SSE synchronization in Admin view
 */
function setupAdminRealtime() {
  window.addEventListener('blog:post_created', () => {
    if (currentAdminSection === 'dashboard') loadDashboardStats();
    if (currentAdminSection === 'posts') loadPostsTable();
  });

  window.addEventListener('blog:post_updated', () => {
    if (currentAdminSection === 'dashboard') loadDashboardStats();
    if (currentAdminSection === 'posts') loadPostsTable();
  });

  window.addEventListener('blog:post_deleted', () => {
    if (currentAdminSection === 'dashboard') loadDashboardStats();
    if (currentAdminSection === 'posts') loadPostsTable();
  });

  window.addEventListener('blog:new_comment', () => {
    if (currentAdminSection === 'dashboard') loadDashboardStats();
    if (currentAdminSection === 'comments') loadCommentsManager();
  });
}
