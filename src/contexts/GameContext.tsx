import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { generateBingoBoard, checkWin } from "@/lib/bingo";
import { toast } from "sonner";
import { SupabaseService } from "@/services/SupabaseService";
import { Player, GameStatus, ServerStatus, GameContextProps } from "@/types/game";
import type { SupabaseRoomData } from "@/services/SupabaseService";

// Create context
const GameContext = createContext<GameContextProps | undefined>(undefined);

// Generate player ID (used for local play only)
const generatePlayerId = () => `player-${Math.random().toString(36).substring(2, 9)}`;

// Provider component
export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State
  const [playerName, setPlayerName] = useState<string>("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomDbId, setRoomDbId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>("waiting");
  const [winner, setWinner] = useState<Player | null>(null);
  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const [lastClickedPlayer, setLastClickedPlayer] = useState<string | null>(null);
  const [lastClickedNumber, setLastClickedNumber] = useState<number | null>(null);
  const [manualNumbers, setManualNumbers] = useState<number[]>([]);
  const [showBoardSelectionDialog, setShowBoardSelectionDialog] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerStatus>("checking");
  const [subscriptions, setSubscriptions] = useState<any>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [inWaitingRoom, setInWaitingRoom] = useState<boolean>(false);
  
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
      const updatedPlayers: Player[] = data.players.map((p, index) => ({
        id: p.id,
        name: p.name || `Player ${index + 1}`,
        board: p.board as number[],
        markedCells: p.marked_cells as boolean[],
        completedLines: p.completed_lines,
        isHost: index === 0 // First player is host
      }));
      
      // Update players list
      setPlayers(updatedPlayers);
      
      // Update current player
      if (playerId) {
        const player = updatedPlayers.find(p => p.id === playerId);
        if (player) {
          setCurrentPlayer(player);
          setIsHost(player.isHost || false);
        }
      }
      
      // Update game status
      setGameStatus(data.room.game_status as GameStatus);
      setRoomDbId(data.room.id);
      
      // Handle state transitions
      if (data.room.game_status === "playing") {
        setInWaitingRoom(false);
      } else if (data.room.game_status === "waiting") {
        setInWaitingRoom(true);
        setWinner(null); // Clear winner when back to waiting
      }
      
      // Update winner if there is one
      if (data.winner) {
        const winnerPlayer: Player = {
          id: data.winner.id,
          name: data.winner.name,
          board: data.winner.board as number[],
          markedCells: data.winner.marked_cells as boolean[],
          completedLines: data.winner.completed_lines,
          isHost: false
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

  // Create a new room with improved lifecycle
  const createRoom = async (isManual: boolean = false) => {
    console.log("Creating room with manual mode:", isManual);
    
    if (!playerName || playerName.trim() === "") {
      toast.error("Please enter your name");
      return;
    }
    
    setIsManualMode(isManual);
    setManualNumbers([]);
    
    const isOnline = await checkServerStatus();
    
    if (isOnline) {
      try {
        // Reset state first
        resetLocalState();
        
        const result = await SupabaseService.createRoom(playerName, isManual);
        
        if (result) {
          setRoomId(result.roomId);
          setPlayerId(result.playerId);
          
          // Get initial room data
          const roomData = await SupabaseService.getRoomData(result.roomId);
          
          if (roomData) {
            handleRoomUpdate(roomData);
            setIsHost(true);
            setInWaitingRoom(true);
            
            toast.success("Room created successfully! Share the code with your friends to join.");
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
  
  // Helper to reset local state
  const resetLocalState = () => {
    setPlayers([]);
    setCurrentPlayer(null);
    setGameStatus("waiting");
    setWinner(null);
    setLastClickedPlayer(null);
    setLastClickedNumber(null);
    setInWaitingRoom(false);
  };
  
  // Helper for creating offline rooms
  const createOfflineRoom = (playerBoard: number[]) => {
    const localPlayerId = generatePlayerId();
    const player: Player = {
      id: localPlayerId,
      name: playerName,
      board: playerBoard,
      markedCells: Array(25).fill(false),
      completedLines: 0,
      isHost: true
    };
    
    setPlayers([player]);
    setCurrentPlayer(player);
    setGameStatus("waiting");
    setWinner(null);
    setPlayerId(localPlayerId);
    setIsHost(true);
    setInWaitingRoom(true);
    
    console.log("Room created offline with player:", player);
  };
  
  // Start game (host only) with better validation
  const startGame = async () => {
    if (!isHost) {
      toast.error("Only the host can start the game");
      return;
    }
    
    if (players.length < 2) {
      toast.error("Need at least 2 players to start");
      return;
    }
    
    if (serverStatus === "online" && roomDbId) {
      try {
        const success = await SupabaseService.startGame(roomDbId);
        if (success) {
          setGameStatus("playing");
          setInWaitingRoom(false);
          toast.success("Game started!");
        } else {
          toast.error("Failed to start game. Please try again.");
        }
      } catch (error) {
        console.error("Error starting game:", error);
        toast.error("Failed to start game. Please try again.");
      }
    } else {
      // In offline mode, simply update the game status
      setGameStatus("playing");
      setInWaitingRoom(false);
      toast.success("Game started!");
    }
  };
  
  // Add a manual number
  const addManualNumber = (num: number) => {
    if (manualNumbers.length < 25 && !manualNumbers.includes(num)) {
      setManualNumbers(prev => [...prev, num]);
    }
  };
  
  // Join an existing room with better error handling
  const joinRoom = () => {
    if (!playerName || playerName.trim() === "") {
      toast.error("Please enter your name");
      return;
    }
    
    if (!roomId || roomId.trim() === "") {
      toast.error("Please enter a room ID");
      return;
    }
    
    console.log("Joining room with ID:", roomId);
    
    // Non-hosts always get random boards
    setIsManualMode(false);
    completeJoinRoom(false);
  };
  
  // Complete join process with better error handling
  const completeJoinRoom = async (isManual: boolean) => {
    const playerBoard = generateBingoBoard();
    
    if (!roomId) {
      toast.error("Room ID not set");
      return;
    }
    
    const isOnline = await checkServerStatus();
    
    if (isOnline) {
      try {
        console.log("Attempting to join room online with room ID:", roomId);
        const result = await SupabaseService.joinRoom(roomId, playerName, playerBoard);
        
        if (result) {
          console.log("Join room successful, got playerId:", result.playerId);
          setPlayerId(result.playerId);
          setRoomDbId(result.roomDbId);
          
          const roomData = await SupabaseService.getRoomData(roomId);
          
          if (roomData) {
            console.log("Got room data:", roomData);
            handleRoomUpdate(roomData);
            
            // Find current player and set host status
            const player = roomData.players.find(p => p.id === result.playerId);
            if (player) {
              setIsHost(roomData.players.indexOf(player) === 0);
            }
            
            // Set waiting room state based on game status
            setInWaitingRoom(roomData.room.game_status === "waiting");
            
            toast.success("Joined room successfully!");
          } else {
            console.error("Failed to get room data after joining");
            toast.error("Failed to get room data after joining");
            joinOfflineRoom(playerBoard);
          }
        } else {
          toast.error("Failed to join room. Room may not exist, be full, or in progress.");
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
    
    setShowBoardSelectionDialog(false);
  };
  
  // Helper for joining offline rooms
  const joinOfflineRoom = (playerBoard: number[]) => {
    const localPlayerId = generatePlayerId();
    const player: Player = {
      id: localPlayerId,
      name: playerName,
      board: playerBoard,
      markedCells: Array(25).fill(false),
      completedLines: 0,
      isHost: false
    };
    
    setPlayers(prevPlayers => {
      const existingPlayerIndex = prevPlayers.findIndex(p => p.name === playerName);
      if (existingPlayerIndex !== -1) {
        const updatedPlayers = [...prevPlayers];
        updatedPlayers[existingPlayerIndex] = player;
        return updatedPlayers;
      }
      return [...prevPlayers, player];
    });
    
    setCurrentPlayer(player);
    setPlayerId(localPlayerId);
    setInWaitingRoom(true);
  };
  
  // Leave the current room with cleanup
  const leaveRoom = async () => {
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
    setGameStatus("waiting");
    setWinner(null);
    setIsManualMode(false);
    setLastClickedPlayer(null);
    setLastClickedNumber(null);
    setShowBoardSelectionDialog(false);
    setInWaitingRoom(false);
    setIsHost(false);
    
    console.log("Left room");
  };
  
  // Mark a cell on the current player's board
  const markCell = async (index: number) => {
    if (!currentPlayer || gameStatus !== "playing") {
      console.log("Cannot mark cell: no current player or game not in playing state");
      return;
    }
    
    if (currentPlayer.markedCells[index]) {
      console.log("Cell already marked:", index);
      return;
    }
    
    const number = currentPlayer.board[index];
    
    if (serverStatus === "online" && playerId && roomDbId) {
      try {
        const updatedMarkedCells = [...currentPlayer.markedCells];
        updatedMarkedCells[index] = true;
        
        const completedLines = checkWin(updatedMarkedCells);
        
        await SupabaseService.markNumber(playerId, index, completedLines);
        await SupabaseService.setCalledNumber(roomDbId, number);
        
        if (completedLines >= 5) {
          await SupabaseService.endGame(playerId, roomDbId);
        }
      } catch (error) {
        console.error("Error marking cell:", error);
        markCellOffline(index);
      }
    } else {
      markCellOffline(index);
    }
  };
  
  const markCellOffline = (index: number) => {
    if (!currentPlayer) return;
    
    const updatedPlayer = { ...currentPlayer };
    updatedPlayer.markedCells = [...updatedPlayer.markedCells];
    updatedPlayer.markedCells[index] = true;
    
    setLastClickedPlayer(updatedPlayer.name);
    setLastClickedNumber(updatedPlayer.board[index]);
    
    const completedLines = checkWin(updatedPlayer.markedCells);
    updatedPlayer.completedLines = completedLines;
    
    if (completedLines >= 5) {
      setGameStatus("finished");
      setWinner(updatedPlayer);
      toast.success(`${updatedPlayer.name} wins with BINGO!`);
    }
    
    setCurrentPlayer(updatedPlayer);
    
    setPlayers(prevPlayers => {
      return prevPlayers.map(player => {
        if (player.id === updatedPlayer.id) {
          return updatedPlayer;
        }
        return player;
      });
    });
    
    toast.info(`${updatedPlayer.name} called: ${updatedPlayer.board[index]}`);
  };
  
  const finishManualSetup = async (boardNumbers: number[]) => {
    if (!isManualMode) {
      console.log("Cannot finish manual setup: not in manual mode");
      return;
    }
    
    if (serverStatus === "online" && roomId) {
      try {
        await completeJoinRoom(false);
        finishManualSetupOffline(boardNumbers);
      } catch (error) {
        console.error("Error finishing manual setup:", error);
        finishManualSetupOffline(boardNumbers);
      }
    } else {
      finishManualSetupOffline(boardNumbers);
    }
    
    setIsManualMode(false);
    console.log("Manual board setup completed");
  };
  
  const finishManualSetupOffline = (boardNumbers: number[]) => {
    if (!currentPlayer) {
      console.log("Cannot finish manual setup: no current player");
      return;
    }
    
    const updatedPlayer = { ...currentPlayer, board: boardNumbers };
    
    setCurrentPlayer(updatedPlayer);
    
    setPlayers(prevPlayers => {
      return prevPlayers.map(player => {
        if (player.id === updatedPlayer.id) {
          return updatedPlayer;
        }
        return player;
      });
    });
  };
  
  const resetGame = async () => {
    if (serverStatus === "online" && roomDbId) {
      try {
        await SupabaseService.resetGame(roomDbId);
      } catch (error) {
        console.error("Error resetting game:", error);
        resetGameOffline();
      }
    } else {
      resetGameOffline();
    }
  };
  
  const resetGameOffline = () => {
    setPlayers([]);
    setCurrentPlayer(null);
    setGameStatus("waiting");
    setWinner(null);
    setIsManualMode(false);
    setLastClickedPlayer(null);
    setLastClickedNumber(null);
    
    console.log("Game reset");
  };
  
  const setCalledNumber = async (number: number) => {
    console.log("Number called:", number);
    
    if (serverStatus === "online" && currentPlayer && roomDbId) {
      try {
        const index = currentPlayer.board.indexOf(number);
        if (index !== -1) {
          await markCell(index);
        }
      } catch (error) {
        console.error("Error setting called number:", error);
        setCalledNumberOffline(number);
      }
    } else {
      setCalledNumberOffline(number);
    }
  };
  
  const setCalledNumberOffline = (number: number) => {
    if (!currentPlayer || gameStatus !== "playing") {
      return;
    }
    
    const index = currentPlayer.board.indexOf(number);
    if (index !== -1) {
      markCellOffline(index);
    }
    
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
    isHost,
    inWaitingRoom,
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
    checkServerStatus,
    startGame
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
