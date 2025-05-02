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
    isPaused, // Get pause state
    startGame,
    gridWidth,
    gridHeight,
    tetrisHeight,
    paddleWidth,
    paddleHeight,
    ballRadius,
    paddleY,
    speedMultiplier,
  } = useTetroPongGame();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-foreground relative">
       {/* Controls Overlay - Top Right */}
       <div className="absolute top-4 right-4 text-right text-xs text-muted-foreground bg-card/80 p-2 rounded-md shadow">
          <h4 className="font-semibold mb-1 text-sm text-card-foreground">Controls</h4>
          <p><span className="font-semibold">Tetris:</span> Arrows (Up: Rotate, Down: Soft Drop, L/R: Move), Space: Hard Drop</p>
          <p><span className="font-semibold">Pong:</span> A (Left), S (Right)</p>
          <p><span className="font-semibold">Game:</span> P (Pause)</p>
       </div>

      <Card className="w-full max-w-md mb-4 bg-card text-card-foreground shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-x-4">
          <CardTitle className="text-2xl font-bold text-primary">PongTris</CardTitle> {/* Renamed */}
          <div className="flex items-center space-x-4 text-right">
             <div className="text-base font-semibold text-secondary-foreground">
                 Speed: {speedMultiplier.toFixed(2)}x
              </div>
            <div className="text-xl font-semibold text-accent">Score: {score}</div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center">
          {!gameStarted && !gameOver && (
            <div className="text-center py-10">
              <h2 className="text-2xl font-bold mb-4 text-primary">Welcome to PongTris!</h2> {/* Renamed */}
              <p className="mb-6 text-lg">Clear lines, break bricks!</p>
              <Button onClick={startGame} size="lg">Start Game</Button>
            </div>
          )}
           {isPaused && gameStarted && ( // Show pause message only when game started
             <div className="text-center py-10">
               <h2 className="text-3xl font-bold text-primary mb-4">Paused</h2>
               <p className="text-lg mb-6">Press 'P' to resume</p>
             </div>
           )}
          {gameOver && (
            <div className="text-center py-10">
              <h2 className="text-3xl font-bold text-destructive mb-4">Game Over!</h2>
              <p className="text-xl mb-6">Your final score: {score}</p>
              <Button onClick={startGame} size="lg" variant="secondary">Play Again?</Button>
            </div>
          )}
          {gameStarted && !isPaused && ( // Render game only if started and not paused
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
                    tetrisHeight={tetrisHeight}
                    paddleWidth={paddleWidth}
                    paddleHeight={paddleHeight}
                    ballRadius={ballRadius}
                    paddleY={paddleY}
                 />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
