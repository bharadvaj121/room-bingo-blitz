
import React, { useState, useEffect } from "react";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { RefreshCw, Copy, Wifi, WifiOff } from "lucide-react";

const RoomJoin: React.FC = () => {
  const { 
    playerName, 
    roomId, 
    setPlayerName, 
    setRoomId, 
    createRoom, 
    joinRoom,
    showBoardSelectionDialog,
    completeJoinRoom,
    serverStatus
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

  // Handle creating a room
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
      
      // Set the room ID in context
      setRoomId(newRoomId);
      
      // Create room
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
    
    const trimmedRoomId = localRoomId.trim().toUpperCase();
    console.log("Attempting to join room with ID:", trimmedRoomId);
    
    try {
      setIsLoading(true);
      
      // Set the room ID in context
      setRoomId(trimmedRoomId);
      
      // Join room - this will now show the board selection dialog
      joinRoom();
      
      toast.success("Room joined successfully!");
    } catch (error) {
      console.error("Error joining room:", error);
      setInputError("Failed to join room");
      toast.error("Failed to join room. Please try again.");
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

  // Determine if we're in online or offline mode
  const isOnlineMode = serverStatus === "online";

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="bg-bingo-card border-4 border-bingo-border shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-3xl font-bold text-center text-bingo-text">
            Bingo Blitz
          </CardTitle>
          <div className="flex justify-center">
            {isOnlineMode ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <Wifi className="w-3 h-3 mr-1" />
                Online Mode
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <WifiOff className="w-3 h-3 mr-1" />
                Local Mode
              </span>
            )}
          </div>
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

              {/* Board Selection Dialog for Joining a Room */}
              <Dialog open={showBoardSelectionDialog} onOpenChange={() => {}}>
                <DialogContent className="bg-bingo-card border-2 border-bingo-border">
                  <DialogHeader>
                    <DialogTitle className="text-bingo-border text-xl">Choose Your Board Setup</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col sm:flex-row gap-4 py-4">
                    <Button 
                      onClick={() => completeJoinRoom(false)}
                      className="flex-1 bg-bingo-accent hover:bg-bingo-accent/80 text-bingo-text"
                    >
                      Random Numbers
                    </Button>
                    <Button 
                      onClick={() => completeJoinRoom(true)}
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
            {isOnlineMode 
              ? "Join an online multiplayer game with your friends!"
              : "Join a local multiplayer game with friends on this device!"}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RoomJoin;
