
import React from "react";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const ManualBoardSetup = () => {
  const { manualNumbers, addManualNumber, finishManualSetup } = useGame();
  
  // Generate numbers 1-25
  const numbers = Array.from({ length: 25 }, (_, i) => i + 1);
  
  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="bg-bingo-card border-4 border-bingo-border shadow-lg p-4">
        <h2 className="text-xl font-bold mb-4 text-center">
          Create Your Bingo Board
        </h2>
        <p className="text-sm mb-4 text-center">
          Select {25 - manualNumbers.length} more numbers to complete your board
        </p>
        <div className="grid grid-cols-5 gap-2">
          {numbers.map((num) => (
            <button
              key={num}
              onClick={() => addManualNumber(num)}
              disabled={manualNumbers.includes(num)}
              className={`w-12 h-12 flex items-center justify-center rounded-md text-lg font-semibold transition-all 
                ${manualNumbers.includes(num) 
                  ? "bg-bingo-accent/40 text-gray-400 cursor-not-allowed" 
                  : "bg-bingo-cardStripe1 hover:bg-bingo-cardStripe2 text-bingo-text cursor-pointer"
                }`}
            >
              {num}
            </button>
          ))}
        </div>
        <div className="mt-6 flex justify-center">
          <Button
            onClick={finishManualSetup}
            disabled={manualNumbers.length !== 25}
            className="bg-bingo-border hover:bg-bingo-border/80 text-white"
          >
            Create My Board
          </Button>
        </div>
        <div className="mt-3 text-xs text-center opacity-70">
          Selected: {manualNumbers.length}/25 numbers
        </div>
      </Card>
    </div>
  );
};

export default ManualBoardSetup;
