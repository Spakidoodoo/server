import { z } from 'zod';

export const createArtistSchema = z.object({
  body: z.object({
  stageName: z.string().min(2).max(50),
  bio: z.string().max(500).optional(),
  })
});

export const updateArtistSchema = z.object({
    body: z.object({
  stageName: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional(),
  coverUrl: z.string().url().optional(),
    })
});

export const followArtistSchema = z.object({
  // No body needed for this endpoint
});