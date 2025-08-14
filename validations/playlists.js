const { z } = require('zod');

exports.createPlaylistSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(100),
    isPublic: z.boolean().default(true)
  })
});

exports.updatePlaylistSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(100).optional(),
    isPublic: z.boolean().optional()
  }).refine(data => Object.values(data).some(val => val !== undefined), {
    message: "At least one field must be provided"
  })
});

exports.playlistItemSchema = z.object({
  body: z.object({
    trackId: z.string().min(1)
  })
});