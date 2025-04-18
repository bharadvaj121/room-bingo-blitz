
import React from "react";
import { GameProvider, useGame } from "@/contexts/GameContext";
import RoomJoin from "@/components/RoomJoin";
import GameRoom from "@/components/GameRoom";
import ComputerGame from "@/components/ComputerGame";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Computer, Users } from "lucide-react";

const Game: React.FC = () => {
  const { roomId } = useGame();

  return (
    <div className="min-h-screen py-8 px-4">
      <h1 className="text-4xl font-bold text-center mb-8 text-bingo-border">
        Bingo Blitz
      </h1>
      
      {!roomId ? (
        <Tabs defaultValue="computer" className="w-full max-w-4xl mx-auto">
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
          </TabsContent>
        </Tabs>
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
