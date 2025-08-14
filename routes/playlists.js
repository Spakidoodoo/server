const express = require('express');
const router = express.Router();
const {
  createPlaylist,
  getPlaylist,
  updatePlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  getUserPlaylists
} = require('../controllers/playlists.js');
const { authenticate } = require('../middleware/auth.js');
const { validate } = require('../middleware/validate.js');
const {
  createPlaylistSchema,
  updatePlaylistSchema,
  playlistItemSchema
} = require('../validations/playlists.js');

// Create playlist
router.post(
  '/',
  authenticate,
  validate(createPlaylistSchema),
  createPlaylist
);

// Get playlist
router.get('/:id', getPlaylist);

// Update playlist
router.patch(
  '/:id',
  authenticate,
  validate(updatePlaylistSchema),
  updatePlaylist
);

// Delete playlist
router.delete(
  '/:id',
  authenticate,
  deletePlaylist
);

// Add track to playlist
router.post(
  '/:id/tracks',
  authenticate,
  validate(playlistItemSchema),
  addTrackToPlaylist
);

// Remove track from playlist
router.delete(
  '/:id/tracks/:trackId',
  authenticate,
  removeTrackFromPlaylist
);

// Get user's playlists
router.get(
  '/user/:userId',
  authenticate,
  getUserPlaylists
);

module.exports = router;