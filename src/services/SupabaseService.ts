
import { supabase } from "@/integrations/supabase/client";
import { generateBingoBoard } from "@/lib/bingo";
import { Player } from "@/types/game";

export type SupabaseRoom = {
  id: string;
  created_at: string;
  room_code: string;
  game_status: string;
  is_manual_mode: boolean;
  last_called_number: number | null;
  winner_id?: string | null;
};

export type SupabasePlayer = {
  id: string;
  created_at: string;
  name: string;
  room_id: string;
  board: number[];
  marked_cells: boolean[];
  completed_lines: number;
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
      await supabase.from("bingo_rooms").select("*").limit(1);
      return true;
    } catch (error) {
      console.error("Supabase connection error:", error);
      return false;
    }
  }

  // Create a new room
  static async createRoom(playerName: string, isManual: boolean = false): Promise<{ roomId: string; playerId: string } | null> {
    const roomCode = this.generateRoomCode();

    try {
      // Insert the new room into the database
      const { data: room, error: roomError } = await supabase
        .from("bingo_rooms")
        .insert([{ room_code: roomCode, game_status: "waiting", is_manual_mode: isManual }])
        .select()
        .single();

      if (roomError) {
        console.error("Error creating room:", roomError);
        return null;
      }

      // Generate a new bingo board for the player
      const playerBoard = generateBingoBoard();

      // Insert the player into the database
      const { data: player, error: playerError } = await supabase
        .from("bingo_players")
        .insert([{ room_id: room.id, name: playerName, board: playerBoard, marked_cells: Array(25).fill(false), completed_lines: 0 }])
        .select()
        .single();

      if (playerError) {
        console.error("Error creating player:", playerError);
        return null;
      }

      return { roomId: roomCode, playerId: player.id };
    } catch (error) {
      console.error("Error creating room:", error);
      return null;
    }
  }

  // Generate a unique room code
  private static generateRoomCode(): string {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
  }

  // Join an existing room
  static async joinRoom(roomId: string, playerName: string, playerBoard: number[]): Promise<{ playerId: string; roomDbId: string } | null> {
    try {
      // Get the room from the database
      const { data: room, error: roomError } = await supabase
        .from("bingo_rooms")
        .select("*")
        .eq("room_code", roomId)
        .single();

      if (roomError) {
        console.error("Error getting room:", roomError);
        return null;
      }

      // Check if the room is full
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

      // Insert the player into the database
      const { data: player, error: playerError } = await supabase
        .from("bingo_players")
        .insert([{ room_id: room.id, name: playerName, board: playerBoard, marked_cells: Array(25).fill(false), completed_lines: 0 }])
        .select()
        .single();

      if (playerError) {
        console.error("Error creating player:", playerError);
        return null;
      }

      return { playerId: player.id, roomDbId: room.id };
    } catch (error) {
      console.error("Error joining room:", error);
      return null;
    }
  }

  // Get room data
  static async getRoomData(roomId: string): Promise<SupabaseRoomData | null> {
    try {
      // Get the room from the database
      const { data: roomData, error: roomError } = await supabase
        .from("bingo_rooms")
        .select("*")
        .eq("room_code", roomId)
        .single();

      if (roomError) {
        console.error("Error getting room:", roomError);
        return null;
      }

      // The room data from the database might not include is_manual_mode if it was created before this field was added
      // We need to ensure it has the right shape for our SupabaseRoom type
      const room: SupabaseRoom = {
        ...roomData,
        is_manual_mode: roomData.is_manual_mode ?? false, // Default to false if not present
      };

      // Get the players in the room
      const { data: players, error: playersError } = await supabase
        .from("bingo_players")
        .select("*")
        .eq("room_id", room.id);

      if (playersError) {
        console.error("Error getting players:", playersError);
        return null;
      }

      // Get the winner (if there is one)
      let winner = null;
      if (room.winner_id) {
        const { data: winnerData, error: winnerError } = await supabase
          .from("bingo_players")
          .select("*")
          .eq("id", room.winner_id)
          .maybeSingle();

        if (winnerError && winnerError.code !== "PGRST116") { // Ignore "no data found" error
          console.error("Error getting winner:", winnerError);
        } else if (winnerData) {
          winner = winnerData as SupabasePlayer;
        }
      }

      return {
        room,
        players: players as SupabasePlayer[],
        winner,
      };
    } catch (error) {
      console.error("Error getting room data:", error);
      return null;
    }
  }

  // Leave a room
  static async leaveRoom(playerId: string): Promise<boolean> {
    try {
      // Delete the player from the database
      const { error: playerError } = await supabase
        .from("bingo_players")
        .delete()
        .eq("id", playerId);

      if (playerError) {
        console.error("Error deleting player:", playerError);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error leaving room:", error);
      return false;
    }
  }

  // Mark a number on a player's board
  static async markNumber(playerId: string, index: number, completedLines: number): Promise<boolean> {
    try {
      // Update the player's marked cells in the database
      const { error: playerError } = await supabase
        .from("bingo_players")
        .update({ [`marked_cells[${index}]`]: true, completed_lines: completedLines })
        .eq("id", playerId);

      if (playerError) {
        console.error("Error updating player:", playerError);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error marking number:", error);
      return false;
    }
  }

  // End the game
  static async endGame(playerId: string, roomDbId: string): Promise<boolean> {
    try {
      // Update the room to set the winner and game status
      const { error: roomError } = await supabase
        .from("bingo_rooms")
        .update({ game_status: "finished", winner_id: playerId })
        .eq("id", roomDbId);

      if (roomError) {
        console.error("Error ending game:", roomError);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error ending game:", error);
      return false;
    }
  }

  // Reset the game
  static async resetGame(roomDbId: string): Promise<boolean> {
    try {
      // Reset the game status and winner
      const { error: roomError } = await supabase
        .from("bingo_rooms")
        .update({ game_status: "playing", winner_id: null, last_called_number: null })
        .eq("id", roomDbId);

      if (roomError) {
        console.error("Error resetting game:", roomError);
        return false;
      }

      // Reset the players' boards
      const { error: playersError } = await supabase
        .from("bingo_players")
        .update({ marked_cells: Array(25).fill(false), completed_lines: 0 })
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

  // Set the called number
  static async setCalledNumber(roomDbId: string, number: number): Promise<boolean> {
    try {
      // Update the room to set the last called number
      const { error: roomError } = await supabase
        .from("bingo_rooms")
        .update({ last_called_number: number })
        .eq("id", roomDbId);

      if (roomError) {
        console.error("Error setting called number:", roomError);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error setting called number:", error);
      return false;
    }
  }

  static async setupRoomListeners(
    roomId: string,
    callbacks: {
      onRoomUpdate: (data: SupabaseRoomData) => void;
      onPlayerJoined: (data: any) => void;
      onPlayerLeft: (data: any) => void;
      onNumberCalled: (data: any) => void;
      onGameWon: (data: any) => void;
    }
  ): Promise<any> {
    const setupRoomChannels = async (roomId: string, callbacks: any) => {
      const { onRoomUpdate, onPlayerJoined, onPlayerLeft, onNumberCalled, onGameWon } = callbacks;

      // Get initial room data
      const initialData = await this.getRoomData(roomId);

      if (!initialData) {
        console.error("Failed to get initial room data");
        return null;
      }

      // Subscribe to room changes
      const roomChannel = supabase
        .channel(`room-${roomId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "bingo_rooms", filter: `room_code=eq.${roomId}` },
          async (payload) => {
            console.log("Room change received:", payload);
            const updatedData = await this.getRoomData(roomId);
            if (updatedData) {
              onRoomUpdate(updatedData);
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "bingo_players", filter: `room_id=eq.${initialData.room.id}` },
          async (payload) => {
            console.log("Player joined:", payload);
            // Fetch the new player's data
            const { data: newPlayer, error } = await supabase
              .from("bingo_players")
              .select("*")
              .eq("id", (payload.new as any).id)
              .single();

            if (error) {
              console.error("Error fetching new player:", error);
              return;
            }

            onPlayerJoined({ playerName: newPlayer.name });
            const updatedData = await this.getRoomData(roomId);
            if (updatedData) {
              onRoomUpdate(updatedData);
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "bingo_players", filter: `room_id=eq.${initialData.room.id}` },
          async (payload) => {
            console.log("Player left:", payload);
            onPlayerLeft({ playerName: (payload.old as any).name });
            const updatedData = await this.getRoomData(roomId);
            if (updatedData) {
              onRoomUpdate(updatedData);
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "bingo_rooms", filter: `id=eq.${initialData.room.id}` },
          async (payload) => {
            console.log("Number called:", payload);
            if ((payload.new as any).last_called_number) {
              onNumberCalled({ number: (payload.new as any).last_called_number });
            }
            if ((payload.new as any).winner_id) {
              // Fetch the winner's data
              const { data: winner, error } = await supabase
                .from("bingo_players")
                .select("*")
                .eq("id", (payload.new as any).winner_id)
                .single();

              if (error) {
                console.error("Error fetching winner:", error);
                return;
              }

              onGameWon({ winner: { name: winner.name } });
            }
          }
        )
        .subscribe(async (status) => {
          console.log("Realtime channel status:", status);
          if (status === "SUBSCRIBED") {
            console.log(`Successfully subscribed to room ${roomId}`);
          } else if (status === "CHANNEL_ERROR") {
            console.error(`Error subscribing to room ${roomId}`);
          }
        });

      return roomChannel;
    };

    try {
      // Create a new channel for the room
      const realtimeChannels = await Promise.resolve(setupRoomChannels(roomId, callbacks));
      return realtimeChannels;
    } catch (error) {
      console.error("Error setting up room listeners:", error);
      return null;
    }
  }
}
