import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError } from '../utils/error.js';

// Create artist profile (upgrade from listener)
export const createArtistProfile = async (req, res) => {
  try {
    console.log('Creating artist profile for user:', req.user?.id);
    const { stageName, bio } = req.body;
    
    const userId = req.user?.id;  
 
    // Check if user already has an artist profile
    const existingArtist = await prisma.artistProfile.findUnique({
      where: { userId },
    });

    if (existingArtist) {
      throw new ForbiddenError('Artist profile already exists');
    }

    // Create artist profile and update user role
    const [artist] = await prisma.$transaction([
      prisma.artistProfile.create({
        data: {
          stageName,
          bio,
          user: { connect: { id: userId } },
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { role: 'ARTIST' },
      }),
    ]);

    res.status(201).json(artist);
  } catch (error) {
    console.error('Error creating artist profile:', error);
    
    if (error instanceof ForbiddenError) {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get artist public profile
export const getArtistProfile = async (req, res) => {
  const { id } = req.params;

  const artist = await prisma.artistProfile.findUnique({
    where: { id },
    select: {
      id: true,
      stageName: true,
      bio: true,
      coverUrl: true,
      labelSigned: true,
      user: { select: { displayName: true, avatarUrl: true } },
      _count: {
        select: { followers: true, tracks: true, albums: true },
      },
    },
  });

  if (!artist) {
    throw new NotFoundError('Artist not found');
  }

  res.json(artist);
};

// Update artist profile
export const updateArtistProfile = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const { stageName, bio, coverUrl } = req.body;

  // Verify ownership (unless admin)
  if (req.user?.role !== 'ADMIN') {
    const artist = await prisma.artistProfile.findUnique({
      where: { id, userId },
    });
    if (!artist) throw new ForbiddenError('Not your artist profile');
  }

  const updatedArtist = await prisma.artistProfile.update({
    where: { id },
    data: { stageName, bio, coverUrl },
  });

  res.json(updatedArtist);
};

// Follow/unfollow artist
export const followArtist = async (req, res) => {
  const { id: artistId } = req.params;
  const userId = req.user?.id;

  // Check if artist exists
  const artist = await prisma.artistProfile.findUnique({
    where: { id: artistId },
  });
  if (!artist) throw new NotFoundError('Artist not found');

  // Toggle follow
  const existingFollow = await prisma.follow.findFirst({
    where: { followerId: userId, artistId },
  });

  if (existingFollow) {
    await prisma.follow.delete({ where: { id: existingFollow.id } });
    res.json({ followed: false });
  } else {
    await prisma.follow.create({
      data: { followerId: userId, artistId },
    });
    res.json({ followed: true });
  }
};

// Get artist's tracks
export const getArtistTracks = async (req, res) => {
  const { id } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  const tracks = await prisma.track.findMany({
    where: { artistId: id, visibility: 'PUBLIC' },
    select: {
      id: true,
      title: true,
      durationSec: true,
      coverUrl: true,
      genre: true,
      _count: { select: { likes: true, plays: true } },
    },
    take: Number(limit),
    skip: Number(offset),
    orderBy: { createdAt: 'desc' },
  });

  res.json(tracks);
};

// Get artist's albums
export const getArtistAlbums = async (req, res) => {
  const { id } = req.params;
  const { limit = 10, offset = 0 } = req.query;

  const albums = await prisma.album.findMany({
    where: { artistId: id },
    select: {
      id: true,
      title: true,
      coverUrl: true,
      releasedAt: true,
      _count: { select: { tracks: true } },
    },
    take: Number(limit),
    skip: Number(offset),
    orderBy: { releasedAt: 'desc' },
  });

  res.json(albums);
};