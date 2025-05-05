'use client';

import { useState, useCallback, useEffect } from 'react';
import { LeaderboardEntry } from '@/lib/leaderboard';

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
  
  // Fetch leaderboard entries
  const refreshLeaderboard = useCallback(async (count = 10) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/leaderboard?count=${count}`);
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      
      const data = await response.json();
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Submit a new score
  const submitScore = useCallback(async (initials: string, score: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/leaderboard/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ initials, score }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit score');
      }
      
      const result = await response.json();
      
      // If the submission was successful, refresh the leaderboard
      if (result.success) {
        await refreshLeaderboard();
      }
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Error submitting score:', err);
      return { success: false, highScore: false };
    } finally {
      setLoading(false);
    }
  }, [refreshLeaderboard]);
  
  // Check if a score is a high score
  const isHighScore = useCallback(async (score: number) => {
    if (entries.length < 10) return true;
    
    return score > (entries[entries.length - 1]?.score || 0);
  }, [entries]);
  
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