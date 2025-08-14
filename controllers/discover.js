const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get editor-curated picks
exports.getEditorPicks = async (req, res) => {
  try {
    const tracks = await prisma.track.findMany({
      where: { 
        visibility: 'PUBLIC',
        editorPick: true 
      },
      include: {
        artist: {
          select: {
            id: true,
            stageName: true
          }
        }
      },
      take: 20,
      orderBy: { createdAt: 'desc' }
    });
    res.json(tracks);
  } catch (error) {
      console.log('Error fetching editor picks:', error);
    res.status(500).json({ error: 'Failed to load editor picks' });

  }
};

// Get trending tracks (most plays in last 7 days)
exports.getTrendingTracks = async (req, res) => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  try {
    const tracks = await prisma.track.findMany({
      where: { 
        visibility: 'PUBLIC',
        plays: {
          some: {
            startedAt: { gte: oneWeekAgo }
          }
        }
      },
      include: {
        artist: {
          select: {
            id: true,
            stageName: true
          }
        },
        _count: {
          select: { plays: true }
        }
      },
      take: 20,
      orderBy: {
        plays: {
          _count: 'desc'
        }
      }
    });
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load trending tracks' });
  }
};

// Get newly released tracks
exports.getNewReleases = async (req, res) => {
  try {
    const tracks = await prisma.track.findMany({
      where: { visibility: 'PUBLIC' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        artist: {
          select: {
            id: true,
            stageName: true
          }
        }
      }
    });
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load new releases' });
  }
};

// Get personalized recommendations
exports.getRecommendedTracks = async (req, res) => {
  try {
    let whereClause = { visibility: 'PUBLIC' };
    
    // Personalize if user is logged in
    if (req.user) {
      const userGenres = await getUserTopGenres(req.user.id);
      if (userGenres.length > 0) {
        whereClause.genre = { in: userGenres };
      }
    }

    const tracks = await prisma.track.findMany({
      where: whereClause,
      orderBy: { plays: { _count: 'desc' } },
      take: 20,
      include: {
        artist: {
          select: {
            id: true,
            stageName: true
          }
        }
      }
    });
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load recommendations' });
  }
};

// Get tracks by genre
exports.getGenreFeed = async (req, res) => {
  const { genre } = req.params;
  
  try {
    const tracks = await prisma.track.findMany({
      where: { 
        visibility: 'PUBLIC',
        genre: genre.toLowerCase() 
      },
      orderBy: { plays: { _count: 'desc' } },
      take: 20,
      include: {
        artist: {
          select: {
            id: true,
            stageName: true
          }
        }
      }
    });
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load genre feed' });
  }
};

// Helper: Get user's top 3 genres
async function getUserTopGenres(userId) {
  const genres = await prisma.track.groupBy({
    by: ['genre'],
    where: {
      likes: {
        some: { userId }
      }
    },
    _count: {
      genre: true
    },
    orderBy: {
      _count: {
        genre: 'desc'
      }
    },
    take: 3
  });
  return genres.map(g => g.genre).filter(Boolean);
}