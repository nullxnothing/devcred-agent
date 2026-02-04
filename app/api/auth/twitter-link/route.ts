/**
 * Twitter Link/Unlink API
 *
 * DELETE /api/auth/twitter-link - Unlink Twitter from current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/wallet-auth';
import { updateUser, getUserById } from '@/lib/db';

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const session = await getSessionFromCookie();

  if (!session?.userId) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  try {
    // Get user to verify they have Twitter linked
    const user = await getUserById(session.userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.twitter_handle) {
      return NextResponse.json(
        { error: 'No X account linked' },
        { status: 400 }
      );
    }

    // Clear Twitter fields
    await updateUser(session.userId, {
      twitter_id: null,
      twitter_handle: null,
      twitter_name: null,
      avatar_url: null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Twitter unlink error:', error);
    return NextResponse.json(
      { error: 'Failed to unlink X account' },
      { status: 500 }
    );
  }
}
