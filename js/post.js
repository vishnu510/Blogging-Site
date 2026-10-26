/**
 * NEXUS HORIZON - Single Post Reader, Table of Contents, Comments & Interactions
 */

let currentPost = null;

document.addEventListener('DOMContentLoaded', async () => {
  setupPostEventListeners();
  await loadPostDetails();
  setupPostRealtime();
});

function setupPostEventListeners() {
  // Theme toggle
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => ThemeManager.toggle());
  });

  // Reading progress scroll tracker
  window.addEventListener('scroll', updateReadingProgress);

  // Comment form submission
  const commentForm = document.getElementById('comment-form');
  if (commentForm) {
    commentForm.addEventListener('submit', handleCommentSubmit);
  }
}

function updateReadingProgress() {
  const progressBar = document.getElementById('reading-progress');
  if (!progressBar) return;

  const contentEl = document.getElementById('post-content');
  if (!contentEl) return;

  const totalHeight = contentEl.clientHeight;
  const contentTop = contentEl.offsetTop;
  const currentScroll = window.scrollY;
  const windowHeight = window.innerHeight;

  if (currentScroll < contentTop) {
    progressBar.style.width = '0%';
  } else {
    const progress = Math.min(100, Math.max(0, ((currentScroll - contentTop) / (totalHeight - windowHeight + 200)) * 100));
    progressBar.style.width = `${progress}%`;
  }
}

function getSlugFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const fromQuery = urlParams.get('slug');
  if (fromQuery) return fromQuery;

  const hash = window.location.hash.replace('#', '').trim();
  if (hash) return hash;

  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts.length >= 2 && pathParts[0] === 'post') {
    return pathParts[1];
  }
  const last = pathParts[pathParts.length - 1];
  if (last && !last.endsWith('.html')) {
    return last;
  }
  return null;
}

async function loadPostDetails() {
  const slug = getSlugFromUrl();
  if (!slug) {
    window.location.href = '/';
    return;
  }

  try {
    // Load site settings first for dynamic branding
    const settings = await API.get('/api/settings');
    applyDynamicSettings(settings);

    // Load post by slug
    const data = await API.get(`/api/posts/${slug}`);
    currentPost = data.post;

    // Dynamic SEO Metadata Injection
    const fullSiteName = settings.site_name || 'Nexus Horizon';
    const postTitle = `${currentPost.title} — ${fullSiteName}`;
    const postDesc = currentPost.excerpt || 'Read the full story on Nexus Horizon.';
    const postUrl = window.location.href;
    const postImg = currentPost.cover_image && currentPost.cover_image.startsWith('http')
      ? currentPost.cover_image
      : new URL(currentPost.cover_image || './uploads/cloud-architecture.jpg', window.location.href).href;

    document.title = postTitle;

    const metaDesc = document.getElementById('meta-description');
    if (metaDesc) metaDesc.content = postDesc;

    const canonicalEl = document.getElementById('canonical-url');
    if (canonicalEl) canonicalEl.href = postUrl;

    const ogTitle = document.getElementById('og-title');
    if (ogTitle) ogTitle.content = postTitle;
    const ogDesc = document.getElementById('og-description');
    if (ogDesc) ogDesc.content = postDesc;
    const ogUrl = document.getElementById('og-url');
    if (ogUrl) ogUrl.content = postUrl;
    const ogImg = document.getElementById('og-image');
    if (ogImg) ogImg.content = postImg;

    const twTitle = document.getElementById('twitter-title');
    if (twTitle) twTitle.content = postTitle;
    const twDesc = document.getElementById('twitter-description');
    if (twDesc) twDesc.content = postDesc;
    const twImg = document.getElementById('twitter-image');
    if (twImg) twImg.content = postImg;

    // JSON-LD Structured Data Schema for Google Search
    const schemaEl = document.getElementById('article-jsonld');
    if (schemaEl) {
      const schemaData = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        'headline': currentPost.title,
        'description': postDesc,
        'image': [postImg],
        'datePublished': currentPost.created_at,
        'dateModified': currentPost.updated_at || currentPost.created_at,
        'author': {
          '@type': 'Person',
          'name': currentPost.author_name || 'Editorial Team'
        },
        'publisher': {
          '@type': 'Organization',
          'name': fullSiteName,
          'logo': {
            '@type': 'ImageObject',
            'url': postImg
          }
        },
        'mainEntityOfPage': {
          '@type': 'WebPage',
          '@id': postUrl
        }
      };
      schemaEl.textContent = JSON.stringify(schemaData);
    }

    renderPost(data.post);
    renderTableOfContents();
    renderComments(data.comments || []);
    renderRelatedPosts(data.relatedPosts || []);
    setupCodeBlockCopyButtons();
  } catch (err) {
    console.error('Error loading article:', err);
    document.getElementById('post-main-container').innerHTML = `
      <div style="text-align:center;padding:6rem 1.5rem;">
        <h1 style="font-size:var(--text-3xl);margin-bottom:1rem">Article Not Found</h1>
        <p style="color:var(--text-muted);margin-bottom:2rem">The article you are looking for may have been removed or renamed.</p>
        <a href="/" class="btn btn-primary">Return to Homepage</a>
      </div>
    `;
  }
}

function renderPost(post) {
  // Breadcrumbs
  const breadcrumbCat = document.getElementById('breadcrumb-category');
  if (breadcrumbCat) {
    breadcrumbCat.textContent = post.category_name || 'Article';
    breadcrumbCat.href = `/?category=${post.category_slug}`;
  }

  const breadcrumbTitle = document.getElementById('breadcrumb-title');
  if (breadcrumbTitle) {
    breadcrumbTitle.textContent = post.title;
  }

  // Header
  document.getElementById('post-title').textContent = post.title;
  if (post.excerpt) {
    document.getElementById('post-excerpt').textContent = post.excerpt;
    document.getElementById('post-excerpt').style.display = 'block';
  }

  document.getElementById('post-author').textContent = post.author_name;
  document.getElementById('post-date').textContent = new Date(post.created_at).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  document.getElementById('post-read-time').textContent = `${post.read_time || 3} min read`;
  document.getElementById('post-views').textContent = `${post.views || 1} views`;

  // Category badge
  const catBadge = document.getElementById('post-category-badge');
  if (catBadge) {
    catBadge.textContent = post.category_name || 'General';
    catBadge.style.backgroundColor = post.category_color || 'var(--primary)';
    catBadge.style.color = '#ffffff';
  }

  // Cover Image
  const coverImg = document.getElementById('post-cover-img');
  if (coverImg) {
    coverImg.src = post.cover_image || '/uploads/cloud-architecture.jpg';
    coverImg.alt = post.title;
  }

  // Body Content
  const contentEl = document.getElementById('post-content');
  if (contentEl) {
    contentEl.innerHTML = post.content;
  }

  // Like button
  const likeBtn = document.getElementById('post-like-btn');
  const likeCount = document.getElementById('post-like-count');
  if (likeCount) likeCount.textContent = post.likes || 0;
  if (likeBtn) {
    likeBtn.onclick = () => handleLikeCurrentPost(post.id);
  }
}

function renderTableOfContents() {
  const contentEl = document.getElementById('post-content');
  const tocContainer = document.getElementById('toc-container');
  const mobileTocCard = document.getElementById('mobile-toc-card');
  const mobileTocContainer = document.getElementById('mobile-toc-container');
  if (!contentEl) return;

  const headings = contentEl.querySelectorAll('h2, h3');
  if (headings.length === 0) {
    const desktopCard = document.getElementById('toc-card');
    if (desktopCard) desktopCard.style.display = 'none';
    if (mobileTocCard) mobileTocCard.style.display = 'none';
    return;
  }

  let html = '<ul class="toc-list">';
  headings.forEach((heading, idx) => {
    const id = heading.id || `heading-${idx}`;
    heading.id = id;
    const isH3 = heading.tagName.toLowerCase() === 'h3';
    html += `
      <li style="${isH3 ? 'margin-left: 0.85rem;' : ''}">
        <a href="#${id}" class="toc-link" data-target="${id}">
          ${escapeHtml(heading.textContent)}
        </a>
      </li>
    `;
  });
  html += '</ul>';

  if (tocContainer) tocContainer.innerHTML = html;
  if (mobileTocContainer) {
    mobileTocContainer.innerHTML = html;
    // Auto-close details when a link is clicked
    mobileTocContainer.querySelectorAll('.toc-link').forEach(link => {
      link.addEventListener('click', () => {
        const details = mobileTocCard.querySelector('details');
        if (details) details.removeAttribute('open');
      });
    });
  }

  // Active heading spy on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        document.querySelectorAll('.toc-link').forEach(link => {
          link.classList.toggle('active', link.getAttribute('data-target') === entry.target.id);
        });
      }
    });
  }, { rootMargin: '-80px 0px -70% 0px' });

  headings.forEach(h => observer.observe(h));
}

function setupCodeBlockCopyButtons() {
  const pres = document.querySelectorAll('#post-content pre');
  pres.forEach(pre => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary btn-sm';
    btn.style.cssText = 'position:absolute;top:0.6rem;right:0.6rem;padding:2px 8px;font-size:11px;';
    btn.textContent = 'Copy';
    btn.onclick = () => {
      const code = pre.querySelector('code') ? pre.querySelector('code').innerText : pre.innerText;
      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy', 2000);
      });
    };
    pre.style.position = 'relative';
    pre.appendChild(btn);
  });
}

async function handleLikeCurrentPost(postId) {
  try {
    const res = await API.post(`/api/posts/${postId}/like`);
    const likeCount = document.getElementById('post-like-count');
    if (likeCount) likeCount.textContent = res.likes;
    const likeBtn = document.getElementById('post-like-btn');
    if (likeBtn) {
      likeBtn.style.transform = 'scale(1.15)';
      setTimeout(() => likeBtn.style.transform = 'scale(1)', 300);
    }
    showToast('Appreciated!', 'Thank you for supporting this article.', 'success');
  } catch (err) {
    console.error('Like error:', err);
  }
}

function shareOn(platform) {
  const url = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(currentPost ? currentPost.title : document.title);

  if (platform === 'twitter') {
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${title}`, '_blank');
  } else if (platform === 'linkedin') {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  } else if (platform === 'copy') {
    navigator.clipboard.writeText(window.location.href).then(() => {
      showToast('Link Copied', 'Article link copied to your clipboard.', 'info');
    });
  }
}

function renderComments(comments) {
  const listEl = document.getElementById('comments-list');
  const countEl = document.getElementById('comments-count');
  if (countEl) countEl.textContent = `(${comments.length})`;

  if (!listEl) return;
  if (comments.length === 0) {
    listEl.innerHTML = `<p style="color:var(--text-muted);font-size:var(--text-sm)">No responses yet. Be the first to share your thoughts!</p>`;
    return;
  }

  listEl.innerHTML = comments.map(c => `
    <div class="comment-card">
      <div class="comment-header">
        <span class="comment-author-name">${escapeHtml(c.author_name)}</span>
        <span class="comment-date">${new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>
      <div class="comment-body">${escapeHtml(c.content)}</div>
    </div>
  `).join('');
}

async function handleCommentSubmit(e) {
  e.preventDefault();
  if (!currentPost) return;

  const nameInput = document.getElementById('comment-author-name');
  const emailInput = document.getElementById('comment-author-email');
  const contentInput = document.getElementById('comment-content');

  const author_name = nameInput.value.trim();
  const author_email = emailInput.value.trim();
  const content = contentInput.value.trim();

  if (!author_name || !content) {
    showToast('Validation Error', 'Please enter your name and comment message.', 'warning');
    return;
  }

  try {
    const res = await API.post(`/api/comments/${currentPost.id}`, {
      author_name,
      author_email,
      content
    });

    showToast('Comment Posted', 'Your response has been published successfully.', 'success');
    contentInput.value = '';

    // Append to list immediately
    const listEl = document.getElementById('comments-list');
    const newCommentHtml = `
      <div class="comment-card" style="border-left: 3px solid var(--primary);animation:fadeIn 0.4s ease">
        <div class="comment-header">
          <span class="comment-author-name">${escapeHtml(author_name)}</span>
          <span class="comment-date">Just now</span>
        </div>
        <div class="comment-body">${escapeHtml(content)}</div>
      </div>
    `;

    if (listEl.querySelector('p')) {
      listEl.innerHTML = newCommentHtml;
    } else {
      listEl.insertAdjacentHTML('afterbegin', newCommentHtml);
    }
  } catch (err) {
    showToast('Failed to post comment', err.message, 'danger');
  }
}

function renderRelatedPosts(posts) {
  const container = document.getElementById('related-posts-grid');
  if (!container || posts.length === 0) {
    const section = document.getElementById('related-posts-section');
    if (section) section.style.display = 'none';
    return;
  }

  container.innerHTML = posts.map(p => `
    <article class="post-card">
      <a href="${getPostUrl(p.slug)}" class="card-img-link">
        <img class="card-img" src="${p.cover_image || './uploads/cloud-architecture.jpg'}" alt="${escapeHtml(p.title)}" />
      </a>
      <div class="card-body">
        <h3 class="card-title" style="font-size:var(--text-lg)">
          <a href="${getPostUrl(p.slug)}">${escapeHtml(p.title)}</a>
        </h3>
        <p class="card-excerpt">${escapeHtml(p.excerpt || '')}</p>
        <div class="card-footer">
          <span>${p.read_time || 3} min read</span>
          <a href="${getPostUrl(p.slug)}" style="color:var(--primary);font-weight:600">Read →</a>
        </div>
      </div>
    </article>
  `).join('');
}

function setupPostRealtime() {
  window.addEventListener('blog:new_comment', (e) => {
    if (currentPost && e.detail.postId === currentPost.id) {
      // Reload comments seamlessly
      API.get(`/api/posts/${currentPost.slug}`).then(data => {
        renderComments(data.comments || []);
      });
    }
  });

  window.addEventListener('blog:post_updated', (e) => {
    if (currentPost && e.detail.id === currentPost.id) {
      showToast('Article Updated', 'The author just published an update to this story.', 'info');
      // Refresh page content
      renderPost(e.detail);
    }
  });
}
