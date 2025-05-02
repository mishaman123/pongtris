
import { TETRIS_WIDTH, TOTAL_GRID_HEIGHT } from '@/components/tetris/constants';

// Dimensions are now relative to the grid units
export const GAME_WIDTH = TETRIS_WIDTH; // Width in grid cells
export const GAME_HEIGHT = TOTAL_GRID_HEIGHT; // Height in grid cells

// Pong elements dimensions and speeds in grid units
export const PADDLE_WIDTH = 3; // Width in grid cells
export const PADDLE_HEIGHT = 0.5; // Height in grid cells
export const BALL_RADIUS = 0.4; // Radius in grid cells

// Initial Speeds (cells per game tick or per second - adjust based on game loop)
// Need tuning depending on the interval speed
export const INITIAL_BALL_SPEED_X = 0.15; // Cells per update tick
export const INITIAL_BALL_SPEED_Y = 0.15; // Cells per update tick
export const PADDLE_SPEED = 0.4; // Cells per update tick

// Paddle Y position (close to the bottom)
export const PADDLE_Y = GAME_HEIGHT - PADDLE_HEIGHT - 1;
