
import React from 'react';
import TetrisCell from './tetris-cell';
import type { TetrisGrid as GridType } from './constants';

interface TetrisGridProps {
  grid: GridType;
}

const TetrisGrid: React.FC<TetrisGridProps> = ({ grid }) => {
  return (
    <div
      className="grid border border-border bg-background/50"
      style={{
        gridTemplateRows: `repeat(${grid.length}, calc(45vh / ${grid.length}))`, // Adjusted for 45% height
        gridTemplateColumns: `repeat(${grid[0].length}, 1fr)`,
        width: `calc( (45vh / ${grid.length}) * ${grid[0].length} )`, // Maintain aspect ratio
        maxWidth: '90vw', // Prevent grid from becoming too wide on large screens
        margin: 'auto', // Center the grid horizontally
        aspectRatio: `${grid[0].length} / ${grid.length}`,
        maxHeight: '45vh',
      }}
    >
      {grid.map((row, y) =>
        row.map((cell, x) => <TetrisCell key={`${y}-${x}`} type={cell[0]} />)
      )}
    </div>
  );
};

export default TetrisGrid;
