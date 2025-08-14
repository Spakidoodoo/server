const express = require('express');
const router = express.Router();
const {
    uploadTrack,
    getTrack,
    getTracks,
    updateTrack,
    deleteTrack,
    likeTrack,
    logPlay,
    addLyrics,
} = require('../controllers/tracks.js');
const { authenticate, requireRole } = require('../middleware/auth.js');
const { validate } = require('../middleware/validate.js');
const upload = require('../middleware/multer.js'); // Assuming you have a multer setup for file uploads
const {
    uploadTrackSchema,
    updateTrackSchema,
    likeTrackSchema,
    lyricsSchema,
} = require('../validations/tracks.js');

// Public routes
router.get('/', getTracks);
router.get('/:id', getTrack);

// Protected routes
router.post(
    '/',
    authenticate,
    requireRole(['ARTIST', 'ADMIN']),
    (req, res, next) => {
        console.log('Request headers:', req.headers);
        // console.log('Request body keys:', Object.keys(req.body));
        next();
    },
    upload.single('audio'),
    validate(uploadTrackSchema),
    uploadTrack
);

router.patch(
    '/:id',
    authenticate,
    requireRole(['ARTIST', 'ADMIN']),
    validate(updateTrackSchema),
    updateTrack
);

router.delete(
    '/:id',
    authenticate,
    requireRole(['ARTIST', 'ADMIN']),
    deleteTrack
);

// Interactions
router.post('/:id/like', authenticate, validate(likeTrackSchema), likeTrack);
router.post('/:id/play', authenticate, logPlay);
router.post('/:id/lyrics', authenticate, validate(lyricsSchema), addLyrics);

module.exports = router;