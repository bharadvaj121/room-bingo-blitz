
import React, { createContext, useContext, useState, useEffect } from "react";
import { generateBingoBoard } from "@/lib/bingo";
import { Player } from "@/types/game";
import { SocketProvider, useSocket } from "@/contexts/SocketContext";

interface GameContextType {
  roomId: string | null;
  playerName: string;
  players: Player[];
  currentPlayer: Player | null;
  gameStatus: "waiting" | "playing" | "finished";
  winner: Player | null;
  isManualMode: boolean;
  serverStatus: "online" | "offline";
  setPlayerName: (name: string) => void;
  setRoomId: (id: string) => void;
  createRoom: (isManual: boolean) => void;
  joinRoom: () => void;
  leaveRoom: () => void;
  resetGame: () => void;
  setCalledNumber: (number: number) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const GameProviderInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { gameState, createRoom: socketCreateRoom, joinRoom: socketJoinRoom, leaveRoom: socketLeaveRoom, callNumber } = useSocket();
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);

  const createRoom = (isManual: boolean) => {
    setIsManualMode(isManual);
    if (!isManual && playerName) {
      socketCreateRoom(playerName);
    }
  };

  const joinRoom = () => {
    if (roomId && playerName) {
      socketJoinRoom(roomId, playerName);
    }
  };

  const leaveRoom = () => {
    socketLeaveRoom();
    setRoomId(null);
    setIsManualMode(false);
  };

  const resetGame = () => {
    // Reset logic will be implemented later
    console.log("Reset game");
  };

  const setCalledNumber = (number: number) => {
    callNumber(number);
  };

  return (
    <GameContext.Provider
      value={{
        roomId: gameState.room?.id || roomId,
        playerName,
        players: gameState.room?.players || [],
        currentPlayer: gameState.player,
        gameStatus: gameState.room?.status || "waiting",
        winner: gameState.room?.winner || null,
        isManualMode,
        serverStatus: "online",
        setPlayerName,
        setRoomId,
        createRoom,
        joinRoom,
        leaveRoom,
        resetGame,
        setCalledNumber,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SocketProvider>
      <GameProviderInner>{children}</GameProviderInner>
    </SocketProvider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};
