
import React, { useState, useEffect } from "react";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { RefreshCw, Copy } from "lucide-react";
import axios from "axios";

const API_URL = "http://localhost:4000";

const RoomJoin: React.FC = () => {
  const { 
    playerName, 
    roomId, 
    setPlayerName, 
    setRoomId, 
    createRoom, 
    joinRoom,
    setServerConnected 
  } = useGame();
  
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [localRoomId, setLocalRoomId] = useState("");
  const [inputError, setInputError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // When roomId from context changes, update localRoomId
  useEffect(() => {
    if (roomId) {
      console.log("Room ID updated from context:", roomId);
      setLocalRoomId(roomId);
    }
  }, [roomId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Prevent form submission - we'll handle actions via buttons
  };

  // Safely handle room ID changes
  const handleRoomIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalRoomId(e.target.value);
    // Clear error when user starts typing
    if (inputError) setInputError("");
  };

  // Handle creating a room with server
  const handleCreateRoom = async (isManual: boolean) => {
    if (!playerName || playerName.trim() === "") {
      setInputError("Please enter your name");
      toast.error("Please enter your name");
      return;
    }

    try {
      setIsLoading(true);
      // Generate a random room ID
      const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Create room on server
      const response = await axios.post(`${API_URL}/api/room`, {
        roomCode: newRoomId,
        username: playerName.trim()
      });

      console.log("Room created:", response.data);
      
      // Set the room ID in context
      setRoomId(newRoomId);
      setServerConnected(true);
      
      // Create room locally
      createRoom(isManual);
      setShowCreateOptions(false);
      
      toast.success("Room created successfully!");
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error("Failed to create room. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle joining a room with proper error validation
  const handleJoinRoom = async () => {
    // Clear any existing errors first
    setInputError("");
    
    if (!playerName || playerName.trim() === "") {
      setInputError("Please enter your name");
      toast.error("Please enter your name");
      return;
    }
    
    if (!localRoomId || localRoomId.trim() === "") {
      setInputError("Please enter a room ID");
      toast.error("Please enter a room ID");
      return;
    }
    
    const trimmedRoomId = localRoomId.trim();
    console.log("Attempting to join room with ID:", trimmedRoomId);
    
    try {
      setIsLoading(true);
      
      // Join room on server
      const response = await axios.post(`${API_URL}/api/room`, {
        roomCode: trimmedRoomId,
        username: playerName.trim()
      });
      
      console.log("Room joined:", response.data);
      
      // Set the room ID in context
      setRoomId(trimmedRoomId);
      setServerConnected(true);
      
      // Join room locally
      joinRoom();
      
      toast.success("Room joined successfully!");
    } catch (error: any) {
      console.error("Error joining room:", error);
      if (error.response && error.response.status === 400) {
        toast.error("Room is full. Please join another room.");
      } else {
        toast.error("Failed to join room. Please check if the room ID is correct.");
      }
      setInputError("Failed to join room");
    } finally {
      setIsLoading(false);
    }
  };
  
  const copyRoomIdToClipboard = () => {
    if (!roomId) return;
    
    navigator.clipboard.writeText(roomId)
      .then(() => toast.success("Room ID copied to clipboard!"))
      .catch(err => console.error("Failed to copy room ID:", err));
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
                disabled={isLoading}
              />
            </div>

            {roomId && (
              <div className="bg-bingo-border/10 p-3 rounded-md flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-bingo-text">Your Room ID:</p>
                  <p className="text-xl font-bold text-bingo-border">{roomId}</p>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="border-bingo-border text-bingo-border" 
                  onClick={copyRoomIdToClipboard}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
            )}

            <Separator className="my-4 bg-bingo-accent/50" />

            <div className="space-y-3">
              <Dialog open={showCreateOptions} onOpenChange={setShowCreateOptions}>
                <DialogTrigger asChild>
                  <Button 
                    type="button"
                    disabled={!playerName.trim() || isLoading}
                    className="w-full bg-bingo-border hover:bg-bingo-border/80 text-white"
                  >
                    {isLoading ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Create New Room
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-bingo-card border-2 border-bingo-border">
                  <DialogHeader>
                    <DialogTitle className="text-bingo-border text-xl">Choose Board Setup</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col sm:flex-row gap-4 py-4">
                    <Button 
                      onClick={() => handleCreateRoom(false)}
                      className="flex-1 bg-bingo-accent hover:bg-bingo-accent/80 text-bingo-text"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Random Numbers
                    </Button>
                    <Button 
                      onClick={() => handleCreateRoom(true)}
                      className="flex-1 bg-bingo-border hover:bg-bingo-border/80 text-white"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Manual Setup
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="text-center text-sm font-medium text-bingo-text">OR</div>

              <div className="space-y-2">
                <label 
                  htmlFor="roomId" 
                  className="text-lg font-semibold flex justify-between items-center text-bingo-text"
                >
                  <span>Room ID</span>
                </label>
                <div className="flex space-x-2">
                  <Input
                    id="roomId"
                    value={localRoomId}
                    onChange={handleRoomIdChange}
                    placeholder="Enter room ID"
                    className="border-2 border-bingo-accent bg-bingo-cardStripe2/50"
                    disabled={isLoading}
                  />
                  <Button 
                    type="button" 
                    onClick={handleJoinRoom}
                    disabled={!playerName.trim() || isLoading}
                    className="bg-bingo-border hover:bg-bingo-border/80 text-white whitespace-nowrap"
                  >
                    {isLoading ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Join Room
                  </Button>
                </div>
                {inputError && (
                  <p className="text-red-500 text-sm mt-1">{inputError}</p>
                )}
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
