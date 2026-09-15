import React, { useState } from 'react';
import { 
  ShieldAlert, Send, Download, CheckCircle2, MessageSquare, PhoneCall, 
  Smartphone, Volume2, Globe, Clock, FileCode, Check, AlertTriangle 
} from 'lucide-react';

export default function AlertCenter({ zones, alerts, onAlertBroadcast, onAcknowledge }) {
  const [selectedZoneId, setSelectedZoneId] = useState(zones?.[0]?.id || 'ZONE-SKM-01');
  const [severity, setSeverity] = useState('CRITICAL');
  const [headline, setHeadline] = useState('Red Alert: Imminent Debris Flow Threat at Hill Slopes');
  const [description, setDescription] = useState('Heavy multi-day precipitation combined with deep borehole sensor tilt and InSAR displacement indicates imminent slope failure. Low-lying hillside settlements must evacuate immediately.');
  const [action, setAction] = useState('Evacuate to designated Community Relief Center immediately. Avoid mountain highway sectors.');

  const [selectedChannels, setSelectedChannels] = useState(['SMS', 'WHATSAPP', 'IVR_VOICE', 'FCM_PUSH', 'LOCAL_SIREN']);
  const [selectedLanguages, setSelectedLanguages] = useState(['English', 'Assamese', 'Khasi', 'Mizo', 'Nepali', 'Hindi']);
  const [previewLanguage, setPreviewLanguage] = useState('Assamese');
  const [capXmlPreview, setCapXmlPreview] = useState(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(null);

  const channelsList = [
    { id: 'SMS', label: 'SMS (Bulk Gateway)', icon: Smartphone },
    { id: 'WHATSAPP', label: 'WhatsApp Official API', icon: MessageSquare },
    { id: 'IVR_VOICE', label: 'IVR Voice Call (Feature Phones)', icon: PhoneCall },
    { id: 'FCM_PUSH', label: 'Mobile App Push (FCM)', icon: Send },
    { id: 'LOCAL_SIREN', label: 'Edge Audio Siren Relay', icon: Volume2 },
  ];

  const languagesList = ['English', 'Assamese', 'Khasi', 'Mizo', 'Nepali', 'Bodo', 'Bengali', 'Hindi'];

  const toggleChannel = (id) => {
    setSelectedChannels(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleLanguage = (lang) => {
    setSelectedLanguages(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    setIsBroadcasting(true);
    setBroadcastSuccess(null);
    try {
      const payload = {
        zone_id: selectedZoneId,
        severity,
        headline,
        description,
        suggested_action: action,
        channels: selectedChannels,
        languages: selectedLanguages,
        authorized_by: "District Magistrate / Incident Commander"
      };

      const res = await fetch('/api/alerts/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setBroadcastSuccess(data);
        setCapXmlPreview(data.cap_xml);
        if (onAlertBroadcast) onAlertBroadcast();
      }
    } catch (err) {
      console.error("Alert broadcast failed:", err);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const downloadCapXml = () => {
    if (!capXmlPreview) return;
    const blob = new Blob([capXmlPreview], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NDMA-SACHET-CAP-${new Date().toISOString().slice(0,10)}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Multi-Channel Alert Center & NDMA SACHET Hub</h2>
            <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              OASIS CAP v1.2
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dispatch prioritized multilingual emergency warnings across SMS, WhatsApp, IVR Voice calls, App Push, and LoRa sirens. Fully compliant with NDMA SACHET standard.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Dispatch Broadcast Studio */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 font-bold text-sm text-slate-200">
            <Send className="w-4 h-4 text-rose-500" />
            <span>Emergency Broadcast Studio</span>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-4 text-xs">
            {/* Zone & Severity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Target Vulnerable Sector</label>
                <select
                  value={selectedZoneId}
                  onChange={(e) => setSelectedZoneId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                >
                  {zones?.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({z.state})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Alert Severity Tier</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-xs font-semibold focus:ring-1 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="CRITICAL">🔴 CRITICAL (Red Alert - Evacuate)</option>
                  <option value="HIGH">🟠 HIGH (Orange Alert - Mobilize)</option>
                  <option value="MODERATE">🟡 MODERATE (Yellow Advisory)</option>
                </select>
              </div>
            </div>

            {/* Headline */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Alert Headline</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Technical Hazard Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                required
              />
            </div>

            {/* Recommended Action */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Immediate Citizen / Defense Action</label>
              <input
                type="text"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                required
              />
            </div>

            {/* Channels Multi-Select */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-semibold block">Multi-Channel Dissemination Links</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {channelsList.map((ch) => {
                  const Icon = ch.icon;
                  const isSelected = selectedChannels.includes(ch.id);
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => toggleChannel(ch.id)}
                      className={`p-2 rounded-xl border flex items-center space-x-2 text-left transition ${
                        isSelected
                          ? 'bg-rose-950/60 border-rose-500 text-rose-200 font-medium'
                          : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[11px] truncate">{ch.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Languages Multi-Select */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-semibold block">NER Multilingual Translations</label>
              <div className="flex flex-wrap gap-1.5">
                {languagesList.map((lang) => {
                  const isSelected = selectedLanguages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleLanguage(lang)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition ${
                        isSelected
                          ? 'bg-indigo-950/70 border-indigo-500 text-indigo-200'
                          : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isBroadcasting}
              className="w-full bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-rose-900/40 text-xs flex items-center justify-center space-x-2 transition cursor-pointer"
            >
              {isBroadcasting ? (
                <span>Authorizing & Cryptographically Chaining Alert...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Authorize & Disseminate Alert to All Channels</span>
                </>
              )}
            </button>
          </form>

          {/* Success Banner */}
          {broadcastSuccess && (
            <div className="bg-emerald-950/50 border border-emerald-700/60 rounded-xl p-4 text-xs space-y-2 text-emerald-200 animate-in fade-in">
              <div className="flex items-center space-x-2 font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
                <span>Alert Successfully Dispatched & Blockchain Anchored!</span>
              </div>
              <p className="text-[11px] text-emerald-100">
                CAP Identifier: <strong className="font-mono">{broadcastSuccess.cap_identifier}</strong> | Escalation: <strong>{broadcastSuccess.escalation_level}</strong>
              </p>
              <div className="pt-2 flex items-center space-x-3">
                <button
                  onClick={downloadCapXml}
                  className="bg-emerald-800 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition text-[11px]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download NDMA SACHET CAP v1.2 XML</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right: Multilingual Preview & Active Alerts Log */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Multilingual Channel Preview Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2 font-bold text-xs text-slate-200">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span>Live Multilingual Previewer</span>
              </div>
              <select
                value={previewLanguage}
                onChange={(e) => setPreviewLanguage(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-300"
              >
                {languagesList.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Preview Cards */}
            <div className="space-y-2 text-xs">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-1">
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block">
                  WhatsApp Business Verified Push ({previewLanguage})
                </span>
                <p className="text-slate-200 leading-relaxed font-sans text-[11px]">
                  🚨 *NDMA - NER LANDSLIDE WARNING*<br/>
                  {headline}<br/>
                  📍 _GPS Verified Sector: East Sikkim / Tupul_<br/>
                  Toll Free: 1077
                </p>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-1">
                <span className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider block">
                  IVR Phone Speech Script (Feature Phones)
                </span>
                <p className="text-slate-300 italic text-[11px]">
                  "Attention citizen. An emergency landslide warning is active. {action}. Call 1077 for SDRF support."
                </p>
              </div>
            </div>
          </div>

          {/* Active Alerts Feed */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 font-bold text-xs text-slate-200">
              <div className="flex items-center space-x-2">
                <Clock className="w-3.5 h-3.5 text-rose-500" />
                <span>Active Live Alerts ({alerts?.length || 0})</span>
              </div>
              <span className="text-[10px] text-slate-400">Escalation Tracker</span>
            </div>

            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {alerts?.map((al) => (
                <div key={al.id} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] text-rose-400 font-semibold">{al.cap_identifier}</span>
                      <h4 className="font-bold text-slate-200 text-xs mt-0.5">{al.headline}</h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      al.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}>
                      {al.severity}
                    </span>
                  </div>

                  <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-2">
                    {al.description}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span>Target: <strong className="text-slate-300">{al.zone_name}</strong></span>
                    <span>Status: <strong className={al.status === 'ACTIVE' ? 'text-rose-400' : 'text-emerald-400'}>{al.status}</strong></span>
                  </div>

                  {al.status === 'ACTIVE' && (
                    <button
                      onClick={() => onAcknowledge(al.id, "District Magistrate (DC)")}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg py-1.5 text-[11px] font-medium flex items-center justify-center space-x-1.5 transition"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Official DC Sign-off & Acknowledge</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
