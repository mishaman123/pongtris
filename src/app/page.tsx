
'use client';

import React from 'react';
import GameDisplay from '@/components/tetropong/game-display';
import { useTetroPongGame } from '@/hooks/use-tetropong-game';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const {
    grid,
    ball,
    paddle,
    score,
    gameOver,
    gameStarted,
    startGame,
    gridWidth,
    gridHeight,
    paddleWidth,
    paddleHeight,
    ballRadius,
    paddleY,
  } = useTetroPongGame();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-foreground">
      <Card className="w-full max-w-md mb-4 bg-card text-card-foreground shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-2xl font-bold text-primary">TetroPong</CardTitle>
          <div className="text-xl font-semibold text-accent">Score: {score}</div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center">
          {!gameStarted && !gameOver && (
            <div className="text-center py-10">
              <h2 className="text-2xl font-bold mb-4 text-primary">Welcome to TetroPong!</h2>
              <p className="mb-6 text-lg">Clear lines, break bricks!</p>
              <p className="mb-1"><span className="font-semibold text-primary">Tetris:</span> Arrows (Up: Rotate, Space: Hard Drop)</p>
              <p className="mb-6"><span className="font-semibold text-primary">Pong:</span> A (Left), S (Right)</p>
              <Button onClick={startGame} size="lg">Start Game</Button>
            </div>
          )}
          {gameOver && (
            <div className="text-center py-10">
              <h2 className="text-3xl font-bold text-destructive mb-4">Game Over!</h2>
              <p className="text-xl mb-6">Your final score: {score}</p>
              <Button onClick={startGame} size="lg" variant="secondary">Play Again?</Button>
            </div>
          )}
          {gameStarted && (
            <div
                className="w-full flex justify-center items-center"
                // Set max height using CSS variable for GameDisplay to consume
                style={{ '--game-max-height': '80vh' } as React.CSSProperties}
            >
                <GameDisplay
                    grid={grid}
                    ball={ball}
                    paddle={paddle}
                    gridWidth={gridWidth}
                    gridHeight={gridHeight}
                    paddleWidth={paddleWidth}
                    paddleHeight={paddleHeight}
                    ballRadius={ballRadius}
                    paddleY={paddleY}
                 />
            </div>
          )}
        </CardContent>
      </Card>
       {/* Instructions Footer */}
       {!gameOver && (
         <div className="mt-4 text-center text-muted-foreground text-sm">
           <p><span className="font-semibold">Tetris:</span> Arrows (Up: Rotate, Space: Hard Drop)</p>
           <p><span className="font-semibold">Pong:</span> A (Left), S (Right)</p>
         </div>
       )}
    </div>
  );
}
