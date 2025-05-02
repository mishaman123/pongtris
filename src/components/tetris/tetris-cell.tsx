
import React from 'react';
import { cn } from '@/lib/utils';
import { TETROMINOS } from './constants';

interface TetrisCellProps {
  type: string | number;
  state: 'clear' | 'merged' | 'player'; // State of the cell
}

// Mapping from tetromino type character to color class
const TYPE_TO_COLOR: { [key: string]: string } = Object.entries(TETROMINOS).reduce(
  (acc, [key, value]) => {
    if (key !== '0') { // Skip the empty cell definition
      acc[key] = value.color;
    }
    return acc;
  }, {} as { [key: string]: string }
);

const TetrisCell: React.FC<TetrisCellProps> = ({ type, state }) => {
  let colorClass: string;
  let borderClass: string;
  let shadowStyle: React.CSSProperties = {};

  if (type === 0 || state === 'clear') {
    colorClass = 'bg-background/30'; // More transparent background for empty cells
    borderClass = 'border-gray-700/30'; // Fainter border
  } else {
    // Use the mapping to get the color for merged or player pieces
    colorClass = TYPE_TO_COLOR[type as string] || 'bg-muted'; // Fallback color
    borderClass = 'border-black/30';
    shadowStyle = {
      boxShadow: 'inset 1px 1px 1px 0px rgba(255,255,255,0.2), inset -1px -1px 1px 0px rgba(0,0,0,0.2)' // Simplified shadow
    };
  }

  return (
    <div
      className={cn(
        'w-full h-full border', // Use full width/height provided by grid layout
        colorClass,
        borderClass,
        // Add transition for smoother color changes if needed
        // 'transition-colors duration-100 ease-in-out'
      )}
      style={shadowStyle}
    />
  );
};


// Memoize the component to prevent unnecessary re-renders of static cells
export default React.memo(TetrisCell);
