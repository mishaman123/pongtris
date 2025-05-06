'use client';

import { useState, useCallback, useEffect } from 'react';
import { LeaderboardEntry, getTopScores, addScore as addScoreToDb } from '@/lib/leaderboard';

export interface UseLeaderboardProps {
  initialEntries?: LeaderboardEntry[];
}

export interface UseLeaderboardReturn {
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  refreshLeaderboard: () => Promise<void>;
  submitScore: (initials: string, score: number) => Promise<{ success: boolean; highScore: boolean; id?: string }>;
  isHighScore: (score: number) => Promise<boolean>;
}

export function useLeaderboard({ initialEntries = [] }: UseLeaderboardProps = {}): UseLeaderboardReturn {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialEntries);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch leaderboard entries directly from Firestore
  const refreshLeaderboard = useCallback(async (count = 10) => {
    setLoading(true);
    setError(null);
    
    try {
      // Directly call getTopScores
      const data = await getTopScores(count);
      setEntries(data);
    } catch (err) {
      // Use more specific error messages if possible, or keep generic
      setError(err instanceof Error ? `Firestore Error: ${err.message}` : 'Failed to fetch leaderboard');
      console.error('Error fetching leaderboard directly:', err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Submit a new score directly to Firestore
  const submitScore = useCallback(async (initials: string, score: number) => {
    setLoading(true);
    setError(null);
    
    try {
      // First, check if it's a high score (using local state or re-fetching)
      // The isHighScore logic below relies on the current `entries` state.
      // For more robustness, you might call getTopScores again here if needed.
      const currentTopScores = entries.length > 0 ? entries : await getTopScores(); 
      const highScore = score > 0 && (currentTopScores.length < 10 || score > (currentTopScores[currentTopScores.length - 1]?.score || 0));

      if (!highScore) {
        return { success: false, highScore: false };
      }

      // Directly call addScoreToDb (renamed to avoid conflict)
      const id = await addScoreToDb({ initials, score });
      
      if (!id) {
        throw new Error('Failed to add score to database');
      }
      
      // Submission was successful, refresh the leaderboard to show the new score
      await refreshLeaderboard();
      
      // Return success including the new ID
      return { success: true, highScore: true, id };

    } catch (err) {
      // Use more specific error messages if possible, or keep generic
      setError(err instanceof Error ? `Firestore Error: ${err.message}` : 'Failed to submit score');
      console.error('Error submitting score directly:', err);
      return { success: false, highScore: false };
    } finally {
      setLoading(false);
    }
  }, [entries, refreshLeaderboard]);
  
  // Check if a score is a high score based on current state
  // Note: This might be slightly stale if leaderboard updated elsewhere.
  // Consider if a direct check against Firestore is needed in `submitScore` 
  // for absolute certainty before writing.
  const isHighScore = useCallback(async (score: number) => {
    // Optimization: If we haven't loaded entries yet, fetch them first.
    // This prevents prematurely returning true if entries are empty only because loading is pending.
    const currentEntries = entries.length === 0 ? await getTopScores() : entries;
    if (entries.length === 0 && currentEntries.length > 0) {
      setEntries(currentEntries); // Update state if we fetched fresh
    }

    if (currentEntries.length < 10) return true;
    return score > (currentEntries[currentEntries.length - 1]?.score || 0);
  }, [entries]); // Dependency remains on entries, but logic fetches if empty
  
  // Initialize leaderboard on mount
  useEffect(() => {
    if (initialEntries.length === 0) {
      refreshLeaderboard();
    }
  }, [initialEntries.length, refreshLeaderboard]);
  
  return {
    entries,
    loading,
    error,
    refreshLeaderboard,
    submitScore,
    isHighScore,
  };
} 