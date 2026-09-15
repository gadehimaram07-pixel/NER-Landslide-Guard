import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import GisMapDashboard from './components/GisMapDashboard';
import DigitalTwinSimulator from './components/DigitalTwinSimulator';
import AlertCenter from './components/AlertCenter';
import FieldReportOfflinePwa from './components/FieldReportOfflinePwa';
import EdgeMeshMonitor from './components/EdgeMeshMonitor';
import ShapExplainabilityModal from './components/ShapExplainabilityModal';
import RoadRerouteModal from './components/RoadRerouteModal';
import SensorDataSection from './components/SensorDataSection';

export default function App() {
  const [activeTab, setActiveTab] = useState('map');
  const [currentRole, setCurrentRole] = useState('admin');
  const [language, setLanguage] = useState('English');
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Core Data
  const [overviewData, setOverviewData] = useState(null);
  const [zonesData, setZonesData] = useState(null);
  const [sensorsData, setSensorsData] = useState([]);
  const [roadsData, setRoadsData] = useState([]);
  const [alertsData, setAlertsData] = useState([]);
  const [insarData, setInsarData] = useState([]);
  const [weatherData, setWeatherData] = useState([]);
  const [uninstrumentedDetections, setUninstrumentedDetections] = useState([]);

  // Modals state
  const [shapData, setShapData] = useState(null);
  const [isShapOpen, setIsShapOpen] = useState(false);
  const [selectedRoad, setSelectedRoad] = useState(null);
  const [isRerouteOpen, setIsRerouteOpen] = useState(false);

  const fetchOverview = async () => {
    try {
      const res = await fetch('/api/overview');
      if (res.ok) setOverviewData(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchZones = async () => {
    try {
      const res = await fetch('/api/zones');
      if (res.ok) setZonesData(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSensors = async () => {
    try {
      const res = await fetch('/api/sensors');
      if (res.ok) setSensorsData(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRoads = async () => {
    try {
      const res = await fetch('/api/roads');
      if (res.ok) setRoadsData(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/alerts');
      if (res.ok) setAlertsData(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInsar = async () => {
    try {
      const res = await fetch('/api/insar');
      if (res.ok) setInsarData(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUninstrumented = async () => {
    try {
      const res = await fetch('/api/satellite/uninstrumented-detections');
      if (res.ok) setUninstrumentedDetections(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWeather = async () => {
    try {
      const res = await fetch('/api/weather');
      if (res.ok) setWeatherData(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerSatelliteDetection = async (presetId = 'dzongu') => {
    try {
      const res = await fetch('/api/satellite/trigger-uninstrumented', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset_id: presetId })
      });
      if (res.ok) {
        const data = await res.json();
        refreshAll();
        return data;
      }
    } catch (e) {
      console.error(e);
    }
  };

  const refreshAll = () => {
    fetchOverview();
    fetchZones();
    fetchSensors();
    fetchRoads();
    fetchAlerts();
    fetchInsar();
    fetchWeather();
    fetchUninstrumented();
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 15000); // 15s polling
    return () => clearInterval(interval);
  }, []);

  // Open SHAP Explainability for a specific zone
  const handleOpenShap = async (zoneId) => {
    try {
      const res = await fetch(`/api/zones/${zoneId}/shap`);
      if (res.ok) {
        const data = await res.json();
        setShapData(data);
        setIsShapOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Simulate Cloudburst injection
  const handleSimulateRain = async (zoneId, addedMm) => {
    try {
      const res = await fetch('/api/weather/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone_id: zoneId, added_rainfall_1h: addedMm })
      });
      if (res.ok) {
        refreshAll();
        alert(`Injected +${addedMm}mm synthetic cloudburst rain into ${zoneId}. Dynamic nowcasting and risk probabilities refreshed!`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Official Acknowledgment
  const handleAcknowledge = async (alertId, officerName) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officer_name: officerName })
      });
      if (res.ok) {
        fetchAlerts();
        fetchOverview();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenReroute = (road) => {
    setSelectedRoad(road);
    setIsRerouteOpen(true);
  };

  const zonesList = zonesData?.features?.map(f => f.properties) || [];

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        language={language}
        setLanguage={setLanguage}
        isOfflineMode={isOfflineMode}
        setIsOfflineMode={setIsOfflineMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        overviewData={overviewData}
      />

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'map' && (
          <GisMapDashboard
            zonesData={zonesData}
            sensorsData={sensorsData}
            roadsData={roadsData}
            weatherData={weatherData}
            insarData={insarData}
            uninstrumentedDetections={uninstrumentedDetections}
            onTriggerSatelliteDetection={handleTriggerSatelliteDetection}
            onOpenShap={handleOpenShap}
            onSimulateRain={handleSimulateRain}
            onOpenReroute={handleOpenReroute}
            onAlertBroadcast={refreshAll}
          />
        )}

        {activeTab === 'sensor-data' && (
          <SensorDataSection onAlertTriggered={refreshAll} />
        )}

        {activeTab === 'digital-twin' && (
          <DigitalTwinSimulator />
        )}

        {activeTab === 'alerts' && (
          <AlertCenter
            zones={zonesList}
            alerts={alertsData}
            onAlertBroadcast={refreshAll}
            onAcknowledge={handleAcknowledge}
          />
        )}

        {activeTab === 'field-pwa' && (
          <FieldReportOfflinePwa
            isOfflineMode={isOfflineMode}
            onReportCreated={refreshAll}
          />
        )}

        {activeTab === 'edge-mesh' && (
          <EdgeMeshMonitor sensors={sensorsData} />
        )}
      </main>

      {/* Modals */}
      <ShapExplainabilityModal
        shapData={shapData}
        isOpen={isShapOpen}
        onClose={() => setIsShapOpen(false)}
      />

      <RoadRerouteModal
        road={selectedRoad}
        isOpen={isRerouteOpen}
        onClose={() => setIsRerouteOpen(false)}
      />
    </div>
  );
}
