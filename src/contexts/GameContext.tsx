
import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { generateBingoBoard, checkWin } from "@/lib/bingo";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";

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
}

// Create context
const GameContext = createContext<GameContextProps | undefined>(undefined);

// Generate player ID
const generatePlayerId = () => `player-${Math.random().toString(36).substring(2, 9)}`;

// Server URL - change this to your server's URL when deployed
const SERVER_URL = "http://localhost:3001";

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
  
  // Socket.io connection
  const socketRef = useRef<Socket | null>(null);

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

  // Connect to Socket.io server when roomId changes
  useEffect(() => {
    // Only connect if we have a roomId and player name
    if (roomId && playerName && !isManualMode) {
      if (!socketRef.current) {
        console.log("Connecting to socket server...");
        socketRef.current = io(SERVER_URL);
        
        // Set up event listeners
        socketRef.current.on("connect", () => {
          console.log("Connected to socket server");
        });
        
        socketRef.current.on("connect_error", (error) => {
          console.error("Socket connection error:", error);
          toast.error("Failed to connect to game server. Playing in offline mode.");
        });
        
        socketRef.current.on("playersUpdate", (data) => {
          console.log("Players update received:", data);
          setPlayers(data.players);
          setGameStatus(data.gameStatus);
          if (data.winner) setWinner(data.winner);
          
          // Update current player
          if (currentPlayer) {
            const updatedCurrentPlayer = data.players.find((p: Player) => p.id === currentPlayer.id);
            if (updatedCurrentPlayer) {
              setCurrentPlayer(updatedCurrentPlayer);
            }
          }
        });
        
        socketRef.current.on("numberCalled", (data) => {
          console.log("Number called:", data);
          setLastClickedPlayer(data.playerName);
          setLastClickedNumber(data.number);
          toast.info(`${data.playerName} called: ${data.number}`);
        });
        
        socketRef.current.on("gameReset", () => {
          console.log("Game reset received");
          resetGame();
        });
      }
      
      // If we have a current player and we're connected, join/create the room
      if (currentPlayer && socketRef.current.connected) {
        socketRef.current.emit("joinRoom", {
          roomId,
          player: currentPlayer
        });
      }
    }
    
    // Clean up socket connection when leaving room
    return () => {
      if (socketRef.current && roomId) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [roomId, currentPlayer, isManualMode]);

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
    
    // Create a player object for the current player
    const playerId = generatePlayerId();
    const playerBoard = isManual ? Array(25).fill(0) : generateBingoBoard();
    
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
    setIsManualMode(isManual);
    
    // Clear manual numbers array
    setManualNumbers([]);
    
    console.log("Room created with player:", player);
    
    // If we have a socketRef, emit join room event
    if (socketRef.current && !isManual) {
      socketRef.current.emit("joinRoom", {
        roomId,
        player
      });
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
    // Create a player object for the current player
    const playerId = generatePlayerId();
    const playerBoard = isManual ? Array(25).fill(0) : generateBingoBoard();
    
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
    setGameStatus("playing");
    setWinner(null);
    setIsManualMode(isManual);
    setShowBoardSelectionDialog(false);
    
    console.log("Joined room with player:", player);
    
    // If we have a socketRef and we're not in manual mode, emit join room event
    if (socketRef.current && !isManual) {
      socketRef.current.emit("joinRoom", {
        roomId,
        player
      });
    }
  };
  
  // Leave the current room
  const leaveRoom = () => {
    // If we have a socket and roomId, emit leave room event
    if (socketRef.current && roomId && currentPlayer) {
      socketRef.current.emit("leaveRoom", {
        roomId,
        playerId: currentPlayer.id
      });
    }
    
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
      console.log("Cell already marked at index:", index);
      return;
    }
    
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
    
    console.log("Cell marked at index:", index, "with number:", updatedPlayer.board[index]);
    
    // If we have a socket and roomId, emit mark cell event
    if (socketRef.current && roomId) {
      socketRef.current.emit("markCell", {
        roomId,
        playerId: updatedPlayer.id,
        cellIndex: index,
        markedNumber: updatedPlayer.board[index]
      });
    }
  };
  
  // Finish manual board setup
  const finishManualSetup = (boardNumbers: number[]) => {
    if (!currentPlayer || !isManualMode) {
      console.log("Cannot finish manual setup: no current player or not in manual mode");
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
    
    // Exit manual mode
    setIsManualMode(false);
    
    console.log("Manual board setup completed");
    
    // If we have a socket and roomId, emit update player event
    if (socketRef.current && roomId) {
      socketRef.current.emit("joinRoom", {
        roomId,
        player: updatedPlayer
      });
    }
  };
  
  // Reset the game
  const resetGame = () => {
    // If we have a socket and roomId, emit reset game event
    if (socketRef.current && roomId) {
      socketRef.current.emit("resetGame", {
        roomId
      });
    }
    
    setPlayers([]);
    setCurrentPlayer(null);
    setGameStatus("playing");
    setWinner(null);
    setIsManualMode(false);
    setLastClickedPlayer(null);
    setLastClickedNumber(null);
    
    console.log("Game reset");
  };
  
  // Handle called number from server
  const setCalledNumber = (number: number) => {
    console.log("Number called:", number);
    
    if (!currentPlayer || gameStatus !== "playing") {
      return;
    }
    
    // Find the index of the number on the current player's board
    const index = currentPlayer.board.indexOf(number);
    if (index !== -1) {
      // Mark the cell
      markCell(index);
      
      toast.info(`Number called: ${number}`);
    }
    
    // Update last clicked number for all players
    setLastClickedNumber(number);
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
    addManualNumber
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
