import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { generateBingoBoard, checkWin } from "@/lib/bingo";
import { toast } from "sonner";
import { SupabaseService } from "@/services/SupabaseService";
import { Player, GameStatus, ServerStatus, GameContextProps } from "@/types/game";
import type { SupabaseRoomData } from "@/services/SupabaseService"; // Fix the import

// Create context
const GameContext = createContext<GameContextProps | undefined>(undefined);

// Generate player ID (used for local play only)
const generatePlayerId = () => `player-${Math.random().toString(36).substring(2, 9)}`;

// Provider component
export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State
  const [playerName, setPlayerName] = useState<string>("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomDbId, setRoomDbId] = useState<string | null>(null); // Database ID of the room
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
  const [subscriptions, setSubscriptions] = useState<any>(null);
  const [playerId, setPlayerId] = useState<string | null>(null); // Current player's ID
  
  // Load game state from localStorage on component mount
  useEffect(() => {
    try {
      const storedPlayerName = localStorage.getItem("bingoPlayerName");
      if (storedPlayerName) {
        setPlayerName(storedPlayerName);
      }
      
      checkServerStatus();
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

  // Set up listeners for a room on roomId change
  useEffect(() => {
    // Clean up previous subscriptions
    if (subscriptions) {
      subscriptions.unsubscribe();
      setSubscriptions(null);
    }
    
    // If no room ID or server is offline, don't set up listeners
    if (!roomId || serverStatus === "offline") {
      return;
    }
    
    // Set up listeners for the room
    const setupListeners = async () => {
      try {
        const listeners = await SupabaseService.setupRoomListeners(roomId, {
          onRoomUpdate: handleRoomUpdate,
          onPlayerJoined: handlePlayerJoined,
          onPlayerLeft: handlePlayerLeft,
          onNumberCalled: handleNumberCalled,
          onGameWon: handleGameWon
        });
        
        if (listeners) {
          setSubscriptions(listeners);
        }
      } catch (error) {
        console.error("Error setting up room listeners:", error);
        toast.error("Failed to connect to real-time updates. Some features may not work properly.");
      }
    };
    
    setupListeners();
    
    return () => {
      if (subscriptions) {
        subscriptions.unsubscribe();
      }
    };
  }, [roomId, serverStatus]);

  // Handlers for real-time events
  const handleRoomUpdate = (data: SupabaseRoomData) => {
    console.log("Room update received:", data);
    
    if (data.room.room_code === roomId) {
      // Convert Supabase players to our Player format
      const updatedPlayers: Player[] = data.players.map(p => ({
        id: p.id,
        name: p.name,
        board: p.board as number[],
        markedCells: p.marked_cells as boolean[],
        completedLines: p.completed_lines
      }));
      
      // Update players list
      setPlayers(updatedPlayers);
      
      // Update current player
      if (playerId) {
        const player = updatedPlayers.find(p => p.id === playerId);
        if (player) {
          setCurrentPlayer(player);
        }
      }
      
      // Update game status
      setGameStatus(data.room.game_status as GameStatus);
      setRoomDbId(data.room.id);
      
      // Update winner if there is one
      if (data.winner) {
        const winnerPlayer: Player = {
          id: data.winner.id,
          name: data.winner.name,
          board: data.winner.board as number[],
          markedCells: data.winner.marked_cells as boolean[],
          completedLines: data.winner.completed_lines
        };
        setWinner(winnerPlayer);
      }
      
      // Update last called number if there is one
      if (data.room.last_called_number) {
        setLastClickedNumber(data.room.last_called_number);
      }
    }
  };
  
  const handlePlayerJoined = (data: any) => {
    console.log("Player joined:", data);
    toast.info(`${data.playerName} joined the game`);
  };
  
  const handlePlayerLeft = (data: any) => {
    console.log("Player left:", data);
    toast.info(`${data.playerName} left the game`);
  };
  
  const handleNumberCalled = (data: any) => {
    console.log("Number called:", data);
    setLastClickedNumber(data.number);
    if (data.playerName) {
      setLastClickedPlayer(data.playerName);
    }
    toast.info(`Number called: ${data.number}`);
  };
  
  const handleGameWon = (data: any) => {
    console.log("Game won:", data);
    if (data.winner) {
      toast.success(`${data.winner.name} wins with BINGO!`);
    }
  };

  // Check server status function with better handling
  const checkServerStatus = useCallback(async (): Promise<boolean> => {
    setServerStatus("checking");
    
    try {
      const isOnline = await SupabaseService.checkConnection();
      setServerStatus(isOnline ? "online" : "offline");
      return isOnline;
    } catch (error) {
      console.error("Error checking server status:", error);
      setServerStatus("offline");
      return false;
    }
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
  const createRoom = async (isManual: boolean = false) => {
    console.log("Creating room with manual mode:", isManual);
    
    if (!playerName || playerName.trim() === "") {
      toast.error("Please enter your name");
      return;
    }
    
    // Set manual mode state
    setIsManualMode(isManual);
    
    // Clear manual numbers array
    setManualNumbers([]);
    
    // Check server status before proceeding
    const isOnline = await checkServerStatus();
    
    if (isOnline) {
      try {
        // Reset any existing game state first
        setPlayers([]);
        setCurrentPlayer(null);
        setGameStatus("waiting");
        setWinner(null);
        
        const result = await SupabaseService.createRoom(playerName, isManual);
        
        if (result) {
          // Set room ID and player ID
          setRoomId(result.roomId);
          setPlayerId(result.playerId);
          
          // Get initial room data
          const roomData = await SupabaseService.getRoomData(result.roomId);
          
          if (roomData) {
            // Convert Supabase players to our Player format
            const initialPlayers: Player[] = roomData.players.map((p: any) => ({
              id: p.id,
              name: p.name,
              board: p.board as number[],
              markedCells: p.marked_cells as boolean[],
              completedLines: p.completed_lines
            }));
            
            // Set players and current player
            setPlayers(initialPlayers);
            const player = initialPlayers.find(p => p.id === result.playerId);
            if (player) {
              setCurrentPlayer(player);
            }
            
            // Set room database ID
            setRoomDbId(roomData.room.id);
            
            toast.success("Room created successfully!");
          }
        } else {
          toast.error("Failed to create room. Please try again.");
          createOfflineRoom(isManual ? Array(25).fill(0) : generateBingoBoard());
        }
      } catch (error) {
        console.error("Error creating room:", error);
        toast.error("Failed to create room. Falling back to offline mode.");
        createOfflineRoom(isManual ? Array(25).fill(0) : generateBingoBoard());
      }
    } else {
      console.log("Server offline, creating offline room");
      createOfflineRoom(isManual ? Array(25).fill(0) : generateBingoBoard());
    }
  };
  
  // Helper for creating offline rooms
  const createOfflineRoom = (playerBoard: number[]) => {
    // In offline mode, create a player object for the current player
    const localPlayerId = generatePlayerId();
    const player: Player = {
      id: localPlayerId,
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
    setPlayerId(localPlayerId);
    
    console.log("Room created offline with player:", player);
  };
  
  // Add a manual number
  const addManualNumber = (num: number) => {
    if (manualNumbers.length < 25 && !manualNumbers.includes(num)) {
      setManualNumbers(prev => [...prev, num]);
    }
  };
  
  // Join an existing room
  const joinRoom = () => {
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
    
    console.log("Joining room with ID:", roomId);
    
    // Show board selection dialog first - don't create the player yet
    setIsManualMode(false);
    setShowBoardSelectionDialog(true);
  };
  
  // Complete join process with board selection
  const completeJoinRoom = async (isManual: boolean) => {
    // Generate a board based on manual mode
    const playerBoard = isManual ? Array(25).fill(0) : generateBingoBoard();
    
    // Set manual mode state
    setIsManualMode(isManual);
    
    if (!roomId) {
      toast.error("Room ID not set");
      return;
    }
    
    // Check server status before proceeding
    const isOnline = await checkServerStatus();
    
    if (isOnline) {
      try {
        console.log("Attempting to join room online with room ID:", roomId);
        const result = await SupabaseService.joinRoom(roomId, playerName, playerBoard);
        
        if (result) {
          console.log("Join room successful, got playerId:", result.playerId);
          // Set player ID
          setPlayerId(result.playerId);
          setRoomDbId(result.roomDbId);
          
          // Get room data
          const roomData = await SupabaseService.getRoomData(roomId);
          
          if (roomData) {
            console.log("Got room data:", roomData);
            // Convert Supabase players to our Player format
            const initialPlayers: Player[] = roomData.players.map((p) => ({
              id: p.id,
              name: p.name,
              board: Array.isArray(p.board) ? p.board.map(Number) : [], // Ensure we have a number array
              markedCells: Array.isArray(p.marked_cells) ? p.marked_cells : Array(25).fill(false),
              completedLines: p.completed_lines
            }));
            
            console.log("Processed players:", initialPlayers);
            
            // Set players and current player
            setPlayers(initialPlayers);
            const player = initialPlayers.find(p => p.id === result.playerId);
            if (player) {
              setCurrentPlayer(player);
            } else {
              console.error("Could not find current player in player list");
            }
            
            // Set game status
            setGameStatus(roomData.room.game_status as GameStatus);
            
            toast.success("Joined room successfully!");
          } else {
            console.error("Failed to get room data after joining");
            toast.error("Failed to get room data after joining");
            joinOfflineRoom(playerBoard);
          }
        } else {
          toast.error("Failed to join room. Room may not exist or be full.");
          joinOfflineRoom(playerBoard);
        }
      } catch (error) {
        console.error("Error joining room:", error);
        toast.error("Failed to join room. Falling back to offline mode.");
        joinOfflineRoom(playerBoard);
      }
    } else {
      console.log("Server offline, joining offline room");
      joinOfflineRoom(playerBoard);
    }
    
    // Close the dialog regardless of online/offline mode
    setShowBoardSelectionDialog(false);
  };
  
  // Helper for joining offline rooms
  const joinOfflineRoom = (playerBoard: number[]) => {
    // In offline mode, create a player object for the current player
    const localPlayerId = generatePlayerId();
    const player: Player = {
      id: localPlayerId,
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
    setPlayerId(localPlayerId);
  };
  
  // Leave the current room
  const leaveRoom = async () => {
    // Check if we're online and have necessary data
    if (serverStatus === "online" && playerId) {
      try {
        await SupabaseService.leaveRoom(playerId);
      } catch (error) {
        console.error("Error leaving room:", error);
      }
    }
    
    // Clean up subscriptions
    if (subscriptions) {
      subscriptions.unsubscribe();
      setSubscriptions(null);
    }
    
    // Reset all state
    setRoomId(null);
    setRoomDbId(null);
    setPlayerId(null);
    setPlayers([]);
    setCurrentPlayer(null);
    setGameStatus("playing");
    setWinner(null);
    setIsManualMode(false);
    setLastClickedPlayer(null);
    setLastClickedNumber(null);
    setShowBoardSelectionDialog(false);
    
    console.log("Left room");
  };
  
  // Mark a cell on the current player's board
  const markCell = async (index: number) => {
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
    
    if (serverStatus === "online" && playerId && roomDbId) {
      try {
        // Create a copy of the current player's marked cells and update it
        const updatedMarkedCells = [...currentPlayer.markedCells];
        updatedMarkedCells[index] = true;
        
        // Check for win
        const completedLines = checkWin(updatedMarkedCells);
        
        // Update the server
        await SupabaseService.markNumber(playerId, index, completedLines);
        
        // Check if the player has won (5 or more completed lines)
        if (completedLines >= 5) {
          await SupabaseService.endGame(playerId, roomDbId);
        }
      } catch (error) {
        console.error("Error marking cell:", error);
        
        // Fall back to offline mode
        markCellOffline(index);
      }
    } else {
      // In offline mode, handle everything locally
      markCellOffline(index);
    }
  };
  
  // Helper for marking cells in offline mode
  const markCellOffline = (index: number) => {
    if (!currentPlayer) return;
    
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
  };
  
  // Finish manual board setup
  const finishManualSetup = async (boardNumbers: number[]) => {
    if (!isManualMode) {
      console.log("Cannot finish manual setup: not in manual mode");
      return;
    }
    
    if (serverStatus === "online" && roomId) {
      try {
        // Complete the join process with the manual board
        await completeJoinRoom(false); // Pass false because we're manually handling the board
        
        // Get the current player
        const player = players.find(p => p.id === playerId);
        if (!player) {
          console.log("Cannot finish manual setup: no current player found");
          return;
        }
        
        // Update the player's board directly (not implemented in SupabaseService yet)
        // This would require a new method in SupabaseService to update a player's board
        
        // For now, fallback to offline mode
        finishManualSetupOffline(boardNumbers);
      } catch (error) {
        console.error("Error finishing manual setup:", error);
        // Fall back to offline mode
        finishManualSetupOffline(boardNumbers);
      }
    } else {
      // In offline mode, update the player's board
      finishManualSetupOffline(boardNumbers);
    }
    
    // Exit manual mode
    setIsManualMode(false);
    
    console.log("Manual board setup completed");
  };
  
  // Helper for finishing manual setup in offline mode
  const finishManualSetupOffline = (boardNumbers: number[]) => {
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
  };
  
  // Reset the game
  const resetGame = async () => {
    if (serverStatus === "online" && roomDbId) {
      try {
        await SupabaseService.resetGame(roomDbId);
      } catch (error) {
        console.error("Error resetting game:", error);
        
        // Fall back to offline mode
        resetGameOffline();
      }
    } else {
      // In offline mode, reset everything locally
      resetGameOffline();
    }
  };
  
  // Helper for resetting the game in offline mode
  const resetGameOffline = () => {
    setPlayers([]);
    setCurrentPlayer(null);
    setGameStatus("playing");
    setWinner(null);
    
    // These are reset in both modes
    setIsManualMode(false);
    setLastClickedPlayer(null);
    setLastClickedNumber(null);
    
    console.log("Game reset");
  };
  
  // Handle called number from server
  const setCalledNumber = async (number: number) => {
    console.log("Number called:", number);
    
    if (serverStatus === "online" && currentPlayer && roomDbId) {
      try {
        // Find the index of the number on the current player's board
        const index = currentPlayer.board.indexOf(number);
        if (index !== -1) {
          // Mark the cell
          await markCell(index);
        }
        
        // Update last clicked number for all players (this happens via real-time subscription)
      } catch (error) {
        console.error("Error setting called number:", error);
        
        // Fall back to offline mode
        setCalledNumberOffline(number);
      }
    } else {
      // In offline mode, handle everything locally
      setCalledNumberOffline(number);
    }
  };
  
  // Helper for setting called number in offline mode
  const setCalledNumberOffline = (number: number) => {
    if (!currentPlayer || gameStatus !== "playing") {
      return;
    }
    
    // Find the index of the number on the current player's board
    const index = currentPlayer.board.indexOf(number);
    if (index !== -1) {
      // Mark the cell
      markCellOffline(index);
    }
    
    // Update last clicked number for all players
    setLastClickedNumber(number);
    toast.info(`Number called: ${number}`);
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
