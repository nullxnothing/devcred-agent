/**
 * Update user's pump.fun username
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/wallet-auth';
import { updateUser, getUserByPumpFunUsername } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { username } = await request.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Validate username format (alphanumeric, underscores, 3-50 chars)
    const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: 'Invalid username format. Use 3-50 alphanumeric characters and underscores only.' },
        { status: 400 }
      );
    }

    // Check if username is already taken
    const existingUser = await getUserByPumpFunUsername(username);
    if (existingUser && existingUser.id !== user.id) {
      return NextResponse.json(
        { error: 'This pump.fun username is already linked to another account' },
        { status: 409 }
      );
    }

    // Update user
    const updatedUser = await updateUser(user.id, {
      pumpfun_username: username,
    });

    return NextResponse.json({
      success: true,
      message: 'Pump.fun username updated successfully',
      username: updatedUser?.pumpfun_username,
    });
  } catch (error) {
    console.error('Error updating pump.fun username:', error);
    return NextResponse.json(
      { error: 'Failed to update username' },
      { status: 500 }
    );
  }
}

// Get current user's pump.fun username
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      username: user.pumpfun_username,
    });
  } catch (error) {
    console.error('Error getting pump.fun username:', error);
    return NextResponse.json(
      { error: 'Failed to get username' },
      { status: 500 }
    );
  }
}
