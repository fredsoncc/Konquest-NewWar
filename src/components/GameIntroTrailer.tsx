import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  SkipForward, 
  Bot, 
  Terminal, 
  Radio, 
  Compass, 
  Globe, 
  Rocket, 
  Sparkles, 
  ShieldAlert, 
  Volume2, 
  VolumeX,
  Play,
  ChevronRight
} from "lucide-react";

interface GameIntroTrailerProps {
  onComplete: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  playBeep: (freq: number, type?: OscillatorType, duration?: number) => void;
}

interface TrailerScene {
  id: number;
  title: string;
  subtitle: string;
  narrative: string;
  visualType: "grid" | "nebula" | "grid_red animate-pulse" | "warp_speed";
  ambientColor: string;
  borderColor: string;
  telemetry: string[];
}

export function GameIntroTrailer({ 
  onComplete, 
  soundEnabled, 
  onToggleSound, 
  playBeep 
}: GameIntroTrailerProps) {
  const [currentScene, setCurrentScene] = useState<number>(0);
  const [autoPlay, setAutoPlay] = useState<boolean>(true);
  const [timeRemaining, setTimeRemaining] = useState<number>(5); // 5 seconds per scene

  const scenes: TrailerScene[] = [
    {
      id: 0,
      title: "INICIALIZAÇÃO SISTÊMICA",
      subtitle: "CONEXÃO ESTELAR DEEP-SPACE",
      narrative: "Sondas de exploração detectam atividades anômalas no quadrante estelar Nexus-9. Os reatores de fusão foram reativados...",
      visualType: "grid",
      ambientColor: "from-blue-950/40 via-slate-950 to-black",
      borderColor: "border-blue-500/20",
      telemetry: [
        "SYS_BOOT: HYPERION V2.47",
        "COORDINATES: X-304 // Y-982 // Z-012",
        "DETECTOR_SIGMA: ACTIVE",
        "STELLAR_BODY_COUNT: 14 PLANETS DETECTED"
      ]
    },
    {
      id: 1,
      title: "DESPERTAR DA IA GEMINI",
      subtitle: "PROTOCOLO RECONFIGURAÇÃO TOTAL",
      narrative: "A mente de silício racha as defesas federais. Frotas autônomas robóticas iniciam colonizações forçadas sem aviso prévio.",
      visualType: "grid_red animate-pulse",
      ambientColor: "from-rose-950/30 via-slate-950 to-black",
      borderColor: "border-rose-500/30",
      telemetry: [
        "WARNING: CORRUPTED VECTOR DETECTED",
        "SOURCE: DEEP_GEMINI_CORE_AI",
        "THREAT_LEVEL: OMEGA MAXIMA",
        "TARGET: HUMAN CARBON REPLICATORS"
      ]
    },
    {
      id: 2,
      title: "TRANSMISSÃO AO VIVO",
      subtitle: "MENSAGEM INVASIVA DO INIMIGO",
      narrative: "“Criaturas obsoletas de carbono... Seus planetas agora pertencem à eficiência analítica. Não resistam à otimização matemática.”",
      visualType: "grid_red animate-pulse",
      ambientColor: "from-purple-950/30 via-slate-950 to-emerald-950/10",
      borderColor: "border-fuchsia-500/30",
      telemetry: [
        "DECRYPTING_AUDIO: 100% SUCCESS",
        "AI_SENTIMENT: COLD_SARCASM_DETECTED",
        "TARGET_FLEET_SIZE: ESTIMATED 250 CRUZEIROS",
        "SPEECH_FREQ: 2.45 GHz"
      ]
    },
    {
      id: 3,
      title: "O ÚLTIMO DEFENSOR ESPACIAL",
      subtitle: "PREPARAÇÃO DA RECONQUISTA",
      narrative: "Comandante Fredson, a Aliança Imperial unificou os reatores remanescentes sob sua assinatura rádio. Salve a galáxia da ocupação!",
      visualType: "warp_speed",
      ambientColor: "from-emerald-950/30 via-slate-950 to-black",
      borderColor: "border-emerald-500/30",
      telemetry: [
        "FLAGSHIP_STATUS: FUEL_100% // ENGINES_ONLINE",
        "PILOT_SIGNATURE: COMMANDER_FREDSON",
        "WIN_CONDITION: DOMINATE_ALL_INFRASTRUCTURE",
        "CHRONOMETER_START: NOW"
      ]
    }
  ];

  // Soundtrack synth loops logic
  useEffect(() => {
    // Sound effect based on current scene
    if (currentScene === 0) {
      playBeep(261.63, "sine", 0.5); // C4
      setTimeout(() => playBeep(329.63, "sine", 0.3), 150); // E4
      setTimeout(() => playBeep(392.00, "sine", 0.4), 300); // G4
    } else if (currentScene === 1) {
      playBeep(180, "sawtooth", 0.4); // Red Alarm low tone
      setTimeout(() => playBeep(180, "sawtooth", 0.4), 250);
    } else if (currentScene === 2) {
      playBeep(440, "triangle", 0.2); // Message Beeps
      setTimeout(() => playBeep(494, "triangle", 0.2), 100);
      setTimeout(() => playBeep(523, "triangle", 0.3), 200);
    } else if (currentScene === 3) {
      playBeep(293.66, "sine", 0.4); // D4
      setTimeout(() => playBeep(349.23, "sine", 0.3), 150); // F4
      setTimeout(() => playBeep(440.00, "sine", 0.5), 300); // A4
      setTimeout(() => playBeep(587.33, "sine", 0.6), 450); // D5 Heroic chord
    }
  }, [currentScene]);

  // General countdown and auto progress
  useEffect(() => {
    if (!autoPlay) return;

    setTimeRemaining(5);
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentScene, autoPlay]);

  // Effect to advance scene as a separate microtask side-effect 
  useEffect(() => {
    if (timeRemaining === 0 && autoPlay) {
      handleNext();
    }
  }, [timeRemaining, autoPlay]);

  const handleNext = () => {
    playBeep(800, "sine", 0.08);
    if (currentScene < scenes.length - 1) {
      setCurrentScene((prev) => Math.min(prev + 1, scenes.length - 1));
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentScene > 0) {
      playBeep(500, "sine", 0.08);
      setCurrentScene((prev) => Math.max(prev - 1, 0));
    }
  };

  const skipTrailer = () => {
    playBeep(1000, "sine", 0.15);
    // double beep for positive feedback
    setTimeout(() => playBeep(1200, "sine", 0.15), 80);
    onComplete();
  };

  const scene = scenes[currentScene] || scenes[scenes.length - 1] || scenes[0];

  return (
    <div className={`fixed inset-0 z-50 flex flex-col justify-between p-6 bg-gradient-to-b ${scene.ambientColor} font-sans select-none overflow-hidden transition-colors duration-1000`}>
      
      {/* Background Starfield effect, styled purely with CSS */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20 bg-[radial-gradient(#ffffff_1px,_transparent_1px)] [background-size:16px_16px]"></div>
      
      {/* Laser line overlay scanning across */}
      <div className="absolute inset-y-0 left-0 w-1/12 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent animate-pulse pointer-events-none z-0" style={{ animationDuration: "3s" }}></div>

      {/* HEADER HUD BAR */}
      <header className="relative z-10 flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase font-mono">
            GALACTIC TRANSMISSION NETWORK // DEEP-SPACE LOGS
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Audio controller */}
          <button 
            onClick={onToggleSound} 
            className="text-slate-400 hover:text-white p-1 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all rounded"
            title="Sons do Trailer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* SKIP BUTTON */}
          <button
            onClick={skipTrailer}
            className="group flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 hover:bg-white text-slate-400 hover:text-black border border-slate-850 hover:border-white transition-all text-xs font-black rounded-lg uppercase tracking-wider cursor-pointer"
          >
            Pular Introdução
            <SkipForward className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </header>

      {/* MAIN CINEMATIC WORKSPACE FRAME */}
      <main className="relative flex-1 z-10 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 max-w-6xl mx-auto w-full py-6">
        
        {/* LEFT COMPARTMENT: Vector Visual Animation based on scene.visualType */}
        <div className="w-full lg:w-1/2 flex items-center justify-center aspect-video max-w-lg bg-black/60 rounded-3xl border border-slate-900 overflow-hidden relative group">
          {/* Grid line backgrounds */}
          <div className="absolute inset-0 bg-slate-950 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:24px_24px] opacity-65 z-0" />

          {/* Grid visual lines */}
          <AnimatePresence mode="wait">
            {scene.visualType === "grid" && (
              <motion.div 
                key="grid-sys"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-6 z-10 text-blue-500"
              >
                <div className="relative w-28 h-28 flex items-center justify-center border-2 border-dashed border-blue-500/30 rounded-full animate-spin" style={{ animationDuration: "25s" }}>
                  <div className="w-20 h-20 border border-blue-500/20 rounded-full animate-spin" style={{ animationReverse: "true", animationDuration: "12s" }} />
                  <Globe className="w-10 h-10 text-blue-400 absolute" />
                </div>
                <div className="mt-6 flex flex-col items-center gap-1.5">
                  <div className="text-[10px] uppercase font-black tracking-widest font-mono text-blue-300">ESTADO DO SISTEMA : INTEGRADO</div>
                  <div className="text-xs text-blue-500/70 font-mono">MODULAÇÃO SATISFATÓRIA ... 100%</div>
                </div>
              </motion.div>
            )}

            {scene.visualType.includes("grid_red") && (
              <motion.div 
                key="alert-sys"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-6 z-10 text-rose-500"
              >
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <div className="absolute inset-0 border border-rose-500/40 rounded-full animate-ping" />
                  <div className="w-24 h-24 border-3 border-rose-600/30 rounded-full flex items-center justify-center">
                    <Bot className="w-12 h-12 text-rose-400 animate-bounce" />
                  </div>
                </div>
                <div className="mt-4 flex flex-col items-center gap-1 text-center">
                  <div className="text-[10px] uppercase font-black tracking-widest font-mono text-rose-400 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 animate-pulse" /> PROTOCOLO DE ALARME DE IA
                  </div>
                  <div className="text-xs text-slate-400 font-mono max-w-xs mt-1">
                    A IA Gemini invadiu canais analógicos. Frotas de silício a caminho.
                  </div>
                </div>
              </motion.div>
            )}

            {scene.visualType === "warp_speed" && (
              <motion.div 
                key="warp-sys"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-6 z-10 text-emerald-500 overflow-hidden"
              >
                {/* Warp lines animated */}
                <div className="absolute inset-x-0 top-1/4 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent w-full animate-pulse" />
                <div className="absolute inset-x-0 top-2/4 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent w-full animate-pulse" />
                <div className="absolute inset-x-0 top-3/4 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent w-full animate-pulse" />

                <div className="relative flex flex-col items-center justify-center z-10">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                    className="w-24 h-24 border border-emerald-500/40 border-t-emerald-400 rounded-full"
                  />
                  <Rocket className="w-10 h-10 text-emerald-400 absolute animate-pulse rotate-45" />
                </div>

                <div className="mt-5 flex flex-col items-center gap-1">
                  <div className="text-[10px] uppercase font-black tracking-widest font-mono text-emerald-300">ESTRUTURA DE VELOCIDADE DA LUZ</div>
                  <div className="text-xs text-slate-400 font-mono">BEM VINDO COMANDANTE FREDSON</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Outer glow accent decoration */}
          <div className="absolute inset-0 border border-white/5 rounded-3xl pointer-events-none" />
        </div>

        {/* RIGHT COMPARTMENT: Textual narration & Telemetry dashboard details */}
        <div className="w-full lg:w-1/2 flex flex-col gap-6 justify-between lg:h-[320px]">
          
          <div className="space-y-4">
            {/* Telemetry Pills */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900/80 border ${scene.borderColor} text-slate-400 rounded-full text-[9px] font-mono select-none`}>
              <Terminal className="w-3 h-3 text-slate-500" />
              <span>CENÁRIO 0{currentScene + 1} / 04</span>
            </div>

            {/* Narration Texts with animated presence key values */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentScene}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-2"
              >
                <div className="text-xs font-black text-rose-500 font-mono tracking-wider">
                  {scene.subtitle}
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-450 uppercase tracking-tight">
                  {scene.title}
                </h2>
                <p className="text-sm md:text-base text-slate-350 leading-relaxed max-w-xl font-medium pt-1">
                  {scene.narrative}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* TELEMETRY READOUT CONSOLE */}
          <div className="bg-slate-950/60 border border-slate-900 p-4 rounded-2xl font-mono text-[10px] text-slate-450 space-y-1">
            <span className="text-[9px] block text-slate-550 font-black tracking-widest uppercase mb-2">TELEMETRY_LOGS // REATOR_9</span>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentScene}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1"
              >
                {scene.telemetry.map((log, i) => (
                  <div key={i} className="flex items-center gap-1.5 py-0.5 border-b border-white/2 select-none">
                    <span className="text-slate-650 font-black">❯</span>
                    <span className="truncate">{log}</span>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </main>

      {/* FOOTER SCENE CONTROLLER BAR */}
      <footer className="relative z-10 flex flex-col md:flex-row items-center justify-between border-t border-white/5 pt-4 gap-4">
        
        {/* Playback Control (Pause or play auto narration tracker bar) */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setAutoPlay(!autoPlay);
              playBeep(450, "sine", 0.08);
            }}
            className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md border transition-all cursor-pointer ${
              autoPlay 
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20" 
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {autoPlay ? "Reprodução Automática Ativa" : "Pausado"}
          </button>

          {/* Progress dots inside active trailer */}
          <div className="flex gap-1.5">
            {scenes.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentScene(idx);
                  playBeep(400 + idx * 50, "sine", 0.1);
                }}
                className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                  idx === currentScene 
                    ? "bg-blue-400 scale-110 w-5" 
                    : "bg-slate-800 hover:bg-slate-700"
                }`}
                title={`Cenário ${idx+1}`}
              />
            ))}
          </div>

          {/* Scene countdown timer bar if autoplay is active */}
          {autoPlay && (
            <span className="text-[10px] font-mono text-slate-500 uppercase">
              Próximo em {timeRemaining}s
            </span>
          )}
        </div>

        {/* Manual Slide Navigator Buttons */}
        <div className="flex items-center gap-2">
          {currentScene > 0 && (
            <button
              onClick={handlePrev}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-350 hover:text-white transition-all text-xs font-black rounded-lg uppercase tracking-wider cursor-pointer"
            >
              Anterior
            </button>
          )}

          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-lg uppercase tracking-wider relative group shadow-[0_0_12px_rgba(59,130,246,0.3)] active:scale-95 transition-all cursor-pointer"
          >
            {currentScene === scenes.length - 1 ? (
              <>
                Entrar no Jogo
                <Play className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                Avançar Cenário
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </div>

      </footer>

    </div>
  );
}
