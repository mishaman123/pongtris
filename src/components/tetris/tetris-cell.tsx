
import React from 'react';
import { cn } from '@/lib/utils';
import { TETROMINOS } from './constants';

interface TetrisCellProps {
  type: string | number;
}

const TetrisCell: React.FC<TetrisCellProps> = ({ type }) => {
  // Determine color based on type. If type is a number (0), it's clear. If string, get color from TETROMINOS.
  const color = type === 0 || type === 'clear' ? 'bg-background/80' : TETROMINOS[type as string]?.color || 'bg-background/80';
  const borderClass = type === 0 || type === 'clear' ? 'border-gray-700/50' : 'border-black/20';

  return (
    <div
      className={cn(
        'w-auto aspect-square border', // Use aspect-square to maintain ratio
        color,
        borderClass
      )}
      style={{ boxShadow: type !== 0 && type !== 'clear' ? 'inset 2px 2px 2px 0px rgba(255,255,255,0.2), inset -2px -2px 2px 0px rgba(0,0,0,0.2)' : 'none' }} // Add subtle 3D effect
    />
  );
};


// Memoize the component to prevent unnecessary re-renders of static cells
export default React.memo(TetrisCell);
