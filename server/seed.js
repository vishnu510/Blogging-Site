const { db } = require('./db');

function seedInitialData() {
  const postCount = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
  if (postCount > 0) return;

  const archCat = db.prepare("SELECT id FROM categories WHERE slug = 'architecture'").get();
  const designCat = db.prepare("SELECT id FROM categories WHERE slug = 'design-systems'").get();
  const aiCat = db.prepare("SELECT id FROM categories WHERE slug = 'artificial-intelligence'").get();

  const posts = [
    {
      title: 'Architecting Next-Generation Distributed Systems for Zero-Latency Scale',
      slug: 'architecting-next-generation-distributed-systems',
      excerpt: 'Explore how edge compute, modern relational backends, and decoupled asynchronous event buses achieve sub-millisecond responsiveness across global regions.',
      content: `
        <p class="lead">Building applications that handle massive traffic spikes without sacrificing sub-millisecond response times is one of the definitive engineering challenges of modern computing. Today, we break down architectural patterns that scale effortlessly.</p>
        
        <h2>1. The Evolution from Monolithic to Globally Distributed</h2>
        <p>In traditional tiered architectures, every request traveled round-trip to a centralized database cluster. While manageable for regional workloads, global consumer expectations demand local latency under 50ms.</p>
        
        <blockquote>"Latency is the silent killer of user engagement. Every 100ms delay degrades user retention by up to 7%."</blockquote>

        <h3>Key Tenets of Modern Scale:</h3>
        <ul>
          <li><strong>Read/Write Segregation (CQRS):</strong> Decouple heavy analytical reporting from transactional mutations.</li>
          <li><strong>Edge Caching & Dynamic Invalidation:</strong> Serve static and stale-while-revalidate assets directly from the network perimeter.</li>
          <li><strong>Asynchronous Event Broadcasting:</strong> Leverage lightweight streaming protocols like Server-Sent Events (SSE) and WebSockets for real-time reactivity.</li>
        </ul>

        <h2>2. Data Partitioning and Write-Ahead Logging (WAL)</h2>
        <p>High performance starts at the storage engine. Relational databases running in WAL mode provide simultaneous reader concurrency while writes are safely journaled in serial chunks.</p>

        <pre><code class="language-sql">-- Enable high-concurrency WAL mode in SQLite
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000; -- 64MB memory cache</code></pre>

        <div class="callout callout-info">
          <strong>Pro Tip:</strong> By utilizing memory mapped I/O and non-blocking read replicas, systems can service tens of thousands of requests per second per node with minimal memory overhead.
        </div>

        <h2>3. Designing Resilient Microservices</h2>
        <p>Distributed systems must assume failure is inevitable. Implementing circuit breakers, exponential backoffs with jitter, and dead-letter queues ensures your system degrades gracefully under extreme load.</p>

        <p>As you build your own infrastructure, focus first on clarity of domain boundaries before premature horizontal partitioning. Simplicity is the cornerstone of reliability.</p>
      `,
      cover_image: '/uploads/cloud-architecture.jpg',
      category_id: archCat ? archCat.id : 1,
      author_name: 'Elena Rostova',
      status: 'published',
      featured: 1,
      views: 342,
      likes: 48,
      read_time: 5
    },
    {
      title: 'Design Systems in 2026: The Convergence of Tokens, Micro-Interactions, and Dark Mode',
      slug: 'design-systems-in-2026-tokens-micro-interactions',
      excerpt: 'How modern UI engineering harmonizes atomic design tokens, glassmorphism, and seamless dark-mode transitions into delightful user experiences.',
      content: `
        <p class="lead">A design system is far more than a UI component kit; it is the shared visual vocabulary of an entire organization. Discover how design tokens and fluid typography create cohesive digital ecosystems.</p>

        <h2>The Power of Dynamic Token Architecture</h2>
        <p>Hardcoding hex colors and arbitrary pixel paddings creates technical debt that slows down product iterations. Modern systems treat design tokens as single sources of truth.</p>

        <pre><code class="language-css">:root {
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-display: 'Outfit', sans-serif;
  --color-primary: #6366f1;
  --color-accent: #ec4899;
  --bg-surface: rgba(255, 255, 255, 0.85);
  --glass-border: rgba(255, 255, 255, 0.12);
  --shadow-glow: 0 8px 32px rgba(99, 102, 241, 0.15);
}</code></pre>

        <h2>Crafting Meaningful Micro-Interactions</h2>
        <p>Micro-interactions provide sensory feedback that reassures users. Whether it is a subtle button scale on click or a silky fade in during scroll, purposeful motion transforms a static page into an interactive canvas.</p>

        <div class="callout callout-success">
          <strong>Accessibility First:</strong> Always respect <code>prefers-reduced-motion</code> media queries to ensure smooth accessibility for all individuals.
        </div>

        <h2>Glassmorphism Done Right</h2>
        <p>Combining <code>backdrop-filter: blur(16px)</code> with semi-transparent borders provides depth without cluttering the screen. When paired with deep space dark modes, the outcome feels unmistakably premium and modern.</p>
      `,
      cover_image: '/uploads/design-systems.jpg',
      category_id: designCat ? designCat.id : 2,
      author_name: 'Marcus Vance',
      status: 'published',
      featured: 1,
      views: 215,
      likes: 39,
      read_time: 4
    },
    {
      title: 'The Rise of Agentic AI Workflows: Beyond Prompt Engineering',
      slug: 'the-rise-of-agentic-ai-workflows',
      excerpt: 'Autonomous loops, tool integration, and continuous reasoning environments are replacing brittle prompt templates in production AI applications.',
      content: `
        <p class="lead">The paradigm of interacting with language models is shifting rapidly from single-turn completions to iterative, agentic problem-solving loops equipped with real tools.</p>

        <h2>From Chatbots to Autonomous Executors</h2>
        <p>Early AI applications treated models like question-answering engines. Today, agentic architectures grant models access to APIs, databases, browsers, and local execution sandboxes.</p>

        <h3>Core Elements of an Agentic System:</h3>
        <ol>
          <li><strong>Perception & Context:</strong> Synthesizing system state and user intent into high-fidelity context windows.</li>
          <li><strong>Planning:</strong> Breaking down complex objectives into sequential, verifiable subtasks.</li>
          <li><strong>Tool Execution:</strong> Interacting with deterministic environments like database queries and REST APIs.</li>
          <li><strong>Self-Correction:</strong> Analyzing error output and refining subsequent attempts without human intervention.</li>
        </ol>

        <div class="callout callout-warning">
          <strong>Safety & Sandboxing:</strong> Production agents must always execute within strict privilege boundaries and rate limits to prevent runaway loops.
        </div>

        <h2>Looking Ahead to Collaborative Human-AI Synergy</h2>
        <p>The future is not about replacing human creativity, but amplifying it. When routine data wrangling and boilerplate tasks are handled by autonomous agents, engineers and creators are freed to focus on high-impact vision and strategy.</p>
      `,
      cover_image: '/uploads/agentic-ai.jpg',
      category_id: aiCat ? aiCat.id : 3,
      author_name: 'Dr. Sophia Chen',
      status: 'published',
      featured: 0,
      views: 189,
      likes: 27,
      read_time: 4
    }
  ];

  const insertStmt = db.prepare(`
    INSERT INTO posts (
      title, slug, excerpt, content, cover_image, 
      category_id, author_name, status, featured, 
      views, likes, read_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertComment = db.prepare(`
    INSERT INTO comments (post_id, author_name, author_email, content)
    VALUES (?, ?, ?, ?)
  `);

  for (const post of posts) {
    const info = insertStmt.run(
      post.title,
      post.slug,
      post.excerpt,
      post.content,
      post.cover_image,
      post.category_id,
      post.author_name,
      post.status,
      post.featured,
      post.views,
      post.likes,
      post.read_time
    );

    const postId = info.lastInsertRowid;
    // Add sample discussion comments
    insertComment.run(postId, 'Alexander Gray', 'alex@example.com', 'Incredible breakdown! The section on Write-Ahead Logging and CQRS mirrors our recent production migration.');
    insertComment.run(postId, 'Sarah Lin', 'sarah@designlab.io', 'The emphasis on design tokens and accessibility is spot on. Beautifully explained!');
  }

  console.log('✅ Seeded initial high quality articles and comments.');
}

module.exports = { seedInitialData };
