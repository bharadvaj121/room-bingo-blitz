
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GameProvider, useGame } from "@/contexts/GameContext";
import { Toaster } from "@/components/ui/sonner";
import Lobby from "@/components/Lobby";
import WaitingRoom from "@/components/WaitingRoom";
import GameRoom from "@/components/GameRoom";
import NotFound from "@/pages/NotFound";
import "./App.css";

const GameContent: React.FC = () => {
  const { roomId, gameStatus, isManualMode } = useGame();

  // Show lobby if no room
  if (!roomId) {
    return <Lobby />;
  }

  // Show manual setup if in manual mode
  if (isManualMode) {
    return <GameRoom />;
  }

  // Show waiting room if game hasn't started
  if (gameStatus === "waiting") {
    return <WaitingRoom />;
  }

  // Show game room for playing/finished states
  return <GameRoom />;
};

function App() {
  return (
    <GameProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-bingo-card via-bingo-cardStripe1 to-bingo-cardStripe2 flex items-center justify-center p-4">
          <Routes>
            <Route path="/" element={<GameContent />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <Toaster />
      </Router>
    </GameProvider>
  );
}

export default App;
