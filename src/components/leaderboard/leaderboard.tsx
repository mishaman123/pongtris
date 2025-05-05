'use client';

import React, { useState, useEffect } from 'react';
import LeaderboardTable from './leaderboard-table';
import InitialsForm from './initials-form';
import { useLeaderboard } from '@/hooks/use-leaderboard';
import { Button } from '@/components/ui/button';
import { TrophyIcon, ArrowLeftIcon } from 'lucide-react';

interface LeaderboardProps {
  score: number;
  gameOver: boolean;
  onPlayAgain: () => void;
  onShowHome?: () => void;
}

export default function Leaderboard({
  score,
  gameOver,
  onPlayAgain,
  onShowHome
}: LeaderboardProps) {
  const { entries, loading, error, submitScore, isHighScore } = useLeaderboard();
  const [showInitialsForm, setShowInitialsForm] = useState(false);
  const [isHighScoreResult, setIsHighScoreResult] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | undefined>(undefined);
  
  // Check if the score is a high score when the game ends
  useEffect(() => {
    const checkHighScore = async () => {
      if (gameOver && score > 0) {
        const highScore = await isHighScore(score);
        setIsHighScoreResult(highScore);
        if (highScore) {
          setShowInitialsForm(true);
        }
      }
    };
    
    checkHighScore();
  }, [gameOver, score, isHighScore]);
  
  // Handle initials submission
  const handleSubmitInitials = async (initials: string) => {
    setShowInitialsForm(false);
    
    const result = await submitScore(initials, score);
    if (result.success && result.id) {
      setSubmittedId(result.id);
    }
  };
  
  // Handle cancellation of initials submission
  const handleCancelInitials = () => {
    setShowInitialsForm(false);
  };
  
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <TrophyIcon className="text-yellow-500" />
          Leaderboard
        </h2>
        
        {/* Options for returning to home or playing again */}
        <div className="flex gap-2">
          {onShowHome && (
            <Button variant="outline" size="sm" onClick={onShowHome}>
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Home
            </Button>
          )}
          <Button onClick={onPlayAgain} size="sm">Play Again</Button>
        </div>
      </div>
      
      {/* Show score result information */}
      {gameOver && (
        <div className="mb-6 text-center py-4 bg-card rounded-lg shadow">
          <h3 className="text-lg font-medium mb-1">Your Score</h3>
          <p className="text-3xl font-bold">{score.toLocaleString()}</p>
          {isHighScoreResult && !showInitialsForm && (
            <p className="text-sm text-accent mt-1">New high score!</p>
          )}
        </div>
      )}
      
      {/* Display error if there is one */}
      {error && (
        <div className="bg-destructive/10 border border-destructive rounded-md p-3 mb-4">
          <p className="text-destructive">{error}</p>
        </div>
      )}
      
      {/* Display the leaderboard table */}
      <LeaderboardTable 
        entries={entries} 
        loading={loading} 
        highlightId={submittedId} 
      />
      
      {/* Initials submission form */}
      <InitialsForm
        open={showInitialsForm}
        score={score}
        onSubmit={handleSubmitInitials}
        onCancel={handleCancelInitials}
      />
    </div>
  );
} 