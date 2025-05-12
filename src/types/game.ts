
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
  isHost?: boolean;
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
  isHost: boolean; // New property to track if current player is host
  inWaitingRoom: boolean; // New property to track if in waiting room
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
  startGame: () => void; // New function to start game (host only)
}

// Supabase specific types
export interface SupabaseRoom {
  id: string;
  room_code: string;
  game_status: string | null;
  winner_id: string | null;
  last_called_number: number | null;
  created_at?: string | null;
  is_manual_mode: boolean;
}

export interface SupabasePlayer {
  id: string;
  name: string;
  room_id: string;
  board: number[];
  marked_cells: boolean[];
  completed_lines: number;
  created_at?: string | null;
}

export interface SupabaseRoomData {
  room: SupabaseRoom;
  players: SupabasePlayer[];
  winner: SupabasePlayer | null;
}
