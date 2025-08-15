const express = require('express');
const router = express.Router();
const {
  getArtistAnalytics,
  getTrackAnalytics,
  getListenerStats,
  getStreamingHistory,
  exportAnalyticsData
} = require('../controllers/analytics.js');
const { authenticate, requireRole } = require('../middleware/auth');

// Artist analytics (protected)
router.get('/artist/:artistId', authenticate, requireRole(['ARTIST', 'ADMIN']), getArtistAnalytics);

// Track analytics (protected)
router.get('/tracks/:trackId', authenticate, requireRole(['ARTIST', 'ADMIN']), getTrackAnalytics);

// Listener stats (protected)
router.get('/listeners/:userId', authenticate, getListenerStats);

// Streaming history (user-specific)
router.get('/history', authenticate, getStreamingHistory);

// Data export
router.get('/export', authenticate, exportAnalyticsData);

module.exports = router;