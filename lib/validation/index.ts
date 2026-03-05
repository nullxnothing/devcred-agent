// Validation schemas barrel file

export * from './wallet-schemas';
export * from './user-schemas';
export * from './token-schemas';
export * from './api-schemas';

import { z } from 'zod';

/**
 * Parse and validate request body with Zod schema
 * Throws ZodError on validation failure
 */
export async function parseRequestBody<T extends z.ZodSchema>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  const body = await request.json();
  return schema.parse(body);
}

/**
 * Parse and validate URL search params with Zod schema
 * Throws ZodError on validation failure
 */
export function parseSearchParams<T extends z.ZodSchema>(
  searchParams: URLSearchParams,
  schema: T
): z.infer<T> {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return schema.parse(params);
}

/**
 * Safe parse that returns Result type instead of throwing
 */
export function safeParse<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
