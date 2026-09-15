import React, { useState } from 'react';
import { X, Navigation, AlertTriangle, Compass, CheckCircle2, PhoneCall, ArrowRight } from 'lucide-react';

export default function RoadRerouteModal({ road, isOpen, onClose }) {
  if (!isOpen || !road) return null;

  const [origin, setOrigin] = useState(road.start_point || 'Siliguri');
  const [destination, setDestination] = useState(road.end_point || 'Gangtok');
  const [rerouteResult, setRerouteResult] = useState(null);
  const [isComputing, setIsComputing] = useState(false);

  const calculateReroute = async () => {
    setIsComputing(true);
    try {
      const res = await fetch('/api/roads/reroute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin,
          destination,
          avoid_road_id: road.id
        })
      });
      if (res.ok) {
        const data = await res.json();
        setRerouteResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsComputing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-600/30 border border-amber-500/50 flex items-center justify-center text-amber-400">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Road Connectivity Twin & Emergency Rerouter</h3>
              <p className="text-[11px] text-slate-400 font-mono">{road.highway_no} • {road.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Current Hazard Status */}
          <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3.5 space-y-1.5 text-rose-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Primary Mountain Segment Blocked</span>
              </span>
              <span className="bg-rose-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase">
                {road.status}
              </span>
            </div>
            <p className="text-[11px] text-rose-100">
              {road.blockage_reason || "Severe slope subsidence and debris deposition."}
            </p>
          </div>

          {/* Reroute Query Card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Origin Point</label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Destination Target</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            <button
              onClick={calculateReroute}
              disabled={isComputing}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition"
            >
              <Compass className="w-4 h-4" />
              <span>{isComputing ? 'Computing Graph Dijkstra Alternative...' : 'Compute Safe Alternate Mountain Corridor'}</span>
            </button>
          </div>

          {/* Result Card */}
          {rerouteResult && (
            <div className="bg-slate-950 border border-amber-600/50 rounded-xl p-4 space-y-3 text-slate-200 animate-in fade-in">
              <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider block">
                Recommended Alternate Emergency Route:
              </span>
              <div className="text-sm font-bold text-white flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{rerouteResult.recommended_alternate}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="bg-slate-900 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">Est. Extra Travel Time</span>
                  <strong className="text-amber-300">+{rerouteResult.additional_travel_time_hours} Hours</strong>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">Escort Status</span>
                  <strong className="text-slate-200">
                    {rerouteResult.convoy_escort_required ? 'SDRF Convoy Required' : 'Standard Advisory'}
                  </strong>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 pt-1 flex items-center justify-between">
                <span>Emergency Disaster Control Helpline:</span>
                <strong className="text-white font-mono">{rerouteResult.emergency_helpline}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-xl text-xs transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
