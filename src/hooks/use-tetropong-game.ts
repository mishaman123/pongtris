
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useInterval } from './use-interval';
import { useEventListener } from './use-event-listener';
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

const initialPlayerState: Player = {
    pos: { x: TETRIS_WIDTH / 2 - 1, y: 0 },
    tetromino: TETROMINOS[0].shape,
    pieceType: 0,
    collided: false,
};

const initialBallState: Ball = {
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT / 2, // Start ball in the middle of the whole grid
    dx: INITIAL_BALL_SPEED_X * (Math.random() > 0.5 ? 1 : -1),
    dy: INITIAL_BALL_SPEED_Y,
};

const initialPaddleState: Paddle = {
    x: (GAME_WIDTH - PADDLE_WIDTH) / 2,
};

const GAME_TICK_MS = 50; // Update game state approx 20 times per second
const TETRIS_DROP_INTERVAL_INITIAL = 800; // Milliseconds

export const useTetroPongGame = () => {
    const [player, setPlayer] = useState<Player>(initialPlayerState);
    const [grid, setGrid] = useState<TetrisGrid>(createEmptyGrid());
    const [ball, setBall] = useState<Ball>(initialBallState);
    const [paddle, setPaddle] = useState<Paddle>(initialPaddleState);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [tetrisDropTime, setTetrisDropTime] = useState<number | null>(null);
    const [isClient, setIsClient] = useState(false); // For hydration safety

    const keysPressed = useRef<{ [key: string]: boolean }>({});

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

                    if (
                        nextY >= TOTAL_GRID_HEIGHT || // Check total grid bounds
                        nextX < 0 ||
                        nextX >= TETRIS_WIDTH ||
                        (g[nextY] && g[nextY][nextX] && g[nextY][nextX][1] === 'merged') // Check for merged blocks
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

        // 3. We don't draw the ball/paddle directly onto the grid, they are rendered separately.
        //    Their positions are used for collision checks against the grid.

        return newGrid;
    }, []);


     // --- Tetris Logic ---
     const resetPlayer = useCallback(() => {
        const { type, piece } = getRandomTetromino();
        const newPlayerPos = { x: TETRIS_WIDTH / 2 - Math.floor(piece.shape[0].length / 2), y: 0 };

        setPlayer(prevPlayer => {
            const tempGrid = grid; // Use the current grid state for collision check
            if (checkTetrisCollision({ ...prevPlayer, pos: newPlayerPos, tetromino: piece.shape, pieceType: type }, tempGrid, { x: 0, y: 0 })) {
                setGameOver(true);
                setGameStarted(false);
                setTetrisDropTime(null);
                console.log("Game Over - Collision on new piece");
                return prevPlayer; // Keep old player state on game over
            } else {
                return {
                    pos: newPlayerPos,
                    tetromino: piece.shape,
                    pieceType: type,
                    collided: false,
                };
            }
        });
    }, [grid, checkTetrisCollision]); // grid dependency is needed

    const rotate = (matrix: TetrisPieceShape): TetrisPieceShape => {
        // Transpose
        const rotated = matrix[0].map((_, index) => matrix.map(row => row[index]));
        // Reverse each row to rotate clockwise
        return rotated.map(row => row.reverse());
    };

    const playerRotate = useCallback(() => {
        if (player.pieceType === 'O') return; // Don't rotate 'O' piece

        const clonedPlayer = JSON.parse(JSON.stringify(player));
        clonedPlayer.tetromino = rotate(clonedPlayer.tetromino);

        const currentX = clonedPlayer.pos.x;
        let offset = 1;
        while (checkTetrisCollision(clonedPlayer, grid, { x: 0, y: 0 })) {
            clonedPlayer.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            // Check boundaries after attempting wall kick
            if (offset > clonedPlayer.tetromino[0].length + 1 || clonedPlayer.pos.x < 0) {
                 // console.log("Rotation failed boundary check");
                 clonedPlayer.pos.x = currentX; // Reset position if wall kick fails
                 clonedPlayer.tetromino = player.tetromino; // Revert rotation
                return; // Exit without setting state
            }
        }
        setPlayer(clonedPlayer);
    }, [player, grid, checkTetrisCollision]);


    const movePlayer = useCallback((dir: number) => {
        if (!checkTetrisCollision(player, grid, { x: dir, y: 0 })) {
            setPlayer(prev => ({ ...prev, pos: { ...prev.pos, x: prev.pos.x + dir } }));
        }
    }, [player, grid, checkTetrisCollision]);

    const dropPlayer = useCallback(() => {
        // Check collision one step below
        if (!checkTetrisCollision(player, grid, { x: 0, y: 1 })) {
             setPlayer(prev => ({ ...prev, pos: { ...prev.pos, y: prev.pos.y + 1 } }));
        } else {
            // If collision detected below, mark as collided but don't merge immediately
             setPlayer(prev => ({ ...prev, collided: true }));
             setTetrisDropTime(null); // Stop the interval when piece lands
        }
    }, [player, grid, checkTetrisCollision]);


    const hardDropPlayer = useCallback(() => {
       if (gameOver || player.collided) return;
        let newY = player.pos.y;
        while (!checkTetrisCollision(player, grid, { x: 0, y: newY - player.pos.y + 1 })) {
             newY++;
        }
        // Set position to the lowest possible point and mark as collided
        setPlayer(prev => ({ ...prev, pos: { ...prev.pos, y: newY }, collided: true }));
        setTetrisDropTime(null); // Stop the interval immediately
    }, [player, grid, checkTetrisCollision, gameOver]);


     // --- Merge and Line Clear ---
     const mergePieceToGrid = useCallback(() => {
        const newGrid = grid.map(row => [...row]); // Create a mutable copy

        player.tetromino.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const gridY = y + player.pos.y;
                    const gridX = x + player.pos.x;
                    // Ensure we are within grid boundaries before attempting to merge
                    if (gridY >= 0 && gridY < TOTAL_GRID_HEIGHT && gridX >= 0 && gridX < TETRIS_WIDTH) {
                        // Merge only if the target cell is 'clear'
                         if (newGrid[gridY]?.[gridX]?.[1] === 'clear') {
                           newGrid[gridY][gridX] = [player.pieceType, 'merged'];
                         }
                        // else {
                        //     // Log if trying to merge onto a non-clear cell, which might indicate a collision logic issue
                        //     console.warn(`Attempted to merge piece onto non-clear cell at [${gridX}, ${gridY}]`);
                        // }
                    }
                    // else {
                    //      // Log if piece part is outside grid boundaries during merge attempt
                    //      console.warn(`Attempted to merge piece part outside grid boundaries at [${gridX}, ${gridY}]`);
                    // }
                }
            });
        });

        // --- Line Clearing ---
        let clearedLines = 0;
        const sweptGrid: TetrisGrid = [];
        // Iterate from bottom to top
        for (let y = TOTAL_GRID_HEIGHT - 1; y >= 0; y--) {
             // Only check for full lines within the Tetris play area (upper part)
             if (y < TETRIS_HEIGHT) {
                const row = newGrid[y];
                // Check if the row is entirely filled with 'merged' blocks
                if (row.every(cell => cell[1] === 'merged')) {
                    clearedLines++;
                } else {
                    sweptGrid.unshift(row); // Keep rows that are not full
                }
             } else {
                 sweptGrid.unshift(newGrid[y]); // Keep rows in the Pong area as they are
             }
        }

        // Add new empty rows at the top for each cleared line
        while (sweptGrid.length < TOTAL_GRID_HEIGHT - (TOTAL_GRID_HEIGHT - TETRIS_HEIGHT)) { // Add rows only up to TETRIS_HEIGHT
             sweptGrid.unshift(Array(TETRIS_WIDTH).fill([0, 'clear']));
        }
        // Ensure the pong area rows are still present if they were somehow removed (safeguard)
        while(sweptGrid.length < TOTAL_GRID_HEIGHT) {
             sweptGrid.push(Array(TETRIS_WIDTH).fill([0, 'clear'])); // Should ideally grab from newGrid's pong area
        }


        if (clearedLines > 0) {
            setScore(prev => prev + LINE_POINTS[clearedLines]);
            // Speed up Tetris drop based on score after clearing lines
             const speedFactor = Math.floor((score + LINE_POINTS[clearedLines]) / 50);
             const nextDropTime = Math.max(100, TETRIS_DROP_INTERVAL_INITIAL - speedFactor * 50);
             setTetrisDropTime(nextDropTime);
        } else {
             // If no lines cleared, potentially reset drop time based on current score
             const speedFactor = Math.floor(score / 50);
             const nextDropTime = Math.max(100, TETRIS_DROP_INTERVAL_INITIAL - speedFactor * 50);
             setTetrisDropTime(nextDropTime);
        }

        setGrid(sweptGrid); // Update the grid state
        resetPlayer(); // Spawn the next piece

    }, [player, grid, resetPlayer, score]); // Dependencies: player, grid, resetPlayer, score

    // Effect to handle piece collision and merging logic AFTER state update
    useEffect(() => {
        if (player.collided && !gameOver) {
             // Perform merge and line clear AFTER the collided state has been set
            mergePieceToGrid();
        }
    }, [player.collided, gameOver, mergePieceToGrid]); // Depend on player.collided


    // --- Pong Logic ---
    const updatePongState = useCallback(() => {
         // Update Paddle Position
         setPaddle(prevPaddle => {
           let newX = prevPaddle.x;
           if (keysPressed.current['a'] || keysPressed.current['A']) {
             newX -= PADDLE_SPEED;
           }
           if (keysPressed.current['s'] || keysPressed.current['S']) {
             newX += PADDLE_SPEED;
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

            // Top Wall (ceiling)
            if (nextY - BALL_RADIUS < 0) {
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
                nextX - BALL_RADIUS < paddleRight // Ball's left edge is left of paddle right
                // && prevBall.dy > 0 // Ensure ball is moving downwards (optional, helps prevent sticking)
            ) {
                // Collision with paddle confirmed
                 // console.log("Paddle Hit!");
                 newDy = -Math.abs(newDy); // Bounce upwards reliably
                 nextY = paddleTop - BALL_RADIUS; // Place ball exactly on top of paddle

                 // Adjust horizontal speed based on hit position on paddle
                 const hitPosRatio = (nextX - (paddleLeft + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
                 // Clamp hitPosRatio to prevent extreme angles
                 const clampedHitPosRatio = Math.max(-1, Math.min(1, hitPosRatio));
                 // Apply a factor to the initial speed, allow more variation
                 const maxHorizontalFactor = 1.5;
                 newDx = clampedHitPosRatio * Math.abs(INITIAL_BALL_SPEED_X) * maxHorizontalFactor;

                 // Prevent ball from having near-zero horizontal speed
                 const minHorizontalSpeed = INITIAL_BALL_SPEED_X * 0.2;
                 if (Math.abs(newDx) < minHorizontalSpeed) {
                    newDx = (newDx >= 0 ? 1 : -1) * minHorizontalSpeed;
                 }
            }


            // --- Tetris Brick Collision ---
            let collisionHandled = false; // Flag to break loops once a collision is processed
            // Check cells around the ball's next position
            const gridXMin = Math.max(0, Math.floor(nextX - BALL_RADIUS));
            const gridXMax = Math.min(TETRIS_WIDTH - 1, Math.floor(nextX + BALL_RADIUS));
            const gridYMin = Math.max(0, Math.floor(nextY - BALL_RADIUS));
            const gridYMax = Math.min(TOTAL_GRID_HEIGHT - 1, Math.floor(nextY + BALL_RADIUS));


            for (let y = gridYMin; y <= gridYMax && !collisionHandled; y++) {
                for (let x = gridXMin; x <= gridXMax && !collisionHandled; x++) {
                     if (mutableGrid[y]?.[x]?.[1] === 'merged') {
                         const brickLeft = x;
                         const brickRight = x + 1;
                         const brickTop = y;
                         const brickBottom = y + 1;

                         // AABB Collision Check (Simpler but less accurate for circle)
                         // Find closest point on brick to ball center
                        const closestX = Math.max(brickLeft, Math.min(nextX, brickRight));
                        const closestY = Math.max(brickTop, Math.min(nextY, brickBottom));

                        // Calculate distance between ball center and closest point
                        const distX = nextX - closestX;
                        const distY = nextY - closestY;
                        const distanceSquared = (distX * distX) + (distY * distY);

                         // If distance is less than ball radius squared, collision occurs
                        if (distanceSquared < BALL_RADIUS * BALL_RADIUS) {
                            // console.log(`Collision with brick at [${x}, ${y}]`);

                            // --- Determine Bounce Direction ---
                            const overlapX = BALL_RADIUS - Math.abs(distX);
                            const overlapY = BALL_RADIUS - Math.abs(distY);

                            // Simple bounce logic: If vertical overlap is smaller, bounce vertically. Else, horizontally.
                            if (overlapY < overlapX) {
                                newDy = (distY > 0 ? 1 : -1) * Math.abs(newDy); // Bounce away vertically
                                nextY = prevBall.y; // Reset Y to prevent sinking
                            } else {
                                newDx = (distX > 0 ? 1 : -1) * Math.abs(newDx); // Bounce away horizontally
                                nextX = prevBall.x; // Reset X to prevent sinking
                            }

                            // --- Break Brick ---
                            mutableGrid[y][x] = [0, 'clear']; // Set brick to empty in the mutable copy
                            brickBroken = true;
                            collisionHandled = true; // Mark collision as handled to exit loops
                         }
                    }
                 }
            }

            if (brickBroken) {
                setGrid(mutableGrid); // Update grid state only if a brick was broken
                setScore(prev => prev + BRICK_BREAK_SCORE);
            }

            // --- Game Over Condition (Ball hits bottom) ---
            if (nextY + BALL_RADIUS >= GAME_HEIGHT) { // Use >= for safety
                setGameOver(true);
                setGameStarted(false);
                setTetrisDropTime(null);
                console.log("Game Over - Ball missed paddle");
                return prevBall; // Don't update ball if game over
            }

            // Clamp ball position slightly within bounds after collision resolution
            nextX = Math.max(BALL_RADIUS, Math.min(nextX, GAME_WIDTH - BALL_RADIUS));
            nextY = Math.max(BALL_RADIUS, Math.min(nextY, GAME_HEIGHT - BALL_RADIUS));


            return { x: nextX, y: nextY, dx: newDx, dy: newDy };
        });

    }, [paddle.x, grid, score]); // Include score to potentially adjust ball speed later


    // --- Game Loop ---
    useInterval(() => {
        if (!isClient || !gameStarted || gameOver) return;
        updatePongState();
        // Tetris drop is handled by its own interval (tetrisDropTime)
    }, gameStarted && !gameOver ? GAME_TICK_MS : null);

    // --- Tetris Auto Drop Interval ---
     useInterval(() => {
        if (!isClient || !gameStarted || gameOver || player.collided) return;
        dropPlayer(); // Use the dropPlayer function which includes collision check
    }, tetrisDropTime);


    // --- Input Handling ---
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
         if (!isClient || gameOver) return; // Ignore input if game is over or not client-side

         if (!gameStarted) {
             // Maybe allow 'Enter' or 'Space' to start?
             // if (event.key === 'Enter' || event.key === ' ') {
             //    startGame();
             // }
             return;
         }

        const { key } = event;
        let handled = false;

        // Pong Controls (continuous)
        if (key === 'a' || key === 'A' || key === 's' || key === 'S') {
            keysPressed.current[key.toLowerCase()] = true; // Store lowercase
            handled = true;
        }

        // Tetris Controls (discrete - only trigger once per press)
        if (!keysPressed.current[key]) { // Check if key is already held down for discrete actions
             if (key === 'ArrowLeft') {
                 movePlayer(-1);
                 handled = true;
             } else if (key === 'ArrowRight') {
                 movePlayer(1);
                 handled = true;
             } else if (key === 'ArrowDown') {
                 dropPlayer(); // Soft drop
                 handled = true;
             } else if (key === 'ArrowUp') {
                  playerRotate(); // Rotate clockwise
                  handled = true;
             } else if (key === ' ') { // Space for hard drop
                  hardDropPlayer();
                  handled = true;
             }
        }

        // Mark the key as pressed for discrete actions too, to prevent rapid repeats if held
         if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(key)) {
            keysPressed.current[key] = true;
        }


        if (handled) {
             event.preventDefault(); // Prevent default browser actions (e.g., scrolling)
        }

    }, [gameOver, gameStarted, movePlayer, dropPlayer, playerRotate, hardDropPlayer, isClient]);

    const handleKeyUp = useCallback((event: KeyboardEvent) => {
         if (!isClient) return;
        const { key } = event;
        // Clear the pressed state for all keys on keyup
        delete keysPressed.current[key.toLowerCase()]; // For continuous controls
        delete keysPressed.current[key]; // For discrete controls
    }, [isClient]);

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
        setGrid(createEmptyGrid());
        setBall({ // Reset ball with random initial horizontal direction
            x: GAME_WIDTH / 2,
            y: GAME_HEIGHT / 2,
            dx: INITIAL_BALL_SPEED_X * (Math.random() > 0.5 ? 1 : -1),
            dy: INITIAL_BALL_SPEED_Y,
        });
        setPaddle(initialPaddleState);
        setScore(0);
        setGameOver(false);
        setGameStarted(true);
        keysPressed.current = {}; // Reset keys pressed on start
        resetPlayer(); // Call resetPlayer *after* setting initial state
        setTetrisDropTime(TETRIS_DROP_INTERVAL_INITIAL); // Start Tetris drop
    }, [resetPlayer, isClient]); // Ensure resetPlayer is stable

    // --- Render Grid ---
    // Calculate display grid in the component or where needed, not inside the hook directly
    // This avoids unnecessary recalculations if only ball/paddle moved
    const displayGrid = updateGrid(grid, player);

    return {
        grid: displayGrid,
        ball,
        paddle,
        score,
        gameOver,
        gameStarted,
        startGame,
        // Expose constants needed for rendering
        gridWidth: TETRIS_WIDTH,
        gridHeight: TOTAL_GRID_HEIGHT,
        paddleWidth: PADDLE_WIDTH,
        paddleHeight: PADDLE_HEIGHT,
        ballRadius: BALL_RADIUS,
        paddleY: PADDLE_Y,
    };
};
