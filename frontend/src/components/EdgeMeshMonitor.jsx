import React, { useState, useEffect } from 'react';
import { 
  Radio, Cpu, Volume2, VolumeX, WifiOff, Wifi, BatteryCharging, Zap, RefreshCw, 
  AlertTriangle, ShieldCheck, Activity, Layers, ArrowRight, Sun, 
  Database, CheckCircle2, HardDrive, BellRing, Gauge, Sliders, Play, Info, Sparkles
} from 'lucide-react';
import sirenAudio from '../utils/sirenAudio';

export default function EdgeMeshMonitor({ sensors }) {
  const [selectedNode, setSelectedNode] = useState('SENS-SKM-101');
  const [tiltX, setTiltX] = useState(5.2);
  const [tiltY, setTiltY] = useState(-3.1);
  const [porePressure, setPorePressure] = useState(28.5);
  const [vibrationRms, setVibrationRms] = useState(0.85);
  const [isConnected, setIsConnected] = useState(false); // Offline testing by default
  const [isAudibleSiren, setIsAudibleSiren] = useState(false);
  const [bufferedPackets, setBufferedPackets] = useState(342);
  const [isSyncing, setIsSyncing] = useState(false);
  const [edgeResult, setEdgeResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const runEdgeSim = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/edge-ai/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: selectedNode,
          tilt_x: tiltX,
          tilt_y: tiltY,
          pore_kpa: porePressure,
          vibration_rms: vibrationRms,
          is_network_connected: isConnected
        })
      });
      if (res.ok) {
        const data = await res.json();
        setEdgeResult(data);

        if (data.siren_relay_gpio_active && isAudibleSiren) {
          sirenAudio.start('klaxon');
        } else {
          sirenAudio.stop();
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulating(false);
    }
  };

  useEffect(() => {
    runEdgeSim();
  }, [selectedNode, tiltX, tiltY, porePressure, vibrationRms, isConnected]);

  useEffect(() => {
    return () => {
      sirenAudio.stop();
    };
  }, []);

  const handleToggleAudible = () => {
    const next = !isAudibleSiren;
    setIsAudibleSiren(next);
    if (!next) {
      sirenAudio.stop();
    } else if (edgeResult?.siren_relay_gpio_active) {
      sirenAudio.start('klaxon');
    }
  };

  const handleSyncBurst = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setBufferedPackets(0);
      setIsSyncing(false);
      setIsConnected(true);
    }, 1200);
  };

  // 1-Click Scenario Helpers
  const applySafeScenario = () => {
    setTiltX(1.2);
    setTiltY(0.8);
    setPorePressure(12.0);
    setVibrationRms(0.12);
  };

  const applyDangerScenario = () => {
    setTiltX(5.8);
    setTiltY(-3.6);
    setPorePressure(32.0);
    setVibrationRms(1.15);
  };

  const resultantTilt = Math.sqrt(tiltX * tiltX + tiltY * tiltY);
  const isTriggered = edgeResult?.siren_relay_gpio_active;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 text-slate-100">
      
      {/* 1. TOP BANNER: Explaining "Why Edge-AI?" in 5 seconds */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-700/80 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className={`p-3 rounded-2xl border ${isTriggered ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse' : 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'}`}>
              <Cpu className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-xl font-black text-white tracking-tight">
                  Edge AI &amp; LoRa Mesh Telemetry Simulator
                </h2>
                <span className="bg-cyan-950 text-cyan-300 border border-cyan-700/60 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                  Edge Simulation
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                <strong className="text-cyan-300">Why Edge-AI Simulator?</strong> In the Himalayas, cloudbursts frequently disrupt cellular networks. 
                This simulator models how ultra-low-power microchips (<strong className="text-white">ESP32-S3 TinyML</strong>) on slope nodes evaluate deterministic physics thresholds locally and trigger sirens even when disconnected from cloud infrastructure.
              </p>
            </div>
          </div>

          {/* Core Hardware Status Pills */}
          <div className="flex items-center space-x-3 bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-2.5">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Microchip Brain</span>
              <strong className="text-xs font-mono text-cyan-400">ESP32-S3 @ 240MHz</strong>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Internet Status</span>
              <span className={`text-xs font-bold uppercase flex items-center space-x-1 ${isConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                <span>{isConnected ? 'Online' : 'Offline Blackout'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* 2. ONE-CLICK INTERACTIVE SCENARIOS (Make it effortless to test) */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-300">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-white">Click to Test Live Scenarios:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={applySafeScenario}
              className="bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-600/70 text-emerald-200 font-bold px-3.5 py-1.5 rounded-xl transition flex items-center space-x-1.5 shadow"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>1. Normal Safe Mountain (Chip Sleeps)</span>
            </button>

            <button
              onClick={applyDangerScenario}
              className="bg-rose-950/80 hover:bg-rose-900 border border-rose-600 text-rose-200 font-bold px-3.5 py-1.5 rounded-xl transition flex items-center space-x-1.5 shadow animate-pulse"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>2. Cloudburst Landslide Breach (Instant Siren!)</span>
            </button>

            <button
              onClick={() => setIsConnected(!isConnected)}
              className={`px-3.5 py-1.5 rounded-xl border font-semibold transition flex items-center space-x-1.5 ${
                isConnected 
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' 
                  : 'bg-amber-950/80 border-amber-600 text-amber-200'
              }`}
            >
              {isConnected ? <WifiOff className="w-3.5 h-3.5 text-amber-400" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isConnected ? 'Simulate Blackout (Cut Internet)' : 'Restore Internet Connection'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. CORE 3-STEP PIPELINE: From Physical Sensors -> On-Chip AI -> Immediate Physical Siren */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span>How It Works In 3 Automatic Steps (Zero Internet Needed)</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">End-to-End Decision Time: &lt; 4 Milliseconds</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* STEP 1: SENSORS ON THE MOUNTAIN */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide">
                  Step 1 &bull; Mountain Sensors
                </span>
                <span className="text-[10px] font-mono text-slate-400">Live Telemetry</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Sensors drilled into the bedrock measure real physical movement:
              </p>
            </div>

            {/* Tilt Inclinometer */}
            <div className="space-y-1.5 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Biaxial Slope Tilt (&theta;)</span>
                <span className={`font-mono font-bold ${resultantTilt >= 4.8 ? 'text-rose-400' : 'text-cyan-400'}`}>
                  {resultantTilt.toFixed(1)}° {resultantTilt >= 4.8 ? '(CRITICAL)' : '(SAFE)'}
                </span>
              </div>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.2"
                value={tiltX}
                onChange={(e) => setTiltX(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 rounded-lg cursor-pointer h-1.5"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>0° (Vertical)</span>
                <span className="text-rose-400 font-bold">&ge;4.8° Danger Limit</span>
                <span>10°</span>
              </div>
            </div>

            {/* Subsurface Pore Pressure */}
            <div className="space-y-1.5 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Underground Water Pressure (u)</span>
                <span className={`font-mono font-bold ${porePressure >= 26.0 ? 'text-rose-400' : 'text-amber-400'}`}>
                  {porePressure} kPa {porePressure >= 26.0 ? '(BURST)' : '(NORMAL)'}
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="45"
                step="0.5"
                value={porePressure}
                onChange={(e) => setPorePressure(parseFloat(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 rounded-lg cursor-pointer h-1.5"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>5 kPa (Dry)</span>
                <span className="text-rose-400 font-bold">&ge;26 kPa Trigger Limit</span>
                <span>45 kPa</span>
              </div>
            </div>

            {/* Seismic Vibration */}
            <div className="space-y-1.5 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Soil Rupture Vibration (RMS)</span>
                <span className={`font-mono font-bold ${vibrationRms >= 0.75 ? 'text-rose-400' : 'text-sky-400'}`}>
                  {vibrationRms} g {vibrationRms >= 0.75 ? '(SLIP CREEP)' : '(QUIET)'}
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1.5"
                step="0.05"
                value={vibrationRms}
                onChange={(e) => setVibrationRms(parseFloat(e.target.value))}
                className="w-full accent-rose-500 bg-slate-800 rounded-lg cursor-pointer h-1.5"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>0.05g</span>
                <span className="text-rose-400 font-bold">&ge;0.75g Shear Trigger</span>
                <span>1.5g</span>
              </div>
            </div>

            <span className="text-[10px] text-slate-400 italic text-center block">
              &uarr; Drag sliders or click scenario buttons to test live
            </span>
          </div>

          {/* STEP 2: ON-CHIP TINYML BRAIN */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide">
                  Step 2 &bull; On-Chip AI Brain
                </span>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                  TensorFlow Lite (INT8)
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                The microchip on the slope runs an INT8 neural network inside SRAM with zero external internet:
              </p>
            </div>

            {/* Neural Evaluation Display */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">On-Device AI Risk Score:</span>
                <strong className={`text-base font-mono font-bold ${isTriggered ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {edgeResult ? (edgeResult.edge_risk_score * 100).toFixed(1) : '15.0'}%
                </strong>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${isTriggered ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, (edgeResult?.edge_risk_score || 0.15) * 100)}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">Decision Latency</span>
                  <strong className="text-cyan-400 text-xs">3.4 ms</strong>
                  <span className="text-slate-500 text-[8px] block">100x faster than cloud</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">Model Footprint</span>
                  <strong className="text-amber-400 text-xs">14.2 KB</strong>
                  <span className="text-slate-500 text-[8px] block">Runs inside SRAM</span>
                </div>
              </div>
            </div>

            {/* Microchip Power Profile */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Power Consumption:</span>
                <strong className={`font-mono text-xs ${isTriggered ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isTriggered ? '18.2 mA (Active Alarm)' : '14 µA (Deep Sleep)'}
                </strong>
              </div>
              <span className="text-[10px] text-slate-400 font-mono text-right">
                3+ Years Solar Life<br/>with LiFePO4
              </span>
            </div>

            <div className="text-[10px] text-center text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60 font-mono">
              Input (5 Features) &rarr; Dense 1 (16) &rarr; Dense 2 (8) &rarr; Decision
            </div>
          </div>

          {/* STEP 3: DIRECT HARDWARE ALARM ACTION */}
          <div className={`border rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between transition-all ${
            isTriggered 
              ? 'bg-rose-950/80 border-rose-500 shadow-rose-950/50' 
              : 'bg-slate-900/90 border-slate-800'
          }`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className={`text-xs font-bold uppercase tracking-wide ${isTriggered ? 'text-rose-300' : 'text-emerald-400'}`}>
                  Step 3 &bull; Autonomous Alarm Action
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  isTriggered ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400'
                }`}>
                  {isTriggered ? 'PIN 21: HIGH' : 'PIN 21: LOW'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Direct electrical solid-state relay triggered by the microchip:
              </p>
            </div>

            {/* Siren Actuation Card */}
            <div className={`p-4 rounded-xl border text-center space-y-2.5 ${
              isTriggered 
                ? 'bg-rose-900/90 border-rose-400 text-white' 
                : 'bg-slate-950/80 border-slate-800 text-slate-300'
            }`}>
              <div className="flex items-center justify-center space-x-2">
                <Volume2 className={`w-8 h-8 ${isTriggered ? 'text-white animate-bounce' : 'text-slate-500'}`} />
                <span className="text-lg font-black tracking-tight">
                  {isTriggered ? '🚨 LOUD SIREN TRIGGERED' : '✅ ALL CLEAR &bull; STANDBY'}
                </span>
              </div>

              <p className="text-xs leading-relaxed font-medium">
                {isTriggered 
                  ? 'Hardware GPIO Pin 21 is HIGH! Village emergency siren sounds across the valley & NH-31A barrier gate closes automatically.'
                  : 'Slope is stable. Microchip remains in sleep mode. Zero false alarms.'}
              </p>

              <button
                onClick={handleToggleAudible}
                className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition ${
                  isAudibleSiren 
                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                {isAudibleSiren ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span>{isAudibleSiren ? 'Speaker Audio ON (Klaxon Sounding)' : 'Turn On Audio Siren in Browser'}</span>
              </button>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-[10px] text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Relay Type:</span>
                <strong className="text-white">Solid-State Relay (SSR)</strong>
              </div>
              <div className="flex justify-between">
                <span>Autonomous Action:</span>
                <strong className={isTriggered ? 'text-rose-400' : 'text-emerald-400'}>
                  {isTriggered ? 'Immediate Siren Trip' : 'Monitoring Active'}
                </strong>
              </div>
            </div>

            <span className="text-[10px] text-center text-slate-400 font-medium block">
              &check; 100% autonomous — works even with 0 cellular network
            </span>
          </div>

        </div>
      </div>

      {/* 4. HOW DATA REACHES THE VALLEY: LoRaWAN Mountain Mesh & Blackout Storage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Mountain Hop Route */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 font-bold text-sm text-slate-200">
              <Radio className="w-4 h-4 text-emerald-400" />
              <span>How Data Reaches Central Command (LoRaWAN Mountain Mesh)</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800">
              865.2 MHz (India IN865)
            </span>
          </div>

          <p className="text-[11px] text-slate-300">
            Himalayan mountain peaks block line-of-sight. Radio signals hop across ridges to reach the central gateway:
          </p>

          {/* Visual Mountain Hop Flow */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 w-full sm:w-auto">
              <span className="text-[10px] text-cyan-400 block font-bold">1. Slope Sensor Node</span>
              <strong className="text-white text-xs">{selectedNode}</strong>
              <span className="text-[9px] text-slate-400 block mt-0.5">Underground Inclinometer</span>
            </div>

            <ArrowRight className="w-5 h-5 text-cyan-500 hidden sm:block" />

            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 w-full sm:w-auto">
              <span className="text-[10px] text-indigo-400 block font-bold">2. Mountain Ridge Repeater</span>
              <strong className="text-white text-xs">High Himalayan Peak</strong>
              <span className="text-[9px] text-slate-400 block mt-0.5">Solar Powered &bull; Hop 1</span>
            </div>

            <ArrowRight className="w-5 h-5 text-indigo-500 hidden sm:block" />

            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 w-full sm:w-auto">
              <span className="text-[10px] text-emerald-400 block font-bold">3. Valley Gateway</span>
              <strong className="text-white text-xs">SX1302 Concentrator</strong>
              <span className="text-[9px] text-slate-400 block mt-0.5">Connected to State EOC</span>
            </div>
          </div>

          {/* Signal Metrics */}
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Radio Frequency</span>
              <strong className="text-cyan-400 font-mono">865.2 MHz (IN865)</strong>
            </div>
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Signal Strength</span>
              <strong className="text-white font-mono">{edgeResult?.signal_rssi_dbm || -78} dBm</strong>
            </div>
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Solar Harvester</span>
              <strong className="text-amber-400 font-mono">{edgeResult?.solar_harvester_mw || 485} mW</strong>
            </div>
          </div>
        </div>

        {/* Blackout Memory Storage & Sensor Fleet */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Blackout Memory Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3.5 text-xs shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center space-x-2 font-bold text-slate-200">
                <HardDrive className="w-4 h-4 text-amber-400" />
                <span>Blackout Memory (SPI Flash Storage)</span>
              </div>
              <span className="text-[10px] text-amber-400 font-mono bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                No Data Loss
              </span>
            </div>

            <p className="text-[11px] text-slate-300">
              If cellular networks are cut, the microchip saves readings in local flash storage:
            </p>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Stored During Blackout:</span>
                <strong className="text-amber-400 font-mono text-base">{bufferedPackets} Packets Buffered</strong>
                <span className="text-[10px] text-slate-500 block">Capacity: 45,000 readings</span>
              </div>

              <button
                onClick={handleSyncBurst}
                disabled={isSyncing || bufferedPackets === 0}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white disabled:text-slate-500 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Flushing...' : 'Burst Sync'}</span>
              </button>
            </div>
          </div>

          {/* Regional Sensor Fleet Preview */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-200 text-xs">Regional Mountain Sensors Fleet</span>
              <span className="text-[10px] font-mono text-slate-400">{sensors?.length || 8} Active Nodes</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {sensors?.slice(0, 4).map(s => (
                <div 
                  key={s.id}
                  onClick={() => setSelectedNode(s.id)}
                  className={`p-2 rounded-xl border cursor-pointer transition ${
                    selectedNode === s.id ? 'bg-cyan-950/60 border-cyan-500' : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-white text-[11px] truncate">{s.name}</strong>
                    <span className={`w-2 h-2 rounded-full ${s.edge_alarm_state === 'TRIGGERED' ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`} />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                    <span>{s.id}</span>
                    <span className="text-emerald-400 font-bold">{s.battery_pct}% Bat</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
