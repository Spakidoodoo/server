const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { uploadImage } = require('../config/cloudinary');
const { NotFoundError, ForbiddenError } = require('../utils/error');
const cloudinary = require('cloudinary').v2;

// Create new album
exports.createAlbum = async (req, res) => {
  const { title, releaseDate } = req.body;
  const artistId = req.user.artistId;
  let coverUrl = null;

  try {
    // Upload cover image if provided
    if (req.file) {
      const result = await uploadImage(req.file.path);
      coverUrl = result.secure_url;
    }

    const album = await prisma.album.create({
      data: {
        title,
        artistId,
        coverUrl,
        releasedAt: releaseDate ? new Date(releaseDate) : null
      }
    });

    res.status(201).json(album);
  } catch (error) {
    console.error('Album creation failed:', error);
    res.status(500).json({ error: 'Failed to create album' });
  }
};

// Get album details
exports.getAlbum = async (req, res) => {
  const { id } = req.params;

  const album = await prisma.album.findUnique({
    where: { id },
    include: {
      artist: {
        select: {
          id: true,
          stageName: true,
          user: { select: { avatarUrl: true } }
        }
      },
      tracks: {
        orderBy: { trackNumber: 'asc' },
        select: {
          id: true,
          title: true,
          durationSec: true,
          trackNumber: true
        }
      }
    }
  });

  if (!album) throw new NotFoundError('Album not found');
  res.json(album);
};

// Update album
exports.updateAlbum = async (req, res) => {
  const { id } = req.params;
  const { title, releaseDate } = req.body;
  const artistId = req.user.artistId;
  let coverUrl;

  // Verify ownership (unless admin)
  if (req.user.role !== 'ADMIN') {
    const album = await prisma.album.findFirst({
      where: { id, artistId }
    });
    if (!album) throw new ForbiddenError('Not your album');
  }

  // Upload new cover if provided
  if (req.file) {
    const result = await uploadImage(req.file.path);
    coverUrl = result.secure_url;
  }

  const updatedAlbum = await prisma.album.update({
    where: { id },
    data: {
      title,
      coverUrl: coverUrl ? coverUrl : undefined,
      releasedAt: releaseDate ? new Date(releaseDate) : undefined
    }
  });

  res.json(updatedAlbum);
};


// Helper function to extract public ID from Cloudinary URL
function extractPublicId(url) {
  const matches = url.match(/upload\/(?:v\d+\/)?([^\.]+)/);
  return matches ? matches[1] : null;
}

exports.deleteAlbum = async (req, res) => {
  const { id } = req.params;
  const artistId = req.user.artistId;

  try {
    // 1. Verify ownership (unless admin)
    const album = await prisma.album.findUnique({
      where: { id }
    });

    if (!album) {
      throw new NotFoundError('Album not found');
    }

    if (req.user.role !== 'ADMIN' && album.artistId !== artistId) {
      throw new ForbiddenError('Not your album');
    }

    // 2. Delete cover from Cloudinary if exists
    if (album.coverUrl) {
      const publicId = extractPublicId(album.coverUrl);
      await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
        invalidate: true
      });
    }

    // 3. Delete album from database
    await prisma.album.delete({ where: { id } });

    res.json({ message: 'Album deleted successfully' });
  } catch (error) {
    console.error('Error deleting album:', error);
    res.status(500).json({ error: 'Failed to delete album' });
  }
};


// Add track to album
exports.addTrackToAlbum = async (req, res) => {
  const { id: albumId } = req.params;
  const { trackId } = req.body;
  const artistId = req.user.artistId;

  // Verify album ownership
  const album = await prisma.album.findFirst({
    where: { id: albumId, artistId }
  });
  if (!album) throw new ForbiddenError('Not your album');

  // Verify track ownership
  const track = await prisma.track.findFirst({
    where: { id: trackId, artistId }
  });
  if (!track) throw new ForbiddenError('Not your track');

  // Get next track number
  const lastTrack = await prisma.track.findFirst({
    where: { albumId },
    orderBy: { trackNumber: 'desc' }
  });
  const trackNumber = lastTrack ? lastTrack.trackNumber + 1 : 1;

  const updatedTrack = await prisma.track.update({
    where: { id: trackId },
    data: { albumId, trackNumber }
  });

  res.json(updatedTrack);
};

// Remove track from album
exports.removeTrackFromAlbum = async (req, res) => {
  const { id: albumId, trackId } = req.params;
  const artistId = req.user.artistId;

  // Verify album ownership
  const album = await prisma.album.findFirst({
    where: { id: albumId, artistId }
  });
  if (!album) throw new ForbiddenError('Not your album');

  // Verify track ownership
  const track = await prisma.track.findFirst({
    where: { id: trackId, artistId }
  });
  if (!track) throw new ForbiddenError('Not your track');

  await prisma.track.update({
    where: { id: trackId },
    data: { albumId: null, trackNumber: null }
  });

  res.json({ message: 'Track removed from album' });
};

// Get artist's albums
exports.getArtistAlbums = async (req, res) => {
  const { artistId } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  const albums = await prisma.album.findMany({
    where: { artistId },
    select: {
      id: true,
      title: true,
      coverUrl: true,
      releasedAt: true,
      _count: { select: { tracks: true } }
    },
    take: parseInt(limit),
    skip: parseInt(offset),
    orderBy: { releasedAt: 'desc' }
  });

  res.json(albums);
};