/**
 * Request validation middleware helpers
 * Combines Zod schemas with route handlers for type-safe validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { apiBadRequest } from './api-response';

type ValidationSuccess<T> = { data: T; error?: never };
type ValidationError = { data?: never; error: NextResponse };
type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

/**
 * Validates request body against a Zod schema
 * Returns typed data or error response
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { data };
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      return { error: apiBadRequest('Validation failed', details) };
    }
    if (err instanceof SyntaxError) {
      return { error: apiBadRequest('Invalid JSON body') };
    }
    return { error: apiBadRequest('Failed to parse request body') };
  }
}

/**
 * Validates URL path params against a Zod schema
 * Returns typed data or error response
 */
export function validateParams<T>(
  params: Record<string, string>,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const data = schema.parse(params);
    return { data };
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      return { error: apiBadRequest('Invalid URL parameters', details) };
    }
    return { error: apiBadRequest('Failed to validate URL parameters') };
  }
}

/**
 * Validates URL search params against a Zod schema
 * Returns typed data or error response
 */
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    const data = schema.parse(params);
    return { data };
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      return { error: apiBadRequest('Invalid query parameters', details) };
    }
    return { error: apiBadRequest('Failed to validate query parameters') };
  }
}

/**
 * Helper to get client IP from request headers
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
