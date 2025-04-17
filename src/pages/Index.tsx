
import React, { useState } from "react";
import { GameProvider, useGame } from "@/contexts/GameContext";
import RoomJoin from "@/components/RoomJoin";
import BingoBoard from "@/components/BingoBoard";
import ManualBoardSetup from "@/components/ManualBoardSetup";
import { Button } from "@/components/ui/button";
import { RefreshCw, User, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";

const GameRoom: React.FC = () => {
  const { 
    roomId, 
    players, 
    currentPlayer, 
    gameStatus, 
    winner,
    isManualMode,
    leaveRoom,
    resetGame,
    createRoom
  } = useGame();
  
  const [showResetOptions, setShowResetOptions] = useState(false);

  if (!roomId) return null;

  // If in manual mode, show the manual setup screen
  if (isManualMode) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="p-4 bg-bingo-card border-2 border-bingo-border rounded-lg shadow mb-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 className="text-xl font-bold">Room: {roomId}</h2>
            </div>
            <Button 
              onClick={leaveRoom}
              variant="outline"
              className="border-bingo-border text-bingo-border hover:bg-bingo-border/10"
            >
              Cancel & Leave Room
            </Button>
          </div>
        </div>
        <ManualBoardSetup />
      </div>
    );
  }

  // If not in manual mode but no current player, return null
  if (!currentPlayer) return null;
  
  const handlePlayAgain = () => {
    setShowResetOptions(true);
  };
  
  const handleResetOption = (isManual: boolean) => {
    resetGame();
    createRoom(isManual);
    setShowResetOptions(false);
  };
  
  // Calculate if room is full (5 members max)
  const isRoomFull = players.length >= 5;

  // Otherwise, show the game room
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="p-4 bg-bingo-card border-2 border-bingo-border rounded-lg shadow mb-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-bold">Room: {roomId}</h2>
            <p className="text-sm flex items-center gap-1">
              <Users className="w-4 h-4" />
              Players: {players.length}/5 
              {isRoomFull && <span className="text-red-500 font-bold">(Full)</span>}
            </p>
          </div>
          <div>
            <p className="text-sm">
              Status: <span className="font-semibold">{gameStatus === "playing" ? "Game in progress" : "Game finished"}</span>
            </p>
            {winner && (
              <p className="text-sm">
                Winner: <span className="font-semibold text-red-600">{winner.name}</span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {gameStatus === "finished" && (
              <Button 
                onClick={handlePlayAgain}
                className="bg-green-600 hover:bg-green-700 flex items-center gap-1"
              >
                <RefreshCw className="w-4 h-4" />
                Play Again
              </Button>
            )}
            <Button 
              onClick={leaveRoom}
              variant="outline"
              className="border-bingo-border text-bingo-border hover:bg-bingo-border/10"
            >
              Leave Room
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showResetOptions} onOpenChange={setShowResetOptions}>
        <DialogContent className="bg-bingo-card border-2 border-bingo-border">
          <DialogHeader>
            <DialogTitle className="text-bingo-border text-xl">Choose Board Setup</DialogTitle>
            <DialogDescription>
              Select how you want to set up your board for the new game.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-4 py-4">
            <Button 
              onClick={() => handleResetOption(false)}
              className="flex-1 bg-bingo-accent hover:bg-bingo-accent/80 text-bingo-text"
            >
              Random Numbers
            </Button>
            <Button 
              onClick={() => handleResetOption(true)}
              className="flex-1 bg-bingo-border hover:bg-bingo-border/80 text-white"
            >
              Manual Setup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Current player turn indicator */}
      {gameStatus === "playing" && currentPlayer && (
        <Alert className="mb-4 bg-green-100 border-green-500">
          <User className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-800">Your Turn</AlertTitle>
          <AlertDescription className="text-green-700">
            {currentPlayer.name}, it's your turn to click a number on your board.
          </AlertDescription>
        </Alert>
      )}

      <div className="relative">
        {/* Display winner's board as an overlay on top of game boards */}
        {winner && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <div className="bg-black/30 p-6 rounded-lg w-3/4 max-w-md">
              <div className="text-center mb-2">
                <h3 className="text-2xl font-bold text-white animate-flash">Winner's Board</h3>
              </div>
              <div className="transform scale-40 origin-center">
                <BingoBoard
                  key={`winner-${winner.id}`}
                  board={winner.board}
                  markedCells={winner.markedCells}
                  isCurrentPlayer={winner.id === currentPlayer.id}
                  playerName={winner.name}
                  isWinner={true}
                />
              </div>
            </div>
          </div>
        )}

        {/* Display all player boards in a grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {players.map(player => {
            const isPlayerCurrentPlayer = player.id === currentPlayer.id;
            
            return (
              <BingoBoard
                key={player.id}
                board={player.board}
                markedCells={player.markedCells}
                isCurrentPlayer={isPlayerCurrentPlayer}
                playerName={player.name}
                isWinner={gameStatus === "finished" && winner?.id === player.id}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Game: React.FC = () => {
  const { roomId } = useGame();

  return (
    <div className="min-h-screen py-8 px-4">
      <h1 className="text-4xl font-bold text-center mb-8 text-bingo-border">
        Bingo Blitz
      </h1>
      {!roomId ? <RoomJoin /> : <GameRoom />}
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
