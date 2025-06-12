
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Computer, Users } from "lucide-react";
import ComputerGame from "@/components/ComputerGame";
import RoomJoin from "@/components/RoomJoin";

const Index = () => {
  const [gameMode, setGameMode] = useState<"select" | "computer" | "multiplayer">("select");

  if (gameMode === "computer") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bingo-card via-bingo-cardStripe1 to-bingo-cardStripe2 flex flex-col items-center justify-center p-4">
        <div className="mb-4">
          <Button 
            onClick={() => setGameMode("select")}
            variant="outline"
            className="border-bingo-border text-bingo-border hover:bg-bingo-border/10"
          >
            ← Back to Menu
          </Button>
        </div>
        <ComputerGame />
      </div>
    );
  }

  if (gameMode === "multiplayer") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bingo-card via-bingo-cardStripe1 to-bingo-cardStripe2 flex flex-col items-center justify-center p-4">
        <div className="mb-4">
          <Button 
            onClick={() => setGameMode("select")}
            variant="outline"
            className="border-bingo-border text-bingo-border hover:bg-bingo-border/10"
          >
            ← Back to Menu
          </Button>
        </div>
        <RoomJoin />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bingo-card via-bingo-cardStripe1 to-bingo-cardStripe2 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto">
        <Card className="border-bingo-border shadow-xl">
          <CardHeader className="text-center bg-gradient-to-br from-bingo-border to-bingo-border/70 text-white rounded-t-lg">
            <CardTitle className="text-5xl font-bold">BINGO!</CardTitle>
            <CardDescription className="text-white/80 text-xl">
              Choose your game mode
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-bingo-accent group"
                onClick={() => setGameMode("computer")}
              >
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                  <Computer className="w-16 h-16 mb-4 text-bingo-border group-hover:text-bingo-accent transition-colors" />
                  <h3 className="text-2xl font-bold text-bingo-text mb-2">Play with Computer</h3>
                  <p className="text-bingo-text/70 text-sm">
                    Practice your skills against an AI opponent
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-bingo-accent group"
                onClick={() => setGameMode("multiplayer")}
              >
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                  <Users className="w-16 h-16 mb-4 text-bingo-border group-hover:text-bingo-accent transition-colors" />
                  <h3 className="text-2xl font-bold text-bingo-text mb-2">Multiplayer</h3>
                  <p className="text-bingo-text/70 text-sm">
                    Play online with friends and family
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
