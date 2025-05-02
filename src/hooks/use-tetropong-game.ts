
'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useInterval } from './use-interval';
import {
    TETRIS_WIDTH,
    TETRIS_HEIGHT,
    TOTAL_GRID_HEIGHT,
    createEmptyGrid,
    getRandomTetromino,
    TETROMINOS,
    LINE_POINTS,
    BRICK_BREAK_SCORE,
} from '@/components/tetris/constants';
import type { TetrisGrid, TetrisPieceShape, Player } from '@/components/tetris/constants';
import {
    GAME_WIDTH,
    GAME_HEIGHT,
    PADDLE_WIDTH,
    PADDLE_HEIGHT,
    BALL_RADIUS,
    INITIAL_BALL_SPEED_X,
    INITIAL_BALL_SPEED_Y,
    PADDLE_SPEED,
    PADDLE_Y,
} from '@/components/pong/constants';

export type Ball = {
    x: number; // position in grid units
    y: number; // position in grid units
    dx: number; // velocity in grid units per tick
    dy: number; // velocity in grid units per tick
};

export type Paddle = {
    x: number; // position in grid units
};

const baseInitialPlayerState: Player = {
    pos: { x: TETRIS_WIDTH / 2 - 1, y: 0 },
    tetromino: TETROMINOS[0].shape,
    pieceType: 0,
    collided: false,
};

const baseInitialBallState: Ball = {
    x: GAME_WIDTH / 2,
    y: TETRIS_HEIGHT + 2, // Start ball below Tetris grid but within Pong area
    dx: INITIAL_BALL_SPEED_X * (Math.random() > 0.5 ? 1 : -1),
    dy: INITIAL_BALL_SPEED_Y,
};

const baseInitialPaddleState: Paddle = {
    x: (GAME_WIDTH - PADDLE_WIDTH) / 2,
};

const GAME_TICK_MS = 50; // Update game state approx 20 times per second
const TETRIS_DROP_INTERVAL_INITIAL = 800; // Milliseconds

export const useTetroPongGame = () => {
    const [player, setPlayer] = useState<Player>(baseInitialPlayerState);
    const [grid, setGrid] = useState<TetrisGrid>(createEmptyGrid());
    const [ball, setBall] = useState<Ball>(baseInitialBallState);
    const [paddle, setPaddle] = useState<Paddle>(baseInitialPaddleState);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [isPaused, setIsPaused] = useState(false); // Pause state
    const [tetrisDropTime, setTetrisDropTime] = useState<number | null>(null);
    const [isClient, setIsClient] = useState(false); // For hydration safety

    const keysPressed = useRef<{ [key: string]: boolean }>({});

    // Calculate speed multiplier based on score
    const speedMultiplier = useMemo(() => {
        // Calculate the number of 20-point increments achieved.
        const levels = Math.floor(score / 20);
        // Apply a cumulative 5% increase for each level.
        // Example: Score 0-19 (level 0): 1.00x
        // Score 20-39 (level 1): 1.05x
        // Score 40-59 (level 2): 1.05 * 1.05 = 1.1025x
        // Score 60-79 (level 3): 1.05 * 1.05 * 1.05 = 1.1576x
        return Math.pow(1.05, levels);
    }, [score]);


    useEffect(() => {
        setIsClient(true); // Component has mounted, safe to use browser APIs
    }, []);


    // --- Collision Detection ---
    const checkTetrisCollision = useCallback((p: Player, g: TetrisGrid, move: { x: number; y: number }): boolean => {
        for (let y = 0; y < p.tetromino.length; y += 1) {
            for (let x = 0; x < p.tetromino[y].length; x += 1) {
                if (p.tetromino[y][x] !== 0) {
                    const nextY = y + p.pos.y + move.y;
                    const nextX = x + p.pos.x + move.x;

                    // Collision conditions:
                    // 1. Out of bounds horizontally
                    // 2. Hit the Tetris floor (y >= TETRIS_HEIGHT)
                    // 3. Hit a 'merged' block within the Tetris area (0 <= y < TETRIS_HEIGHT)
                    if (
                        nextX < 0 ||
                        nextX >= TETRIS_WIDTH ||
                        nextY >= TETRIS_HEIGHT ||
                        (nextY >= 0 && g[nextY]?.[nextX]?.[1] === 'merged')
                    ) {
                        return true;
                    }
                }
            }
        }
        return false;
    }, []);


    // --- Game Grid Update ---
    const updateGrid = useCallback((currentGrid: TetrisGrid, currentPlayer: Player): TetrisGrid => {
        // 1. Create a new grid based on the merged blocks
        const newGrid: TetrisGrid = currentGrid.map(row =>
            row.map(cell => (cell[1] === 'merged' ? cell : [0, 'clear']))
        );

        // 2. Draw the current Tetris piece if it's not collided
        if (!currentPlayer.collided && currentPlayer.pieceType !== 0) {
            currentPlayer.tetromino.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        const gridY = y + currentPlayer.pos.y;
                        const gridX = x + currentPlayer.pos.x;
                        // Ensure drawing is within the TOTAL grid visually
                        if (gridY >= 0 && gridY < TOTAL_GRID_HEIGHT && gridX >= 0 && gridX < TETRIS_WIDTH) {
                            // Use 'player' state to distinguish from merged blocks
                           if (newGrid[gridY]?.[gridX]?.[1] !== 'merged') { // Avoid overwriting merged blocks visually
                              newGrid[gridY][gridX] = [currentPlayer.pieceType, 'player'];
                           }
                        }
                    }
                });
            });
        }

        return newGrid;
    }, []);


     // --- Tetris Logic ---
     const resetPlayer = useCallback(() => {
        if (gameOver) return; // Don't reset if game over
        const { type, piece } = getRandomTetromino();
        const newPlayerPos = { x: TETRIS_WIDTH / 2 - Math.floor(piece.shape[0].length / 2), y: 0 };

        // Use a temporary grid reflecting current state for immediate collision check
        const tempGrid = grid.map(row => [...row]); // Ensure it's a copy

        // Check collision at spawn position using the Tetris-specific height
        if (checkTetrisCollision({ ...baseInitialPlayerState, pos: newPlayerPos, tetromino: piece.shape, pieceType: type }, tempGrid, { x: 0, y: 0 })) {
            setGameOver(true);
            setGameStarted(false);
            setTetrisDropTime(null);
            console.log("Game Over - Collision on new piece spawn");
             // Don't update player state if game over on spawn
             setPlayer(prev => ({...prev, collided: true})); // Ensure player stops
        } else {
            setPlayer({
                pos: newPlayerPos,
                tetromino: piece.shape,
                pieceType: type,
                collided: false,
            });
             // Reset drop time based on current speed multiplier when a new piece starts
            const nextDropTime = Math.max(100, TETRIS_DROP_INTERVAL_INITIAL / speedMultiplier);
            setTetrisDropTime(nextDropTime);
        }
    }, [grid, checkTetrisCollision, speedMultiplier, gameOver]); // Add gameOver dependency

    const rotate = (matrix: TetrisPieceShape): TetrisPieceShape => {
        // Transpose
        const rotated = matrix[0].map((_, index) => matrix.map(row => row[index]));
        // Reverse each row to rotate clockwise
        return rotated.map(row => row.reverse());
    };

    const playerRotate = useCallback(() => {
        if (player.collided || player.pieceType === 'O' || gameOver || !gameStarted || isPaused) return; // Don't rotate if paused

        const clonedPlayer = JSON.parse(JSON.stringify(player));
        clonedPlayer.tetromino = rotate(clonedPlayer.tetromino);

        const currentX = clonedPlayer.pos.x;
        let offset = 1;
        // Use the Tetris-specific collision check
        while (checkTetrisCollision(clonedPlayer, grid, { x: 0, y: 0 })) {
            clonedPlayer.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            // Check rotation collision with wider bounds to allow kicks
            if (offset > Math.max(clonedPlayer.tetromino.length, clonedPlayer.tetromino[0].length) + 1) {
                 // console.log("Rotation failed boundary check");
                 clonedPlayer.pos.x = currentX; // Reset position if wall kick fails
                 clonedPlayer.tetromino = player.tetromino; // Revert rotation
                return; // Exit without setting state
            }
             // Extra check: ensure kicked position is valid horizontally
             let pieceEndX = clonedPlayer.pos.x;
              for (let y=0; y<clonedPlayer.tetromino.length; ++y) {
                  for (let x=0; x<clonedPlayer.tetromino[y].length; ++x) {
                      if (clonedPlayer.tetromino[y][x] !== 0) {
                          pieceEndX = Math.max(pieceEndX, clonedPlayer.pos.x + x);
                      }
                  }
              }
              if(clonedPlayer.pos.x < 0 || pieceEndX >= TETRIS_WIDTH) {
                  // console.log("Rotation kick out of bounds");
                   clonedPlayer.pos.x = currentX; // Reset position
                   clonedPlayer.tetromino = player.tetromino; // Revert rotation
                  return; // Exit
              }
        }
        setPlayer(clonedPlayer);
    }, [player, grid, checkTetrisCollision, gameOver, gameStarted, isPaused]); // Add isPaused


    const movePlayer = useCallback((dir: number) => {
         if (player.collided || gameOver || !gameStarted || isPaused) return; // Prevent movement if paused
         // Use Tetris-specific collision check
        if (!checkTetrisCollision(player, grid, { x: dir, y: 0 })) {
            setPlayer(prev => ({ ...prev, pos: { ...prev.pos, x: prev.pos.x + dir } }));
        }
    }, [player, grid, checkTetrisCollision, gameOver, gameStarted, isPaused]); // Add isPaused

    const dropPlayer = useCallback(() => {
        if (player.collided || gameOver || !gameStarted || isPaused) return; // Prevent dropping if paused
        // Check collision one step below using the Tetris-specific check
        if (!checkTetrisCollision(player, grid, { x: 0, y: 1 })) {
             setPlayer(prev => ({ ...prev, pos: { ...prev.pos, y: prev.pos.y + 1 } }));
        } else {
            // If collision detected below (within Tetris bounds), mark as collided
             setPlayer(prev => ({ ...prev, collided: true }));
             setTetrisDropTime(null); // Stop the interval when piece lands at its final spot
        }
    }, [player, grid, checkTetrisCollision, gameOver, gameStarted, isPaused]); // Add isPaused


    const hardDropPlayer = useCallback(() => {
       if (gameOver || player.collided || !gameStarted || isPaused) return; // Prevent hard drop if paused
        let newY = player.pos.y;
        // Use checkTetrisCollision which now respects TETRIS_HEIGHT
        while (!checkTetrisCollision(player, grid, { x: 0, y: newY - player.pos.y + 1 })) {
             newY++;
        }
        // Set position to the lowest possible point and mark as collided
        setPlayer(prev => ({ ...prev, pos: { ...prev.pos, y: newY }, collided: true }));
        setTetrisDropTime(null); // Stop the interval immediately
    }, [player, grid, checkTetrisCollision, gameOver, gameStarted, isPaused]); // Add isPaused


     // --- Merge and Line Clear ---
     const mergePieceToGrid = useCallback(() => {
         if (gameOver || isPaused) return; // Don't merge if paused

         // Ensure player position is valid before merging (safety check)
         if (player.pos.y < 0) {
              console.warn("Attempted to merge piece with negative Y position:", player.pos.y);
              setGameOver(true); // Invalid state, end game
              return;
         }

        const newGrid = grid.map(row => [...row]); // Create a mutable copy

        player.tetromino.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const gridY = y + player.pos.y;
                    const gridX = x + player.pos.x;
                    // Ensure we are within grid boundaries before attempting to merge
                    // Merge piece ONLY within the TETRIS_HEIGHT
                    if (gridY >= 0 && gridY < TETRIS_HEIGHT && gridX >= 0 && gridX < TETRIS_WIDTH) {
                         if (newGrid[gridY]?.[gridX]?.[1] === 'clear') {
                           newGrid[gridY][gridX] = [player.pieceType, 'merged'];
                         } else if (newGrid[gridY]?.[gridX]?.[1] === 'merged') {
                             // This case implies an overlap occurred despite collision checks - likely a bug or edge case
                             console.warn(`Merge Overlap: Trying to merge onto existing merged block at [${gridX}, ${gridY}]`);
                             // Potentially game over if merging onto existing block is illegal
                             setGameOver(true);
                             return; // Exit early if game over
                         }
                    } else if (gridY < 0 && gridX >=0 && gridX < TETRIS_WIDTH) {
                        // Handle case where part of the piece is above the grid after hard drop/rotation
                        // This might indicate game over if it's the final resting place
                        console.log("Piece merged partially or fully above grid top.");
                        setGameOver(true); // Game over if piece locks above grid
                        return;
                    }
                }
            });
        });

         if (gameOver) return; // Re-check game over status after potential overlap check

        // --- Line Clearing ---
        let clearedLines = 0;
        const sweptGrid: TetrisGrid = [];
        // Iterate from bottom of Tetris area up to top (y = TETRIS_HEIGHT - 1 down to 0)
        for (let y = TETRIS_HEIGHT - 1; y >= 0; y--) {
             const row = newGrid[y];
             // Check if the row is entirely filled with 'merged' blocks AND does not contain any 'G' (grey) blocks
             if (row.every(cell => cell[1] === 'merged' && cell[0] !== 'G')) {
                 clearedLines++;
             } else {
                 sweptGrid.unshift(row); // Keep rows that are not full or contain grey blocks
             }
        }

        // Add new empty rows at the top for each cleared line
        while (sweptGrid.length < TETRIS_HEIGHT) {
             sweptGrid.unshift(Array(TETRIS_WIDTH).fill([0, 'clear']));
        }

         // Add the Pong area rows back (they were not part of the sweep)
         for (let y = TETRIS_HEIGHT; y < TOTAL_GRID_HEIGHT; y++) {
             // Ensure row exists before pushing
             sweptGrid.push(newGrid[y] || Array(TETRIS_WIDTH).fill([0, 'clear']));
         }


        if (clearedLines > 0) {
             const pointsEarned = LINE_POINTS[clearedLines] || 0;
             setScore(prevScore => prevScore + pointsEarned);
             // Speed update happens via useEffect watching score
        }

        setGrid(sweptGrid); // Update the grid state

         // Reset player AFTER grid update and score calculation
         resetPlayer();


    }, [player, grid, resetPlayer, score, gameOver, isPaused]); // Add isPaused

    // Effect to update Tetris drop speed when speedMultiplier changes
    useEffect(() => {
        if (gameStarted && !gameOver && !isPaused && !player.collided && tetrisDropTime !== null) { // Check pause state
            const nextDropTime = Math.max(100, TETRIS_DROP_INTERVAL_INITIAL / speedMultiplier);
            setTetrisDropTime(nextDropTime);
        }
    }, [speedMultiplier, gameStarted, gameOver, player.collided, tetrisDropTime, isPaused]); // Add isPaused


    // Effect to handle piece collision and merging logic AFTER state update
    useEffect(() => {
        // Only trigger merge when the piece has *just* become collided and not paused
        if (player.collided && player.pos.y < TETRIS_HEIGHT && gameStarted && !gameOver && !isPaused) { // Check pause state
             mergePieceToGrid();
        } else if (player.collided && player.pos.y >= TETRIS_HEIGHT && !isPaused) { // Check pause state
            // Handle case where piece somehow becomes collided below Tetris area (should not happen with correct checks)
            console.warn("Piece collided below Tetris floor. Resetting.");
            resetPlayer(); // Or handle as game over depending on rules
        }
    }, [player.collided, player.pos.y, gameStarted, gameOver, mergePieceToGrid, resetPlayer, isPaused]); // Add isPaused


    // --- Pong Logic ---
    const updatePongState = useCallback(() => {
        if (isPaused) return; // Don't update pong if paused

         // Update Paddle Position (apply speed multiplier)
         setPaddle(prevPaddle => {
           let newX = prevPaddle.x;
           const currentPaddleSpeed = PADDLE_SPEED * speedMultiplier; // Apply multiplier
           if (keysPressed.current['a']) { // Check lowercase only
             newX -= currentPaddleSpeed;
           }
           if (keysPressed.current['s']) { // Check lowercase only
             newX += currentPaddleSpeed;
           }
           // Clamp paddle position within court bounds
           newX = Math.max(0, Math.min(newX, GAME_WIDTH - PADDLE_WIDTH));
           return { x: newX };
         });

        // Update Ball Position and Handle Collisions
        setBall(prevBall => {
            let nextX = prevBall.x + prevBall.dx;
            let nextY = prevBall.y + prevBall.dy;
            let newDx = prevBall.dx;
            let newDy = prevBall.dy;
            let brickBroken = false;
            let mutableGrid = grid.map(row => [...row]); // Create mutable copy for potential brick break

            // --- Boundary Collisions ---
            // Left/Right Walls
            if (nextX - BALL_RADIUS < 0) {
                newDx = Math.abs(newDx); // Bounce right
                nextX = BALL_RADIUS; // Adjust position
            } else if (nextX + BALL_RADIUS > GAME_WIDTH) {
                newDx = -Math.abs(newDx); // Bounce left
                nextX = GAME_WIDTH - BALL_RADIUS; // Adjust position
            }

            // Top Wall (ceiling) - Bounce off y=0
            if (nextY - BALL_RADIUS < 0 && prevBall.dy < 0) { // Only bounce if moving up
                newDy = Math.abs(newDy); // Bounce down
                nextY = BALL_RADIUS; // Adjust position
            }

            // --- Paddle Collision ---
            const paddleTop = PADDLE_Y;
            const paddleBottom = PADDLE_Y + PADDLE_HEIGHT;
            const paddleLeft = paddle.x;
            const paddleRight = paddle.x + PADDLE_WIDTH;

            if (
                nextY + BALL_RADIUS > paddleTop && // Ball's bottom edge might hit paddle top
                nextY - BALL_RADIUS < paddleBottom && // Ball's top edge is above paddle bottom
                nextX + BALL_RADIUS > paddleLeft && // Ball's right edge is right of paddle left
                nextX - BALL_RADIUS < paddleRight && // Ball's left edge is left of paddle right
                prevBall.dy > 0 // Ensure ball is moving downwards
            ) {
                 // Apply speed multiplier to base speed on bounce
                 const baseSpeedX = INITIAL_BALL_SPEED_X;
                 const baseSpeedY = INITIAL_BALL_SPEED_Y;
                 const currentSpeedMagnitudeX = baseSpeedX * speedMultiplier;
                 const currentSpeedMagnitudeY = baseSpeedY * speedMultiplier;

                 newDy = -Math.abs(currentSpeedMagnitudeY); // Bounce up with current speed
                 nextY = paddleTop - BALL_RADIUS; // Place ball exactly on top of paddle

                 // Adjust horizontal speed based on hit position on paddle
                 const hitPosRatio = (nextX - (paddleLeft + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
                 const clampedHitPosRatio = Math.max(-1, Math.min(1, hitPosRatio));
                 const maxHorizontalFactor = 1.5; // Angle variation
                 newDx = clampedHitPosRatio * currentSpeedMagnitudeX * maxHorizontalFactor;

                  // Simple speed limit to prevent extreme horizontal speeds after angle adjustment
                  const maxDx = currentSpeedMagnitudeX * maxHorizontalFactor;
                  newDx = Math.max(-maxDx, Math.min(maxDx, newDx));
            }


            // --- Tetris Brick Collision ---
            let collisionHandled = false;
            // Check cells around the ball's next position, ONLY within TETRIS_HEIGHT bounds (y < TETRIS_HEIGHT)
            const gridXMin = Math.max(0, Math.floor(nextX - BALL_RADIUS));
            const gridXMax = Math.min(TETRIS_WIDTH - 1, Math.floor(nextX + BALL_RADIUS));
            // Check from y=0 up to just below TETRIS_HEIGHT
            const gridYMin = Math.max(0, Math.floor(nextY - BALL_RADIUS));
            const gridYMax = Math.min(TETRIS_HEIGHT - 1, Math.floor(nextY + BALL_RADIUS));

            let collidedBrickX = -1, collidedBrickY = -1;
            let collisionNormalX = 0, collisionNormalY = 0;

            // --- Collision Detection & Resolution Loop ---
            for (let y = gridYMin; y <= gridYMax; y++) {
                for (let x = gridXMin; x <= gridXMax; x++) {
                     // Check if the cell exists and is a 'merged' block
                     if (mutableGrid[y]?.[x]?.[1] === 'merged') {
                         const brickLeft = x;
                         const brickRight = x + 1;
                         const brickTop = y;
                         const brickBottom = y + 1;

                         // Simple AABB check first
                         if (nextX + BALL_RADIUS > brickLeft && nextX - BALL_RADIUS < brickRight &&
                             nextY + BALL_RADIUS > brickTop && nextY - BALL_RADIUS < brickBottom)
                         {
                             // More accurate check: Find closest point on brick to ball center
                             const closestX = Math.max(brickLeft, Math.min(nextX, brickRight));
                             const closestY = Math.max(brickTop, Math.min(nextY, brickBottom));
                             const distX = nextX - closestX;
                             const distY = nextY - closestY;

                             // Check if distance squared is less than radius squared
                             if ((distX * distX + distY * distY) < (BALL_RADIUS * BALL_RADIUS)) {
                                 // Collision occurred
                                 collidedBrickX = x;
                                 collidedBrickY = y;
                                 collisionHandled = true;

                                 // Determine penetration depth
                                 const penX = BALL_RADIUS - Math.abs(distX);
                                 const penY = BALL_RADIUS - Math.abs(distY);

                                 // Determine collision normal based on smallest penetration
                                 if (penY < penX) { // Vertical collision
                                     collisionNormalY = (distY > 0) ? 1 : -1;
                                     collisionNormalX = 0;
                                     // Correct position: Move ball out along the normal
                                     nextY = (collisionNormalY > 0) ? brickBottom + BALL_RADIUS : brickTop - BALL_RADIUS;
                                     // Reflect velocity
                                     newDy = -prevBall.dy;
                                     newDx = prevBall.dx; // Keep horizontal velocity
                                 } else { // Horizontal collision
                                     collisionNormalX = (distX > 0) ? 1 : -1;
                                     collisionNormalY = 0;
                                     // Correct position
                                     nextX = (collisionNormalX > 0) ? brickRight + BALL_RADIUS : brickLeft - BALL_RADIUS;
                                     // Reflect velocity
                                     newDx = -prevBall.dx;
                                     newDy = prevBall.dy; // Keep vertical velocity
                                 }

                                 // Break the collided brick (ANY merged brick, including 'G')
                                 mutableGrid[collidedBrickY][collidedBrickX] = [0, 'clear'];
                                 brickBroken = true;

                                 // Use flag to break after handling collision
                                 gotoCollisionEnd();
                             }
                         }
                    }
                }
            }

            function gotoCollisionEnd() {} // Label target

            // --- Post-Collision Updates ---
            if (brickBroken) {
                setGrid(mutableGrid); // Update grid state only if a brick was broken
                setScore(prev => prev + BRICK_BREAK_SCORE);
                 // Speed update happens via useEffect watching score
            }

            // --- Game Over Condition (Ball hits bottom floor of Pong area) ---
             if (nextY + BALL_RADIUS >= GAME_HEIGHT) { // Use >= for safety
                 setGameOver(true);
                 setGameStarted(false);
                 setTetrisDropTime(null);
                 console.log("Game Over - Ball missed paddle");
                 return prevBall; // Don't update ball if game over
             }

            // Clamp ball position slightly within bounds after collision resolution
            nextX = Math.max(BALL_RADIUS, Math.min(nextX, GAME_WIDTH - BALL_RADIUS));
            nextY = Math.max(BALL_RADIUS, Math.min(nextY, GAME_HEIGHT - BALL_RADIUS)); // Clamp top and bottom


            return { x: nextX, y: nextY, dx: newDx, dy: newDy };
        });

    }, [paddle.x, grid, score, speedMultiplier, isPaused]); // Add isPaused


    // --- Game Loop ---
    useInterval(() => {
        if (!isClient || !gameStarted || gameOver || isPaused) return; // Check pause state
        updatePongState();
        // Tetris drop is handled by its own interval (tetrisDropTime)
    }, gameStarted && !gameOver ? GAME_TICK_MS : null);

    // --- Tetris Auto Drop Interval ---
     useInterval(() => {
        // Only drop if game is running, not over, and piece hasn't collided yet and not paused
        if (!isClient || !gameStarted || gameOver || player.collided || isPaused) return; // Check pause state
        dropPlayer(); // Use the dropPlayer function which includes collision check
    }, tetrisDropTime);


    // --- Input Handling ---
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
         if (!isClient) return; // Ignore input if not client

        const { key } = event;
        let handled = false;

        // Pause Toggle (works even if game not started or over, but only if client)
         if (key === 'p' || key === 'P') {
            if (gameStarted) { // Only allow pausing if game has started
                setIsPaused(prev => !prev);
                console.log(isPaused ? "Game Resumed" : "Game Paused");
                handled = true;
            }
         }

         // Ignore other inputs if paused or game not ready/active
         if (isPaused || !gameStarted || gameOver) {
            if (handled) event.preventDefault(); // Prevent default for 'p' even when paused
            return;
         }

        // Pong Controls (continuous) - Store lowercase
        if (key === 'a' || key === 'A') {
            keysPressed.current['a'] = true;
            handled = true;
        }
         if (key === 's' || key === 'S') {
            keysPressed.current['s'] = true;
            handled = true;
        }

        // Tetris Controls (discrete - only trigger once per press)
        // Check if key is *not* already held down for discrete actions
        if (!keysPressed.current[key]) {
             if (key === 'ArrowLeft') {
                 movePlayer(-1);
                 keysPressed.current[key] = true; // Mark as pressed
                 handled = true;
             } else if (key === 'ArrowRight') {
                 movePlayer(1);
                 keysPressed.current[key] = true; // Mark as pressed
                 handled = true;
             } else if (key === 'ArrowDown') {
                  hardDropPlayer(); // Changed Space to ArrowDown for hard drop
                  keysPressed.current[key] = true; // Mark as pressed
                  handled = true;
             } else if (key === 'ArrowUp') {
                  playerRotate(); // Rotate clockwise
                  keysPressed.current[key] = true; // Mark as pressed
                  handled = true;
             }
             // Removed Space bar control
             // else if (key === ' ') { ... }
        }
        // Soft drop - allow holding down, but not a dedicated key here anymore

        if (handled) {
             event.preventDefault(); // Prevent default browser actions (e.g., scrolling)
        }

    }, [gameOver, gameStarted, isPaused, movePlayer, hardDropPlayer, playerRotate, isClient, tetrisDropTime]); // Added isPaused

    const handleKeyUp = useCallback((event: KeyboardEvent) => {
         if (!isClient) return;
        const { key } = event;
        // Clear the pressed state for all keys on keyup
        delete keysPressed.current[key.toLowerCase()]; // For continuous controls (a, s)
        delete keysPressed.current[key]; // For discrete controls (Arrows, p)

         // No need to reset soft drop speed as ArrowDown is now hard drop
         // if (key === 'ArrowDown' && ... ) { ... }

    }, [isClient, score, gameStarted, gameOver, player.collided, tetrisDropTime, speedMultiplier, isPaused]); // Added isPaused

     // Attach event listeners only on the client
     useEffect(() => {
         if (!isClient) return;
         window.addEventListener('keydown', handleKeyDown);
         window.addEventListener('keyup', handleKeyUp);
         return () => {
             window.removeEventListener('keydown', handleKeyDown);
             window.removeEventListener('keyup', handleKeyUp);
         };
     }, [isClient, handleKeyDown, handleKeyUp]); // Re-add if handlers change

    // --- Start/Reset Game ---
    const startGame = useCallback(() => {
        if (!isClient) return; // Ensure this runs only client-side
        console.log("Starting Game");
        setScore(0); // Reset score FIRST to recalculate initial speed multiplier
        setGrid(createEmptyGrid()); // createEmptyGrid now adds grey blocks
        setIsPaused(false); // Ensure game is not paused on start/restart
        // Initialize ball speed with the base multiplier (which is 1 at score 0)
        const initialSpeedMult = 1;
        setBall({
            ...baseInitialBallState,
            dx: INITIAL_BALL_SPEED_X * (Math.random() > 0.5 ? 1 : -1) * initialSpeedMult,
            dy: INITIAL_BALL_SPEED_Y * initialSpeedMult,
        });
        setPaddle(baseInitialPaddleState);
        setGameOver(false);
        setGameStarted(true);
        keysPressed.current = {}; // Reset keys pressed on start
        resetPlayer(); // Call resetPlayer *after* setting initial state
        // Tetris drop time is set within resetPlayer based on the current multiplier
    }, [resetPlayer, isClient]); // Ensure resetPlayer is stable


    // --- Render Grid ---
    // Calculate display grid using useMemo
    const displayGrid = useMemo(() => updateGrid(grid, player), [grid, player, updateGrid]);


    return {
        grid: displayGrid,
        ball,
        paddle,
        score,
        gameOver,
        gameStarted,
        isPaused, // Expose pause state
        startGame,
        speedMultiplier, // Expose the speed multiplier
        // Expose constants needed for rendering
        gridWidth: TETRIS_WIDTH,
        gridHeight: TOTAL_GRID_HEIGHT,
        tetrisHeight: TETRIS_HEIGHT, // Expose Tetris height for floor line
        paddleWidth: PADDLE_WIDTH,
        paddleHeight: PADDLE_HEIGHT,
        ballRadius: BALL_RADIUS,
        paddleY: PADDLE_Y,
    };
};
