
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
  const [showComputerBoard, setShowComputerBoard] = useState(false);
  
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

  // Show computer board only when game ends
  useEffect(() => {
    if (winner) {
      setShowComputerBoard(true);
    }
  }, [winner]);

  // Add effect to handle computer's turn
  useEffect(() => {
    // When it's the computer's turn and no winner yet, make a move
    if (currentTurn === "computer" && !winner && gameStarted) {
      // Add a small delay to make it feel more natural
      const timer = setTimeout(() => {
        console.log("Computer's turn - making a move");
        makeComputerMove();
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [currentTurn, winner, gameStarted]);

  const makeComputerMove = () => {
    // Get all unmarked numbers from computer's board
    const unmarkedIndices = computer.markedCells
      .map((marked, index) => (!marked ? index : -1))
      .filter(index => index !== -1);
    
    if (unmarkedIndices.length === 0) return;
    
    // Enhanced computer strategy:
    // 1. Check if there's a potential winning move
    // 2. If not, check if there's a move that blocks player from winning
    // 3. If neither, make a strategic move to complete lines
    
    let selectedIndex = -1;
    
    // First, simulate each move to find a winning move
    for (const index of unmarkedIndices) {
      const simulatedMarkedCells = [...computer.markedCells];
      simulatedMarkedCells[index] = true;
      if (checkWin(simulatedMarkedCells) >= 5) {
        selectedIndex = index;
        break;
      }
    }
    
    // If no winning move, try to block player's potential win
    if (selectedIndex === -1) {
      const playerUnmarkedIndices = player.board.map((num, index) => 
        !player.markedCells[index] ? index : -1
      ).filter(index => index !== -1);
      
      for (const playerIndex of playerUnmarkedIndices) {
        const simulatedMarkedCells = [...player.markedCells];
        simulatedMarkedCells[playerIndex] = true;
        if (checkWin(simulatedMarkedCells) >= 4) { // Block if player is close to winning
          const numberToBlock = player.board[playerIndex];
          const computerIndex = computer.board.indexOf(numberToBlock);
          if (computerIndex !== -1 && !computer.markedCells[computerIndex]) {
            selectedIndex = computerIndex;
            break;
          }
        }
      }
    }
    
    // If no critical moves, choose a strategic position
    if (selectedIndex === -1) {
      // Prioritize moves that complete more lines
      let bestScore = -1;
      
      for (const index of unmarkedIndices) {
        const simulatedMarkedCells = [...computer.markedCells];
        simulatedMarkedCells[index] = true;
        const linesCompleted = checkWin(simulatedMarkedCells);
        
        if (linesCompleted > bestScore) {
          bestScore = linesCompleted;
          selectedIndex = index;
        }
      }
      
      // If still no good move, choose randomly
      if (selectedIndex === -1) {
        selectedIndex = unmarkedIndices[Math.floor(Math.random() * unmarkedIndices.length)];
      }
    }
    
    const selectedNumber = computer.board[selectedIndex];
    markNumber(selectedNumber);
  };

  const markNumber = (number: number) => {
    if (!gameStarted) return;
    
    console.log("Marking number:", number);
    
    // Update player's board
    const playerBoardIndex = player.board.indexOf(number);
    if (playerBoardIndex !== -1 && !player.markedCells[playerBoardIndex]) {
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
    if (computerBoardIndex !== -1 && !computer.markedCells[computerBoardIndex]) {
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
    if (currentTurn !== "player" || winner || !gameStarted) {
      console.log("Cannot make move:", { currentTurn, winner, gameStarted });
      return;
    }
    
    // Check if the cell is already marked
    if (player.markedCells[index]) {
      console.log("Cell already marked:", index);
      return;
    }
    
    console.log("Player clicked cell:", index, "with number:", player.board[index]);
    const selectedNumber = player.board[index];
    markNumber(selectedNumber);
  };

  const startNewGame = () => {
    const newPlayerBoard = generateBingoBoard();
    const newComputerBoard = generateBingoBoard();
    
    setPlayer({
      ...player,
      board: newPlayerBoard,
      markedCells: Array(25).fill(false),
      completedLines: 0
    });
    setComputer({
      ...computer,
      board: newComputerBoard,
      markedCells: Array(25).fill(false),
      completedLines: 0
    });
    setWinner(null);
    setGameStarted(true);
    setCurrentTurn("player");
    setShowComputerBoard(false);
    
    console.log("Game started with boards:", { 
      playerBoard: newPlayerBoard, 
      computerBoard: newComputerBoard 
    });
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
            <div>
              {winner && (
                <Button 
                  onClick={startNewGame}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Play Again
                </Button>
              )}
            </div>
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
          
          {showComputerBoard ? (
            <BingoBoard
              board={computer.board}
              markedCells={computer.markedCells}
              isCurrentPlayer={false}
              playerName={computerName}
              isWinner={winner?.id === computer.id}
            />
          ) : (
            <div className="flex items-center justify-center border-4 border-dashed border-bingo-border rounded-lg p-8 h-full">
              <div className="text-center">
                <Computer className="w-16 h-16 mx-auto mb-4 text-bingo-border opacity-50" />
                <h3 className="text-xl font-semibold text-bingo-text">Computer's board is hidden</h3>
                <p className="mt-2 text-sm text-gray-500">
                  The computer's board will be revealed when the game ends
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ComputerGame;
