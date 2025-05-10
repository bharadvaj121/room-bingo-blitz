
# Bingo Blitz Multiplayer Game

A real-time multiplayer Bingo game where users can create rooms and play with friends online or locally.

## Features

- Play against the computer
- Real-time online multiplayer
- Local multiplayer simulation 
- Create and join game rooms
- Manual or random board setup
- Win detection with completed lines

## How to Play

### Online Multiplayer (Requires Server)

1. Start the server first: `node server.js` (The server runs on port 3002 by default)
2. Open the app in your browser
3. Enter your name
4. Create a new room or join an existing one using a Room ID
5. Share the Room ID with your friends
6. Each player selects their own board setup (random or manual)
7. Take turns calling numbers
8. First player to complete 5 lines (rows, columns or diagonals) wins

### Play with Computer (No Server Required)

1. Select "Play with Computer" tab
2. Enter your name
3. Choose between random or manual board setup
4. Play against the computer!

### Local Multiplayer (No Server Required)

1. Select "Multiplayer" tab
2. Enter your name
3. Create a new room or join an existing one using a Room ID
4. Choose between random or manual board setup
5. Take turns with your friends on the same device
6. Complete 5 rows, columns, or diagonals to win

## Server Setup

The game includes a Node.js server for real-time online multiplayer:

1. Make sure you have Node.js installed
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Start the server: `node server.js`
5. The server will run on port 3002 by default

If the server is not running, the game will automatically switch to local multiplayer mode where all players use the same device.

## Game Rules

1. Each player gets a unique Bingo board with random numbers
2. Players take turns calling out numbers from their boards
3. When a number is called, all players check if they have that number on their boards
4. If a player has the called number, they mark it on their board
5. The first player to complete 5 lines (horizontal, vertical, or diagonal) calls "BINGO!" and wins
6. A winning line must have all 5 numbers marked

## Development

- Frontend: React, TypeScript, Tailwind CSS
- Backend: Node.js, Express, Socket.io

## Troubleshooting

- **"Failed to connect to game server"**: Make sure the Node.js server is running with `node server.js`
- **No server available**: The game will automatically switch to local multiplayer mode
- **Room connection issues**: Check your internet connection and server status
