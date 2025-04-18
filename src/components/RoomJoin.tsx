
import React, { useState, useEffect } from "react";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, Copy, RefreshCw } from "lucide-react";

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
  const [inputError, setInputError] = useState("");
  const [availableRooms, setAvailableRooms] = useState<string[]>([]);
  const [showRoomsList, setShowRoomsList] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load available rooms on component mount and when refreshing
  useEffect(() => {
    loadAvailableRooms();
  }, []);

  const loadAvailableRooms = () => {
    setRefreshing(true);
    // List all local storage keys to find rooms
    const keys = Object.keys(localStorage);
    const roomKeys = keys.filter(key => key.startsWith('bingo-room-'));
    const roomIds = roomKeys.map(key => key.replace('bingo-room-', ''));
    
    // Get room data for each room to check if it's valid
    const validRooms = roomIds.filter(roomId => {
      try {
        const data = JSON.parse(localStorage.getItem(`bingo-room-${roomId}`) || '{}');
        return data && data.players && Array.isArray(data.players);
      } catch {
        return false;
      }
    });
    
    setAvailableRooms(validRooms);
    console.log("Available room keys:", roomKeys);
    setTimeout(() => setRefreshing(false), 500);
  };

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

  // Select a room from the list
  const selectRoom = (selectedRoomId: string) => {
    setLocalRoomId(selectedRoomId);
    setShowRoomsList(false);
  };

  // Copy room ID to clipboard
  const copyRoomId = (roomIdToCopy: string) => {
    navigator.clipboard.writeText(roomIdToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Room ID copied to clipboard");
  };

  // Only update the context roomId when joining
  const handleJoinRoom = () => {
    if (!localRoomId || !localRoomId.trim()) {
      setInputError("Please enter a room ID");
      toast.error("Please enter a room ID");
      return;
    }
    
    if (!playerName.trim()) {
      setInputError("Please enter your name");
      toast.error("Please enter your name");
      return;
    }
    
    // Check if room exists in localStorage
    const roomIdTrimmed = localRoomId.trim();
    const fullRoomKey = `bingo-room-${roomIdTrimmed}`;
    const gameStateStr = localStorage.getItem(fullRoomKey);
    
    console.log(`Attempting to join room with key: ${fullRoomKey}`);
    console.log(`Room data found: ${gameStateStr ? 'Yes' : 'No'}`);
    
    if (!gameStateStr) {
      setInputError("Room not found");
      console.error(`Room not found: ${fullRoomKey}`);
      toast.error(`Room ${roomIdTrimmed} not found`);
      return;
    }
    
    try {
      // Validate that the room data is proper JSON
      const gameState = JSON.parse(gameStateStr);
      console.log("Parsed game state:", gameState);
      
      if (!gameState || !gameState.players) {
        setInputError("Invalid room data");
        console.error("Invalid room data structure:", gameState);
        toast.error("Invalid room data");
        return;
      }
      
      console.log("Room found with players:", gameState.players.length);
      
      // Update context with valid room ID and call join function
      setInputError(""); // Clear any errors
      setRoomId(roomIdTrimmed);
      
      // Small delay to ensure roomId is set before joining
      setTimeout(() => {
        console.log("Joining room with ID:", roomIdTrimmed);
        joinRoom();
      }, 50);
      
      toast.success(`Joining room ${roomIdTrimmed}`);
    } catch (error) {
      console.error("Error parsing game state:", error);
      setInputError("Invalid room data");
      toast.error("Invalid room data");
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
                  className="text-lg font-semibold flex justify-between items-center text-bingo-text"
                >
                  <span>Room ID</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      loadAvailableRooms();
                      setShowRoomsList(prev => !prev);
                    }}
                    className="h-8 text-xs flex items-center gap-1 border-bingo-accent text-bingo-text"
                  >
                    {refreshing ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    {availableRooms.length > 0 ? `Show ${availableRooms.length} Rooms` : "Refresh Rooms"}
                  </Button>
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
                    disabled={!playerName.trim()}
                    className="bg-bingo-border hover:bg-bingo-border/80 text-white whitespace-nowrap"
                  >
                    Join Room
                  </Button>
                </div>
                {inputError && (
                  <p className="text-red-500 text-sm mt-1">{inputError}</p>
                )}

                {/* Available rooms dropdown */}
                {showRoomsList && availableRooms.length > 0 && (
                  <div className="mt-2 border-2 border-bingo-accent rounded-md bg-bingo-cardStripe2/50 max-h-40 overflow-y-auto">
                    <ul className="divide-y divide-bingo-accent/30">
                      {availableRooms.map(roomId => (
                        <li key={roomId} className="p-2 hover:bg-bingo-accent/20 cursor-pointer flex justify-between items-center">
                          <button 
                            type="button"
                            className="text-left w-full text-bingo-text font-medium"
                            onClick={() => selectRoom(roomId)}
                          >
                            {roomId}
                          </button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyRoomId(roomId);
                            }}
                            className="h-6 w-6 p-0"
                          >
                            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {showRoomsList && availableRooms.length === 0 && (
                  <p className="text-sm text-bingo-text mt-1">No active rooms found.</p>
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
