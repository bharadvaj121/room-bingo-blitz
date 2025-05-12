
import React, { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Copy, Users, Clock, Play } from "lucide-react";
import { toast } from "sonner";

const WaitingRoom: React.FC = () => {
  const { 
    roomId, 
    players, 
    isHost, 
    playerName,
    startGame,
    leaveRoom
  } = useGame();

  const [copied, setCopied] = useState(false);

  const copyRoomIdToClipboard = () => {
    if (!roomId) return;
    
    navigator.clipboard.writeText(roomId)
      .then(() => {
        setCopied(true);
        toast.success("Room ID copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => console.error("Failed to copy room ID:", err));
  };

  return (
    <Card className="w-full max-w-3xl mx-auto bg-bingo-card border-4 border-bingo-border shadow-lg">
      <CardHeader className="text-center border-b border-bingo-border/30 pb-4">
        <CardTitle className="text-3xl font-bold text-bingo-border">Waiting Room</CardTitle>
        <div className="mt-2 flex items-center justify-center">
          <span className="text-lg font-semibold mr-2">Room Code:</span>
          <div className="flex items-center">
            <span className="text-xl font-bold tracking-wider bg-bingo-border/10 px-3 py-1 rounded-l-md">
              {roomId}
            </span>
            <Button 
              variant="outline"
              size="icon"
              className="rounded-l-none border-l-0 h-10"
              onClick={copyRoomIdToClipboard}
            >
              <Copy className={`h-4 w-4 ${copied ? "text-green-600" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-6">
        <div className="mb-6 flex items-center justify-center">
          <div className="bg-bingo-accent/20 py-2 px-4 rounded-full flex items-center">
            <Users className="h-5 w-5 mr-2 text-bingo-border" />
            <span className="font-semibold">{players.length} Player{players.length !== 1 ? 's' : ''} in Room</span>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="bg-bingo-border text-white px-4 py-2 font-medium">
            Players
          </div>
          <ul className="divide-y divide-bingo-border/10">
            {players.map((player, index) => (
              <li 
                key={player.id} 
                className="px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center">
                  <span className="font-medium mr-2">{index + 1}.</span>
                  <span>{player.name}</span>
                  {player.isHost && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Host
                    </span>
                  )}
                  {player.name === playerName && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      You
                    </span>
                  )}
                </div>
              </li>
            ))}
            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 5 - players.length) }).map((_, index) => (
              <li 
                key={`empty-${index}`} 
                className="px-4 py-3 text-gray-400 italic"
              >
                Waiting for player...
              </li>
            ))}
          </ul>
        </div>

        {isHost ? (
          <div className="mt-6 text-center">
            <p className="mb-4 text-sm text-gray-600">
              Share the room code with other players so they can join. You can start the game once at least one other player has joined.
            </p>
            <Button
              onClick={startGame}
              disabled={players.length < 2}
              className="bg-green-600 hover:bg-green-700 text-white px-6 flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Start Game
            </Button>
            {players.length < 2 && (
              <p className="mt-2 text-sm text-yellow-600">
                Need at least 2 players to start
              </p>
            )}
          </div>
        ) : (
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <Clock className="h-5 w-5" />
              <span>Waiting for host to start the game...</span>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t border-bingo-border/30 pt-4 flex justify-center">
        <Button
          onClick={leaveRoom}
          variant="outline"
          className="border-bingo-border text-bingo-border hover:bg-bingo-border/10"
        >
          Leave Room
        </Button>
      </CardFooter>
    </Card>
  );
};

export default WaitingRoom;
