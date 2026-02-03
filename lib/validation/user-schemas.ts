import { z } from 'zod';

export const twitterHandleSchema = z
  .string()
  .min(1, 'Twitter handle is required')
  .max(15, 'Twitter handle must be at most 15 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Twitter handle can only contain letters, numbers, and underscores')
  .transform(handle => handle.replace(/^@/, ''));

export const profileHandleSchema = z
  .string()
  .min(1, 'Profile handle is required')
  .max(50, 'Profile handle must be at most 50 characters');

export const userUpdateSchema = z.object({
  twitter_handle: twitterHandleSchema.optional(),
  twitter_name: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional(),
  pumpfun_username: z.string().max(50).optional(),
});

export const searchQuerySchema = z.object({
  q: z.string().min(2, 'Search query must be at least 2 characters').max(100),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type TwitterHandle = z.infer<typeof twitterHandleSchema>;
export type ProfileHandle = z.infer<typeof profileHandleSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
