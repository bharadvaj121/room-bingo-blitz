
import React from "react";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const ManualBoardSetup = () => {
  const { manualNumbers, addManualNumber, finishManualSetup } = useGame();
  
  // Generate numbers 1-25
  const numbers = Array.from({ length: 25 }, (_, i) => i + 1);
  
  // Calculate progress percentage
  const progressPercentage = (manualNumbers.length / 25) * 100;
  
  // Handle number selection
  const handleNumberClick = (num: number) => {
    if (manualNumbers.includes(num)) return;
    addManualNumber(num);
  };

  // Handle board creation
  const handleCreateBoard = () => {
    if (manualNumbers.length === 25) {
      finishManualSetup();
    }
  };
  
  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="bg-bingo-card border-4 border-bingo-border shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-center text-bingo-border">
          Create Your Bingo Board
        </h2>
        
        <div className="mb-6">
          <Progress value={progressPercentage} className="h-2 bg-gray-200" />
          <p className="text-sm mt-2 text-center font-medium">
            Selected {manualNumbers.length}/25 numbers
            {manualNumbers.length < 25 && (
              <span className="ml-1 text-bingo-border">
                (Select {25 - manualNumbers.length} more)
              </span>
            )}
          </p>
        </div>
        
        <div className="grid grid-cols-5 gap-3">
          {numbers.map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num)}
              disabled={manualNumbers.includes(num)}
              className={`w-12 h-12 flex items-center justify-center rounded-md text-lg font-semibold transition-all 
                ${manualNumbers.includes(num) 
                  ? "bg-bingo-border/40 text-white cursor-not-allowed" 
                  : "bg-bingo-cardStripe1 hover:bg-bingo-cardStripe2 hover:shadow-md text-bingo-text cursor-pointer border border-bingo-accent"
                }`}
            >
              {num}
            </button>
          ))}
        </div>
        
        <div className="mt-8 flex justify-center">
          <Button
            onClick={handleCreateBoard}
            disabled={manualNumbers.length !== 25}
            size="lg"
            className={`bg-bingo-border hover:bg-bingo-border/80 text-white font-bold ${
              manualNumbers.length === 25 ? 'animate-pulse' : 'opacity-50'
            }`}
          >
            {manualNumbers.length === 25 ? 'Create My Board' : 'Select All 25 Numbers First'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ManualBoardSetup;
