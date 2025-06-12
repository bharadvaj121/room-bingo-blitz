import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { toast } from "sonner";
import { generateBingoBoard } from "@/lib/bingo";
import { Player } from "@/types/game";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

// Types matching the working model
export interface BingoCard {
  [key: number]: { value: number; isMarked: boolean }[];
}

export interface GameRoom {
  id: string;
  host: string;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  callHistory: { number: number; column: string; timestamp: number }[];
  currentCall: { number: number; column: string } | null;
  winner: Player | null;
  callInterval: number;
  currentTurn: string;
}

export interface GameState {
  player: Player | null;
  room: GameRoom | null;
  isHost: boolean;
  error: string | null;
}

// Helper functions
const convertJsonToBingoCard = (jsonCard: any): number[] => {
  try {
    if (Array.isArray(jsonCard)) {
      // If it's a 2D array, flatten it
      if (Array.isArray(jsonCard[0])) {
        return jsonCard.flat();
      }
      return jsonCard;
    }
    if (typeof jsonCard === 'string') {
      const parsed = JSON.parse(jsonCard);
      if (Array.isArray(parsed[0])) {
        return parsed.flat();
      }
      return parsed;
    }
    return jsonCard || generateBingoBoard();
  } catch (error) {
    console.error('Error converting JSON to BingoCard:', error);
    return generateBingoBoard();
  }
};

const getColumnLetter = (number: number): string => {
  if (number >= 1 && number <= 15) return 'B';
  if (number >= 16 && number <= 30) return 'I';
  if (number >= 31 && number <= 45) return 'N';
  if (number >= 46 && number <= 60) return 'G';
  if (number >= 61 && number <= 75) return 'O';
  return 'B';
};

const markNumber = (card: number[], number: number): number[] => {
  return card.map(cell => cell === number ? -1 : cell);
};

interface SocketContextType {
  isConnected: boolean;
  gameState: GameState;
  createRoom: (playerName: string) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  markCell: (row: number, col: number) => void;
  callNumber: (number: number) => void;
  callBingo: () => void;
  resetGame: () => void;
  refreshRoomData: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [gameState, setGameState] = useState<GameState>({
    player: null,
    room: null,
    isHost: false,
    error: null,
  });
  
  const callIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<number>(0);
  
  // Connect to Supabase realtime
  useEffect(() => {
    setIsConnected(true);
    console.log("Connected to Supabase realtime");
    
    return () => {
      setIsConnected(false);
      if (callIntervalRef.current) {
        clearInterval(callIntervalRef.current);
      }
    };
  }, []);

  // Create a new room
  const createRoom = async (playerName: string) => {
    try {
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const playerId = uuidv4();
      const card = generateBingoBoard();
    
      console.log("Creating room with code:", roomCode, "and player ID:", playerId);
    
      // Create room in Supabase
      const { data: roomData, error: roomError } = await supabase
        .from('bingo_rooms')
        .insert([
          { 
            code: roomCode, 
            status: 'waiting', 
            board_size: 25,
            host_id: playerId,
            call_history: [],
            current_call: null,
            current_turn: playerId,
            is_manual_mode: false
          }
        ])
        .select()
        .single();
      
      if (roomError) {
        console.error("Error creating room:", roomError);
        toast.error("Failed to create room: " + roomError.message);
        return;
      }
    
      console.log("Room created successfully:", roomData);
    
      // Create player in Supabase
      const { data: playerData, error: playerError } = await supabase
        .from('bingo_players')
        .insert([
          { 
            id: playerId, 
            name: playerName, 
            room_id: roomData.id, 
            board: card,
            marked_cells: [],
            is_winner: false,
            completed_lines: 0
          }
        ])
        .select()
        .single();
        
      if (playerError) {
        console.error("Error creating player:", playerError);
        // Clean up the room since player creation failed
        await supabase.from('bingo_rooms').delete().eq('id', roomData.id);
        toast.error("Failed to create player: " + playerError.message);
        return;
      }
      
      console.log("Player created successfully:", playerData);
    
      const newPlayer: Player = {
        id: playerId,
        name: playerName,
        board: card,
        markedCells: Array(25).fill(false),
        completedLines: 0
      };
    
      const newRoom: GameRoom = {
        id: roomCode,
        host: playerId,
        players: [newPlayer],
        status: 'waiting',
        callHistory: [],
        currentCall: null,
        winner: null,
        callInterval: 5000,
        currentTurn: playerId
      };
    
      // Update local state
      setGameState({
        player: newPlayer,
        room: newRoom,
        isHost: true,
        error: null
      });
    
      toast.success(`Room created! Code: ${roomCode}`);
    } catch (error) {
      console.error("Error in createRoom:", error);
      toast.error("An unexpected error occurred while creating the room");
    }
  };
  
  // Join an existing room
  const joinRoom = async (roomId: string, playerName: string) => {
    try {
      const normalizedRoomId = roomId.toUpperCase();
      
      // Check if room exists
      const { data: roomData, error: roomError } = await supabase
        .from('bingo_rooms')
        .select('*')
        .eq('code', normalizedRoomId)
        .single();
      
      if (roomError || !roomData) {
        setGameState(prev => ({ ...prev, error: "Room not found" }));
        toast.error("Room not found");
        return;
      }
      
      // Check if game is already in progress
      if (roomData.status === 'playing') {
        setGameState(prev => ({ ...prev, error: "Game in progress" }));
        toast.error("Game is already in progress");
        return;
      }
      
      const playerId = uuidv4();
      const card = generateBingoBoard();
      
      // Create player in Supabase
      const { data: playerData, error: playerError } = await supabase
        .from('bingo_players')
        .insert([
          { 
            id: playerId, 
            name: playerName, 
            room_id: roomData.id, 
            board: card,
            marked_cells: [],
            is_winner: false,
            completed_lines: 0
          }
        ])
        .select()
        .single();
        
      if (playerError) {
        console.error("Error creating player:", playerError);
        toast.error("Failed to join room");
        return;
      }
      
      // Fetch all players in the room
      const { data: playersData, error: playersError } = await supabase
        .from('bingo_players')
        .select('*')
        .eq('room_id', roomData.id);
        
      if (playersError) {
        console.error("Error fetching players:", playersError);
        toast.error("Failed to load room data");
        return;
      }
      
      // Create player object
      const newPlayer: Player = {
        id: playerId,
        name: playerName,
        board: card,
        markedCells: Array(25).fill(false),
        completedLines: 0
      };
      
      // Convert players data to our format
      const players: Player[] = playersData.map(p => ({
        id: p.id,
        name: p.name,
        board: p.id === playerId ? card : convertJsonToBingoCard(p.board),
        markedCells: Array.isArray(p.marked_cells) ? p.marked_cells : Array(25).fill(false),
        completedLines: p.completed_lines || 0
      }));
      
      const hostId = roomData.host_id || (playersData.length > 0 ? playersData[0].id : playerId);
      
      // Create room object
      const room: GameRoom = {
        id: normalizedRoomId,
        host: hostId,
        players,
        status: roomData.status as 'waiting' | 'playing' | 'finished',
        callHistory: Array.isArray(roomData.call_history) 
          ? roomData.call_history.map((call: any) => ({
              number: call.number,
              column: call.column,
              timestamp: call.timestamp
            }))
          : [],
        currentCall: roomData.current_call 
          ? {
              number: (roomData.current_call as any).number,
              column: (roomData.current_call as any).column
            } 
          : null,
        winner: null,
        callInterval: 5000,
        currentTurn: roomData.current_turn || hostId
      };
      
      // Update local state
      setGameState({
        player: newPlayer,
        room,
        isHost: hostId === playerId,
        error: null
      });
      
      toast.success(`Joined room ${normalizedRoomId}`);
    } catch (error) {
      console.error("Error in joinRoom:", error);
      toast.error("An unexpected error occurred");
    }
  };
  
  // Leave the current room
  const leaveRoom = async () => {
    const { room, player } = gameState;
    
    if (!room || !player) return;
    
    try {
      // Remove player from database
      const { error: playerError } = await supabase
        .from('bingo_players')
        .delete()
        .eq('id', player.id);
        
      if (playerError) {
        console.error("Error removing player:", playerError);
      }
      
      // Check if this was the last player
      const { data: remainingPlayers, error: countError } = await supabase
        .from('bingo_players')
        .select('id')
        .eq('room_id', room.id);
        
      if (!countError && (!remainingPlayers || remainingPlayers.length === 0)) {
        // Delete the room if no players left
        const { error: roomError } = await supabase
          .from('bingo_rooms')
          .delete()
          .eq('code', room.id);
          
        if (roomError) {
          console.error("Error removing room:", roomError);
        }
      }
      
      // Reset local state
      setGameState({
        player: null,
        room: null,
        isHost: false,
        error: null
      });
      
      toast.success("Left the room");
    } catch (error) {
      console.error("Error in leaveRoom:", error);
      toast.error("An unexpected error occurred");
    }
  };
  
  // Start the game (host only)
  const startGame = async () => {
    const { room, isHost } = gameState;
    
    if (!room || !isHost) return;
    
    try {
      // Get the actual room ID from Supabase
      const { data: roomData, error: roomError } = await supabase
        .from('bingo_rooms')
        .select('id')
        .eq('code', room.id)
        .single();
        
      if (roomError || !roomData) {
        console.error("Error getting room ID:", roomError);
        return;
      }
      
      // Check player count
      const { data: playersData, error: countError } = await supabase
        .from('bingo_players')
        .select('id')
        .eq('room_id', roomData.id);
        
      if (countError) {
        console.error("Error counting players:", countError);
        return;
      }
      
      if (!playersData || playersData.length < 2) {
        toast.error("Need at least 2 players to start");
        return;
      }
      
      // Update room status
      const { error: updateError } = await supabase
        .from('bingo_rooms')
        .update({ 
          status: 'playing',
          call_history: [],
          current_call: null,
          current_turn: room.host
        })
        .eq('id', roomData.id);
        
      if (updateError) {
        console.error("Error updating room status:", updateError);
        toast.error("Failed to start the game");
        return;
      }
      
      // Update local state
      setGameState(prev => ({
        ...prev,
        room: {
          ...prev.room!,
          status: 'playing',
          callHistory: [],
          currentCall: null,
          winner: null,
          currentTurn: room.host
        }
      }));
      
      toast.success("Game started!");
    } catch (error) {
      console.error("Error in startGame:", error);
      toast.error("An unexpected error occurred");
    }
  };
  
  // Mark a cell (placeholder - will be enhanced later)
  const markCell = async (row: number, col: number) => {
    console.log("Mark cell:", row, col);
  };
  
  // Call a number
  const callNumber = async (number: number) => {
    const { player, room } = gameState;
    
    if (!player || !room || room.status !== 'playing') {
      return;
    }
    
    if (room.currentTurn !== player.id) {
      toast.error("Not your turn");
      return;
    }
    
    try {
      const { data: roomData, error: roomError } = await supabase
        .from('bingo_rooms')
        .select('id, call_history')
        .eq('code', room.id)
        .single();
        
      if (roomError || !roomData) {
        console.error("Error getting room data:", roomError);
        return;
      }
      
      const column = getColumnLetter(number);
      const newCall = {
        number,
        column,
        timestamp: Date.now()
      };
      
      let callHistory = [];
      if (roomData.call_history) {
        callHistory = Array.isArray(roomData.call_history) 
          ? roomData.call_history 
          : [];
      }
      
      const alreadyCalled = callHistory.some((call: any) => call.number === number);
      
      if (alreadyCalled) {
        toast.error(`Number ${number} has already been called`);
        return;
      }
      
      const updatedCallHistory = [...callHistory, newCall];
      
      // Get all players for turn rotation
      const { data: playersData, error: playersError } = await supabase
        .from('bingo_players')
        .select('id')
        .eq('room_id', roomData.id)
        .order('joined_at', { ascending: true });
        
      if (playersError) {
        console.error("Error fetching players for turn order:", playersError);
        return;
      }
      
      // Mark number on all player cards
      const { data: allPlayers, error: allPlayersError } = await supabase
        .from('bingo_players')
        .select('*')
        .eq('room_id', roomData.id);
        
      if (allPlayersError) {
        console.error("Error fetching all players:", allPlayersError);
        return;
      }
      
      // Update each player's card to mark this number
      for (const dbPlayer of allPlayers) {
        const playerCard = convertJsonToBingoCard(dbPlayer.board);
        const updatedCard = markNumber(playerCard, number);
        
        await supabase
          .from('bingo_players')
          .update({ 
            board: updatedCard,
            marked_cells: []
          })
          .eq('id', dbPlayer.id);
      }
      
      // Determine next player's turn
      const playerIds = playersData.map(p => p.id);
      const currentPlayerIndex = playerIds.findIndex(id => id === player.id);
      const nextPlayerIndex = (currentPlayerIndex + 1) % playerIds.length;
      const nextPlayerId = playerIds[nextPlayerIndex];
      
      // Update room with new call and next player's turn
      const { error: updateError } = await supabase
        .from('bingo_rooms')
        .update({ 
          call_history: updatedCallHistory,
          current_call: { number, column },
          current_turn: nextPlayerId
        })
        .eq('id', roomData.id);
        
      if (updateError) {
        console.error("Error updating call history:", updateError);
        return;
      }
      
      // Update local state
      const updatedLocalCard = markNumber(player.board, number);
      setGameState(prev => ({
        ...prev,
        player: {
          ...prev.player!,
          board: updatedLocalCard
        },
        room: {
          ...prev.room!,
          callHistory: updatedCallHistory.map(call => ({
            number: call.number,
            column: call.column,
            timestamp: call.timestamp
          })),
          currentCall: { number, column },
          currentTurn: nextPlayerId
        }
      }));
      
      const nextPlayer = room.players.find(p => p.id === nextPlayerId);
      toast.success(`${column}-${number} called! Next: ${nextPlayer?.name}`);
      
    } catch (error) {
      console.error("Error calling number:", error);
      toast.error("Failed to call number");
    }
  };
  
  // Call bingo (placeholder)
  const callBingo = async () => {
    console.log("Call bingo");
  };
  
  // Reset game (placeholder)
  const resetGame = async () => {
    console.log("Reset game");
  };
  
  // Refresh room data
  const refreshRoomData = useCallback(async () => {
    if (!gameState.room) return;
    
    const now = Date.now();
    if (now - lastRefreshRef.current < 500) {
      return;
    }
    lastRefreshRef.current = now;
    
    try {
      console.log("🔄 Refreshing room data for room:", gameState.room.id);
      
      const { data: roomData, error: roomError } = await supabase
        .from('bingo_rooms')
        .select('*')
        .eq('code', gameState.room.id)
        .single();
        
      if (roomError) {
        console.error("Error fetching room data:", roomError);
        return;
      }
      
      const { data: playersData, error: playersError } = await supabase
        .from('bingo_players')
        .select('*')
        .eq('room_id', roomData.id);
        
      if (playersError) {
        console.error("Error fetching players:", playersError);
        return;
      }
      
      const hostId = roomData.host_id || (playersData && playersData.length > 0 ? playersData[0].id : null);
      
      const callHistory = Array.isArray(roomData.call_history) 
        ? roomData.call_history.map((call: any) => ({
            number: call.number,
            column: call.column,
            timestamp: call.timestamp
          }))
        : [];
      
      const updatedRoom: GameRoom = {
        id: roomData.code,
        host: hostId,
        players: playersData ? playersData.map(p => ({
          id: p.id,
          name: p.name,
          board: convertJsonToBingoCard(p.board),
          markedCells: Array.isArray(p.marked_cells) ? p.marked_cells : Array(25).fill(false),
          completedLines: p.completed_lines || 0
        })) : [],
        status: roomData.status as 'waiting' | 'playing' | 'finished',
        callHistory,
        currentCall: roomData.current_call 
          ? {
              number: (roomData.current_call as any).number,
              column: (roomData.current_call as any).column
            } 
          : null,
        winner: playersData ? playersData.find(p => p.is_winner) ? {
          id: playersData.find(p => p.is_winner)!.id,
          name: playersData.find(p => p.is_winner)!.name,
          board: convertJsonToBingoCard(playersData.find(p => p.is_winner)!.board),
          markedCells: Array.isArray(playersData.find(p => p.is_winner)!.marked_cells) ? Array(25).fill(false) : Array(25).fill(false),
          completedLines: playersData.find(p => p.is_winner)!.completed_lines || 0
        } : null : null,
        callInterval: 5000,
        currentTurn: roomData.current_turn || hostId
      };
      
      const currentPlayer = updatedRoom.players.find(p => p.id === gameState.player?.id) || null;
      
      setGameState(prev => ({
        ...prev,
        room: updatedRoom,
        player: currentPlayer || prev.player,
        isHost: currentPlayer ? updatedRoom.host === currentPlayer.id : prev.isHost,
      }));
      
      console.log("✅ Room data refreshed successfully");
    } catch (error) {
      console.error("Error in refreshRoomData:", error);
    }
  }, [gameState.room, gameState.player?.id]);

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        gameState,
        createRoom,
        joinRoom,
        leaveRoom,
        startGame,
        markCell,
        callNumber,
        callBingo,
        resetGame,
        refreshRoomData
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
