import React from "react";
import { Sparkles, Bot, AlertTriangle, HelpCircle } from "lucide-react";

interface BanterDisplayProps {
  personaName: string;
  banterText: string;
  isThinking: boolean;
}

export function BanterDisplay({ personaName, banterText, isThinking }: BanterDisplayProps) {
  // Get neat descriptors or avatar traits based on chosen persona
  const getAvatarStyle = () => {
    switch (personaName) {
      case "Imperador de Silício":
        return {
          glow: "border-red-500/40 shadow-red-500/20",
          particle: "bg-red-500",
          desc: "Almirantado Autoritário de Máquinas",
          badgeColor: "bg-red-500/10 text-red-400 border-red-500/20"
        };
      case "Sindicato de Cromo":
        return {
          glow: "border-cyan-400/40 shadow-cyan-400/20",
          particle: "bg-cyan-400",
          desc: "Negociadores e Piratas Espaciais",
          badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
        };
      case "Protetorado de Fóton":
      default:
        return {
          glow: "border-violet-500/40 shadow-violet-500/20",
          particle: "bg-violet-500",
          desc: "Ordem Mística de Alta Energia",
          badgeColor: "bg-violet-500/10 text-violet-400 border-violet-500/20"
        };
    }
  };

  const style = getAvatarStyle();

  return (
    <div className="bg-slate-900 border border-slate-850 rounded-xl p-4 relative overflow-hidden shadow-lg">
      {/* Absolute faint grid background for sci-fi atmosphere */}
      <div className="absolute inset-0 bg-grid opacity-[0.02] pointer-events-none" />

      <div className="flex gap-4 items-start relative z-10">
        
        {/* Animated Hologram AI Head */}
        <div className="relative shrink-0">
          <div className={`w-14 h-14 rounded-full border flex items-center justify-center bg-slate-950 shadow-inner relative transition-colors ${style.glow}`}>
            {isThinking ? (
              <div className="absolute inset-0 rounded-full border border-dashed border-emerald-400 animate-spin" />
            ) : null}

            {/* Pulsing Core */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center opacity-85 ${
              isThinking 
                ? "bg-emerald-500/10 animate-pulse text-emerald-400" 
                : "bg-white/5 text-slate-300"
            }`}>
              <Bot className={`w-4 h-4 ${isThinking ? "animate-bounce" : ""}`} />
            </div>

            {/* Glowing floating satellites */}
            <div className={`absolute top-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-950 ${style.particle} ${isThinking ? "animate-ping" : "animate-pulse"}`} />
          </div>
          <span className="text-[9px] font-mono font-bold text-center block text-slate-500 mt-1 uppercase tracking-wider">
            COMANDANTE
          </span>
        </div>

        {/* Banter bubble dialogue pane */}
        <div className="flex-1 flex flex-col justify-center min-h-[56px] space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black text-white">{personaName}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${style.badgeColor}`}>
              {style.desc}
            </span>
          </div>

          <div className="relative text-xs text-slate-300 leading-relaxed bg-slate-950/40 border border-slate-850/45 rounded-lg p-2.5">
            {isThinking ? (
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-[10px] font-bold">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span>Calculando estratégias hiperbólicas...</span>
              </div>
            ) : banterText ? (
              <p className="italic font-sans text-slate-200">
                &ldquo;{banterText}&rdquo;
              </p>
            ) : (
              <p className="text-slate-500 text-[11px]">
                Aguardando o desdobrar do turno estelar para modular provocações de rádio...
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
