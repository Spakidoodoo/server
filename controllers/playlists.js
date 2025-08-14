const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { NotFoundError, ForbiddenError } = require('../utils/error');

// Create a new playlist
exports.createPlaylist = async (req, res) => {
  const { title, isPublic = true } = req.body;
  const userId = req.user.id;

  const playlist = await prisma.playlist.create({
    data: {
      title,
      isPublic,
      ownerId: userId
    }
  });

  res.status(201).json(playlist);
};

// Get playlist details
exports.getPlaylist = async (req, res) => {
  const { id } = req.params;

  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true
        }
      },
      items: {
        include: {
          track: {
            include: {
              artist: {
                select: {
                  id: true,
                  stageName: true
                }
              }
            }
          }
        },
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!playlist || (!playlist.isPublic && playlist.ownerId !== req.user?.id)) {
    throw new NotFoundError('Playlist not found');
  }

  res.json(playlist);
};

// Update playlist
exports.updatePlaylist = async (req, res) => {
  const { id } = req.params;
  const { title, isPublic } = req.body;
  const userId = req.user.id;

  // Verify ownership
  const playlist = await prisma.playlist.findFirst({
    where: { id, ownerId: userId }
  });
  if (!playlist) throw new ForbiddenError('Not your playlist');

  const updatedPlaylist = await prisma.playlist.update({
    where: { id },
    data: { title, isPublic }
  });

  res.json(updatedPlaylist);
};

// Delete playlist
exports.deletePlaylist = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Verify ownership
  const playlist = await prisma.playlist.findFirst({
    where: { id, ownerId: userId }
  });
  if (!playlist) throw new ForbiddenError('Not your playlist');

  await prisma.playlist.delete({ where: { id } });
  res.json({ message: 'Playlist deleted' });
};

// Add track to playlist
exports.addTrackToPlaylist = async (req, res) => {
  const { id: playlistId } = req.params;
  const { trackId } = req.body;
  const userId = req.user.id;

  // Verify playlist ownership
  const playlist = await prisma.playlist.findFirst({
    where: { id: playlistId, ownerId: userId }
  });
  if (!playlist) throw new ForbiddenError('Not your playlist');

  // Verify track exists
  const track = await prisma.track.findUnique({
    where: { id: trackId }
  });
  if (!track) throw new NotFoundError('Track not found');

  // Get current max order to append at end
  const lastItem = await prisma.playlistTrack.findFirst({
    where: { playlistId },
    orderBy: { order: 'desc' }
  });
  const newOrder = lastItem ? lastItem.order + 1 : 0;

  const playlistItem = await prisma.playlistTrack.create({
    data: {
      playlistId,
      trackId,
      order: newOrder,
      addedAt: new Date()
    },
    include: { track: true }
  });

  res.status(201).json(playlistItem);
};

// Remove track from playlist
exports.removeTrackFromPlaylist = async (req, res) => {
  const { id: playlistId, trackId } = req.params;
  const userId = req.user.id;

  // Verify playlist ownership
  const playlist = await prisma.playlist.findFirst({
    where: { id: playlistId, ownerId: userId }
  });
  if (!playlist) throw new ForbiddenError('Not your playlist');

  await prisma.playlistTrack.deleteMany({
    where: { playlistId, trackId }
  });

  res.json({ message: 'Track removed from playlist' });
};

// Get user's playlists
exports.getUserPlaylists = async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user.id;

  // Only show private playlists to owner
  const where = {
    ownerId: userId,
    OR: [
      { isPublic: true },
      ...(userId === currentUserId ? [{ isPublic: false }] : [])
    ]
  };

  const playlists = await prisma.playlist.findMany({
    where,
    select: {
      id: true,
      title: true,
      isPublic: true,
      _count: { select: { items: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json(playlists);
};