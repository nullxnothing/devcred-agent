import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboardData } from '@/lib/data-fetching';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const parsed = parseInt(limitParam || '50', 10);
    const limit = Number.isNaN(parsed) ? 50 : Math.min(100, Math.max(1, parsed));

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
    return NextResponse.json(
      {
        leaderboard: [],
        total: 0,
        updatedAt: new Date().toISOString(),
        degraded: true,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=30',
        },
      }
    );
  }
}
