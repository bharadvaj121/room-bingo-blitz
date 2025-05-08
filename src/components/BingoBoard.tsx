
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
  onCellClick?: (number: number) => void;
}

const BingoBoard: React.FC<BingoBoardProps> = ({ 
  board, 
  markedCells, 
  isCurrentPlayer, 
  playerName,
  isWinner = false,
  onCellClick
}) => {
  const { markCell, gameStatus, winner, lastClickedPlayer, lastClickedNumber } = useGame();

  const handleCellClick = (index: number) => {
    console.log("Cell clicked in BingoBoard:", index, "onCellClick function:", !!onCellClick);
    
    if (onCellClick) {
      // For computer game mode or custom click handler
      onCellClick(index);
      return;
    }
    
    // Only for multiplayer mode
    if (markedCells[index]) {
      // Cell already marked
      return;
    }
    
    // Mark the cell in the game context (for multiplayer)
    markCell(index);
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
        
        {/* Show last clicked player name if available */}
        {lastClickedPlayer && lastClickedNumber && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none animate-fade-out">
            <div className="text-xl sm:text-2xl font-bold text-center px-4 py-2 rounded-lg 
                        bg-bingo-accent/70 transform rotate-[-10deg] animate-bounce-once">
              {lastClickedPlayer} clicked {lastClickedNumber}!
            </div>
          </div>
        )}
        
        {board.map((number, index) => (
          <button
            key={index}
            className={cn(
              "bingo-cell relative",
              markedCells[index] ? "marked" : "",
              (markedCells[index] || (!isCurrentPlayer && gameStatus !== "playing" && !onCellClick)) ? "disabled" : "",
              number === lastClickedNumber && "bg-bingo-accent/50"
            )}
            disabled={markedCells[index] || ((!isCurrentPlayer || gameStatus !== "playing") && !onCellClick)}
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
