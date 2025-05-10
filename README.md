
# Bingo Blitz Multiplayer Game

A real-time multiplayer Bingo game where users can create rooms and play with friends.

## Features

- Play against the computer
- Real-time multiplayer
- Create and join game rooms
- Manual or random board setup
- Win detection with completed lines

## Setup Instructions

### Option 1: Play in Offline Mode (No Server Required)

1. Toggle the "Offline Mode" switch on the home page
2. Play with simulated multiplayer functionality (all players will be on the same device)
3. This works for both computer play and multiplayer simulation locally

### Option 2: Set up the Server for Real Multiplayer

1. Make sure you have Node.js installed
2. Install dependencies:
   ```
   npm install
   ```
3. Start the backend server:
   ```
   node server.js
   ```
   You should see a message: `Server is running on port 3001`
4. Start the frontend development server:
   ```
   npm run dev
   ```
5. Open your browser and navigate to the local development server URL (typically http://localhost:5173)
6. Make sure the "Online Mode" toggle is enabled (default)
7. Share the URL with friends on the same network to play together

### Troubleshooting Server Connection

If you see the message "Failed to connect to game server. Playing in offline mode":

1. Make sure the server is running with `node server.js`
2. Check that you are using the correct server URL (http://localhost:3001 by default)
3. Make sure there's no firewall blocking the connection
4. If issues persist, toggle to "Offline Mode" to play locally

### Playing with Friends Online

For playing with friends over the internet, you'll need to:

1. Deploy the backend server to a hosting service like Heroku, Render, or Railway
2. Update the SERVER_URL variable in src/contexts/GameContext.tsx to point to your deployed server
3. Deploy the frontend to a service like Vercel, Netlify, or GitHub Pages
4. Share the URL with friends to play together

## How to Play

1. Enter your name and create or join a room
2. Choose between random or manual board setup
3. Click numbers on your board when they're called
4. Complete 5 rows, columns, or diagonals to win

## Development

- Frontend: React, TypeScript, Tailwind CSS
- Backend: Node.js, Socket.io
