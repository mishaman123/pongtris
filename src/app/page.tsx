'use client';

import React, { useState } from 'react';
import GameDisplay from '@/components/tetropong/game-display';
import { useTetroPongGame } from '@/hooks/use-tetropong-game';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Comment out Leaderboard import
// import Leaderboard from '@/components/leaderboard/leaderboard';

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

  // State to manage whether to show the leaderboard or the game - COMMENTED OUT
  // const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Function to toggle between game and leaderboard - COMMENTED OUT
  // const toggleLeaderboard = () => {
  //   setShowLeaderboard(!showLeaderboard);
  // };

  // When game is over, show the leaderboard - COMMENTED OUT
  // React.useEffect(() => {
  //   if (gameOver) { // Simplified: just check gameOver
  //     setShowLeaderboard(true);
  //   }
  // }, [gameOver]);

  // Handle play again (originally from leaderboard, now simplified/potentially unused)
  // We might not need this specific handler if only called from the removed leaderboard
  // const handlePlayAgain = () => {
  //   setShowLeaderboard(false);
  //   startGame();
  // };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-foreground relative">
       {/* Controls Overlay - Top Right */}
       <div className="absolute top-4 right-4 text-right text-xs text-muted-foreground bg-card/80 p-2 rounded-md shadow">
          <h4 className="font-semibold mb-1 text-sm text-card-foreground">Controls</h4>
          <p><span className="font-semibold">Tetris:</span> Arrows (Up: Rotate, Down: Soft Drop, L/R: Move), Space: Hard Drop</p>
          <p><span className="font-semibold">Pong:</span> A (Left), S (Right)</p>
          <p><span className="font-semibold">Game:</span> P (Pause)</p>
       </div>

      <Card className="w-full max-w-4xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-center text-3xl font-bold tracking-tight flex items-center justify-center gap-2">
            <span className="text-blue-500">Pong</span><span className="text-red-500">tris</span>
            <span className="text-xs font-mono px-2 py-1 bg-muted rounded">v0</span>
          </CardTitle>
          {/* Display score centered */} 
          <div className="text-center mt-2">
            <p className="text-xl font-semibold">Score: {score.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Speed: x{speedMultiplier.toFixed(2)}</p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center">
          {/* Initial state: Show Start Game button */} 
          {!gameStarted && !gameOver && (
            <div className="text-center py-10">
              <p className="mb-6 text-lg">Arrow keys for Tetris. A/S for Pong.</p>
              <div className="flex flex-col space-y-3">
                <Button onClick={startGame} size="lg">Start Game</Button>
                {/* Comment out View Leaderboard Button */}
                {/* <Button onClick={toggleLeaderboard} variant="outline">View Leaderboard</Button> */}
              </div>
            </div>
          )}

          {/* Game Over State: Show game over message and play again button */} 
          {gameOver && (
             <div className="text-center py-10">
               <h2 className="text-3xl font-bold text-destructive mb-4">Game Over!</h2>
               <p className="text-xl mb-6">Final Score: {score.toLocaleString()}</p>
               <Button onClick={startGame} size="lg">Play Again</Button>
             </div>
           )}

           {/* Paused State */}
           {isPaused && gameStarted && !gameOver && (
             <div className="text-center py-10">
               <h2 className="text-3xl font-bold text-primary mb-4">Paused</h2>
               <p className="text-lg mb-6">Press 'P' to resume</p>
             </div>
           )}

          {/* Leaderboard display - COMMENTED OUT */}
          {/* {showLeaderboard && ( */}
          {/*   <Leaderboard */}
          {/*     score={score} */}
          {/*     gameOver={gameOver} */}
          {/*     onPlayAgain={handlePlayAgain} // Use the potentially simplified handler */}
          {/*     onShowHome={() => { */}
          {/*       // Logic to return to game view if game wasn't actually over? */}
          {/*       // This might need refinement based on desired flow */}
          {/*       setShowLeaderboard(false); */}
          {/*     }} */}
          {/*   /> */}
          {/* )} */}
          
          {/* Game display area - Render only when game is active and not paused/over */} 
          {gameStarted && !isPaused && !gameOver && (
            <div
                className="w-full flex justify-center items-center"
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

