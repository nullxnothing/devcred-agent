/**
 * Standardized API response helpers
 * Provides consistent response format across all endpoints
 */

import { NextResponse } from 'next/server';
import { handleApiError, AppError, ValidationError, UnauthorizedError, NotFoundError, RateLimitError } from './errors';
import type { RateLimitResult } from './api-rate-limiter';
import { rateLimitHeaders } from './api-rate-limiter';

// === Success Responses ===

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function apiCreated<T>(data: T): NextResponse {
  return NextResponse.json({ data }, { status: 201 });
}

export function apiNoContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function apiOk<T>(response: T, status = 200): NextResponse {
  return NextResponse.json(response, { status });
}

// === Error Responses (wraps handleApiError) ===

export function apiError(error: unknown): NextResponse {
  return handleApiError(error);
}

export function apiBadRequest(message: string, details?: unknown): NextResponse {
  return handleApiError(new ValidationError(message, details));
}

export function apiUnauthorized(message?: string): NextResponse {
  return handleApiError(new UnauthorizedError(message));
}

export function apiNotFound(resource: string, id?: string): NextResponse {
  const msg = id ? `${resource} '${id}' not found` : `${resource} not found`;
  return handleApiError(new NotFoundError(msg));
}

export function apiForbidden(message: string): NextResponse {
  return handleApiError(new AppError('FORBIDDEN', message));
}

export function apiConflict(message: string): NextResponse {
  return handleApiError(new AppError('CONFLICT', message));
}

export function apiRateLimited(rateLimit: RateLimitResult, message?: string): NextResponse {
  const response = handleApiError(new RateLimitError(message || 'Too many requests. Please try again later.'));
  const headers = rateLimitHeaders(rateLimit);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export function apiInternalError(message?: string): NextResponse {
  return handleApiError(new AppError('INTERNAL_ERROR', message || 'An unexpected error occurred'));
}

// === Cache Headers Helper ===

export function withCache(
  response: NextResponse,
  maxAge: number,
  staleWhileRevalidate?: number
): NextResponse {
  const cacheControl = staleWhileRevalidate
    ? `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
    : `public, max-age=${maxAge}`;
  response.headers.set('Cache-Control', cacheControl);
  return response;
}

export function withPrivateCache(response: NextResponse, maxAge: number): NextResponse {
  response.headers.set('Cache-Control', `private, max-age=${maxAge}`);
  return response;
}

export function withNoCache(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}

// === Deprecation Header Helper ===

export function withDeprecation(response: NextResponse, message: string): NextResponse {
  response.headers.set('X-Deprecated', message);
  response.headers.set('Deprecation', 'true');
  return response;
}
