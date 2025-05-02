
import { useState, useCallback, useEffect } from 'react';
import { useInterval } from './use-interval';
import { TETRIS_WIDTH, TETRIS_HEIGHT, createEmptyGrid, getRandomTetromino, TETROMINOS } from '@/components/tetris/constants';
import type { TetrisGrid, TetrisPiece } from '@/components/tetris/constants';

type Player = {
  pos: { x: number; y: number };
  tetromino: (string | number)[][];
  collided: boolean;
};

const initialPlayerState: Player = {
  pos: { x: TETRIS_WIDTH / 2 - 1, y: 0 }, // Centered horizontally
  tetromino: TETROMINOS[0].shape,
  collided: false,
};


export const useTetrisGame = (onLineClear: (lines: number) => void, onGameOver: () => void) => {
  const [player, setPlayer] = useState<Player>(initialPlayerState);
  const [grid, setGrid] = useState<TetrisGrid>(createEmptyGrid());
  const [dropTime, setDropTime] = useState<number | null>(null);
  const [gameOver, setGameOverInternal] = useState(false);
  const [score, setScore] = useState(0); // Keep track of score internally for level progression


  const checkCollision = (playerToCheck: Player, gridToCheck: TetrisGrid, { x: moveX, y: moveY }: { x: number, y: number }): boolean => {
    for (let y = 0; y < playerToCheck.tetromino.length; y += 1) {
      for (let x = 0; x < playerToCheck.tetromino[y].length; x += 1) {
        // 1. Check that we're on an actual Tetromino cell
        if (playerToCheck.tetromino[y][x] !== 0) {
          if (
            // 2. Check that our move is inside the game areas height (y)
            // We shouldn't go through the bottom of the play area
            !gridToCheck[y + playerToCheck.pos.y + moveY] ||
            // 3. Check that our move is inside the game areas width (x)
            !gridToCheck[y + playerToCheck.pos.y + moveY][x + playerToCheck.pos.x + moveX] ||
            // 4. Check that the cell wer'e moving to isn't set to clear
            gridToCheck[y + playerToCheck.pos.y + moveY][x + playerToCheck.pos.x + moveX][1] !== 'clear'
          ) {
            return true;
          }
        }
      }
    }
    // 5. If everything above is false
    return false;
  };

  const resetPlayer = useCallback(() => {
    const newTetromino = getRandomTetromino();
    const newPlayerPos = { x: TETRIS_WIDTH / 2 - Math.floor(newTetromino.shape[0].length / 2), y: 0 }; // Center new piece

    if (checkCollision({ pos: newPlayerPos, tetromino: newTetromino.shape, collided: false }, grid, { x: 0, y: 0 })) {
       // Game Over if new piece collides immediately
      setGameOverInternal(true);
      setDropTime(null); // Stop the game loop
      onGameOver();
    } else {
      setPlayer({
        pos: newPlayerPos,
        tetromino: newTetromino.shape,
        collided: false,
      });
    }
  }, [grid, onGameOver]);

  const rotate = (matrix: (string | number)[][], dir: number) => {
    // Make the rows to become cols (transpose)
    const rotatedTetro = matrix.map((_, index) => matrix.map(col => col[index]));
    // Reverse each row to get a rotated matrix
    if (dir > 0) return rotatedTetro.map(row => row.reverse());
    return rotatedTetro.reverse();
  };

  const playerRotate = (gridToCheck: TetrisGrid, dir: number) => {
    const clonedPlayer = JSON.parse(JSON.stringify(player));
    clonedPlayer.tetromino = rotate(clonedPlayer.tetromino, dir);

    const pos = clonedPlayer.pos.x;
    let offset = 1;
    while (checkCollision(clonedPlayer, gridToCheck, { x: 0, y: 0 })) {
      clonedPlayer.pos.x += offset;
      offset = -(offset + (offset > 0 ? 1 : -1));
      if (offset > clonedPlayer.tetromino[0].length) {
        rotate(clonedPlayer.tetromino, -dir); // Rotate back
        clonedPlayer.pos.x = pos;
        return; // Abort rotation
      }
    }
    setPlayer(clonedPlayer);
  };


  const updatePlayerPos = ({ x, y, collided }: { x: number; y: number; collided: boolean }) => {
    setPlayer(prev => ({
      ...prev,
      pos: { x: (prev.pos.x += x), y: (prev.pos.y += y) },
      collided,
    }));
  };


  const movePlayer = (dir: number) => {
    if (!checkCollision(player, grid, { x: dir, y: 0 })) {
      updatePlayerPos({ x: dir, y: 0, collided: false });
    }
  };


  const drop = useCallback(() => {
     if (!gameOver) {
       if (!checkCollision(player, grid, { x: 0, y: 1 })) {
         updatePlayerPos({ x: 0, y: 1, collided: false });
       } else {
         // Game over!
         if (player.pos.y < 1) {
           setGameOverInternal(true);
           setDropTime(null);
           onGameOver();
           return; // Stop execution if game over
         }
         updatePlayerPos({ x: 0, y: 0, collided: true });
       }
     }
   }, [player, grid, gameOver, onGameOver]);


  const dropPlayer = useCallback(() => {
     if (!gameOver) {
       setDropTime(null); // Stop auto drop while manually dropping
       drop();
       // Optionally re-enable auto drop after a short delay or based on score/level
       // setDropTime(1000 / (Math.floor(score / 10) + 1) + 200);
     }
   }, [drop, gameOver, score]);

    // Update the grid when player collides
    useEffect(() => {
      if (player.collided) {
        const newGrid = grid.map(row => row.map(cell => (cell[1] === 'clear' ? [0, 'clear'] : cell)));

        player.tetromino.forEach((row, y) => {
          row.forEach((value, x) => {
            if (value !== 0) {
              const gridY = y + player.pos.y;
              const gridX = x + player.pos.x;
              if (gridY >= 0 && gridY < TETRIS_HEIGHT && gridX >= 0 && gridX < TETRIS_WIDTH) {
                newGrid[gridY][gridX] = [value, 'merged'];
              }
            }
          });
        });

        // Check for cleared lines
        let clearedLines = 0;
        const sweptGrid = newGrid.reduce((acc, row) => {
            if (row.findIndex(cell => cell[0] === 0) === -1) {
                // If row is full
                clearedLines += 1;
                // Add an empty row at the top
                acc.unshift(Array(TETRIS_WIDTH).fill([0, 'clear']));
                return acc;
            }
            acc.push(row);
            return acc;
        }, [] as TetrisGrid);

        if (clearedLines > 0) {
           onLineClear(clearedLines);
           setScore(prev => prev + clearedLines * 10); // Example scoring
        }

        setGrid(sweptGrid);
        resetPlayer(); // Get the next piece
        setDropTime(1000 / (Math.floor(score / 50) + 1) + 100); // Reset drop time, potentially faster
      }
    }, [player.collided, resetPlayer, grid, onLineClear, score]);


  const startGame = useCallback(() => {
    setGrid(createEmptyGrid());
    resetPlayer();
    setGameOverInternal(false);
    setScore(0);
    setDropTime(1000); // Start drop interval
  }, [resetPlayer]);

    // Auto drop interval
    useInterval(() => {
      if (!gameOver) {
        drop();
      }
    }, dropTime);

   const move = useCallback(({ keyCode }: { keyCode: number }): void => {
     if (!gameOver) {
       if (keyCode === 37) { // Left Arrow
         movePlayer(-1);
       } else if (keyCode === 39) { // Right Arrow
         movePlayer(1);
       } else if (keyCode === 40) { // Down Arrow
         dropPlayer();
       } else if (keyCode === 38) { // Up Arrow (Rotate)
          playerRotate(grid, 1);
       }
     }
   }, [movePlayer, dropPlayer, playerRotate, grid, gameOver]);

  // Effect to add key listener
   useEffect(() => {
     const handleKeyDown = (event: KeyboardEvent) => {
       // Prevent arrow keys from scrolling the page
       if ([37, 38, 39, 40].includes(event.keyCode)) {
         event.preventDefault();
         move({ keyCode: event.keyCode });
       }
     };

     window.addEventListener('keydown', handleKeyDown);
     return () => {
       window.removeEventListener('keydown', handleKeyDown);
     };
   }, [move]);


  // Combine player and grid for rendering
    const displayGrid = (): TetrisGrid => {
        const newGrid = grid.map(row =>
        row.map(cell => (cell[1] === 'clear' ? [0, 'clear'] : cell))
        );

        // Draw the player
        player.tetromino.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
            const gridY = y + player.pos.y;
            const gridX = x + player.pos.x;
            // Ensure the drawing is within grid bounds
            if (gridY >= 0 && gridY < TETRIS_HEIGHT && gridX >= 0 && gridX < TETRIS_WIDTH) {
                newGrid[gridY][gridX] = [value, 'clear']; // Draw player piece over grid
            }
            }
        });
        });

        return newGrid;
    };


  return { grid: displayGrid(), startGame, isGameOver: gameOver };
};
