
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import BingoBoard from "./BingoBoard";
import { generateBingoBoard, checkWin } from "@/lib/bingo";
import { toast } from "sonner";
import { Computer } from "lucide-react";

type Player = {
  id: string;
  name: string;
  board: number[];
  markedCells: boolean[];
  completedLines: number;
};

const ComputerGame = () => {
  const [playerName, setPlayerName] = useState("Player");
  const [computerName] = useState("Computer");
  const [gameStarted, setGameStarted] = useState(false);
  const [currentTurn, setCurrentTurn] = useState<"player" | "computer">("player");
  const [winner, setWinner] = useState<Player | null>(null);
  
  const [player, setPlayer] = useState<Player>({
    id: "player1",
    name: playerName,
    board: generateBingoBoard(),
    markedCells: Array(25).fill(false),
    completedLines: 0
  });
  
  const [computer, setComputer] = useState<Player>({
    id: "computer",
    name: computerName,
    board: generateBingoBoard(),
    markedCells: Array(25).fill(false),
    completedLines: 0
  });

  // Computer's turn logic
  useEffect(() => {
    if (gameStarted && currentTurn === "computer" && !winner) {
      const delay = setTimeout(() => {
        makeComputerMove();
      }, 1000);
      
      return () => clearTimeout(delay);
    }
  }, [currentTurn, gameStarted, winner]);

  const makeComputerMove = () => {
    // Get all unmarked numbers from computer's board
    const unmarkedIndices = computer.markedCells
      .map((marked, index) => (!marked ? index : -1))
      .filter(index => index !== -1);
    
    if (unmarkedIndices.length === 0) return;
    
    // Randomly select one of the unmarked numbers
    const randomIndex = unmarkedIndices[Math.floor(Math.random() * unmarkedIndices.length)];
    const selectedNumber = computer.board[randomIndex];
    
    // Mark the number on both boards
    markNumber(selectedNumber);
  };

  const markNumber = (number: number) => {
    // Update player's board
    const playerBoardIndex = player.board.indexOf(number);
    if (playerBoardIndex !== -1) {
      const newPlayerMarkedCells = [...player.markedCells];
      newPlayerMarkedCells[playerBoardIndex] = true;
      const playerCompletedLines = checkWin(newPlayerMarkedCells);
      
      setPlayer(prev => ({
        ...prev,
        markedCells: newPlayerMarkedCells,
        completedLines: playerCompletedLines
      }));

      if (playerCompletedLines >= 5) {
        setWinner(player);
        toast.success("You won! 🎉");
        return;
      }
    }

    // Update computer's board
    const computerBoardIndex = computer.board.indexOf(number);
    if (computerBoardIndex !== -1) {
      const newComputerMarkedCells = [...computer.markedCells];
      newComputerMarkedCells[computerBoardIndex] = true;
      const computerCompletedLines = checkWin(newComputerMarkedCells);
      
      setComputer(prev => ({
        ...prev,
        markedCells: newComputerMarkedCells,
        completedLines: computerCompletedLines
      }));

      if (computerCompletedLines >= 5) {
        setWinner(computer);
        toast.success("Computer won! Better luck next time!");
        return;
      }
    }

    // Switch turns
    setCurrentTurn(currentTurn === "player" ? "computer" : "player");
  };

  const handlePlayerMove = (index: number) => {
    if (currentTurn !== "player" || winner) return;
    markNumber(player.board[index]);
  };

  const startNewGame = () => {
    setPlayer({
      ...player,
      board: generateBingoBoard(),
      markedCells: Array(25).fill(false),
      completedLines: 0
    });
    setComputer({
      ...computer,
      board: generateBingoBoard(),
      markedCells: Array(25).fill(false),
      completedLines: 0
    });
    setWinner(null);
    setGameStarted(true);
    setCurrentTurn("player");
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="p-4 bg-bingo-card border-2 border-bingo-border rounded-lg shadow mb-6">
        {!gameStarted ? (
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold text-bingo-text">Play Against Computer</h2>
            <Button 
              onClick={startNewGame}
              className="bg-bingo-border hover:bg-bingo-border/80 text-white"
            >
              Start Game
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 className="text-xl font-bold">Game in Progress</h2>
              <p className="text-sm">
                Current Turn: {currentTurn === "player" ? playerName : computerName}
              </p>
            </div>
            {winner ? (
              <Button 
                onClick={startNewGame}
                className="bg-green-600 hover:bg-green-700"
              >
                Play Again
              </Button>
            ) : (
              <Button 
                variant="outline"
                disabled
                className="border-bingo-border text-bingo-border"
              >
                {currentTurn === "player" ? "Your Turn" : "Computer's Turn..."}
              </Button>
            )}
          </div>
        )}
      </div>

      {gameStarted && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BingoBoard
            board={player.board}
            markedCells={player.markedCells}
            isCurrentPlayer={currentTurn === "player"}
            playerName={playerName}
            isWinner={winner?.id === player.id}
            onCellClick={handlePlayerMove}
          />
          <BingoBoard
            board={computer.board}
            markedCells={computer.markedCells}
            isCurrentPlayer={false}
            playerName={computerName}
            isWinner={winner?.id === computer.id}
          />
        </div>
      )}
    </div>
  );
};

export default ComputerGame;
