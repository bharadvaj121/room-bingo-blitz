
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
}

const BingoBoard: React.FC<BingoBoardProps> = ({ 
  board, 
  markedCells, 
  isCurrentPlayer, 
  playerName,
  isWinner = false
}) => {
  const { markCell, gameStatus, winner, lastClickedPlayer, lastClickedNumber } = useGame();

  const handleCellClick = (index: number) => {
    if (!isCurrentPlayer || gameStatus !== "playing") {
      console.log("Cell click prevented:", !isCurrentPlayer ? "Not current player" : "Game status is " + gameStatus);
      return;
    }
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
              ? "Your Board" 
              : `${playerName}'s Board`}
          {isPlayerWinner && <Trophy className="w-5 h-5" />}
        </span>
      </div>
      <div className={cn(
        "grid grid-cols-5 gap-1 sm:gap-2 p-4 rounded-lg border-4 relative",
        "bg-bingo-card border-bingo-border shadow-lg",
        isPlayerWinner && "border-red-600 shadow-red-400"
      )}>
        {isGameWon && <WinMessage isWinner={isPlayerWinner} />}
        
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
              "bingo-cell",
              markedCells[index] ? "marked" : "",
              (!isCurrentPlayer || gameStatus !== "playing") ? "disabled" : "",
              number === lastClickedNumber && "bg-bingo-accent/50"
            )}
            disabled={!isCurrentPlayer || markedCells[index] || gameStatus !== "playing"}
            onClick={() => handleCellClick(index)}
            aria-label={`Bingo cell ${number}`}
          >
            {number}
          </button>
        ))}
      </div>
    </div>
  );
};

export default BingoBoard;
