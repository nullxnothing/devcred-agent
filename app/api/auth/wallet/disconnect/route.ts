/**
 * Logout / disconnect wallet session
 */

import { NextResponse } from 'next/server';
import { clearSessionCookie, getSessionFromCookie } from '@/lib/wallet-auth';

export async function POST() {
  try {
    // Check if user has a session
    const session = await getSessionFromCookie();
    
    if (!session) {
      return NextResponse.json(
        { success: true, message: 'No active session' }
      );
    }

    // Clear the session cookie
    await clearSessionCookie();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Error during logout:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
