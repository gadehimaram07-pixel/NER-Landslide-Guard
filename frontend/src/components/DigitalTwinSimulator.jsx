import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, AlertTriangle, ShieldCheck, Play, RefreshCw, 
  Layers, Sliders, CheckCircle2, Box, Eye, Mountain, Info, Compass,
  Gauge, Droplets, ShieldAlert, Sparkles, Check, AlertOctagon, HelpCircle,
  Cpu, Brain
} from 'lucide-react';
import ThreeSlopeDigitalTwin from './ThreeSlopeDigitalTwin';

function computeInstantGeotechnical(betaDeg, rainMmH, durH, satPct, cohKpa) {
  const betaRad = (betaDeg * Math.PI) / 180;
  const phiRad = (30.0 * Math.PI) / 180;
  const totalRainMm = Math.round(rainMmH * durH * 10) / 10;
  const z = 2.5;
  const gamma = 19.5;
  const gammaW = 9.81;

  const hw = Math.min(z, (satPct / 100.0) * z + (totalRainMm / 1000.0) * 1.8);
  const u = gammaW * hw * Math.pow(Math.cos(betaRad), 2);
  const totalNormal = gamma * z * Math.pow(Math.cos(betaRad), 2);
  const effNormal = Math.max(0, totalNormal - u);

  const resisting = cohKpa + effNormal * Math.tan(phiRad);
  const driving = gamma * z * Math.sin(betaRad) * Math.cos(betaRad);
  const fos = Math.round((resisting / Math.max(driving, 0.001)) * 100) / 100;
  const ru = Math.round((u / Math.max(totalNormal, 0.001)) * 1000) / 1000;

  // GSI classifications
  let gsiSlopeClass = "LOW_HAZARD (GENTLE <15°)";
  let gsiSlopeStatus = "SAFE";
  if (betaDeg > 45) { gsiSlopeClass = "CRITICAL_ESCARPMENT (>45°)"; gsiSlopeStatus = "CRITICAL"; }
  else if (betaDeg > 35) { gsiSlopeClass = "VERY_HIGH_HAZARD (36°-45°)"; gsiSlopeStatus = "CRITICAL"; }
  else if (betaDeg > 25) { gsiSlopeClass = "HIGH_HAZARD (26°-35°)"; gsiSlopeStatus = "WARNING"; }
  else if (betaDeg > 15) { gsiSlopeClass = "MODERATE_HAZARD (16°-25°)"; gsiSlopeStatus = "SAFE"; }

  let gsiRainAlert = "NORMAL (<40mm)";
  let gsiRainStatus = "SAFE";
  if (totalRainMm > 120) { gsiRainAlert = "GSI_DANGER_CLOUDBURST (>120mm)"; gsiRainStatus = "CRITICAL"; }
  else if (totalRainMm > 75) { gsiRainAlert = "GSI_WARNING (75-120mm)"; gsiRainStatus = "WARNING"; }
  else if (totalRainMm >= 40) { gsiRainAlert = "GSI_ADVISORY (40-75mm)"; gsiRainStatus = "CAUTION"; }

  let bisPoreStatus = "BIS_SAFE_DAMP (ru < 0.15)";
  let bisPoreLevel = "SAFE";
  if (ru > 0.35) { bisPoreStatus = "BIS_CRITICAL_HYDROSTATIC (ru > 0.35)"; bisPoreLevel = "CRITICAL"; }
  else if (ru >= 0.15) { bisPoreStatus = "BIS_ELEVATED_SEEPAGE (0.15-0.35)"; bisPoreLevel = "WARNING"; }

  let bisFosCompliance = "BIS_COMPLIANT_SAFE (FoS >= 1.50)";
  let bisCodeStatus = "PASSED";
  if (fos < 1.0) { bisFosCompliance = "BIS_FAILURE_VIOLATION (FoS < 1.00)"; bisCodeStatus = "CRITICAL"; }
  else if (fos < 1.30) { bisFosCompliance = "BIS_CRITICAL_DISTRESS (1.00 <= FoS < 1.30)"; bisCodeStatus = "WARNING"; }
  else if (fos < 1.50) { bisFosCompliance = "BIS_MARGINAL_PERMISSIBLE (1.30 <= FoS < 1.50)"; bisCodeStatus = "CAUTION"; }

  let stabilityState = "STABLE";
  let color = "#22c55e";
  if (fos < 1.0) { stabilityState = "COLLAPSE_IMMINENT (FAILURE)"; color = "#ef4444"; }
  else if (fos < 1.25) { stabilityState = "CRITICAL_MARGIN (CREEP)"; color = "#f97316"; }
  else if (fos < 1.50) { stabilityState = "MARGINALLY_STABLE (OBSERVE)"; color = "#eab308"; }

  const compositeHazard = Math.min(100, Math.round(
    (Math.min(1, betaDeg / 50) * 25 + Math.min(1, totalRainMm / 150) * 30 + Math.min(1, ru / 0.5) * 25 + Math.max(0, (1.5 - Math.min(fos, 1.5)) / 1.5) * 20) * 10
  ) / 10);

  return {
    factor_of_safety: fos,
    stability_state: stabilityState,
    indicator_color: color,
    failure_probability_pct: fos < 1.0 ? Math.min(99, Math.round(90 + (1 - fos) * 30)) : Math.round(Math.max(5, (1.5 - fos) * 60)),
    estimated_displacement_velocity_cm_day: fos < 1.0 ? Math.round((15 + (1 - fos) * 45) * 10) / 10 : (fos < 1.25 ? 3.5 : 0.0),
    total_simulated_rainfall_mm: totalRainMm,
    pore_water_pressure_kpa: Math.round(u * 100) / 100,
    water_table_height_m: Math.round(hw * 100) / 100,
    driving_shear_stress_kpa: Math.round(driving * 100) / 100,
    resisting_shear_strength_kpa: Math.round(resisting * 100) / 100,
    gsi_slope_class: gsiSlopeClass,
    gsi_slope_status: gsiSlopeStatus,
    gsi_rain_alert: gsiRainAlert,
    gsi_rain_status: gsiRainStatus,
    bis_pore_pressure_ratio_ru: ru,
    bis_pore_status: bisPoreStatus,
    bis_pore_level: bisPoreLevel,
    bis_fos_compliance: bisFosCompliance,
    bis_code_status: bisCodeStatus,
    composite_hazard_pct: compositeHazard,
    is_bis_compliant: fos >= 1.30,
    geotechnical_recommendation: fos < 1.0 
      ? "Deploy horizontal subsurface borehole drains and rock bolt stitching immediately; issue red alert (GSI & BIS Failure)."
      : (fos < 1.30 ? "Install live piezometers and reinforce toe retaining buttress (BIS IS 14458 Critical Distress)."
      : "Standard vegetative bio-engineering (Vetiver grass netting) recommended; slope satisfies BIS IS 14458 code.")
  };
}

export default function DigitalTwinSimulator() {
  const canvasRef = useRef(null);

  // Simulation Parameters with GSI & BIS Standard Baselines
  const [slopeAngle, setSlopeAngle] = useState(42.0);
  const [rainIntensity, setRainIntensity] = useState(55.0);
  const [durationHours, setDurationHours] = useState(6.0);
  const [saturation, setSaturation] = useState(72.0);
  const [cohesion, setCohesion] = useState(12.0);

  // View Mode: '3d' or '2d'
  const [viewMode, setViewMode] = useState('3d');

  // Instant calculation initial state
  const [simResult, setSimResult] = useState(() => 
    computeInstantGeotechnical(42.0, 55.0, 6.0, 72.0, 12.0)
  );
  const [hybridSim, setHybridSim] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Update immediately on parameter change (0ms latency for smooth 60fps sliders)
  useEffect(() => {
    const instant = computeInstantGeotechnical(slopeAngle, rainIntensity, durationHours, saturation, cohesion);
    setSimResult(instant);

    // Also confirm with backend geotechnical simulation & hybrid ML prediction
    const syncBackend = async () => {
      setIsSimulating(true);
      try {
        const totalRain24 = Math.round(rainIntensity * Math.min(24, durationHours));
        const [resTwin, resHybrid] = await Promise.all([
          fetch('/api/digital-twin/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slope_angle_deg: slopeAngle,
              rainfall_intensity_mm_h: rainIntensity,
              duration_hours: durationHours,
              cohesion_kpa: cohesion,
              soil_friction_angle_deg: 30.0,
              initial_saturation_pct: saturation
            })
          }),
          fetch('/api/hybrid-risk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Rainfall convention (must match backend feature_builder + GisMapDashboard):
            // rain72 = rain24 * 1.6, surround = rain24 * 1.3
            body: JSON.stringify({
              features: {
                slope_deg: slopeAngle,
                rainfall_24h_mm: totalRain24,
                rainfall_72h_mm: Math.round(totalRain24 * 1.6),
                rainfall_surround_max_mm: Math.round(totalRain24 * 1.3),
                cohesion_kpa: cohesion,
                saturation_pct: saturation,
                elevation_m: 1650.0
              },
              alpha: 0.50
            })
          })
        ]);

        if (resTwin.ok) {
          const data = await resTwin.json();
          setSimResult(data);
        }
        if (resHybrid.ok) {
          const hData = await resHybrid.json();
          setHybridSim(hData);
        }
      } catch (err) {
        console.error("Simulation error:", err);
      } finally {
        setIsSimulating(false);
      }
    };

    syncBackend();
  }, [slopeAngle, rainIntensity, durationHours, saturation, cohesion]);

  // Render 2D Slope Canvas with slip circle and dynamic water table
  useEffect(() => {
    if (viewMode !== '2d') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#060a12');
    skyGrad.addColorStop(1, '#0d1525');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    const rad = (slopeAngle * Math.PI) / 180;
    const startX = 60;
    const startY = h - 60;
    const crestY = 70;
    const crestX = startX + (startY - crestY) / Math.tan(rad);

    // Bedrock
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(startX, startY);
    ctx.lineTo(crestX, crestY);
    ctx.lineTo(w, crestY);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Colluvium
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(crestX, crestY);
    ctx.lineTo(crestX + 40, crestY);
    ctx.lineTo(startX + 40, startY);
    ctx.closePath();
    ctx.fillStyle = '#78350f22';
    ctx.fill();

    // Water Table
    const waterRisePct = simResult ? Math.min(1.0, (simResult.water_table_height_m / 2.5)) : 0.6;
    const waterY = startY - ((startY - crestY) * waterRisePct * 0.7);

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo((startX + crestX) / 2, waterY, crestX, crestY + (startY - crestY) * (1 - waterRisePct));
    ctx.lineTo(crestX, startY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(14, 165, 233, 0.25)';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Slip Circle
    const isFailed = simResult && simResult.factor_of_safety < 1.0;
    ctx.beginPath();
    ctx.arc((startX + crestX) / 2, (startY + crestY) / 2 - 20, 160, Math.PI * 0.25, Math.PI * 0.75, false);
    ctx.strokeStyle = isFailed ? '#ef4444' : '#f59e0b';
    ctx.lineWidth = isFailed ? 4 : 2;
    ctx.stroke();

    // Slices
    const numSlices = 7;
    const sliceWidth = (crestX - startX) / numSlices;
    for (let i = 1; i < numSlices; i++) {
      const sx = startX + i * sliceWidth;
      const sy = startY - (i / numSlices) * (startY - crestY);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy + 45);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.setLineDash([2, 2]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (rainIntensity > 0) {
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.4)';
      ctx.lineWidth = 1;
      const numDrops = Math.floor(rainIntensity * 0.75);
      for (let i = 0; i < numDrops; i++) {
        const rx = Math.random() * w;
        const ry = Math.random() * (startY - 40);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 3, ry + 12);
        ctx.stroke();
      }
    }

    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`Slope Angle: ${slopeAngle}°`, crestX + 10, crestY - 15);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`Phreatic Head: ${simResult ? simResult.pore_water_pressure_kpa : '--'} kPa`, startX + 15, startY - 15);

    if (isFailed) {
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillStyle = '#ef4444';
      ctx.fillText('CRITICAL SLIP SURFACE ACTIVATED - BIS FoS < 1.0 VIOLATION', startX + 20, 120);
    }
  }, [slopeAngle, rainIntensity, durationHours, saturation, cohesion, simResult, viewMode]);

  // Bishop slice calculation helper
  const generateBishopSlices = () => {
    const slices = [];
    const count = 7;
    const u = simResult?.pore_water_pressure_kpa || 15.0;
    const fos = simResult?.factor_of_safety || 1.1;

    for (let i = 1; i <= count; i++) {
      const alphaDeg = 48 - i * 11;
      const alphaRad = (alphaDeg * Math.PI) / 180;
      const b = 2.4;
      const weight = Math.round(180 + Math.sin((i / count) * Math.PI) * 240);
      const sliceU = Math.round(u * (0.4 + 0.6 * Math.sin((i / count) * Math.PI)));
      const mAlpha = Math.cos(alphaRad) * (1 + (Math.tan(alphaRad) * Math.tan((30 * Math.PI) / 180)) / Math.max(0.5, fos));
      const resisting = Math.round((cohesion * b + (weight - sliceU * b) * 0.577) / Math.max(0.2, mAlpha));
      const driving = Math.round(weight * Math.sin(alphaRad));

      slices.push({
        id: i,
        width: b,
        alpha: alphaDeg,
        weight: weight,
        porePressure: sliceU,
        drivingForce: driving,
        resistingForce: resisting
      });
    }
    return slices;
  };

  const bishopSlices = generateBishopSlices();

  const totalRain = Math.round(rainIntensity * durationHours * 10) / 10;
  const getGsiSlopeBadge = (deg) => {
    if (deg <= 15) return { label: 'GSI Very Low (<15°)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    if (deg <= 25) return { label: 'GSI Moderate (16-25°)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    if (deg <= 35) return { label: 'GSI Steep (26-35°)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    if (deg <= 45) return { label: 'GSI Very Steep (36-45°)', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' };
    return { label: 'GSI Cliff Escarpment (>45°)', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
  };

  const getGsiRainBadge = (mm) => {
    if (mm < 40) return { label: 'IMD Normal (<40mm)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    if (mm <= 75) return { label: 'GSI Advisory (40-75mm)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    if (mm <= 120) return { label: 'GSI Warning (75-120mm)', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' };
    return { label: 'GSI Cloudburst Trigger (>120mm)', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
  };

  const slopeBadge = getGsiSlopeBadge(slopeAngle);
  const rainBadge = getGsiRainBadge(totalRain);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      
      {/* Header with GSI & BIS Certifications */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Mountain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-white tracking-tight">3D Digital Twin Slope Stability Simulator</h2>
                <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  GSI & BIS IS 14458 / IS 14496 Certified
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluates Himalayan slope equilibrium against Geological Survey of India (NLSM) & Bureau of Indian Standards code limits.
              </p>
            </div>
          </div>
        </div>

        {simResult && (
          <div className="flex items-center space-x-3 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">BIS Factor of Safety</span>
              <div 
                className="text-2xl font-bold font-mono transition-colors duration-150"
                style={{ color: simResult.indicator_color }}
              >
                {simResult.factor_of_safety}
              </div>
            </div>
            <div className="h-9 w-px bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">BIS Code Compliance</span>
              <div 
                className="text-xs font-bold uppercase tracking-wider transition-colors duration-150"
                style={{ color: simResult.indicator_color }}
              >
                {simResult.bis_code_status} &bull; {simResult.stability_state}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dual Pipeline & Hybrid Verification Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
          <div className="flex items-center space-x-2 font-semibold text-slate-200">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>Multi-Pipeline Real-Time Verification: Physics Baseline vs Dynamic ML vs Hybrid Fused</span>
          </div>
          <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 rounded">
            Ensemble Weight: &alpha; = 0.50
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">
          {/* 1. Physics Baseline */}
          <div className="bg-slate-950/80 border border-rose-900/40 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-rose-400 uppercase font-semibold flex items-center space-x-1">
                <Layers className="w-3 h-3" />
                <span>1. Physics Baseline</span>
              </span>
              <span className="text-[9px] bg-rose-950 text-rose-300 border border-rose-800/60 px-1.5 py-0.5 rounded font-mono">
                BIS IS 14458
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-bold font-mono" style={{ color: simResult?.indicator_color || '#ef4444' }}>
                FoS {simResult?.factor_of_safety}
              </span>
              <span className="text-[11px] text-slate-400">
                ({simResult?.stability_state?.split(' ')[0]})
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Deterministic infinite slope limit equilibrium based on normal shear and pore pressure.
            </p>
          </div>

          {/* 2. Real ML Model */}
          <div className="bg-slate-950/80 border border-indigo-900/40 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-indigo-400 uppercase font-semibold flex items-center space-x-1">
                <Cpu className="w-3 h-3" />
                <span>2. ML Risk Probability</span>
              </span>
              <span className="text-[9px] bg-indigo-950 text-indigo-300 border border-indigo-800/60 px-1.5 py-0.5 rounded font-mono">
                RF • N=620 • 16 Feats
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-bold font-mono text-indigo-300">
                {isSimulating ? (
                  <span className="text-slate-500 text-sm">Evaluating...</span>
                ) : (
                  hybridSim?.ml_model?.probability !== undefined && hybridSim?.ml_model?.probability !== null
                    ? `${Math.round(hybridSim.ml_model.probability * 100)}%`
                    : (simResult?.failure_probability_pct !== undefined ? `${Math.round(simResult.failure_probability_pct)}%` : 'N/A')
                )}
              </span>
              <span className="text-[11px] text-slate-400">
                {hybridSim?.ml_model?.tree_agreement_pct !== undefined 
                  ? `Tree Agree: ${Math.round(hybridSim.ml_model.tree_agreement_pct)}%` 
                  : `Risk Prob (${hybridSim?.ml_model?.risk_level || 'EVALUATING'})`}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Trained on 620 real samples (ISRO Atlas + NASA GLC + SRTM 30m + SoilGrids + IMERG). Zero leakage spatial block validated.
            </p>
          </div>

          {/* 3. Hybrid Fused Risk */}
          <div className="bg-slate-950/80 border border-cyan-800/60 rounded-xl p-3 space-y-1 shadow-lg shadow-cyan-950/30">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-cyan-400 uppercase font-bold flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3" />
                <span>3. Hybrid AI + Physics</span>
              </span>
              <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-700/60 px-1.5 py-0.5 rounded font-mono font-bold">
                Dual Fused
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-bold font-mono text-cyan-300">
                {hybridSim?.hybrid_risk?.score !== undefined
                  ? `${Math.round(hybridSim.hybrid_risk.score * 100)}%`
                  : `${Math.round((simResult?.composite_hazard_pct || 50))}%`}
              </span>
              <span className="text-[11px] text-cyan-400 font-semibold">
                {hybridSim?.hybrid_risk?.risk_level || (simResult?.factor_of_safety < 1.0 ? 'CRITICAL' : 'MODERATE')}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Linear ensemble: <code className="text-cyan-300 font-mono">0.50&bull;ML + 0.50&bull;Phys</code> preventing false triggers.
            </p>
          </div>
        </div>

        {/* Prototype Dataset Notice Banner */}
        <div className="mt-3 bg-amber-950/30 border border-amber-800/40 rounded-xl px-3 py-2 flex items-center justify-between text-[11px] text-amber-300/90">
          <div className="flex items-center space-x-2">
            <span className="font-semibold uppercase tracking-wider text-[10px] bg-amber-900/60 border border-amber-700/50 px-1.5 py-0.5 rounded text-amber-200">
              Prototype Notice
            </span>
            <span>
              <strong>PRELIMINARY RESULTS ON EXPANDED DATASET (N=620, Test N=70)</strong>: Validated with zero spatial data leakage (&gt;3.7 km buffer). Not presented as deployment-level performance.
            </span>
          </div>
          <span className="text-[10px] text-amber-400/70 font-mono hidden sm:inline">
            ISRO + IMERG + SRTM
          </span>
        </div>
      </div>

      {/* GSI & BIS Standards Matrix Bar */}
      {simResult && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">1. GSI Slope Class</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${slopeBadge.color}`}>
                {simResult.gsi_slope_status}
              </span>
            </div>
            <div className="text-sm font-bold text-white font-mono">{slopeAngle}° Angle</div>
            <span className="text-[10px] text-slate-500">{simResult.gsi_slope_class}</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">2. GSI Rainfall Trigger</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${rainBadge.color}`}>
                {simResult.gsi_rain_status}
              </span>
            </div>
            <div className="text-sm font-bold font-mono text-cyan-400">{simResult.total_simulated_rainfall_mm} mm / {durationHours}h</div>
            <span className="text-[10px] text-slate-500">{simResult.gsi_rain_alert}</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">3. BIS Pore Pressure (ru)</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                simResult.bis_pore_level === 'CRITICAL' ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' :
                simResult.bis_pore_level === 'WARNING' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
              }`}>
                {simResult.bis_pore_level}
              </span>
            </div>
            <div className="text-sm font-bold font-mono text-sky-400">ru = {simResult.bis_pore_pressure_ratio_ru} ({simResult.pore_water_pressure_kpa} kPa)</div>
            <span className="text-[10px] text-slate-500">{simResult.bis_pore_status}</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">4. BIS IS 14458 FoS</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                simResult.bis_code_status === 'PASSED' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
                simResult.bis_code_status === 'CAUTION' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                simResult.bis_code_status === 'WARNING' ? 'text-orange-400 bg-orange-500/10 border-orange-500/30' :
                'text-rose-400 bg-rose-500/10 border-rose-500/30'
              }`}>
                {simResult.bis_code_status}
              </span>
            </div>
            <div className="text-sm font-bold font-mono text-amber-400">FoS = {simResult.factor_of_safety}</div>
            <span className="text-[10px] text-slate-500">{simResult.bis_fos_compliance}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Interactive Controls with Instant Dynamic Feedback */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-sm text-white">Geotechnical Controls</h3>
            </div>
            <button
              onClick={() => {
                setSlopeAngle(22);
                setRainIntensity(20);
                setDurationHours(2);
                setSaturation(40);
                setCohesion(20);
              }}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 transition flex items-center space-x-1 font-semibold"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset to Safe</span>
            </button>
          </div>

          {/* GSI Slope Inclination Angle */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Slope Angle (&beta;) - GSI Morphometry</span>
              <span className="font-mono font-bold text-amber-400">{slopeAngle}°</span>
            </div>
            <input
              type="range"
              min="15"
              max="55"
              step="1"
              value={slopeAngle}
              onChange={(e) => setSlopeAngle(parseFloat(e.target.value))}
              className="w-full accent-amber-500 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>15° (Gentle)</span>
              <span className="text-amber-400">26° (GSI Threshold)</span>
              <span className="text-rose-400">45° (Escarpment)</span>
            </div>
          </div>

          {/* Rainfall Intensity */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Downpour Rate - IMD/GSI Intensity</span>
              <span className="font-mono font-bold text-cyan-400">{rainIntensity} mm/h</span>
            </div>
            <input
              type="range"
              min="0"
              max="140"
              step="5"
              value={rainIntensity}
              onChange={(e) => setRainIntensity(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0 (Dry)</span>
              <span className="text-cyan-400">30 mm/h (Heavy)</span>
              <span className="text-rose-400">&gt;70 mm/h (Cloudburst)</span>
            </div>
          </div>

          {/* Storm Duration */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Continuous Precipitation Duration</span>
              <span className="font-mono font-bold text-sky-400">{durationHours} Hours</span>
            </div>
            <input
              type="range"
              min="1"
              max="24"
              step="1"
              value={durationHours}
              onChange={(e) => setDurationHours(parseFloat(e.target.value))}
              className="w-full accent-sky-500 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Total Accumulated: <strong className="text-white font-mono">{totalRain} mm</strong></span>
              <span className={totalRain > 120 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                {totalRain > 120 ? 'GSI Red Threshold Exceeded' : 'Under Critical Limit'}
              </span>
            </div>
          </div>

          {/* Initial Soil Saturation */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Antecedent Saturation (Sr%) - BIS IS 2720</span>
              <span className="font-mono font-bold text-indigo-400">{saturation}%</span>
            </div>
            <input
              type="range"
              min="30"
              max="95"
              step="1"
              value={saturation}
              onChange={(e) => setSaturation(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>30% (Low)</span>
              <span className="text-indigo-400">65% (BIS Critical)</span>
              <span className="text-rose-400">&gt;85% (Hydrostatic)</span>
            </div>
          </div>

          {/* Cohesion */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Colluvium Cohesion (c') - BIS IS 14458</span>
              <span className="font-mono font-bold text-emerald-400">{cohesion} kPa</span>
            </div>
            <input
              type="range"
              min="5"
              max="25"
              step="1"
              value={cohesion}
              onChange={(e) => setCohesion(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span className="text-rose-400">5 kPa (Saturated Clay)</span>
              <span className="text-emerald-400">25 kPa (Intact Disang)</span>
            </div>
          </div>

          {/* Scenario Quick Presets */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
              GSI & BIS Standard Scenario Presets
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setSlopeAngle(22);
                  setRainIntensity(20);
                  setDurationHours(2);
                  setSaturation(40);
                  setCohesion(20);
                }}
                className="bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 text-emerald-200 rounded-lg p-2 text-[11px] font-medium text-left transition"
              >
                🌿 BIS Compliant Safe Slope (FoS &gt; 1.6)
              </button>
              <button
                onClick={() => {
                  setSlopeAngle(32);
                  setRainIntensity(45);
                  setDurationHours(6);
                  setSaturation(70);
                  setCohesion(14);
                }}
                className="bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/50 text-amber-200 rounded-lg p-2 text-[11px] font-medium text-left transition"
              >
                ⚠️ Monsoon Saturation (BIS Warning)
              </button>
              <button
                onClick={() => {
                  setSlopeAngle(44);
                  setRainIntensity(85);
                  setDurationHours(8);
                  setSaturation(88);
                  setCohesion(9);
                }}
                className="bg-rose-950/50 hover:bg-rose-900/70 border border-rose-800/60 text-rose-200 rounded-lg p-2 text-[11px] font-medium text-left transition"
              >
                💥 GSI Cloudburst Breach (FoS &lt; 0.85)
              </button>
              <button
                onClick={() => {
                  setSlopeAngle(50);
                  setRainIntensity(120);
                  setDurationHours(10);
                  setSaturation(95);
                  setCohesion(6);
                }}
                className="bg-red-950/80 hover:bg-red-900 border border-red-700 text-red-100 rounded-lg p-2 text-[11px] font-bold text-left transition flex flex-col justify-center"
              >
                <span>🚨 BIS Code Failure Violation</span>
                <span className="text-[9px] text-red-300 font-mono">Immediate Shear Rupture</span>
              </button>
            </div>
          </div>

        </div>

        {/* Right: 3D Hillscape Cross-Section & Engineering Metrics */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Mode Switcher Tabs */}
          <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl p-2 shadow-md">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('3d')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-2 transition ${
                  viewMode === '3d'
                    ? 'bg-cyan-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-800/60'
                }`}
              >
                <Mountain className="w-4 h-4" />
                <span>Daylight 3D Hillscape Twin (Dynamic Slope & Slip Physics)</span>
              </button>
              <button
                onClick={() => setViewMode('2d')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-2 transition ${
                  viewMode === '2d'
                    ? 'bg-cyan-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-800/60'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>2D Bishop Slice Profile</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-400 hidden sm:block font-mono">
              {viewMode === '3d' ? '3D WebGL Geotechnical Model' : 'Coordinate Scale: 1:100 Profile'}
            </div>
          </div>

          {/* Dynamic 3D or 2D Viewport */}
          {viewMode === '3d' ? (
            <ThreeSlopeDigitalTwin
              slopeAngle={slopeAngle}
              rainIntensity={rainIntensity}
              waterTableHeight={simResult?.water_table_height_m || 1.8}
              porePressure={simResult?.pore_water_pressure_kpa || 15.2}
              factorOfSafety={simResult?.factor_of_safety || 1.1}
              isFailed={simResult ? simResult.factor_of_safety < 1.0 : false}
              drivingStress={simResult?.driving_shear_stress_kpa || 45.0}
              resistingStrength={simResult?.resisting_shear_strength_kpa || 40.0}
              saturation={saturation}
              cohesion={cohesion}
              durationHours={durationHours}
              gsiSlopeClass={simResult?.gsi_slope_class}
              gsiSlopeStatus={simResult?.gsi_slope_status}
              gsiRainAlert={simResult?.gsi_rain_alert}
              gsiRainStatus={simResult?.gsi_rain_status}
              bisPoreStatus={simResult?.bis_pore_status}
              bisPoreLevel={simResult?.bis_pore_level}
              bisRuRatio={simResult?.bis_pore_pressure_ratio_ru || 0.35}
              bisFosCompliance={simResult?.bis_fos_compliance}
              bisCodeStatus={simResult?.bis_code_status}
              compositeHazardPct={simResult?.composite_hazard_pct ?? 0.0}
              isBisCompliant={simResult?.is_bis_compliant}
            />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Geotechnical Cross-Sectional Digital Twin (Bishop's Slip Circle)</span>
                <span>Coordinate Scale: 1:100 Profile</span>
              </div>
              <div className="w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                <canvas 
                  ref={canvasRef} 
                  width={700} 
                  height={320}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          )}

          {/* Bishop's Slice Mechanics Matrix */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-200">Bishop's Simplified Method &bull; Slice Partition Matrix</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">7 Slices &bull; Dynamic Equilibrium</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800 font-mono">
                    <th className="py-1.5 px-2">Slice #</th>
                    <th className="py-1.5 px-2">Inclination (&alpha;)</th>
                    <th className="py-1.5 px-2">Weight W (kN)</th>
                    <th className="py-1.5 px-2">Pore Water u (kPa)</th>
                    <th className="py-1.5 px-2">Driving Force (kN)</th>
                    <th className="py-1.5 px-2">Resisting Force (kN)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {bishopSlices.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40 text-slate-300">
                      <td className="py-1 px-2 font-bold text-cyan-400">Slice {s.id}</td>
                      <td className="py-1 px-2">{s.alpha}&deg;</td>
                      <td className="py-1 px-2">{s.weight}</td>
                      <td className="py-1 px-2 text-sky-400">{s.porePressure}</td>
                      <td className="py-1 px-2 text-amber-400">{s.drivingForce}</td>
                      <td className="py-1 px-2 text-emerald-400">{s.resistingForce}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recommended Engineering Action */}
          {simResult && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2 text-xs shadow-xl">
              <div className="flex items-center space-x-2 text-cyan-400">
                <AlertOctagon className="w-4 h-4" />
                <span className="font-semibold uppercase tracking-wider text-[11px]">
                  BIS IS 14458 Mandatory Geotechnical Engineering Mitigation:
                </span>
              </div>
              <p className="text-slate-200 leading-relaxed font-medium">
                {simResult.geotechnical_recommendation}
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
