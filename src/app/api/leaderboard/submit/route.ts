import { NextRequest, NextResponse } from 'next/server';
import { addScore, isHighScore } from '@/lib/leaderboard';

// Required for static export - REMOVED
// export const dynamic = "force-static";

// POST handler for submitting a new score
export async function POST(req: NextRequest) {
  try {
    // Get the submitted score data from the request body
    const { initials, score } = await req.json();
    
    // Validate the input
    if (!initials || typeof initials !== 'string' || initials.length === 0) {
      return NextResponse.json(
        { error: 'Initials are required' },
        { status: 400 }
      );
    }
    
    if (typeof score !== 'number' || score < 0) {
      return NextResponse.json(
        { error: 'Valid score is required' },
        { status: 400 }
      );
    }
    
    // Check if the score is a high score
    const highScore = await isHighScore(score);
    
    // If it's not a high score, return early
    if (!highScore) {
      return NextResponse.json({ success: false, highScore: false });
    }
    
    // Add the score to the leaderboard
    const id = await addScore({ initials, score });
    
    // Return success with the ID of the new entry
    return NextResponse.json({ 
      success: true, 
      highScore: true,
      id 
    });
  } catch (error) {
    console.error('Error in POST /api/leaderboard/submit:', error);
    return NextResponse.json(
      { error: 'Failed to submit score' },
      { status: 500 }
    );
  }
} 