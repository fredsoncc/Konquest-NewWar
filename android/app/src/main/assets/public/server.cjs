var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_os = __toESM(require("os"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");

// src/gameUtils.ts
var STAR_SYSTEMS = [
  "Vega",
  "Sirius",
  "Arcturus",
  "Regulus",
  "Capella",
  "Rigel",
  "Deneb",
  "Antares",
  "Altair",
  "Spica",
  "Pollux",
  "Fomalhaut",
  "Aldebaran",
  "Hoth",
  "Tatooine",
  "Endor",
  "Naboo",
  "Coruscant",
  "Alderaan",
  "Kamino",
  "Geonosis",
  "Dagobah",
  "Bespin",
  "Mustafar",
  "Corellia",
  "Kessel",
  "Yavin"
];
function generatePlanets(count, width = 14, height = 8, players) {
  const planets = [];
  const assignedCoordinates = /* @__PURE__ */ new Set();
  const minDistance = 2.2;
  function isTooClose(x, y) {
    for (const p of planets) {
      const dist = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
      if (dist < minDistance) return true;
    }
    return false;
  }
  const names = [...STAR_SYSTEMS].sort(() => Math.random() - 0.5);
  for (let i = 0; i < count; i++) {
    let x = 0;
    let y = 0;
    let attempts = 0;
    do {
      x = Math.floor(Math.random() * (width - 1)) + 0.5;
      y = Math.floor(Math.random() * (height - 1)) + 0.5;
      attempts++;
    } while ((isTooClose(x, y) || assignedCoordinates.has(`${x},${y}`)) && attempts < 100);
    assignedCoordinates.add(`${x},${y}`);
    const name = names[i % names.length];
    planets.push({
      id: String.fromCharCode(65 + i % 26),
      // A, B, C...
      name,
      x,
      y,
      ownerId: null,
      // Neutral initially
      ships: Math.floor(Math.random() * 12) + 6,
      // 6 to 17 neutral defense ships
      production: Math.floor(Math.random() * 5) + 2,
      // 2 to 6 production rate
      killPercent: parseFloat((Math.random() * 0.4 + 0.35).toFixed(2))
      // 0.35 to 0.75 kill percentage
    });
  }
  const humanAndCpuPlayers = players.filter((p) => p.id !== "neutral");
  const sortedPlanets = [...planets];
  humanAndCpuPlayers.forEach((player, idx) => {
    let startPlanet;
    if (idx === 0) {
      sortedPlanets.sort((a, b) => a.x + a.y - (b.x + b.y));
      startPlanet = sortedPlanets[0];
    } else if (idx === 1) {
      sortedPlanets.sort((a, b) => b.x + b.y - (a.x + a.y));
      startPlanet = sortedPlanets[0];
    } else {
      const neutralPlanets = sortedPlanets.filter((p) => p.ownerId === null);
      startPlanet = neutralPlanets[Math.floor(Math.random() * neutralPlanets.length)] || sortedPlanets[idx];
    }
    startPlanet.ownerId = player.id;
    startPlanet.ships = 20;
    startPlanet.production = 5;
    startPlanet.killPercent = 0.65;
  });
  return planets;
}
function simulateBattle(attackerCount, attackerKillRate, defenderCount, defenderKillRate) {
  let A = Math.max(0, Math.floor(attackerCount || 0));
  let D = Math.max(0, Math.floor(defenderCount || 0));
  let rounds = 0;
  const aRate = isNaN(attackerKillRate) || attackerKillRate <= 0 ? 0.55 : Math.max(0.05, Math.min(0.95, attackerKillRate));
  const dRate = isNaN(defenderKillRate) || defenderKillRate <= 0 ? 0.55 : Math.max(0.05, Math.min(0.95, defenderKillRate));
  while (A > 0 && D > 0) {
    rounds++;
    let defenderHits = 0;
    let attackerHits = 0;
    for (let i = 0; i < D; i++) {
      if (Math.random() < dRate) {
        defenderHits++;
      }
    }
    for (let i = 0; i < A; i++) {
      if (Math.random() < aRate) {
        attackerHits++;
      }
    }
    A = Math.max(0, A - defenderHits);
    D = Math.max(0, D - attackerHits);
    if (rounds > 500) break;
  }
  if (A === 0 && D === 0) {
    D = 1;
  }
  return {
    winnerId: A > 0 ? "attacker" : "defender",
    remainingAttackingShips: A,
    remainingDefendingShips: D,
    rounds,
    attackerDead: A === 0,
    defenderDead: D === 0
  };
}
function advanceTurnState(session, turnOrders) {
  const nextSession = { ...session };
  nextSession.turn += 1;
  nextSession.status = "playing";
  const nextLogEvent = (type, playerName, color, message, details) => {
    nextSession.logs.unshift({
      id: `log-${Date.now()}-${Math.random()}`,
      turn: session.turn,
      // record for turn just completed
      type,
      playerName,
      playerColor: color,
      message,
      details
    });
  };
  const allFleets = [...nextSession.fleets];
  turnOrders.forEach((f) => {
    allFleets.push({
      ...f,
      id: `fleet-${Date.now()}-${Math.random()}`
    });
    const origin = nextSession.planets.find((p) => p.id === f.originPlanetId);
    if (origin) {
      origin.ships = Math.max(0, origin.ships - f.ships);
    }
    const player = session.players.find((p) => p.id === f.ownerId);
    const originName = origin?.name || f.originPlanetId;
    const destPlanet = nextSession.planets.find((p) => p.id === f.targetPlanetId);
    const destName = destPlanet?.name || f.targetPlanetId;
    nextLogEvent(
      "fleet_launched",
      player?.name || "Jogador",
      player?.color || "text-gray-400",
      `Frota de ${f.ships} naves enviada de ${originName} para ${destName}.`,
      `Chegada estimada em ${f.turnsTotal} turnos.`
    );
  });
  const activeFleets = [];
  const arrivingFleets = [];
  allFleets.forEach((fleet) => {
    const nextTurns = fleet.turnsRemaining - 1;
    if (nextTurns <= 0) {
      arrivingFleets.push(fleet);
    } else {
      activeFleets.push({
        ...fleet,
        turnsRemaining: nextTurns
      });
    }
  });
  nextSession.fleets = activeFleets;
  const lastTurnBattles = [];
  arrivingFleets.forEach((fleet) => {
    const planet = nextSession.planets.find((p) => p.id === fleet.targetPlanetId);
    if (!planet) return;
    const fleetOwner = session.players.find((p) => p.id === fleet.ownerId);
    const fleetOwnerName = fleetOwner?.name || "Desconhecido";
    const fleetOwnerColor = fleetOwner?.color || "text-gray-300";
    const planetOwner = session.players.find((p) => p.id === planet.ownerId);
    const planetOwnerName = planetOwner ? planetOwner.name : "Planeta Neutro";
    const planetOwnerColor = planetOwner ? planetOwner.color : "text-gray-400";
    if (planet.ownerId === fleet.ownerId) {
      planet.ships += fleet.ships;
      nextLogEvent(
        "reinforcement_arrived",
        fleetOwnerName,
        fleetOwnerColor,
        `Refor\xE7o de ${fleet.ships} naves pousou em seu planeta ${planet.name}.`,
        `Novo total de naves: ${planet.ships}.`
      );
    } else {
      const attackerShipsBefore = fleet.ships;
      const defenderShipsBefore = planet.ships;
      const battle = simulateBattle(
        fleet.ships,
        fleet.killPercent,
        planet.ships,
        planet.killPercent
      );
      const attackerLost = attackerShipsBefore - battle.remainingAttackingShips;
      const defenderLost = defenderShipsBefore - (battle.winnerId === "defender" ? battle.remainingDefendingShips : 0);
      const conquered = battle.winnerId === "attacker";
      lastTurnBattles.push({
        planetId: planet.id,
        planetName: planet.name,
        attackerId: fleet.ownerId,
        attackerName: fleetOwnerName,
        attackerColor: fleetOwner?.color || "gray",
        defenderId: planet.ownerId || "neutral",
        defenderName: planetOwnerName,
        defenderColor: planetOwner?.color || "slate",
        attackerShipsSent: attackerShipsBefore,
        defenderShipsBefore,
        attackerLost,
        defenderLost,
        conquered,
        rounds: battle.rounds
      });
      if (battle.winnerId === "attacker") {
        planet.ownerId = fleet.ownerId;
        planet.ships = battle.remainingAttackingShips;
        nextLogEvent(
          "planet_conquered",
          fleetOwnerName,
          fleetOwnerColor,
          `Conquistou o planeta ${planet.name} de ${planetOwnerName}!`,
          `Combate espantoso em ${battle.rounds} frentes. Sobraram ${planet.ships} naves inimigas assumindo a defesa.`
        );
      } else {
        planet.ships = battle.remainingDefendingShips;
        nextLogEvent(
          "planet_defended",
          planetOwnerName,
          planetOwnerColor,
          `Defendeu com sucesso o planeta ${planet.name} contra frota de ${fleetOwnerName}.`,
          `Ataque de ${fleet.ships} naves aniquilado. ${planet.ships} naves de defesa restantes.`
        );
      }
    }
  });
  nextSession.lastTurnBattles = lastTurnBattles;
  nextSession.planets = nextSession.planets.map((planet) => {
    if (planet.ownerId && planet.ownerId !== "neutral") {
      return {
        ...planet,
        ships: planet.ships + planet.production
      };
    }
    return planet;
  });
  const activePlanetOwners = new Set(
    nextSession.planets.map((p) => p.ownerId).filter((ownerId) => ownerId !== null && ownerId !== "neutral")
  );
  const playersWithFleets = new Set(nextSession.fleets.map((f) => f.ownerId));
  const survivingPlayerIds = session.players.filter((p) => p.id !== "neutral").map((p) => p.id).filter((pid) => activePlanetOwners.has(pid) || playersWithFleets.has(pid));
  if (survivingPlayerIds.length === 1) {
    nextSession.status = "game_over";
    nextSession.winnerId = survivingPlayerIds[0];
  } else if (survivingPlayerIds.length === 0) {
    nextSession.status = "game_over";
    nextSession.winnerId = null;
  }
  return nextSession;
}

// server.ts
var app = (0, import_express.default)();
app.use(import_express.default.json());
var PORT = 3e3;
var activeRooms = {};
var pendingOrders = {};
var aiClient = null;
function getGemini() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key.includes("MY_GEMINI") || key.trim() === "") {
      throw new Error("GEMINI_API_KEY_MISSING");
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
});
app.get("/api/wi-fi-info", (req, res) => {
  const interfaces = import_os.default.networkInterfaces();
  const addresses = [];
  for (const k in interfaces) {
    const inf = interfaces[k];
    if (inf) {
      for (const k2 in inf) {
        const address = inf[k2];
        if (address.family === "IPv4" && !address.internal) {
          addresses.push(address.address);
        }
      }
    }
  }
  res.json({ ips: addresses, port: PORT });
});
app.post("/api/gemini/make-turn", async (req, res) => {
  const { session } = req.body;
  if (!session) {
    return res.status(400).json({ error: "Sess\xE3o nula fornecida." });
  }
  const geminiPlayer = session.players.find((p) => p.isGemini);
  if (!geminiPlayer) {
    return res.status(400).json({ error: "Nenhum jogador comandado por IA Gemini na partida." });
  }
  const persona = session.geminiPersona || "Imperador Alien\xEDgena Calculista";
  const geminiPlanets = session.planets.filter((p) => p.ownerId === geminiPlayer.id);
  const playerPlanets = session.planets.filter((p) => p.ownerId && p.ownerId !== geminiPlayer.id && p.ownerId !== "neutral");
  const neutralPlanets = session.planets.filter((p) => !p.ownerId || p.ownerId === "neutral");
  const transitingFleets = session.fleets;
  const statePrompt = `
Voc\xEA \xE9 o Grande Comandante Gemini, sua personalidade para esta partida \xE9 de "${persona}".
Voc\xEA est\xE1 jogando Konquest (Conquista Gal\xE1ctica), um jogo de estrat\xE9gia em tempo de frotas espaciais.
As regras:
- Voc\xEA ganha quando conquistar todos os planetas ou eliminar o advers\xE1rio.
- Voc\xEA s\xF3 pode enviar frotas dos planetas que domina atualmente.
- Planetas t\xEAm: ID (letra), "ships" (n\xFAmero de frota atual defendendo o planeta), "production" (quantas naves novas ele fabrica por turno), "killPercent" (chance de cada nave acertar no combate, entre 0.35 e 0.85).
- Enviar frotas reduz as naves do planeta de origem imediatamente.
- Frotas em tr\xE2nsito lutam ao chegar no destino herdando o "killPercent" de seu planeta de origem.

ESTADO DA GAL\xC1XIA NO TURNO ${session.turn}:

NOSSOS PLANETAS DOMINADOS (IA):
${geminiPlanets.map((p) => `- ID: ${p.id} (${p.name}), Naves Atuais: ${p.ships}, Produ\xE7\xE3o/Turno: ${p.production}, Taxa de Tiro: ${p.killPercent}`).join("\n")}

PLANETAS INIMIGOS (HUMANO):
${playerPlanets.map((p) => `- ID: ${p.id} (${p.name}), Naves Atuais: ${p.ships}, Produ\xE7\xE3o/Turno: ${p.production}, Taxa de Tiro: ${p.killPercent}`).join("\n")}

PLANETAS NEUTROS (Livres para conquistar, suas frotas defensivas n\xE3o produzem novas naves nem mudam de tamanho at\xE9 serem atacados):
${neutralPlanets.map((p) => `- ID: ${p.id} (${p.name}), Naves Atuais: ${p.ships}, Produ\xE7\xE3o/Turno: ${p.production}, Taxa de Tiro: ${p.killPercent}`).join("\n")}

FROTAS ATIVAS NO ESPA\xC7O:
${transitingFleets.map((f) => `- Pertence a: ${f.ownerId}, Origem: ${f.originPlanetId}, Destino: ${f.targetPlanetId}, Naves: ${f.ships}, Turnos Restantes: ${f.turnsRemaining}`).join("\n")}

SUA TAREFA:
1. Examine a gal\xE1xia. Decida enviar naves de nossos planetas dominados para planetas inimigos ou neutros para conquist\xE1-los, ou enviar para nossos pr\xF3prios planetas como refor\xE7os.
2. IMPORTANTE: N\xE3o envie mais naves do que as dispon\xEDveis em um planeta! Deixe pelo menos 2 naves defendendo cada origem (para n\xE3o ficar indefeso). Se um planeta tiver pouca nave (menos de 5), evite tirar dele.
3. Seus alvos preferenciais devem ser planetas neutros fracos (poucas naves) para expandir sua economia, ou planetas inimigos vulner\xE1veis.
4. Gere ordens de despacho ("dispatch") formadas por:
   - "origin": ID do planeta de origem (Ex: "A")
   - "target": ID do planeta de destino (Ex: "B")
   - "shipsPercent": Porcentagem de naves dispon\xEDveis no planeta para enviar (de 10 a 90). O valor ser\xE1 convertido em naves pelo motor do jogo.
5. Escreva um coment\xE1rio de provoca\xE7\xE3o ou frase de efeito de comandante ("banter") em portugu\xEAs sobre o estado do jogo. Fa\xE7a provoca\xE7\xF5es adequadas ao perfil do "${persona}". \xC9 muito importante que isso seja criativo e zombeteiro com o jogador humano!

Responda rigorosamente em formato JSON que obedece ao seguinte esquema.
`;
  try {
    const ai = getGemini();
    const apiCall = ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: statePrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            dispatch: {
              type: import_genai.Type.ARRAY,
              description: "Lista de frotas espaciais a serem enviadas ou mobilizadas neste turno",
              items: {
                type: import_genai.Type.OBJECT,
                properties: {
                  origin: { type: import_genai.Type.STRING, description: "Letra ID do planeta de origem" },
                  target: { type: import_genai.Type.STRING, description: "Letra ID do planeta de destino" },
                  shipsPercent: { type: import_genai.Type.INTEGER, description: "Porcentagem de naves a se enviar, ex: 50" }
                },
                required: ["origin", "target", "shipsPercent"]
              }
            },
            banter: {
              type: import_genai.Type.STRING,
              description: "Fala c\xF4mica ou militar provocadora voltada ao jogador humano em portugu\xEAs"
            }
          },
          required: ["dispatch", "banter"]
        }
      }
    });
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Timeout de resposta da API Gemini excedeu o limite seguro de 12s")), 12e3);
    });
    const result = await Promise.race([apiCall, timeoutPromise]);
    const parsed = JSON.parse(result.text || "{}");
    res.json(parsed);
  } catch (error) {
    const isQuotaExceeded = error?.message?.includes("RESOURCE_EXHAUSTED") || error?.status === "RESOURCE_EXHAUSTED" || error?.message?.includes("quota") || error?.message?.includes("429");
    if (isQuotaExceeded) {
      console.warn("Gemini API Quota Limit Exceeded (429 RESOURCE_EXHAUSTED) - Executing high-quality local CPU logic instead.");
    } else {
      console.warn("Gemini API Error, executing high-quality local CPU logic instead:", error?.message || error);
    }
    const dispatch = [];
    const planetsNeededToConquer = [...playerPlanets, ...neutralPlanets].sort((a, b) => a.ships - b.ships);
    geminiPlanets.forEach((p) => {
      if (p.ships > 8) {
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
      "A majestade das frotas cibern\xE9ticas do Imp\xE9rio cobrir\xE1 cada constela\xE7\xE3o do seu radar.",
      "Conquistar o setor espacial \xE9 uma f\xF3rmula l\xF3gica simples. Voc\xEA \xE9 apenas um ru\xEDdo na equa\xE7\xE3o.",
      "Diga adeus a seus mundos pacatos. A coloniza\xE7\xE3o industrial mecanizada come\xE7ou."
    ];
    const banter = standardBanters[Math.floor(Math.random() * standardBanters.length)];
    res.json({ dispatch, banter, isFallback: true });
  }
});
app.post("/api/multiplayer/create", (req, res) => {
  const { hostName, hostColor, mapSize, planetsCount } = req.body;
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let roomId = "";
  do {
    roomId = "";
    for (let j = 0; j < 4; j++) {
      roomId += letters[Math.floor(Math.random() * 26)];
    }
  } while (activeRooms[roomId]);
  const hostPlayer = {
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
  const planets = generatePlanets(count, 14, 8, initialPlayers);
  const session = {
    roomId,
    mode: "wifi_multiplayer" /* WIFI_MULTIPLAYER */,
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
        message: `Sala ${roomId} estabelecida no v\xE1cuo estelar. No aguardo de jogadores.`
      }
    ]
  };
  activeRooms[roomId] = session;
  pendingOrders[roomId] = {};
  res.json(session);
});
app.post("/api/multiplayer/join", (req, res) => {
  const { roomId, playerName, playerColor } = req.body;
  const cleanId = (roomId || "").toUpperCase().trim();
  const session = activeRooms[cleanId];
  if (!session) {
    return res.status(404).json({ error: "Sala estelar n\xE3o encontrada." });
  }
  if (session.status !== "lobby") {
    return res.status(400).json({ error: "A partida nesta sala j\xE1 est\xE1 em andamento." });
  }
  if (session.players.length >= 6) {
    return res.status(400).json({ error: "A sala estelar informada j\xE1 est\xE1 cheia (m\xE1ximo 6 jogadores)." });
  }
  const hasNameConflict = session.players.some((p) => p.name.toLowerCase() === playerName.toLowerCase());
  const finalName = hasNameConflict ? `${playerName} #${session.players.length + 1}` : playerName;
  const availableColors = ["rose", "cyan", "amber", "violet", "fuchsia", "emerald", "blue", "orange"];
  const takenColors = session.players.map((p) => p.color);
  const nextColor = availableColors.find((c) => !takenColors.includes(c)) || playerColor || "fuchsia";
  const guestPlayer = {
    id: `player-guest-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
    name: finalName || `Almirante ${session.players.length + 1}`,
    color: nextColor,
    isHuman: true,
    isCPU: false,
    isGemini: false,
    deviceInfo: "Wi-Fi Guest"
  };
  session.players.push(guestPlayer);
  session.logs.unshift({
    id: `sys-${Date.now()}`,
    turn: 1,
    type: "chat_message",
    playerName: "Sistema",
    playerColor: "text-amber-400",
    message: `${guestPlayer.name} uniu-se \xE0 sala gal\xE1ctica!`
  });
  res.json({ session, playerId: guestPlayer.id });
});
app.get("/api/multiplayer/status/:roomId", (req, res) => {
  const cleanId = req.params.roomId.toUpperCase().trim();
  const session = activeRooms[cleanId];
  if (!session) {
    return res.status(404).json({ error: "Sala estelar n\xE3o encontrada." });
  }
  res.json(session);
});
app.post("/api/multiplayer/start/:roomId", (req, res) => {
  const cleanId = req.params.roomId.toUpperCase().trim();
  const { playerId } = req.body;
  const session = activeRooms[cleanId];
  if (!session) {
    return res.status(404).json({ error: "Sala n\xE3o encontrada." });
  }
  if (playerId !== "player-host") {
    return res.status(403).json({ error: "Apenas o hospedeiro da sala pode iniciar o game." });
  }
  if (session.players.length < 2) {
    return res.status(400).json({ error: "\xC9 necess\xE1rio ter pelo menos 2 jogadores conectados na sala para iniciar o game." });
  }
  session.status = "playing";
  session.planets = generatePlanets(session.planets.length, 14, 8, session.players);
  session.logs.unshift({
    id: `sys-${Date.now()}`,
    turn: 1,
    type: "chat_message",
    playerName: "Sistema",
    playerColor: "text-amber-500",
    message: "A ger\xEAncia gal\xE1ctica autorizou a igni\xE7\xE3o! Motores em for\xE7a m\xE1xima."
  });
  res.json(session);
});
app.post("/api/multiplayer/submit-orders/:roomId", (req, res) => {
  const { playerId, fleets } = req.body;
  const cleanId = req.params.roomId.toUpperCase().trim();
  const session = activeRooms[cleanId];
  if (!session) {
    return res.status(404).json({ error: "Sess\xE3o n\xE3o encontrada." });
  }
  if (session.status !== "playing") {
    return res.status(400).json({ error: "A partida n\xE3o est\xE1 no estado ativo de turnos." });
  }
  if (!session.submittedTurns.includes(playerId)) {
    session.submittedTurns.push(playerId);
  }
  if (!pendingOrders[cleanId]) {
    pendingOrders[cleanId] = {};
  }
  pendingOrders[cleanId][playerId] = fleets;
  const activePlanetOwners = new Set(session.planets.map((p) => p.ownerId).filter(Boolean));
  const playersWithFleets = new Set(session.fleets.map((f) => f.ownerId));
  const activePlayers = session.players.filter((p) => {
    return activePlanetOwners.has(p.id) || playersWithFleets.has(p.id);
  });
  const requiredSubmissions = activePlayers.map((p) => p.id);
  const allReady = requiredSubmissions.every((id) => session.submittedTurns.includes(id));
  if (allReady) {
    const combinedOrders = [];
    session.players.map((p) => p.id).forEach((id) => {
      const orders = pendingOrders[cleanId][id] || [];
      combinedOrders.push(...orders);
    });
    const nextSession = advanceTurnState(session, combinedOrders);
    session.turn = nextSession.turn;
    session.status = nextSession.status;
    session.planets = nextSession.planets;
    session.fleets = nextSession.fleets;
    session.logs = nextSession.logs;
    session.winnerId = nextSession.winnerId;
    session.submittedTurns = [];
    pendingOrders[cleanId] = {};
  }
  res.json(session);
});
app.post("/api/multiplayer/leave/:roomId", (req, res) => {
  const { playerId } = req.body;
  const cleanId = req.params.roomId.toUpperCase().trim();
  const session = activeRooms[cleanId];
  if (session) {
    if (!playerId || playerId === "player-host") {
      delete activeRooms[cleanId];
      delete pendingOrders[cleanId];
    } else {
      session.players = session.players.filter((p) => p.id !== playerId);
      session.logs.unshift({
        id: `sys-${Date.now()}`,
        turn: session.turn,
        type: "chat_message",
        playerName: "Sistema",
        playerColor: "text-rose-400",
        message: `O jogador desconectou-se ou retirou-se da sala.`
      });
    }
  }
  res.json({ success: true });
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Konquest Server] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[Konquest Server] Dev client served locally via Express-Vite bridge`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
