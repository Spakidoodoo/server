const express = require('express');
const router = express.Router();
const {
  getEditorPicks,
  getTrendingTracks,
  getNewReleases,
  getRecommendedTracks,
  getGenreFeed
} = require('../controllers/discover.js');
const { optionalAuth } = require('../middleware/auth');

// Public discovery routes
router.get('/editor-picks', getEditorPicks);
router.get('/trending', getTrendingTracks);
router.get('/new-releases', getNewReleases);
router.get('/recommended', optionalAuth, getRecommendedTracks); // Personalized if logged in
router.get('/genres/:genre', getGenreFeed);

module.exports = router;