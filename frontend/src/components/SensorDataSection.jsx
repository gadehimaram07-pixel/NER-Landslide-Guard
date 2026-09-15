import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Gauge, Zap, AlertTriangle, CheckCircle2, 
  ArrowUpRight, ArrowDownRight, ArrowRight, Play, Pause, 
  RotateCcw, Sliders, ShieldAlert, Layers, TrendingUp, 
  TrendingDown, Minus, Clock, MapPin, RefreshCw, Info, Cpu,
  Volume2, VolumeX, AlertOctagon
} from 'lucide-react';
import sirenAudio from '../utils/sirenAudio';

export default function SensorDataSection({ onAlertTriggered }) {
  const [latestData, setLatestData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [predictionData, setPredictionData] = useState(null);
  const [simulationMode, setSimulationMode] = useState('AUTO');
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isStepping, setIsStepping] = useState(false);
  const [selectedChartRange, setSelectedChartRange] = useState(30); // show last 30 readings
  const [activeTooltip, setActiveTooltip] = useState(null);

  const timerRef = useRef(null);

  // Fetch latest telemetry and prediction
  const fetchTelemetry = async () => {
    try {
      const [resLatest, resHistory, resPred] = await Promise.all([
        fetch('/api/sensors/latest'),
        fetch(`/api/sensors/history?limit=${selectedChartRange}`),
        fetch('/api/prediction/sliding-rate')
      ]);

      if (resLatest.ok) {
        const data = await resLatest.json();
        setLatestData(data);
        if (data.simulation_mode) {
          setSimulationMode(data.simulation_mode);
        }
      }
      if (resHistory.ok) {
        setHistoryData(await resHistory.json());
      }
      if (resPred.ok) {
        setPredictionData(await resPred.json());
      }
    } catch (e) {
      console.error("Error fetching sensor telemetry:", e);
    }
  };

  // Perform a single simulation step
  const handleSimulateStep = async () => {
    setIsStepping(true);
    try {
      const res = await fetch('/api/sensors/simulate-step', { method: 'POST' });
      if (res.ok) {
        await fetchTelemetry();
        if (onAlertTriggered) onAlertTriggered();
      }
    } catch (e) {
      console.error("Step error:", e);
    } finally {
      setIsStepping(false);
    }
  };

  // Change simulation mode
  const handleChangeMode = async (mode) => {
    try {
      const res = await fetch('/api/sensors/simulation-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      if (res.ok) {
        setSimulationMode(mode);
        handleSimulateStep();
      }
    } catch (e) {
      console.error("Mode update error:", e);
    }
  };

  // Reset demo sequence
  const handleResetDemo = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sensors/reset-demo', { method: 'POST' });
      if (res.ok) {
        setSimulationMode('AUTO');
        await fetchTelemetry();
        if (onAlertTriggered) onAlertTriggered();
      }
    } catch (e) {
      console.error("Reset error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchTelemetry();
  }, [selectedChartRange]);

  // Real-time interval tick (every 3 seconds if isPlaying)
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        handleSimulateStep();
      }, 3000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, simulationMode]);

  // Helper colors for states
  const getStateBadge = (state) => {
    switch (state) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-500/20',
          border: 'border-rose-500/50',
          text: 'text-rose-400',
          dot: 'bg-rose-500',
          label: 'CRITICAL'
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-500/20',
          border: 'border-amber-500/50',
          text: 'text-amber-400',
          dot: 'bg-amber-500',
          label: 'WARNING'
        };
      default:
        return {
          bg: 'bg-emerald-500/20',
          border: 'border-emerald-500/50',
          text: 'text-emerald-400',
          dot: 'bg-emerald-500',
          label: 'NORMAL'
        };
    }
  };

  const getRiskBadge = (level) => {
    switch (level) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-950/80',
          border: 'border-rose-600',
          text: 'text-rose-300',
          badge: 'bg-rose-600 text-white',
          label: 'CRITICAL RISK',
          subtext: 'Failure Imminent (>10 mm/h)'
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-950/80',
          border: 'border-orange-600',
          text: 'text-orange-300',
          badge: 'bg-orange-600 text-white',
          label: 'HIGH RISK',
          subtext: 'Accelerating Shear (5-10 mm/h)'
        };
      case 'MODERATE':
      case 'MEDIUM':
        return {
          bg: 'bg-amber-950/80',
          border: 'border-amber-600',
          text: 'text-amber-300',
          badge: 'bg-amber-600 text-white',
          label: 'MODERATE RISK',
          subtext: 'Creep Detected (2-5 mm/h)'
        };
      default:
        return {
          bg: 'bg-emerald-950/80',
          border: 'border-emerald-600',
          text: 'text-emerald-300',
          badge: 'bg-emerald-600 text-white',
          label: 'LOW RISK',
          subtext: 'Stable Slope (<2 mm/h)'
        };
    }
  };

  // Mini Sparkline SVG Generator
  const renderSparkline = (data, color = '#10b981') => {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 120;
    const height = 32;

    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg className="w-28 h-8 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {/* End pulse circle */}
        {data.length > 0 && (
          <circle
            cx={width}
            cy={height - ((data[data.length - 1] - min) / range) * (height - 8) - 4}
            r="3.5"
            fill={color}
            className="animate-pulse"
          />
        )}
      </svg>
    );
  };

  // Full Responsive Area Trend Chart
  const renderTrendChart = ({ title, keyName, unit, color, minVal, maxVal, warningThreshold, criticalThreshold }) => {
    const data = historyData.map(d => ({
      val: d[keyName],
      time: d.timestamp ? d.timestamp.split(' ')[1] || d.timestamp : '',
      status: d.risk_level
    }));

    if (data.length === 0) {
      return (
        <div className="h-48 flex items-center justify-center text-slate-500 text-xs">
          Loading historical telemetry...
        </div>
      );
    }

    const values = data.map(d => d.val);
    const currentMin = Math.min(minVal, ...values);
    const currentMax = Math.max(maxVal, ...values);
    const range = currentMax - currentMin || 1;

    const width = 500;
    const height = 140;
    const padding = { top: 15, bottom: 25, left: 35, right: 15 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const getX = (idx) => padding.left + (idx / (data.length - 1 || 1)) * chartW;
    const getY = (val) => padding.top + chartH - ((val - currentMin) / range) * chartH;

    const points = data.map((d, i) => `${getX(i)},${getY(d.val)}`).join(' ');
    const areaPoints = `${getX(0)},${padding.top + chartH} ${points} ${getX(data.length - 1)},${padding.top + chartH}`;

    // Threshold lines Y
    const warningY = warningThreshold ? getY(warningThreshold) : null;
    const criticalY = criticalThreshold ? getY(criticalThreshold) : null;

    const latestVal = values[values.length - 1];

    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between relative group hover:border-slate-700 transition">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">{title}</span>
            <div className="flex items-baseline space-x-2 mt-0.5">
              <span className="text-xl font-bold text-white font-mono">{latestVal}</span>
              <span className="text-xs text-slate-400 font-medium">{unit}</span>
            </div>
          </div>
          <div className="text-right text-[10px] text-slate-400 space-y-0.5 font-mono">
            <div>Min: <span className="text-slate-200">{Math.min(...values).toFixed(1)}</span></div>
            <div>Max: <span className="text-slate-200">{Math.max(...values).toFixed(1)}</span></div>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="w-full overflow-hidden">
          <svg className="w-full h-32" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id={`grad-${keyName}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                <stop offset="100%" stopColor={color} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid horizontal lines */}
            {[0, 0.33, 0.66, 1].map((ratio, idx) => {
              const y = padding.top + chartH * ratio;
              const val = (currentMax - ratio * range).toFixed(1);
              return (
                <g key={idx}>
                  <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#334155" strokeWidth="0.8" strokeDasharray="3 3" />
                  <text x={padding.left - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">{val}</text>
                </g>
              );
            })}

            {/* Threshold Line: Warning */}
            {warningY && warningY >= padding.top && warningY <= padding.top + chartH && (
              <g>
                <line x1={padding.left} y1={warningY} x2={width - padding.right} y2={warningY} stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 2" />
                <text x={width - padding.right} y={warningY - 3} textAnchor="end" fontSize="8" fill="#f59e0b" fontWeight="bold">WARNING ({warningThreshold})</text>
              </g>
            )}

            {/* Threshold Line: Critical */}
            {criticalY && criticalY >= padding.top && criticalY <= padding.top + chartH && (
              <g>
                <line x1={padding.left} y1={criticalY} x2={width - padding.right} y2={criticalY} stroke="#ef4444" strokeWidth="1.2" strokeDasharray="4 2" />
                <text x={width - padding.right} y={criticalY - 3} textAnchor="end" fontSize="8" fill="#ef4444" fontWeight="bold">CRITICAL ({criticalThreshold})</text>
              </g>
            )}

            {/* Filled Area */}
            <polygon fill={`url(#grad-${keyName})`} points={areaPoints} />

            {/* Line Path */}
            <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />

            {/* Active Data Circles */}
            {data.map((d, i) => (
              <circle
                key={i}
                cx={getX(i)}
                cy={getY(d.val)}
                r={i === data.length - 1 ? 4 : 2}
                fill={i === data.length - 1 ? '#ffffff' : color}
                stroke={color}
                strokeWidth="1.5"
                className="hover:r-5 cursor-pointer transition-all"
              />
            ))}
          </svg>
        </div>

        {/* X-Axis time label */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
          <span>{data[0]?.time || 'T-60m'}</span>
          <span className="text-slate-400 font-medium">Time Progression</span>
          <span>{data[data.length - 1]?.time || 'Now'}</span>
        </div>
      </div>
    );
  };

  const [sirenStatus, setSirenStatus] = useState({
    isPlaying: sirenAudio.isPlaying(),
    isMuted: sirenAudio.isMuted()
  });

  useEffect(() => {
    const unsub = sirenAudio.subscribe((state) => {
      setSirenStatus({ isPlaying: state.isPlaying, isMuted: state.isMuted });
    });
    return () => unsub();
  }, []);

  const prediction = predictionData || latestData?.prediction;
  const sensors = latestData?.sensors;
  const riskBadge = getRiskBadge(prediction?.risk_level);

  const isCriticalOrHighRisk = 
    prediction?.risk_level === 'CRITICAL' || 
    prediction?.risk_level === 'HIGH' || 
    simulationMode === 'CRITICAL' || 
    (prediction?.predicted_sliding_rate !== undefined && prediction.predicted_sliding_rate >= 5.0);

  // Trigger Audio Siren automatically whenever risk is High or Critical
  useEffect(() => {
    if (isCriticalOrHighRisk) {
      const mode = (prediction?.risk_level === 'CRITICAL' || simulationMode === 'CRITICAL' || (prediction?.predicted_sliding_rate >= 10.0)) ? 'klaxon' : 'wail';
      sirenAudio.play({ mode, duration: 8000 });
    } else {
      if (sirenAudio.isPlaying()) {
        sirenAudio.stop();
      }
    }
  }, [isCriticalOrHighRisk, prediction?.risk_level, simulationMode, prediction?.predicted_sliding_rate]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

      {/* Top Banner & Command Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="text-2xl">📡</span>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Sensor Data & Ground Sliding-Rate Prediction
            </h2>
            <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
              Live IoT Telemetry
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
            <span className="flex items-center space-x-1 text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>Location: <strong>Gangtok - Ranipool Slope Node Alpha (Sikkim)</strong></span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Last Ingested: <strong>{latestData?.timestamp || 'Synchronizing...'}</strong></span>
            </span>
            <span>•</span>
            <span className="text-emerald-400 font-medium flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>All 3 Borehole Transducers Online</span>
            </span>
          </div>
        </div>

        {/* Simulation Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 p-2 rounded-xl border border-slate-800 self-stretch lg:self-auto justify-between lg:justify-end">
          
          {/* Simulation Mode Selector */}
          <div className="flex items-center space-x-1 text-xs">
            <span className="text-slate-400 text-[11px] font-medium mr-1 flex items-center space-x-1">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Mode:</span>
            </span>
            {['NORMAL', 'WARNING', 'CRITICAL', 'AUTO'].map((m) => (
              <button
                key={m}
                onClick={() => handleChangeMode(m)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  simulationMode === m
                    ? m === 'CRITICAL' ? 'bg-rose-600 text-white shadow-md shadow-rose-900/50'
                      : m === 'WARNING' ? 'bg-amber-600 text-white shadow-md shadow-amber-900/50'
                      : m === 'NORMAL' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                      : 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="h-5 w-[1px] bg-slate-800 mx-1 hidden sm:block"></div>

          {/* Action Buttons: Play/Pause, Step, Reset */}
          <div className="flex items-center space-x-1.5 text-xs">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 transition ${
                isPlaying
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-900/30'
              }`}
              title={isPlaying ? 'Pause Auto-Tick' : 'Resume Live 3s Auto-Tick'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Live Tick'}</span>
            </button>

            <button
              onClick={handleSimulateStep}
              disabled={isStepping}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded-lg font-medium flex items-center space-x-1 transition disabled:opacity-50"
              title="Generate single simulated telemetry step"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isStepping ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Step</span>
            </button>

            <button
              onClick={handleResetDemo}
              disabled={isLoading}
              className="bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 px-2.5 py-1.5 rounded-lg font-medium flex items-center space-x-1 transition"
              title="Reset to 60-point progressive demo sequence"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>
          </div>

          <div className="h-5 w-[1px] bg-slate-800 mx-1 hidden sm:block"></div>

          {/* Siren Audio Controls */}
          <div className="flex items-center space-x-1.5 bg-slate-900/90 border border-slate-700/80 px-2 py-1 rounded-xl">
            <button
              onClick={() => sirenAudio.toggleMute()}
              className={`p-1.5 rounded-lg transition ${
                sirenStatus.isMuted
                  ? 'text-slate-500 bg-slate-800/60 hover:text-slate-300'
                  : 'text-rose-400 bg-rose-500/10 hover:text-rose-300 hover:bg-rose-500/20'
              }`}
              title={sirenStatus.isMuted ? 'Unmute Emergency Siren' : 'Mute Emergency Siren'}
            >
              {sirenStatus.isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-rose-400 animate-pulse" />}
            </button>

            <button
              onClick={() => {
                if (sirenStatus.isPlaying) {
                  sirenAudio.stop();
                } else {
                  sirenAudio.testSiren('klaxon');
                }
              }}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] uppercase tracking-wider flex items-center space-x-1.5 transition ${
                sirenStatus.isPlaying
                  ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-900/80 ring-2 ring-rose-400/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
              title={sirenStatus.isPlaying ? 'Stop Siren Audio' : 'Test Emergency Siren Sound'}
            >
              <span className={`w-2 h-2 rounded-full ${sirenStatus.isPlaying ? 'bg-white animate-ping' : 'bg-rose-500'}`}></span>
              <span>{sirenStatus.isPlaying ? 'Silence Siren' : 'Test Siren'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* SECTION 1: PROMINENT PREDICTED GROUND SLIDING RATE CARD */}
      <div className={`border rounded-2xl p-6 transition-all duration-300 shadow-2xl relative overflow-hidden ${riskBadge.bg} ${riskBadge.border}`}>
        {/* Ambient background glow */}
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-rose-600/10 blur-3xl pointer-events-none"></div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Main Number & Risk Badge */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🏔️</span>
              <h3 className="text-base font-bold text-slate-200 uppercase tracking-wider">
                Predicted Ground Sliding Rate
              </h3>
            </div>

            <div className="flex items-baseline space-x-3">
              <span className="text-5xl md:text-6xl font-extrabold text-white font-mono tracking-tight">
                {prediction?.predicted_sliding_rate !== undefined ? prediction.predicted_sliding_rate.toFixed(1) : '5.8'}
              </span>
              <span className="text-xl md:text-2xl font-semibold text-slate-300 font-sans">
                mm/hour
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className={`px-3 py-1 rounded-lg text-xs font-extrabold tracking-wide uppercase shadow ${riskBadge.badge}`}>
                Current Risk: {prediction?.risk_level || 'MEDIUM'}
              </span>

              {/* Siren Live Notification Badge */}
              <div
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition ${
                  sirenStatus.isPlaying
                    ? 'bg-rose-600/30 border-rose-500 text-rose-200 ring-2 ring-rose-500/40 animate-pulse'
                    : isCriticalOrHighRisk
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                      : 'bg-slate-900/60 border-slate-700 text-slate-400'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${sirenStatus.isPlaying ? 'bg-rose-400 animate-ping' : isCriticalOrHighRisk ? 'bg-amber-400' : 'bg-slate-500'}`}></span>
                <span>{sirenStatus.isPlaying ? '🚨 SIREN ACTIVE' : sirenStatus.isMuted ? '🔕 Siren Muted' : '🔊 Siren Armed'}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (sirenStatus.isPlaying) {
                      sirenAudio.stop();
                    } else {
                      sirenAudio.testSiren('wail');
                    }
                  }}
                  className="ml-1 text-[11px] underline text-rose-300 hover:text-white font-medium"
                >
                  {sirenStatus.isPlaying ? 'Stop' : 'Play'}
                </button>
              </div>

              {/* Trend Badge */}
              <div className="flex items-center space-x-1 bg-slate-900/80 border border-slate-700 px-3 py-1 rounded-lg text-xs font-semibold">
                {prediction?.trend === 'INCREASING' ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-rose-400" />
                    <span className="text-rose-300">Trend: ↑ Increasing</span>
                  </>
                ) : prediction?.trend === 'DECREASING' ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Trend: ↓ Decreasing</span>
                  </>
                ) : (
                  <>
                    <Minus className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300">Trend: → Stable</span>
                  </>
                )}
              </div>

              {/* Instability Score */}
              <div className="flex items-center space-x-1 bg-slate-900/80 border border-slate-700 px-3 py-1 rounded-lg text-xs font-semibold text-slate-200">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                <span>Instability Score: <strong>{prediction?.instability_score || 67}%</strong></span>
              </div>
            </div>

            {/* Transparent Honest Disclaimer */}
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
              <span>
                <strong>{prediction?.model_name || 'Explainable Sensor-Based Sliding Rate Estimator'}:</strong> {prediction?.explanation || 'Prototype estimate based on simulated sensor readings.'}
              </span>
            </div>
          </div>

          {/* Center: Sliding Rate Instability Meter */}
          <div className="lg:col-span-3 bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Kinematic Instability Scale
            </span>

            {/* Gauge progress bar */}
            <div className="space-y-1.5">
              <div className="h-3.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-600 shadow"
                  style={{ width: `${Math.min(100, Math.max(5, prediction?.instability_score || 50))}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0% (Stable)</span>
                <span>50%</span>
                <span>100% (Collapse)</span>
              </div>
            </div>

            {/* Risk Category Table */}
            <div className="text-[11px] space-y-1 pt-1 border-t border-slate-800">
              <div className="flex justify-between text-slate-400">
                <span>&lt; 2.0 mm/h:</span>
                <span className="text-emerald-400 font-semibold">Low Risk</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>2.0 - 5.0 mm/h:</span>
                <span className="text-amber-400 font-semibold">Moderate Risk</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>5.0 - 10.0 mm/h:</span>
                <span className="text-orange-400 font-semibold">High Risk</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>&gt; 10.0 mm/h:</span>
                <span className="text-rose-400 font-semibold">Critical Risk</span>
              </div>
            </div>
          </div>

          {/* Right: Real-time Sliding Rate Sparkline Graph */}
          <div className="lg:col-span-4 bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 uppercase tracking-wide">
                Time vs Sliding Rate
              </span>
              <span className="text-[10px] text-rose-400 font-mono">
                Live Stream
              </span>
            </div>

            <div className="py-2 flex items-center justify-center">
              {renderSparkline(
                historyData.map(h => h.predicted_sliding_rate),
                prediction?.risk_color || '#ef4444'
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono border-t border-slate-800 pt-1.5">
              <span>Past {historyData.length} records</span>
              <span>Updated: {latestData?.timestamp ? latestData.timestamp.split(' ')[1] : 'Just now'}</span>
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 2: THE 3 SENSOR REAL-TIME MONITORING CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              3 Primary Geotechnical Monitoring Sensors
            </h3>
          </div>
          <span className="text-xs text-slate-400">Correlated Physical Measurement Stream</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* SENSOR 1: SOIL MOISTURE SENSOR */}
          {(() => {
            const sensor = sensors?.soil_moisture;
            const stateInfo = getStateBadge(sensor?.state);
            const val = sensor?.value !== undefined ? sensor.value.toFixed(1) : '68.4';
            return (
              <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg space-y-4 transition">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Sensor 01</span>
                    <h4 className="text-base font-bold text-white flex items-center space-x-1.5 mt-0.5">
                      <span>💧 Soil Moisture</span>
                    </h4>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${stateInfo.bg} ${stateInfo.border} ${stateInfo.text}`}>
                    {stateInfo.label}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-4xl font-extrabold text-white font-mono">{val}</span>
                    <span className="text-lg font-semibold text-slate-400">{sensor?.unit || '%'}</span>
                  </div>
                  {/* Mini Sparkline */}
                  <div>
                    {renderSparkline(sensor?.recent_trend || [45, 52, 60, 68.4], '#38bdf8')}
                  </div>
                </div>

                {/* Status and Last Updated */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Status:</span>
                    <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>ONLINE</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Threshold Guide:</span>
                    <span className="text-slate-300 font-mono text-[11px]">Norm: 20-55% | Crit: &gt;70%</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Last Ingest:</span>
                    <span className="text-slate-300 font-mono text-[11px]">{sensor?.last_updated || 'Active'}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* SENSOR 2: GROUND VIBRATION SENSOR */}
          {(() => {
            const sensor = sensors?.vibration;
            const stateInfo = getStateBadge(sensor?.state);
            const val = sensor?.value !== undefined ? sensor.value.toFixed(2) : '4.80';
            return (
              <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg space-y-4 transition">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Sensor 02</span>
                    <h4 className="text-base font-bold text-white flex items-center space-x-1.5 mt-0.5">
                      <span>⚡ Ground Vibration</span>
                    </h4>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${stateInfo.bg} ${stateInfo.border} ${stateInfo.text}`}>
                    {stateInfo.label}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-4xl font-extrabold text-white font-mono">{val}</span>
                    <span className="text-lg font-semibold text-slate-400">{sensor?.unit || 'mm/s'}</span>
                  </div>
                  {/* Mini Sparkline */}
                  <div>
                    {renderSparkline(sensor?.recent_trend || [1.2, 2.1, 3.8, 4.8], '#f59e0b')}
                  </div>
                </div>

                {/* Status and Last Updated */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Status:</span>
                    <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>ONLINE</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Threshold Guide:</span>
                    <span className="text-slate-300 font-mono text-[11px]">Norm: 0-3 | Crit: &gt;6 mm/s</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Last Ingest:</span>
                    <span className="text-slate-300 font-mono text-[11px]">{sensor?.last_updated || 'Active'}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* SENSOR 3: TILT / INCLINATION SENSOR */}
          {(() => {
            const sensor = sensors?.tilt;
            const stateInfo = getStateBadge(sensor?.state);
            const val = sensor?.value !== undefined ? sensor.value.toFixed(2) : '3.70';
            return (
              <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg space-y-4 transition">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Sensor 03</span>
                    <h4 className="text-base font-bold text-white flex items-center space-x-1.5 mt-0.5">
                      <span>📐 Ground Tilt / Incline</span>
                    </h4>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${stateInfo.bg} ${stateInfo.border} ${stateInfo.text}`}>
                    {stateInfo.label}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-4xl font-extrabold text-white font-mono">{val}</span>
                    <span className="text-lg font-semibold text-slate-400">{sensor?.unit || '°'}</span>
                  </div>
                  {/* Mini Sparkline */}
                  <div>
                    {renderSparkline(sensor?.recent_trend || [0.8, 1.4, 2.6, 3.7], '#a855f7')}
                  </div>
                </div>

                {/* Status and Last Updated */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Status:</span>
                    <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>ONLINE</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Threshold Guide:</span>
                    <span className="text-slate-300 font-mono text-[11px]">Norm: 0-2° | Crit: &gt;4°</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Last Ingest:</span>
                    <span className="text-slate-300 font-mono text-[11px]">{sensor?.last_updated || 'Active'}</span>
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      </div>

      {/* SECTION 3: SENSOR → PREDICTION PIPELINE VISUAL */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Sensor → Prediction Pipeline Visual Architecture
            </h3>
          </div>
          <span className="text-xs text-indigo-400 font-mono hidden sm:inline">
            Explainable Geotechnical Weight Matrix
          </span>
        </div>

        <p className="text-xs text-slate-400">
          The three physical transducers feed directly into an explainable geotechnical instability score model. Weights are dynamically attributed to subsurface pore saturation, seismic/micro-vibration shearing, and rotational slope inclination:
        </p>

        {/* High-Tech Flow Diagram */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-5 overflow-x-auto">
          <div className="min-w-[680px] grid grid-cols-12 gap-4 items-center">
            
            {/* Left Column: 3 Sensor Inputs */}
            <div className="col-span-4 space-y-3">
              <div className="bg-slate-900 border border-sky-800/50 rounded-lg p-3 flex items-center justify-between shadow">
                <div>
                  <span className="text-[10px] text-sky-400 font-bold uppercase block">Transducer 1</span>
                  <strong className="text-xs text-slate-200">Soil Moisture (VWC)</strong>
                </div>
                <span className="text-sm font-mono font-bold text-sky-300">
                  {sensors?.soil_moisture?.value !== undefined ? sensors.soil_moisture.value.toFixed(1) : '68.4'}%
                </span>
              </div>

              <div className="bg-slate-900 border border-amber-800/50 rounded-lg p-3 flex items-center justify-between shadow">
                <div>
                  <span className="text-[10px] text-amber-400 font-bold uppercase block">Transducer 2</span>
                  <strong className="text-xs text-slate-200">Ground Vibration</strong>
                </div>
                <span className="text-sm font-mono font-bold text-amber-300">
                  {sensors?.vibration?.value !== undefined ? sensors.vibration.value.toFixed(2) : '4.80'} mm/s
                </span>
              </div>

              <div className="bg-slate-900 border border-purple-800/50 rounded-lg p-3 flex items-center justify-between shadow">
                <div>
                  <span className="text-[10px] text-purple-400 font-bold uppercase block">Transducer 3</span>
                  <strong className="text-xs text-slate-200">Biaxial Incline Tilt</strong>
                </div>
                <span className="text-sm font-mono font-bold text-purple-300">
                  {sensors?.tilt?.value !== undefined ? sensors.tilt.value.toFixed(2) : '3.70'}°
                </span>
              </div>
            </div>

            {/* Middle: Contribution Weights Flow Connectors */}
            <div className="col-span-4 flex flex-col items-center justify-center space-y-2 px-2">
              <div className="w-full text-[10px] text-slate-400 flex items-center justify-between bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800 font-mono">
                <span>Moisture Weight:</span>
                <span className="text-sky-300 font-bold">35%</span>
              </div>
              <div className="w-full text-[10px] text-slate-400 flex items-center justify-between bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800 font-mono">
                <span>Vibration Weight:</span>
                <span className="text-amber-300 font-bold">25%</span>
              </div>
              <div className="w-full text-[10px] text-slate-400 flex items-center justify-between bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800 font-mono">
                <span>Tilt Weight:</span>
                <span className="text-purple-300 font-bold">30%</span>
              </div>
              <div className="w-full text-[10px] text-slate-400 flex items-center justify-between bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800 font-mono">
                <span>Rate-of-Change Δ:</span>
                <span className="text-emerald-300 font-bold">10%</span>
              </div>
              <ArrowRight className="w-5 h-5 text-indigo-400 animate-pulse mt-1" />
            </div>

            {/* Right: Instability Model & Final Sliding Rate */}
            <div className="col-span-4 space-y-3">
              <div className="bg-gradient-to-br from-indigo-950/90 to-slate-900 border border-indigo-700/60 rounded-xl p-3.5 shadow-lg text-center space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-300">Instability Engine</span>
                <div className="text-2xl font-extrabold text-white font-mono">
                  {prediction?.instability_score || 67}%
                </div>
                <p className="text-[10px] text-slate-400">Composite Kinematic Hazard Index</p>
              </div>

              <div className="bg-gradient-to-br from-rose-950/90 to-slate-900 border border-rose-600 rounded-xl p-3.5 shadow-lg text-center space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-rose-300">Estimated Sliding Rate</span>
                <div className="text-2xl font-extrabold text-rose-400 font-mono">
                  {prediction?.predicted_sliding_rate !== undefined ? prediction.predicted_sliding_rate.toFixed(1) : '5.8'} mm/h
                </div>
                <div className="text-[10px] font-bold text-rose-300 uppercase">
                  {prediction?.risk_label || 'Moderate Risk (Creep Detected)'}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* SECTION 4: FOUR HISTORICAL SENSOR & SLIDING RATE TREND CHARTS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Historical Geotechnical Telemetry & Predictive Curves
            </h3>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 text-[11px]">Data Points:</span>
            {[20, 30, 60].map(cnt => (
              <button
                key={cnt}
                onClick={() => setSelectedChartRange(cnt)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition ${
                  selectedChartRange === cnt
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cnt}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* CHART 1: SOIL MOISTURE TREND */}
          {renderTrendChart({
            title: 'Soil Moisture Trend (Time → Moisture %)',
            keyName: 'soil_moisture',
            unit: '%',
            color: '#38bdf8', // sky
            minVal: 20,
            maxVal: 85,
            warningThreshold: 55,
            criticalThreshold: 70
          })}

          {/* CHART 2: GROUND VIBRATION TREND */}
          {renderTrendChart({
            title: 'Ground Vibration Trend (Time → Vibration mm/s)',
            keyName: 'vibration',
            unit: 'mm/s',
            color: '#f59e0b', // amber
            minVal: 0,
            maxVal: 9,
            warningThreshold: 3.0,
            criticalThreshold: 6.0
          })}

          {/* CHART 3: GROUND TILT TREND */}
          {renderTrendChart({
            title: 'Ground Tilt Trend (Time → Tilt °)',
            keyName: 'tilt',
            unit: '°',
            color: '#a855f7', // purple
            minVal: 0,
            maxVal: 7,
            warningThreshold: 2.0,
            criticalThreshold: 4.0
          })}

          {/* CHART 4: SLIDING RATE TREND */}
          {renderTrendChart({
            title: 'Predicted Sliding Rate Trend (Time → Sliding Rate mm/hour)',
            keyName: 'predicted_sliding_rate',
            unit: 'mm/hour',
            color: '#ef4444', // rose/red
            minVal: 0,
            maxVal: 20,
            warningThreshold: 5.0,
            criticalThreshold: 10.0
          })}

        </div>
      </div>

    </div>
  );
}
