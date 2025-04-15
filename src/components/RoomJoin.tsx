
import React, { useState, useEffect } from "react";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const RoomJoin: React.FC = () => {
  const { 
    playerName, 
    roomId, 
    setPlayerName, 
    setRoomId, 
    createRoom, 
    joinRoom 
  } = useGame();
  
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [localRoomId, setLocalRoomId] = useState("");

  // When roomId from context changes, update localRoomId
  useEffect(() => {
    if (roomId) {
      setLocalRoomId(roomId);
    }
  }, [roomId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  // Safely handle room ID changes
  const handleRoomIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalRoomId(e.target.value);
  };

  // Only update the context roomId when joining
  const handleJoinRoom = () => {
    if (localRoomId && localRoomId.trim()) {
      setRoomId(localRoomId);
      joinRoom();
    }
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
              <Dialog open={showCreateOptions} onOpenChange={setShowCreateOptions}>
                <DialogTrigger asChild>
                  <Button 
                    type="button"
                    disabled={!playerName.trim()}
                    className="w-full bg-bingo-border hover:bg-bingo-border/80 text-white"
                  >
                    Create New Room
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-bingo-card border-2 border-bingo-border">
                  <DialogHeader>
                    <DialogTitle className="text-bingo-border text-xl">Choose Board Setup</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col sm:flex-row gap-4 py-4">
                    <Button 
                      onClick={() => {
                        createRoom(false); 
                        setShowCreateOptions(false);
                      }}
                      className="flex-1 bg-bingo-accent hover:bg-bingo-accent/80 text-bingo-text"
                    >
                      Random Numbers
                    </Button>
                    <Button 
                      onClick={() => {
                        createRoom(true);
                        setShowCreateOptions(false);
                      }}
                      className="flex-1 bg-bingo-border hover:bg-bingo-border/80 text-white"
                    >
                      Manual Setup
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

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
                    value={localRoomId}
                    onChange={handleRoomIdChange}
                    placeholder="Enter room ID"
                    className="border-2 border-bingo-accent bg-bingo-cardStripe2/50"
                  />
                  <Button 
                    type="button" 
                    onClick={handleJoinRoom}
                    disabled={!localRoomId?.trim() || !playerName.trim()}
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
