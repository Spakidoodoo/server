const cloudinary = require('cloudinary').v2;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { uploadAudio, uploadImage } = require('../config/cloudinary.js');
const { NotFoundError, ForbiddenError } = require('../utils/error.js');

// Upload a new track
exports.uploadTrack = async (req, res) => {
  try {
    const { title, genre, albumId, visibility = 'PUBLIC' } = req.body;
    const audioFile = req.file; // From Multer

    // Upload audio to Cloudinary
    const audioResult = await uploadAudio(audioFile.path);
    
    // Create track in DB
    const track = await prisma.track.create({
      data: {
        title,
        genre,
        audioUrl: audioResult.secure_url,
        artistId: req.user.artistId,
        albumId: albumId || null,
        visibility,
      },
      include: { artist: true },
    });

    res.status(201).json(track);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
};

// Get single track
exports.getTrack = async (req, res) => {
  try {
    const { id } = req.params;

    const track = await prisma.track.findUnique({
      where: { id },
      include: {
        artist: { select: { id: true, stageName: true } },
        album: { select: { id: true, title: true } },
        lyrics: { select: { content: true } },
      },
    });

    if (!track || (track.visibility !== 'PUBLIC' && !req.user?.isAdmin)) {
      throw new NotFoundError('Track not found');
    }

    res.json(track);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch track' });
  }
};

// List tracks (filterable)
exports.getTracks = async (req, res) => {
  try {
    const { artistId, albumId, genre, search, limit = 20, offset = 0 } = req.query;

    const tracks = await prisma.track.findMany({
      where: {
        visibility: 'PUBLIC',
        ...(artistId && { artistId }),
        ...(albumId && { albumId }),
        ...(genre && { genre }),
        ...(search && { title: { contains: search, mode: 'insensitive' } }),
      },
      select: {
        id: true,
        title: true,
        durationSec: true,
        coverUrl: true,
        genre: true,
        artist: { select: { id: true, stageName: true } },
        _count: { select: { likes: true, plays: true } },
      },
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { createdAt: 'desc' },
    });

    res.json(tracks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
};

// Update track metadata
exports.updateTrack = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, genre, visibility } = req.body;

    // Verify ownership (unless admin)
    if (req.user.role !== 'ADMIN') {
      const track = await prisma.track.findFirst({
        where: { id, artistId: req.user.artistId },
      });
      if (!track) throw new ForbiddenError('Not your track');
    }

    const updatedTrack = await prisma.track.update({
      where: { id },
      data: { title, genre, visibility },
    });

    res.json(updatedTrack);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return res.status(403).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to update track' });
  }
};

// Delete track
exports.deleteTrack = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Get the track first to extract Cloudinary public_id
    const track = await prisma.track.findUnique({ where: { id } });
    if (!track) throw new NotFoundError('Track not found');

    // 2. Delete from Cloudinary using the public_id (extracted from URL)
    const publicId = track.audioUrl.split('/').slice(-2).join('/').split('.')[0];
    await cloudinary.uploader.destroy(publicId, { 
      resource_type: 'video' // Required for audio files
    });

    // 3. Delete from database
    await prisma.track.delete({ where: { id } });

    res.json({ success: true });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    console.error('Deletion error:', err);
    res.status(500).json({ error: 'Deletion failed' });
  }
};

// Like/unlike track
exports.likeTrack = async (req, res) => {
  try {
    const { id: trackId } = req.params;
    const userId = req.user.id;

    const existingLike = await prisma.like.findFirst({
      where: { userId, trackId },
    });

    if (existingLike) {
      await prisma.like.delete({ where: { id: existingLike.id } });
      res.json({ liked: false });
    } else {
      await prisma.like.create({ data: { userId, trackId } });
      res.json({ liked: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update like status' });
  }
};

// Log a play event
exports.logPlay = async (req, res) => {
  try {
    const { id: trackId } = req.params;
    const userId = req.user.id;

    await prisma.playEvent.create({
      data: { trackId, userId },
    });

    res.json({ message: 'Play logged' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to log play' });
  }
};

// Add/update lyrics
exports.addLyrics = async (req, res) => {
  try {
    const { id: trackId } = req.params;
    const { content } = req.body;

    // Verify ownership (unless admin)
    if (req.user.role !== 'ADMIN') {
      const track = await prisma.track.findFirst({
        where: { id: trackId, artistId: req.user.artistId },
      });
      if (!track) throw new ForbiddenError('Not your track');
    }

    const lyrics = await prisma.lyric.upsert({
      where: { trackId },
      update: { content },
      create: { trackId, content },
    });

    res.json(lyrics);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return res.status(403).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to update lyrics' });
  }
};