import React, { createContext, useContext, useState, useEffect } from "react";
import { Socket } from "socket.io-client";
import { generateBingoBoard, checkWin } from "@/lib/bingo";
import { toast } from "sonner";

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
  socket: Socket | null;
  serverConnected: boolean;
  setPlayerName: (name: string) => void;
  setRoomId: (id: string) => void;
  joinRoom: () => void;
  leaveRoom: () => void;
  createRoom: (isManual: boolean) => void;
  markCell: (index: number) => void;
  finishManualSetup: (boardNumbers: number[]) => void;
  resetGame: () => void;
  setSocket: (socket: Socket | null) => void;
  setServerConnected: (connected: boolean) => void;
  setCalledNumber: (number: number) => void;
}

// Create context
const GameContext = createContext<GameContextProps | undefined>(undefined);

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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [serverConnected, setServerConnected] = useState<boolean>(false);

  // Load game state from localStorage on component mount
  useEffect(() => {
    try {
      const storedPlayerName = localStorage.getItem("bingoPlayerName");
      const storedRoomId = localStorage.getItem("bingoRoomId");
      
      if (storedPlayerName) {
        setPlayerName(storedPlayerName);
      }
      
      // Don't automatically connect to room on initial load
      // as we need to check if the room still exists on server
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
    
    console.log("Room created with player:", player);
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
    
    // Create a player object for the current player
    const playerId = generatePlayerId();
    const playerBoard = generateBingoBoard();
    
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
    setIsManualMode(false);
    
    console.log("Joined room with player:", player);
  };
  
  // Leave the current room
  const leaveRoom = () => {
    setRoomId(null);
    setPlayers([]);
    setCurrentPlayer(null);
    setGameStatus("playing");
    setWinner(null);
    setIsManualMode(false);
    setServerConnected(false);
    
    // Disconnect socket
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    
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
    
    // Check if the player has won (3 completed lines)
    if (completedLines >= 3) {
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
  };
  
  // Reset the game
  const resetGame = () => {
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
    socket,
    serverConnected,
    setPlayerName: handlePlayerNameChange,
    setRoomId: handleRoomIdChange,
    joinRoom,
    leaveRoom,
    createRoom,
    markCell,
    finishManualSetup,
    resetGame,
    setSocket,
    setServerConnected,
    setCalledNumber
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
