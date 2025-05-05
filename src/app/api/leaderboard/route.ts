import { NextRequest, NextResponse } from 'next/server';
import { getTopScores } from '@/lib/leaderboard';

// GET handler for fetching top scores
export async function GET(req: NextRequest) {
  try {
    // Get the requested count of scores from the query parameters or default to 10
    const searchParams = req.nextUrl.searchParams;
    const count = parseInt(searchParams.get('count') || '10', 10);
    
    // Get the top scores
    const scores = await getTopScores(count);
    
    // Return the scores as JSON
    return NextResponse.json(scores);
  } catch (error) {
    console.error('Error in GET /api/leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
} 