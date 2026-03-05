/**
 * Update user's pump.fun username
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/wallet-auth';
import { updateUser, getUserByPumpFunUsername } from '@/lib/db';
import { apiOk, apiConflict, apiError } from '@/lib/api-response';
import { requireWalletAuth } from '@/lib/api-auth';
import { z } from 'zod';
import { validateBody } from '@/lib/api-validation';

const pumpfunUsernameSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Use alphanumeric characters and underscores only'),
});

export async function POST(request: NextRequest) {
  try {
    // Require wallet auth
    const auth = await requireWalletAuth();
    if (auth.error) return auth.error;

    // Validate request body
    const validation = await validateBody(request, pumpfunUsernameSchema);
    if (validation.error) return validation.error;
    const { username } = validation.data;

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return apiError(new Error('User not found'));
    }

    // Check if username is already taken
    const existingUser = await getUserByPumpFunUsername(username);
    if (existingUser && existingUser.id !== user.id) {
      return apiConflict('This pump.fun username is already linked to another account');
    }

    // Update user
    const updatedUser = await updateUser(user.id, {
      pumpfun_username: username,
    });

    return apiOk({
      success: true,
      message: 'Pump.fun username updated successfully',
      username: updatedUser?.pumpfun_username,
    });
  } catch (error) {
    console.error('Error updating pump.fun username:', error);
    return apiError(error);
  }
}

export async function GET() {
  try {
    // Require wallet auth
    const auth = await requireWalletAuth();
    if (auth.error) return auth.error;

    const user = await getCurrentUser();
    if (!user) {
      return apiError(new Error('User not found'));
    }

    return apiOk({
      username: user.pumpfun_username,
    });
  } catch (error) {
    console.error('Error getting pump.fun username:', error);
    return apiError(error);
  }
}
