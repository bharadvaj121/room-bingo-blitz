
import React from "react";
import { useGame } from "@/contexts/GameContext";
import { cn } from "@/lib/utils";
import WinMessage from "./WinMessage";
import { Trophy } from "lucide-react";

interface BingoBoardProps {
  board: number[];
  markedCells: boolean[];
  isCurrentPlayer: boolean;
  playerName: string;
  isWinner?: boolean;
  onCellClick?: (index: number) => void;
}

const BingoBoard: React.FC<BingoBoardProps> = ({ 
  board, 
  markedCells, 
  isCurrentPlayer, 
  playerName,
  isWinner = false,
  onCellClick
}) => {
  const { gameStatus, winner } = useGame();

  const handleCellClick = (index: number) => {
    // Log click for debugging
    console.log("Cell clicked in BingoBoard:", index, "isCurrentPlayer:", isCurrentPlayer, "gameStatus:", gameStatus);
    
    if (markedCells[index]) {
      console.log("Cell already marked:", index);
      return; // Don't process clicks on already marked cells
    }
    
    if (onCellClick) {
      // For computer game mode or custom click handler
      console.log("Using custom onCellClick handler");
      onCellClick(index);
      return;
    }
    
    // Only current player should be able to mark cells in multiplayer mode
    if (!isCurrentPlayer) {
      console.log("Not current player's turn");
      return;
    }
    
    // Only allow marking cells if the game is in playing status
    if (gameStatus !== "playing") {
      console.log("Game not in playing state");
      return;
    }
    
    console.log("Marking cell in game context");
    // Mark the cell in the game context (for multiplayer)
    // markCell(index);
  };

  const isGameWon = gameStatus === "finished" && winner !== null;
  const isPlayerWinner = isGameWon && isWinner;

  return (
    <div className={cn(
      "relative",
      isPlayerWinner && "order-first" // Winner board will be ordered first
    )}>
      <div className="mb-2 text-center font-bold">
        <span className={cn(
          isPlayerWinner 
            ? "text-2xl text-red-600 animate-flash flex items-center justify-center gap-2"
            : isCurrentPlayer 
              ? "text-bingo-border text-xl" 
              : "text-bingo-text text-xl"
        )}>
          {isPlayerWinner && <Trophy className="w-5 h-5" />}
          {isPlayerWinner 
            ? `🏆 WINNER: ${playerName} 🏆` 
            : isCurrentPlayer 
              ? `Your Turn - ${playerName}` 
              : `${playerName}'s Board`}
          {isPlayerWinner && <Trophy className="w-5 h-5" />}
        </span>
      </div>
      <div className={cn(
        "grid grid-cols-5 gap-1 sm:gap-2 p-4 rounded-lg border-4 relative",
        "bg-bingo-card border-bingo-border shadow-lg",
        isPlayerWinner && "border-red-600 shadow-red-400",
        isCurrentPlayer && !isPlayerWinner && "border-green-500"
      )}>
        {isGameWon && <WinMessage isWinner={isPlayerWinner} />}
        
        {/* Current player turn indicator */}
        {isCurrentPlayer && gameStatus === "playing" && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none animate-fade-out">
            <div className="text-xl sm:text-2xl font-bold text-center px-4 py-2 rounded-lg 
                        bg-green-500/70 text-white transform rotate-[-10deg] animate-bounce-once">
              Your Turn! Click a number
            </div>
          </div>
        )}
        
        {board.map((number, index) => (
          <button
            key={index}
            className={cn(
              "bingo-cell relative",
              markedCells[index] ? "marked" : ""
            )}
            disabled={false} // Remove the disabled attribute to allow clicking
            onClick={() => handleCellClick(index)}
            aria-label={`Bingo cell ${number}`}
          >
            {number}
            {/* Red diagonal line for marked cells */}
            {markedCells[index] && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 bottom-0 overflow-hidden">
                  <div className="absolute top-0 left-0 w-[140%] h-0.5 bg-red-600 origin-top-left transform rotate-45 translate-y-1/2"></div>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default BingoBoard;
