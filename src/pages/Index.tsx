
import React, { useState, useEffect } from "react";
import { GameProvider, useGame } from "@/contexts/GameContext";
import RoomJoin from "@/components/RoomJoin";
import GameRoom from "@/components/GameRoom";
import ComputerGame from "@/components/ComputerGame";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Computer, Users, Info, Wifi, WifiOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const Game: React.FC = () => {
  const { roomId, showBoardSelectionDialog, serverStatus, checkServerStatus } = useGame();
  const [isServerOnline, setIsServerOnline] = useState<boolean | null>(null);

  // Check server status on component mount
  useEffect(() => {
    checkServerStatus()
      .then(online => {
        setIsServerOnline(online);
        if (!online) {
          toast.error("Failed to connect to game server. Please ensure the server is running.");
        }
      });
  }, [checkServerStatus]);

  // Don't show GameRoom while we're in board selection mode for joining a room
  const shouldShowGameRoom = roomId && !showBoardSelectionDialog;

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-b from-blue-50 to-purple-50">
      <h1 className="text-4xl font-bold text-center mb-2 text-bingo-border">
        Bingo Blitz
      </h1>
      
      <div className="flex items-center justify-center mb-6">
        {isServerOnline === null ? (
          <Badge variant="outline" className="flex items-center gap-1">
            <span className="block w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span> 
            Checking Server...
          </Badge>
        ) : isServerOnline ? (
          <Badge variant="outline" className="bg-green-100 text-green-800 flex items-center gap-1">
            <Wifi className="w-3 h-3" /> Online Mode
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-red-100 text-red-800 flex items-center gap-1">
            <WifiOff className="w-3 h-3" /> Server Offline
          </Badge>
        )}
      </div>
      
      {!shouldShowGameRoom ? (
        <>
          <Tabs defaultValue="multiplayer" className="w-full max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="computer" className="flex gap-2 items-center">
                <Computer className="w-4 h-4" />
                Play with Computer
              </TabsTrigger>
              <TabsTrigger value="multiplayer" className="flex gap-2 items-center">
                <Users className="w-4 h-4" />
                Multiplayer
              </TabsTrigger>
            </TabsList>
            <TabsContent value="computer">
              <ComputerGame />
            </TabsContent>
            <TabsContent value="multiplayer">
              <RoomJoin />
              <div className="mt-4">
                <Alert className="bg-yellow-50 border-yellow-200">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {isServerOnline 
                      ? "Play online multiplayer with your friends! Share the Room ID with them to join the same game."
                      : "Server is offline. All players must use the same device to play in local multiplayer mode."}
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <GameRoom />
      )}
    </div>
  );
};

const Index: React.FC = () => {
  return (
    <GameProvider>
      <Game />
    </GameProvider>
  );
};

export default Index;
