import React from 'react';
import { ShieldAlert, Radio, Globe, UserCheck, Wifi, WifiOff, AlertTriangle, Activity, Layers, Mountain } from 'lucide-react';

export default function Navbar({ 
  currentRole, 
  setCurrentRole, 
  language, 
  setLanguage, 
  isOfflineMode, 
  setIsOfflineMode,
  activeTab,
  setActiveTab,
  overviewData
}) {
  const roles = [
    { id: 'admin', label: 'District Magistrate / DC', badge: 'Admin' },
    { id: 'field', label: 'Field Officer / SDRF', badge: 'Field PWA' },
    { id: 'citizen', label: 'Citizen Resident', badge: 'Public' },
    { id: 'ndrf', label: 'NDRF Incident Command', badge: 'Defense' }
  ];

  const languages = [
    { code: 'English', label: 'English' },
    { code: 'Assamese', label: 'অসমীয়া (Assamese)' },
    { code: 'Khasi', label: 'Ka Ktien Khasi' },
    { code: 'Mizo', label: 'Mizo ṭawng' },
    { code: 'Nepali', label: 'नेपाली (Nepali)' },
    { code: 'Hindi', label: 'हिन्दी (Hindi)' }
  ];

  const navTabs = [
    { id: 'map', label: 'GIS Command Map', icon: Globe },
    { id: 'sensor-data', label: '📡 Live Telemetry & Sensors', icon: Radio },
    { id: 'digital-twin', label: '3D Slope Twin (GSI & BIS)', icon: Mountain },
    { id: 'alerts', label: 'Alerting & NDMA SACHET', icon: ShieldAlert },
    { id: 'field-pwa', label: 'Offline Field & Incident Reports', icon: UserCheck },
    { id: 'edge-mesh', label: 'Edge-AI & LoRa Mesh', icon: Radio },
  ];

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-50 shadow-xl">
      {/* Alert Ticker */}
      <div className="bg-rose-950/70 border-b border-rose-900/40 px-4 py-1.5 flex items-center justify-between text-xs text-rose-200">
        <div className="flex items-center space-x-2 truncate">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
          <span className="font-semibold uppercase tracking-wider text-rose-300">NDMA SACHET & GSI Live Feed:</span>
          <span className="truncate">
            Red Alert active for Tupul Valley (Manipur) and NH-10 (Sikkim) &bull; BIS IS 14458 safety threshold breach &bull; InSAR velocity &gt; 72mm/yr
          </span>
        </div>
        <div className="flex items-center space-x-4 pl-4 shrink-0 text-slate-300 hidden md:flex">
          <span>Active Alerts: <strong className="text-rose-400">{overviewData?.active_critical_alerts || 3}</strong></span>
          <span>IoT Nodes: <strong className="text-emerald-400">{overviewData?.iot_sensors_online || 8}/8 Active</strong></span>
          <span>Highway Closures: <strong className="text-amber-400">{overviewData?.mountain_highway_closures || 3}</strong></span>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Title */}
        <div className="flex items-center space-x-3 cursor-pointer select-none" onClick={() => setActiveTab('map')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-rose-600 flex items-center justify-center shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-500/40">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-base md:text-lg text-white tracking-tight">NER Landslide Sentinel</h1>
              <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                GSI / BIS Integrated
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              North Eastern Region &bull; Early Warning, IoT Telemetry & 3D Geotechnical Digital Twin
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
          {/* Offline Mesh Toggle */}
          <button
            onClick={() => setIsOfflineMode(!isOfflineMode)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border transition font-medium ${
              isOfflineMode
                ? 'bg-amber-950/70 border-amber-600 text-amber-300 shadow-sm shadow-amber-900/40'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="Toggle zero-connectivity hill village simulation"
          >
            {isOfflineMode ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Zero-Net (LoRa Mesh)</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cloud Online</span>
              </>
            )}
          </button>

          {/* Language Selector */}
          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label="Select Interface Language"
              className="bg-slate-800/90 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs font-medium cursor-pointer"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Role Selector */}
          <div className="relative">
            <select
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value)}
              aria-label="Select Operating Role"
              className="bg-slate-800/90 text-cyan-300 border border-cyan-600/40 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs font-semibold cursor-pointer"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  👤 {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-t border-slate-800/80 bg-slate-900/95 px-4 overflow-x-auto scrollbar-none">
        <nav className="max-w-7xl mx-auto flex space-x-1.5 py-1.5 text-xs">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
