
import React, { useState, useEffect } from "react";
import { useGame } from "@/contexts/GameContext";
import BingoBoard from "@/components/BingoBoard";
import ManualBoardSetup from "@/components/ManualBoardSetup";
import { Button } from "@/components/ui/button";
import { RefreshCw, User, Users, Copy, ServerCrash } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { io } from "socket.io-client";

const GameRoom: React.FC = () => {
  const { 
    roomId, 
    playerName,
    players, 
    currentPlayer, 
    gameStatus, 
    winner,
    isManualMode,
    leaveRoom,
    resetGame,
    createRoom,
    socket,
    setSocket,
    serverConnected,
    setServerConnected,
    setCalledNumber
  } = useGame();
  
  const [showResetOptions, setShowResetOptions] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [serverError, setServerError] = useState(false);

  // Connect to Socket.io server when room is joined
  useEffect(() => {
    if (roomId && playerName && !socket) {
      setIsConnecting(true);
      setServerError(false);
      
      try {
        // Connect to Socket.io server
        const newSocket = io("http://localhost:4000", {
          timeout: 5000,
          reconnectionAttempts: 3
        });
        
        newSocket.on("connect", () => {
          console.log("Connected to socket server");
          setIsConnecting(false);
          setServerConnected(true);
          setSocket(newSocket);
          
          // Join the room
          newSocket.emit("joinRoom", { 
            roomCode: roomId,
            username: playerName 
          });
          
          toast.success("Connected to game server");
        });
        
        newSocket.on("connect_error", (err) => {
          console.error("Connection error:", err);
          setIsConnecting(false);
          setServerConnected(false);
          setServerError(true);
          toast.error("Could not connect to game server");
        });
        
        newSocket.on("numberCalled", ({ number }) => {
          console.log("Number called:", number);
          setCalledNumber(number);
        });
        
        newSocket.on("bingoWinner", ({ username }) => {
          toast.success(`${username} has won the game with BINGO!`);
        });
        
        newSocket.on("playerJoined", ({ username }) => {
          toast.info(`${username} joined the room`);
        });
        
        return () => {
          if (newSocket) {
            console.log("Disconnecting socket");
            newSocket.disconnect();
            setSocket(null);
            setServerConnected(false);
          }
        };
      } catch (error) {
        console.error("Error connecting to socket:", error);
        setIsConnecting(false);
        setServerConnected(false);
        setServerError(true);
        toast.error("Failed to connect to game server");
      }
    }
  }, [roomId, playerName, socket, setSocket, setServerConnected, setCalledNumber]);

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

  // Show server error message
  if (serverError) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <Alert className="mb-4 bg-red-100 border-red-500">
          <ServerCrash className="h-5 w-5 text-red-600" />
          <AlertTitle className="text-red-800">Server Connection Failed</AlertTitle>
          <AlertDescription className="text-red-700">
            Could not connect to the game server at http://localhost:4000.
            <br />
            Please make sure the server is running.
          </AlertDescription>
        </Alert>
        
        <div className="p-4 bg-bingo-card border-2 border-bingo-border rounded-lg shadow">
          <div className="flex flex-col gap-4 items-center justify-center">
            <h2 className="text-xl font-bold">Room: {roomId}</h2>
            <p>You can still play locally without server connection.</p>
            <div className="flex gap-2">
              <Button 
                onClick={() => setServerError(false)}
                className="bg-green-600 hover:bg-green-700 flex items-center gap-1"
              >
                Continue Offline
              </Button>
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
      </div>
    );
  }

  // If not in manual mode but no players/current player, show loading state
  if (!currentPlayer || players.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <Alert className="mb-4 bg-yellow-100 border-yellow-500">
          <RefreshCw className="h-5 w-5 text-yellow-600 animate-spin" />
          <AlertTitle className="text-yellow-800">Setting up your game...</AlertTitle>
          <AlertDescription className="text-yellow-700">
            Room ID: {roomId}
            <br />
            {isConnecting ? "Connecting to server..." : "Initializing game board..."}
          </AlertDescription>
        </Alert>
        
        <div className="p-4 bg-bingo-card border-2 border-bingo-border rounded-lg shadow">
          <div className="flex flex-col gap-4 items-center justify-center">
            <RefreshCw className="w-10 h-10 text-bingo-border animate-spin" />
            <Button 
              onClick={leaveRoom}
              variant="outline"
              className="border-bingo-border text-bingo-border hover:bg-bingo-border/10"
            >
              Cancel & Leave Room
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
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
  
  const copyRoomIdToClipboard = () => {
    if (!roomId) return;
    
    navigator.clipboard.writeText(roomId)
      .then(() => toast.success("Room ID copied to clipboard!"))
      .catch(err => console.error("Failed to copy room ID:", err));
  };

  // Function to broadcast a number when clicked
  const broadcastNumber = (index: number) => {
    if (socket && currentPlayer && gameStatus === "playing") {
      const number = currentPlayer.board[index];
      console.log("Broadcasting number:", number);
      socket.emit("numberSelected", { 
        roomCode: roomId,
        number: number 
      });
    }
  };

  // Function to broadcast bingo win
  const broadcastBingo = () => {
    if (socket && currentPlayer) {
      socket.emit("bingoClaimed", { 
        roomCode: roomId,
        username: playerName 
      });
    }
  };

  // Otherwise, show the game room
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="p-4 bg-bingo-card border-2 border-bingo-border rounded-lg shadow mb-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">Room: {roomId}</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-1 h-8" 
                onClick={copyRoomIdToClipboard}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
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
            {winner && (
              <Button 
                onClick={broadcastBingo}
                className="bg-red-600 hover:bg-red-700 flex items-center gap-1"
              >
                Announce Winner
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

      {!serverConnected && (
        <Alert className="mb-4 bg-yellow-100 border-yellow-500">
          <ServerCrash className="h-5 w-5 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Offline Mode</AlertTitle>
          <AlertDescription className="text-yellow-700">
            Playing in offline mode. Server connection not available.
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
              <div className="transform scale-50 origin-center">
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
                onCellClick={isPlayerCurrentPlayer ? broadcastNumber : undefined}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GameRoom;
