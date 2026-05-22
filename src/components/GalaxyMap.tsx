import React, { useState, useEffect } from "react";
import { Planet, Fleet, Player, BattleSummary } from "../types";
import { LucideArrowRight, Rocket, Shield, Sparkles, Zap } from "lucide-react";
import { calculateTravelTurns } from "../gameUtils";
import { motion } from "motion/react";

interface Particle {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
  size: number;
  duration: number;
  delay: number;
}

interface Shockwave {
  id: string;
  x: number;
  y: number;
  color: string;
}

interface GalaxyMapProps {
  planets: Planet[];
  fleets: Fleet[];
  players: Player[];
  activePlayerId: string;
  onDispatchFleet: (originId: string, targetId: string, ships: number) => void;
  selectedOrigin: Planet | null;
  setSelectedOrigin: (p: Planet | null) => void;
  lastTurnBattles?: BattleSummary[];
  turnNumber?: number;
}

export function GalaxyMap({
  planets,
  fleets,
  players,
  activePlayerId,
  onDispatchFleet,
  selectedOrigin,
  setSelectedOrigin,
  lastTurnBattles,
  turnNumber,
}: GalaxyMapProps) {
  const [selectedTarget, setSelectedTarget] = useState<Planet | null>(null);
  const [shipsToSendPercent, setShipsToSendPercent] = useState<number>(50);
  const [exactShipsToSend, setExactShipsToSend] = useState<number>(0);
  const [isManualInput, setIsManualInput] = useState<boolean>(false);
  const [selectedFleetId, setSelectedFleetId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedFleetId && !fleets.some((f) => f.id === selectedFleetId)) {
      setSelectedFleetId(null);
    }
  }, [fleets, selectedFleetId]);

  // Generate stable background stars with random coordinates, sizes, and delays for the twinkling effect
  const backgroundStars = React.useMemo(() => {
    const list = [];
    for (let i = 0; i < 75; i++) {
      const colors = ["bg-cyan-400", "bg-indigo-300", "bg-amber-100", "bg-white", "bg-sky-200"];
      const colorClass = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() < 0.15 ? "w-1 h-1" : Math.random() < 0.4 ? "w-[3px] h-[3px]" : "w-[1.5px] h-[1.5px]";
      list.push({
        id: `star-${i}`,
        left: `${(Math.random() * 100).toFixed(2)}%`,
        top: `${(Math.random() * 100).toFixed(2)}%`,
        size,
        color: colorClass,
        delay: `${(Math.random() * 8).toFixed(2)}s`,
        duration: `${(4 + Math.random() * 6).toFixed(2)}s`,
        opacity: (0.15 + Math.random() * 0.75).toFixed(2),
      });
    }
    return list;
  }, []);

  const [particles, setParticles] = useState<Particle[]>([]);
  const [shockwaves, setShockwaves] = useState<Shockwave[]>([]);

  // Setup layout factors
  const cols = 14;
  const rows = 8;

  const getPlayerHexColor = (colorName: string) => {
    const colors: Record<string, string> = {
      emerald: "#10b981",
      rose: "#f43f5e",
      fuchsia: "#d946ef",
      amber: "#f59e0b",
      blue: "#3b82f6",
      violet: "#8b5cf6",
      cyan: "#06b6d4",
      orange: "#f97316",
      lime: "#84cc16",
      pink: "#ec4899",
      neutral: "#94a3b8"
    };
    return colors[colorName] || colorName;
  };

  useEffect(() => {
    if (lastTurnBattles && lastTurnBattles.length > 0) {
      const newParticles: Particle[] = [];
      const newShockwaves: Shockwave[] = [];

      lastTurnBattles.forEach((battle, bIdx) => {
        const planet = planets.find((p) => p.id === battle.planetId);
        if (!planet) return;

        const px = (planet.x / cols) * 100;
        const py = (planet.y / rows) * 100;

        const colorHex = getPlayerHexColor(battle.attackerColor);

        // Add shockwave animation triggers
        newShockwaves.push({
          id: `wave-${battle.planetId}-${bIdx}-${Date.now()}-${Math.random()}`,
          x: px,
          y: py,
          color: colorHex,
        });

        // Generate 18 orbital debris particles
        for (let i = 0; i < 18; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = 25 + Math.random() * 65;
          const dx = Math.cos(angle) * distance;
          const dy = Math.sin(angle) * distance;

          newParticles.push({
            id: `p-${battle.planetId}-${bIdx}-${i}-${Date.now()}-${Math.random()}`,
            x: px,
            y: py,
            dx,
            dy,
            color: i % 3 === 0 ? "#f97316" : bIdx % 2 === 0 && i % 3 === 1 ? "#ffedd5" : colorHex,
            size: 2.5 + Math.random() * 4.5,
            duration: 0.6 + Math.random() * 0.7,
            delay: Math.random() * 0.12,
          });
        }
      });

      setParticles(newParticles);
      setShockwaves(newShockwaves);

      const timer = setTimeout(() => {
        setParticles([]);
        setShockwaves([]);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [lastTurnBattles, turnNumber]);

  const calculateDistance = (p1: Planet, p2: Planet) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  };

  // Track player colors
  const getPlayerColor = (ownerId: string | null) => {
    if (!ownerId || ownerId === "neutral") return "#94a3b8"; // slate-400
    const player = players.find((p) => p.id === ownerId);
    if (!player) return "#94a3b8";
    
    // Convert Tailwind names to real Hex colors for SVG
    const colors: Record<string, string> = {
      rose: "#f43f5e",
      emerald: "#10b981",
      fuchsia: "#d946ef",
      amber: "#f59e0b",
      blue: "#3b82f6",
      violet: "#8b5cf6",
      cyan: "#06b6d4",
      orange: "#f97316",
      lime: "#84cc16",
      pink: "#ec4899"
    };
    return colors[player.color] || player.color;
  };

  const getPlayerGlow = (ownerId: string | null) => {
    if (!ownerId || ownerId === "neutral") return "drop-shadow-[0_0_4px_rgba(148,163,184,0.3)]";
    const player = players.find((p) => p.id === ownerId);
    if (!player) return "";
    
    const glows: Record<string, string> = {
      emerald: "drop-shadow-[0_0_12px_rgba(16,185,129,0.7)]",
      rose: "drop-shadow-[0_0_12px_rgba(244,63,94,0.7)]",
      fuchsia: "drop-shadow-[0_0_12px_rgba(217,70,239,0.7)]",
      amber: "drop-shadow-[0_0_12px_rgba(245,158,11,0.7)]",
      blue: "drop-shadow-[0_0_12px_rgba(59,130,246,0.7)]",
      violet: "drop-shadow-[0_0_12px_rgba(139,92,246,0.7)]",
      cyan: "drop-shadow-[0_0_12px_rgba(6,182,212,0.7)]",
      orange: "drop-shadow-[0_0_12px_rgba(249,115,22,0.7)]",
      lime: "drop-shadow-[0_0_12px_rgba(132,204,22,0.7)]",
      pink: "drop-shadow-[0_0_12px_rgba(236,72,153,0.7)]"
    };
    return glows[player.color] || "";
  };

  const handlePlanetTouch = (planet: Planet) => {
    if (selectedOrigin === null) {
      // Must tap own planet first
      if (planet.ownerId === activePlayerId) {
        setSelectedOrigin(planet);
        setSelectedTarget(null);
        // Default to half of available ships, min 1
        const half = Math.max(1, Math.floor(planet.ships / 2));
        setExactShipsToSend(half);
        setShipsToSendPercent(50);
        setIsManualInput(false);
      }
    } else {
      // Setting Target planet
      if (planet.id === selectedOrigin.id) {
        // Tap same planet to deselect
        setSelectedOrigin(null);
        setSelectedTarget(null);
      } else {
        setSelectedTarget(planet);
        // Recalculate ships count bound
        const maxShips = selectedOrigin.ships;
        const count = isManualInput 
          ? Math.min(maxShips, exactShipsToSend) 
          : Math.max(1, Math.floor((maxShips * shipsToSendPercent) / 100));
        setExactShipsToSend(count);
      }
    }
  };

  const adjustPercent = (percent: number) => {
    if (!selectedOrigin) return;
    setShipsToSendPercent(percent);
    setIsManualInput(false);
    const count = Math.max(1, Math.floor((selectedOrigin.ships * percent) / 100));
    setExactShipsToSend(count);
  };

  const adjustSpecific = (delta: number) => {
    if (!selectedOrigin) return;
    const nextValue = Math.max(1, Math.min(selectedOrigin.ships, exactShipsToSend + delta));
    setExactShipsToSend(nextValue);
    setIsManualInput(true);
    setShipsToSendPercent(Math.round((nextValue / selectedOrigin.ships) * 100));
  };

  const launchFleet = () => {
    if (!selectedOrigin || !selectedTarget || exactShipsToSend <= 0) return;
    onDispatchFleet(selectedOrigin.id, selectedTarget.id, exactShipsToSend);
    
    // Clear selections on success
    setSelectedOrigin(null);
    setSelectedTarget(null);
  };

  // Distance/ETA estimates
  const estTurns = selectedOrigin && selectedTarget ? calculateTravelTurns(selectedOrigin, selectedTarget) : 0;

  return (
    <div className="flex flex-col h-full bg-slate-950 font-sans select-none rounded-xl overflow-hidden border border-slate-850">
      
      {/* Map Canvas and grid */}
      <motion.div 
        key={turnNumber}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex-1 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-4 flex items-center justify-center min-h-[300px]" 
        id="star-system-stage"
      >
        
        {/* Elegant Twinkling Stars Layer */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
          {backgroundStars.map((star) => (
            <div
              key={star.id}
              className={`absolute rounded-full animate-twinkle ${star.color} ${star.size}`}
              style={{
                left: star.left,
                top: star.top,
                animationDelay: star.delay,
                "--twinkle-duration": star.duration,
                opacity: star.opacity,
              } as React.CSSProperties}
            />
          ))}
        </div>
        
        {/* Floating Telemetry HUD for selected fleet */}
        {(() => {
          const selectedFleet = selectedFleetId ? fleets.find((f) => f.id === selectedFleetId) : null;
          const targetPlanetOfSelectedFleet = selectedFleet ? planets.find(p => p.id === selectedFleet.targetPlanetId) : null;

          if (!selectedFleet) return null;

          return (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-4 right-4 z-40 w-56 bg-slate-950/95 border border-slate-800/80 p-3 rounded-lg shadow-xl backdrop-blur-md text-xs transition-colors"
            >
              <div className="flex justify-between items-center mb-1.5 border-b border-slate-800/60 pb-1.5">
                <span className="font-bold text-[10px] tracking-wider uppercase text-slate-400 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-cyan-400 animate-pulse" /> Telemetria da Frota
                </span>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setSelectedFleetId(null); 
                  }}
                  className="text-slate-500 hover:text-white text-[11px] p-0.5"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 text-[10px] uppercase">Origem:</span>
                  <span className="font-mono text-slate-300 font-semibold">Planeta {selectedFleet.originPlanetId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-[10px] uppercase">Destino:</span>
                  <span className="font-mono text-slate-300 font-semibold">Planeta {selectedFleet.targetPlanetId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-[10px] uppercase flex items-center gap-0.5">Naves dispatch:</span>
                  <span className="font-black text-white flex items-center gap-1">
                    <Rocket className="w-3 h-3 text-cyan-400" />
                    {selectedFleet.ships}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-[10px] uppercase">Tempo Restante:</span>
                  <span className="font-mono text-amber-400 font-bold">{selectedFleet.turnsRemaining} {selectedFleet.turnsRemaining === 1 ? 'turno' : 'turnos'}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-800/40 pt-1.5 mt-1.5">
                  <span className="text-slate-500 text-[10px] uppercase">Status Tático:</span>
                  {selectedFleet.ownerId === activePlayerId ? (
                    targetPlanetOfSelectedFleet?.ownerId === activePlayerId ? (
                      <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 font-extrabold text-[9px] uppercase tracking-wider">Reforço</span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800/60 text-amber-400 font-extrabold text-[9px] uppercase tracking-wider">Potencial Conquista</span>
                    )
                  ) : (
                    targetPlanetOfSelectedFleet?.ownerId === activePlayerId ? (
                      <span className="px-1.5 py-0.5 rounded bg-rose-950/90 border border-rose-800/80 text-rose-400 font-extrabold text-[9px] uppercase tracking-wider animate-pulse flex items-center gap-0.5">
                        Ameaça Iminente
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-extrabold text-[9px] uppercase tracking-wider">Conflito Competidor</span>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* Tech Grid Coordinates Visualizer */}
        <div className="absolute inset-0 grid grid-cols-14 grid-rows-8 pointer-events-none opacity-[0.03] border border-slate-500">
          {Array.from({ length: cols * rows }).map((_, i) => (
            <div key={i} className="border-[0.5px] border-slate-400"></div>
          ))}
        </div>

        {/* Space Aura / Glowing Stars Decoration */}
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Responsive Coordinate Map Viewport */}
        <div className="relative w-full aspect-[16/10] max-w-4xl border border-slate-900/40 rounded-xl p-2">
          
          {/* Dispatch connection line */}
          {selectedOrigin && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              {planets.map((p) => {
                if (p.id === selectedOrigin.id) return null;
                const isTarget = selectedTarget && selectedTarget.id === p.id;
                
                // Coordinates mapped from [0-cols] to [0%-100%]
                const x1 = `${(selectedOrigin.x / cols) * 100}%`;
                const y1 = `${(selectedOrigin.y / rows) * 100}%`;
                const x2 = `${(p.x / cols) * 100}%`;
                const y2 = `${(p.y / rows) * 100}%`;

                return (
                  <g key={`line-to-${p.id}`}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      className={`stroke-2 transition-all ${
                        isTarget 
                          ? "stroke-orange-500 [stroke-dasharray:6] animate-[dash_2s_linear_infinite]" 
                          : "stroke-slate-800/40 stroke-dashed"
                      }`}
                    />
                    {isTarget && (
                      <circle cx={x2} cy={y2} r="28" fill="none" stroke="#f97316" strokeWidth="1.5" className="animate-ping opacity-30" />
                    )}
                  </g>
                );
              })}
            </svg>
          )}

          {/* Fleets currently in transit */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
            {fleets.map((f) => {
              const origin = planets.find((p) => p.id === f.originPlanetId);
              const target = planets.find((p) => p.id === f.targetPlanetId);
              if (!origin || !target) return null;

              // Calculate current interpolation percentage based on turns
              const ratioCompleted = (f.turnsTotal - f.turnsRemaining) / f.turnsTotal;
              const fx = origin.x + (target.x - origin.x) * ratioCompleted;
              const fy = origin.y + (target.y - origin.y) * ratioCompleted;

              const px = `${(fx / cols) * 100}%`;
              const py = `${(fy / rows) * 100}%`;

              const fColor = getPlayerColor(f.ownerId);
              const isSelected = selectedFleetId === f.id;

              return (
                <motion.g 
                  key={f.id} 
                  className="pointer-events-auto cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFleetId(isSelected ? null : f.id);
                  }}
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  {/* Projected Path Indicator when fleet is selected */}
                  {isSelected && (
                    <motion.line
                      x1={px}
                      y1={py}
                      x2={`${(target.x / cols) * 100}%`}
                      y2={`${((target.y / rows) * 100)}%`}
                      stroke={fColor}
                      strokeWidth="1.5"
                      strokeDasharray="4,6"
                      initial={{ strokeDashoffset: 0 }}
                      animate={{ strokeDashoffset: -20 }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                      className="opacity-70"
                    />
                  )}

                  {/* Pulsing visual halo for selected fleets */}
                  {isSelected && (
                    <motion.circle
                      cx={px}
                      cy={py}
                      r="16"
                      fill="none"
                      stroke={fColor}
                      strokeWidth="1.5"
                      initial={{ scale: 0.8, opacity: 0.9 }}
                      animate={{ scale: [1.1, 1.4, 1.1], opacity: [0.8, 0.3, 0.8] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}

                  {/* Interactive larger hit area */}
                  <circle cx={px} cy={py} r="14" fill="transparent" />

                  {/* Floating Fleet Counter Core */}
                  <circle 
                    cx={px} 
                    cy={py} 
                    r="8.5" 
                    fill="#020617" 
                    stroke={fColor} 
                    strokeWidth="1.5" 
                    className="transition-transform group-hover:scale-110 duration-200"
                  />
                  <text
                    x={px}
                    y={py}
                    dy="3"
                    textAnchor="middle"
                    fill="#f8fafc"
                    className="font-mono font-bold select-none"
                    style={{ fontSize: "7.5px" }}
                  >
                    {f.ships}
                  </text>
                  {/* Tiny Orbit indicator pointing towards destination */}
                  <line 
                    x1={px} 
                    y1={py} 
                    x2={`${((fx + (target.x - fx) * 0.08) / cols) * 100}%`} 
                    y2={`${((fy + (target.y - fy) * 0.08) / rows) * 100}%`} 
                    stroke={fColor} 
                    strokeWidth="1.5" 
                  />
                </motion.g>
              );
            })}
          </svg>

          {/* Combat Arrival Particle Impact & Shockwaves Overlay */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-35 overflow-visible">
            {/* Shockwaves */}
            {shockwaves.map((wave) => (
              <g key={wave.id}>
                {/* Inner wave */}
                <motion.circle
                  cx={`${wave.x}%`}
                  cy={`${wave.y}%`}
                  initial={{ r: 4, opacity: 1, strokeWidth: 4 }}
                  animate={{ r: 42, opacity: 0, strokeWidth: 0.5 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  fill="none"
                  stroke={wave.color}
                />
                {/* Outer concentric wave */}
                <motion.circle
                  cx={`${wave.x}%`}
                  cy={`${wave.y}%`}
                  initial={{ r: 2, opacity: 0.8, strokeWidth: 3 }}
                  animate={{ r: 76, opacity: 0, strokeWidth: 0.1 }}
                  transition={{ duration: 1.1, ease: "easeOut", delay: 0.06 }}
                  fill="none"
                  stroke={wave.color}
                />
              </g>
            ))}

            {/* Exploding particles */}
            {particles.map((p) => (
              <motion.circle
                key={p.id}
                cx={`${p.x}%`}
                cy={`${p.y}%`}
                r={p.size}
                fill={p.color}
                className="drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]"
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: p.dx,
                  y: p.dy,
                  opacity: 0,
                  scale: 0.2
                }}
                transition={{
                  duration: p.duration,
                  ease: "easeOut",
                  delay: p.delay
                }}
              />
            ))}
          </svg>

          {/* Interactive Planet Nodes */}
          {planets.map((planet) => {
            const isOrigin = selectedOrigin?.id === planet.id;
            const isTarget = selectedTarget?.id === planet.id;
            const pColor = getPlayerColor(planet.ownerId);

            // Compute sizes proportional to production rate (sizes slightly increased: 15px base and 1.8x multiplier)
            const radius = 15 + planet.production * 1.8;

            // Positioning percentages
            const px = `${(planet.x / cols) * 100}%`;
            const py = `${(planet.y / rows) * 100}%`;

            // Compute if there's an active selected fleet targeting this planet
            const selectedFleet = selectedFleetId ? fleets.find((f) => f.id === selectedFleetId) : null;
            const isSelectedFleetTarget = selectedFleet && selectedFleet.targetPlanetId === planet.id;

            // Determine tactical role:
            let tacticalGlow: "threat" | "conquest" | "reinforce" | null = null;

            if (isTarget) {
              // Player is preparing dispatch to this target planet
              if (planet.ownerId === activePlayerId) {
                tacticalGlow = "reinforce";
              } else {
                tacticalGlow = "conquest";
              }
            } else if (isSelectedFleetTarget && selectedFleet) {
              // A fleet in transit is selected and targets this planet
              if (selectedFleet.ownerId === activePlayerId) {
                if (planet.ownerId === activePlayerId) {
                  tacticalGlow = "reinforce";
                } else {
                  tacticalGlow = "conquest";
                }
              } else {
                // Enemy fleet targets a planet
                if (planet.ownerId === activePlayerId) {
                  tacticalGlow = "threat";
                } else {
                  tacticalGlow = "conquest"; // Competitividade adversária sobre vácuo alheio/neutro
                }
              }
            }

            return (
              <button
                key={planet.id}
                id={`btn-planet-${planet.id}`}
                onClick={() => handlePlanetTouch(planet)}
                className="absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none transition-transform active:scale-90 group z-30"
                style={{ left: px, top: py }}
              >
                {/* Planet Graphic */}
                <div className="relative flex items-center justify-center">
                  
                  {/* Selected Outer Orbit Circle */}
                  {isOrigin && (
                    <div className="absolute rounded-full border border-emerald-400/80 animate-[spin_10s_linear_infinite]"
                         style={{ width: `${(radius + 12)*2}px`, height: `${(radius + 12)*2}px`, borderStyle: 'dashed' }} />
                  )}

                  {/* Tactical Pulsing Glow (Threat / Conquest / Reinforce) via Framer Motion */}
                  {tacticalGlow === "threat" && (
                    <>
                      {/* Outer heavy warning pulse ring */}
                      <motion.div
                        className="absolute rounded-full border border-rose-500/80 bg-rose-500/10"
                        style={{ width: `${(radius + 15)*2}px`, height: `${(radius + 15)*2}px` }}
                        initial={{ scale: 0.9, opacity: 0.8 }}
                        animate={{ scale: [0.95, 1.45, 0.95], opacity: [0.8, 0, 0.8] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                      />
                      {/* Mid ring */}
                      <motion.div
                        className="absolute rounded-full border-2 border-rose-650/40"
                        style={{ width: `${(radius + 8)*2}px`, height: `${(radius + 8)*2}px` }}
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 1.0, repeat: Infinity, ease: "easeInOut" }}
                      />
                      {/* Pulsating background aura */}
                      <div className="absolute rounded-full bg-rose-600/35 blur-md pointer-events-none"
                           style={{ width: `${radius*2.6}px`, height: `${radius*2.6}px` }} />
                    </>
                  )}

                  {tacticalGlow === "conquest" && (
                    <>
                      {/* Golden/Orange high frequency potential conquest ring */}
                      <motion.div
                        className="absolute rounded-full border border-amber-400 bg-amber-500/5"
                        style={{ width: `${(radius + 14)*2}px`, height: `${(radius + 14)*2}px` }}
                        initial={{ scale: 0.9, opacity: 0.9 }}
                        animate={{ scale: [0.95, 1.35, 0.95], opacity: [0.9, 0.05, 0.9] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                      />
                      {/* Concentric rotating tactical brackets representing conquest target */}
                      <motion.div
                        className="absolute rounded-full border border-orange-500/60 border-t-transparent border-b-transparent"
                        style={{ width: `${(radius + 10)*2}px`, height: `${(radius + 10)*2}px` }}
                        animate={{ rotate: 365 }}
                        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                      />
                      {/* Golden blur aura */}
                      <div className="absolute rounded-full bg-amber-500/25 blur-md pointer-events-none"
                           style={{ width: `${radius*2.4}px`, height: `${radius*2.4}px` }} />
                    </>
                  )}

                  {tacticalGlow === "reinforce" && (
                    <>
                      {/* Emerald clean support pulsing rings */}
                      <motion.div
                        className="absolute rounded-full border border-cyan-400/80 bg-cyan-400/5"
                        style={{ width: `${(radius + 12)*2}px`, height: `${(radius + 12)*2}px` }}
                        initial={{ scale: 0.95, opacity: 0.9 }}
                        animate={{ scale: [0.95, 1.25, 0.95], opacity: [0.9, 0.1, 0.9] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                      />
                      {/* Clean cyan aura */}
                      <div className="absolute rounded-full bg-cyan-500/20 blur-sm pointer-events-none"
                           style={{ width: `${radius*2.2}px`, height: `${radius*2.2}px` }} />
                    </>
                  )}

                  {/* Core Planet Spherical Render */}
                  <div
                    className={`rounded-full flex flex-col items-center justify-center relative transition-all ${getPlayerGlow(planet.ownerId)}`}
                    style={{
                      width: `${radius * 2}px`,
                      height: `${radius * 2}px`,
                      background: `radial-gradient(circle at 30% 30%, ${pColor}dd, #020617)`,
                      border: isOrigin ? "2.5px solid #10b981" : isTarget ? "2.5px solid #f97316" : "1.5px solid rgba(255,255,255,0.1)"
                    }}
                  >
                    {/* Ring Accents for high defense rating planets */}
                    {planet.killPercent > 0.6 && (
                      <div className="absolute inset-0 border border-white/10 rounded-full scale-125 rotate-45 pointer-events-none" />
                    )}

                    {/* Planet Identifier Code Letter */}
                    <span className="text-[10px] font-mono font-black text-white/50 absolute top-1 drop-shadow-md">
                      {planet.id}
                    </span>

                    {/* Ship Army Defense count */}
                    <span className="text-sm font-black text-white leading-none drop-shadow-lg -mt-1 font-sans">
                      {planet.ships}
                    </span>

                    {/* Small visual production rate beads */}
                    <div className="absolute bottom-1.5 flex gap-0.5 justify-center">
                      {Array.from({ length: Math.min(planet.production, 6) }).map((_, idx) => (
                        <div key={idx} className="w-1 h-1 rounded-full bg-white/40" />
                      ))}
                    </div>
                  </div>

                  {/* Planet floating tag for names (Alternating top/bottom to prevent collision overlaps) */}
                  <div className={`absolute flex flex-col items-center pointer-events-none ${
                    planet.id.charCodeAt(0) % 2 === 0 ? "-top-6" : "-bottom-6"
                  }`}>
                    <span className="text-[11px] font-medium text-slate-200 drop-shadow-md whitespace-nowrap bg-slate-950/85 px-1.5 py-0.5 rounded border border-slate-800/60 transition-transform">
                      {planet.name}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}

        </div>
      </motion.div>

      {/* Slide-Up Dispatch Drawer (adapted perfectly for Touch targets) */}
      <div className="bg-slate-900 border-t border-slate-850 p-3">
        {!selectedOrigin ? (
          <div className="flex items-center justify-center gap-2 py-1.5 text-center text-slate-400">
            <Zap className="w-4 h-4 text-emerald-500 animate-pulse shrink-0" />
            <span className="text-xs font-bold text-slate-200">Selecione um planeta aliado da sua cor para iniciar decolagens</span>
          </div>
        ) : !selectedTarget ? (
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-md"
                style={{ backgroundColor: getPlayerColor(selectedOrigin.ownerId) }}
              >
                {selectedOrigin.id}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">De: {selectedOrigin.name}</p>
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <span>Força total: {selectedOrigin.ships} naves</span>
                  <span className="text-slate-600">|</span>
                  <span className="flex items-center text-amber-400"><Zap className="w-3 h-3 mr-0.5" /> Prod: +{selectedOrigin.production}/t</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-right text-orange-400">
              <span className="text-xs font-semibold animate-pulse">Selecione o destino...</span>
              <LucideArrowRight className="w-4 h-4" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 animate-fadeIn">
            {/* Context Flight Row */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-3">
                <div 
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white"
                  style={{ backgroundColor: getPlayerColor(selectedOrigin.ownerId) }}
                >
                  {selectedOrigin.id}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">Origem</span>
                  <span className="text-sm font-bold text-slate-200">{selectedOrigin.name}</span>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[10px] font-mono bg-slate-800 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                  ETA: {estTurns} {estTurns === 1 ? 'Turno' : 'Turnos'}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 font-mono">{calculateDistance(selectedOrigin, selectedTarget).toFixed(1)} AL</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex flex-col text-right">
                  <span className="text-xs text-slate-400">Destino</span>
                  <span className="text-sm font-bold text-slate-200">{selectedTarget.name}</span>
                </div>
                <div 
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white"
                  style={{ backgroundColor: getPlayerColor(selectedTarget.ownerId) }}
                >
                  {selectedTarget.id}
                </div>
              </div>
            </div>

            {/* Ship percentage Selector (Adapted for huge touch sliders) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Tamanho da Frota a Enviar</span>
                <span className="text-base font-black text-emerald-400 font-mono scale-110">
                  {exactShipsToSend} <span className="text-xs text-slate-500">naves ({shipsToSendPercent}%)</span>
                </span>
              </div>

              {/* Grid of Percentage Quick Buttons for touch accuracy */}
              <div className="grid grid-cols-4 gap-2">
                {[25, 50, 75, 100].map((percent) => (
                  <button
                    key={`${percent}-quick`}
                    onClick={() => adjustPercent(percent)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-colors ${
                      shipsToSendPercent === percent 
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500" 
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900"
                    }`}
                  >
                    {percent}%
                  </button>
                ))}
              </div>

              {/* Slider & Fine tuner inputs */}
              <div className="flex items-center gap-3 mt-1">
                <button 
                  onClick={() => adjustSpecific(-1)}
                  disabled={exactShipsToSend <= 1}
                  className="w-10 h-10 rounded-lg bg-slate-950 font-bold border border-slate-800 flex items-center justify-center text-slate-300 active:bg-slate-900 disabled:opacity-30"
                >
                  -1
                </button>
                <input
                  type="range"
                  min="1"
                  max={selectedOrigin.ships}
                  value={exactShipsToSend}
                  onChange={(e) => {
                    const count = parseInt(e.target.value) || 1;
                    setExactShipsToSend(count);
                    setIsManualInput(true);
                    setShipsToSendPercent(Math.round((count / selectedOrigin.ships) * 100));
                  }}
                  className="flex-1 accent-emerald-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
                />
                <button 
                  onClick={() => adjustSpecific(1)}
                  disabled={exactShipsToSend >= selectedOrigin.ships}
                  className="w-10 h-10 rounded-lg bg-slate-950 font-bold border border-slate-800 flex items-center justify-center text-slate-300 active:bg-slate-900 disabled:opacity-30"
                >
                  +1
                </button>
              </div>
            </div>

            {/* Launch controls */}
            <div className="grid grid-cols-5 gap-2 mt-2">
              <button
                onClick={() => {
                  setSelectedOrigin(null);
                  setSelectedTarget(null);
                }}
                className="col-span-2 py-3 px-1 text-xs font-semibold text-slate-400 bg-slate-950 hover:bg-slate-900 rounded-xl border border-slate-800 active:scale-95 transition-transform"
              >
                Cancelar
              </button>
              <button
                id="btn-launch-fleet"
                onClick={launchFleet}
                disabled={selectedOrigin.ships <= 1 || exactShipsToSend === 0}
                className="col-span-3 py-3 px-3 rounded-xl bg-[linear-gradient(135deg,_#10b981,_#059669)] hover:brightness-110 active:scale-95 text-xs font-black text-slate-950 flex shadow-lg shadow-emerald-950/40 items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Rocket className="w-4 h-4 fill-slate-950 text-slate-950 stroke-2" />
                LANÇAR FROTA
              </button>
            </div>
            {selectedOrigin.ships <= 1 && (
              <p className="text-[10px] text-rose-400 text-center font-semibold animate-pulse -mt-1">
                Não é permitido decolar a última nave de guarnição de defesa do planeta!
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
