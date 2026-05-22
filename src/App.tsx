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
import { BanterDisplay } from "./components/BanterDisplay";
import { BattleSummaryDisplay } from "./components/BattleSummaryDisplay";
import { GameIntroTrailer } from "./components/GameIntroTrailer";
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
  Info,
  Trophy,
  Award,
  Crown,
  Sparkles
} from "lucide-react";

export interface HighScore {
  id: string;
  playerName: string;
  playerColor: string;
  score: number;
  planetsCount: number;
  shipsCount: number;
  turns: number;
  rankInMatch: number;
  mode: GameMode;
  date: string;
}

export default function App() {
  // Navigation Screen States
  const [screen, setScreen] = useState<"intro" | "menu" | "setup" | "wifi_lobby" | "playing" | "game_over" | "scores">("intro");
  
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
  const [myPlayerId, setMyPlayerId] = useState<string>("");

  // In-turn Orders under construction in the current turn
  // Prior to hitting "ENVIAR TURN" standard
  const [turnOrders, setTurnOrders] = useState<Fleet[]>([]);
  const [selectedOrigin, setSelectedOrigin] = useState<Planet | null>(null);

  // AI thinking indicator
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [isUsingFallbackAi, setIsUsingFallbackAi] = useState<boolean>(false);

  // Battle summary show indicator
  const [showBattleSummary, setShowBattleSummary] = useState<boolean>(false);

  // Modal alert for victory / defeat notify at the end of the game
  const [showGameOverModal, setShowGameOverModal] = useState<boolean>(false);

  // Turn tracking states to notify active player of their turn
  const [showYourTurnModal, setShowYourTurnModal] = useState<boolean>(false);
  const [lastNotifiedTurnKey, setLastNotifiedTurnKey] = useState<string>("");

  // Hidden tactical log by default indicator
  const [showTacticalLog, setShowTacticalLog] = useState<boolean>(false);

  // High Scores persistent state
  const [highScores, setHighScores] = useState<HighScore[]>([]);

  // Load high scores and seed defaults if none exist
  useEffect(() => {
    const stored = localStorage.getItem("konquest_high_scores");
    if (stored) {
      try {
        setHighScores(JSON.parse(stored));
      } catch (e) {
        // invalid JSON
      }
    } else {
      const defaults: HighScore[] = [
        { id: "def-1", playerName: "Luke Skywalker", playerColor: "cyan", score: 14200, planetsCount: 9, shipsCount: 160, turns: 11, rankInMatch: 1, mode: GameMode.GEMINI_AI_CHALLENGE, date: "2026-05-20" },
        { id: "def-2", playerName: "Almirante Adama", playerColor: "blue", score: 11800, planetsCount: 8, shipsCount: 135, turns: 14, rankInMatch: 1, mode: GameMode.LOCAL_PASS_AND_PLAY, date: "2026-05-18" },
        { id: "def-3", playerName: "Mestre Yoda", playerColor: "emerald", score: 9500, planetsCount: 7, shipsCount: 110, turns: 16, rankInMatch: 1, mode: GameMode.GEMINI_AI_CHALLENGE, date: "2026-05-21" },
        { id: "def-4", playerName: "Comandante Shepard", playerColor: "rose", score: 7100, planetsCount: 5, shipsCount: 85, turns: 18, rankInMatch: 2, mode: GameMode.LOCAL_PASS_AND_PLAY, date: "2026-05-15" },
        { id: "def-5", playerName: "Spock", playerColor: "violet", score: 5800, planetsCount: 4, shipsCount: 70, turns: 22, rankInMatch: 2, mode: GameMode.GEMINI_AI_CHALLENGE, date: "2026-05-19" },
        { id: "def-6", playerName: "Darth Vader", playerColor: "rose", score: 4900, planetsCount: 4, shipsCount: 65, turns: 25, rankInMatch: 2, mode: GameMode.GEMINI_AI_CHALLENGE, date: "2026-05-10" },
        { id: "def-7", playerName: "Star-Lord", playerColor: "amber", score: 3800, planetsCount: 3, shipsCount: 50, turns: 19, rankInMatch: 3, mode: GameMode.LOCAL_PASS_AND_PLAY, date: "2026-05-11" },
        { id: "def-8", playerName: "C-3PO", playerColor: "amber", score: 2100, planetsCount: 2, shipsCount: 30, turns: 30, rankInMatch: 3, mode: GameMode.LOCAL_PASS_AND_PLAY, date: "2026-05-21" },
      ];
      localStorage.setItem("konquest_high_scores", JSON.stringify(defaults));
      setHighScores(defaults);
    }
  }, []);

  const handleResetScores = () => {
    const defaults: HighScore[] = [
      { id: "def-1", playerName: "Luke Skywalker", playerColor: "cyan", score: 14200, planetsCount: 9, shipsCount: 160, turns: 11, rankInMatch: 1, mode: GameMode.GEMINI_AI_CHALLENGE, date: "2026-05-20" },
      { id: "def-2", playerName: "Almirante Adama", playerColor: "blue", score: 11800, planetsCount: 8, shipsCount: 135, turns: 14, rankInMatch: 1, mode: GameMode.LOCAL_PASS_AND_PLAY, date: "2026-05-18" },
      { id: "def-3", playerName: "Mestre Yoda", playerColor: "emerald", score: 9500, planetsCount: 7, shipsCount: 110, turns: 16, rankInMatch: 1, mode: GameMode.GEMINI_AI_CHALLENGE, date: "2026-05-21" },
      { id: "def-4", playerName: "Comandante Shepard", playerColor: "rose", score: 7100, planetsCount: 5, shipsCount: 85, turns: 18, rankInMatch: 2, mode: GameMode.LOCAL_PASS_AND_PLAY, date: "2026-05-15" },
      { id: "def-5", playerName: "Spock", playerColor: "violet", score: 5800, planetsCount: 4, shipsCount: 70, turns: 22, rankInMatch: 2, mode: GameMode.GEMINI_AI_CHALLENGE, date: "2026-05-19" },
      { id: "def-6", playerName: "Darth Vader", playerColor: "rose", score: 4900, planetsCount: 4, shipsCount: 65, turns: 25, rankInMatch: 2, mode: GameMode.GEMINI_AI_CHALLENGE, date: "2026-05-10" },
      { id: "def-7", playerName: "Star-Lord", playerColor: "amber", score: 3800, planetsCount: 3, shipsCount: 50, turns: 19, rankInMatch: 3, mode: GameMode.LOCAL_PASS_AND_PLAY, date: "2026-05-11" },
      { id: "def-8", playerName: "C-3PO", playerColor: "amber", score: 2100, planetsCount: 2, shipsCount: 30, turns: 30, rankInMatch: 3, mode: GameMode.LOCAL_PASS_AND_PLAY, date: "2026-05-21" },
    ];
    localStorage.setItem("konquest_high_scores", JSON.stringify(defaults));
    setHighScores(defaults);
    playBeep(400, "square", 0.3);
  };

  const documentScores = (endedSession: GameSession) => {
    const sortedPerformers = [...endedSession.players].map((player) => {
      const pCount = endedSession.planets.filter(p => p.ownerId === player.id).length;
      const planetShips = endedSession.planets.filter(p => p.ownerId === player.id).reduce((sum, p) => sum + p.ships, 0);
      const fleetShips = endedSession.fleets.filter(f => f.ownerId === player.id).reduce((sum, f) => sum + f.ships, 0);
      const sCount = planetShips + fleetShips;
      
      return {
        player,
        planetsCount: pCount,
        shipsCount: sCount
      };
    }).sort((a, b) => {
      if (a.planetsCount !== b.planetsCount) {
        return b.planetsCount - a.planetsCount;
      }
      return b.shipsCount - a.shipsCount;
    });

    const stored = localStorage.getItem("konquest_high_scores");
    let currentHighs: HighScore[] = [];
    if (stored) {
      try {
        currentHighs = JSON.parse(stored);
      } catch (e) {
        currentHighs = [];
      }
    }

    const minScoreOnBoard = currentHighs.length > 0 ? Math.min(...currentHighs.map(h => h.score)) : 0;
    const hasSpaceOnBoard = currentHighs.length < 18;

    const newEntries: HighScore[] = [];

    sortedPerformers.forEach((perf, index) => {
      const rank = index + 1;
      let baseVal = (perf.planetsCount * 1200) + (perf.shipsCount * 15);
      let rankBonus = rank === 1 ? 5000 : rank === 2 ? 2500 : rank === 3 ? 1000 : 0;
      let turnPenalty = endedSession.turn * 35;
      let calculatedScore = Math.max(100, Math.floor(baseVal + rankBonus - turnPenalty));

      const isEligible = rank <= 3 || hasSpaceOnBoard || calculatedScore > minScoreOnBoard;

      if (isEligible) {
        newEntries.push({
          id: `score-${Date.now()}-${perf.player.id}-${Math.floor(Math.random() * 1000)}`,
          playerName: perf.player.name,
          playerColor: perf.player.color,
          score: calculatedScore,
          planetsCount: perf.planetsCount,
          shipsCount: perf.shipsCount,
          turns: endedSession.turn,
          rankInMatch: rank,
          mode: endedSession.mode,
          date: new Date().toISOString().split('T')[0]
        });
      }
    });

    if (newEntries.length > 0) {
      let combined = [...currentHighs, ...newEntries];
      combined.sort((a, b) => b.score - a.score);
      if (combined.length > 18) {
        combined = combined.slice(0, 18);
      }
      localStorage.setItem("konquest_high_scores", JSON.stringify(combined));
      setHighScores(combined);
    }
  };

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

  // Poll Wi-Fi multiplayer lobby and gaming room status
  useEffect(() => {
    if (!session || session.mode !== GameMode.WIFI_MULTIPLAYER) return;

    if (screen === "wifi_lobby") {
      const timer = setInterval(() => {
        fetch(`/api/multiplayer/status/${session.roomId}`)
          .then((res) => res.json())
          .then((data: GameSession) => {
            if (data) {
              setSession(data);
              if (data.status === "playing") {
                setScreen("playing");
                setTurnOrders([]);
                setSelectedOrigin(null);
                playBeep(800, "square", 0.3);
              }
            }
          })
          .catch(() => {});
      }, 2000);
      return () => clearInterval(timer);
    }

    if (screen === "playing") {
      const timer = setInterval(() => {
        // Only poll when we've completed our turn and are waiting for others
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
                
                if (data.status === "game_over") {
                  setScreen("game_over");
                  setShowGameOverModal(true);
                  documentScores(data);
                }

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
    }
  }, [screen, session, myPlayerId]);

  // Retrieve Active Player ID relative to context
  const getActivePlayerId = (): string => {
    if (!session) return "";
    
    if (session.mode === GameMode.LOCAL_PASS_AND_PLAY) {
      // In Local pass-and-play, turns alternate sequentially
      return session.currentTurnPlayerId;
    }
    
    return myPlayerId || "player-host";
  };

  // Automatically trigger the "Your Turn" popup/dialog when the turn changes or when the round starts for a player
  useEffect(() => {
    if (screen !== "playing" || !session) {
      setLastNotifiedTurnKey("");
      setShowYourTurnModal(false);
      return;
    }

    const currentTurnKey = `${session.mode}_t${session.turn}_p${getActivePlayerId()}`;
    if (currentTurnKey !== lastNotifiedTurnKey) {
      // In wireless multiplayer, don't show turn notice if player already submitted moves
      if (session.mode === GameMode.WIFI_MULTIPLAYER) {
        const myId = getActivePlayerId();
        if (session.submittedTurns.includes(myId)) {
          return;
        }
      }
      
      setLastNotifiedTurnKey(currentTurnKey);
      setShowYourTurnModal(true);
      playBeep(640, "sine", 0.3);
    }
  }, [screen, session, myPlayerId]);

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
        // The modal overlay auto-triggers via turnKey changes, so we can deprecate native browser alerts!
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
          setShowGameOverModal(true);
          documentScores(advanced);
        }
      }
    } 
    
    // Gemini AI Challenge Turn Logic
    else if (session.mode === GameMode.GEMINI_AI_CHALLENGE) {
      setIsAiThinking(true);
      setNetError(""); // Clear any previous stardust network error to avoid visual stale states
      playBeep(330, "sine", 0.4);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        // 1. Send current board state & human orders to Gemini server endpoint
        const response = await fetch("/api/gemini/make-turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const data = await response.json();
        
        if (data.isFallback) {
          setIsUsingFallbackAi(true);
        } else {
          setIsUsingFallbackAi(false);
        }
        
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
          setShowGameOverModal(true);
          documentScores(nextSess);
        }

      } catch (err: any) {
        clearTimeout(timeoutId);
        setIsAiThinking(false);
        if (err.name === "AbortError") {
          setNetError("A conexão tática com o Gemini AI foi interrompida (Tempo Excedido - 15s). Tente processar o turno novamente.");
        } else {
          setNetError("Erro de comunicação tática estelar com Gemini AI.");
        }
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
    setIsUsingFallbackAi(false);

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
      setMyPlayerId("player-host");
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
          playerColor: playerColor
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Código de sala inválido ou indisponível.");
      }

      const data = await res.json();
      setSession(data.session);
      setMyPlayerId(data.playerId);
      setScreen("wifi_lobby");
      setIsLobbySearching(false);
      playBeep(720, "sine", 0.25);

    } catch (err: any) {
      setIsLobbySearching(false);
      setNetError(err.message || "Erro de pareamento Wi-Fi.");
    }
  };

  const handleStartWifiGame = async () => {
    if (!session) return;
    setNetError("");
    try {
      const res = await fetch(`/api/multiplayer/start/${session.roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: myPlayerId })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao iniciar partida estelar.");
      }

      const data: GameSession = await res.json();
      setSession(data);
      setScreen("playing");
      setTurnOrders([]);
      setSelectedOrigin(null);
      playBeep(800, "square", 0.3);

    } catch (err: any) {
      setNetError(err.message || "Erro para iniciar partida.");
    }
  };

  // Exit game and clean up active session resources
  const exitGameToMenu = () => {
    if (session && session.mode === GameMode.WIFI_MULTIPLAYER) {
      fetch(`/api/multiplayer/leave/${session.roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: myPlayerId })
      }).catch(() => {});
    }
    setSession(null);
    setTurnOrders([]);
    setSelectedOrigin(null);
    setScreen("menu");
    playBeep(220, "sine", 0.1);
  };

  if (screen === "intro") {
    return (
      <GameIntroTrailer 
        onComplete={() => setScreen("menu")}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        playBeep={playBeep}
      />
    );
  }

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

            {/* Lead board high scores */}
            <button
              id="btn-highscores"
              onClick={() => {
                setScreen("scores");
                playBeep(550, "sine", 0.15);
              }}
              className="group flex flex-col p-5 md:p-6 rounded-2xl bg-gradient-to-br from-slate-900/60 to-black/80 border border-white/5 hover:border-amber-500/50 hover:bg-amber-500/10 transition-all text-left relative overflow-hidden active:scale-[0.98]"
            >
              <div className="absolute right-4 top-4 text-amber-500 opacity-60 group-hover:scale-110 transition-transform">
                <Trophy className="w-6 h-6" />
              </div>
              <span className="text-amber-500 font-black text-[10px] mb-1 uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> REGISTROS COSMARES IMPERIAIS
              </span>
              <span className="text-xl font-bold text-white leading-tight font-sans">Quadro de Honra (Scores)</span>
              <span className="text-xs text-slate-400 mt-2 max-w-sm font-sans">
                Veja as lendas galácticas mais bem-sucedidas do cosmos e o podium histórico dos três melhores conquistadores de todos os tempos.
              </span>
            </button>

            {/* Play Intro Trailer again */}
            <button
              id="btn-intro-trailer"
              onClick={() => {
                setScreen("intro");
                playBeep(600, "sine", 0.15);
              }}
              className="group flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-900/60 to-black/80 border border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all text-left relative overflow-hidden active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                <div>
                  <span className="text-[9px] text-indigo-400 font-black uppercase tracking-wider block">LORE ESPACIAL IMPERIAL</span>
                  <span className="text-sm font-bold text-white">Assistir Introdução Cinematográfica</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
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
                <div className="grid grid-cols-5 sm:grid-cols-9 gap-2 pb-1.5">
                  {[
                    { id: "emerald", label: "Emerald", hex: "bg-emerald-500" },
                    { id: "cyan", label: "Cyan", hex: "bg-cyan-500" },
                    { id: "amber", label: "Amber", hex: "bg-amber-500" },
                    { id: "violet", label: "Violet", hex: "bg-violet-500" },
                    { id: "rose", label: "Rose", hex: "bg-rose-500" },
                    { id: "fuchsia", label: "Fuchsia", hex: "bg-fuchsia-500" },
                    { id: "blue", label: "Blue", hex: "bg-blue-500" },
                    { id: "orange", label: "Orange", hex: "bg-orange-500" },
                    { id: "lime", label: "Lime", hex: "bg-lime-500" },
                    { id: "pink", label: "Pink", hex: "bg-pink-500" }
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setPlayerColor(c.id)}
                      title={c.label}
                      className={`w-9 h-9 sm:w-8 sm:h-8 rounded-full ${c.hex} transition-transform active:scale-95 relative cursor-pointer hover:scale-110 ${
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
                  
                  <div className="border-t border-teal-900/40 pt-4 flex flex-col gap-2">
                    <span className="text-[11px] font-black text-teal-400 uppercase tracking-widest flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping shrink-0" />
                      ENTRAR EM EMISSORA DE AMIGO (CÓDIGO DE SALA)
                    </span>
                    
                    <div className="grid grid-cols-3 gap-2.5 mt-1">
                      <div className="col-span-2 relative">
                        <input
                          type="text"
                          placeholder="EX: ABCD"
                          value={targetRoomId}
                          onChange={(e) => setTargetRoomId(e.target.value.toUpperCase())}
                          className="w-full bg-slate-950 border-2 border-teal-500/40 focus:border-teal-400 rounded-xl px-4 py-3 font-mono text-lg font-black text-teal-300 tracking-widest uppercase focus:outline-none focus:ring-4 focus:ring-teal-950/50 placeholder-slate-700 max-w-full text-center"
                          maxLength={4}
                        />
                      </div>
                      <button
                        onClick={handleJoinWifiLobby}
                        className="col-span-1 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-sans font-black text-xs uppercase tracking-wider rounded-xl transition-all hover:scale-102 active:scale-95 shadow-md shadow-teal-500/10 hover:shadow-teal-400/30 font-bold"
                      >
                        PAREAR
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

      {/* SCREEN 3: HIGH SCORES & PODIUM VIEW */}
      {screen === "scores" && (
        <div className="flex-1 flex flex-col justify-between p-6 md:p-8 z-10 max-w-xl mx-auto w-full overflow-y-auto">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <button 
                  onClick={() => {
                    setScreen("menu");
                    playBeep(450, "sine", 0.1);
                  }}
                  className="text-xs text-slate-500 hover:text-white mb-2 flex items-center gap-1 transition-colors"
                >
                  ← Voltar ao Menu
                </button>
                <h2 className="text-2xl font-black tracking-tight text-white uppercase flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-amber-500 animate-pulse" />
                  Salão de Honra
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Os maiores estrategistas interestelares de todos os ciclos cósmicos.
                </p>
              </div>

              {/* Reset highscores button */}
              <button
                type="button"
                onClick={() => {
                  if (confirm("Deseja realmente apagar todos os registros do Salão de Honra e restaurar os originais?")) {
                    handleResetScores();
                  }
                }}
                className="py-1.5 px-3 bg-slate-950 hover:bg-rose-950/20 border border-slate-850 hover:border-rose-900 text-slate-500 hover:text-rose-400 text-[9px] font-black uppercase rounded-lg transition-all"
              >
                RESTAURAR PADRÃO
              </button>
            </div>

            {/* 3D-Like Podium for Top 3 */}
            <div className="bg-slate-950/30 border border-slate-900 rounded-2xl p-4 shadow-inner">
              <span className="text-[9px] font-mono tracking-widest text-slate-550 block uppercase text-center mb-1">
                PÓDIO HISTÓRICO DE EXCELÊNCIA
              </span>

              <div className="flex items-end justify-center gap-2 sm:gap-4 pt-8 pb-4">
                {/* 2º Place Podium Element */}
                <div className="flex flex-col items-center w-24 sm:w-28">
                  {highScores[1] ? (
                    <div className="text-center mb-2 animate-fadeIn">
                      <div className={`w-8 h-8 rounded-full bg-slate-400/10 border border-slate-400 flex items-center justify-center mx-auto mb-1 shadow-md shadow-slate-500/5`}>
                        <Award className="w-4 h-4 text-slate-300" />
                      </div>
                      <span className="text-[11px] font-black text-slate-100 block truncate max-w-[85px]" title={highScores[1].playerName}>
                        {highScores[1].playerName}
                      </span>
                      <span className="text-[10px] font-extrabold text-slate-400 font-mono block">
                        {highScores[1].score} <span className="text-[8px] text-slate-550">PTS</span>
                      </span>
                    </div>
                  ) : (
                    <div className="text-center mb-2 opacity-25">
                      <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-885 flex items-center justify-center mx-auto mb-1 text-[10px] text-slate-550">-</div>
                      <span className="text-[10px] block text-slate-600">Vazio</span>
                    </div>
                  )}
                  {/* Podium Stand */}
                  <div className="w-full h-24 bg-gradient-to-b from-slate-800/60 to-slate-900/60 border-t border-x border-slate-700 rounded-t-xl flex flex-col justify-between p-2 text-center shadow-md">
                    <span className="text-2xl font-black text-slate-400 font-sans tracking-tight">2º</span>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">PRATA</span>
                  </div>
                </div>

                {/* 1º Place Podium Element */}
                <div className="flex flex-col items-center w-28 sm:w-32">
                  {highScores[0] ? (
                    <div className="text-center mb-2 animate-fadeIn">
                      <div className="text-amber-400 animate-bounce mb-1 flex justify-center">
                        <Crown className="w-6 h-6 text-amber-400 fill-amber-400/20" />
                      </div>
                      <span className="text-xs font-black text-white block truncate max-w-[105px]" title={highScores[0].playerName}>
                        {highScores[0].playerName}
                      </span>
                      <span className="text-xs font-black text-amber-400 font-mono block">
                        {highScores[0].score} <span className="text-[9px] text-amber-500">PTS</span>
                      </span>
                    </div>
                  ) : (
                    <div className="text-center mb-2 opacity-25">
                      <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-885 flex items-center justify-center mx-auto mb-1 text-[10px] text-slate-550">-</div>
                      <span className="text-[10px] block text-slate-600">Vazio</span>
                    </div>
                  )}
                  {/* Podium Stand */}
                  <div className="w-full h-32 bg-gradient-to-b from-amber-500/10 to-amber-950/20 border-t-2 border-x border-amber-500/40 rounded-t-2xl flex flex-col justify-between p-3 text-center shadow-lg shadow-amber-950/20">
                    <span className="text-4xl font-black text-amber-400 font-sans tracking-tight animate-pulse">1º</span>
                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest leading-none">OURO</span>
                  </div>
                </div>

                {/* 3º Place Podium Element */}
                <div className="flex flex-col items-center w-24 sm:w-28">
                  {highScores[2] ? (
                    <div className="text-center mb-2 animate-fadeIn">
                      <div className={`w-8 h-8 rounded-full bg-amber-900/10 border border-amber-800 flex items-center justify-center mx-auto mb-1 shadow-md shadow-amber-900/5`}>
                        <Award className="w-4 h-4 text-amber-700" />
                      </div>
                      <span className="text-[11px] font-black text-slate-100 block truncate max-w-[85px]" title={highScores[2].playerName}>
                        {highScores[2].playerName}
                      </span>
                      <span className="text-[10px] font-extrabold text-slate-400 font-mono block">
                        {highScores[2].score} <span className="text-[8px] text-slate-550">PTS</span>
                      </span>
                    </div>
                  ) : (
                    <div className="text-center mb-2 opacity-25">
                      <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-885 flex items-center justify-center mx-auto mb-1 text-[10px] text-slate-550">-</div>
                      <span className="text-[10px] block text-slate-600">Vazio</span>
                    </div>
                  )}
                  {/* Podium Stand */}
                  <div className="w-full h-20 bg-gradient-to-b from-amber-900/40 to-slate-900/60 border-t border-x border-amber-800/80 rounded-t-xl flex flex-col justify-between p-2 text-center shadow-md">
                    <span className="text-xl font-black text-amber-750 font-sans tracking-tight">3º</span>
                    <span className="text-[8px] font-black text-amber-800 uppercase tracking-widest leading-none">BRONZE</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Leaderboard list - Remaining 15 spots */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-sans font-black tracking-widest text-slate-450 block uppercase animate-pulse">
                Próximos Líderes ({highScores.slice(3).length})
              </span>

              {highScores.slice(3).length === 0 ? (
                <div className="bg-slate-950/20 border border-slate-900 rounded-xl p-8 text-center text-xs text-slate-550 italic">
                  Nenhuma lenda registrada na lista de apoio. Conclua conquistas galácticas para preencher as listagens.
                </div>
              ) : (
                <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-2.5 space-y-2 max-h-64 overflow-y-auto font-sans shadow-inner">
                  {highScores.slice(3).map((high, index) => {
                    const realRank = index + 4;
                    return (
                      <div 
                        key={high.id} 
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/20 border border-slate-850 hover:bg-slate-900/45 hover:border-slate-800 transition-all text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-[11px] font-extrabold text-slate-550 w-5 text-center">
                            #{realRank}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full inline-block ${
                              high.playerColor === "emerald" ? "bg-emerald-400"
                              : high.playerColor === "rose" ? "bg-rose-400"
                              : high.playerColor === "cyan" ? "bg-cyan-400"
                              : high.playerColor === "amber" ? "bg-amber-400"
                              : high.playerColor === "violet" ? "bg-violet-400"
                              : high.playerColor === "fuchsia" ? "bg-fuchsia-400"
                              : high.playerColor === "blue" ? "bg-blue-400"
                              : high.playerColor === "pink" ? "bg-pink-400"
                              : "bg-orange-400"
                            }`} />
                            <span className="font-bold text-slate-100">{high.playerName}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3.5 font-mono text-[10px] text-slate-400">
                          <span className="py-0.5 px-2 bg-slate-950 border border-slate-850 rounded text-slate-500 text-[8px] font-bold uppercase tracking-wider">
                            {high.mode === GameMode.GEMINI_AI_CHALLENGE ? "IA GEMINI" : high.mode === GameMode.WIFI_MULTIPLAYER ? "WIFI" : "LOCAL"}
                          </span>
                          <span className="text-slate-550 hidden sm:inline">
                            T.{high.turns} | P.{high.planetsCount}
                          </span>
                          <span className="font-black text-teal-400 text-xs text-right min-w-[55px]">
                            {high.score} <span className="text-[8px] font-bold text-slate-550">PTS</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 text-center">
            <button
              onClick={() => {
                setScreen("menu");
                playBeep(450, "sine", 0.1);
              }}
              className="py-3 px-6 bg-slate-900 border border-slate-850 rounded-xl hover:border-slate-850 hover:bg-slate-950 text-xs font-bold text-white tracking-widest uppercase transition-all"
            >
              Voltar ao Menu Principal
            </button>
          </div>
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
              <h2 className="text-xl font-bold text-white uppercase">SALA MULTIPLAYER</h2>
              <p className="text-xs text-slate-400">Compartilhe o código para os demais conectarem.</p>
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

            {netError && (
              <div className="p-3 bg-rose-950/20 border border-rose-900 text-rose-450 text-xs rounded-lg text-left">
                {netError}
              </div>
            )}

            <div className="bg-slate-950/30 p-4 rounded-xl border border-slate-850 text-left text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-350 border-b border-slate-850 pb-2">
                <strong className="text-slate-200">Jogadores Conectados ({session.players.length}/6):</strong>
              </div>
              <div className="space-y-1.5 pt-1">
                {session.players.map((p) => {
                  const isCurHost = p.id === "player-host";
                  const colorClass = p.color === "emerald" ? "text-emerald-400" 
                    : p.color === "rose" ? "text-rose-400" 
                    : p.color === "cyan" ? "text-cyan-400" 
                    : p.color === "amber" ? "text-amber-400"
                    : p.color === "violet" ? "text-violet-400" 
                    : p.color === "fuchsia" ? "text-fuchsia-400" 
                    : p.color === "blue" ? "text-blue-400" 
                    : p.color === "orange" ? "text-orange-400"
                    : p.color === "pink" ? "text-pink-400"
                    : "text-lime-450";

                  const dotColor = p.color === "emerald" ? "bg-emerald-400" 
                    : p.color === "rose" ? "bg-rose-400" 
                    : p.color === "cyan" ? "bg-cyan-400" 
                    : p.color === "amber" ? "bg-amber-400"
                    : p.color === "violet" ? "bg-violet-400" 
                    : p.color === "fuchsia" ? "bg-fuchsia-400" 
                    : p.color === "blue" ? "bg-blue-400" 
                    : p.color === "orange" ? "bg-orange-400"
                    : p.color === "pink" ? "bg-pink-400"
                    : "bg-lime-400";

                  return (
                    <div key={p.id} className="flex items-center justify-between font-bold py-1 px-1.5 rounded hover:bg-slate-950/40">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${dotColor} inline-block shadow-sm`} />
                        <span className="text-slate-200 font-sans">{p.name} {p.id === myPlayerId ? "(Você)" : ""}</span>
                      </div>
                      <span className={`text-[10px] py-0.5 px-2 rounded-full font-sans uppercase border bg-slate-950/60 ${colorClass}`}>
                        {isCurHost ? "Hospedeiro" : "Tripulação"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {myPlayerId === "player-host" ? (
              <button
                onClick={handleStartWifiGame}
                disabled={session.players.length < 2}
                className="w-full py-4 font-black text-xs bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-450 hover:to-teal-450 text-slate-950 rounded-xl active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-md shadow-emerald-950/20 uppercase"
              >
                {session.players.length < 2 ? "Aguardando Jogadores..." : "INICIAR PARTIDA (OK)"}
              </button>
            ) : (
              <div className="w-full py-3.5 px-4 bg-slate-950/40 border border-slate-900 rounded-xl text-center space-y-1.5">
                <div className="flex items-center justify-center gap-1.5 text-xs text-teal-400 font-bold uppercase animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" /> Wait System Host OK...
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Seu piloto de frota conectou com sucesso. Aguardando a ignição do Hospedeiro para iniciar.
                </p>
              </div>
            )}
            
            <button
              onClick={exitGameToMenu}
              className="w-full py-3 text-slate-400 hover:text-white text-xs font-bold"
            >
              {myPlayerId === "player-host" ? "Desfazer Sala" : "Sair do Lobby"}
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
                        backgroundColor: (() => {
                          const c = session.players.find(p => p.id === getActivePlayerId())?.color;
                          const mapping: Record<string, string> = {
                            emerald: "#10b981",
                            rose: "#f43f5e",
                            cyan: "#06b6d4",
                            amber: "#f59e0b",
                            violet: "#8b5cf6",
                            fuchsia: "#d946ef",
                            blue: "#3b82f6",
                            orange: "#f97316",
                            lime: "#84cc16",
                            pink: "#ec4899"
                          };
                          return mapping[c || ""] || "#94a3b8";
                        })()
                      }} 
                    />
                    {getActivePlayerName()}
                  </span>
                </div>
              </div>

              {/* Primary Submittal Action Button positioned at the top banner for instant reach and zero scroll */}
              <div className="flex items-center gap-2">
                {session.mode === GameMode.WIFI_MULTIPLAYER ? (
                  session.submittedTurns.includes(getActivePlayerId()) ? (
                    <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 animate-pulse uppercase tracking-wider">
                      Pronto ✓
                    </span>
                  ) : (
                    <button
                      onClick={handleCommitWifiTurn}
                      disabled={session.submittedTurns.includes(getActivePlayerId())}
                      className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-black text-[11px] uppercase tracking-wider transition-all hover:scale-102 active:scale-95 disabled:opacity-30 disabled:pointer-events-none hover:brightness-110 flex items-center gap-1 animate-pulse shadow-md shadow-emerald-950/20"
                    >
                      <Rocket className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
                      <span>Confirmar Turno</span>
                    </button>
                  )
                ) : (
                  <button
                    onClick={handleCommitLocalTurn}
                    disabled={isAiThinking}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-emerald-500 text-slate-950 font-black text-[11px] uppercase tracking-wider transition-all hover:scale-102 active:scale-95 disabled:opacity-40 hover:brightness-110 flex items-center gap-1 shadow-md shadow-cyan-950/20"
                  >
                    <Rocket className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
                    <span>{isAiThinking ? "Vácuo..." : "Confirmar Turno"}</span>
                  </button>
                )}

                <div className="text-slate-700 mx-1">|</div>

                <span className="hidden sm:inline text-[10px] font-mono bg-slate-900 border border-slate-850 px-2 py-1 rounded text-slate-400">
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
                lastTurnBattles={session.lastTurnBattles}
                turnNumber={session.turn}
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

            {/* Offline AI Fallback Notice to alert player gracefully when Gemini server quota is exhausted */}
            {session.mode === GameMode.GEMINI_AI_CHALLENGE && isUsingFallbackAi && (
              <div className="mx-3 mt-3 p-3 bg-amber-950/25 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-400">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5 animate-pulse" />
                <div className="flex-1">
                  <span className="text-[10px] font-black uppercase tracking-wider block leading-tight">MÓDULO DE IA INTEGRADA OFFLINE</span>
                  <p className="text-[10px] text-slate-400 leading-normal mt-0.5">
                    O simulador remoto excedeu a quota permitida (429 RESOURCE_EXHAUSTED). Sua partida foi alternada automaticamente para a <strong>IA Tática Offline</strong> de alto desempenho integrada ao motor do game.
                  </p>
                </div>
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

              {/* TIMELINE ARCHIVE TURNS EVENTS LOGS - HIDE AND DELEGATE EXPANSION PER Strategic Toggle requested by user */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTacticalLog(!showTacticalLog);
                    playBeep(450, "sine", 0.1);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 border border-slate-850 hover:border-slate-800 text-[10px] font-black tracking-wide text-slate-300 transition-colors"
                >
                  <span className="flex items-center gap-1.5 uppercase text-slate-300">
                    <Info className="w-3.5 h-3.5 text-blue-400" />
                    Console de Log Tático ({session.logs.length})
                  </span>
                  <span className="py-0.5 px-2 bg-slate-950 text-slate-500 text-[9px] font-mono rounded border border-slate-850">
                    {showTacticalLog ? "OCULTAR LOG" : "EXIBIR LOG"}
                  </span>
                </button>

                {showTacticalLog && (
                  <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-2.5 h-44 overflow-y-auto space-y-2 font-mono animate-fadeIn">
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
                )}
              </div>

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

      {/* OVERLAY SYSTEM NOTIFY MODAL FOR WINNER / LOSER AT THE END */}
      {showGameOverModal && session && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-6 shadow-[0_0_50px_rgba(2,6,23,0.8)]">
            
            {/* Dynamic Status Icon */}
            {session.winnerId ? (
              session.winnerId === getActivePlayerId() ? (
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto animate-pulse">
                  <Flame className="w-8 h-8" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-rose-500/10 border-2 border-rose-500 text-rose-450 flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-8 h-8 " />
                </div>
              )
            ) : (
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500 text-amber-400 flex items-center justify-center mx-auto">
                <HelpCircle className="w-8 h-8 text-amber-400" />
              </div>
            )}

            {/* Title Victory / Defeat */}
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-widest text-slate-500 block uppercase">Relatório Especial Militar</span>
              <h3 className="text-2xl font-black tracking-tight text-white uppercase">
                {session.winnerId ? (
                  session.winnerId === getActivePlayerId() ? (
                    <span className="text-emerald-400">VITÓRIA IMPERIAL!</span>
                  ) : (
                    <span className="text-rose-400">DERROTA TÁTICA...</span>
                  )
                ) : (
                  <span className="text-amber-400">IMPASSE DE SISTEMAS</span>
                )}
              </h3>
            </div>

            {/* Narrative Explanation */}
            <p className="text-xs text-slate-350 leading-relaxed font-sans">
              {session.winnerId ? (
                session.winnerId === getActivePlayerId() ? (
                  "Parabéns, Comandante! Você dominou todos os sistemas estelares inimigos com extrema frieza e precisão tática militar."
                ) : (
                  <>
                    Suas bases espaciais capitularam para a frota inimiga de{" "}
                    <strong className="text-white">
                      {session.players.find((p) => p.id === session.winnerId)?.name || "Inimigo Espacial"}
                    </strong>
                    . Restabeleça o estoque de fusíveis de dobra e planeje a próxima surtida!
                  </>
                )
              ) : (
                "Nenhum comandante obteve o domínio absoluto do espaço estelar neste ciclo. Assinado cessar-fogo por exaustão nuclear."
              )}
            </p>

            {/* Short specs panel */}
            <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-850/80 text-left text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-400 font-sans">
                <span>Vencedor Final:</span>
                <span className="font-extrabold text-white uppercase">
                  {session.winnerId ? (
                    session.players.find(p => p.id === session.winnerId)?.name || "Ganhador"
                  ) : (
                    "Empate"
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400 font-sans">
                <span>Total de Turnos:</span>
                <span className="font-extrabold text-slate-200 font-mono">{session.turn} Rodadas</span>
              </div>
              <div className="flex justify-between items-center text-slate-400 font-mono text-[11px]">
                <span>Seus Planetas:</span>
                <span className="font-extrabold text-emerald-400">
                  {session.planets.filter(p => p.ownerId === getActivePlayerId()).length}
                </span>
              </div>
            </div>

            {/* Confirm action button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowGameOverModal(false);
                  playBeep(600, "sine", 0.15);
                }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-teal-500 hover:brightness-115 text-slate-950 font-black text-xs uppercase tracking-widest active:scale-95 transition-transform"
              >
                Ver Detalhes do Fim
              </button>
            </div>

          </div>
        </div>
      )}

      {/* EXCITING TURN ALERT OVERLAY WINDOW FOR "SUA VEZ" REQUESTED BY USER */}
      {showYourTurnModal && session && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-6 shadow-[0_0_50px_rgba(2,6,23,0.9)] relative overflow-hidden">
            
            {/* Top decorative hazard stripes/glow */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-teal-500 to-emerald-500" />
            
            <div className="w-16 h-16 rounded-full bg-blue-500/10 border-2 border-blue-500 text-blue-400 flex items-center justify-center mx-auto animate-bounce">
              <Rocket className="w-8 h-8 fill-blue-400/20" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-widest text-teal-400 block uppercase animate-pulse">Sinalizadores de Frota Ativos</span>
              <h3 className="text-2xl font-black tracking-tight text-white uppercase font-sans">
                SUA VEZ DE JOGAR!
              </h3>
            </div>

            <p className="text-xs text-slate-350 leading-relaxed font-sans">
              Os geradores de fusão estelar e as frotas de guerra estão prontos e aguardando suas ordens de dobra cósmica.
            </p>

            {/* Selected active commander highlight plate */}
            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-850/80 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider mb-1">Comandante Ativo do Turno</span>
              <div className="flex items-center justify-center gap-2">
                <span className={`w-3 h-3 rounded-full inline-block animate-ping ${
                  (() => {
                    const activeColor = session.players.find(p => p.id === getActivePlayerId())?.color || "emerald";
                    return activeColor === "emerald" ? "bg-emerald-400"
                      : activeColor === "rose" ? "bg-rose-400"
                      : activeColor === "cyan" ? "bg-cyan-400"
                      : activeColor === "amber" ? "bg-amber-400"
                      : activeColor === "violet" ? "bg-violet-400"
                      : activeColor === "fuchsia" ? "bg-fuchsia-400"
                      : activeColor === "blue" ? "bg-blue-400"
                      : "bg-orange-400";
                  })()
                }`} />
                <span className="text-base font-black text-white tracking-tight uppercase">
                  {getActivePlayerName()}
                </span>
              </div>
              <span className="text-[9px] text-slate-550 block mt-1 font-mono">
                {session.mode === GameMode.LOCAL_PASS_AND_PLAY ? "PAINEL SEGURO: PASSE O DISPOSITIVO" : "AÇÃO DA RODADA DO CONFRONTO"}
              </span>
            </div>

            {/* Action CTA Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowYourTurnModal(false);
                  playBeep(880, "sine", 0.1);
                }}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 via-teal-500 to-emerald-500 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-blue-950/30"
              >
                ASSUMIR MANCHE DE DOBRA
              </button>
            </div>

          </div>
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
