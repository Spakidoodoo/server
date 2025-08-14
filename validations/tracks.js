const { z } = require('zod');

exports.uploadTrackSchema = z.object({
    body: z.object({
        title: z.string().min(1).max(100),
        genre: z.string().max(50),
        albumId: z.string().optional(), 
        visibility: z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE']).default('PUBLIC'),
    })
});

exports.updateTrackSchema = z.object({
    body: z.object({
        title: z.string().min(1).max(100).optional(),
        genre: z.string().max(50).optional(),
        visibility: z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE']).optional(),
    }).refine(data => Object.values(data).some(val => val !== undefined), {
        message: "At least one field must be provided"
    })
});

exports.likeTrackSchema = z.object({}); // No body needed

exports.lyricsSchema = z.object({
    body: z.object({
    content: z.string().min(50).max(5000),
    })
});