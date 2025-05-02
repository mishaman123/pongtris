
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
const MIN_VERTICAL_BOUNCE_ANGLE_DEG = 2; // Minimum angle from vertical after bounce
const MOVE_REPEAT_DELAY = 150; // Delay before continuous movement starts (ms)
const MOVE_REPEAT_INTERVAL = 50; // Interval for continuous movement (ms)
const SOFT_DROP_REPEAT_INTERVAL = 50; // Interval for continuous soft drop (ms)


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

    const keysPressed = useRef<{ [key: string]: { pressed: boolean; firstPressTime: number | null; repeatTimeout: NodeJS.Timeout | null } }>({});

    // Calculate speed multiplier based on score (cumulative 5% increase per 12 points)
    const speedMultiplier = useMemo(() => {
        const levels = Math.floor(score / 12);
        return Math.pow(1.05, levels);
    }, [score]);

    // Minimum horizontal speed derived from minimum angle and base speed
    const minDxThreshold = useMemo(() => {
        const angleRad = MIN_VERTICAL_BOUNCE_ANGLE_DEG * (Math.PI / 180);
        const baseSpeedY = INITIAL_BALL_SPEED_Y; // Use base speed for threshold calculation consistency
        return Math.abs(baseSpeedY * Math.tan(angleRad));
    }, []);


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
     const resetPlayer = useCallback((currentGrid: TetrisGrid) => {
        if (gameOver) return; // Don't reset if game over

        const { type, piece } = getRandomTetromino();
        const newPlayerPos = { x: TETRIS_WIDTH / 2 - Math.floor(piece.shape[0].length / 2), y: 0 };

        // Check collision at spawn position using the Tetris-specific height on the provided grid
        if (checkTetrisCollision({ ...baseInitialPlayerState, pos: newPlayerPos, tetromino: piece.shape, pieceType: type }, currentGrid, { x: 0, y: 0 })) {
            setGameOver(true);
            setGameStarted(false); // Ensure game stops fully
            setTetrisDropTime(null); // Stop tetris drop
            console.log("Game Over - Collision on new piece spawn");
            // Ensure player state reflects game over
             setPlayer(prev => ({...prev, collided: true, pieceType: 0})); // Mark as collided, maybe clear piece
             return false; // Indicate game over occurred
        } else {
            setPlayer({
                pos: newPlayerPos,
                tetromino: piece.shape,
                pieceType: type,
                collided: false,
            });
            // Reset drop time based on *current* speed multiplier when a new piece starts
            const nextDropTime = Math.max(100, TETRIS_DROP_INTERVAL_INITIAL / speedMultiplier);
            setTetrisDropTime(nextDropTime);
            return true; // Indicate successful reset
        }
    }, [checkTetrisCollision, speedMultiplier, gameOver]); // Remove grid dependency, pass it in

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

    const dropPlayer = useCallback((isSoftDrop: boolean = false) => {
        if (player.collided || gameOver || !gameStarted || isPaused) return; // Prevent dropping if paused

        // Check collision one step below using the Tetris-specific check
        if (!checkTetrisCollision(player, grid, { x: 0, y: 1 })) {
             setPlayer(prev => ({ ...prev, pos: { ...prev.pos, y: prev.pos.y + 1 } }));
             // If it's a user-initiated soft drop, maybe add score or slightly reset auto-drop timer
             if (isSoftDrop) {
                // setScore(prev => prev + 1); // Example: score for soft drop
             }
        } else {
            // If collision detected below (within Tetris bounds), mark as collided
             setPlayer(prev => ({ ...prev, collided: true }));
             setTetrisDropTime(null); // Stop the auto-drop interval when piece lands
        }
    }, [player, grid, checkTetrisCollision, gameOver, gameStarted, isPaused]); // Simplified dependencies


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
     const mergePieceToGrid = useCallback((currentGrid: TetrisGrid, currentPlayer: Player): { newGrid: TetrisGrid, linesCleared: number } => {
         // This function now receives grid and player to avoid stale state issues
         if (gameOver || isPaused) return { newGrid: currentGrid, linesCleared: 0 }; // Don't merge if paused or game over

         // Ensure player position is valid before merging (safety check)
         if (currentPlayer.pos.y < 0) {
              console.warn("Attempted to merge piece with negative Y position:", currentPlayer.pos.y);
              setGameOver(true); // Invalid state, end game
              return { newGrid: currentGrid, linesCleared: 0 };
         }

        const newGrid = currentGrid.map(row => [...row]); // Create a mutable copy

        let mergeGameOver = false; // Local flag for game over during merge
        currentPlayer.tetromino.forEach((row, y) => {
            if (mergeGameOver) return; // Stop processing if game over detected
            row.forEach((value, x) => {
                 if (mergeGameOver) return;
                if (value !== 0) {
                    const gridY = y + currentPlayer.pos.y;
                    const gridX = x + currentPlayer.pos.x;
                    // Ensure we are within grid boundaries before attempting to merge
                    // Merge piece ONLY within the TETRIS_HEIGHT
                    if (gridY >= 0 && gridY < TETRIS_HEIGHT && gridX >= 0 && gridX < TETRIS_WIDTH) {
                         if (newGrid[gridY]?.[gridX]?.[1] === 'clear') {
                           newGrid[gridY][gridX] = [currentPlayer.pieceType, 'merged'];
                         } else if (newGrid[gridY]?.[gridX]?.[1] === 'merged') {
                             console.warn(`Merge Overlap: Trying to merge onto existing merged block at [${gridX}, ${gridY}]`);
                             setGameOver(true);
                             mergeGameOver = true; // Set local flag
                             return; // Exit early if game over
                         }
                    } else if (gridY < 0 && gridX >=0 && gridX < TETRIS_WIDTH) {
                        // Handle case where part of the piece is above the grid after hard drop/rotation
                        console.log("Piece merged partially or fully above grid top.");
                        setGameOver(true);
                        mergeGameOver = true; // Set local flag
                        return;
                    }
                }
            });
        });

         if (mergeGameOver || gameOver) return { newGrid: currentGrid, linesCleared: 0 }; // Re-check game over status

        // --- Line Clearing ---
        let clearedLines = 0;
        const sweptGridRows: TetrisGrid = []; // Only store the valid Tetris rows first
        // Iterate from bottom of Tetris area up to top (y = TETRIS_HEIGHT - 1 down to 0)
        for (let y = TETRIS_HEIGHT - 1; y >= 0; y--) {
             const row = newGrid[y];
             // Check if the row is entirely filled with 'merged' blocks AND does not contain any 'G' (grey) blocks
             if (row.every(cell => cell[1] === 'merged' && cell[0] !== 'G')) {
                 clearedLines++;
             } else {
                 sweptGridRows.unshift(row); // Keep rows that are not full or contain grey blocks
             }
        }

         // Reconstruct the full grid
         const finalGrid: TetrisGrid = [];
        // Add new empty rows at the top for each cleared line
        while (finalGrid.length < clearedLines) {
             finalGrid.push(Array(TETRIS_WIDTH).fill([0, 'clear']));
        }
        // Add the kept rows
        finalGrid.push(...sweptGridRows);

         // Add the Pong area rows back (they were not part of the sweep)
         for (let y = TETRIS_HEIGHT; y < TOTAL_GRID_HEIGHT; y++) {
             // Ensure row exists before pushing
             finalGrid.push(newGrid[y] || Array(TETRIS_WIDTH).fill([0, 'clear']));
         }


        return { newGrid: finalGrid, linesCleared: clearedLines };


    }, [gameOver, isPaused]); // Removed dependencies on grid/player/score

    // Effect to update Tetris drop speed when speedMultiplier changes
    useEffect(() => {
        if (gameStarted && !gameOver && !isPaused && !player.collided && tetrisDropTime !== null) { // Check pause state
            const nextDropTime = Math.max(100, TETRIS_DROP_INTERVAL_INITIAL / speedMultiplier);
            setTetrisDropTime(nextDropTime);
        }
    }, [speedMultiplier, gameStarted, gameOver, player.collided, tetrisDropTime, isPaused]); // Add isPaused


    // Effect to handle piece collision and merging logic AFTER state update
    useEffect(() => {
        // Only trigger merge when the piece has *just* become collided and not paused, and game is running
        if (player.collided && player.pos.y < TETRIS_HEIGHT && gameStarted && !gameOver && !isPaused) {
            const { newGrid, linesCleared } = mergePieceToGrid(grid, player); // Pass current state

            if (gameOver) return; // Check if mergePieceToGrid set game over

            if (linesCleared > 0) {
                const pointsEarned = LINE_POINTS[linesCleared] || 0;
                setScore(prevScore => prevScore + pointsEarned);
            }

            setGrid(newGrid); // Update grid state

            // Reset player *after* grid update. resetPlayer now returns success/fail
            const resetSuccess = resetPlayer(newGrid); // Pass the *updated* grid for spawn check
             if (!resetSuccess) {
                 // Game over occurred during resetPlayer (spawn collision)
                 setGameStarted(false); // Ensure game loop stops
                 setTetrisDropTime(null);
             }

        } else if (player.collided && player.pos.y >= TETRIS_HEIGHT && !isPaused && gameStarted && !gameOver) { // Check pause state etc.
            // Handle case where piece somehow becomes collided below Tetris area (should not happen with correct checks)
            console.warn("Piece collided below Tetris floor. Resetting.");
            resetPlayer(grid); // Use current grid for reset check
        }
    }, [player.collided, player.pos.y, gameStarted, gameOver, isPaused, grid, player, mergePieceToGrid, resetPlayer]); // Added grid, player, resetPlayer, mergePieceToGrid


    // --- Pong Logic ---
    const updatePongState = useCallback(() => {
        if (isPaused) return; // Don't update pong if paused

         // Update Paddle Position (apply speed multiplier)
         setPaddle(prevPaddle => {
           let newX = prevPaddle.x;
           const currentPaddleSpeed = PADDLE_SPEED * speedMultiplier; // Apply multiplier
           if (keysPressed.current['a']?.pressed) { // Check key state
             newX -= currentPaddleSpeed;
           }
           if (keysPressed.current['s']?.pressed) { // Check key state
             newX += currentPaddleSpeed;
           }
           // Clamp paddle position within court bounds
           newX = Math.max(0, Math.min(newX, GAME_WIDTH - PADDLE_WIDTH));
           return { x: newX };
         });

        // Update Ball Position and Handle Collisions
        setBall(prevBall => {
            let nextX = prevBall.x; // Start with current pos
            let nextY = prevBall.y;
            let currentDx = prevBall.dx * speedMultiplier; // Effective speed for this tick
            let currentDy = prevBall.dy * speedMultiplier;
            let newDxDirection = prevBall.dx; // Base direction for bounce logic
            let newDyDirection = prevBall.dy;
            let brickBroken = false;
            let mutableGrid = grid.map(row => [...row]); // Create mutable copy for potential brick break

            nextX += currentDx;
            nextY += currentDy;


            // --- Boundary Collisions ---
            // Left/Right Walls
            if (nextX - BALL_RADIUS < 0 && currentDx < 0) {
                newDxDirection = Math.abs(prevBall.dx);
                nextX = BALL_RADIUS;
            } else if (nextX + BALL_RADIUS > GAME_WIDTH && currentDx > 0) {
                newDxDirection = -Math.abs(prevBall.dx);
                nextX = GAME_WIDTH - BALL_RADIUS;
            }

            // Top Wall (ceiling) - Bounce off y=0
            if (nextY - BALL_RADIUS < 0 && currentDy < 0) {
                newDyDirection = Math.abs(prevBall.dy);
                nextY = BALL_RADIUS;
                 if (Math.abs(newDxDirection) < minDxThreshold) {
                     newDxDirection = minDxThreshold * (newDxDirection >= 0 ? 1 : -1) * (Math.random() > 0.5 ? 1 : -1);
                 }
            }

            // --- Paddle Collision ---
            const paddleTop = PADDLE_Y;
            const paddleBottom = PADDLE_Y + PADDLE_HEIGHT;
            const paddleLeft = paddle.x; // Use current paddle state directly
            const paddleRight = paddle.x + PADDLE_WIDTH;

            if (
                nextY + BALL_RADIUS > paddleTop &&
                nextY - BALL_RADIUS < paddleBottom &&
                nextX + BALL_RADIUS > paddleLeft &&
                nextX - BALL_RADIUS < paddleRight &&
                currentDy > 0 // Ball moving down
            ) {
                 newDyDirection = -Math.abs(prevBall.dy);
                 nextY = paddleTop - BALL_RADIUS; // Place ball exactly on top

                 const hitPosRatio = (nextX - (paddleLeft + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
                 const clampedHitPosRatio = Math.max(-1, Math.min(1, hitPosRatio));
                 const maxHorizontalFactor = 1.5;
                 const baseSpeedX = INITIAL_BALL_SPEED_X;
                 let calculatedDxDirection = clampedHitPosRatio * baseSpeedX * maxHorizontalFactor;

                 if (Math.abs(calculatedDxDirection) < minDxThreshold) {
                    calculatedDxDirection = minDxThreshold * (clampedHitPosRatio >= 0 ? 1 : -1);
                 }

                 const maxBaseDx = baseSpeedX * maxHorizontalFactor;
                 newDxDirection = Math.max(-maxBaseDx, Math.min(maxBaseDx, calculatedDxDirection));
                 newDxDirection = Math.abs(newDxDirection) * (newDxDirection >= 0 ? 1 : -1); // Ensure direction sign is kept

            }


            // --- Tetris Brick Collision ---
            let collisionHandled = false;
            const gridXMin = Math.max(0, Math.floor(nextX - BALL_RADIUS));
            const gridXMax = Math.min(TETRIS_WIDTH - 1, Math.floor(nextX + BALL_RADIUS));
            const gridYMin = Math.max(0, Math.floor(nextY - BALL_RADIUS));
            const gridYMax = Math.min(TETRIS_HEIGHT - 1, Math.floor(nextY + BALL_RADIUS));

            // Collision detection loop
             brickLoop: // Label for breaking outer loop
             for (let y = gridYMin; y <= gridYMax; y++) {
                 for (let x = gridXMin; x <= gridXMax; x++) {
                     if (mutableGrid[y]?.[x]?.[1] === 'merged') {
                         const brickLeft = x;
                         const brickRight = x + 1;
                         const brickTop = y;
                         const brickBottom = y + 1;

                         const closestX = Math.max(brickLeft, Math.min(nextX, brickRight));
                         const closestY = Math.max(brickTop, Math.min(nextY, brickBottom));
                         const distX = nextX - closestX;
                         const distY = nextY - closestY;

                         if ((distX * distX + distY * distY) < (BALL_RADIUS * BALL_RADIUS)) {
                             // Collision occurred
                             collisionHandled = true;

                             const penX = BALL_RADIUS - Math.abs(distX);
                             const penY = BALL_RADIUS - Math.abs(distY);

                             if (penY < penX) { // Vertical collision is primary
                                 const collisionNormalY = (distY > 0) ? 1 : -1;
                                 nextY = (collisionNormalY > 0) ? brickBottom + BALL_RADIUS : brickTop - BALL_RADIUS;
                                 newDyDirection = -prevBall.dy; // Reflect base dy direction
                                 newDxDirection = prevBall.dx; // Keep base dx direction

                                 if (Math.abs(newDxDirection) < minDxThreshold) {
                                    newDxDirection = minDxThreshold * (newDxDirection >= 0 ? 1 : -1) * (Math.random() > 0.5 ? 1 : -1);
                                 }
                             } else { // Horizontal collision is primary
                                 const collisionNormalX = (distX > 0) ? 1 : -1;
                                 nextX = (collisionNormalX > 0) ? brickRight + BALL_RADIUS : brickLeft - BALL_RADIUS;
                                 newDxDirection = -prevBall.dx; // Reflect base dx direction
                                 newDyDirection = prevBall.dy; // Keep base dy direction
                             }

                             // Break the collided brick (ANY merged brick)
                             mutableGrid[y][x] = [0, 'clear'];
                             brickBroken = true;

                             break brickLoop; // Break out of both loops
                         }
                     }
                 }
             }


            // --- Post-Collision Updates ---
            if (brickBroken) {
                setGrid(mutableGrid); // Update grid state only if a brick was broken
                setScore(prev => prev + BRICK_BREAK_SCORE);
            }

            // --- Game Over Condition (Ball hits bottom floor of Pong area) ---
             if (nextY + BALL_RADIUS >= GAME_HEIGHT) {
                 setGameOver(true);
                 setGameStarted(false);
                 setTetrisDropTime(null);
                 console.log("Game Over - Ball missed paddle");
                 return prevBall; // Don't update ball if game over
             }

            // Clamp ball position slightly within bounds after collision resolution
            nextX = Math.max(BALL_RADIUS, Math.min(nextX, GAME_WIDTH - BALL_RADIUS));
            nextY = Math.max(BALL_RADIUS, Math.min(nextY, GAME_HEIGHT - BALL_RADIUS));

            // Return the updated state, storing the base directions
            return { x: nextX, y: nextY, dx: newDxDirection, dy: newDyDirection };
        });

    }, [paddle.x, grid, score, speedMultiplier, isPaused, minDxThreshold]); // Removed paddle dependency, using direct value


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
        dropPlayer(false); // Auto-drop is not a soft drop
    }, tetrisDropTime);


    // --- Continuous Movement Handling ---
    useEffect(() => {
        if (isPaused || gameOver || !gameStarted) return; // Only run when active

        const leftKey = keysPressed.current['arrowleft'];
        const rightKey = keysPressed.current['arrowright'];
        const downKey = keysPressed.current['arrowdown'];

        // Left movement
        if (leftKey?.pressed && leftKey.repeatTimeout === null) {
            leftKey.repeatTimeout = setInterval(() => {
                movePlayer(-1);
            }, MOVE_REPEAT_INTERVAL);
        } else if (!leftKey?.pressed && leftKey?.repeatTimeout !== null) {
            clearInterval(leftKey.repeatTimeout);
            leftKey.repeatTimeout = null;
        }

        // Right movement
        if (rightKey?.pressed && rightKey.repeatTimeout === null) {
            rightKey.repeatTimeout = setInterval(() => {
                movePlayer(1);
            }, MOVE_REPEAT_INTERVAL);
        } else if (!rightKey?.pressed && rightKey?.repeatTimeout !== null) {
            clearInterval(rightKey.repeatTimeout);
            rightKey.repeatTimeout = null;
        }

        // Soft drop movement
        if (downKey?.pressed && downKey.repeatTimeout === null) {
            downKey.repeatTimeout = setInterval(() => {
                dropPlayer(true); // Soft drop repeats
            }, SOFT_DROP_REPEAT_INTERVAL);
        } else if (!downKey?.pressed && downKey?.repeatTimeout !== null) {
            clearInterval(downKey.repeatTimeout);
            downKey.repeatTimeout = null;
        }

        // Cleanup function to clear intervals on component unmount or pause/game over
        return () => {
            if (leftKey?.repeatTimeout) clearInterval(leftKey.repeatTimeout);
            if (rightKey?.repeatTimeout) clearInterval(rightKey.repeatTimeout);
            if (downKey?.repeatTimeout) clearInterval(downKey.repeatTimeout);
            // Ensure refs are updated on cleanup if necessary (or rely on handleKeyUp)
             if (leftKey) leftKey.repeatTimeout = null;
             if (rightKey) rightKey.repeatTimeout = null;
             if (downKey) downKey.repeatTimeout = null;
        };
    }, [
        keysPressed.current['arrowleft']?.pressed,
        keysPressed.current['arrowright']?.pressed,
        keysPressed.current['arrowdown']?.pressed,
        isPaused, gameOver, gameStarted, movePlayer, dropPlayer // Include movePlayer and dropPlayer
    ]);


    // --- Input Handling ---
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
         if (!isClient) return; // Ignore input if not client

        const keyLower = event.key.toLowerCase();
        let handled = false;

        // Pause Toggle (works even if game not started or over, but only if client)
         if (keyLower === 'p') {
            if (gameStarted || isPaused) { // Allow pausing/unpausing if game started or already paused
                setIsPaused(prev => {
                    const nextPaused = !prev;
                    console.log(nextPaused ? "Game Paused" : "Game Resumed");
                    // Clear movement intervals on pause
                     if (nextPaused) {
                        Object.values(keysPressed.current).forEach(keyState => {
                            if (keyState.repeatTimeout) {
                                clearInterval(keyState.repeatTimeout);
                                keyState.repeatTimeout = null;
                            }
                        });
                     }
                    return nextPaused;
                });
                handled = true;
            }
         }

         // Ignore other inputs if paused or game not ready/active
         if (isPaused || !gameStarted || gameOver) {
            if (handled) event.preventDefault(); // Prevent default for 'p' even when paused
            return;
         }

        // Pong Controls (continuous) - Store lowercase
        if (keyLower === 'a' || keyLower === 's') {
             if (!keysPressed.current[keyLower]?.pressed) {
                keysPressed.current[keyLower] = { pressed: true, firstPressTime: Date.now(), repeatTimeout: null };
            }
            handled = true;
        }

        // Tetris Controls
        if (keyLower === 'arrowleft' || keyLower === 'arrowright' || keyLower === 'arrowdown') {
             if (!keysPressed.current[keyLower]?.pressed) { // First press
                 keysPressed.current[keyLower] = { pressed: true, firstPressTime: Date.now(), repeatTimeout: null };
                 if (keyLower === 'arrowleft') movePlayer(-1);
                 if (keyLower === 'arrowright') movePlayer(1);
                 if (keyLower === 'arrowdown') dropPlayer(true); // Initial soft drop

                 // Set timeout for continuous move/drop AFTER initial action
                 setTimeout(() => {
                     // Check if the key is still pressed after the delay
                     if (keysPressed.current[keyLower]?.pressed) {
                         // Effect hook will handle setting up the interval
                     }
                 }, MOVE_REPEAT_DELAY);
             }
             handled = true;
         } else if (keyLower === 'arrowup') {
             // Rotate - discrete, only on first press
             if (!keysPressed.current[keyLower]?.pressed) {
                  playerRotate();
                  keysPressed.current[keyLower] = { pressed: true, firstPressTime: Date.now(), repeatTimeout: null };
             }
             handled = true;
         } else if (keyLower === ' ') { // Space for Hard drop - discrete
             if (!keysPressed.current[keyLower]?.pressed) {
                 hardDropPlayer();
                 keysPressed.current[keyLower] = { pressed: true, firstPressTime: Date.now(), repeatTimeout: null };
             }
             handled = true;
         }


        if (handled) {
             event.preventDefault(); // Prevent default browser actions (e.g., scrolling)
        }

    }, [gameOver, gameStarted, isPaused, movePlayer, hardDropPlayer, playerRotate, dropPlayer, isClient]); // Added dropPlayer, isPaused

    const handleKeyUp = useCallback((event: KeyboardEvent) => {
         if (!isClient) return;
        const keyLower = event.key.toLowerCase();

        if (keysPressed.current[keyLower]) {
             if (keysPressed.current[keyLower].repeatTimeout) {
                 clearInterval(keysPressed.current[keyLower].repeatTimeout!);
             }
            keysPressed.current[keyLower].pressed = false;
            keysPressed.current[keyLower].firstPressTime = null;
            keysPressed.current[keyLower].repeatTimeout = null;
        }

    }, [isClient]); // Removed unnecessary dependencies


     // Attach event listeners only on the client
     useEffect(() => {
         if (!isClient) return;
         window.addEventListener('keydown', handleKeyDown);
         window.addEventListener('keyup', handleKeyUp);
         // Cleanup: Remove listeners and clear any lingering timeouts/intervals
         return () => {
             window.removeEventListener('keydown', handleKeyDown);
             window.removeEventListener('keyup', handleKeyUp);
             Object.values(keysPressed.current).forEach(keyState => {
                 if (keyState.repeatTimeout) {
                     clearInterval(keyState.repeatTimeout);
                 }
             });
             keysPressed.current = {}; // Clear keys pressed state on unmount
         };
     }, [isClient, handleKeyDown, handleKeyUp]); // Re-add if handlers change

    // --- Start/Reset Game ---
    const startGame = useCallback(() => {
        if (!isClient) return; // Ensure this runs only client-side
        console.log("Starting Game");

        // Clear any existing intervals/timeouts from previous game state
         Object.values(keysPressed.current).forEach(keyState => {
             if (keyState.repeatTimeout) {
                 clearInterval(keyState.repeatTimeout);
             }
         });
         keysPressed.current = {}; // Reset keys pressed state fully

        const initialGrid = createEmptyGrid(); // Create fresh grid
        setGrid(initialGrid); // Set grid FIRST
        setScore(0); // Reset score
        setIsPaused(false); // Ensure game is not paused
        setGameOver(false); // Reset game over flag
        setBall({ // Reset ball state
            ...baseInitialBallState,
            dx: INITIAL_BALL_SPEED_X * (Math.random() > 0.5 ? 1 : -1),
            dy: INITIAL_BALL_SPEED_Y,
        });
        setPaddle(baseInitialPaddleState); // Reset paddle state
        setPlayer(baseInitialPlayerState); // Temporarily reset player before final resetPlayer call

        setGameStarted(true); // Mark game as started *before* resetPlayer

        // Reset player piece and start drop timer AFTER setting gameStarted
        const resetSuccess = resetPlayer(initialGrid); // Pass the initial grid

        if (!resetSuccess) {
            // Should typically not happen on a fresh grid, but handle anyway
            console.error("Game over immediately on start - spawn collision?");
            setGameStarted(false);
            setGameOver(true);
        } else {
             // Explicitly set drop time if resetPlayer succeeded and game started
             const initialDropTime = Math.max(100, TETRIS_DROP_INTERVAL_INITIAL / 1); // Use initial speed multiplier (1)
             setTetrisDropTime(initialDropTime);
        }

    }, [resetPlayer, isClient]); // Make sure resetPlayer is stable


    // --- Render Grid ---
    // Calculate display grid using useMemo
    const displayGrid = useMemo(() => {
        // Don't draw player if game over
        return updateGrid(grid, gameOver ? baseInitialPlayerState : player);
     }, [grid, player, updateGrid, gameOver]);


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

    