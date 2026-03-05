/**
 * Additional Zod schemas for API validation
 */

import { z } from 'zod';
import { solanaAddressSchema } from './wallet-schemas';

// Pagination parameters
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Mint address parameter
export const mintAddressSchema = z.object({
  mintAddress: solanaAddressSchema,
});

// Wallet parameter (for URL params)
export const walletParamSchema = z.object({
  wallet: solanaAddressSchema,
});

// Address parameter (generic, for URL params)
export const addressParamSchema = z.object({
  address: solanaAddressSchema,
});

// Leaderboard query parameters
export const leaderboardQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  tier: z.string().optional(),
});

// Type exports
export type PaginationParams = z.infer<typeof paginationSchema>;
export type MintAddress = z.infer<typeof mintAddressSchema>;
export type WalletParam = z.infer<typeof walletParamSchema>;
export type AddressParam = z.infer<typeof addressParamSchema>;
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;
