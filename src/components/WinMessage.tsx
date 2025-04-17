
import React from "react";
import { cn } from "@/lib/utils";

interface WinMessageProps {
  isWinner: boolean;
}

const WinMessage: React.FC<WinMessageProps> = ({ isWinner }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
      <div className={cn(
        "text-2xl sm:text-3xl font-bold text-center px-4 py-2 rounded-lg",
        "transform rotate-[-20deg]",
        "animate-flash",
        isWinner 
          ? "bg-bingo-win/70 text-bingo-border animate-glow" 
          : "bg-red-200/70 text-red-700"
      )}>
        {isWinner 
          ? "BINGO... YOU GOT IT...!" 
          : "YOU MISSED IT..."}
      </div>
    </div>
  );
};

export default WinMessage;
