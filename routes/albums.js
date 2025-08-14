const express = require('express');
const router = express.Router();
const {
  createAlbum,
  getAlbum,
  updateAlbum,
  deleteAlbum,
  addTrackToAlbum,
  removeTrackFromAlbum,
  getArtistAlbums
} = require('../controllers/albums.js');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const upload = require('../middleware/multer');
const {
  createAlbumSchema,
  updateAlbumSchema,
  albumTrackSchema
} = require('../validations/albums.js');

// Create album (artist only)
router.post(
  '/',
  authenticate,
  requireRole(['ARTIST']),
   (req, res, next) => {
        console.log('Request headers:', req.headers);
        // console.log('Request body keys:', Object.keys(req.body));
        console.log('Request body :',(req.body));
        next();
    },
  upload.single('cover'),
  validate(createAlbumSchema),
  createAlbum
);

// Get album details
router.get('/:id', getAlbum);

// Update album
router.patch(
  '/:id',
  authenticate,
  requireRole(['ARTIST', 'ADMIN']),
  upload.single('cover'),
  validate(updateAlbumSchema),
  updateAlbum
);

// Delete album
router.delete(
  '/:id',
  authenticate,
  requireRole(['ARTIST', 'ADMIN']),
  deleteAlbum
);

// Add track to album
router.post(
  '/:id/tracks',
  authenticate,
  requireRole(['ARTIST']),
  validate(albumTrackSchema),
  addTrackToAlbum
);

// Remove track from album
router.delete(
  '/:id/tracks/:trackId',
  authenticate,
  requireRole(['ARTIST', 'ADMIN']),
  removeTrackFromAlbum
);

// Get artist's albums
router.get('/artist/:artistId', getArtistAlbums);

module.exports = router;