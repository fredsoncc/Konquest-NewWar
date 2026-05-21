import React, { useState, useEffect } from "react";
import { 
  GameSession, 
  Player, 
  Planet, 
  Fleet, 
  GameMode, 
  LogEvent 
} from "./types";
import { 
  generatePlanets, 
  calculateTravelTurns, 
  advanceTurnState 
} from "./gameUtils";
import { GalaxyMap } from "./components/GalaxyMap";
import { BluetoothScanner } from "./components/BluetoothScanner";
import { BanterDisplay } from "./components/BanterDisplay";
import { BattleSummaryDisplay } from "./components/BattleSummaryDisplay";
import { 
  Rocket, 
  Radio, 
  Users, 
  User, 
  Zap, 
  Bot, 
  ArrowRight, 
  X, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  ChevronRight, 
  ShieldAlert, 
  CornerDownRight, 
  HelpCircle,
  Clock,
  Layout,
  Wifi,
  Flame,
  Info
} from "lucide-react";

export default function App() {
  // Navigation Screen States
  const [screen, setScreen] = useState<"menu" | "setup" | "bluetooth" | "wifi_lobby" | "playing" | "game_over">("menu");
  
  // Audio state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Setup Options State
  const [selectedMode, setSelectedMode] = useState<GameMode>(GameMode.LOCAL_PASS_AND_PLAY);
  const [playerName, setPlayerName] = useState<string>("Comandante Fredson");
  const [playerColor, setPlayerColor] = useState<string>("emerald");
  const [mapSize, setMapSize] = useState<"small" | "medium" | "large">("medium");
  const [planetsCount, setPlanetsCount] = useState<number>(14);
  const [selectedPersona, setSelectedPersona] = useState<string>("Imperador de Silício");

  // Game Engine State
  const [session, setSession] = useState<GameSession | null>(null);
  
  // Wi-Fi Multiplayer networking helper state
  const [wifiIpAddress, setWifiIpAddress] = useState<string>("");
  const [targetRoomId, setTargetRoomId] = useState<string>("");
  const [isLobbySearching, setIsLobbySearching] = useState<boolean>(false);
  const [netError, setNetError] = useState<string>("");

  // In-turn Orders under construction in the current turn
  // Prior to hitting "ENVIAR TURN" standard
  const [turnOrders, setTurnOrders] = useState<Fleet[]>([]);
  const [selectedOrigin, setSelectedOrigin] = useState<Planet | null>(null);

  // AI thinking indicator
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  // Battle summary show indicator
  const [showBattleSummary, setShowBattleSummary] = useState<boolean>(false);

  // Sound Synth Generator
  const playBeep = (freq: number, type: OscillatorType = "sine", duration = 0.1) => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio engine not allowed
    }
  };

  // Fetch Host IP for Wi-Fi setup info
  useEffect(() => {
    fetch("/api/wi-fi-info")
      .then((res) => res.json())
      .then((data) => {
        if (data.ips && data.ips.length > 0) {
          setWifiIpAddress(data.ips[0]);
        }
      })
      .catch(() => {});
  }, []);

  // Poll Wi-Fi multiplayer room status if we are playing multiplayer
  useEffect(() => {
    if (screen !== "playing" || !session || session.mode !== GameMode.WIFI_MULTIPLAYER) return;

    const timer = setInterval(() => {
      // Only poll when we've completed our turn and are waiting for the opponent
      const myId = getActivePlayerId();
      const hasISubmitted = session.submittedTurns.includes(myId);

      if (hasISubmitted) {
        fetch(`/api/multiplayer/status/${session.roomId}`)
          .then((res) => res.json())
          .then((data: GameSession) => {
            if (data.turn !== session.turn || data.status === "game_over" || data.submittedTurns.length !== session.submittedTurns.length) {
              setSession(data);
              setTurnOrders([]);
              setSelectedOrigin(null);
              playBeep(600, "square", 0.25);
              
              if (data.turn !== session.turn) {
                if (data.lastTurnBattles && data.lastTurnBattles.length > 0) {
                  setShowBattleSummary(true);
                } else {
                  setShowBattleSummary(false);
                }
              }
            }
          })
          .catch(() => {});
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [screen, session]);

  // Retrieve Active Player ID relative to context
  const getActivePlayerId = (): string => {
    if (!session) return "";
    
    if (session.mode === GameMode.LOCAL_PASS_AND_PLAY) {
      // In Local pass-and-play, turns alternate sequentially
      return session.currentTurnPlayerId;
    }
    
    // In Wi-Fi / Bluetooth multiplayer, you are always the host-player (player-host)
    // or the guest-player (player-guest)
    const isGuest = session.players.some(p => p.id === "player-guest" && p.name === playerName);
    return isGuest ? "player-guest" : "player-host";
  };

  const getActivePlayerName = (): string => {
    if (!session) return "";
    const pid = getActivePlayerId();
    return session.players.find(p => p.id === pid)?.name || "Almirante";
  };

  // Turn Dispatch action triggered from the map
  const handleDispatchFleet = (originId: string, targetId: string, ships: number) => {
    if (!session) return;
    const originPlanet = session.planets.find(p => p.id === originId);
    const targetPlanet = session.planets.find(p => p.id === targetId);
    if (!originPlanet || !targetPlanet) return;

    // Validate we own origin
    const currentActPlayer = getActivePlayerId();
    if (originPlanet.ownerId !== currentActPlayer) return;

    // Check we have enough ships left
    const totalAlreadyOrdered = turnOrders
      .filter(o => o.originPlanetId === originId)
      .reduce((sum, f) => sum + f.ships, 0);

    const available = originPlanet.ships - totalAlreadyOrdered;
    if (ships >= available) {
      // Limit to max possible to avoid draining the solar system completely
      ships = available - 1;
    }

    if (ships <= 0) {
      playBeep(150, "sawtooth", 0.15);
      return; 
    }

    const turnsTotal = calculateTravelTurns(originPlanet, targetPlanet);

    const newOrder: Fleet = {
      id: `order-temp-${Date.now()}-${Math.random()}`,
      ownerId: currentActPlayer,
      originPlanetId: originId,
      targetPlanetId: targetId,
      ships: ships,
      turnsTotal,
      turnsRemaining: turnsTotal,
      killPercent: originPlanet.killPercent
    };

    setTurnOrders((prev) => [...prev, newOrder]);
    playBeep(440, "sine", 0.08);
  };

  // Remove a pending dispatch order
  const handleRemoveOrder = (orderId: string) => {
    setTurnOrders((prev) => prev.filter(o => o.id !== orderId));
    playBeep(260, "sine", 0.05);
  };

  // Standard Local/Pass & Play turn commit
  const handleCommitLocalTurn = async () => {
    if (!session) return;

    if (session.mode === GameMode.LOCAL_PASS_AND_PLAY) {
      // Find index of current player to see if there are more
      const humanPlayers = session.players.filter(p => !p.isCPU && !p.isGemini && p.id !== "neutral");
      const currentIdx = humanPlayers.findIndex(p => p.id === session.currentTurnPlayerId);
      
      const sessionCopy = { ...session };
      
      // Store current player orders in overall session to resolve at the end of the round
      if (!sessionCopy.submittedTurns.includes(session.currentTurnPlayerId)) {
        sessionCopy.submittedTurns.push(session.currentTurnPlayerId);
      }

      // We stash the pending turnOrders under a temporary session log or map
      // or we apply them right away if we are the last player of the turn!
      const isLastPlayer = currentIdx === humanPlayers.length - 1;

      if (!isLastPlayer) {
        // Next local player has to play their turn
        const nextPlayer = humanPlayers[currentIdx + 1];
        
        // Cache current orders
        const tempAllOrders = [...(sessionCopy.fleets as any[] || []), ...turnOrders];
        
        // Trigger pass-the-phone popup
        setSession({
          ...sessionCopy,
          currentTurnPlayerId: nextPlayer.id,
          fleets: tempAllOrders as any // carry them over as phantom fleets during pass
        });
        
        // Clear turn states
        setTurnOrders([]);
        setSelectedOrigin(null);
        playBeep(520, "sine", 0.15);
        alert(`Turno de ${getActivePlayerName()} completo! Por favor, passe o dispositivo para ${nextPlayer.name}.`);
      } else {
        // Last human finished. If AI is enabled, process AI moves too
        let cpuOrders: Fleet[] = [];

        // Simple local CPU logic if there's a traditional CPU player
        const cpuPlayers = session.players.filter(p => p.isCPU && !p.isGemini);
        cpuPlayers.forEach(cpu => {
          const cpuPlanets = session.planets.filter(p => p.ownerId === cpu.id);
          cpuPlanets.forEach(p => {
            if (p.ships > 10) {
              // Find weakest neighbor or target planet
              const targets = [...session.planets].sort((a, b) => a.ships - b.ships);
              const target = targets.find(t => t.ownerId !== cpu.id);
              if (target) {
                const turns = calculateTravelTurns(p, target);
                cpuOrders.push({
                  id: `cpu-fleet-${Date.now()}`,
                  ownerId: cpu.id,
                  originPlanetId: p.id,
                  targetPlanetId: target.id,
                  ships: Math.floor(p.ships * 0.5),
                  turnsTotal: turns,
                  turnsRemaining: turns,
                  killPercent: p.killPercent
                });
              }
            }
          });
        });

        const combinedFromAll = [
          ...sessionCopy.fleets.filter(f => f.id.startsWith("order-temp-")), // retrieve cached human orders
          ...turnOrders, // final human orders
          ...cpuOrders
        ];

        // Process physics engine advances
        const advanced = advanceTurnState(sessionCopy, combinedFromAll);
        
        // Reset local loop tracking
        advanced.currentTurnPlayerId = humanPlayers[0].id;
        advanced.submittedTurns = [];

        setSession(advanced);
        setTurnOrders([]);
        setSelectedOrigin(null);
        playBeep(700, "sine", 0.3);

        if (advanced.lastTurnBattles && advanced.lastTurnBattles.length > 0) {
          setShowBattleSummary(true);
        } else {
          setShowBattleSummary(false);
        }

        if (advanced.status === "game_over") {
          setScreen("game_over");
        }
      }
    } 
    
    // Gemini AI Challenge Turn Logic
    else if (session.mode === GameMode.GEMINI_AI_CHALLENGE) {
      setIsAiThinking(true);
      playBeep(330, "sine", 0.4);

      try {
        // 1. Send current board state & human orders to Gemini server endpoint
        const response = await fetch("/api/gemini/make-turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session })
        });
        
        const data = await response.json();
        const geminiPlayer = session.players.find(p => p.isGemini)!;

        // 2. Decode Gemini response choices into fleets
        const geminiFleets: Fleet[] = [];
        if (data.dispatch && Array.isArray(data.dispatch)) {
          data.dispatch.forEach((o: any) => {
            const originPlanet = session.planets.find(p => p.id === o.origin);
            const targetPlanet = session.planets.find(p => p.id === o.target);
            
            if (originPlanet && targetPlanet && originPlanet.ownerId === geminiPlayer.id) {
              const capPercent = Math.max(10, Math.min(90, o.shipsPercent || 50));
              const qty = Math.max(1, Math.floor((originPlanet.ships * capPercent) / 100));
              
              if (qty < originPlanet.ships) {
                const travel = calculateTravelTurns(originPlanet, targetPlanet);
                geminiFleets.push({
                  id: `gemini-ord-${Date.now()}-${Math.random()}`,
                  ownerId: geminiPlayer.id,
                  originPlanetId: originPlanet.id,
                  targetPlanetId: targetPlanet.id,
                  ships: qty,
                  turnsTotal: travel,
                  turnsRemaining: travel,
                  killPercent: originPlanet.killPercent
                });
              }
            }
          });
        }

        // 3. Resolve simultaneously in the engine
        const combined = [...turnOrders, ...geminiFleets];
        const nextSess = advanceTurnState(session, combined);

        // Feed back banter reactions
        nextSess.geminiReaction = data.banter || "Sua frota é insignificante comparada à glória robótica!";
        
        setIsAiThinking(false);
        setSession(nextSess);
        setTurnOrders([]);
        setSelectedOrigin(null);
        playBeep(650, "sine", 0.25);

        if (nextSess.lastTurnBattles && nextSess.lastTurnBattles.length > 0) {
          setShowBattleSummary(true);
        } else {
          setShowBattleSummary(false);
        }

        if (nextSess.status === "game_over") {
          setScreen("game_over");
        }

      } catch (err) {
        setIsAiThinking(false);
        setNetError("Erro de comunicação tática estelar com Gemini AI.");
      }
    }
  };

  // Wi-Fi Direct Server Turn Commit
  const handleCommitWifiTurn = async () => {
    if (!session) return;
    const myId = getActivePlayerId();

    try {
      const response = await fetch(`/api/multiplayer/submit-orders/${session.roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: myId,
          fleets: turnOrders
        })
      });

      if (!response.ok) {
        throw new Error("Falha ao registrar ordens.");
      }

      const data: GameSession = await response.json();
      setSession(data);
      // Keep state clean
      setSelectedOrigin(null);
      playBeep(480, "sine", 0.1);

      if (data.turn !== session.turn) {
        setTurnOrders([]);
        if (data.lastTurnBattles && data.lastTurnBattles.length > 0) {
          setShowBattleSummary(true);
        } else {
          setShowBattleSummary(false);
        }
      }

    } catch (e) {
      setNetError("Erro ao enviar ordens à piconet Wi-Fi.");
    }
  };

  // Launch Local Game Setup Option Screen
  const handleStartSetup = (mode: GameMode) => {
    setSelectedMode(mode);
    setNetError("");
    setScreen("setup");
    playBeep(400, "sine", 0.1);
  };

  // Finish game setup configurations and generate the universe
  const handleLaunchGame = () => {
    setNetError("");

    const hostPlayer: Player = {
      id: "player-host",
      name: playerName || "Hospedeiro",
      color: playerColor,
      isHuman: true,
      isCPU: false,
      isGemini: false
    };

    let playersList: Player[] = [hostPlayer];

    if (selectedMode === GameMode.LOCAL_PASS_AND_PLAY) {
      // Create guest player
      const localGuest: Player = {
        id: "player-guest",
        name: "Oponeo Estelar",
        color: playerColor === "emerald" ? "rose" : "emerald",
        isHuman: true,
        isCPU: false,
        isGemini: false
      };
      playersList.push(localGuest);
    } 
    
    else if (selectedMode === GameMode.GEMINI_AI_CHALLENGE) {
      // Inject AI Commander
      const geminiAI: Player = {
        id: "player-gemini",
        name: selectedPersona,
        color: selectedPersona === "Imperador de Silício" ? "rose" : selectedPersona === "Sindicato de Cromo" ? "cyan" : "violet",
        isHuman: false,
        isCPU: false,
        isGemini: true
      };
      playersList.push(geminiAI);
    }

    const planets = generatePlanets(planetsCount, 14, 8, playersList);

    const newSession: GameSession = {
      roomId: "LOCAL_LOBBY",
      mode: selectedMode,
      status: "playing",
      turn: 1,
      players: playersList,
      planets,
      fleets: [],
      currentTurnPlayerId: "player-host",
      submittedTurns: [],
      logs: [
        {
          id: `log-init-${Date.now()}`,
          turn: 1,
          type: "chat_message",
          playerName: "Sistema",
          playerColor: "text-blue-400",
          message: "A órbita espacial foi estabelecida com sucesso. Motores de dobra ativados!"
        }
      ],
      geminiPersona: selectedPersona,
      geminiReaction: selectedMode === GameMode.GEMINI_AI_CHALLENGE 
        ? "Prepare-se para ser varrido da face deste aglomerado de estrelas!" 
        : undefined
    };

    setSession(newSession);
    setTurnOrders([]);
    setSelectedOrigin(null);
    setScreen("playing");
    playBeep(600, "sine", 0.2);
  };

  // Join Wi-Fi Multiplayer Lobby
  const handleHostWifiLobby = async () => {
    setNetError("");
    setIsLobbySearching(true);

    try {
      const res = await fetch("/api/multiplayer/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostName: playerName,
          hostColor: playerColor,
          planetsCount
        })
      });

      if (!res.ok) throw new Error("Erro de conexão com piconet");

      const data: GameSession = await res.json();
      setSession(data);
      setScreen("wifi_lobby");
      setIsLobbySearching(false);
      playBeep(580, "sine", 0.15);

    } catch (err: any) {
      setIsLobbySearching(false);
      setNetError("Erro ao registrar servidor Wi-Fi de naves.");
    }
  };

  const handleJoinWifiLobby = async () => {
    if (!targetRoomId) {
      setNetError("Por favor informe o código da sala.");
      return;
    }
    setNetError("");
    setIsLobbySearching(true);

    try {
      const res = await fetch("/api/multiplayer/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: targetRoomId,
          playerName: playerName,
          playerColor: playerColor === "emerald" ? "rose" : "emerald"
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Código de sala inválido ou indisponível.");
      }

      const data: GameSession = await res.json();
      setSession(data);
      setScreen("playing");
      setIsLobbySearching(false);
      playBeep(720, "sine", 0.25);

    } catch (err: any) {
      setIsLobbySearching(false);
      setNetError(err.message || "Erro de pareamento Wi-Fi.");
    }
  };

  // Exit game and clean up active session resources
  const exitGameToMenu = () => {
    if (session && session.mode === GameMode.WIFI_MULTIPLAYER) {
      fetch(`/api/multiplayer/leave/${session.roomId}`, { method: "POST" }).catch(() => {});
    }
    setSession(null);
    setTurnOrders([]);
    setSelectedOrigin(null);
    setScreen("menu");
    playBeep(220, "sine", 0.1);
  };

  return (
    <div className="w-full h-full bg-[#0B0B0F] text-slate-200 font-sans flex flex-col overflow-hidden relative">
      
      {/* Dynamic Starry field background in line with Elegant Dark guidelines */}
      <div className="absolute inset-0 pointer-events-none opacity-30 z-0">
        <div className="absolute w-2 h-2 bg-white rounded-full top-20 left-40 shadow-[0_0_8px_#fff]"></div>
        <div className="absolute w-1 h-1 bg-white rounded-full top-60 left-1/4"></div>
        <div className="absolute w-1.5 h-1.5 bg-cyan-400 rounded-full top-1/2 left-3/4 shadow-[0_0_6px_#22d3ee]"></div>
        <div className="absolute w-1 h-1 bg-white rounded-full bottom-20 left-10"></div>
        <div className="absolute w-2 h-2 bg-purple-400 rounded-full top-10 right-20 shadow-[0_0_8px_#c084fc]"></div>
      </div>

      {/* Android Status Bar Mockup */}
      <div className="flex justify-between items-center px-6 py-2.5 text-[11px] font-bold tracking-tight text-slate-500 bg-black/40 backdrop-blur-md z-50 shrink-0 select-none">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>22:04</span>
        </span>
        <div className="flex gap-4 items-center">
          <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase font-black tracking-widest flex items-center gap-1">
            <Layout className="w-3 h-3" /> Android Touch
          </span>
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)} 
            className="text-slate-550 hover:text-slate-350 p-0.5"
            title="Toggle Sound Beeps"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <div className="flex gap-1 items-center">
            <span className="font-mono">88%</span>
            <div className="w-5 h-2.5 bg-slate-800 rounded-sm border border-slate-700 p-0.5 flex-row">
              <div className="h-full bg-emerald-500 rounded-xs w-4"></div>
            </div>
          </div>
        </div>
      </div>

      {/* SCREEN 1: MAIN MENU MENU */}
      {screen === "menu" && (
        <div className="flex-1 flex flex-col justify-between p-6 md:p-8 z-10 max-w-3xl mx-auto w-full overflow-y-auto">
          
          {/* Menu Header Area */}
          <header className="py-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/15 text-blue-400 rounded-full border border-blue-500/20 text-[10px] font-black uppercase tracking-widest mb-3 select-none">
              <Radio className="w-3 h-3 animate-pulse" /> Galactic conquest protocol
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-teal-400 to-emerald-400 drop-shadow-[0_4px_12px_rgba(59,130,246,0.15)] uppercase">
              KONQUEST
            </h1>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 font-medium leading-relaxed">
              Expanda suas indústrias, comande frotas imperiais e domine mundos em uma recriação moderna do clássico jogo de estratégia do KDE com multiplayer sem fio.
            </p>
          </header>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-3 my-4">
            <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3 text-center">
              <span className="block text-[20px] font-black text-blue-400 font-mono">35%</span>
              <span className="text-[10px] font-bold text-slate-450 uppercase">Média Tiro</span>
            </div>
            <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3 text-center">
              <span className="block text-[20px] font-black text-amber-500 font-mono">14+</span>
              <span className="text-[10px] font-bold text-slate-450 uppercase">Planetas</span>
            </div>
            <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3 text-center">
              <span className="block text-[20px] font-black text-emerald-400 font-mono">Offline</span>
              <span className="text-[10px] font-bold text-slate-450 uppercase">ou local</span>
            </div>
          </div>

          {/* Menu Selection list in style of design layout */}
          <nav className="flex flex-col gap-4 my-2">
            
            {/* Solo Challenge mode against Gemini API AI */}
            <button
              id="btn-mode-gemini"
              onClick={() => handleStartSetup(GameMode.GEMINI_AI_CHALLENGE)}
              className="group flex flex-col p-5 md:p-6 rounded-2xl bg-gradient-to-br from-slate-900/60 to-black/80 border border-white/5 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all text-left relative overflow-hidden active:scale-[0.98]"
            >
              <div className="absolute right-4 top-4 text-blue-500 opacity-60 group-hover:scale-110 transition-transform">
                <Bot className="w-6 h-6" />
              </div>
              <span className="text-blue-400 font-black text-[10px] mb-1 uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> DESAFIO INTELIGENTE
              </span>
              <span className="text-xl font-bold text-white leading-tight">Duelo de IA Gemini</span>
              <span className="text-xs text-slate-400 mt-2 max-w-sm">
                Enfrente um Comandante Gemini que planeja as defesas e faz provocações táticas ao longo dos turnos em português.
              </span>
            </button>

            {/* Direct pass and play hotseat */}
            <button
              id="btn-mode-pass-play"
              onClick={() => handleStartSetup(GameMode.LOCAL_PASS_AND_PLAY)}
              className="group flex flex-col p-5 md:p-6 rounded-2xl bg-gradient-to-br from-slate-900/60 to-black/80 border border-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all text-left relative overflow-hidden active:scale-[0.98]"
            >
              <div className="absolute right-4 top-4 text-emerald-400 opacity-60">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-emerald-400 font-black text-[10px] mb-1 uppercase tracking-widest">
                HOTSEAT LOCAL
              </span>
              <span className="text-xl font-bold text-white leading-tight">Passar e Jogar</span>
              <span className="text-xs text-slate-400 mt-2 max-w-sm">
                Partida local na mesma tela touch do Android. O motor do jogo oculta as ordens de voo até o final do turno para manter o mistério.
              </span>
            </button>

            {/* Wi-Fi direct connection */}
            <button
              id="btn-mode-wifi"
              onClick={() => handleStartSetup(GameMode.WIFI_MULTIPLAYER)}
              className="group flex flex-col p-5 md:p-6 rounded-2xl bg-gradient-to-br from-slate-900/60 to-black/80 border border-white/5 hover:border-teal-500/50 hover:bg-teal-500/10 transition-all text-left relative overflow-hidden active:scale-[0.98]"
            >
              <div className="absolute right-4 top-4 text-teal-400 opacity-60">
                <Wifi className="w-6 h-6" />
              </div>
              <span className="text-teal-400 font-black text-[10px] mb-1 uppercase tracking-widest">
                LAN DIRECT CONNECTION
              </span>
              <span className="text-xl font-bold text-white leading-tight font-sans">Multiplayer Wi-Fi Rede</span>
              <span className="text-xs text-slate-400 mt-2 max-w-sm">
                Crie ou entre em salas de jogo na mesma rede Wi-Fi local para atualizar lances táticos e decolagens em tempo real.
              </span>
            </button>

            {/* Mock Bluetooth pareamento */}
            <button
              id="btn-mode-bluetooth"
              onClick={() => setScreen("bluetooth")}
              className="group flex flex-col p-5 md:p-6 rounded-2xl bg-blue-600 border border-blue-400 text-white shadow-[0_0_30px_rgba(37,99,235,0.2)] hover:brightness-110 transition-all text-left relative overflow-hidden active:scale-[0.98]"
            >
              <div className="absolute right-4 top-4 text-blue-200">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <span className="text-blue-100 font-black text-[10px] mb-1 uppercase tracking-widest">
                BLUETOOTH PAIRING MESH
              </span>
              <span className="text-xl font-bold font-sans">Sincronia Bluetooth</span>
              <span className="text-xs text-blue-100 mt-2 max-w-sm">
                Utilize o rádio Bluetooth integrado do dispositivo simulado para descobrir e parear combatentes em curtas distâncias de rádio.
              </span>
            </button>

          </nav>

          {/* Footer of menu screen */}
          <footer className="text-center py-4 text-[10px] text-slate-600 flex flex-col items-center justify-center gap-1 selection:none">
            <div className="flex items-center justify-center gap-1">
              <Info className="w-3.5 h-3.5 text-slate-700" />
              <span>KDE Games • Adaptado para Smart Android Touchscreens 2026</span>
            </div>
            <span className="text-[11px] font-black tracking-widest text-slate-500 hover:text-slate-400 mt-1 cursor-default uppercase transition-colors">
              Fcc Games
            </span>
          </footer>

        </div>
      )}

      {/* SCREEN 2: GAME SETUP SCREEN */}
      {screen === "setup" && (
        <div className="flex-1 flex flex-col justify-between p-6 md:p-8 z-10 max-w-md mx-auto w-full overflow-y-auto">
          
          <div className="space-y-6">
            <div>
              <button 
                onClick={() => setScreen("menu")} 
                className="text-xs text-slate-500 hover:text-white mb-2 flex items-center gap-1"
              >
                ← Voltar ao Menu
              </button>
              <h2 className="text-2xl font-black tracking-tight text-white uppercase">
                Ajuste de Quadrante
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure os parâmetros de frota e tamanho da galáxia antes do início da invasão.
              </p>
            </div>

            {/* Form list fields */}
            <div className="space-y-4">
              
              {/* Player Name Tag */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Identificador de Voo (Seu Nome)</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 font-medium"
                  placeholder="Seu nome"
                />
              </div>

              {/* Home Planet Colors Choose */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Assinatura de Rádio (Sua Cor de Planeta)</label>
                <div className="flex gap-2">
                  {[
                    { id: "emerald", label: "Emerald", hex: "bg-emerald-500" },
                    { id: "cyan", label: "Cyan", hex: "bg-cyan-500" },
                    { id: "amber", label: "Amber", hex: "bg-amber-500" },
                    { id: "violet", label: "Violet", hex: "bg-violet-500" }
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setPlayerColor(c.id)}
                      className={`w-9 h-9 rounded-full ${c.hex} transition-transform active:scale-90 relative ${
                        playerColor === c.id ? "ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-105" : ""
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Map Density Planets Size */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Densidade Galáctica (Nº de Planetas)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "small", label: "Concentrado", count: 10 },
                    { id: "medium", label: "Mediano", count: 15 },
                    { id: "large", label: "Vasto", count: 22 }
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setMapSize(m.id as any);
                        setPlanetsCount(m.count);
                      }}
                      className={`py-3 text-xs font-bold rounded-xl border transition-colors ${
                        mapSize === m.id 
                          ? "bg-blue-500/20 text-blue-400 border-blue-500" 
                          : "bg-slate-950 text-slate-400 border-slate-850 hover:bg-slate-900"
                      }`}
                    >
                      {m.label} ({m.count} pl)
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Personality choose for Gemini mode */}
              {selectedMode === GameMode.GEMINI_AI_CHALLENGE && (
                <div className="flex flex-col gap-1.5 bg-blue-950/20 border border-blue-900/30 p-3 rounded-xl">
                  <label className="text-[11px] font-black text-blue-400 uppercase tracking-wider flex items-center gap-1">
                    <Bot className="w-3.5 h-3.5" /> Arquivo de Personalidade Gemini AI
                  </label>
                  <p className="text-[10px] text-slate-400 mb-2">Comandantes de IA respondem de formas sarcásticas distintas.</p>
                  <select
                    value={selectedPersona}
                    onChange={(e) => setSelectedPersona(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Imperador de Silício">Imperador de Silício (Poderoso & Conquistador)</option>
                    <option value="Sindicato de Cromo">Sindicato de Cromo (Sardônico, Mercenário)</option>
                    <option value="Protetorado de Fóton">Protetorado de Fóton (Místico, Falante Trascendental)</option>
                  </select>
                </div>
              )}

              {/* Networking details descriptor */}
              {selectedMode === GameMode.WIFI_MULTIPLAYER && (
                <div className="p-3 bg-teal-950/20 border border-teal-900/30 rounded-xl space-y-2.5">
                  <span className="text-[11px] font-black text-teal-400 uppercase tracking-wider flex items-center gap-1">
                    <Wifi className="w-3.5 h-3.5" /> Informações de Pareamento LAN
                  </span>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Seu endereço Wi-Fi simulado é <strong className="text-white font-mono">{wifiIpAddress || "192.168.1.104"}</strong>. Outro jogador Android pode se conectar à sua antena.
                  </p>
                  
                  <div className="border-t border-teal-900/40 pt-2.5 flex flex-col gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold block">ENTRAR EM SALA DE AMIGO EXCITANTE</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Código, ex: RFXG"
                        value={targetRoomId}
                        onChange={(e) => setTargetRoomId(e.target.value.toUpperCase())}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-xs text-white uppercase focus:outline-none w-28"
                        maxLength={4}
                      />
                      <button
                        onClick={handleJoinWifiLobby}
                        className="flex-1 py-1.5 bg-slate-850 hover:bg-slate-800 rounded-lg text-xs font-bold font-mono text-slate-200 active:scale-95"
                      >
                        Parear Sala
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Network Failure logs */}
          {netError && (
            <div className="my-4 p-3 bg-rose-950/30 border border-rose-900 text-rose-400 text-xs rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <p>{netError}</p>
            </div>
          )}

          {/* Launch Action */}
          <div className="mt-8 flex flex-col gap-2.5">
            {selectedMode === GameMode.WIFI_MULTIPLAYER ? (
              <button
                onClick={handleHostWifiLobby}
                disabled={isLobbySearching}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-teal-950/30 flex items-center justify-center gap-2"
              >
                {isLobbySearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : "CRIAR LOBBY WI-FI"}
              </button>
            ) : (
              <button
                onClick={handleLaunchGame}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-950/30"
              >
                INICIAR BATALHA ORBITAL
              </button>
            )}
            <button
              onClick={() => setScreen("menu")}
              className="w-full py-3 text-slate-400 hover:text-white text-xs font-bold text-center"
            >
              Cancelar
            </button>
          </div>

        </div>
      )}

      {/* SCREEN 3: BLUETOOTH PAIRING DISCOVERY SCREEN */}
      {screen === "bluetooth" && (
        <div className="flex-1 flex items-center justify-center p-4 z-10">
          <BluetoothScanner 
            onDevicePaired={(guest) => {
              // Automatically kickstart local game using newly discovered Bluetooth buddy!
              const hostPlayer: Player = {
                id: "player-host",
                name: playerName || "Hospedeiro",
                color: playerColor,
                isHuman: true,
                isCPU: false,
                isGemini: false
              };

              const playersList = [hostPlayer, guest];
              const planets = generatePlanets(14, 14, 8, playersList);

              const newSession: GameSession = {
                roomId: "BT_PICONET_ROOM",
                mode: GameMode.SIMULATED_BLUETOOTH,
                status: "playing",
                turn: 1,
                players: playersList,
                planets,
                fleets: [],
                currentTurnPlayerId: "player-host",
                submittedTurns: [],
                logs: [
                  {
                    id: `log-bt-${Date.now()}`,
                    turn: 1,
                    type: "chat_message",
                    playerName: "Sistema Bluetooth",
                    playerColor: "text-blue-400",
                    message: `Canal piconet SPP ativo com dispositivo pareado: ${guest.name}.`
                  }
                ]
              };

              setSession(newSession);
              setTurnOrders([]);
              setSelectedOrigin(null);
              setScreen("playing");
              playBeep(800, "square", 0.3);
            }}
            onCancel={() => setScreen("menu")}
          />
        </div>
      )}

      {/* SCREEN 4: WI-FI MULTIPLAYER HOST LOBBY */}
      {screen === "wifi_lobby" && session && (
        <div className="flex-1 flex flex-col justify-between p-6 md:p-8 z-10 max-w-md mx-auto w-full overflow-y-auto">
          
          <div className="space-y-6 text-center py-6">
            <div className="w-16 h-16 rounded-full bg-teal-500/10 border border-teal-500 text-teal-400 mx-auto flex items-center justify-center animate-pulse">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white uppercase">Aguardando Desafiante LAN</h2>
              <p className="text-xs text-slate-400">Diga o código ou IP abaixo para conectar-se.</p>
            </div>

            {/* Huge touch credentials indicator tags */}
            <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex flex-col items-center justify-center space-y-3">
              <div>
                <span className="text-[10px] font-black text-slate-500 uppercase">CÓDIGO DA SALA</span>
                <span className="block text-4xl font-black text-amber-400 font-mono tracking-widest">{session.roomId}</span>
              </div>
              <div className="w-full border-t border-slate-900 pt-3">
                <span className="text-[10px] font-black text-slate-500 uppercase">IP PAREAMENTO DE ASSISTÊNCIA</span>
                <span className="block text-sm font-semibold text-teal-400 font-mono">{wifiIpAddress || "192.168.1.104"}</span>
              </div>
            </div>

            <div className="bg-slate-950/30 p-3 rounded-lg border border-slate-900 text-left text-xs space-y-1 text-slate-400">
              <strong className="text-slate-300 block">Jogadores Conectados Atualmente:</strong>
              {session.players.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  <span>{p.name} {p.id === "player-host" ? "(Host)" : ""}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={async () => {
                // Instantly query server state to verify client joined in standard test sandbox if needed
                const res = await fetch(`/api/multiplayer/status/${session.roomId}`);
                const data = await res.json();
                if (data.players.length >= 2) {
                  setSession(data);
                  setScreen("playing");
                  playBeep(700, "sine", 0.2);
                } else {
                  alert("Nenhum outro jogador entrou no lobby ainda.");
                }
              }}
              className="w-full py-4 font-bold text-xs bg-slate-800 text-slate-200 border border-slate-700/60 rounded-xl hover:bg-slate-750 active:scale-95"
            >
              VERIFICAR PAREAMENTO MANUALMENTE
            </button>
            <button
              onClick={exitGameToMenu}
              className="w-full py-3 text-slate-400 hover:text-white text-xs font-bold"
            >
              Desfazer Sala
            </button>
          </div>

        </div>
      )}

      {/* SCREEN 5: MASSIVE INTERACTIVE PLAYING WORLD */}
      {screen === "playing" && session && (
        <div className="flex-1 flex flex-col md:grid md:grid-cols-12 overflow-hidden z-20">
          
          {/* LEFT: Game universe Map Viewboard (column 8 span on tablet sizes) */}
          <div className="flex-1 md:col-span-8 flex flex-col overflow-hidden relative">
            
            {/* Playing subheader panel */}
            <div className="bg-slate-950/80 backdrop-blur-md px-4 py-2 border-b border-white/5 flex items-center justify-between select-none">
              
              <div className="flex items-center gap-2.5">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">
                    Turno {session.turn}
                  </span>
                  <span className="text-xs font-black text-amber-400 leading-none mt-1 uppercase">
                    {session.mode === GameMode.LOCAL_PASS_AND_PLAY ? "PASS & PLAY" : "PICOMESH ACTIVE"}
                  </span>
                </div>
                <div className="text-slate-700">|</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-350">Jogador de Lance:</span>
                  <span className="text-xs font-black bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-white flex items-center gap-1">
                    <span 
                      className="w-2 h-2 rounded-full inline-block" 
                      style={{ 
                        backgroundColor: session.players.find(p => p.id === getActivePlayerId())?.color === "emerald" 
                          ? "#10b981" : session.players.find(p => p.id === getActivePlayerId())?.color === "rose" 
                          ? "#f43f5e" : session.players.find(p => p.id === getActivePlayerId())?.color === "cyan" 
                          ? "#06b6d4" : "#eab308"
                      }} 
                    />
                    {getActivePlayerName()}
                  </span>
                </div>
              </div>

              {/* Secondary actions */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono bg-slate-900 border border-slate-850 px-2 py-1 rounded text-slate-400">
                  {session.mode === GameMode.WIFI_MULTIPLAYER ? `Sala: ${session.roomId}` : "Offline"}
                </span>
                <button
                  onClick={exitGameToMenu}
                  className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-rose-400 transition-colors"
                  title="Abandonar Conquista"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

            </div>

            {/* Core map canvas container */}
            <div className="flex-1 overflow-hidden relative">
              <GalaxyMap
                planets={session.planets}
                fleets={session.fleets}
                players={session.players}
                activePlayerId={getActivePlayerId()}
                onDispatchFleet={handleDispatchFleet}
                selectedOrigin={selectedOrigin}
                setSelectedOrigin={setSelectedOrigin}
              />
            </div>

          </div>

          {/* RIGHT: Active Combat Dashboard, Fleets command and turn log events */}
          <div className="h-2/5 md:h-full md:col-span-4 bg-slate-950 border-t md:border-t-0 md:border-l border-white/5 flex flex-col overflow-hidden">
            
            {/* Header selection tab stats summary */}
            <div className="bg-slate-900/60 p-3 border-b border-white/5 flex items-center justify-between select-none">
              <span className="text-[11px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-1">
                <Rocket className="w-3.5 h-3.5 text-blue-400" />
                Painel Tático {session.mode === GameMode.GEMINI_AI_CHALLENGE ? "IA" : "Local"}
              </span>
              
              <div className="text-[10px] text-slate-500 font-mono">
                {session.planets.filter(p => p.ownerId === getActivePlayerId()).length} planetas sob comando
              </div>
            </div>

            {/* Active chat banter row if playing against Gemini AI */}
            {session.mode === GameMode.GEMINI_AI_CHALLENGE && (
              <div className="p-3 bg-slate-950 border-b border-white/5">
                <BanterDisplay
                  personaName={session.geminiPersona || "Imperador de Silício"}
                  banterText={session.geminiReaction || "Faça sua jogada. Minhas naves estão pranchando seu quadrante!"}
                  isThinking={isAiThinking}
                />
              </div>
            )}

            {/* Scrollable list content */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              
              {/* BATTLE RESOLUTION SUMMARY IF AVAILABLE AND ACTIVE */}
              {showBattleSummary && session.lastTurnBattles && session.lastTurnBattles.length > 0 && (
                <BattleSummaryDisplay
                  battles={session.lastTurnBattles}
                  onDismiss={() => setShowBattleSummary(false)}
                  turnNumber={session.turn}
                />
              )}

              {/* CURRENT TURN DISPATCH ORDERS UNDER CONSTRUCTION */}
              <div>
                <span className="text-[10px] font-black tracking-widest text-slate-550 block uppercase mb-2">
                  Decolagens Pendentes {session.mode === GameMode.WIFI_MULTIPLAYER ? "(Envio simultâneo)" : ""}
                </span>

                {turnOrders.length === 0 ? (
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900 text-center text-xs text-slate-500">
                    Nenhuma frota adicionada à fila de decolagem. Toque no mapa acima para decolar!
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {turnOrders.map((f) => {
                      const origin = session.planets.find(p => p.id === f.originPlanetId);
                      const target = session.planets.find(p => p.id === f.targetPlanetId);

                      return (
                        <div
                          key={f.id}
                          className="flex items-center justify-between p-2.5 bg-slate-900/40 border border-slate-900 rounded-xl"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 w-5 h-5 rounded-full flex items-center justify-center">
                              {f.ships}
                            </span>
                            <div className="flex flex-col text-left">
                              <span className="text-[11px] font-bold text-slate-200">
                                {origin?.name || f.originPlanetId} → {target?.name || f.targetPlanetId}
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono">
                                Tempo: {f.turnsTotal} turnos ({f.killPercent * 100}% de pontaria)
                              </span>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleRemoveOrder(f.id)}
                            className="p-1 hover:bg-slate-800 text-slate-550 hover:text-rose-400 rounded-lg"
                            title="Remover frota"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* TIMELINE ARCHIVE TURNS EVENTS LOGS */}
              <div>
                <span className="text-[10px] font-black tracking-widest text-slate-550 block uppercase mb-2">
                  Log tático militar da galáxia
                </span>

                <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-2 h-44 overflow-y-auto space-y-2 font-mono">
                  {session.logs.length === 0 ? (
                    <p className="text-[10px] text-slate-600 italic text-center pt-8">Nenhum evento registrado ainda.</p>
                  ) : (
                    session.logs.map((log) => (
                      <div key={log.id} className="text-[10px] border-b border-slate-900/60 pb-1.5 leading-snug">
                        <div className="flex items-center gap-1">
                          <span className="text-amber-500/70">T.{log.turn}</span>
                          <span className={`font-bold ${log.playerColor}`}>{log.playerName}</span>
                        </div>
                        <p className="text-slate-350">{log.message}</p>
                        {log.details && (
                          <span className="text-[9px] text-slate-550 block mt-0.5">{log.details}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Commit / Submittal actions area */}
            <div className="p-4 bg-slate-900 border-t border-white/5 shrink-0">
              
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="text-slate-400 font-medium">Estado do lance:</span>
                {session.submittedTurns.includes(getActivePlayerId()) ? (
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 animate-pulse">
                    Preparado. Aguardando outro...
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    Aguardando decolagem
                  </span>
                )}
              </div>

              {session.mode === GameMode.WIFI_MULTIPLAYER ? (
                <button
                  id="btn-commit-wifi-turn"
                  onClick={handleCommitWifiTurn}
                  disabled={session.submittedTurns.includes(getActivePlayerId())}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-transform active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none"
                >
                  Confirmar turnos de decolagem
                </button>
              ) : (
                <button
                  id="btn-commit-local-turn"
                  onClick={handleCommitLocalTurn}
                  disabled={isAiThinking}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-transform active:scale-[0.98] disabled:opacity-40"
                >
                  {isAiThinking ? "Ia processando cálculos do vácuo..." : "CONFIRMAR E PROCESSAR TURNO"}
                </button>
              )}
            </div>

          </div>

        </div>
      )}

      {/* SCREEN 6: GAME OVER SUMMARY STATUS */}
      {screen === "game_over" && session && (
        <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-8 z-10 max-w-md mx-auto w-full text-center">
          
          <div className="w-20 h-20 rounded-full bg-blue-500/10 border border-blue-500/40 text-blue-400 flex items-center justify-center animate-bounce mb-6">
            <Rocket className="w-10 h-10 rotate-45" />
          </div>

          <h2 className="text-4xl font-black tracking-tighter text-white uppercase leading-none">
            Guerra Concluída
          </h2>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            O quadrante espacial encontrou um novo balanço de forças.
          </p>

          <div className="w-full bg-slate-950 border border-slate-850 p-5 rounded-2xl my-6 space-y-4 text-left">
            
            <div className="border-b border-slate-900 pb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Vencedor Final</span>
              {session.winnerId ? (
                <span className="text-sm font-black text-emerald-400">
                  {session.players.find((p) => p.id === session.winnerId)?.name || session.winnerId}
                </span>
              ) : (
                <span className="text-sm font-black text-amber-500">Desencontro / Empate</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-slate-900/60 p-3 rounded-xl">
                <span className="text-[10px] font-black text-slate-500 uppercase block">Total Turnos</span>
                <span className="text-lg font-bold text-white font-mono">{session.turn}</span>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-xl">
                <span className="text-[10px] font-black text-slate-500 uppercase block">Planetas Restantes</span>
                <span className="text-lg font-bold text-white font-mono">
                  {session.planets.filter((p) => p.ownerId !== null && p.ownerId !== "neutral").length}
                </span>
              </div>
            </div>

          </div>

          <button
            onClick={exitGameToMenu}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 to-teal-500 text-slate-950 font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-transform"
          >
            Voltar ao Menu Principal
          </button>

        </div>
      )}

      {/* Styled Android Soft Navigation Bar Mockup to perfect the aesthetic */}
      <footer className="h-14 bg-[#050508] border-t border-white/5 flex justify-around items-center z-50 shrink-0 select-none">
        <button 
          onClick={() => {
            if (screen !== "menu") {
              exitGameToMenu();
            }
          }}
          className="flex flex-col items-center gap-1 opacity-50 hover:opacity-100 transition-opacity"
        >
          <div className="w-5 h-5 border-2 border-slate-400 rounded-sm"></div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Voltar</span>
        </button>
        <button 
          onClick={exitGameToMenu}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-6 h-6 bg-blue-500 rounded-full shadow-[0_0_12px_#3b82f6]"></div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-blue-400">Início</span>
        </button>
        <button 
          onClick={() => alert("Exibindo seletor de aplicativos ativos (Protocolo Android)")}
          className="flex flex-col items-center gap-1 opacity-50 hover:opacity-100 transition-opacity"
        >
          <div className="w-0 h-0 border-l-[11px] border-l-transparent border-r-[11px] border-r-transparent border-b-[18px] border-b-slate-400 rotate-90 scale-90"></div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Menu</span>
        </button>
      </footer>

    </div>
  );
}
