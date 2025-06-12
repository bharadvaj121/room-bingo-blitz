
import React, { createContext, useContext, useState, useEffect } from "react";
import { generateBingoBoard } from "@/lib/bingo";
import { Player } from "@/types/game";
import { SocketProvider, useSocket } from "@/contexts/SocketContext";
import { supabase } from "@/integrations/supabase/client";

interface GameContextType {
  roomId: string | null;
  playerName: string;
  players: Player[];
  currentPlayer: Player | null;
  gameStatus: "waiting" | "playing" | "finished";
  winner: Player | null;
  isManualMode: boolean;
  serverStatus: "online" | "offline";
  manualNumbers: number[];
  lastClickedPlayer: string | null;
  lastClickedNumber: number | null;
  showBoardSelectionDialog: boolean;
  inWaitingRoom: boolean;
  setPlayerName: (name: string) => void;
  setRoomId: (id: string) => void;
  createRoom: (isManual: boolean) => void;
  joinRoom: () => void;
  leaveRoom: () => void;
  resetGame: () => void;
  setCalledNumber: (number: number) => void;
  markCell: (index: number) => void;
  addManualNumber: (number: number) => void;
  finishManualSetup: (numbers: number[]) => void;
  checkServerStatus: () => Promise<boolean>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const GameProviderInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { gameState, createRoom: socketCreateRoom, joinRoom: socketJoinRoom, leaveRoom: socketLeaveRoom, callNumber, markCell: socketMarkCell } = useSocket();
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualNumbers, setManualNumbers] = useState<number[]>([]);
  const [lastClickedPlayer, setLastClickedPlayer] = useState<string | null>(null);
  const [lastClickedNumber, setLastClickedNumber] = useState<number | null>(null);
  const [showBoardSelectionDialog, setShowBoardSelectionDialog] = useState(false);
  const [inWaitingRoom, setInWaitingRoom] = useState(false);

  const createRoom = (isManual: boolean) => {
    setIsManualMode(isManual);
    if (!isManual && playerName) {
      socketCreateRoom(playerName);
      setInWaitingRoom(true);
    }
  };

  const joinRoom = () => {
    if (roomId && playerName) {
      socketJoinRoom(roomId, playerName);
      setInWaitingRoom(true);
    }
  };

  const leaveRoom = () => {
    socketLeaveRoom();
    setRoomId(null);
    setIsManualMode(false);
    setInWaitingRoom(false);
  };

  const resetGame = () => {
    console.log("Reset game");
  };

  const setCalledNumber = (number: number) => {
    callNumber(number);
  };

  const markCell = (index: number) => {
    const row = Math.floor(index / 5);
    const col = index % 5;
    socketMarkCell(row, col);
  };

  const addManualNumber = (number: number) => {
    setManualNumbers(prev => [...prev, number]);
  };

  const finishManualSetup = (numbers: number[]) => {
    // Convert flat array to 5x5 board
    const board = [];
    for (let i = 0; i < 25; i += 5) {
      board.push(numbers.slice(i, i + 5));
    }
    console.log("Manual setup completed", board);
    setIsManualMode(false);
  };

  const checkServerStatus = async (): Promise<boolean> => {
    try {
      // Simple check - try to query a table
      const { error } = await supabase.from('bingo_rooms').select('id').limit(1);
      return !error;
    } catch (error) {
      return false;
    }
  };

  // Update inWaitingRoom based on game state
  useEffect(() => {
    if (gameState.room) {
      setInWaitingRoom(gameState.room.status === 'waiting');
    }
  }, [gameState.room?.status]);

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
        manualNumbers,
        lastClickedPlayer,
        lastClickedNumber,
        showBoardSelectionDialog,
        inWaitingRoom,
        setPlayerName,
        setRoomId,
        createRoom,
        joinRoom,
        leaveRoom,
        resetGame,
        setCalledNumber,
        markCell,
        addManualNumber,
        finishManualSetup,
        checkServerStatus,
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
