
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { 
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(cors());

// Storage for active rooms and players
const rooms = {};

// Helper to get room info (filtered for client)
const getRoomInfo = (roomId) => {
  if (!rooms[roomId]) return null;
  
  return {
    roomId,
    players: rooms[roomId].players,
    gameStatus: rooms[roomId].gameStatus,
    winner: rooms[roomId].winner,
    lastCalledNumber: rooms[roomId].lastCalledNumber
  };
};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Check server status
  socket.on('check_server', () => {
    console.log(`Server status check from ${socket.id}`);
    socket.emit('server_status', { status: 'online' });
  });

  // Join a room
  socket.on('join_room', (data) => {
    try {
      const { roomId, playerName, board } = data;
      
      if (!roomId) {
        console.error(`Missing roomId from ${socket.id}`);
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }
      
      if (!playerName) {
        console.error(`Missing playerName from ${socket.id}`);
        socket.emit('error', { message: 'Player name is required' });
        return;
      }
      
      console.log(`User ${socket.id} attempting to join room ${roomId} as ${playerName}`);
      
      // Create room if it doesn't exist
      if (!rooms[roomId]) {
        console.log(`Creating new room: ${roomId}`);
        rooms[roomId] = {
          players: [],
          gameStatus: 'playing',
          winner: null,
          lastCalledNumber: null
        };
      }
      
      // Check if room is full (max 5 players)
      if (rooms[roomId].players.length >= 5) {
        console.log(`Room ${roomId} is full`);
        socket.emit('room_full');
        return;
      }
      
      // Check if player name is already taken in this room
      const existingPlayer = rooms[roomId].players.find(p => p.name === playerName);
      if (existingPlayer) {
        console.log(`Name ${playerName} already taken in room ${roomId}`);
        socket.emit('name_taken');
        return;
      }
      
      // Add player to room
      const playerId = socket.id;
      const player = {
        id: playerId,
        name: playerName,
        board: board || [],
        markedCells: Array(25).fill(false),
        completedLines: 0,
        socketId: socket.id
      };
      
      rooms[roomId].players.push(player);
      socket.join(roomId);
      
      // Notify everyone in the room
      io.to(roomId).emit('room_update', getRoomInfo(roomId));
      socket.emit('join_success', player);
      io.to(roomId).emit('player_joined', { playerName });
      
      console.log(`User ${socket.id} (${playerName}) joined room ${roomId}`);
    } catch (error) {
      console.error('Error in join_room handler:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });
  
  // Player calls a number
  socket.on('call_number', (data) => {
    try {
      const { roomId, number } = data;
      
      if (!roomId || !rooms[roomId]) {
        console.log(`Invalid room ID for call_number: ${roomId}`);
        return;
      }
      
      // Set the last called number for the room
      rooms[roomId].lastCalledNumber = number;
      
      // Broadcast the called number to all players in the room
      io.to(roomId).emit('number_called', { number, roomId });
      
      console.log(`Number ${number} called in room ${roomId}`);
    } catch (error) {
      console.error('Error in call_number handler:', error);
    }
  });
  
  // Player marks a number on their board
  socket.on('mark_number', (data) => {
    try {
      const { roomId, playerId, index, number, completedLines } = data;
      
      if (!roomId || !rooms[roomId]) {
        console.log(`Invalid room ID for mark_number: ${roomId}`);
        return;
      }
      
      // Find the player
      const playerIndex = rooms[roomId].players.findIndex(p => p.id === playerId);
      if (playerIndex === -1) {
        console.log(`Player ${playerId} not found in room ${roomId}`);
        return;
      }
      
      // Update player's marked cells
      rooms[roomId].players[playerIndex].markedCells[index] = true;
      rooms[roomId].players[playerIndex].completedLines = completedLines;
      
      // Check for win
      if (completedLines >= 5 && rooms[roomId].gameStatus === 'playing') {
        rooms[roomId].gameStatus = 'finished';
        rooms[roomId].winner = rooms[roomId].players[playerIndex];
        
        // Notify everyone in the room about the win
        io.to(roomId).emit('game_won', {
          winner: rooms[roomId].players[playerIndex],
          roomId
        });
      }
      
      // Notify everyone about the mark
      io.to(roomId).emit('number_marked', {
        playerId,
        playerName: rooms[roomId].players[playerIndex].name,
        index,
        number,
        roomId
      });
      
      // Send updated room info
      io.to(roomId).emit('room_update', getRoomInfo(roomId));
    } catch (error) {
      console.error('Error in mark_number handler:', error);
    }
  });
  
  // Reset game in room
  socket.on('reset_game', (data) => {
    try {
      const { roomId } = data;
      
      if (!roomId || !rooms[roomId]) {
        console.log(`Invalid room ID for reset_game: ${roomId}`);
        return;
      }
      
      // Reset room status
      rooms[roomId].gameStatus = 'playing';
      rooms[roomId].winner = null;
      rooms[roomId].lastCalledNumber = null;
      
      // Reset all players' boards
      rooms[roomId].players.forEach(player => {
        player.markedCells = Array(25).fill(false);
        player.completedLines = 0;
      });
      
      // Notify everyone in the room
      io.to(roomId).emit('game_reset', { roomId });
      io.to(roomId).emit('room_update', getRoomInfo(roomId));
      
      console.log(`Game reset in room ${roomId}`);
    } catch (error) {
      console.error('Error in reset_game handler:', error);
    }
  });
  
  // Leave room
  socket.on('leave_room', (data) => {
    try {
      const { roomId, playerId } = data;
      
      if (!roomId || !rooms[roomId]) {
        console.log(`Invalid room ID for leave_room: ${roomId}`);
        return;
      }
      
      // Remove player from room
      const playerIndex = rooms[roomId].players.findIndex(p => p.id === playerId);
      if (playerIndex !== -1) {
        const leavingPlayer = rooms[roomId].players[playerIndex];
        rooms[roomId].players.splice(playerIndex, 1);
        
        // Notify everyone in the room
        io.to(roomId).emit('player_left', { 
          playerName: leavingPlayer.name,
          roomId
        });
        
        // Send updated room info
        io.to(roomId).emit('room_update', getRoomInfo(roomId));
        
        // Delete room if empty
        if (rooms[roomId].players.length === 0) {
          console.log(`Deleting empty room ${roomId}`);
          delete rooms[roomId];
        }
      }
      
      // Leave socket room
      socket.leave(roomId);
      console.log(`User ${socket.id} left room ${roomId}`);
    } catch (error) {
      console.error('Error in leave_room handler:', error);
    }
  });

  // Handle disconnections
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    try {
      // Find all rooms the player is in
      for (const roomId in rooms) {
        const playerIndex = rooms[roomId].players.findIndex(p => p.socketId === socket.id);
        
        if (playerIndex !== -1) {
          const disconnectingPlayer = rooms[roomId].players[playerIndex];
          rooms[roomId].players.splice(playerIndex, 1);
          
          // Notify everyone in the room
          io.to(roomId).emit('player_left', { 
            playerName: disconnectingPlayer.name,
            roomId
          });
          
          // Send updated room info
          io.to(roomId).emit('room_update', getRoomInfo(roomId));
          
          // Delete room if empty
          if (rooms[roomId].players.length === 0) {
            console.log(`Deleting empty room ${roomId} after disconnect`);
            delete rooms[roomId];
          }
        }
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
  
  // Generic error handler
  socket.on('error', (error) => {
    console.error(`Socket error from ${socket.id}:`, error);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Root endpoint for testing
app.get('/', (req, res) => {
  res.status(200).send('Bingo server is running');
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Bingo server is running on port ${PORT}`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Server shutting down...');
  server.close(() => {
    console.log('Server shut down');
    process.exit(0);
  });
});
