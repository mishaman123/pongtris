# Pongtris

A mashup of Tetris and Pong where you control a paddle to bounce a ball while arranging Tetris blocks!

## Features

- Classic Tetris gameplay with rotation, movement, and line clearing
- Pong-like paddle and ball mechanics
- Break Tetris blocks with the ball for additional points
- Increasing difficulty as your score grows
- Leaderboard system to track top scores with player initials
- Modern, responsive UI design

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy the example environment file:
   ```
   cp .env.local.example .env.local
   ```
4. Configure Firebase:
   - Create a Firebase project at https://console.firebase.google.com/
   - Enable Firestore database
   - Add the configuration values to your `.env.local` file

5. Run the development server:
   ```
   npm run dev
   ```

## Controls

- **Tetris**: Arrow keys (Up to rotate, Down for soft drop, Left/Right to move), Space for hard drop
- **Pong**: A (move paddle left), S (move paddle right)
- **Game**: P (pause/resume)

## Leaderboard

The game features a leaderboard system that:
- Tracks the top 10 scores
- Prompts for player initials (3 characters) when achieving a high score
- Displays the leaderboard after game over or from the main menu
- Stores scores securely in Firebase

## Development

### Seed Leaderboard

To seed the leaderboard with sample data:

```
npx ts-node scripts/seed-leaderboard.ts
```
