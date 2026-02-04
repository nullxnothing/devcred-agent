/**
 * Twitter Link Callback
 *
 * This route is used as the callback URL after Twitter OAuth for linking.
 * NextAuth handles the actual callback, this just redirects to the profile.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/wallet-auth';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSessionFromCookie();

    if (session?.walletAddress) {
      return NextResponse.redirect(
        new URL(`/profile/${session.walletAddress}?twitter_linked=true`, request.url)
      );
    }

    // Fallback to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
}
