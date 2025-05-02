
export const TETRIS_WIDTH = 10;
export const TETRIS_HEIGHT = 20; // Height of the Tetris part of the grid
export const TOTAL_GRID_HEIGHT = 30; // Total height including Pong area

export type TetrisGrid = (string | number)[][]; // e.g., [0, 'clear'] or ['T', 'merged'] or ['T', 'player']

export type TetrisPieceShape = (string | number)[][];

export type TetrisPiece = {
  shape: TetrisPieceShape;
  color: string; // Corresponds to Tailwind color classes like 'bg-primary', 'bg-accent'
};

export type Player = {
  pos: { x: number; y: number };
  tetromino: TetrisPieceShape;
  pieceType: string | number; // e.g., 'T', 'I', 0
  collided: boolean;
};

export const createEmptyGrid = (): TetrisGrid =>
  Array.from(Array(TOTAL_GRID_HEIGHT), () => Array(TETRIS_WIDTH).fill([0, 'clear']));

// Define colors using theme variables for consistency
export const TETROMINOS: { [key: string]: TetrisPiece } = {
  0: { shape: [[0]], color: 'bg-background/80' }, // Empty cell representation
  I: {
    shape: [
      [0, 'I', 0, 0],
      [0, 'I', 0, 0],
      [0, 'I', 0, 0],
      [0, 'I', 0, 0],
    ],
    color: 'bg-primary', // Cyan
  },
  J: {
    shape: [
      [0, 'J', 0],
      [0, 'J', 0],
      ['J', 'J', 0],
    ],
    color: 'bg-blue-500', // Example specific color
  },
  L: {
    shape: [
      [0, 'L', 0],
      [0, 'L', 0],
      [0, 'L', 'L'],
    ],
    color: 'bg-orange-500', // Example specific color
  },
  O: {
    shape: [
      ['O', 'O'],
      ['O', 'O'],
    ],
    color: 'bg-yellow-400', // Example specific color
  },
  S: {
    shape: [
      [0, 'S', 'S'],
      ['S', 'S', 0],
      [0, 0, 0],
    ],
    color: 'bg-green-500', // Example specific color
  },
  T: {
    shape: [
      [0, 0, 0],
      ['T', 'T', 'T'],
      [0, 'T', 0],
    ],
    color: 'bg-purple-500', // Example specific color
  },
  Z: {
    shape: [
      ['Z', 'Z', 0],
      [0, 'Z', 'Z'],
      [0, 0, 0],
    ],
    color: 'bg-red-500', // Example specific color
  },
};


export const getRandomTetromino = (): { type: string; piece: TetrisPiece } => {
  const tetrominos = 'IJLOSTZ';
  const randType = tetrominos[Math.floor(Math.random() * tetrominos.length)];
  return { type: randType, piece: TETROMINOS[randType] };
};

// Scoring for line clears
export const LINE_POINTS = [0, 4, 10, 30, 120]; // 0, 1, 2, 3, 4 lines
export const BRICK_BREAK_SCORE = 1;
