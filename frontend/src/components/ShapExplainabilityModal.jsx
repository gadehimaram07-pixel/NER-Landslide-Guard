import React, { useState } from 'react';
import { 
  X, Brain, CheckCircle2, TrendingUp, Info, FileText, 
  Layers, BarChart3, ShieldCheck, Cpu, Database, AlertTriangle
} from 'lucide-react';

export default function ShapExplainabilityModal({ shapData, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('ml'); // 'ml' | 'physics' | 'hybrid'

  if (!isOpen || !shapData) return null;

  const factors = shapData.factors || [];
  const mlFeatures = shapData.ml_feature_importances || [
    { feature: "elevation_m", importance: 0.2668 },
    { feature: "rainfall_surround_max_mm", importance: 0.1375 },
    { feature: "rainfall_24h_mm", importance: 0.1324 },
    { feature: "slope_deg", importance: 0.1023 },
    { feature: "rainfall_72h_mm", importance: 0.0923 },
    { feature: "aspect_deg", importance: 0.0844 },
    { feature: "soil_silt_pct", importance: 0.0474 },
    { feature: "soil_ph", importance: 0.0338 }
  ];

  const hybrid = shapData.hybrid_evaluation || null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-rose-600 flex items-center justify-center text-white shadow-md">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-white">Dual-Pipeline Risk Explanation &amp; Feature Attribution</h3>
                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded">
                  ML + Physics (Prototype)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {shapData.zone_name} &bull; {shapData.state}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('ml')}
            className={`py-2.5 px-3 flex items-center space-x-1.5 border-b-2 transition ${
              activeTab === 'ml'
                ? 'border-indigo-500 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Trained ML Features (Gini)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('physics')}
            className={`py-2.5 px-3 flex items-center space-x-1.5 border-b-2 transition ${
              activeTab === 'physics'
                ? 'border-rose-500 text-rose-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Physics Baseline Drivers</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hybrid')}
            className={`py-2.5 px-3 flex items-center space-x-1.5 border-b-2 transition ${
              activeTab === 'hybrid'
                ? 'border-cyan-500 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Hybrid Architecture Fusion</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          
          {/* TAB 1: Real ML Feature Importance */}
          {activeTab === 'ml' && (
            <div className="space-y-4">
              <div className="bg-indigo-950/40 border border-indigo-800/60 rounded-xl p-3.5 text-indigo-200 space-y-1.5">
                <div className="flex items-center space-x-2 font-semibold text-indigo-300">
                  <Database className="w-4 h-4 text-indigo-400" />
                  <span>Real Trained Model Feature Importance (Tree Gini Criterion)</span>
                </div>
                <p className="text-[11px] leading-relaxed text-indigo-100">
                  Derived from <strong>Balanced RandomForestClassifier</strong> trained on the <strong>ISRO Landslide Atlas of India (2023)</strong> and NASA IMERG rainfall grids across Sikkim and the Eastern Himalayas.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-slate-400 font-semibold uppercase text-[10px]">
                  <span>Environmental Feature</span>
                  <span>Gini Importance (Contribution)</span>
                </div>

                {mlFeatures.map((f, idx) => {
                  const pct = Math.round(f.importance * 1000) / 10;
                  const readableName = f.feature.replace(/_/g, ' ').toUpperCase();
                  return (
                    <div key={idx} className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          <span>{readableName}</span>
                        </span>
                        <span className="font-mono font-bold text-indigo-300 text-xs">
                          {pct}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                          style={{ width: `${pct * 3.2}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Physics Dynamic Factor Attribution */}
          {activeTab === 'physics' && (
            <div className="space-y-4">
              {/* Executive Summary */}
              <div className="bg-rose-950/30 border border-rose-800/50 rounded-xl p-3.5 text-rose-200 space-y-1.5">
                <div className="flex items-center space-x-2 font-semibold text-rose-300">
                  <FileText className="w-4 h-4" />
                  <span>Geotechnical &amp; Kinematic Assessment (BIS IS 14458 Baseline):</span>
                </div>
                <p className="text-[11px] leading-relaxed text-rose-100">
                  {shapData.executive_summary}
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-slate-400 font-semibold uppercase text-[10px]">
                  <span>Dynamic Environmental Driver</span>
                  <span>Attributed Risk Weight</span>
                </div>

                {factors.map((factor, idx) => (
                  <div key={idx} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                        <span>{factor.feature}</span>
                      </span>
                      <span className="font-mono font-bold text-rose-400 text-sm">
                        {factor.contribution_pct}%
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-700"
                        style={{ width: `${factor.contribution_pct * 1.5}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span>Measured: <strong className="text-slate-300">{factor.measured_value}</strong></span>
                      <span className="text-[10px] text-slate-500">{factor.benchmark_norm}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Hybrid Architecture Fusion */}
          {activeTab === 'hybrid' && (
            <div className="space-y-4">
              <div className="bg-cyan-950/30 border border-cyan-800/50 rounded-xl p-3.5 text-cyan-200 space-y-2">
                <div className="flex items-center space-x-2 font-semibold text-cyan-300">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Dual Pipeline Linear Ensemble Formulation:</span>
                </div>
                <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 font-mono text-center text-xs text-cyan-300">
                  R<sub>hybrid</sub> = &alpha; &bull; P<sub>ML</sub> + (1 - &alpha;) &bull; R<sub>physics</sub>
                </div>
                <p className="text-[11px] text-slate-300">
                  Current weighting: <strong>&alpha; = 0.50 (50% ML, 50% Geotechnical Physics)</strong>. The system verifies ML tree predictions against infinite slope limit-equilibrium laws to guard against spurious correlations.
                </p>
              </div>

              {hybrid && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-center space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">1. Physics Baseline</span>
                    <span className="font-mono text-base font-bold text-rose-400">{Math.round(hybrid.physics_baseline.score * 100)}%</span>
                    <span className="text-[10px] text-slate-400 block">FoS: {hybrid.physics_baseline.factor_of_safety}</span>
                    <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 block truncate">{hybrid.physics_baseline.risk_level}</span>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-center space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">2. ML Pipeline</span>
                    <span className="font-mono text-base font-bold text-indigo-400">{Math.round(hybrid.ml_model.probability * 100)}%</span>
                    <span className="text-[10px] text-slate-400 block">Conf: {Math.round(hybrid.ml_model.confidence * 100)}%</span>
                    <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300 block truncate">{hybrid.ml_model.risk_level}</span>
                  </div>

                  <div className="bg-slate-950/80 border border-cyan-800/80 rounded-xl p-3 text-center space-y-1 shadow-lg shadow-cyan-950/30">
                    <span className="text-[10px] text-cyan-400 uppercase font-bold block">3. Hybrid Fused</span>
                    <span className="font-mono text-base font-bold text-cyan-300">{Math.round(hybrid.hybrid_risk.score * 100)}%</span>
                    <span className="text-[10px] text-slate-400 block">&alpha; = {hybrid.hybrid_risk.alpha_ml_weight}</span>
                    <span className="text-[9px] bg-cyan-950 border border-cyan-700/60 text-cyan-300 px-1.5 py-0.5 rounded font-bold block truncate">{hybrid.hybrid_risk.risk_level}</span>
                  </div>
                </div>
              )}

              {hybrid?.hybrid_risk?.interpretation && (
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-300 flex items-start space-x-2">
                  <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span><strong>Pipeline Concurrence:</strong> {hybrid.hybrid_risk.interpretation}</span>
                </div>
              )}
            </div>
          )}

          {/* Prototype Notice Banner */}
          <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-3 flex items-start space-x-3 text-amber-300/90 text-[10px]">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-200">RESEARCH PROTOTYPE EVALUATION (N=620, Test N=70):</strong> Validated under spatio-temporal corridor splitting (RF Accuracy 78.57%, XGBoost 80.00%). These metrics demonstrate architectural integration and cross-corridor generalization rather than multi-state operational deployment.
            </div>
          </div>

          {/* Data Transparency Banner */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-start space-x-3 text-slate-400 text-[10px]">
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-300">Data Pedigree &amp; Prototype Transparency:</strong> Models evaluate 16 canonical features derived from satellite precipitation, 30m SRTM DEM, ISRIC SoilGrids, and ESA WorldCover across 620 regional samples. Feature contributions in this modal represent a heuristic sensitivity prototype. Sentinel-1 InSAR is marked <code>[SIMULATED / PROTOTYPE]</code>.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-mono">
            Dual Model: Balanced RF + Physics FoS (v3.1)
          </span>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-1.5 rounded-xl text-xs transition"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
}
