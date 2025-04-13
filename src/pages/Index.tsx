import React from "react";
import { GameProvider, useGame } from "@/contexts/GameContext";
import RoomJoin from "@/components/RoomJoin";
import BingoBoard from "@/components/BingoBoard";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const GameRoom: React.FC = () => {
  const { 
    roomId, 
    players, 
    currentPlayer, 
    gameStatus, 
    winner,
    leaveRoom,
    resetGame
  } = useGame();

  if (!roomId || !currentPlayer) return null;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="p-4 bg-bingo-card border-2 border-bingo-border rounded-lg shadow mb-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-bold">Room: {roomId}</h2>
            <p className="text-sm">Players: {players.length}</p>
          </div>
          <div>
            <p className="text-sm">
              Status: <span className="font-semibold">{gameStatus === "playing" ? "Game in progress" : "Game finished"}</span>
            </p>
            {winner && (
              <p className="text-sm">
                Winner: <span className="font-semibold text-bingo-border">{winner.name}</span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {gameStatus === "finished" && (
              <Button 
                onClick={resetGame}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current player's board always first */}
        <BingoBoard 
          board={currentPlayer.board}
          markedCells={currentPlayer.markedCells}
          isCurrentPlayer={true}
          playerName={currentPlayer.name}
        />
        
        {/* Other players' boards */}
        {players
          .filter(player => player.id !== currentPlayer.id)
          .map(player => (
            <BingoBoard
              key={player.id}
              board={player.board}
              markedCells={player.markedCells}
              isCurrentPlayer={false}
              playerName={player.name}
            />
          ))}
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
