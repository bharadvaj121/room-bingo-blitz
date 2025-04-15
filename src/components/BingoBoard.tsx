
import React from "react";
import { useGame } from "@/contexts/GameContext";
import { cn } from "@/lib/utils";
import WinMessage from "./WinMessage";

interface BingoBoardProps {
  board: number[];
  markedCells: boolean[];
  isCurrentPlayer: boolean;
  playerName: string;
}

const BingoBoard: React.FC<BingoBoardProps> = ({ 
  board, 
  markedCells, 
  isCurrentPlayer, 
  playerName 
}) => {
  const { markCell, gameStatus, winner } = useGame();

  const handleCellClick = (index: number) => {
    if (!isCurrentPlayer || gameStatus !== "playing") {
      console.log("Cell click prevented:", !isCurrentPlayer ? "Not current player" : "Game status is " + gameStatus);
      return;
    }
    markCell(index);
  };

  const isGameWon = gameStatus === "finished" && winner !== null;
  const isWinner = isGameWon && isCurrentPlayer;

  return (
    <div className="relative">
      <div className="mb-2 text-center font-bold">
        <span className={cn(
          isCurrentPlayer ? "text-bingo-border" : "text-bingo-text",
          "text-xl"
        )}>
          {isCurrentPlayer ? "Your Board" : `${playerName}'s Board`}
        </span>
      </div>
      <div className={cn(
        "grid grid-cols-5 gap-1 sm:gap-2 p-4 rounded-lg border-4 relative",
        "bg-bingo-card border-bingo-border shadow-lg"
      )}>
        {isGameWon && <WinMessage isWinner={isWinner} />}
        
        {board.map((number, index) => (
          <button
            key={index}
            className={cn(
              "bingo-cell",
              markedCells[index] ? "marked" : "",
              (!isCurrentPlayer || gameStatus !== "playing") ? "disabled" : ""
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
