export enum GameMode {
  LOCAL_PASS_AND_PLAY = "local_pass_play",
  WIFI_MULTIPLAYER = "wifi_multiplayer",
  GEMINI_AI_CHALLENGE = "gemini_challenge"
}

export interface Player {
  id: string;
  name: string;
  color: string; // Tailwind class color or Hex code
  isHuman: boolean;
  isCPU: boolean;
  isGemini: boolean;
  deviceInfo?: string; // For Bluetooth/Wi-Fi info
}

export interface Planet {
  id: string;
  name: string;
  x: number; // grid position X (0-14)
  y: number; // grid position Y (0-9)
  ownerId: string | null; // null for Neutral
  ships: number;
  production: number; // ships per turn (e.g. 2-8)
  killPercent: number; // defensive modifier (e.g. 0.35 to 0.85)
}

export interface Fleet {
  id: string;
  ownerId: string;
  originPlanetId: string;
  targetPlanetId: string;
  ships: number;
  turnsTotal: number;
  turnsRemaining: number;
  killPercent: number; // inherited from original owner planet's defense rating!
}

export interface LogEvent {
  id: string;
  turn: number;
  type: "fleet_launched" | "planet_conquered" | "planet_defended" | "reinforcement_arrived" | "battle_draw" | "chat_message";
  playerName: string;
  playerColor: string;
  message: string;
  details?: string;
}

export interface BattleSummary {
  planetId: string;
  planetName: string;
  attackerId: string;
  attackerName: string;
  attackerColor: string;
  defenderId: string;
  defenderName: string;
  defenderColor: string;
  attackerShipsSent: number;
  defenderShipsBefore: number;
  attackerLost: number;
  defenderLost: number;
  conquered: boolean;
  rounds: number;
}

export interface GameSession {
  roomId: string;
  mode: GameMode;
  status: "lobby" | "playing" | "game_over";
  turn: number;
  players: Player[];
  planets: Planet[];
  fleets: Fleet[];
  currentTurnPlayerId: string; // relevant for Local Pass & Play
  submittedTurns: string[]; // List of playerIds who submitted for current turn
  logs: LogEvent[];
  geminiPersona?: string; // Persona of the Gemini opponent
  geminiReaction?: string; // Latest banter text from Gemini
  winnerId?: string | null;
  lastTurnBattles?: BattleSummary[];
}
