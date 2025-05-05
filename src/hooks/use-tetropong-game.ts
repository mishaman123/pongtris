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
    dx: number; // velocity in grid units per tick (base direction)
    dy: number; // velocity in grid units per tick (base direction)
};

export type Paddle = {
    x: number; // position in grid units
};

// Type for the state stored in keysPressed ref
type KeyState = {
    pressed: boolean;
    firstPressTime: number | null;
    repeatTimeout: ReturnType<typeof setInterval> | null;
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

    // Ref to store key pressed state, including repeat timeouts
    const keysPressed = useRef<{ [key: string]: KeyState }>({});
    
    // Direct key state for paddle movement (completely decoupled from tetris)
    const paddleKeysPressed = useRef<{ [key: string]: boolean }>({
        'a': false,
        's': false
    });

    // Calculate speed multiplier based on score (cumulative 5% increase per 12 points)
    const speedMultiplier = useMemo(() => {
        const levels = Math.floor(score / 12);
        // Cumulative increase: base * (1 + rate)^levels
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
     const resetPlayer = useCallback((currentGrid: TetrisGrid): boolean => {
        // Ensure this doesn't run if the component isn't mounted
        if (!isClient) return false;

        const { type, piece } = getRandomTetromino();
        const newPlayerPos = { x: TETRIS_WIDTH / 2 - Math.floor(piece.shape[0].length / 2), y: 0 };

        // Check collision at spawn position using the Tetris-specific height on the provided grid
        // Crucially, use the passed-in `currentGrid` which should be the latest state
        if (checkTetrisCollision({ ...baseInitialPlayerState, pos: newPlayerPos, tetromino: piece.shape, pieceType: type }, currentGrid, { x: 0, y: 0 })) {
             // Game Over should be handled by the caller based on this return value
             console.log("Collision detected on new piece spawn");
             return false; // Indicate game over occurred
        } else {
            setPlayer({
                pos: newPlayerPos,
                tetromino: piece.shape,
                pieceType: type,
                collided: false,
            });
            // Reset drop time based on *current* score when a new piece starts
            // Recalculate multiplier based on current score (which might be updated)
            const currentMultiplier = Math.pow(1.05, Math.floor(score / 12));
            const initialDropTime = Math.max(100, TETRIS_DROP_INTERVAL_INITIAL / currentMultiplier);
            setTetrisDropTime(initialDropTime);
            console.log("New piece spawned, drop time:", initialDropTime);

            return true; // Indicate successful reset
        }
     }, [checkTetrisCollision, isClient, score]); // Removed gameOver dependency


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
    }, [player, grid, checkTetrisCollision, gameOver, gameStarted, isPaused]);


     // --- Merge and Line Clear ---
     const mergePieceToGrid = useCallback((currentGrid: TetrisGrid, currentPlayer: Player): { newGrid: TetrisGrid, linesCleared: number, gameOverTriggered: boolean } => {
         // This function now receives grid and player to avoid stale state issues
         if (isPaused) return { newGrid: currentGrid, linesCleared: 0, gameOverTriggered: false }; // Don't merge if paused

         let mergeGameOver = false; // Local flag for game over during merge

         // Ensure player position is valid before merging (safety check)
         if (currentPlayer.pos.y < 0) {
              console.warn("Attempted to merge piece with negative Y position:", currentPlayer.pos.y);
              mergeGameOver = true; // Trigger game over
              // Don't return early, let the function finish to return the state
         }

        const newGrid = currentGrid.map(row => [...row]); // Create a mutable copy

        if (!mergeGameOver) {
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
                                 mergeGameOver = true; // Set local flag
                                 return; // Exit early if game over
                             }
                        } else if (gridY < 0 && gridX >=0 && gridX < TETRIS_WIDTH) {
                            // Handle case where part of the piece is above the grid top
                            console.log("Piece merged partially or fully above grid top.");
                            mergeGameOver = true; // Set local flag
                            return;
                        }
                    }
                });
            });
        }


        // --- Line Clearing (only if game isn't over yet) ---
        let clearedLines = 0;
        let sweptGridRows: TetrisGrid = []; // Only store the valid Tetris rows first

        if (!mergeGameOver) {
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
        } else {
            // If game over happened during merge, just keep existing Tetris rows
            sweptGridRows = newGrid.slice(0, TETRIS_HEIGHT);
        }

         // Reconstruct the full grid
         const finalGrid: TetrisGrid = [];
        // Add new empty rows at the top for each cleared line (if lines were cleared)
        if (clearedLines > 0 && !mergeGameOver) {
            while (finalGrid.length < clearedLines) {
                 finalGrid.push(Array(TETRIS_WIDTH).fill([0, 'clear']));
            }
        } else if (!mergeGameOver) {
             // If no lines cleared and not game over, just add empty rows if needed to reach TETRIS_HEIGHT
             while (finalGrid.length + sweptGridRows.length < TETRIS_HEIGHT) {
                finalGrid.push(Array(TETRIS_WIDTH).fill([0, 'clear']));
             }
        }
        // Add the kept rows
        finalGrid.push(...sweptGridRows);

         // Add the Pong area rows back (they were not part of the sweep)
         for (let y = TETRIS_HEIGHT; y < TOTAL_GRID_HEIGHT; y++) {
             // Ensure row exists before pushing
             finalGrid.push(newGrid[y] || Array(TETRIS_WIDTH).fill([0, 'clear']));
         }


        return { newGrid: finalGrid, linesCleared: clearedLines, gameOverTriggered: mergeGameOver };


     }, [isPaused]); // Removed dependencies, relies on passed state


    // Effect to update Tetris drop speed when speedMultiplier changes
    useEffect(() => {
        if (gameStarted && !gameOver && !isPaused && !player.collided && tetrisDropTime !== null) { // Check pause state
            const nextDropTime = Math.max(100, TETRIS_DROP_INTERVAL_INITIAL / speedMultiplier);
             if (Math.abs(nextDropTime - tetrisDropTime) > 1) { // Avoid tiny updates causing interval churn
               setTetrisDropTime(nextDropTime);
             }
        }
    }, [speedMultiplier, gameStarted, gameOver, player.collided, tetrisDropTime, isPaused]); // Add isPaused


    // Effect to handle piece collision and merging logic AFTER state update
    useEffect(() => {
        // Only trigger merge when the piece has *just* become collided and not paused, and game is running
        if (player.collided && gameStarted && !gameOver && !isPaused) {

            const { newGrid, linesCleared, gameOverTriggered } = mergePieceToGrid(grid, player); // Pass current state

            // If the merge process itself signaled a game over, set the state and stop
            if (gameOverTriggered) {
                 setGameOver(true);
                 setGameStarted(false);
                 setTetrisDropTime(null);
                 setGrid(newGrid); // Update grid to show the state that caused game over
                 console.log("Game Over triggered by mergePieceToGrid");
                 return; // Stop further processing in this effect
            }

            // If merge was successful (no game over yet)
            if (linesCleared > 0) {
                const pointsEarned = LINE_POINTS[linesCleared] || 0;
                setScore(prevScore => prevScore + pointsEarned);
            }

            setGrid(newGrid); // Update grid state with potentially cleared lines

            // Reset player *after* grid update. resetPlayer now returns success/fail
            const resetSuccess = resetPlayer(newGrid); // Pass the *updated* grid for spawn check

             if (!resetSuccess) {
                 // Game over occurred during resetPlayer (spawn collision)
                 setGameOver(true); // Explicitly set game over here
                 setGameStarted(false); // Ensure game loop stops
                 setTetrisDropTime(null);
                 console.log("Game Over triggered by resetPlayer (spawn collision)");
             }

        } else if (player.collided && (!gameStarted || gameOver || isPaused)) {
            // Handle cases where piece becomes collided but game is not in a state to merge/reset
            // (e.g., collided right as game ended, or while paused)
            // We might just need to ensure the drop timer is stopped.
            setTetrisDropTime(null);
        }
    }, [player.collided, gameStarted, gameOver, isPaused, grid, player, mergePieceToGrid, resetPlayer]);



    // --- Pong Logic ---
    const updatePongState = useCallback(() => {
        if (isPaused || gameOver) return; // Don't update pong if paused or game over

        // Ball and collision logic - don't change the original logic structure
        setBall(prevBall => {
            let nextX = prevBall.x; // Start with current pos
            let nextY = prevBall.y;
            let currentDx = prevBall.dx * speedMultiplier; // Effective speed for this tick
            let currentDy = prevBall.dy * speedMultiplier;
            let newDxDirection = prevBall.dx; // Base direction for bounce logic
            let newDyDirection = prevBall.dy;
            let brickBroken = false; // Flag if *any* brick (grey or colored) was broken
            let scoreAdded = false; // Flag if points should be added (only for non-grey)
            let mutableGrid = grid.map(row => [...row]); // Create mutable copy for potential brick break
            let collisionHandled = false; // Flag to prevent multiple collision logic per tick

            nextX += currentDx;
            nextY += currentDy;

            // --- Boundary Collisions ---
            // Left/Right Walls
            if (nextX - BALL_RADIUS < 0 && currentDx < 0) {
                newDxDirection = Math.abs(prevBall.dx);
                nextX = BALL_RADIUS;
                collisionHandled = true;
            } else if (nextX + BALL_RADIUS > GAME_WIDTH && currentDx > 0) {
                newDxDirection = -Math.abs(prevBall.dx);
                nextX = GAME_WIDTH - BALL_RADIUS;
                collisionHandled = true;
            }

            // Top Wall (ceiling) - Bounce off y=0
            if (nextY - BALL_RADIUS < 0 && currentDy < 0) {
                newDyDirection = Math.abs(prevBall.dy);
                nextY = BALL_RADIUS;
                collisionHandled = true;
                 if (Math.abs(newDxDirection) < minDxThreshold) {
                     // Slightly adjust horizontal direction if too vertical
                     newDxDirection = minDxThreshold * (newDxDirection >= 0 ? 1 : -1) * (Math.random() > 0.5 ? 1 : -1);
                 }
            }

            // --- Paddle Collision ---
            if (!collisionHandled) { // Only check paddle if no wall collision yet
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
                     collisionHandled = true;

                     // Paddle angle logic
                     const hitPosRatio = (nextX - (paddleLeft + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
                     const clampedHitPosRatio = Math.max(-1, Math.min(1, hitPosRatio));
                     const maxHorizontalFactor = 1.5;
                     const baseSpeedX = INITIAL_BALL_SPEED_X;
                     let calculatedDxDirection = clampedHitPosRatio * baseSpeedX * maxHorizontalFactor;

                     // Enforce minimum horizontal speed away from vertical
                     if (Math.abs(calculatedDxDirection) < minDxThreshold) {
                         calculatedDxDirection = minDxThreshold * (clampedHitPosRatio >= 0 ? 1 : -1);
                         // Ensure the sign is correct even if clampedHitPosRatio was 0
                         if (calculatedDxDirection === 0) calculatedDxDirection = minDxThreshold * (Math.random() > 0.5 ? 1 : -1);
                     }

                     // Cap the maximum horizontal speed change
                     const maxBaseDx = baseSpeedX * maxHorizontalFactor;
                     newDxDirection = Math.max(-maxBaseDx, Math.min(maxBaseDx, calculatedDxDirection));

                }
            }


            // --- Tetris Brick Collision ---
            if (!collisionHandled) { // Only check bricks if no other collision handled
                const gridXMin = Math.max(0, Math.floor(nextX - BALL_RADIUS));
                const gridXMax = Math.min(TETRIS_WIDTH - 1, Math.floor(nextX + BALL_RADIUS));
                const gridYMin = Math.max(0, Math.floor(nextY - BALL_RADIUS));
                const gridYMax = Math.min(TETRIS_HEIGHT - 1, Math.floor(nextY + BALL_RADIUS));

                // Collision detection loop
                let breakLoop = false; // Use a flag instead of goto
                 for (let y = gridYMin; y <= gridYMax && !breakLoop; y++) {
                     for (let x = gridXMin; x <= gridXMax && !breakLoop; x++) {
                         // Check if the cell exists and is merged before accessing its properties
                         if (mutableGrid[y]?.[x]?.[1] === 'merged') {
                             const brickLeft = x;
                             const brickRight = x + 1;
                             const brickTop = y;
                             const brickBottom = y + 1;

                             const closestX = Math.max(brickLeft, Math.min(nextX, brickRight));
                             const closestY = Math.max(brickTop, Math.min(nextY, brickBottom));
                             const distX = nextX - closestX;
                             const distY = nextY - closestY;
                             const distSq = distX * distX + distY * distY;

                             if (distSq < (BALL_RADIUS * BALL_RADIUS)) {
                                 // Collision occurred
                                 collisionHandled = true;

                                 // --- Determine Bounce Direction ---
                                 const penX = BALL_RADIUS - Math.abs(distX);
                                 const penY = BALL_RADIUS - Math.abs(distY);

                                 if (penY < penX) { // Vertical collision
                                     nextY = (distY > 0) ? brickBottom + BALL_RADIUS : brickTop - BALL_RADIUS;
                                     newDyDirection = -prevBall.dy;
                                      if (Math.abs(newDxDirection) < minDxThreshold) {
                                          newDxDirection = minDxThreshold * (newDxDirection >= 0 ? 1 : -1) * (Math.random() > 0.5 ? 1 : -1);
                                      }
                                 } else { // Horizontal collision
                                     nextX = (distX > 0) ? brickRight + BALL_RADIUS : brickLeft - BALL_RADIUS;
                                     newDxDirection = -prevBall.dx;
                                 }

                                 // Break the collided brick (grey or colored)
                                 if (mutableGrid[y][x][0] !== 0) { // Check if it's not already cleared
                                     const brickType = mutableGrid[y][x][0]; // Get brick type before clearing
                                     mutableGrid[y][x] = [0, 'clear']; // Clear the brick
                                     brickBroken = true; // Mark that a brick was broken
                                      // Only add score if it wasn't a grey brick ('G')
                                      // if (brickType !== 'G') { // Keep scoring for grey bricks too for now
                                         scoreAdded = true;
                                     //  }
                                 }

                                 breakLoop = true; // Set flag to exit loops
                             }
                         }
                     }
                 }
            }


            // --- Post-Collision Updates ---
            if (brickBroken) { // Check if *any* brick was broken
                setGrid(mutableGrid); // Update grid state
                if (scoreAdded) { // Add score only if a non-grey brick was broken
                    setScore(prev => prev + BRICK_BREAK_SCORE);
                }
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

    }, [paddle.x, grid, score, speedMultiplier, isPaused, minDxThreshold, gameOver]); // Add gameOver dependency

    // New function to handle paddle movement separately from the ball and tetris
    const updatePaddlePosition = useCallback(() => {
        if (isPaused || gameOver || !gameStarted) return;
        
        setPaddle(prevPaddle => {
            let newX = prevPaddle.x;
            const currentPaddleSpeed = PADDLE_SPEED * speedMultiplier; // Apply multiplier
            
            if (paddleKeysPressed.current['a']) { // Use direct key state ref
                newX -= currentPaddleSpeed;
            }
            if (paddleKeysPressed.current['s']) { // Use direct key state ref
                newX += currentPaddleSpeed;
            }
            
            // Clamp paddle position within court bounds
            newX = Math.max(0, Math.min(newX, GAME_WIDTH - PADDLE_WIDTH));
            return { x: newX };
        });
    }, [isPaused, gameOver, gameStarted, speedMultiplier]);

    // --- Game Loop for ball movement and collision detection ---
    useInterval(() => {
        if (!isClient || !gameStarted || gameOver || isPaused) return;
        updatePongState();
        // Tetris drop is handled by its own interval (tetrisDropTime)
    }, gameStarted && !gameOver && !isPaused ? GAME_TICK_MS : null);

    // --- Paddle Movement Loop - Higher frequency for smoother movement ---
    useInterval(() => {
        if (!isClient || !gameStarted || gameOver || isPaused) return;
        updatePaddlePosition();
    }, gameStarted && !gameOver && !isPaused ? 8 : null); // 8ms = ~120fps for extremely smooth movement

    // --- Tetris Auto Drop Interval ---
    useInterval(() => {
        // Only drop if game is running, not over, and piece hasn't collided yet and not paused
        if (!isClient || !gameStarted || gameOver || player.collided || isPaused) return;
        dropPlayer(false); // Auto-drop is not a soft drop
    }, tetrisDropTime);


     // --- Continuous Movement Handling ---
     useEffect(() => {
         if (isPaused || gameOver || !gameStarted) return; // Only run when active

         const handleRepeat = (key: string, action: () => void, interval: number) => {
             const keyState = keysPressed.current[key];
             if (keyState?.pressed && !keyState.repeatTimeout) {
                 keyState.repeatTimeout = setInterval(() => {
                     // Ensure key is still pressed inside interval callback
                     // AND game is still active
                     if (keysPressed.current[key]?.pressed && !isPaused && !gameOver && gameStarted) {
                         action();
                     } else {
                         // Clear interval if key was released or game state changed
                         const currentKeyState = keysPressed.current[key];
                         // Check if keyState and repeatTimeout exist before clearing
                         if (currentKeyState?.repeatTimeout) {
                             clearInterval(currentKeyState.repeatTimeout);
                             currentKeyState.repeatTimeout = null;
                         }
                     }
                 }, interval);
             } else if (!keyState?.pressed && keyState?.repeatTimeout !== null) {
                 // Ensure keyState and keyState.repeatTimeout exist before clearing
                 if (keyState?.repeatTimeout) { // Added null check for keyState here as well
                     clearInterval(keyState.repeatTimeout);
                     keyState.repeatTimeout = null;
                 }
             }
         };

         // Only set up continuous movement for Tetris controls - paddle movement is handled by separate interval
         handleRepeat('arrowleft', () => movePlayer(-1), MOVE_REPEAT_INTERVAL);
         handleRepeat('arrowright', () => movePlayer(1), MOVE_REPEAT_INTERVAL);
         handleRepeat('arrowdown', () => dropPlayer(true), SOFT_DROP_REPEAT_INTERVAL);
         
         // Paddle controls don't need repeat timeouts anymore, they're handled by the high-frequency paddle interval

         // Cleanup function to clear intervals on component unmount or pause/game over
         return () => {
              // Clear all known repeat intervals
             ['arrowleft', 'arrowright', 'arrowdown'].forEach(key => {
                  const keyState = keysPressed.current[key];
                 // Check if keyState and repeatTimeout exist before clearing
                 if (keyState?.repeatTimeout) {
                     clearInterval(keyState.repeatTimeout);
                 }
             });
         };
     }, [isPaused, gameOver, gameStarted, movePlayer, dropPlayer]);



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
                            if (keyState?.repeatTimeout) { // Check if keyState exists
                                clearInterval(keyState.repeatTimeout);
                                keyState.repeatTimeout = null;
                            }
                        });
                        // Also reset paddle key states on pause
                        paddleKeysPressed.current = { 'a': false, 's': false };
                    }
                    return nextPaused;
                });
                handled = true;
            }
        }

        // Paddle controls are directly set in the ref - completely separate from the keysPressed ref
        if (gameStarted && !gameOver && !isPaused && (keyLower === 'a' || keyLower === 's')) {
            paddleKeysPressed.current[keyLower] = true;
            handled = true;
        }

        // Other controls only work when game is fully active
        if (!isPaused && gameStarted && !gameOver) {
            // Tetris Controls
            if (keyLower === 'arrowleft' || keyLower === 'arrowright' || keyLower === 'arrowdown') {
                if (!keysPressed.current[keyLower]?.pressed) { // First press
                    keysPressed.current[keyLower] = { pressed: true, firstPressTime: Date.now(), repeatTimeout: null };
                    if (keyLower === 'arrowleft') movePlayer(-1);
                    if (keyLower === 'arrowright') movePlayer(1);
                    if (keyLower === 'arrowdown') dropPlayer(true); // Initial soft drop
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
        }

        if (handled) {
            event.preventDefault(); // Prevent default browser actions (e.g., scrolling)
        }
    }, [gameOver, gameStarted, isPaused, movePlayer, hardDropPlayer, playerRotate, dropPlayer, isClient]);

    const handleKeyUp = useCallback((event: KeyboardEvent) => {
        if (!isClient) return;
        const keyLower = event.key.toLowerCase();
        
        // Handle paddle keys directly
        if (keyLower === 'a' || keyLower === 's') {
            paddleKeysPressed.current[keyLower] = false;
        }
        
        // Handle tetris keys through the keysPressed ref
        const keyState = keysPressed.current[keyLower];
        if (keyState) {
            // Clear the interval directly if it exists
            if (keyState.repeatTimeout) {
                clearInterval(keyState.repeatTimeout);
            }
            // Update the state in the ref
            keyState.pressed = false;
            keyState.firstPressTime = null;
            keyState.repeatTimeout = null;
        }
    }, [isClient]);


     // Attach event listeners only on the client
     useEffect(() => {
         if (!isClient) return;
         window.addEventListener('keydown', handleKeyDown);
         window.addEventListener('keyup', handleKeyUp);
         // Cleanup: Remove listeners and clear any lingering timeouts/intervals
         return () => {
             window.removeEventListener('keydown', handleKeyDown);
             window.removeEventListener('keyup', handleKeyUp);
             // Clear all known repeat intervals on unmount
              ['arrowleft', 'arrowright', 'arrowdown', 'a', 's', ' ', 'arrowup'].forEach(key => { // Include all keys managed
                 const keyState = keysPressed.current[key];
                if (keyState?.repeatTimeout) {
                    clearInterval(keyState.repeatTimeout);
                }
            });
             keysPressed.current = {}; // Clear keys pressed state fully on unmount
         };
     }, [isClient, handleKeyDown, handleKeyUp]); // Re-add if handlers change

    // --- Start/Reset Game ---
    const startGame = useCallback(() => {
        if (!isClient) return; // Ensure this runs only client-side
        console.log("Starting Game");

        // Clear any existing intervals/timeouts from previous game state
        Object.values(keysPressed.current).forEach(keyState => {
            if (keyState?.repeatTimeout) {
                clearInterval(keyState.repeatTimeout);
            }
        });
        keysPressed.current = {}; // Reset keys pressed state fully
        paddleKeysPressed.current = { 'a': false, 's': false }; // Reset paddle keys

        const initialGrid = createEmptyGrid(); // Create fresh grid

        // Reset states before starting the game logic
        setGameOver(false); // Reset game over flag FIRST
        setGameStarted(false); // Set to false initially, will be set to true later
        setIsPaused(false); // Ensure game is not paused
        setScore(0); // Reset score
        setGrid(initialGrid); // Set grid FIRST, before resetting player
        setBall({ // Reset ball state
            ...baseInitialBallState,
            dx: INITIAL_BALL_SPEED_X * (Math.random() > 0.5 ? 1 : -1), // Randomize initial X direction
            dy: INITIAL_BALL_SPEED_Y,
        });
        setPaddle(baseInitialPaddleState); // Reset paddle state

        // Important: Set player state *before* calling resetPlayer for the first piece
        setPlayer(baseInitialPlayerState); // Reset player to default empty state

        // Mark game as started *before* the final player reset
        setGameStarted(true);

        // Reset player to get the first piece, *after* grid and gameStarted are set.
        // Pass the freshly created initialGrid.
        const resetSuccess = resetPlayer(initialGrid);

        if (!resetSuccess) {
            // This indicates a spawn collision immediately on start, which shouldn't happen
            // with the current logic but is kept as a safeguard.
            console.error("Game over immediately on start - spawn collision?");
            setGameStarted(false); // Set back to false if reset failed
            setGameOver(true);
            setTetrisDropTime(null); // Ensure timer is null if game over on start
        } else {
             // Calculate initial drop time AFTER successful reset
             const initialMultiplier = Math.pow(1.05, Math.floor(0 / 12)); // Should be 1
             const initialDropTime = Math.max(100, TETRIS_DROP_INTERVAL_INITIAL / initialMultiplier);
             setTetrisDropTime(initialDropTime);
             console.log("Game started successfully, initial drop time:", initialDropTime);
        }

    }, [resetPlayer, isClient]); // resetPlayer dependency is important


    // --- Render Grid ---
    // Calculate display grid using useMemo
    const displayGrid = useMemo(() => {
        // Don't draw player if game over or not started yet
        // Pass the current player state for drawing if the game is active
        return updateGrid(grid, !gameStarted || gameOver ? baseInitialPlayerState : player);
     }, [grid, player, updateGrid, gameOver, gameStarted]); // Add gameStarted


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
