const express = require('express');
const router = express.Router();
const { getSettings, setSetting } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { broadcast } = require('../sse');

// GET /api/settings - Public
router.get('/', (req, res) => {
  try {
    const settings = getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve site settings.' });
  }
});

// PUT /api/settings - Admin only
router.put('/', authMiddleware, (req, res) => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid settings payload.' });
    }

    // List of allowed setting keys
    const allowedKeys = [
      'site_name',
      'site_tagline',
      'site_description',
      'site_domain',
      'hero_title',
      'hero_subtitle',
      'primary_color',
      'secondary_color',
      'logo_url',
      'footer_text',
      'social_twitter',
      'social_github',
      'social_linkedin',
      'posts_per_page'
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedKeys.includes(key)) {
        setSetting(key, value);
      }
    }

    const updated = getSettings();
    // Broadcast live update across all connected clients (User view & Admin view)
    broadcast('SETTINGS_UPDATED', updated);

    res.json({ message: 'Settings updated successfully.', settings: updated });
  } catch (err) {
    console.error('Settings update error:', err);
    res.status(500).json({ error: 'Failed to update site settings.' });
  }
});

module.exports = router;
