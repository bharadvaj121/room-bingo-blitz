
const { Server } = require("socket.io");
const http = require("http");
const url = require("url");

// Create HTTP server for health checks
const httpServer = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  
  // Add a health check endpoint
  if (parsedUrl.pathname === "/health") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD",
    });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }
  
  // Default response for other routes
  res.writeHead(404);
  res.end("Not found");
});

// Create a Socket.io server
const io = new Server({
  cors: {
    origin: "*", // In production, restrict this to your domain
    methods: ["GET", "POST"]
  },
  // Attach to the HTTP server
  server: httpServer
});

// Store active game rooms
const rooms = {};

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Create or join room
  socket.on("joinRoom", (data) => {
    const { roomId, player } = data;
    console.log(`Player ${player.name} joining room ${roomId}`);
    
    // Join the socket.io room
    socket.join(roomId);
    
    // Initialize room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: [],
        gameStatus: "playing",
        winner: null
      };
    }

    // Check if player already exists (reconnecting)
    const existingPlayerIndex = rooms[roomId].players.findIndex(p => p.name === player.name);
    if (existingPlayerIndex !== -1) {
      // Replace existing player
      rooms[roomId].players[existingPlayerIndex] = player;
    } else {
      // Add new player
      rooms[roomId].players.push(player);
    }
    
    // Broadcast updated player list to everyone in the room
    io.to(roomId).emit("playersUpdate", {
      players: rooms[roomId].players,
      gameStatus: rooms[roomId].gameStatus,
      winner: rooms[roomId].winner
    });
  });

  // Player marks a cell
  socket.on("markCell", (data) => {
    const { roomId, playerId, cellIndex, markedNumber } = data;
    console.log(`Player ${playerId} marked cell ${cellIndex} with number ${markedNumber} in room ${roomId}`);
    
    if (!rooms[roomId]) return;
    
    // Find the player in the room
    const playerIndex = rooms[roomId].players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
      // Update player's marked cells
      const player = rooms[roomId].players[playerIndex];
      player.markedCells[cellIndex] = true;
      
      // Check for win (5 or more completed lines)
      if (player.completedLines >= 5) {
        rooms[roomId].gameStatus = "finished";
        rooms[roomId].winner = player;
      }
    }
    
    // Broadcast the number that was called
    io.to(roomId).emit("numberCalled", {
      playerName: rooms[roomId].players[playerIndex]?.name,
      number: markedNumber
    });
    
    // Broadcast updated game state
    io.to(roomId).emit("playersUpdate", {
      players: rooms[roomId].players,
      gameStatus: rooms[roomId].gameStatus,
      winner: rooms[roomId].winner
    });
  });
  
  // Player updates their board
  socket.on("updatePlayer", (data) => {
    const { roomId, player } = data;
    
    if (!rooms[roomId]) return;
    
    // Update player in room
    const playerIndex = rooms[roomId].players.findIndex(p => p.id === player.id);
    if (playerIndex !== -1) {
      rooms[roomId].players[playerIndex] = player;
    }
    
    // Broadcast updated player list
    io.to(roomId).emit("playersUpdate", {
      players: rooms[roomId].players,
      gameStatus: rooms[roomId].gameStatus,
      winner: rooms[roomId].winner
    });
  });
  
  // Reset the game
  socket.on("resetGame", (data) => {
    const { roomId } = data;
    
    if (!rooms[roomId]) return;
    
    // Reset game state
    rooms[roomId].players = [];
    rooms[roomId].gameStatus = "playing";
    rooms[roomId].winner = null;
    
    io.to(roomId).emit("gameReset");
  });

  // Leave room
  socket.on("leaveRoom", (data) => {
    const { roomId, playerId } = data;
    
    if (!rooms[roomId]) return;
    
    // Remove player from room
    rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== playerId);
    
    // If room is empty, delete it
    if (rooms[roomId].players.length === 0) {
      delete rooms[roomId];
    } else {
      // Otherwise, broadcast updated player list
      io.to(roomId).emit("playersUpdate", {
        players: rooms[roomId].players,
        gameStatus: rooms[roomId].gameStatus,
        winner: rooms[roomId].winner
      });
    }
    
    socket.leave(roomId);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    // You might want to handle player cleanup here
  });
});

// Start the server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
