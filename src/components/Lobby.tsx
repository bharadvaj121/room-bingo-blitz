
import React, { useState } from "react";
import { useSocket } from "@/contexts/SocketContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Lobby: React.FC = () => {
  const { createRoom, joinRoom } = useSocket();
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [activeTab, setActiveTab] = useState("join");

  const handleCreateRoom = () => {
    if (!playerName.trim()) return;
    createRoom(playerName.trim());
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || !roomCode.trim()) return;
    joinRoom(roomCode.trim(), playerName.trim());
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <Card className="border-bingo-border shadow-xl">
        <CardHeader className="text-center bg-gradient-to-br from-bingo-border to-bingo-border/70 text-white rounded-t-lg">
          <CardTitle className="text-4xl font-bold">BINGO!</CardTitle>
          <CardDescription className="text-white/80 text-lg">
            Play multiplayer bingo online
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-4">
            <Label htmlFor="playerName">Your Name</Label>
            <Input
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="mt-1"
            />
          </div>

          <Tabs defaultValue="join" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="join">Join Game</TabsTrigger>
              <TabsTrigger value="create">Create Game</TabsTrigger>
            </TabsList>

            <TabsContent value="join" className="space-y-4">
              <div>
                <Label htmlFor="roomCode">Room Code</Label>
                <Input
                  id="roomCode"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Enter room code"
                  className="mt-1"
                  maxLength={6}
                />
              </div>
              <Button 
                onClick={handleJoinRoom} 
                disabled={!playerName.trim() || !roomCode.trim()}
                className="w-full bg-bingo-border hover:bg-bingo-border/80"
              >
                Join Game
              </Button>
            </TabsContent>

            <TabsContent value="create" className="space-y-4">
              <p className="text-sm text-gray-500">
                Create a new game room and invite your friends to join using the room code.
              </p>
              <Button 
                onClick={handleCreateRoom} 
                disabled={!playerName.trim()}
                className="w-full bg-bingo-accent hover:bg-bingo-accent/80"
              >
                Create Game Room
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center text-xs text-gray-400">
          Multiplayer Bingo Game &copy; 2025
        </CardFooter>
      </Card>
    </div>
  );
};

export default Lobby;
