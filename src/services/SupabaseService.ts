
import { supabase } from "@/integrations/supabase/client";
import { generateBingoBoard } from "@/lib/bingo";

export type SupabaseRoom = {
  id: string;
  created_at: string;
  code: string;
  status: string;
  is_manual_mode: boolean;
  last_called_number: number | null;
  winner_id?: string | null;
  host_id?: string | null;
  current_turn?: string | null;
};

export type SupabasePlayer = {
  id: string;
  created_at: string;
  name: string;
  room_id: string;
  board: number[];
  marked_cells: boolean[];
  completed_lines: number;
  is_winner: boolean;
};

export type SupabaseRoomData = {
  room: SupabaseRoom;
  players: SupabasePlayer[];
  winner: SupabasePlayer | null;
};

export class SupabaseService {
  // Check connection to Supabase
  static async checkConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from("bingo_rooms").select("id").limit(1);
      if (error) {
        console.error("Supabase connection error:", error);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Supabase connection error:", error);
      return false;
    }
  }

  // Clean up old rooms
  static async cleanupOldRooms(): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { error } = await supabase
        .from("bingo_rooms")
        .delete()
        .lt("created_at", oneHourAgo)
        .neq("status", "playing");

      if (error) {
        console.error("Error cleaning up old rooms:", error);
      }
    } catch (error) {
      console.error("Error in cleanup process:", error);
    }
  }

  // Generate a unique room code
  private static generateRoomCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Create a new room
  static async createRoom(playerName: string, isManual: boolean = false): Promise<{ roomId: string; playerId: string } | null> {
    try {
      await this.cleanupOldRooms();
      
      let roomCode = this.generateRoomCode();
      let attempts = 0;
      const maxAttempts = 10;

      // Find unique room code
      while (attempts < maxAttempts) {
        const { data: existingRoom } = await supabase
          .from("bingo_rooms")
          .select("code")
          .eq("code", roomCode)
          .single();

        if (!existingRoom) break;
        
        roomCode = this.generateRoomCode();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        console.error("Could not generate unique room code");
        return null;
      }

      // Create the room
      const { data: room, error: roomError } = await supabase
        .from("bingo_rooms")
        .insert([{ 
          code: roomCode,
          status: "waiting",
          is_manual_mode: isManual
        }])
        .select()
        .single();

      if (roomError) {
        console.error("Error creating room:", roomError);
        return null;
      }

      console.log("Room created successfully:", room);

      // Generate board for the host
      const playerBoard = generateBingoBoard();
      
      // Create the host player
      const { data: player, error: playerError } = await supabase
        .from("bingo_players")
        .insert([{ 
          room_id: room.id,
          name: playerName,
          board: playerBoard,
          marked_cells: Array(25).fill(false),
          completed_lines: 0,
          is_winner: false
        }])
        .select()
        .single();

      if (playerError) {
        console.error("Error creating player:", playerError);
        return null;
      }

      console.log("Player created successfully:", player);

      // Update room with host_id and current_turn
      await supabase
        .from("bingo_rooms")
        .update({ 
          host_id: player.id,
          current_turn: player.id
        })
        .eq("id", room.id);

      return { roomId: roomCode, playerId: player.id };
    } catch (error) {
      console.error("Error creating room:", error);
      return null;
    }
  }

  // Join an existing room
  static async joinRoom(roomCode: string, playerName: string, playerBoard: number[]): Promise<{ playerId: string; roomDbId: string } | null> {
    try {
      console.log("Attempting to join room with code:", roomCode);

      // Get the room
      const { data: room, error: roomError } = await supabase
        .from("bingo_rooms")
        .select("*")
        .eq("code", roomCode)
        .single();

      if (roomError || !room) {
        console.error("Room not found:", roomError);
        return null;
      }

      console.log("Found room:", room);

      // Check if room is joinable
      if (room.status === "playing") {
        console.log("Room is currently playing");
        return null;
      }

      // Reset room if finished
      if (room.status === "finished") {
        await this.resetRoomToWaiting(roomCode);
      }

      // Check room capacity
      const { count, error: countError } = await supabase
        .from("bingo_players")
        .select("*", { count: "exact", head: true })
        .eq("room_id", room.id);

      if (countError) {
        console.error("Error getting player count:", countError);
        return null;
      }

      if (count && count >= 5) {
        console.log("Room is full");
        return null;
      }

      // Check if name is taken
      const { data: existingPlayer } = await supabase
        .from("bingo_players")
        .select("*")
        .eq("room_id", room.id)
        .eq("name", playerName)
        .single();

      if (existingPlayer) {
        console.log("Player name already exists in room");
        return null;
      }

      // Create new player
      const { data: player, error: playerError } = await supabase
        .from("bingo_players")
        .insert([{ 
          room_id: room.id,
          name: playerName,
          board: playerBoard,
          marked_cells: Array(25).fill(false),
          completed_lines: 0,
          is_winner: false
        }])
        .select()
        .single();

      if (playerError) {
        console.error("Error creating player:", playerError);
        return null;
      }

      console.log("Player joined successfully:", player);
      return { playerId: player.id, roomDbId: room.id };
    } catch (error) {
      console.error("Error joining room:", error);
      return null;
    }
  }

  // Get room data
  static async getRoomData(roomCode: string): Promise<SupabaseRoomData | null> {
    try {
      // Get room
      const { data: roomData, error: roomError } = await supabase
        .from("bingo_rooms")
        .select("*")
        .eq("code", roomCode)
        .single();

      if (roomError || !roomData) {
        console.error("Error getting room:", roomError);
        return null;
      }

      const room: SupabaseRoom = {
        id: roomData.id,
        created_at: roomData.created_at || new Date().toISOString(),
        code: roomData.code,
        status: roomData.status || "waiting",
        is_manual_mode: roomData.is_manual_mode ?? false,
        last_called_number: roomData.last_called_number,
        winner_id: roomData.winner_id,
        host_id: roomData.host_id,
        current_turn: roomData.current_turn
      };

      // Get players
      const { data: players, error: playersError } = await supabase
        .from("bingo_players")
        .select("*")
        .eq("room_id", room.id)
        .order("created_at", { ascending: true });

      if (playersError) {
        console.error("Error getting players:", playersError);
        return null;
      }

      // Get winner if exists
      let winner = null;
      if (room.winner_id) {
        const { data: winnerData } = await supabase
          .from("bingo_players")
          .select("*")
          .eq("id", room.winner_id)
          .single();

        if (winnerData) {
          winner = winnerData as SupabasePlayer;
        }
      }

      return {
        room,
        players: (players || []) as SupabasePlayer[],
        winner,
      };
    } catch (error) {
      console.error("Error getting room data:", error);
      return null;
    }
  }

  // Reset room to waiting state
  static async resetRoomToWaiting(roomCode: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("bingo_rooms")
        .update({ 
          status: "waiting",
          winner_id: null,
          last_called_number: null 
        })
        .eq("code", roomCode);

      if (error) {
        console.error("Error resetting room:", error);
        return false;
      }

      // Reset players
      const { data: room } = await supabase
        .from("bingo_rooms")
        .select("id")
        .eq("code", roomCode)
        .single();

      if (room) {
        await supabase
          .from("bingo_players")
          .update({ 
            marked_cells: Array(25).fill(false),
            completed_lines: 0,
            is_winner: false
          })
          .eq("room_id", room.id);
      }

      return true;
    } catch (error) {
      console.error("Error resetting room:", error);
      return false;
    }
  }

  // Start game
  static async startGame(roomDbId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("bingo_rooms")
        .update({ status: "playing" })
        .eq("id", roomDbId);

      if (error) {
        console.error("Error starting game:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error starting game:", error);
      return false;
    }
  }

  // Leave room
  static async leaveRoom(playerId: string): Promise<boolean> {
    try {
      const { data: player } = await supabase
        .from("bingo_players")
        .select("room_id")
        .eq("id", playerId)
        .single();

      const { error } = await supabase
        .from("bingo_players")
        .delete()
        .eq("id", playerId);

      if (error) {
        console.error("Error deleting player:", error);
        return false;
      }

      // Clean up empty room
      if (player?.room_id) {
        const { count } = await supabase
          .from("bingo_players")
          .select("*", { count: "exact", head: true })
          .eq("room_id", player.room_id);

        if (count === 0) {
          await supabase
            .from("bingo_rooms")
            .delete()
            .eq("id", player.room_id);
        }
      }

      return true;
    } catch (error) {
      console.error("Error leaving room:", error);
      return false;
    }
  }

  // Mark number
  static async markNumber(playerId: string, index: number, completedLines: number): Promise<boolean> {
    try {
      // Get current player data
      const { data: currentPlayer, error: fetchError } = await supabase
        .from("bingo_players")
        .select("marked_cells")
        .eq("id", playerId)
        .single();

      if (fetchError || !currentPlayer) {
        console.error("Error fetching player:", fetchError);
        return false;
      }

      // Update marked cells
      const updatedMarkedCells = [...(currentPlayer.marked_cells as boolean[])];
      updatedMarkedCells[index] = true;

      const { error } = await supabase
        .from("bingo_players")
        .update({ 
          marked_cells: updatedMarkedCells,
          completed_lines: completedLines
        })
        .eq("id", playerId);

      if (error) {
        console.error("Error updating player:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error marking number:", error);
      return false;
    }
  }

  // Set called number
  static async setCalledNumber(roomDbId: string, number: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("bingo_rooms")
        .update({ last_called_number: number })
        .eq("id", roomDbId);

      if (error) {
        console.error("Error setting called number:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error setting called number:", error);
      return false;
    }
  }

  // End game
  static async endGame(playerId: string, roomDbId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("bingo_rooms")
        .update({ 
          status: "finished",
          winner_id: playerId 
        })
        .eq("id", roomDbId);

      if (error) {
        console.error("Error ending game:", error);
        return false;
      }

      // Mark player as winner
      await supabase
        .from("bingo_players")
        .update({ is_winner: true })
        .eq("id", playerId);

      return true;
    } catch (error) {
      console.error("Error ending game:", error);
      return false;
    }
  }

  // Reset game
  static async resetGame(roomDbId: string): Promise<boolean> {
    try {
      const { error: roomError } = await supabase
        .from("bingo_rooms")
        .update({ 
          status: "waiting",
          winner_id: null,
          last_called_number: null 
        })
        .eq("id", roomDbId);

      if (roomError) {
        console.error("Error resetting game:", roomError);
        return false;
      }

      const { error: playersError } = await supabase
        .from("bingo_players")
        .update({ 
          marked_cells: Array(25).fill(false),
          completed_lines: 0,
          is_winner: false
        })
        .eq("room_id", roomDbId);

      if (playersError) {
        console.error("Error resetting players:", playersError);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error resetting game:", error);
      return false;
    }
  }

  // Set up realtime listeners
  static async setupRoomListeners(
    roomCode: string,
    callbacks: {
      onRoomUpdate: (data: SupabaseRoomData) => void;
      onPlayerJoined: (data: any) => void;
      onPlayerLeft: (data: any) => void;
      onNumberCalled: (data: any) => void;
      onGameWon: (data: any) => void;
    }
  ): Promise<any> {
    try {
      // Get initial room data
      const initialData = await this.getRoomData(roomCode);
      if (!initialData) {
        console.error("Failed to get initial room data");
        return null;
      }

      // Subscribe to room changes
      const roomChannel = supabase
        .channel(`room-${roomCode}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "bingo_rooms", filter: `code=eq.${roomCode}` },
          async (payload) => {
            console.log("Room change received:", payload);
            const updatedData = await this.getRoomData(roomCode);
            if (updatedData) {
              callbacks.onRoomUpdate(updatedData);
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "bingo_players", filter: `room_id=eq.${initialData.room.id}` },
          async (payload) => {
            console.log("Player joined:", payload);
            const { data: newPlayer } = await supabase
              .from("bingo_players")
              .select("*")
              .eq("id", (payload.new as any).id)
              .single();

            if (newPlayer) {
              callbacks.onPlayerJoined({ playerName: newPlayer.name });
              const updatedData = await this.getRoomData(roomCode);
              if (updatedData) {
                callbacks.onRoomUpdate(updatedData);
              }
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "bingo_players", filter: `room_id=eq.${initialData.room.id}` },
          async (payload) => {
            console.log("Player left:", payload);
            callbacks.onPlayerLeft({ playerName: (payload.old as any).name });
            const updatedData = await this.getRoomData(roomCode);
            if (updatedData) {
              callbacks.onRoomUpdate(updatedData);
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "bingo_rooms", filter: `id=eq.${initialData.room.id}` },
          async (payload) => {
            console.log("Room updated:", payload);
            
            if ((payload.new as any).status === "playing" && 
                (payload.old as any).status === "waiting") {
              console.log("Game started!");
            }
            
            if ((payload.new as any).last_called_number) {
              callbacks.onNumberCalled({ number: (payload.new as any).last_called_number });
            }
            
            if ((payload.new as any).winner_id) {
              const { data: winner } = await supabase
                .from("bingo_players")
                .select("*")
                .eq("id", (payload.new as any).winner_id)
                .single();

              if (winner) {
                callbacks.onGameWon({ winner: { name: winner.name } });
              }
            }
          }
        )
        .subscribe(async (status) => {
          console.log("Realtime channel status:", status);
        });

      return roomChannel;
    } catch (error) {
      console.error("Error setting up room listeners:", error);
      return null;
    }
  }
}
