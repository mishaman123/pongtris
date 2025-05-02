
'use client';

import React from 'react';
import type { Ball, Paddle } from '@/hooks/use-pong-game'; // Assuming types are exported or defined here
import { PADDLE_WIDTH, PADDLE_HEIGHT, BALL_RADIUS } from './constants';

interface PongGameProps {
  ball: Ball;
  paddle: Paddle;
  courtWidth: number;
  courtHeight: number;
}

const PongGame: React.FC<PongGameProps> = ({ ball, paddle, courtWidth, courtHeight }) => {
  const paddleY = courtHeight - PADDLE_HEIGHT - 10; // Consistent paddle Y position

  return (
    <div
      className="relative bg-background/50 border border-border overflow-hidden"
      style={{
        width: '100%', // Take full width of its container
        paddingBottom: `${(courtHeight / courtWidth) * 100}%`, // Maintain aspect ratio using padding-bottom trick
        maxHeight: '45vh', // Ensure it doesn't exceed half screen height
      }}
    >
      <div className="absolute top-0 left-0 w-full h-full">
        {/* Paddle */}
        <div
          className="absolute bg-primary rounded" // Use primary color (cyan)
          style={{
            left: `${(paddle.x / courtWidth) * 100}%`,
            top: `${(paddleY / courtHeight) * 100}%`,
            width: `${(PADDLE_WIDTH / courtWidth) * 100}%`,
            height: `${(PADDLE_HEIGHT / courtHeight) * 100}%`,
            boxShadow: '2px 2px 5px rgba(0,0,0,0.3)', // Simple shadow
          }}
        />

        {/* Ball */}
        <div
          className="absolute bg-primary rounded-full" // Use primary color (cyan)
          style={{
            left: `calc(${(ball.x / courtWidth) * 100}% - ${BALL_RADIUS}px)`, // Center ball based on radius
            top: `calc(${(ball.y / courtHeight) * 100}% - ${BALL_RADIUS}px)`, // Center ball based on radius
            width: `${BALL_RADIUS * 2}px`,
            height: `${BALL_RADIUS * 2}px`,
            boxShadow: '1px 1px 3px rgba(0,0,0,0.4)', // Simple shadow
          }}
        />

        {/* Optional: Center Line */}
        {/* <div className="absolute top-0 left-1/2 w-px h-full bg-border opacity-50 -translate-x-1/2" /> */}
      </div>
    </div>
  );
};

export default PongGame;
