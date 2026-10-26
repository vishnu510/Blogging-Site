# Nexus Horizon — Next-Generation Modern Blogging Platform

A production-grade, highly scalable blogging platform featuring a **connected live relational database**, **real-time synchronization (SSE)** between User and Admin views, and **zero hardcoded branding**—everything is dynamically configurable from the Admin Dashboard to support any domain.

---

## 🌟 Key Features

### 1. Dual Synchronized Interfaces
- **Public Reader View (`/`)**:
  - Hero section spotlighting featured editorial stories with backdrop lighting.
  - Interactive category filtering pills with real-time post count badges.
  - Live instant search with `Ctrl+K` / `Cmd+K` keyboard shortcut.
  - Dynamic sort by *Latest*, *Most Popular (Reads)*, *Most Appreciated (Likes)*, or *Oldest*.
  - Rich single article reader (`/post/:slug`) featuring:
    - Fixed top reading progress indicator bar.
    - Interactive Table of Contents (TOC) with automatic header extraction and scrollspy.
    - Code block copy-to-clipboard functionality.
    - Real-time animated applause/like system.
    - Reader discussion & comment submission with live updates.
  - Light & Dark mode support with persistent user preference.
  - Dynamic branding (Site Name, Tagline, Descriptions, Socials, Colors, and Favicons) dynamically loaded from the database.

- **Admin Management Console (`/admin`)**:
  - Protected with JWT authentication and bcrypt password hashing.
  - Live Overview KPI stat cards (Total Articles, Views, Appreciations, Drafts, Categories, Comments).
  - Modern Aligned Rich Text Editor:
    - **Title & Slug**: Live auto-generated URL-safe slug with lock/unlock toggle.
    - **Local System Image Upload**: Drag-and-drop or file picker attachment of local images (PNG, JPG, WebP, GIF, SVG) with instant preview and replacement.
    - **Modern Alignment Controls**: Left Align, Center Align, Right Align, and Justify.
    - **Formatting Tools**: Bold, Italic, Underline, Strikethrough, H2, H3, Blockquotes, Code Blocks, Callouts, Lists, and Horizontal Rules.
    - **Inline Media Insertion**: Insert uploaded images directly into the content body with formatting.
    - **Category Selection**: Choose from active categories or create a new one instantly using the inline modal.
    - **View Modes**: Toggle between Visual Editor, Live HTML Preview, and 50/50 Split View.
    - **Real-time Stats**: Live word count, character count, and estimated reading time.
  - **Category Management**: Create, edit, recolor, and delete categories.
  - **Comment Moderation**: Review and delete reader feedback.
  - **Dynamic Site Settings**: Change Site Name, Domain, Taglines, Hero Headings, Accent Colors, Logo URL, and Social Links. Every change broadcasts live to all open browsers.
  - **Media Gallery**: Review all uploaded images from the local filesystem with one-click URL copying.

---

## 🚀 Live Synchronization (SSE)

The platform includes a built-in **Server-Sent Events (SSE)** broadcaster (`/api/events`). Whenever an article is published, updated, deleted, or site branding is modified in the Admin Console:
- All connected public readers and admin tabs receive the event in milliseconds.
- New articles appear in the public feed without refreshing the browser.
- Branding, colors, and header titles update dynamically across the entire application.

---

## 📦 Scalable Database Architecture

- Powered by **SQLite with Write-Ahead Logging (WAL mode)** (`data/blog.db`).
- Provides concurrent readers without blocking writes, ACID compliance, and sub-millisecond query execution.
- Relational schema with indices on `slug`, `category_id`, `status`, and `created_at`.
- Clean repository pattern makes it straightforward to scale to PostgreSQL or MySQL for cloud deployments.

---

## 🔐 Default Admin Credentials

| Role | Username / Email | Password |
|---|---|---|
| Administrator | `admin` (or `admin@example.com`) | `admin123` |

*(Credentials and passwords can be updated anytime inside Admin Settings).*

---

## 🛠️ Quick Start & Running Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Platform**:
   ```bash
   npm start
   ```
   *(Or for live reload development)*:
   ```bash
   npm run dev
   ```

3. **Access the Applications**:
   - **Public Site**: [http://localhost:3000](http://localhost:3000)
   - **Admin Console**: [http://localhost:3000/admin](http://localhost:3000/admin)
   - **Admin Sign-in**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

---

## 📁 Project Structure

```
├── data/
│   └── blog.db                  # Live SQLite database with WAL mode
├── public/
│   ├── css/
│   │   ├── main.css             # Design tokens, themes, global typography, toasts
│   │   ├── user.css             # Reader layout, hero section, feed, TOC, comments
│   │   └── admin.css            # Admin shell, KPI cards, aligned rich editor
│   ├── js/
│   │   ├── api.js               # Central API client & real-time SSE listener
│   │   ├── user.js              # Reader feed, search, filter, and pagination
│   │   ├── post.js              # Reader view, reading progress, comments, TOC
│   │   ├── editor.js            # Modern aligned blog post editor & image upload
│   │   └── admin.js             # Admin dashboard controller & settings sync
│   ├── uploads/                 # Local filesystem image attachments
│   ├── index.html               # Public Homepage
│   ├── post.html                # Single Article Reading View
│   ├── admin.html               # Admin Dashboard & Editor
│   └── login.html               # Admin Sign-In
├── server/
│   ├── db.js                    # Database connection, schema & default seeds
│   ├── sse.js                   # Server-Sent Events real-time broadcaster
│   ├── seed.js                  # Sample editorial articles and seed data
│   ├── middleware/auth.js       # Admin JWT authentication middleware
│   └── routes/
│       ├── auth.js              # Login, token verification, password updates
│       ├── posts.js             # Post CRUD, search, likes, views & stats
│       ├── categories.js        # Category CRUD
│       ├── comments.js          # Reader comments & moderation
│       ├── settings.js          # Dynamic branding, domain & color settings
│       └── upload.js            # Multer local image upload handler
├── server.js                    # Express 5 server entry point
└── package.json
```
