
import { useState, useEffect, useCallback, useRef } from 'react';
import { useInterval } from './use-interval';
import { useEventListener } from './use-event-listener';
import {
  PONG_COURT_WIDTH,
  PONG_COURT_HEIGHT,
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  BALL_RADIUS,
  INITIAL_BALL_SPEED_X,
  INITIAL_BALL_SPEED_Y,
  PADDLE_SPEED
} from '@/components/pong/constants';

type Ball = {
  x: number;
  y: number;
  dx: number;
  dy: number;
};

type Paddle = {
  x: number;
};

const PADDLE_Y = PONG_COURT_HEIGHT - PADDLE_HEIGHT - 10; // Position paddle near bottom

export const usePongGame = (onGameOver: () => void) => {
  const [ball, setBall] = useState<Ball>({
    x: PONG_COURT_WIDTH / 2,
    y: PONG_COURT_HEIGHT / 2,
    dx: INITIAL_BALL_SPEED_X,
    dy: INITIAL_BALL_SPEED_Y,
  });
  const [paddle, setPaddle] = useState<Paddle>({ x: (PONG_COURT_WIDTH - PADDLE_WIDTH) / 2 });
  const [pongGameOver, setPongGameOverInternal] = useState(false);
  const [gameRunning, setGameRunning] = useState(false);

  // Refs for key presses to handle continuous movement
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const resetGame = useCallback(() => {
    setBall({
      x: PONG_COURT_WIDTH / 2,
      y: PONG_COURT_HEIGHT / 2,
      dx: (Math.random() > 0.5 ? 1 : -1) * INITIAL_BALL_SPEED_X, // Randomize start direction
      dy: INITIAL_BALL_SPEED_Y,
    });
    setPaddle({ x: (PONG_COURT_WIDTH - PADDLE_WIDTH) / 2 });
    setPongGameOverInternal(false);
    setGameRunning(true);
    keysPressed.current = {}; // Clear keys on reset
  }, []);


  const updateGame = useCallback(() => {
     if (!gameRunning || pongGameOver) return;

     // Update Paddle Position based on keysPressed
     setPaddle(prevPaddle => {
       let newX = prevPaddle.x;
       if (keysPressed.current['a'] || keysPressed.current['A']) {
         newX -= PADDLE_SPEED;
       }
       if (keysPressed.current['s'] || keysPressed.current['S']) {
         newX += PADDLE_SPEED;
       }
       // Clamp paddle position within court bounds
       newX = Math.max(0, Math.min(newX, PONG_COURT_WIDTH - PADDLE_WIDTH));
       return { x: newX };
     });


    setBall(prevBall => {
      let newX = prevBall.x + prevBall.dx;
      let newY = prevBall.y + prevBall.dy;
      let newDx = prevBall.dx;
      let newDy = prevBall.dy;

      // Wall collision (Left/Right)
      if (newX + BALL_RADIUS > PONG_COURT_WIDTH || newX - BALL_RADIUS < 0) {
        newDx = -newDx;
        // Adjust position slightly to prevent sticking
        newX = prevBall.x + newDx;
      }

      // Wall collision (Top)
      if (newY - BALL_RADIUS < 0) {
        newDy = -newDy;
         // Adjust position slightly
        newY = prevBall.y + newDy;
      }

      // Paddle collision
      if (
        newY + BALL_RADIUS > PADDLE_Y &&
        newY - BALL_RADIUS < PADDLE_Y + PADDLE_HEIGHT && // Check vertical alignment
        newX + BALL_RADIUS > paddle.x &&
        newX - BALL_RADIUS < paddle.x + PADDLE_WIDTH
      ) {
        newDy = -Math.abs(newDy); // Ensure it always bounces up
         // Adjust position slightly
        newY = PADDLE_Y - BALL_RADIUS;

         // Optional: Add angle change based on where it hits the paddle
         const hitPos = (newX - (paddle.x + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
         newDx = hitPos * Math.abs(INITIAL_BALL_SPEED_X) * 1.5; // Adjust angle/speed
      }


      // Game Over condition (Ball hits bottom)
      if (newY + BALL_RADIUS > PONG_COURT_HEIGHT) {
        setPongGameOverInternal(true);
        setGameRunning(false);
        onGameOver(); // Notify parent component
        return prevBall; // Don't update ball state if game over
      }

      return { x: newX, y: newY, dx: newDx, dy: newDy };
    });
  }, [gameRunning, pongGameOver, onGameOver, paddle.x]); // Include paddle.x as dependency

   // Game loop interval
   useInterval(updateGame, gameRunning && !pongGameOver ? 16 : null); // Approx 60 FPS


    // Event listeners for key presses
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
      if (!pongGameOver && gameRunning) {
          if (event.key === 'a' || event.key === 'A' || event.key === 's' || event.key === 'S') {
              event.preventDefault(); // Prevent default browser action for 'a'/'s'
              keysPressed.current[event.key] = true;
          }
      }
    }, [pongGameOver, gameRunning]);

    const handleKeyUp = useCallback((event: KeyboardEvent) => {
       if (event.key === 'a' || event.key === 'A' || event.key === 's' || event.key === 'S') {
           keysPressed.current[event.key] = false;
       }
    }, []);

    useEventListener('keydown', handleKeyDown);
    useEventListener('keyup', handleKeyUp);

    // Start game on mount or when explicitly called
    const startGame = () => {
        resetGame();
    };

  return { ball, paddle, startGame, isGameOver: pongGameOver, courtWidth: PONG_COURT_WIDTH, courtHeight: PONG_COURT_HEIGHT };
};
