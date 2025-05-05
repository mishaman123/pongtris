'use client';

import React from 'react';
import TetrisCell from '@/components/tetris/tetris-cell';
import type { TetrisGrid } from '@/components/tetris/constants';
import type { Ball, Paddle } from '@/hooks/use-tetropong-game';
import { cn } from '@/lib/utils';

interface GameDisplayProps {
  grid: TetrisGrid;
  ball: Ball;
  paddle: Paddle;
  gridWidth: number;
  gridHeight: number;
  tetrisHeight: number; // Added prop for floor line position
  paddleWidth: number;
  paddleHeight: number;
  ballRadius: number;
  paddleY: number;
}

const GameDisplay: React.FC<GameDisplayProps> = ({
  grid,
  ball,
  paddle,
  gridWidth,
  gridHeight,
  tetrisHeight, // Use this prop
  paddleWidth,
  paddleHeight,
  ballRadius,
  paddleY,
}) => {
  // Calculate cell size based on the container's aspect ratio and grid dimensions
  // We use viewport height (vh) to make it scale reasonably well. Max height set in parent.
  const cellHeightVh = `calc(var(--game-max-height, 80vh) / ${gridHeight})`;
  const containerWidthStyle = `calc(${cellHeightVh} * ${gridWidth})`;

  // Calculate floor position in percentage
  const floorTopPercent = (tetrisHeight / gridHeight) * 100;

  return (
    <div
      className="relative border border-border bg-background/50 overflow-hidden shadow-inner"
      style={{
        width: containerWidthStyle,
        maxWidth: '90vw', // Max width relative to viewport
        maxHeight: 'var(--game-max-height, 80vh)', // Controlled by parent CSS variable
        aspectRatio: `${gridWidth} / ${gridHeight}`,
        margin: 'auto', // Center horizontally
      }}
    >
      {/* Grid Cells */}
      <div
        className="absolute top-0 left-0 grid w-full h-full"
        style={{
          gridTemplateColumns: `repeat(${gridWidth}, 1fr)`,
          gridTemplateRows: `repeat(${gridHeight}, 1fr)`,
        }}
      >
        {grid.map((row, y) =>
          row.map((cellData, x) => {
            // Safely handle the cell data for TypeScript
            // First cast to unknown, then to the array type
            const typeSafeCellData = cellData as unknown;
            const cellArray = typeSafeCellData as [string | number, string];
            
            return (
              <TetrisCell
                key={`${y}-${x}`}
                type={cellArray[0]}
                state={cellArray[1] as 'clear' | 'merged' | 'player'}
                inPongArea={y >= tetrisHeight} // Cells below tetris height are in pong area
              />
            );
          })
        )}
      </div>

      {/* Tetris Floor Line */}
       <div
         className="absolute left-0 w-full border-b-2 border-foreground/30" // Use foreground with opacity
         style={{
           top: `${floorTopPercent}%`, // Position based on tetrisHeight
         }}
       />


      {/* Pong Elements (Overlayed) - Positions converted to percentages */}
      {/* Paddle */}
      <div
        className="absolute bg-secondary rounded shadow-md" // Use secondary color for paddle
        style={{
          left: `${(paddle.x / gridWidth) * 100}%`,
          top: `${(paddleY / gridHeight) * 100}%`, // Use calculated paddleY
          width: `${(paddleWidth / gridWidth) * 100}%`,
          height: `${(paddleHeight / gridHeight) * 100}%`,
          transform: 'translateZ(0)', // Hint for GPU acceleration
        }}
      />

      {/* Ball */}
      <div
        className="absolute bg-accent rounded-full shadow" // Use accent color for ball
        style={{
           // Center ball based on its top-left corner and radius
          left: `${((ball.x - ballRadius) / gridWidth) * 100}%`,
          top: `${((ball.y - ballRadius) / gridHeight) * 100}%`,
           // Size based on radius, converting grid units to percentage
          width: `${((ballRadius * 2) / gridWidth) * 100}%`,
          height: `${((ballRadius * 2) / gridHeight) * 100}%`,
          transform: 'translateZ(0)', // Hint for GPU acceleration
        }}
      />
    </div>
  );
};

export default GameDisplay;
