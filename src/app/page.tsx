
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import TetrisGrid from '@/components/tetris/tetris-grid';
import PongGame from '@/components/pong/pong-game';
import { useTetrisGame } from '@/hooks/use-tetris-game';
import { usePongGame } from '@/hooks/use-pong-game';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const handleLineClear = useCallback((linesCleared: number) => {
    // Tetris scoring logic (example: 10 points per line, bonus for Tetris)
    const linePoints = [0, 10, 30, 50, 80]; // Points for 0, 1, 2, 3, 4 lines
    setScore(prev => prev + (linePoints[linesCleared] || 0));
  }, []);

  const handleGameOver = useCallback(() => {
    setGameOver(true);
    setGameStarted(false); // Allow restarting
  }, []);

  const { grid: tetrisDisplayGrid, startGame: startTetris, isGameOver: isTetrisGameOver } = useTetrisGame(handleLineClear, handleGameOver);
  const { ball, paddle, startGame: startPong, isGameOver: isPongGameOver, courtWidth, courtHeight } = usePongGame(handleGameOver);

  const startGame = () => {
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    startTetris();
    startPong();
  };

  // Sync game over state
   useEffect(() => {
     if (isTetrisGameOver || isPongGameOver) {
       handleGameOver();
     }
   }, [isTetrisGameOver, isPongGameOver, handleGameOver]);


  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-2xl mb-4 bg-card text-card-foreground shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-2xl font-bold">TetroPong</CardTitle>
          <div className="text-xl font-semibold text-accent">Score: {score}</div>
        </CardHeader>
        <CardContent>
           {!gameStarted && !gameOver && (
              <div className="text-center py-10">
                  <h2 className="text-2xl font-bold mb-4 text-primary">Welcome to TetroPong!</h2>
                  <p className="mb-6 text-lg">Combine Tetris and Pong for a unique challenge.</p>
                  <p className="mb-2"><span className="font-semibold text-primary">Tetris Controls:</span> Arrow Keys (Up to Rotate)</p>
                  <p className="mb-6"><span className="font-semibold text-primary">Pong Controls:</span> A (Left), S (Right)</p>
                  <Button onClick={startGame} size="lg">Start Game</Button>
              </div>
            )}
            {gameOver && (
              <div className="text-center py-10">
                <h2 className="text-3xl font-bold text-accent mb-4">Game Over!</h2>
                <p className="text-xl mb-6">Your final score: {score}</p>
                <Button onClick={startGame} size="lg">Play Again?</Button>
              </div>
            )}
            {gameStarted && (
                <div className="flex flex-col items-center justify-center w-full aspect-[1/1.5] max-h-[90vh] "> {/* Container to enforce aspect ratio */}
                    {/* Tetris Game Area */}
                    <div className="w-full h-1/2 flex justify-center items-center">
                        <TetrisGrid grid={tetrisDisplayGrid} />
                    </div>

                    {/* Separator */}
                    <Separator className="my-2 bg-border h-1 w-3/4" />

                    {/* Pong Game Area */}
                    <div className="w-full h-1/2 flex justify-center items-center p-2">
                        <PongGame ball={ball} paddle={paddle} courtWidth={courtWidth} courtHeight={courtHeight} />
                    </div>
                </div>
            )}
        </CardContent>
      </Card>


    </div>
  );
}
