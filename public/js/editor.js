/**
 * NEXUS HORIZON - Modern Aligned Blog Post Editor
 * Handles Title, Slug, Local System Image Upload, Modern Alignment Toolbar, Categories, and Sync
 */

let editingPostId = null;
let isSlugLocked = true;
let uploadedCoverUrl = '';

const BlogEditor = {
  init(postId = null) {
    editingPostId = postId;
    this.bindDomElements();
    this.setupToolbar();
    this.setupImageUpload();
    this.setupSlugSync();
    this.setupContentListeners();

    if (editingPostId) {
      this.loadPostForEditing(editingPostId);
    } else {
      this.resetEditor();
    }
  },

  bindDomElements() {
    this.titleInput = document.getElementById('editor-title');
    this.slugInput = document.getElementById('editor-slug');
    this.slugLockBtn = document.getElementById('slug-lock-btn');
    this.categorySelect = document.getElementById('editor-category');
    this.authorInput = document.getElementById('editor-author');
    this.statusSelect = document.getElementById('editor-status');
    this.featuredToggle = document.getElementById('editor-featured');
    this.excerptInput = document.getElementById('editor-excerpt');
    this.contentArea = document.getElementById('editor-content');
    this.previewArea = document.getElementById('editor-preview');
    this.dropzone = document.getElementById('image-dropzone');
    this.fileInput = document.getElementById('local-file-input');
    this.imagePreviewBox = document.getElementById('image-preview-box');
    this.previewImg = document.getElementById('preview-image-el');

    // Quick category modal triggers
    const quickCatBtn = document.getElementById('quick-add-cat-btn');
    if (quickCatBtn) {
      quickCatBtn.onclick = () => openModal('modal-quick-category');
    }
  },

  setupSlugSync() {
    if (!this.titleInput || !this.slugInput) return;

    this.titleInput.addEventListener('input', () => {
      if (isSlugLocked && !editingPostId) {
        this.slugInput.value = this.slugify(this.titleInput.value);
      }
    });

    if (this.slugLockBtn) {
      this.slugLockBtn.addEventListener('click', () => {
        isSlugLocked = !isSlugLocked;
        this.slugInput.readOnly = isSlugLocked;
        this.slugLockBtn.innerHTML = isSlugLocked
          ? `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>`
          : `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>`;
        showToast('Slug Edit Mode', isSlugLocked ? 'Slug is locked and auto-generating.' : 'Slug unlocked for custom editing.', 'info');
      });
    }
  },

  slugify(text) {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },

  setupImageUpload() {
    if (!this.dropzone || !this.fileInput) return;

    // Dropzone click opens native file picker from local system
    this.dropzone.addEventListener('click', () => {
      this.fileInput.click();
    });

    // Handle file selected from local system
    this.fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        await this.uploadLocalFile(file);
      }
    });

    // Drag and Drop events
    ['dragenter', 'dragover'].forEach(event => {
      this.dropzone.addEventListener(event, (e) => {
        e.preventDefault();
        this.dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(event => {
      this.dropzone.addEventListener(event, (e) => {
        e.preventDefault();
        this.dropzone.classList.remove('dragover');
      });
    });

    this.dropzone.addEventListener('drop', async (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        await this.uploadLocalFile(file);
      }
    });
  },

  async uploadLocalFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('Invalid File Type', 'Please choose an image file (PNG, JPG, WebP, GIF, SVG).', 'danger');
      return;
    }

    try {
      showToast('Uploading Image', `Transferring ${file.name} to server...`, 'info', 2000);
      const res = await API.uploadFile(file);
      this.setCoverImage(res.url);
      showToast('Image Attached', 'Cover image uploaded and attached from local system.', 'success');
    } catch (err) {
      showToast('Upload Failed', err.message, 'danger');
    }
  },

  setCoverImage(url) {
    uploadedCoverUrl = url;
    if (url) {
      this.previewImg.src = url;
      this.imagePreviewBox.style.display = 'block';
      this.dropzone.style.display = 'none';
    } else {
      this.previewImg.src = '';
      this.imagePreviewBox.style.display = 'none';
      this.dropzone.style.display = 'block';
      if (this.fileInput) this.fileInput.value = '';
    }
  },

  removeCoverImage() {
    this.setCoverImage('');
  },

  setupToolbar() {
    const toolbar = document.getElementById('editor-toolbar');
    if (!toolbar) return;

    toolbar.querySelectorAll('[data-command]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const command = btn.getAttribute('data-command');
        const value = btn.getAttribute('data-value') || null;

        if (command === 'createLink') {
          const url = prompt('Enter URL to link to:', 'https://');
          if (url) document.execCommand('createLink', false, url);
        } else if (command === 'insertImage') {
          // Allow inserting image into body from local file or URL
          const choice = confirm('Click OK to upload an image from local system, or Cancel to enter an Image URL:');
          if (choice) {
            const bodyFileInput = document.createElement('input');
            bodyFileInput.type = 'file';
            bodyFileInput.accept = 'image/*';
            bodyFileInput.onchange = async () => {
              if (bodyFileInput.files && bodyFileInput.files[0]) {
                try {
                  const res = await API.uploadFile(bodyFileInput.files[0]);
                  document.execCommand('insertImage', false, res.url);
                } catch (err) {
                  showToast('Error', 'Failed to upload inline image.', 'danger');
                }
              }
            };
            bodyFileInput.click();
          } else {
            const imgUrl = prompt('Enter Image URL:');
            if (imgUrl) document.execCommand('insertImage', false, imgUrl);
          }
        } else if (command === 'formatBlock' && value === 'blockquote') {
          document.execCommand('formatBlock', false, 'blockquote');
        } else if (command === 'formatBlock' && value === 'pre') {
          document.execCommand('formatBlock', false, 'pre');
        } else {
          document.execCommand(command, false, value);
        }

        this.contentArea.focus();
        this.updateStats();
      });
    });
  },

  setupContentListeners() {
    if (!this.contentArea) return;

    this.contentArea.addEventListener('input', () => {
      this.updateStats();
    });

    // Keyboard shortcuts in editor
    this.contentArea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.savePost();
      }
    });
  },

  updateStats() {
    if (!this.contentArea) return;
    const text = this.contentArea.innerText || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const readTime = Math.max(1, Math.ceil(words / 200));

    const wordEl = document.getElementById('stat-word-count');
    const charEl = document.getElementById('stat-char-count');
    const readEl = document.getElementById('stat-read-time');

    if (wordEl) wordEl.textContent = `${words} words`;
    if (charEl) charEl.textContent = `${chars} characters`;
    if (readEl) readEl.textContent = `~${readTime} min read`;

    // Live update preview if active
    if (this.previewArea && this.previewArea.style.display !== 'none') {
      this.previewArea.innerHTML = this.contentArea.innerHTML;
    }
  },

  switchViewMode(mode) {
    const editArea = this.contentArea;
    const previewArea = this.previewArea;
    const tabs = document.querySelectorAll('.editor-tab-btn');

    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-mode') === mode);
    });

    if (mode === 'edit') {
      editArea.style.display = 'block';
      previewArea.style.display = 'none';
      editArea.style.width = '100%';
    } else if (mode === 'preview') {
      previewArea.innerHTML = editArea.innerHTML;
      editArea.style.display = 'none';
      previewArea.style.display = 'block';
    } else if (mode === 'split') {
      previewArea.innerHTML = editArea.innerHTML;
      editArea.style.display = 'block';
      previewArea.style.display = 'block';
      editArea.style.width = '50%';
      previewArea.style.width = '50%';
    }
  },

  autoGenerateExcerpt() {
    const text = (this.contentArea.innerText || '').trim();
    if (!text) {
      showToast('Empty Article', 'Write some content first to generate an excerpt.', 'warning');
      return;
    }
    const clean = text.replace(/\s+/g, ' ');
    const excerpt = clean.length > 160 ? clean.substring(0, 160).trim() + '...' : clean;
    this.excerptInput.value = excerpt;
    showToast('Excerpt Generated', 'Summary auto-generated from your article content.', 'info');
  },

  async loadPostForEditing(postId) {
    try {
      const post = await API.get(`/api/posts/id/${postId}`);
      this.titleInput.value = post.title;
      this.slugInput.value = post.slug;
      this.categorySelect.value = post.category_id || '';
      this.authorInput.value = post.author_name;
      this.statusSelect.value = post.status;
      this.featuredToggle.checked = post.featured === 1;
      this.excerptInput.value = post.excerpt || '';
      this.contentArea.innerHTML = post.content || '';
      this.setCoverImage(post.cover_image || '');
      this.updateStats();

      document.getElementById('editor-heading-title').textContent = 'Edit Blog Post';
      const previewLink = document.getElementById('editor-preview-live-btn');
      if (previewLink) {
        previewLink.style.display = 'inline-flex';
        previewLink.href = getPostUrl(post.slug);
      }
    } catch (err) {
      showToast('Error', 'Failed to load post for editing.', 'danger');
    }
  },

  resetEditor() {
    editingPostId = null;
    if (this.titleInput) this.titleInput.value = '';
    if (this.slugInput) this.slugInput.value = '';
    if (this.excerptInput) this.excerptInput.value = '';
    if (this.contentArea) this.contentArea.innerHTML = '';
    if (this.authorInput) this.authorInput.value = 'Admin';
    if (this.statusSelect) this.statusSelect.value = 'published';
    if (this.featuredToggle) this.featuredToggle.checked = false;
    this.setCoverImage('');
    this.updateStats();

    const heading = document.getElementById('editor-heading-title');
    if (heading) heading.textContent = 'Write New Article';
    const previewLink = document.getElementById('editor-preview-live-btn');
    if (previewLink) previewLink.style.display = 'none';
  },

  async savePost(overrideStatus = null) {
    const title = this.titleInput.value.trim();
    const content = this.contentArea.innerHTML.trim();

    if (!title) {
      showToast('Validation Error', 'Please enter a title for the blog post.', 'warning');
      this.titleInput.focus();
      return;
    }

    if (!content || content === '<br>') {
      showToast('Validation Error', 'Please write some content in the blog editor.', 'warning');
      this.contentArea.focus();
      return;
    }

    const payload = {
      title,
      slug: this.slugInput.value.trim() || this.slugify(title),
      category_id: this.categorySelect.value ? parseInt(this.categorySelect.value, 10) : null,
      author_name: this.authorInput.value.trim() || 'Admin',
      status: overrideStatus || this.statusSelect.value,
      featured: this.featuredToggle.checked ? 1 : 0,
      excerpt: this.excerptInput.value.trim(),
      content,
      cover_image: uploadedCoverUrl || ''
    };

    try {
      let res;
      if (editingPostId) {
        res = await API.put(`/api/posts/${editingPostId}`, payload);
        showToast('Article Updated', `"${payload.title}" saved successfully.`, 'success');
      } else {
        res = await API.post('/api/posts', payload);
        editingPostId = res.post.id;
        showToast('Article Published!', `"${payload.title}" is now live.`, 'success');
      }

      // Update UI state
      document.getElementById('editor-heading-title').textContent = 'Edit Blog Post';
      const previewLink = document.getElementById('editor-preview-live-btn');
      if (previewLink && res.post) {
        previewLink.style.display = 'inline-flex';
        previewLink.href = getPostUrl(res.post.slug);
      }
    } catch (err) {
      showToast('Save Failed', err.message, 'danger');
    }
  }
};
