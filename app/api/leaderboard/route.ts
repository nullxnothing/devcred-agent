import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboardData } from '@/lib/data-fetching';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = Math.min(100, Math.max(1, parseInt(limitParam || '50', 10)));

    const leaderboard = await getLeaderboardData(limit);

    return NextResponse.json(
      {
        leaderboard,
        total: leaderboard.length,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
