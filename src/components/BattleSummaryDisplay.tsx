import React, { useState, useEffect } from "react";
import { BattleSummary } from "../types";
import { Swords, Star, X } from "lucide-react";

interface BattleSummaryDisplayProps {
  battles: BattleSummary[];
  onDismiss: () => void;
  turnNumber: number;
}

export function BattleSummaryDisplay({ battles, onDismiss, turnNumber }: BattleSummaryDisplayProps) {
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    setTimeLeft(15);
  }, [turnNumber]);

  useEffect(() => {
    if (timeLeft <= 0) {
      onDismiss();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onDismiss]);

  const getPlayerBgClass = (colorName: string) => {
    switch (colorName) {
      case "emerald": return "bg-emerald-500/10 border-emerald-500/20";
      case "rose": return "bg-rose-500/10 border-rose-500/20";
      case "cyan": return "bg-cyan-500/10 border-cyan-500/20";
      case "amber": return "bg-amber-500/10 border-amber-500/20";
      case "violet": return "bg-violet-500/10 border-violet-500/20";
      case "fuchsia": return "bg-fuchsia-500/10 border-fuchsia-500/20";
      case "blue": return "bg-blue-500/10 border-blue-500/20";
      case "orange": return "bg-orange-500/10 border-orange-500/20";
      case "lime": return "bg-lime-500/10 border-lime-500/20";
      case "pink": return "bg-pink-500/10 border-pink-500/20";
      default: return "bg-slate-900/60 border-slate-800";
    }
  };

  const getPlayerTextClass = (colorName: string) => {
    switch (colorName) {
      case "emerald": return "text-emerald-400";
      case "rose": return "text-rose-400";
      case "cyan": return "text-cyan-400";
      case "amber": return "text-amber-400";
      case "violet": return "text-violet-400";
      case "fuchsia": return "text-fuchsia-400";
      case "blue": return "text-blue-400";
      case "orange": return "text-orange-400";
      case "lime": return "text-lime-400";
      case "pink": return "text-pink-400";
      default: return "text-slate-350";
    }
  };

  return (
    <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4 relative overflow-hidden shadow-lg select-none">
      {/* Top indicator ribbon */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-rose-500" />
      
      {/* Header section */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase flex items-center gap-1">
          <Swords className="w-3.5 h-3.5 animate-pulse text-amber-400" />
          Balanço de Combates (Turno {turnNumber - 1})
        </span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[9px] font-mono font-bold text-slate-500">
            <span>fechando em {timeLeft}s</span>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
            title="Fechar resumo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Battle breakdown list */}
      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
        {battles.map((b, idx) => (
          <div key={`${b.planetId}-${idx}`} className="bg-slate-950/70 border border-slate-905 rounded-lg p-2.5">
            {/* Title / Planet banner */}
            <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-900">
              <span className="text-xs font-black text-slate-100 flex items-center gap-1">
                <Star className="w-3 h-3 text-cyan-400 fill-cyan-400" />
                Planeta {b.planetName} ({b.planetId})
              </span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                b.conquered 
                  ? "bg-rose-500/10 text-rose-450 border-rose-500/20" 
                  : "bg-emerald-500/10 text-emerald-450 border-emerald-500/20"
              }`}>
                {b.conquered ? "CONQUISTADO" : "DEFENDIDO"}
              </span>
            </div>

            {/* Combatants Grid */}
            <div className="grid grid-cols-2 gap-2 text-center text-[10px] mb-1.5">
              
              {/* Attacker */}
              <div className={`p-2 rounded-lg border ${getPlayerBgClass(b.attackerColor)}`}>
                <span className="text-[8px] font-black text-slate-500 block uppercase truncate">ATAQUE ({b.attackerName})</span>
                <span className="font-mono font-bold text-slate-350">Frota: {b.attackerShipsSent}</span>
                <span className="block font-mono font-black text-rose-500 mt-1">Perdas: -{b.attackerLost}</span>
              </div>

              {/* Defender */}
              <div className={`p-2 rounded-lg border ${getPlayerBgClass(b.defenderColor)}`}>
                <span className="text-[8px] font-black text-slate-500 block uppercase truncate">DEFESA ({b.defenderName})</span>
                <span className="font-mono font-bold text-slate-350">Frota: {b.defenderShipsBefore}</span>
                <span className="block font-mono font-black text-rose-500 mt-1">Perdas: -{b.defenderLost}</span>
              </div>

            </div>

            {/* Battle outcome details */}
            <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
              <span>Batalha de {b.rounds} frentes</span>
              <span className={`font-semibold ${getPlayerTextClass(b.conquered ? b.attackerColor : b.defenderColor)}`}>
                {b.conquered 
                  ? `Novo Dono: ${b.attackerName}` 
                  : `Retido por: ${b.defenderName}`}
              </span>
            </div>

          </div>
        ))}
      </div>

      {/* Direct countdown ticking progress line */}
      <div className="mt-3 bg-slate-800 h-1 rounded-full overflow-hidden w-full">
        <div 
          className="bg-amber-500 h-full transition-all duration-1000 ease-linear"
          style={{ width: `${(timeLeft / 15) * 100}%` }}
        />
      </div>
    </div>
  );
}
