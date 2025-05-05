'use client';

import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { LeaderboardEntry } from '@/lib/leaderboard';
import { formatDistanceToNow } from 'date-fns';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  loading?: boolean;
  highlightId?: string; // Optional ID to highlight (e.g., newly added score)
}

export default function LeaderboardTable({ 
  entries, 
  loading = false,
  highlightId
}: LeaderboardTableProps) {
  // Create placeholder rows when loading
  const placeholderRows = Array.from({ length: 10 }, (_, i) => i);
  
  return (
    <div className="w-full overflow-hidden">
      <Table>
        <TableCaption>Top 10 Pongtris Scores</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Rank</TableHead>
            <TableHead className="w-[100px]">Initials</TableHead>
            <TableHead>Score</TableHead>
            <TableHead className="text-right">When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            placeholderRows.map((index) => (
              <TableRow key={`placeholder-${index}`}>
                <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
              </TableRow>
            ))
          ) : entries.length > 0 ? (
            entries.map((entry, index) => (
              <TableRow 
                key={entry.id || index} 
                className={entry.id === highlightId ? 'bg-accent/30' : undefined}
              >
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell className="font-bold">{entry.initials}</TableCell>
                <TableCell>{entry.score.toLocaleString()}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {entry.date ? formatDistanceToNow(new Date(entry.date), { addSuffix: true }) : 'Just now'}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                No scores yet. Be the first!
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
} 