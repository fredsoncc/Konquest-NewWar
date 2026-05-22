import { Planet, Player, Fleet, LogEvent, GameSession, GameMode, BattleSummary } from "./types";

// Standard planet names list
const STAR_SYSTEMS = [
  "Vega", "Sirius", "Arcturus", "Regulus", "Capella", "Rigel", "Deneb", 
  "Antares", "Altair", "Spica", "Pollux", "Fomalhaut", "Aldebaran", "Hoth",
  "Tatooine", "Endor", "Naboo", "Coruscant", "Alderaan", "Kamino", "Geonosis",
  "Dagobah", "Bespin", "Mustafar", "Corellia", "Kessel", "Yavin"
];

// Helper to generate unique random coordinates
export function generatePlanets(count: number, width: number = 14, height: number = 8, players: Player[]): Planet[] {
  const planets: Planet[] = [];
  const assignedCoordinates = new Set<string>();

  // Ensure minimum distance between planets to make map readable
  const minDistance = 2.2;

  function isTooClose(x: number, y: number): boolean {
    for (const p of planets) {
      const dist = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
      if (dist < minDistance) return true;
    }
    return false;
  }

  // Shuffle systems list
  const names = [...STAR_SYSTEMS].sort(() => Math.random() - 0.5);

  for (let i = 0; i < count; i++) {
    let x = 0;
    let y = 0;
    let attempts = 0;
    
    // Find free spot
    do {
      x = Math.floor(Math.random() * (width - 1)) + 0.5; // offsets for cool alignments
      y = Math.floor(Math.random() * (height - 1)) + 0.5;
      attempts++;
    } while ((isTooClose(x, y) || assignedCoordinates.has(`${x},${y}`)) && attempts < 100);

    assignedCoordinates.add(`${x},${y}`);

    const name = names[i % names.length];
    
    // Create planet
    planets.push({
      id: String.fromCharCode(65 + (i % 26)), // A, B, C...
      name,
      x,
      y,
      ownerId: null, // Neutral initially
      ships: Math.floor(Math.random() * 12) + 6, // 6 to 17 neutral defense ships
      production: Math.floor(Math.random() * 5) + 2, // 2 to 6 production rate
      killPercent: parseFloat((Math.random() * 0.4 + 0.35).toFixed(2)), // 0.35 to 0.75 kill percentage
    });
  }

  // Assing starting planet to each non-neutral player
  const humanAndCpuPlayers = players.filter(p => p.id !== "neutral");
  
  // Distribute starting planets symmetrically or spaced out
  const sortedPlanets = [...planets];
  
  // Sort planets by distance from bottom-left and top-right to give clear start placements
  humanAndCpuPlayers.forEach((player, idx) => {
    let startPlanet: Planet;
    if (idx === 0) {
      // Bottom left-ish starting planet
      sortedPlanets.sort((a, b) => (a.x + a.y) - (b.x + b.y));
      startPlanet = sortedPlanets[0];
    } else if (idx === 1) {
      // Top right-ish starting planet
      sortedPlanets.sort((a, b) => (b.x + b.y) - (a.x + a.y));
      startPlanet = sortedPlanets[0];
    } else {
      // Random starting planet far from others
      const neutralPlanets = sortedPlanets.filter(p => p.ownerId === null);
      startPlanet = neutralPlanets[Math.floor(Math.random() * neutralPlanets.length)] || sortedPlanets[idx];
    }

    startPlanet.ownerId = player.id;
    startPlanet.ships = 20; // Default startup fleet
    startPlanet.production = 5; // Good startup production
    startPlanet.killPercent = 0.65; // High defensive rate for home world
  });

  return planets;
}

// Calculate distance between two planets
export function calculateDistance(p1: Planet, p2: Planet): number {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

// Calculate turn travel duration based on distance
export function calculateTravelTurns(p1: Planet, p2: Planet): number {
  const dist = calculateDistance(p1, p2);
  return Math.max(1, Math.round(dist));
}

// Battle Simulation: Round-based combat till death
export interface BattleResult {
  winnerId: string | null;
  remainingAttackingShips: number;
  remainingDefendingShips: number;
  rounds: number;
  attackerDead: boolean;
  defenderDead: boolean;
}

export function simulateBattle(
  attackerCount: number,
  attackerKillRate: number,
  defenderCount: number,
  defenderKillRate: number
): BattleResult {
  // Ensure we have sanitize integers and positive counts
  let A = Math.max(0, Math.floor(attackerCount || 0));
  let D = Math.max(0, Math.floor(defenderCount || 0));
  let rounds = 0;

  // Safeguard battle percentages against NaN, negative, or complete zero variables 
  // to avoid infinite mathematical stagnation
  const aRate = isNaN(attackerKillRate) || attackerKillRate <= 0 ? 0.55 : Math.max(0.05, Math.min(0.95, attackerKillRate));
  const dRate = isNaN(defenderKillRate) || defenderKillRate <= 0 ? 0.55 : Math.max(0.05, Math.min(0.95, defenderKillRate));

  while (A > 0 && D > 0) {
    rounds++;
    let defenderHits = 0;
    let attackerHits = 0;

    // Defender fires at attackers
    for (let i = 0; i < D; i++) {
      if (Math.random() < dRate) {
        defenderHits++;
      }
    }

    // Attacker fires at defenders
    for (let i = 0; i < A; i++) {
      if (Math.random() < aRate) {
        attackerHits++;
      }
    }

    // Apply casualties simultaneously
    A = Math.max(0, A - defenderHits);
    D = Math.max(0, D - attackerHits);

    // Guard against infinite loop
    if (rounds > 500) break;
  }

  // If both reach 0 in the same round, let the defender win with 1 survival ship to keep the world guarded
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

// Processes orders and advances turn for a game state
export function advanceTurnState(session: GameSession, turnOrders: Fleet[]): GameSession {
  const nextSession = { ...session };
  nextSession.turn += 1;
  nextSession.status = "playing";

  const nextLogEvent = (
    type: LogEvent["type"],
    playerName: string, 
    color: string, 
    message: string, 
    details?: string
  ) => {
    nextSession.logs.unshift({
      id: `log-${Date.now()}-${Math.random()}`,
      turn: session.turn, // record for turn just completed
      type,
      playerName,
      playerColor: color,
      message,
      details
    });
  };

  // 1. Add new fleets dispatched this turn to the ongoing fleets pool
  const allFleets = [...nextSession.fleets];
  
  turnOrders.forEach(f => {
    allFleets.push({
      ...f,
      id: `fleet-${Date.now()}-${Math.random()}`
    });

    // Reduce ships from origin planets instantly
    const origin = nextSession.planets.find(p => p.id === f.originPlanetId);
    if (origin) {
      origin.ships = Math.max(0, origin.ships - f.ships);
    }

    const player = session.players.find(p => p.id === f.ownerId);
    const originName = origin?.name || f.originPlanetId;
    const destPlanet = nextSession.planets.find(p => p.id === f.targetPlanetId);
    const destName = destPlanet?.name || f.targetPlanetId;

    nextLogEvent(
      "fleet_launched",
      player?.name || "Jogador",
      player?.color || "text-gray-400",
      `Frota de ${f.ships} naves enviada de ${originName} para ${destName}.`,
      `Chegada estimada em ${f.turnsTotal} turnos.`
    );
  });

  // 2. Decrement remaining turns for all fleets, find arriving ones
  const activeFleets: Fleet[] = [];
  const arrivingFleets: Fleet[] = [];

  allFleets.forEach(fleet => {
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

  // 3. Resolve arrivals on planets
  const lastTurnBattles: BattleSummary[] = [];

  arrivingFleets.forEach(fleet => {
    const planet = nextSession.planets.find(p => p.id === fleet.targetPlanetId);
    if (!planet) return;

    const fleetOwner = session.players.find(p => p.id === fleet.ownerId);
    const fleetOwnerName = fleetOwner?.name || "Desconhecido";
    const fleetOwnerColor = fleetOwner?.color || "text-gray-300";

    const planetOwner = session.players.find(p => p.id === planet.ownerId);
    const planetOwnerName = planetOwner ? planetOwner.name : "Planeta Neutro";
    const planetOwnerColor = planetOwner ? planetOwner.color : "text-gray-400";

    if (planet.ownerId === fleet.ownerId) {
      // Friendly reinforcement
      planet.ships += fleet.ships;
      nextLogEvent(
        "reinforcement_arrived",
        fleetOwnerName,
        fleetOwnerColor,
        `Reforço de ${fleet.ships} naves pousou em seu planeta ${planet.name}.`,
        `Novo total de naves: ${planet.ships}.`
      );
    } else {
      // Enemy attack!
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
        // Conquest!
        planet.ownerId = fleet.ownerId;
        planet.ships = battle.remainingAttackingShips;
        // Keep production & kill percent unchanged
        nextLogEvent(
          "planet_conquered",
          fleetOwnerName,
          fleetOwnerColor,
          `Conquistou o planeta ${planet.name} de ${planetOwnerName}!`,
          `Combate espantoso em ${battle.rounds} frentes. Sobraram ${planet.ships} naves inimigas assumindo a defesa.`
        );
      } else {
        // Failed attack, planet defended
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

  // 4. Update production: All non-neutral planets get extra ships
  nextSession.planets = nextSession.planets.map(planet => {
    if (planet.ownerId && planet.ownerId !== "neutral") {
      return {
        ...planet,
        ships: planet.ships + planet.production
      };
    }
    return planet;
  });

  // 5. Check victory conditions
  const activePlanetOwners = new Set(
    nextSession.planets
      .map(p => p.ownerId)
      .filter((ownerId): ownerId is string => ownerId !== null && ownerId !== "neutral")
  );

  // If there are players who don't own any planet, check if they have active fleets in transit
  const playersWithFleets = new Set(nextSession.fleets.map(f => f.ownerId));

  const survivingPlayerIds = session.players
    .filter(p => p.id !== "neutral")
    .map(p => p.id)
    .filter(pid => activePlanetOwners.has(pid) || playersWithFleets.has(pid));

  if (survivingPlayerIds.length === 1) {
    nextSession.status = "game_over";
    nextSession.winnerId = survivingPlayerIds[0];
  } else if (survivingPlayerIds.length === 0) {
    nextSession.status = "game_over";
    nextSession.winnerId = null; // Stale mate / draw
  }

  return nextSession;
}
