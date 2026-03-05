import { z } from 'zod';

const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export const solanaAddressSchema = z
  .string()
  .min(32, 'Solana address must be at least 32 characters')
  .max(44, 'Solana address must be at most 44 characters')
  .regex(SOLANA_ADDRESS_REGEX, 'Invalid Solana address format');

export const walletNonceRequestSchema = z.object({
  walletAddress: solanaAddressSchema,
});

export const walletVerifyRequestSchema = z.object({
  walletAddress: solanaAddressSchema,
  signature: z.string().min(1, 'Signature is required'),
});

export const walletConnectRequestSchema = z.object({
  walletAddress: solanaAddressSchema,
  userId: z.string().uuid().optional(),
});

export type WalletNonceRequest = z.infer<typeof walletNonceRequestSchema>;
export type WalletVerifyRequest = z.infer<typeof walletVerifyRequestSchema>;
export type WalletConnectRequest = z.infer<typeof walletConnectRequestSchema>;
