
export const TETRIS_WIDTH = 10;
export const TETRIS_HEIGHT = 20;

export type TetrisGrid = (string | number)[][];
export type TetrisPiece = {
  shape: (string | number)[][];
  color: string; // Corresponds to Tailwind color classes like 'bg-primary', 'bg-accent'
};

export const createEmptyGrid = (): TetrisGrid =>
  Array.from(Array(TETRIS_HEIGHT), () => Array(TETRIS_WIDTH).fill([0, 'clear']));

export const TETROMINOS: { [key: string]: TetrisPiece } = {
  0: { shape: [[0]], color: 'bg-transparent' }, // Represents an empty cell
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
    color: 'bg-secondary', // Using secondary blue as an example
  },
  L: {
    shape: [
      [0, 'L', 0],
      [0, 'L', 0],
      [0, 'L', 'L'],
    ],
    color: 'bg-destructive', // Using destructive red as an example
  },
  O: {
    shape: [
      ['O', 'O'],
      ['O', 'O'],
    ],
    color: 'bg-yellow-400', // Using Tailwind yellow
  },
  S: {
    shape: [
      [0, 'S', 'S'],
      ['S', 'S', 0],
      [0, 0, 0],
    ],
    color: 'bg-green-500', // Using Tailwind green
  },
  T: {
    shape: [
      [0, 0, 0],
      ['T', 'T', 'T'],
      [0, 'T', 0],
    ],
    color: 'bg-purple-500', // Using Tailwind purple
  },
  Z: {
    shape: [
      ['Z', 'Z', 0],
      [0, 'Z', 'Z'],
      [0, 0, 0],
    ],
    color: 'bg-red-500', // Using Tailwind red
  },
};

export const getRandomTetromino = (): TetrisPiece => {
  const tetrominos = 'IJLOSTZ';
  const randTetromino = tetrominos[Math.floor(Math.random() * tetrominos.length)];
  return TETROMINOS[randTetromino];
};
