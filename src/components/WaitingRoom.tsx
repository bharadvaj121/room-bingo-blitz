
import React, { useEffect } from "react";
import { useSocket } from "@/contexts/SocketContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const WaitingRoom: React.FC = () => {
  const { gameState, leaveRoom, startGame, refreshRoomData } = useSocket();
  const { room, isHost } = gameState;

  useEffect(() => {
    if (!room) return;

    console.log("Setting up real-time subscription for room:", room.id);
    
    // First refresh to make sure we have the latest data
    refreshRoomData();
    
    // Get the database ID for the room using the room code
    const fetchRoomDbId = async () => {
      const { data: roomData, error: roomError } = await supabase
        .from('bingo_rooms')
        .select('id')
        .eq('code', room.id)
        .single();
        
      if (roomError) {
        console.error("Error fetching room data:", roomError);
        return;
      }
      
      console.log("Room DB ID for subscriptions:", roomData.id);
      
      // Set up real-time subscription
      const roomChannel = supabase
        .channel('room-updates')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'bingo_players',
            filter: `room_id=eq.${roomData.id}` 
          },
          (payload) => {
            console.log("Player change detected:", payload);
            refreshRoomData();
            
            if (payload.eventType === 'INSERT') {
              const newPlayer = payload.new;
              toast.success(`${newPlayer.name} joined the room`);
            }
          }
        )
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'bingo_rooms',
            filter: `id=eq.${roomData.id}` 
          },
          (payload) => {
            console.log("Room change detected:", payload);
            refreshRoomData();
          }
        )
        .subscribe((status) => {
          console.log("Subscription status:", status);
        });
      
      return () => {
        console.log("Cleaning up subscription");
        supabase.removeChannel(roomChannel);
      };
    };
    
    fetchRoomDbId();
    
    // Set up polling as backup
    const pollingInterval = setInterval(() => {
      refreshRoomData();
    }, 5000);
    
    return () => {
      clearInterval(pollingInterval);
    };
  }, [room?.id, refreshRoomData]);

  if (!room) return null;

  return (
    <Card className="w-full max-w-md mx-auto border-bingo-border/20 shadow-lg">
      <CardHeader className="bg-bingo-border/10 pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">Waiting Room</CardTitle>
          <span className="text-sm font-mono bg-bingo-border/20 px-2 py-1 rounded">
            Room: {room.id}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Players ({room.players.length})</h3>
          <ul className="divide-y">
            {room.players.map((player) => (
              <li key={player.id} className="py-2 flex items-center justify-between">
                <span>
                  {player.name} 
                  {player.id === room.host && (
                    <span className="ml-2 text-xs bg-bingo-accent text-white px-1 py-0.5 rounded">
                      Host
                    </span>
                  )}
                </span>
                {player.id === gameState.player?.id && (
                  <span className="text-xs text-gray-400">(You)</span>
                )}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="text-sm text-gray-500 mt-4 bg-yellow-50 p-3 rounded">
          <p className="font-medium">Game Rules:</p>
          <ul className="list-disc list-inside mt-1">
            <li>Mark numbers on your card as they are called</li>
            <li>First player to complete a line wins</li>
            <li>Don't forget to shout "BINGO!" when you win</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <Button 
          variant="outline" 
          onClick={leaveRoom}
          className="text-bingo-border border-bingo-border/30 hover:bg-bingo-border/10"
        >
          Leave Room
        </Button>
        
        {isHost && (
          <Button 
            onClick={startGame}
            disabled={room.players.length < 2}
            className="bg-bingo-accent hover:bg-bingo-accent/80"
          >
            Start Game
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default WaitingRoom;
