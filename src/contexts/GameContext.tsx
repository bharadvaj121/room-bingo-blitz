import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { generateBingoBoard, checkWin } from "@/lib/bingo";

// Define types
type GameStatus = "waiting" | "playing" | "finished";
type Player = {
  id: string;
  name: string;
  board: number[];
  markedCells: boolean[];
  completedLines: number;
};

interface GameContextType {
  roomId: string;
  playerName: string;
  players: Player[];
  currentPlayer: Player | null;
  gameStatus: GameStatus;
  winner: Player | null;
  isManualMode: boolean;
  manualNumbers: number[];
  lastClickedPlayer: string;
  lastClickedNumber: number | null;
  setRoomId: (id: string) => void;
  setPlayerName: (name: string) => void;
  setIsManualMode: (isManual: boolean) => void;
  addManualNumber: (num: number) => void;
  resetManualNumbers: () => void;
  createRoom: (isManual?: boolean) => void;
  joinRoom: () => void;
  leaveRoom: () => void;
  markCell: (index: number) => void;
  resetGame: () => void;
  finishManualSetup: () => void;
}

const initialPlayer: Player = {
  id: "",
  name: "",
  board: [],
  markedCells: Array(25).fill(false),
  completedLines: 0
};

// Create context
const GameContext = createContext<GameContextType | undefined>(undefined);

// Generate a random ID
const generateId = () => Math.random().toString(36).substring(2, 10);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [roomId, setRoomId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>("waiting");
  const [winner, setWinner] = useState<Player | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualNumbers, setManualNumbers] = useState<number[]>([]);
  const [lastClickedPlayer, setLastClickedPlayer] = useState<string>("");
  const [lastClickedNumber, setLastClickedNumber] = useState<number | null>(null);
  
  // In a real app, this would use a server or WebSocket connection
  // For this demo, we'll use localStorage to simulate multiplayer
  const updateGameState = () => {
    if (!roomId) return;
    
    try {
      const gameStateStr = localStorage.getItem(`bingo-room-${roomId}`);
      if (gameStateStr) {
        const gameState = JSON.parse(gameStateStr);
        setPlayers(gameState.players || []);
        setGameStatus(gameState.status || "playing"); // Default to playing if status is missing
        setWinner(gameState.winner || null);
        
        // Find current player in the updated list
        if (currentPlayer) {
          const updatedCurrentPlayer = gameState.players.find(
            (p: Player) => p.id === currentPlayer.id
          );
          if (updatedCurrentPlayer) {
            setCurrentPlayer(updatedCurrentPlayer);
          }
        }
      }
    } catch (error) {
      console.error("Error updating game state:", error);
    }
  };

  // Save game state to localStorage
  const saveGameState = () => {
    if (!roomId) return;
    
    try {
      localStorage.setItem(`bingo-room-${roomId}`, JSON.stringify({
        players,
        status: gameStatus,
        winner,
        lastClickedPlayer,
        lastClickedNumber
      }));
    } catch (error) {
      console.error("Error saving game state:", error);
    }
  };

  // Add a number to the manual board setup
  const addManualNumber = (num: number) => {
    if (manualNumbers.length >= 25) return;
    if (manualNumbers.includes(num)) return;
    
    setManualNumbers(prev => [...prev, num]);
  };

  // Reset manual numbers array
  const resetManualNumbers = () => {
    setManualNumbers([]);
  };

  // Create a new room
  const createRoom = (isManual = false) => {
    if (!playerName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    // When creating a new room or recreating after game end
    const newRoomId = roomId || generateId(); // Use existing roomId if available
    setRoomId(newRoomId);
    setIsManualMode(isManual);
    
    if (isManual) {
      resetManualNumbers();
      // Ensure we're in waiting state when in manual setup mode
      setGameStatus("waiting");
      toast.success(`Room ${roomId ? "reset" : "created"}! Select 25 numbers for your board.`);
      return;
    }
    
    // For automatic mode, proceed with random board generation
    const newPlayer: Player = {
      id: generateId(),
      name: playerName,
      board: generateBingoBoard(),
      markedCells: Array(25).fill(false),
      completedLines: 0
    };
    
    // Clear existing players and set up with new player
    setPlayers([newPlayer]);
    setCurrentPlayer(newPlayer);
    setGameStatus("playing"); // Set to playing
    setWinner(null); // Ensure winner is null
    
    // Clear any existing game state in localStorage for this room before saving
    localStorage.removeItem(`bingo-room-${newRoomId}`);
    
    // Save to localStorage after state updates
    setTimeout(() => {
      localStorage.setItem(`bingo-room-${newRoomId}`, JSON.stringify({
        players: [newPlayer],
        status: "playing",
        winner: null
      }));
      toast.success(`Room ${roomId ? "reset" : "created"}! Room ID: ${newRoomId}`);
    }, 0);
  };

  // Finish manual board setup
  const finishManualSetup = () => {
    if (manualNumbers.length !== 25) {
      toast.error("You must select exactly 25 numbers");
      return;
    }
    
    const newPlayer: Player = {
      id: generateId(),
      name: playerName,
      board: [...manualNumbers],
      markedCells: Array(25).fill(false),
      completedLines: 0
    };
    
    setPlayers([newPlayer]);
    setCurrentPlayer(newPlayer);
    setGameStatus("playing"); // Explicitly set to playing
    setWinner(null); // Ensure winner is null
    setIsManualMode(false);
    
    // Save to localStorage after state updates
    setTimeout(() => {
      localStorage.setItem(`bingo-room-${roomId}`, JSON.stringify({
        players: [newPlayer],
        status: "playing", // Explicitly set status to playing in localStorage
        winner: null
      }));
      toast.success(`Board created! Game ready to play.`);
    }, 0);
  };

  // Join an existing room
  const joinRoom = () => {
    if (!playerName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    
    if (!roomId.trim()) {
      toast.error("Please enter a room ID");
      return;
    }

    try {
      const gameStateStr = localStorage.getItem(`bingo-room-${roomId}`);
      if (!gameStateStr) {
        toast.error("Room not found");
        return;
      }

      const gameState = JSON.parse(gameStateStr);
      
      // Check if game is already finished
      if (gameState.status === "finished") {
        toast.error("This game has already ended");
        return;
      }
      
      // Check if player name is already taken
      const existingPlayer = gameState.players.find(
        (p: Player) => p.name.toLowerCase() === playerName.toLowerCase()
      );
      
      if (existingPlayer) {
        toast.error("This name is already taken in the room");
        return;
      }
      
      const newPlayer: Player = {
        id: generateId(),
        name: playerName,
        board: generateBingoBoard(),
        markedCells: Array(25).fill(false),
        completedLines: 0
      };
      
      // Update the room with the new player
      const updatedPlayers = [...gameState.players, newPlayer];
      setPlayers(updatedPlayers);
      setCurrentPlayer(newPlayer);
      setGameStatus(gameState.status || "playing"); // Default to playing if status is missing
      setWinner(gameState.winner || null);
      
      // Save updated state
      localStorage.setItem(`bingo-room-${roomId}`, JSON.stringify({
        players: updatedPlayers,
        status: gameState.status || "playing", // Ensure status is preserved or defaults to playing
        winner: gameState.winner || null
      }));
      
      toast.success(`Joined room ${roomId}`);
    } catch (error) {
      console.error("Error joining room:", error);
      toast.error("Something went wrong");
    }
  };

  // Leave the current room
  const leaveRoom = () => {
    if (!roomId || !currentPlayer) return;
    
    const updatedPlayers = players.filter(p => p.id !== currentPlayer.id);
    
    // If no players left, remove the room
    if (updatedPlayers.length === 0) {
      localStorage.removeItem(`bingo-room-${roomId}`);
    } else {
      // Otherwise update the player list
      localStorage.setItem(`bingo-room-${roomId}`, JSON.stringify({
        players: updatedPlayers,
        status: gameStatus,
        winner
      }));
    }
    
    setRoomId("");
    setCurrentPlayer(null);
    setPlayers([]);
    setGameStatus("waiting");
    setWinner(null);
    setIsManualMode(false);
    
    toast.info("Left the room");
  };

  // Mark a cell on all players' boards
  const markCell = (index: number) => {
    if (!currentPlayer || gameStatus !== "playing") return;
    
    console.log("Marking cell", index, "Current game status:", gameStatus);
    
    // Get the clicked number from current player's board
    const clickedNumber = currentPlayer.board[index];
    
    // Set the last clicked player and number
    setLastClickedPlayer(currentPlayer.name);
    setLastClickedNumber(clickedNumber);
    
    // Update all players' boards with this number
    const updatedPlayers = players.map(player => {
      // Find the index of this number on each player's board
      const playerBoardIndex = player.board.indexOf(clickedNumber);
      
      // If number doesn't exist on this player's board or already marked, return player unchanged
      if (playerBoardIndex === -1 || player.markedCells[playerBoardIndex]) {
        return player;
      }
      
      // Create updated marked cells for this player
      const updatedMarkedCells = [...player.markedCells];
      updatedMarkedCells[playerBoardIndex] = true;
      
      // Check win condition for this player
      const completedLines = checkWin(updatedMarkedCells);
      
      return {
        ...player,
        markedCells: updatedMarkedCells,
        completedLines
      };
    });
    
    // Check if any player has won
    const winningPlayer = updatedPlayers.find(p => p.completedLines >= 5);
    
    setPlayers(updatedPlayers);
    
    // Update current player reference
    setCurrentPlayer(
      updatedPlayers.find(p => p.id === currentPlayer.id) || null
    );
    
    // Set game status and winner if applicable
    if (winningPlayer) {
      setGameStatus("finished");
      setWinner(winningPlayer);
      
      setTimeout(() => {
        toast.success(`${winningPlayer.name} has won the game!`);
      }, 500);
    }
    
    // Save updated state
    localStorage.setItem(`bingo-room-${roomId}`, JSON.stringify({
      players: updatedPlayers,
      status: winningPlayer ? "finished" : "playing",
      winner: winningPlayer || null,
      lastClickedPlayer: currentPlayer.name,
      lastClickedNumber: clickedNumber
    }));
    
    // Reset lastClickedPlayer and lastClickedNumber after 2 seconds
    if (lastClickedPlayer) {
      setTimeout(() => {
        setLastClickedPlayer("");
        setLastClickedNumber(null);
      }, 2000);
    }
  };

  // Reset the game in the current room - just clears the game state
  // but doesn't create a new board - that will be handled by createRoom
  const resetGame = () => {
    if (!roomId) return;
    
    // We don't generate new boards here anymore
    // This just resets the state to allow a new game setup
    setGameStatus("waiting");
    setWinner(null);
    setIsManualMode(false);
    
    // Clear the localStorage for this room to ensure a clean state
    localStorage.removeItem(`bingo-room-${roomId}`);
    
    toast.info("Game has been reset!");
  };

  // Poll for updates every second
  useEffect(() => {
    if (!roomId || isManualMode) return;
    
    const intervalId = setInterval(() => {
      try {
        const gameStateStr = localStorage.getItem(`bingo-room-${roomId}`);
        if (gameStateStr) {
          const gameState = JSON.parse(gameStateStr);
          setPlayers(gameState.players || []);
          setGameStatus(gameState.status || "playing");
          setWinner(gameState.winner || null);
          
          // Update last clicked player and number
          setLastClickedPlayer(gameState.lastClickedPlayer || "");
          setLastClickedNumber(gameState.lastClickedNumber || null);
          
          // Find current player in the updated list
          if (currentPlayer) {
            const updatedCurrentPlayer = gameState.players.find(
              (p: Player) => p.id === currentPlayer.id
            );
            if (updatedCurrentPlayer) {
              setCurrentPlayer(updatedCurrentPlayer);
            }
          }
        }
      } catch (error) {
        console.error("Error updating game state:", error);
      }
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [roomId, currentPlayer, isManualMode]);
  
  // Save game state whenever relevant state changes
  useEffect(() => {
    if (roomId && !isManualMode && gameStatus !== "waiting") saveGameState();
  }, [players, gameStatus, winner, roomId, isManualMode, lastClickedPlayer, lastClickedNumber]);

  const value = {
    roomId,
    playerName,
    players,
    currentPlayer,
    gameStatus,
    winner,
    isManualMode,
    manualNumbers,
    lastClickedPlayer,
    lastClickedNumber,
    setRoomId,
    setPlayerName,
    setIsManualMode,
    addManualNumber,
    resetManualNumbers,
    createRoom,
    joinRoom,
    leaveRoom,
    markCell,
    resetGame,
    finishManualSetup
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

// Custom hook to use the game context
export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};
