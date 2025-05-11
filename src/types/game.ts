
// Game status type
export type GameStatus = "playing" | "finished" | "waiting";

// Server status type
export type ServerStatus = "checking" | "online" | "offline";

// Player type definition
export interface Player {
  id: string;
  name: string;
  board: number[];
  markedCells: boolean[];
  completedLines: number;
}

// Game context interface
export interface GameContextProps {
  playerName: string;
  roomId: string | null;
  players: Player[];
  currentPlayer: Player | null;
  gameStatus: GameStatus;
  winner: Player | null;
  isManualMode: boolean;
  lastClickedPlayer: string | null;
  lastClickedNumber: number | null;
  showBoardSelectionDialog: boolean;
  serverStatus: ServerStatus;
  setPlayerName: (name: string) => void;
  setRoomId: (id: string) => void;
  joinRoom: () => void;
  completeJoinRoom: (isManual: boolean) => void;
  leaveRoom: () => void;
  createRoom: (isManual: boolean) => void;
  markCell: (index: number) => void;
  finishManualSetup: (boardNumbers: number[]) => void;
  resetGame: () => void;
  setCalledNumber: (number: number) => void;
  manualNumbers: number[];
  addManualNumber: (num: number) => void;
  checkServerStatus: () => Promise<boolean>;
}
