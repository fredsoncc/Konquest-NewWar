import express from "express";
import path from "path";
import dns from "dns";
import os from "os";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { GameSession, Player, Planet, Fleet, GameMode } from "./src/types";
import { advanceTurnState, generatePlanets } from "./src/gameUtils";

const app = express();
app.use(express.json());

const PORT = 3000;

// In-memory active game rooms for Wi-Fi multiplayer
const activeRooms: Record<string, GameSession> = {};

// In-memory submitted orders for active rooms prior to resolution
// Key: roomId, Value: Record of playerId to Fleet[] (the dispatched orders)
const pendingOrders: Record<string, Record<string, Fleet[]>> = {};

// Lazy initialization of the Gemini SDK client
let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key.includes("MY_GEMINI") || key.trim() === "") {
      throw new Error("GEMINI_API_KEY_MISSING");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// REST APIs

// Health endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Host-IP network utility (for local Wi-Fi pairing assistance)
app.get("/api/wi-fi-info", (req, res) => {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const k in interfaces) {
    const inf = interfaces[k];
    if (inf) {
      for (const k2 in inf) {
        const address = inf[k2];
        if (address.family === 'IPv4' && !address.internal) {
          addresses.push(address.address);
        }
      }
    }
  }
  res.json({ ips: addresses, port: PORT });
});

// Gemini decision maker & banter generator
app.post("/api/gemini/make-turn", async (req, res) => {
  const { session } = req.body as { session: GameSession };
  if (!session) {
    return res.status(400).json({ error: "Sessão nula fornecida." });
  }

  const geminiPlayer = session.players.find(p => p.isGemini);
  if (!geminiPlayer) {
    return res.status(400).json({ error: "Nenhum jogador comandado por IA Gemini na partida." });
  }

  const persona = session.geminiPersona || "Imperador Alienígena Calculista";

  // Formulate detailed text representation of the board state for Gemini to analyze
  const geminiPlanets = session.planets.filter(p => p.ownerId === geminiPlayer.id);
  const playerPlanets = session.planets.filter(p => p.ownerId && p.ownerId !== geminiPlayer.id && p.ownerId !== "neutral");
  const neutralPlanets = session.planets.filter(p => !p.ownerId || p.ownerId === "neutral");
  const transitingFleets = session.fleets;

  const statePrompt = `
Você é o Grande Comandante Gemini, sua personalidade para esta partida é de "${persona}".
Você está jogando Konquest (Conquista Galáctica), um jogo de estratégia em tempo de frotas espaciais.
As regras:
- Você ganha quando conquistar todos os planetas ou eliminar o adversário.
- Você só pode enviar frotas dos planetas que domina atualmente.
- Planetas têm: ID (letra), "ships" (número de frota atual defendendo o planeta), "production" (quantas naves novas ele fabrica por turno), "killPercent" (chance de cada nave acertar no combate, entre 0.35 e 0.85).
- Enviar frotas reduz as naves do planeta de origem imediatamente.
- Frotas em trânsito lutam ao chegar no destino herdando o "killPercent" de seu planeta de origem.

ESTADO DA GALÁXIA NO TURNO ${session.turn}:

NOSSOS PLANETAS DOMINADOS (IA):
${geminiPlanets.map(p => `- ID: ${p.id} (${p.name}), Naves Atuais: ${p.ships}, Produção/Turno: ${p.production}, Taxa de Tiro: ${p.killPercent}`).join("\n")}

PLANETAS INIMIGOS (HUMANO):
${playerPlanets.map(p => `- ID: ${p.id} (${p.name}), Naves Atuais: ${p.ships}, Produção/Turno: ${p.production}, Taxa de Tiro: ${p.killPercent}`).join("\n")}

PLANETAS NEUTROS (Livres para conquistar, suas frotas defensivas não produzem novas naves nem mudam de tamanho até serem atacados):
${neutralPlanets.map(p => `- ID: ${p.id} (${p.name}), Naves Atuais: ${p.ships}, Produção/Turno: ${p.production}, Taxa de Tiro: ${p.killPercent}`).join("\n")}

FROTAS ATIVAS NO ESPAÇO:
${transitingFleets.map(f => `- Pertence a: ${f.ownerId}, Origem: ${f.originPlanetId}, Destino: ${f.targetPlanetId}, Naves: ${f.ships}, Turnos Restantes: ${f.turnsRemaining}`).join("\n")}

SUA TAREFA:
1. Examine a galáxia. Decida enviar naves de nossos planetas dominados para planetas inimigos ou neutros para conquistá-los, ou enviar para nossos próprios planetas como reforços.
2. IMPORTANTE: Não envie mais naves do que as disponíveis em um planeta! Deixe pelo menos 2 naves defendendo cada origem (para não ficar indefeso). Se um planeta tiver pouca nave (menos de 5), evite tirar dele.
3. Seus alvos preferenciais devem ser planetas neutros fracos (poucas naves) para expandir sua economia, ou planetas inimigos vulneráveis.
4. Gere ordens de despacho ("dispatch") formadas por:
   - "origin": ID do planeta de origem (Ex: "A")
   - "target": ID do planeta de destino (Ex: "B")
   - "shipsPercent": Porcentagem de naves disponíveis no planeta para enviar (de 10 a 90). O valor será convertido em naves pelo motor do jogo.
5. Escreva um comentário de provocação ou frase de efeito de comandante ("banter") em português sobre o estado do jogo. Faça provocações adequadas ao perfil do "${persona}". É muito importante que isso seja criativo e zombeteiro com o jogador humano!

Responda rigorosamente em formato JSON que obedece ao seguinte esquema.
`;

  try {
    const ai = getGemini();
    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: statePrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dispatch: {
              type: Type.ARRAY,
              description: "Lista de frotas espaciais a serem enviadas ou mobilizadas neste turno",
              items: {
                type: Type.OBJECT,
                properties: {
                  origin: { type: Type.STRING, description: "Letra ID do planeta de origem" },
                  target: { type: Type.STRING, description: "Letra ID do planeta de destino" },
                  shipsPercent: { type: Type.INTEGER, description: "Porcentagem de naves a se enviar, ex: 50" }
                },
                required: ["origin", "target", "shipsPercent"]
              }
            },
            banter: {
              type: Type.STRING,
              description: "Fala cômica ou militar provocadora voltada ao jogador humano em português"
            }
          },
          required: ["dispatch", "banter"]
        }
      }
    });

    const parsed = JSON.parse(result.text || "{}");
    res.json(parsed);

  } catch (error: any) {
    // Elegant fallback if GEMINI API KEY is unconfigured or rate-limited
    console.warn("Gemini API Error, executing high-quality local strategic CPU logic instead:", error?.message);
    
    // CPU fallback logic
    const dispatch: any[] = [];
    const planetsNeededToConquer = [...playerPlanets, ...neutralPlanets].sort((a,b) => a.ships - b.ships);

    geminiPlanets.forEach(p => {
      if (p.ships > 8) {
        // Attack the easiest planet
        const target = planetsNeededToConquer[0];
        if (target) {
          dispatch.push({
            origin: p.id,
            target: target.id,
            shipsPercent: 60
          });
        }
      }
    });

    const standardBanters = [
      "Minhas sondas espaciais detectaram falhas severas nas suas linhas de suprimento!",
      "A majestade das frotas cibernéticas do Império cobrirá cada constelação do seu radar.",
      "Conquistar o setor espacial é uma fórmula lógica simples. Você é apenas um ruído na equação.",
      "Diga adeus a seus mundos pacatos. A colonização industrial mecanizada começou."
    ];
    const banter = standardBanters[Math.floor(Math.random() * standardBanters.length)];

    res.json({ dispatch, banter, isFallback: true });
  }
});

// Multiplayer Room creation and coordination routes
app.post("/api/multiplayer/create", (req, res) => {
  const { hostName, hostColor, mapSize, planetsCount } = req.body as {
    hostName: string;
    hostColor: string;
    mapSize: "small" | "medium" | "large";
    planetsCount: number;
  };

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let roomId = "";
  do {
    roomId = "";
    for (let j = 0; j < 4; j++) {
      roomId += letters[Math.floor(Math.random() * 26)];
    }
  } while (activeRooms[roomId]);

  const hostPlayer: Player = {
    id: "player-host",
    name: hostName || "Hospedeiro",
    color: hostColor || "emerald",
    isHuman: true,
    isCPU: false,
    isGemini: false,
    deviceInfo: "Wi-Fi Host"
  };

  const initialPlayers = [hostPlayer];
  const count = planetsCount || (mapSize === "small" ? 10 : mapSize === "medium" ? 15 : 22);
  const planets = generatePlanets(count, 14, 8, [hostPlayer, { id: "player-guest", name: "Guest Waiting", color: "rose", isHuman: true, isCPU: false, isGemini: false }]);

  const session: GameSession = {
    roomId,
    mode: GameMode.WIFI_MULTIPLAYER,
    status: "lobby",
    turn: 1,
    players: initialPlayers,
    planets,
    fleets: [],
    currentTurnPlayerId: "player-host",
    submittedTurns: [],
    logs: [
      {
        id: `sys-${Date.now()}`,
        turn: 1,
        type: "chat_message",
        playerName: "Sistema",
        playerColor: "text-amber-400",
        message: `Sala ${roomId} estabelecida no vácuo estelar. No aguardo de jogadores.`
      }
    ]
  };

  activeRooms[roomId] = session;
  pendingOrders[roomId] = {};

  res.json(session);
});

// Join an existing room
app.post("/api/multiplayer/join", (req, res) => {
  const { roomId, playerName, playerColor } = req.body as {
    roomId: string;
    playerName: string;
    playerColor: string;
  };

  const cleanId = (roomId || "").toUpperCase().trim();
  const session = activeRooms[cleanId];

  if (!session) {
    return res.status(404).json({ error: "Sala estelar não encontrada." });
  }

  if (session.status !== "lobby" || session.players.length >= 2) {
    return res.status(400).json({ error: "A sala informada já está cheia ou em andamento." });
  }

  const guestPlayer: Player = {
    id: "player-guest",
    name: playerName || "Almirante",
    color: playerColor || "fuchsia",
    isHuman: true,
    isCPU: false,
    isGemini: false,
    deviceInfo: "Wi-Fi Guest"
  };

  session.players.push(guestPlayer);
  session.status = "playing"; // Autostart game since we have 2 players!
  
  session.logs.unshift({
    id: `sys-${Date.now()}`,
    turn: 1,
    type: "chat_message",
    playerName: "Sistema",
    playerColor: "text-amber-400",
    message: `${guestPlayer.name} uniu-se à partida galáctica! Que os motores de dobra sejam ligados.`
  });

  // Re-distribute planet ownerships so guest truly gets their home base set
  session.planets = generatePlanets(session.planets.length, 14, 8, session.players);

  res.json(session);
});

// Get room status
app.get("/api/multiplayer/status/:roomId", (req, res) => {
  const cleanId = req.params.roomId.toUpperCase().trim();
  const session = activeRooms[cleanId];
  if (!session) {
    return res.status(404).json({ error: "Sala estelar não encontrada." });
  }
  res.json(session);
});

// Submit turn moves for Wi-Fi multiplayer
app.post("/api/multiplayer/submit-orders/:roomId", (req, res) => {
  const { playerId, fleets } = req.body as { playerId: string; fleets: Fleet[] };
  const cleanId = req.params.roomId.toUpperCase().trim();
  const session = activeRooms[cleanId];

  if (!session) {
    return res.status(404).json({ error: "Sessão não encontrada." });
  }

  if (session.status !== "playing") {
    return res.status(400).json({ error: "A partida não está no estado ativo de turnos." });
  }

  // Ensure submitted turns tracking
  if (!session.submittedTurns.includes(playerId)) {
    session.submittedTurns.push(playerId);
  }

  // Store client dispatches under pending orders
  if (!pendingOrders[cleanId]) {
    pendingOrders[cleanId] = {};
  }
  pendingOrders[cleanId][playerId] = fleets;

  // Check if both multiplayer humans have submitted their moves
  const humanIds = session.players.map(p => p.id);
  const allReady = humanIds.every(id => session.submittedTurns.includes(id));

  if (allReady) {
    // Consolidate both fleets orders
    const combinedOrders: Fleet[] = [];
    humanIds.forEach(id => {
      const orders = pendingOrders[cleanId][id] || [];
      combinedOrders.push(...orders);
    });

    // Advance turn state across the engine
    const nextSession = advanceTurnState(session, combinedOrders);
    
    // Copy computed properties back
    session.turn = nextSession.turn;
    session.status = nextSession.status;
    session.planets = nextSession.planets;
    session.fleets = nextSession.fleets;
    session.logs = nextSession.logs;
    session.winnerId = nextSession.winnerId;
    session.submittedTurns = []; // reset ready roster

    // Clear pending cache
    pendingOrders[cleanId] = {};
  }

  res.json(session);
});

// Leave or reset a room
app.post("/api/multiplayer/leave/:roomId", (req, res) => {
  const cleanId = req.params.roomId.toUpperCase().trim();
  if (activeRooms[cleanId]) {
    delete activeRooms[cleanId];
    delete pendingOrders[cleanId];
  }
  res.json({ success: true });
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Konquest Server] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[Konquest Server] Dev client served locally via Express-Vite bridge`);
  });
}

startServer();
