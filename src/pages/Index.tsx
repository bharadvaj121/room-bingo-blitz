
import React, { useState, useEffect } from "react";
import { GameProvider, useGame } from "@/contexts/GameContext";
import RoomJoin from "@/components/RoomJoin";
import GameRoom from "@/components/GameRoom";
import ComputerGame from "@/components/ComputerGame";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Computer, Users, Info, Wifi, WifiOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const Game: React.FC = () => {
  const { roomId, isManualMode, showBoardSelectionDialog, setOfflineMode, offlineMode } = useGame();
  const [isServerRunning, setIsServerRunning] = useState<boolean | null>(null);

  // Don't show GameRoom while we're in board selection mode for joining a room
  const shouldShowGameRoom = roomId && !showBoardSelectionDialog;

  // Check if the server is running on component mount
  useEffect(() => {
    if (!offlineMode) {
      const checkServer = async () => {
        try {
          const response = await fetch("http://localhost:3001/health", { 
            method: 'HEAD',
            timeout: 2000
          });
          setIsServerRunning(true);
        } catch (error) {
          console.error("Server connection error:", error);
          setIsServerRunning(false);
          // Auto-switch to offline mode if server isn't running
          setOfflineMode(true);
        }
      };
      
      checkServer();
    }
  }, [offlineMode, setOfflineMode]);

  const toggleOfflineMode = () => {
    setOfflineMode(!offlineMode);
  };

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-b from-blue-50 to-purple-50">
      <h1 className="text-4xl font-bold text-center mb-8 text-bingo-border">
        Bingo Blitz
      </h1>
      
      {!shouldShowGameRoom ? (
        <>
          <div className="flex justify-end max-w-4xl mx-auto mb-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="offline-mode" className="flex items-center gap-2">
                {offlineMode ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
                {offlineMode ? "Offline Mode (No server)" : "Online Mode"}
              </Label>
              <Switch
                id="offline-mode"
                checked={offlineMode}
                onCheckedChange={toggleOfflineMode}
              />
            </div>
          </div>
          
          {!offlineMode && isServerRunning === false && (
            <Alert className="w-full max-w-4xl mx-auto mb-4 bg-red-50 border-red-200">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Server is not running. Please start the server with <code>node server.js</code> or switch to offline mode.
              </AlertDescription>
            </Alert>
          )}
          
          {offlineMode && (
            <Alert className="w-full max-w-4xl mx-auto mb-4 bg-yellow-50 border-yellow-200">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Playing in offline mode. Multiplayer functionality is simulated locally.
              </AlertDescription>
            </Alert>
          )}
          
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
                    {offlineMode ? 
                      "Play multiplayer mode with your friends with simulated functionality (offline)." :
                      "Play multiplayer mode with your friends by sharing the Room ID."
                    }
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
