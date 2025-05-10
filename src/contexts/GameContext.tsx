import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { generateBingoBoard, checkWin } from "@/lib/bingo";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";

// Socket.io client instance
let socket: Socket | null = null;
const SERVER_URL = "http://localhost:3002"; // Default server URL

// Player type definition
type Player = {
  id: string;
  name: string;
  board: number[];
  markedCells: boolean[];
  completedLines: number;
};

// Game status type
type GameStatus = "playing" | "finished";

// Server status type
type ServerStatus = "checking" | "online" | "offline";

// Game context type
interface GameContextProps {
  playerName: string;
  roomId: string | null;
  players: Player[];
  currentPlayer: Player | null;
  gameStatus: GameStatus;
  winner: Player | null;
  isManualMode: boolean;
  lastClickedPlayer: string | null;
  lastClickedNumber: number | null;
  showBoardSelectionDialog: boolean;
  serverStatus: ServerStatus;
  setPlayerName: (name: string) => void;
  setRoomId: (id: string) => void;
  joinRoom: () => void;
  completeJoinRoom: (isManual: boolean) => void;
  leaveRoom: () => void;
  createRoom: (isManual: boolean) => void;
  markCell: (index: number) => void;
  finishManualSetup: (boardNumbers: number[]) => void;
  resetGame: () => void;
  setCalledNumber: (number: number) => void;
  manualNumbers: number[];
  addManualNumber: (num: number) => void;
  checkServerStatus: () => Promise<boolean>;
}

// Create context
const GameContext = createContext<GameContextProps | undefined>(undefined);

// Initialize Socket.io connection
const initializeSocket = (): Socket => {
  if (!socket) {
    socket = io(SERVER_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 3,
      timeout: 5000
    });

    console.log("Socket initialization attempt");

    socket.on("connect", () => {
      console.log("Connected to server:", socket?.id);
    });

    socket.on("connect_error", (err) => {
      console.error("Connection error:", err.message);
    });
  }
  return socket;
};

// Generate player ID
const generatePlayerId = () => `player-${Math.random().toString(36).substring(2, 9)}`;

// Provider component
export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State
  const [playerName, setPlayerName] = useState<string>("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>("playing");
  const [winner, setWinner] = useState<Player | null>(null);
  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const [lastClickedPlayer, setLastClickedPlayer] = useState<string | null>(null);
  const [lastClickedNumber, setLastClickedNumber] = useState<number | null>(null);
  const [manualNumbers, setManualNumbers] = useState<number[]>([]);
  const [showBoardSelectionDialog, setShowBoardSelectionDialog] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerStatus>("checking");
  
  // Initialize socket connection when component mounts
  useEffect(() => {
    // Try to initialize socket
    try {
      const socketInstance = initializeSocket();
      
      // Set up event listeners
      socketInstance.on("room_update", (roomData) => {
        console.log("Room update received:", roomData);
        
        if (roomData.roomId === roomId) {
          // Update players list
          setPlayers(roomData.players);
          
          // Update game status
          setGameStatus(roomData.gameStatus);
          
          // Update winner if there is one
          if (roomData.winner) {
            setWinner(roomData.winner);
          }
          
          // Update last called number if there is one
          if (roomData.lastCalledNumber) {
            setLastClickedNumber(roomData.lastCalledNumber);
          }
        }
      });
      
      socketInstance.on("join_success", (player) => {
        console.log("Join success:", player);
        setCurrentPlayer(player);
      });
      
      socketInstance.on("player_joined", (data) => {
        console.log("Player joined:", data);
        toast.info(`${data.playerName} joined the game`);
      });
      
      socketInstance.on("player_left", (data) => {
        console.log("Player left:", data);
        toast.info(`${data.playerName} left the game`);
      });
      
      socketInstance.on("number_called", (data) => {
        console.log("Number called:", data);
        setLastClickedNumber(data.number);
        toast.info(`Number called: ${data.number}`);
      });
      
      socketInstance.on("number_marked", (data) => {
        console.log("Number marked:", data);
        setLastClickedPlayer(data.playerName);
        // We don't update the markedCells here as that's handled by the room_update event
      });
      
      socketInstance.on("game_won", (data) => {
        console.log("Game won:", data);
        setGameStatus("finished");
        setWinner(data.winner);
        toast.success(`${data.winner.name} wins with BINGO!`);
      });
      
      socketInstance.on("game_reset", () => {
        console.log("Game reset");
        setGameStatus("playing");
        setWinner(null);
      });
      
      socketInstance.on("room_full", () => {
        toast.error("The room is full (max 5 players)");
      });
      
      socketInstance.on("name_taken", () => {
        toast.error("This name is already taken in the room");
      });
      
      // Check server status right away
      checkServerStatus();
    } catch (error) {
      console.error("Socket initialization error:", error);
      setServerStatus("offline");
    }
    
    // Clean up on unmount
    return () => {
      if (socket) {
        console.log("Disconnecting socket");
        socket.disconnect();
      }
    };
  }, [roomId]);
  
  // Load game state from localStorage on component mount
  useEffect(() => {
    try {
      const storedPlayerName = localStorage.getItem("bingoPlayerName");
      if (storedPlayerName) {
        setPlayerName(storedPlayerName);
      }
    } catch (error) {
      console.error("Error loading game state from localStorage:", error);
    }
  }, []);

  // Store player name in localStorage when it changes
  useEffect(() => {
    if (playerName) {
      localStorage.setItem("bingoPlayerName", playerName);
    }
  }, [playerName]);

  // Store room ID in localStorage when it changes
  useEffect(() => {
    if (roomId) {
      localStorage.setItem("bingoRoomId", roomId);
    } else {
      localStorage.removeItem("bingoRoomId");
    }
  }, [roomId]);

  // Check server status function
  const checkServerStatus = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      setServerStatus("checking");
      const socketInstance = initializeSocket();
      
      // Set a timeout for the server check
      const timeoutId = setTimeout(() => {
        console.log("Server check timed out");
        setServerStatus("offline");
        resolve(false);
      }, 5000);
      
      // Emit check_server event
      socketInstance.emit("check_server");
      
      // Listen for server_status event
      socketInstance.once("server_status", (data) => {
        clearTimeout(timeoutId);
        const isOnline = data.status === "online";
        setServerStatus(isOnline ? "online" : "offline");
        resolve(isOnline);
      });
      
      // Also handle connect/disconnect events
      const onConnect = () => {
        clearTimeout(timeoutId);
        setServerStatus("online");
        resolve(true);
      };
      
      const onDisconnect = () => {
        setServerStatus("offline");
        resolve(false);
      };
      
      // If socket is already connected, consider it online
      if (socketInstance.connected) {
        clearTimeout(timeoutId);
        setServerStatus("online");
        resolve(true);
      }
      
      // Set up listeners
      socketInstance.once("connect", onConnect);
      socketInstance.once("disconnect", onDisconnect);
      
      // Clean up listeners after check is complete
      setTimeout(() => {
        socketInstance.off("connect", onConnect);
        socketInstance.off("disconnect", onDisconnect);
      }, 6000);
    });
  }, []);

  // Handle player name change
  const handlePlayerNameChange = (name: string) => {
    setPlayerName(name);
  };

  // Handle room ID change
  const handleRoomIdChange = (id: string) => {
    console.log("Setting room ID:", id);
    setRoomId(id);
  };

  // Create a new room
  const createRoom = (isManual: boolean = false) => {
    console.log("Creating room with manual mode:", isManual);
    
    if (!playerName || playerName.trim() === "") {
      toast.error("Please enter your name");
      return;
    }
    
    // Generate a board based on manual mode
    const playerBoard = isManual ? Array(25).fill(0) : generateBingoBoard();
    
    // Set manual mode state
    setIsManualMode(isManual);
    
    // Clear manual numbers array
    setManualNumbers([]);
    
    // In online mode, we don't create the player yet
    // We wait for the server to confirm the room creation
    if (serverStatus === "online" && socket) {
      // Reset any existing game state
      setPlayers([]);
      setCurrentPlayer(null);
      setGameStatus("playing");
      setWinner(null);
      
      console.log("Creating room on server");
    } else {
      // In offline mode, create a player object for the current player
      const playerId = generatePlayerId();
      const player: Player = {
        id: playerId,
        name: playerName,
        board: playerBoard,
        markedCells: Array(25).fill(false),
        completedLines: 0
      };
      
      // Set up the game
      setPlayers([player]);
      setCurrentPlayer(player);
      setGameStatus("playing");
      setWinner(null);
      
      console.log("Room created offline with player:", player);
    }
  };
  
  // Add a manual number
  const addManualNumber = (num: number) => {
    if (manualNumbers.length < 25 && !manualNumbers.includes(num)) {
      setManualNumbers(prev => [...prev, num]);
    }
  };
  
  // Join an existing room
  const joinRoom = () => {
    console.log("Joining room with ID:", roomId);
    
    if (!playerName || playerName.trim() === "") {
      toast.error("Please enter your name");
      console.error("joinRoom called with empty playerName");
      return;
    }
    
    if (!roomId || roomId.trim() === "") {
      toast.error("Please enter a room ID");
      console.error("joinRoom called with empty roomId");
      return;
    }
    
    // Show board selection dialog first - don't create the player yet
    setIsManualMode(false);
    setShowBoardSelectionDialog(true);
  };
  
  // Complete join process with board selection
  const completeJoinRoom = (isManual: boolean) => {
    // Generate a board based on manual mode
    const playerBoard = isManual ? Array(25).fill(0) : generateBingoBoard();
    
    // Set manual mode state
    setIsManualMode(isManual);
    
    // Handle online vs offline mode differently
    if (serverStatus === "online" && socket) {
      // In online mode, send a join_room event to the server
      socket.emit("join_room", {
        roomId,
        playerName,
        board: playerBoard
      });
    } else {
      // In offline mode, create a player object for the current player
      const playerId = generatePlayerId();
      const player: Player = {
        id: playerId,
        name: playerName,
        board: playerBoard,
        markedCells: Array(25).fill(false),
        completedLines: 0
      };
      
      // Add the player to the game
      setPlayers(prevPlayers => {
        // Check if this is a reconnection (same name already in room)
        const existingPlayerIndex = prevPlayers.findIndex(p => p.name === playerName);
        if (existingPlayerIndex !== -1) {
          // Replace the existing player
          const updatedPlayers = [...prevPlayers];
          updatedPlayers[existingPlayerIndex] = player;
          return updatedPlayers;
        }
        // Otherwise add as a new player
        return [...prevPlayers, player];
      });
      
      setCurrentPlayer(player);
    }
    
    setShowBoardSelectionDialog(false);
  };
  
  // Leave the current room
  const leaveRoom = () => {
    // If online, send a leave_room event to the server
    if (serverStatus === "online" && socket && roomId && currentPlayer) {
      socket.emit("leave_room", {
        roomId,
        playerId: currentPlayer.id
      });
    }
    
    // Reset all state
    setRoomId(null);
    setPlayers([]);
    setCurrentPlayer(null);
    setGameStatus("playing");
    setWinner(null);
    setIsManualMode(false);
    setLastClickedPlayer(null);
    setLastClickedNumber(null);
    
    // Remove room ID from localStorage
    localStorage.removeItem("bingoRoomId");
    
    console.log("Left room");
  };
  
  // Mark a cell on the current player's board
  const markCell = (index: number) => {
    if (!currentPlayer || gameStatus !== "playing") {
      console.log("Cannot mark cell: no current player or game not in playing state");
      return;
    }
    
    // Check if the cell is already marked
    if (currentPlayer.markedCells[index]) {
      console.log("Cell already marked:", index);
      return;
    }
    
    // Get the number at this cell
    const number = currentPlayer.board[index];
    
    if (serverStatus === "online" && socket && roomId) {
      // In online mode, send a mark_number event to the server
      // First check how many lines are completed
      const updatedMarkedCells = [...currentPlayer.markedCells];
      updatedMarkedCells[index] = true;
      const completedLines = checkWin(updatedMarkedCells);
      
      socket.emit("mark_number", {
        roomId,
        playerId: currentPlayer.id,
        index,
        number,
        completedLines
      });
      
      // The server will handle the rest and send updates
    } else {
      // In offline mode, handle everything locally
      
      // Create a copy of the current player
      const updatedPlayer = { ...currentPlayer };
      
      // Mark the cell
      updatedPlayer.markedCells = [...updatedPlayer.markedCells];
      updatedPlayer.markedCells[index] = true;
      
      // Set the last clicked player and number
      setLastClickedPlayer(updatedPlayer.name);
      setLastClickedNumber(updatedPlayer.board[index]);
      
      // Check for win
      const completedLines = checkWin(updatedPlayer.markedCells);
      updatedPlayer.completedLines = completedLines;
      
      // Check if the player has won (5 or more completed lines)
      if (completedLines >= 5) {
        setGameStatus("finished");
        setWinner(updatedPlayer);
        toast.success(`${updatedPlayer.name} wins with BINGO!`);
      }
      
      // Update the current player
      setCurrentPlayer(updatedPlayer);
      
      // Update the player in the players array
      setPlayers(prevPlayers => {
        return prevPlayers.map(player => {
          if (player.id === updatedPlayer.id) {
            return updatedPlayer;
          }
          return player;
        });
      });
      
      // Simulate broadcasting to other players in local multiplayer
      toast.info(`${updatedPlayer.name} called: ${updatedPlayer.board[index]}`);
    }
  };
  
  // Finish manual board setup
  const finishManualSetup = (boardNumbers: number[]) => {
    if (!isManualMode) {
      console.log("Cannot finish manual setup: not in manual mode");
      return;
    }
    
    if (serverStatus === "online" && socket && roomId) {
      // In online mode, join room with the manual board
      socket.emit("join_room", {
        roomId,
        playerName,
        board: boardNumbers
      });
    } else {
      // In offline mode, update the player's board
      if (!currentPlayer) {
        console.log("Cannot finish manual setup: no current player");
        return;
      }
      
      // Create a copy of the current player
      const updatedPlayer = { ...currentPlayer, board: boardNumbers };
      
      // Update the current player
      setCurrentPlayer(updatedPlayer);
      
      // Update the player in the players array
      setPlayers(prevPlayers => {
        return prevPlayers.map(player => {
          if (player.id === updatedPlayer.id) {
            return updatedPlayer;
          }
          return player;
        });
      });
    }
    
    // Exit manual mode
    setIsManualMode(false);
    
    console.log("Manual board setup completed");
  };
  
  // Reset the game
  const resetGame = () => {
    if (serverStatus === "online" && socket && roomId) {
      // In online mode, send a reset_game event to the server
      socket.emit("reset_game", {
        roomId
      });
      
      // The server will handle the rest and send updates
    } else {
      // In offline mode, reset everything locally
      setPlayers([]);
      setCurrentPlayer(null);
      setGameStatus("playing");
      setWinner(null);
    }
    
    // These are reset in both modes
    setIsManualMode(false);
    setLastClickedPlayer(null);
    setLastClickedNumber(null);
    
    console.log("Game reset");
  };
  
  // Handle called number from server
  const setCalledNumber = (number: number) => {
    console.log("Number called:", number);
    
    if (serverStatus === "online" && socket && roomId) {
      // In online mode, send a call_number event to the server
      socket.emit("call_number", {
        roomId,
        number
      });
    } else {
      // In offline mode, handle everything locally
      if (!currentPlayer || gameStatus !== "playing") {
        return;
      }
      
      // Find the index of the number on the current player's board
      const index = currentPlayer.board.indexOf(number);
      if (index !== -1) {
        // Mark the cell
        markCell(index);
      }
      
      // Update last clicked number for all players
      setLastClickedNumber(number);
      toast.info(`Number called: ${number}`);
    }
  };
  
  // Context value
  const contextValue: GameContextProps = {
    playerName,
    roomId,
    players,
    currentPlayer,
    gameStatus,
    winner,
    isManualMode,
    lastClickedPlayer,
    lastClickedNumber,
    manualNumbers,
    showBoardSelectionDialog,
    serverStatus,
    setPlayerName: handlePlayerNameChange,
    setRoomId: handleRoomIdChange,
    joinRoom,
    completeJoinRoom,
    leaveRoom,
    createRoom,
    markCell,
    finishManualSetup,
    resetGame,
    setCalledNumber,
    addManualNumber,
    checkServerStatus
  };
  
  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
};

// Hook for using the game context
export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};
