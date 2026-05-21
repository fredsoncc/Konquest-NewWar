import React, { useState, useEffect } from "react";
import { Bluetooth, ShieldCheck, Cpu, Smartphone, RefreshCw, Radio } from "lucide-react";
import { Player } from "../types";

interface BluetoothScannerProps {
  onDevicePaired: (guestPlayer: Player) => void;
  onCancel: () => void;
}

interface Device {
  id: string;
  name: string;
  model: string;
  status: "available" | "pairing" | "paired";
  color: string;
}

export function BluetoothScanner({ onDevicePaired, onCancel }: BluetoothScannerProps) {
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [log, setLog] = useState<string>("Iniciando rádio Bluetooth Smart v5.3...");

  // Mock nearby Bluetooth devices
  const mockDevices: Device[] = [
    { id: "bt-1", name: "Galaxy S25 de Fredson", model: "Samsung Galaxy S25 Ultra", status: "available", color: "emerald" },
    { id: "bt-2", name: "Almirante Spock Pad", model: "Vulcan Pad Pro", status: "available", color: "blue" },
    { id: "bt-3", name: "Millennium Falcon Subdeck", model: "Corellian Console", status: "available", color: "amber" },
    { id: "bt-4", name: "Aparelho do Almirante", model: "Xiaomi Redmi Note 13", status: "available", color: "fuchsia" },
    { id: "bt-5", name: "KDE Plasma Tab", model: "PineTab KDE Edition", status: "available", color: "violet" }
  ];

  useEffect(() => {
    if (isScanning) {
      setLog("Escaneando frequências piconet (2.4 GHz)...");
      const timer = setTimeout(() => {
        setDevices(mockDevices);
        setIsScanning(false);
        setLog("Dispositivos detectados no alcance espacial.");
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isScanning]);

  const handlePair = (device: Device) => {
    // Update status to pairing
    setDevices((prev) =>
      prev.map((d) => (d.id === device.id ? { ...d, status: "pairing" } : d))
    );
    setLog(`Negociando chaves SDP com ${device.name}...`);

    setTimeout(() => {
      // Complete pairing
      setDevices((prev) =>
        prev.map((d) => (d.id === device.id ? { ...d, status: "paired" } : d))
      );
      setLog(`Canal SPP criptografado ativo com ${device.name}!`);

      setTimeout(() => {
        // Callback with paired virtual guest player
        const guestPlayer: Player = {
          id: `player-bt-${device.id}`,
          name: device.name,
          color: device.color,
          isHuman: true,
          isCPU: false,
          isGemini: false,
          deviceInfo: `Piconet: ${device.model}`
        };
        onDevicePaired(guestPlayer);
      }, 1000);

    }, 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-slate-100 bg-slate-950 rounded-xl max-w-md mx-auto border border-slate-800 shadow-2xl relative overflow-hidden">
      
      {/* Decorative stars / radar grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(0,0,0,0.85))] pointer-events-none" />

      <div className="flex items-center gap-2 mb-4 text-emerald-400 z-10">
        <Bluetooth className="w-5 h-5 animate-pulse" />
        <span className="text-xs uppercase tracking-widest font-bold">Bluetooth Multiplayer</span>
      </div>

      <h2 className="text-lg font-black tracking-tight text-white mb-1 text-center leading-none z-10">
        PAREAMENTO PIX-MESH
      </h2>
      <p className="text-xs text-slate-400 text-center mb-6 max-w-xs z-10">
        Aproxime o outro dispositivo Android com Bluetooth ligado para sincronizar a sessão.
      </p>

      {/* Radar Graphic */}
      <div className="relative w-40 h-40 mb-6 flex items-center justify-center z-10">
        
        {/* Pulsing rings */}
        <div className={`absolute inset-0 rounded-full border border-emerald-500/10 ${isScanning ? "animate-[ping_3s_infinite]" : ""}`} />
        <div className="absolute w-28 h-28 rounded-full border border-emerald-500/20" />
        <div className="absolute w-14 h-14 rounded-full border border-emerald-500/30" />
        
        {/* Rotating sweep */}
        {isScanning && (
          <div className="absolute inset-0 rounded-full border border-emerald-500/40 animate-[spin_4s_linear_infinite] origin-center bg-gradient-to-tr from-emerald-500/0 via-emerald-500/0 to-emerald-500/20" />
        )}

        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/80 flex items-center justify-center text-emerald-400">
          <Radio className="w-5 h-5 animate-pulse" />
        </div>
      </div>

      {/* Live Logging */}
      <div className="w-full bg-black/40 border border-slate-900 rounded-lg p-2.5 mb-6 text-[10px] font-mono text-emerald-400 flex items-center gap-2 z-10">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
        <p className="line-clamp-1">{log}</p>
      </div>

      {/* Main Area */}
      <div className="w-full h-44 overflow-y-auto pr-1.5 flex flex-col gap-2.5 z-10">
        {isScanning ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-xs font-semibold">Varrendo espectro de frequência...</span>
          </div>
        ) : (
          devices.map((device) => {
            const isPairing = device.status === "pairing";
            const isPaired = device.status === "paired";

            return (
              <div
                key={device.id}
                className="flex items-center justify-between p-3 bg-slate-900/80 border border-slate-800/60 rounded-xl hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center text-slate-400 border border-slate-800">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">{device.name}</p>
                    <p className="text-[9px] text-slate-500 font-mono">{device.model}</p>
                  </div>
                </div>

                <button
                  id={`btn-pair-device-${device.id}`}
                  onClick={() => handlePair(device)}
                  disabled={isPairing || isPaired}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1 ${
                    isPaired
                      ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-950"
                      : isPairing
                      ? "bg-slate-800 text-slate-500 pointer-events-none"
                      : "bg-slate-950 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/80"
                  }`}
                >
                  {isPaired ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Ativo
                    </>
                  ) : isPairing ? (
                    "Pareando..."
                  ) : (
                    "Conectar"
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      <button
        onClick={onCancel}
        className="mt-6 w-full py-2.5 text-xs text-center font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800/40 rounded-xl active:scale-95 transition-transform z-10"
      >
        Voltar ao Menu
      </button>

    </div>
  );
}
