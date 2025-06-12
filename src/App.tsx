
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GameProvider } from "@/contexts/GameContext";
import { Toaster } from "@/components/ui/sonner";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import "./App.css";

function App() {
  return (
    <GameProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </Router>
    </GameProvider>
  );
}

export default App;
