
import React, { useState } from "react";
import { GameProvider, useGame } from "@/contexts/GameContext";
import RoomJoin from "@/components/RoomJoin";
import GameRoom from "@/components/GameRoom";
import ComputerGame from "@/components/ComputerGame";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Computer, Users, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Game: React.FC = () => {
  const { roomId, showBoardSelectionDialog } = useGame();

  // Don't show GameRoom while we're in board selection mode for joining a room
  const shouldShowGameRoom = roomId && !showBoardSelectionDialog;

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-b from-blue-50 to-purple-50">
      <h1 className="text-4xl font-bold text-center mb-8 text-bingo-border">
        Bingo Blitz
      </h1>
      
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
                    Play multiplayer mode with your friends locally. All players will use the same device.
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
