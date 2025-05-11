
import { supabase } from "@/integrations/supabase/client";
import { generateBingoBoard } from "@/lib/bingo";
import { GameStatus, SupabaseRoomData, SupabasePlayer, SupabaseRoom } from "@/types/game";
import { RealtimeChannel } from "@supabase/supabase-js";

// Generate player ID
const generatePlayerId = () => `player-${Math.random().toString(36).substring(2, 9)}`;

export class SupabaseService {
  // Check if Supabase is available
  static async checkConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('bingo_rooms').select('id').limit(1);
      if (error) {
        console.error("Supabase connection error:", error);
        return false;
      }
      console.log("Supabase connection successful");
      return true;
    } catch (error) {
      console.error("Error checking Supabase connection:", error);
      return false;
    }
  }

  // Create a new room
  static async createRoom(playerName: string, isManual: boolean = false): Promise<{ roomId: string; playerId: string; board: number[] } | null> {
    try {
      // Generate room code (6 uppercase alphanumeric characters)
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Generate board based on manual mode
      const board = isManual ? Array(25).fill(0) : generateBingoBoard();
      
      // Create room in database
      const { data: roomData, error: roomError } = await supabase
        .from('bingo_rooms')
        .insert([{ 
          room_code: roomCode,
          game_status: 'waiting'
        }])
        .select();
        
      if (roomError || !roomData || roomData.length === 0) {
        console.error("Error creating room:", roomError);
        return null;
      }
      
      // Generate player ID - use UUID format for database compatibility
      const playerId = crypto.randomUUID();
      
      // Create player entry
      const { data: playerData, error: playerError } = await supabase
        .from('bingo_players')
        .insert([{
          id: playerId,
          name: playerName,
          room_id: roomData[0].id,
          board: board,
          marked_cells: Array(25).fill(false),
          completed_lines: 0
        }])
        .select();
        
      if (playerError || !playerData) {
        console.error("Error creating player:", playerError);
        return null;
      }
      
      console.log("Room and player created successfully:", roomCode, playerId);
      return {
        roomId: roomCode,
        playerId: playerId,
        board: board
      };
    } catch (error) {
      console.error("Error in createRoom:", error);
      return null;
    }
  }

  // Join an existing room
  static async joinRoom(roomCode: string, playerName: string, board: number[]): Promise<{ playerId: string; roomDbId: string } | null> {
    try {
      // Find room by code
      const { data: roomData, error: roomError } = await supabase
        .from('bingo_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .limit(1);
        
      if (roomError || !roomData || roomData.length === 0) {
        console.error("Room not found:", roomCode);
        return null;
      }
      
      // Check if player name is already taken in this room
      const { data: existingPlayers, error: checkError } = await supabase
        .from('bingo_players')
        .select('name')
        .eq('room_id', roomData[0].id)
        .eq('name', playerName);
        
      if (checkError) {
        console.error("Error checking existing players:", checkError);
        return null;
      }
      
      if (existingPlayers && existingPlayers.length > 0) {
        console.error("Player name already taken in this room");
        return null;
      }
      
      // Check if room is full (max 5 players)
      const { count, error: countError } = await supabase
        .from('bingo_players')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomData[0].id);
        
      if (countError) {
        console.error("Error counting players:", countError);
        return null;
      }
      
      if (count !== null && count >= 5) {
        console.error("Room is full");
        return null;
      }
      
      // Generate player ID - use UUID format for database compatibility
      const playerId = crypto.randomUUID();
      
      // Create player entry
      await supabase
        .from('bingo_players')
        .insert([{
          id: playerId,
          name: playerName,
          room_id: roomData[0].id,
          board: board,
          marked_cells: Array(25).fill(false),
          completed_lines: 0
        }]);
      
      console.log("Player joined room successfully:", roomCode, playerId);
      return {
        playerId: playerId,
        roomDbId: roomData[0].id
      };
    } catch (error) {
      console.error("Error in joinRoom:", error);
      return null;
    }
  }

  // Leave a room
  static async leaveRoom(playerId: string) {
    try {
      await supabase
        .from('bingo_players')
        .delete()
        .eq('id', playerId);
        
      console.log("Player left room successfully:", playerId);
      return true;
    } catch (error) {
      console.error("Error leaving room:", error);
      return false;
    }
  }

  // Mark a number on a player's board
  static async markNumber(playerId: string, index: number, completedLines: number): Promise<boolean> {
    try {
      // Get player data first to update marked cells
      const { data: playerData, error: fetchError } = await supabase
        .from('bingo_players')
        .select('*')
        .eq('id', playerId)
        .single();
        
      if (fetchError || !playerData) {
        console.error("Error fetching player data:", fetchError);
        return false;
      }
      
      // Update the marked cells - safely cast to array since we know it's an array
      const markedCells = Array.isArray(playerData.marked_cells) 
        ? [...playerData.marked_cells] 
        : Array(25).fill(false);
      
      markedCells[index] = true;
      
      // Get the number at this index - safely cast to array since we know it's an array
      const board = Array.isArray(playerData.board) ? playerData.board : [];
      const number = board[index];
      
      // Update player's marked cells
      const { error: updateError } = await supabase
        .from('bingo_players')
        .update({ 
          marked_cells: markedCells,
          completed_lines: completedLines
        })
        .eq('id', playerId);
        
      if (updateError) {
        console.error("Error updating marked cells:", updateError);
        return false;
      }
      
      // Also update the room with the last called number
      const { error: roomError } = await supabase
        .from('bingo_rooms')
        .update({ last_called_number: number })
        .eq('id', playerData.room_id);
        
      if (roomError) {
        console.error("Error updating last called number:", roomError);
      }
      
      return true;
    } catch (error) {
      console.error("Error marking number:", error);
      return false;
    }
  }

  // End the game with a winner
  static async endGame(playerId: string, roomId: string): Promise<boolean> {
    try {
      await supabase
        .from('bingo_rooms')
        .update({ 
          game_status: 'finished',
          winner_id: playerId
        })
        .eq('id', roomId);
        
      console.log("Game ended with winner:", playerId);
      return true;
    } catch (error) {
      console.error("Error ending game:", error);
      return false;
    }
  }

  // Reset the game
  static async resetGame(roomId: string): Promise<boolean> {
    try {
      await supabase
        .from('bingo_rooms')
        .update({ 
          game_status: 'playing',
          winner_id: null,
          last_called_number: null 
        })
        .eq('id', roomId);
        
      // Reset all players' marked cells in this room
      const { data: players, error: fetchError } = await supabase
        .from('bingo_players')
        .select('id')
        .eq('room_id', roomId);
        
      if (fetchError || !players) {
        console.error("Error fetching players for reset:", fetchError);
        return false;
      }
      
      // For each player, reset their board
      for (const player of players) {
        const newBoard = generateBingoBoard();
        await supabase
          .from('bingo_players')
          .update({ 
            board: newBoard,
            marked_cells: Array(25).fill(false),
            completed_lines: 0 
          })
          .eq('id', player.id);
      }
      
      console.log("Game reset successfully");
      return true;
    } catch (error) {
      console.error("Error resetting game:", error);
      return false;
    }
  }

  // Get room data including all players
  static async getRoomData(roomCode: string): Promise<SupabaseRoomData | null> {
    try {
      // Get room data
      const { data: roomData, error: roomError } = await supabase
        .from('bingo_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .limit(1);
        
      if (roomError || !roomData || roomData.length === 0) {
        console.error("Room not found:", roomCode);
        return null;
      }
      
      // Get all players in the room
      const { data: playersData, error: playersError } = await supabase
        .from('bingo_players')
        .select('*')
        .eq('room_id', roomData[0].id);
        
      if (playersError) {
        console.error("Error fetching players:", playersError);
        return null;
      }
      
      const players: SupabasePlayer[] = (playersData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        room_id: p.room_id,
        board: Array.isArray(p.board) ? p.board : [],
        marked_cells: Array.isArray(p.marked_cells) ? p.marked_cells : Array(25).fill(false),
        completed_lines: p.completed_lines || 0,
        created_at: p.created_at
      }));
      
      // Find winner if game is finished
      let winner: SupabasePlayer | null = null;
      if (roomData[0].game_status === 'finished' && roomData[0].winner_id) {
        winner = players.find(p => p.id === roomData[0].winner_id) || null;
      }
      
      return {
        room: {
          id: roomData[0].id,
          room_code: roomData[0].room_code,
          game_status: roomData[0].game_status || null,
          winner_id: roomData[0].winner_id || null,
          last_called_number: roomData[0].last_called_number || null,
          created_at: roomData[0].created_at || null
        },
        players,
        winner
      };
    } catch (error) {
      console.error("Error getting room data:", error);
      return null;
    }
  }

  // Set up real-time listeners for a room
  static setupRoomListeners(roomCode: string, callbacks: {
    onRoomUpdate: (data: any) => void;
    onPlayerJoined: (player: any) => void;
    onPlayerLeft: (player: any) => void;
    onNumberCalled: (data: any) => void;
    onGameWon: (data: any) => void;
  }) {
    // First, get room ID from room code
    return supabase
      .from('bingo_rooms')
      .select('id')
      .eq('room_code', roomCode)
      .limit(1)
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) {
          console.error("Room not found for real-time subscription:", error);
          return null;
        }
        
        const roomId = data[0].id;
        
        // Set up channel for room changes
        const roomChannel = supabase
          .channel(`room:${roomId}`)
          .on(
            'postgres_changes',
            { 
              event: '*', 
              schema: 'public',
              table: 'bingo_rooms',
              filter: `id=eq.${roomId}`
            },
            async (payload) => {
              console.log("Room update:", payload);
              
              const newData = payload.new as Record<string, any>;
              const oldData = payload.old as Partial<Record<string, any>> || {};

              // Get full room data including all players
              const roomData = await this.getRoomData(roomCode);
              if (roomData) {
                callbacks.onRoomUpdate(roomData);
                
                // Check for game won
                if (newData && newData.game_status === 'finished' && newData.winner_id) {
                  callbacks.onGameWon({
                    winner: roomData.winner
                  });
                }
                
                // Check for number called
                if (newData && oldData && newData.last_called_number !== oldData.last_called_number) {
                  callbacks.onNumberCalled({
                    number: newData.last_called_number
                  });
                }
              }
            }
          )
          .subscribe();
          
        // Set up channel for player changes
        const playersChannel = supabase
          .channel(`players:${roomId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'bingo_players',
              filter: `room_id=eq.${roomId}`
            },
            (payload) => {
              console.log("Player joined:", payload);
              const newData = payload.new as Record<string, any>;
              callbacks.onPlayerJoined({
                playerName: newData.name,
                playerId: newData.id
              });
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'bingo_players',
              filter: `room_id=eq.${roomId}`
            },
            (payload) => {
              console.log("Player left:", payload);
              const oldData = payload.old as Record<string, any>;
              callbacks.onPlayerLeft({
                playerName: oldData.name,
                playerId: oldData.id
              });
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'bingo_players',
              filter: `room_id=eq.${roomId}`
            },
            (payload) => {
              // Handle player updates (e.g., marked cells)
              console.log("Player updated:", payload);
              
              const newData = payload.new as Record<string, any>;
              const oldData = payload.old as Record<string, any>;

              // When a player marks a cell, notify others
              if (newData && oldData && 
                  JSON.stringify(newData.marked_cells) !== JSON.stringify(oldData.marked_cells)) {
                // Get the number called from the difference between old and new marked cells
                const oldCells = Array.isArray(oldData.marked_cells) ? oldData.marked_cells : [];
                const newCells = Array.isArray(newData.marked_cells) ? newData.marked_cells : [];
                let index = -1;
                
                for (let i = 0; i < newCells.length; i++) {
                  if (newCells[i] && !oldCells[i]) {
                    index = i;
                    break;
                  }
                }
                
                if (index >= 0) {
                  const board = Array.isArray(newData.board) ? newData.board : [];
                  const number = board[index];
                  callbacks.onNumberCalled({
                    number: number,
                    playerName: newData.name
                  });
                }
              }
            }
          )
          .subscribe();
          
        return {
          roomChannel,
          playersChannel,
          unsubscribe: () => {
            supabase.removeChannel(roomChannel);
            supabase.removeChannel(playersChannel);
          }
        };
      })
      .then(result => {
        // Adding proper promise handling
        return result;
      })
      .catch(error => {
        console.error("Error setting up room listeners:", error);
        return null;
      });
  }
}
