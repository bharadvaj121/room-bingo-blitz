
import React from "react";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const RoomJoin: React.FC = () => {
  const { 
    playerName, 
    roomId, 
    setPlayerName, 
    setRoomId, 
    createRoom, 
    joinRoom 
  } = useGame();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="bg-bingo-card border-4 border-bingo-border shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-3xl font-bold text-center text-bingo-text">
            Bingo Blitz
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label 
                htmlFor="playerName" 
                className="text-lg font-semibold text-bingo-text"
              >
                Your Name
              </label>
              <Input
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="border-2 border-bingo-accent bg-bingo-cardStripe2/50"
                required
              />
            </div>

            <Separator className="my-4 bg-bingo-accent/50" />

            <div className="space-y-3">
              <div className="flex justify-center">
                <Button 
                  type="button" 
                  onClick={createRoom}
                  className="w-full bg-bingo-border hover:bg-bingo-border/80 text-white"
                >
                  Create New Room
                </Button>
              </div>

              <div className="text-center text-sm font-medium text-bingo-text">OR</div>

              <div className="space-y-2">
                <label 
                  htmlFor="roomId" 
                  className="text-lg font-semibold text-bingo-text"
                >
                  Room ID
                </label>
                <div className="flex space-x-2">
                  <Input
                    id="roomId"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="Enter room ID"
                    className="border-2 border-bingo-accent bg-bingo-cardStripe2/50"
                  />
                  <Button 
                    type="button" 
                    onClick={joinRoom}
                    className="bg-bingo-border hover:bg-bingo-border/80 text-white whitespace-nowrap"
                  >
                    Join Room
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="pt-0 opacity-70 text-xs text-center justify-center">
          <p>
            Join a multiplayer bingo game with friends!
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RoomJoin;
