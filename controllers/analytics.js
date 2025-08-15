const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { ForbiddenError } = require('../utils/error');
const moment = require('moment');

// Get artist-wide analytics
exports.getArtistAnalytics = async (req, res) => {
  const { artistId } = req.params;
  const userId = req.user.id;

  // Verify ownership
  if (req.user.role !== 'ADMIN') {
    const artist = await prisma.artistProfile.findFirst({
      where: { id: artistId, userId }
    });
    if (!artist) throw new ForbiddenError('Not your artist profile');
  }

  // Date ranges
  const sevenDaysAgo = moment().subtract(7, 'days').toDate();
  const thirtyDaysAgo = moment().subtract(30, 'days').toDate();

  // Get all necessary data in parallel
  const [plays, likes, allPlays, tracks] = await Promise.all([
    prisma.playEvent.count({
      where: { track: { artistId } }
    }),
    prisma.like.count({
      where: { track: { artistId } }
    }),
    prisma.playEvent.findMany({
      where: { track: { artistId } },
      include: { user: { select: { country: true } } }
    }),
    prisma.track.findMany({
      where: { artistId },
      include: { 
        _count: { select: { plays: true, likes: true } } 
      }
    })
  ]);

  // Process data in JavaScript
  const uniqueListeners = new Set(allPlays.map(p => p.userId)).size;
  
  const dailyPlays = allPlays.reduce((acc, play) => {
    const date = moment(play.startedAt).format('YYYY-MM-DD');
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const demographics = allPlays.reduce((acc, play) => {
    const country = play.user?.country || 'Unknown';
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {});

  const topTracks = tracks
    .sort((a, b) => b._count.plays - a._count.plays)
    .slice(0, 5)
    .map(track => ({
      id: track.id,
      title: track.title,
      plays: track._count.plays,
      likes: track._count.likes
    }));

  res.json({
    summary: {
      total_plays: plays,
      unique_listeners,
      total_likes: likes
    },
    dailyPlays,
    topTracks,
    demographics,
    timeRange: {
      sevenDays: sevenDaysAgo,
      thirtyDays: thirtyDaysAgo
    }
  });
};

// Get detailed track analytics
exports.getTrackAnalytics = async (req, res) => {
  const { trackId } = req.params;
  const userId = req.user.id;

  // Verify ownership
  if (req.user.role !== 'ADMIN') {
    const track = await prisma.track.findFirst({
      where: { id: trackId, artist: { userId } }
    });
    if (!track) throw new ForbiddenError('Not your track');
  }

  const [plays, likes, allPlays] = await Promise.all([
    prisma.playEvent.count({ where: { trackId } }),
    prisma.like.count({ where: { trackId } }),
    prisma.playEvent.findMany({
      where: { 
        trackId,
        startedAt: { gte: moment().subtract(30, 'days').toDate() } 
      },
      include: { user: { select: { country: true } } }
    })
  ]);

  // Process data
  const playHistory = allPlays.reduce((acc, play) => {
    const date = moment(play.startedAt).format('YYYY-MM-DD');
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const listenerLocations = allPlays.reduce((acc, play) => {
    const country = play.user?.country || 'Unknown';
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {});

  res.json({
    plays,
    likes,
    playHistory,
    listenerLocations
  });
};

// Get listener statistics
exports.getListenerStats = async (req, res) => {
  const { userId } = req.params;

  // Verify access
  if (req.user.role !== 'ADMIN' && req.user.id !== userId) {
    throw new ForbiddenError('Access denied');
  }

  const [plays, allPlays, likedTracks] = await Promise.all([
    prisma.playEvent.count({ where: { userId } }),
    prisma.playEvent.findMany({
      where: { userId },
      include: { 
        track: { 
          include: { 
            artist: true,
            _count: { select: { likes: true } } 
          } 
        } 
      }
    }),
    prisma.like.findMany({
      where: { userId },
      include: { track: true }
    })
  ]);

  // Process data
  const uniqueArtists = new Set(
    allPlays.map(p => p.track.artist.id)
  ).size;

  const uniqueTracks = new Set(
    allPlays.map(p => p.track.id)
  ).size;

  // Top artists
  const artistCounts = allPlays.reduce((acc, play) => {
    const artistId = play.track.artist.id;
    acc[artistId] = {
      artist: play.track.artist,
      count: (acc[artistId]?.count || 0) + 1
    };
    return acc;
  }, {});

  const topArtists = Object.values(artistCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Top genres
  const genreCounts = allPlays.reduce((acc, play) => {
    const genre = play.track.genre || 'Unknown';
    acc[genre] = (acc[genre] || 0) + 1;
    return acc;
  }, {});

  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, count]) => ({ genre, count }));

  res.json({
    total_plays: plays,
    artists_discovered: uniqueArtists,
    unique_tracks: uniqueTracks,
    topArtists,
    topGenres
  });
};

// Get user's streaming history
exports.getStreamingHistory = async (req, res) => {
    const { limit = 50, offset = 0 } = req.query;

    const history = await prisma.playEvent.findMany({
        where: { userId: req.user.id },
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
        orderBy: { startedAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
    });

    res.json(history);
};

// Export analytics data
exports.exportAnalyticsData = async (req, res) => {
    const data = await prisma.playEvent.findMany({
        where: { userId: req.user.id },
        include: {
            track: {
                include: {
                    artist: true
                }
            }
        }
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=analytics-export.json');
    res.send(JSON.stringify(data, null, 2));
};