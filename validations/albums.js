const { z } = require('zod');

exports.createAlbumSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(100),
    releaseDate: z.string().datetime().optional()
  })
});

exports.updateAlbumSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(100).optional(),
    releaseDate: z.string().datetime().optional()
  }).refine(data => Object.values(data).some(val => val !== undefined), {
    message: "At least one field must be provided"
  })
});

exports.albumTrackSchema = z.object({
  body: z.object({
    trackId: z.string().min(1)
  })
});