import { z } from 'zod';
import { solanaAddressSchema } from './wallet-schemas';

export const tokenMintSchema = solanaAddressSchema.describe('Token mint address');

export const tokenLookupRequestSchema = z.object({
  mint: tokenMintSchema,
});

export const tokenClaimRequestSchema = z.object({
  mintAddress: tokenMintSchema,
  walletAddress: solanaAddressSchema,
});

export const tokenMetadataSchema = z.object({
  rug_severity: z.enum(['soft', 'hard']).nullable().optional(),
  creation_verified: z.boolean().optional(),
  creation_signature: z.string().optional(),
  creation_method: z.string().optional(),
  dev_sell_percent: z.number().min(0).max(100).optional(),
});

export type TokenLookupRequest = z.infer<typeof tokenLookupRequestSchema>;
export type TokenClaimRequest = z.infer<typeof tokenClaimRequestSchema>;
export type TokenMetadata = z.infer<typeof tokenMetadataSchema>;

export function isValidTokenMetadata(value: unknown): value is TokenMetadata {
  return tokenMetadataSchema.safeParse(value).success;
}
