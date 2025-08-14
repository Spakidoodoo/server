import { Router } from 'express';
import {
  createArtistProfile,
  getArtistProfile,
  updateArtistProfile,
  followArtist,
  getArtistTracks,
  getArtistAlbums,
} from '../controllers/artists.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createArtistSchema,
  updateArtistSchema,
  followArtistSchema,
} from '../validations/artists.js';

const router = Router();

// Create artist profile (requires LISTENER role)
router.post(
  '/',
  authenticate,
  requireRole(['LISTENER']), // Only listeners can become artists
  validate(createArtistSchema),
  createArtistProfile
);

// Get artist public profile
router.get('/:id', getArtistProfile);

// Update artist profile (artist or admin only)
router.patch(
  '/:id',
  authenticate,
  requireRole(['ARTIST', 'ADMIN']),
  validate(updateArtistSchema),
  updateArtistProfile
);

// Follow/unfollow artist
router.post(
  '/:id/follow',
  authenticate,
  validate(followArtistSchema),
  followArtist
);

// Get artist's tracks
router.get('/:id/tracks', getArtistTracks);

// Get artist's albums
router.get('/:id/albums', getArtistAlbums);

export default router;