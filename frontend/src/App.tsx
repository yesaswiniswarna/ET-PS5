import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, 
  MapPin, 
  Wind, 
  AlertTriangle, 
  Send, 
  UserCheck, 
  Activity, 
  Languages,
  Smartphone,
  CheckSquare
} from 'lucide-react';

// Types matching backend responses
interface Weather {
  temperature: number;
  wind_speed: number;
  wind_direction: number;
  humidity: number;
  inversion_factor: number;
  timestamp: string;
}

interface PointSource {
  id: string;
  name: string;
  type: 'Industry' | 'Construction' | 'Traffic';
  lat: number;
  lng: number;
  strength: number;
}

interface Receptor {
  name: string;
  type: 'Hospital' | 'School';
  lat: number;
  lng: number;
}

interface Ward {
  name: string;
  lat: number;
  lng: number;
  type: string;
  aqi: number;
  status: string;
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  source_attribution: {
    [key: string]: number;
  };
}

interface CityData {
  city: string;
  center: [number, number];
  weather: Weather;
  point_sources: PointSource[];
  receptors: Receptor[];
  wards: Ward[];
}

interface CityOption {
  name: string;
  center: [number, number];
  wards_count: number;
  point_sources_count: number;
  base_aqi: number;
}

interface CitizenReport {
  id?: number;
  city: string;
  lat: number;
  lng: number;
  category: string;
  description: string;
  photo_url?: string;
  timestamp: string;
  status: 'Pending' | 'Dispatched' | 'Resolved';
}

interface DispatchLog {
  id?: number;
  report_id?: number;
  ward_name: string;
  inspector_name: string;
  action_taken: string;
  dispatch_time: string;
}

interface ForecastPoint {
  time_offset_hours: number;
  timestamp: string;
  time_label: string;
  aqi: number;
  status: string;
  weather: Weather;
  source_attribution: { [key: string]: number };
}

function App() {
  // Cities list
  const [cities, setCities] = useState<CityOption[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('Bengaluru');
  const [liveData, setLiveData] = useState<CityData | null>(null);
  
  // Panel Selection States
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loadingRecs, setLoadingRecs] = useState<boolean>(false);
  
  // Database tables
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [dispatches, setDispatches] = useState<DispatchLog[]>([]);
  
  // Citizen Mobile Sandbox
  const [showCitizenSandbox, setShowCitizenSandbox] = useState<boolean>(false);
  const [citizenLanguage, setCitizenLanguage] = useState<string>('English');
  const [citizenAdvisory, setCitizenAdvisory] = useState<string>('');
  const [loadingAdvisory, setLoadingAdvisory] = useState<boolean>(false);
  
  // New Citizen Report Form
  const [reportCategory, setReportCategory] = useState<string>('Waste Burning');
  const [reportDesc, setReportDesc] = useState<string>('');
  const [isSelectingLocation, setIsSelectingLocation] = useState<boolean>(false);
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
  const [reportSuccess, setReportSuccess] = useState<boolean>(false);
  
  // Admin Dispatch Action Form
  const [showDispatchModal, setShowDispatchModal] = useState<boolean>(false);
  const [targetReportId, setTargetReportId] = useState<number | undefined>(undefined);
  const [dispatchWardName, setDispatchWardName] = useState<string>('');
  const [inspectorName, setInspectorName] = useState<string>('');
  const [dispatchAction, setDispatchAction] = useState<string>('');
  
  // Map References
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const circlesRef = useRef<any[]>([]);
  const citizenMarkerRef = useRef<any>(null);
  
  // Fetch initial data
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await fetch('/api/cities');
        if (res.ok) {
          const data = await res.json();
          setCities(data);
        }
      } catch (err) {
        console.error("Error loading cities list:", err);
      }
    };
    fetchCities();
  }, []);

  // Fetch live city data & reports
  const fetchLiveData = async () => {
    try {
      const res = await fetch(`/api/aqi/live?city=${selectedCity}`);
      if (res.ok) {
        const data = await res.json();
        setLiveData(data);
        // If a ward was previously selected, keep it updated
        if (selectedWard) {
          const updatedWard = data.wards.find((w: Ward) => w.name === selectedWard.name);
          if (updatedWard) setSelectedWard(updatedWard);
        } else if (data.wards.length > 0) {
          // Select first ward by default
          setSelectedWard(data.wards[0]);
        }
      }
      
      // Fetch reports
      const reportsRes = await fetch(`/api/reports?city=${selectedCity}`);
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setReports(reportsData);
      }
      
      // Fetch dispatches
      const dispatchesRes = await fetch('/api/dispatches');
      if (dispatchesRes.ok) {
        const dispatchesData = await dispatchesRes.json();
        setDispatches(dispatchesData);
      }
    } catch (err) {
      console.error("Error loading live data:", err);
    }
  };

  useEffect(() => {
    fetchLiveData();
    // Reset temporary states
    setSelectedLocation(null);
    setIsSelectingLocation(false);
  }, [selectedCity]);

  // Fetch forecast and recommendations when ward is selected
  useEffect(() => {
    if (!selectedWard) return;
    
    const fetchForecast = async () => {
      try {
        const res = await fetch(`/api/aqi/forecast?city=${selectedCity}&ward=${selectedWard.name}`);
        if (res.ok) {
          const data = await res.json();
          setForecast(data.forecast);
        }
      } catch (err) {
        console.error("Error fetching forecast:", err);
      }
    };
    
    const fetchRecommendations = async () => {
      setLoadingRecs(true);
      try {
        const res = await fetch('/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: selectedCity,
            ward: selectedWard.name,
            aqi: selectedWard.aqi,
            weather: liveData?.weather || {},
            source_attribution: selectedWard.source_attribution
          })
        });
        if (res.ok) {
          const data = await res.json();
          setRecommendations(data);
        }
      } catch (err) {
        console.error("Error fetching recommendations:", err);
      } finally {
        setLoadingRecs(false);
      }
    };
    
    fetchForecast();
    fetchRecommendations();
  }, [selectedWard, selectedCity]);

  // Fetch citizen advisory translations when language or selected ward updates
  useEffect(() => {
    if (!selectedWard) return;
    
    const fetchAdvisory = async () => {
      setLoadingAdvisory(true);
      try {
        const res = await fetch('/api/advisory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: selectedCity,
            ward: selectedWard.name,
            aqi: selectedWard.aqi,
            language: citizenLanguage
          })
        });
        if (res.ok) {
          const data = await res.json();
          setCitizenAdvisory(data.advisory);
        }
      } catch (err) {
        console.error("Error fetching health advisory:", err);
      } finally {
        setLoadingAdvisory(false);
      }
    };
    fetchAdvisory();
  }, [selectedWard, selectedCity, citizenLanguage]);

  // Leaflet Map Initialization and Rendering
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;

    // Initialize Map Instance if not exists
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      });
      
      // Zoom Controls top right
      L.control.zoom({ position: 'topright' }).addTo(mapRef.current);
      
      // Add Dark Matter Tile Template
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(mapRef.current);

      // Register map click for citizen reporting coordinate selection
      mapRef.current.on('click', (e: any) => {
        // We use a functional state reference so we don't capture stale state
        setIsSelectingLocation((prevSelecting) => {
          if (prevSelecting) {
            setSelectedLocation([e.latlng.lat, e.latlng.lng]);
            return false; // Exit selection mode
          }
          return prevSelecting;
        });
      });
    }

    // Clear existing markers & overlays
    markersRef.current.forEach(m => m.remove());
    circlesRef.current.forEach(c => c.remove());
    markersRef.current = [];
    circlesRef.current = [];
    if (citizenMarkerRef.current) {
      citizenMarkerRef.current.remove();
      citizenMarkerRef.current = null;
    }

    if (!liveData) return;

    // Pan map to center of selected city
    mapRef.current.setView(liveData.center, 12);

    // Draw Wards as Heat Overlays (circles)
    liveData.wards.forEach(ward => {
      const color = getAqiColorCode(ward.aqi);
      const circle = L.circle([ward.lat, ward.lng], {
        color: color,
        fillColor: color,
        fillOpacity: 0.35,
        weight: 1.5,
        radius: 1400 // 1.4km
      }).addTo(mapRef.current);

      // Tooltip
      circle.bindTooltip(`<strong>Ward: ${ward.name}</strong><br/>Type: ${ward.type}<br/>AQI: <strong>${ward.aqi}</strong> (${ward.status})`, {
        direction: 'top',
        className: 'leaflet-tooltip'
      });

      // Select ward on click
      circle.on('click', () => {
        setSelectedWard(ward);
      });

      circlesRef.current.push(circle);
    });

    // Draw Point Sources (Industry, Construction, Traffic Hotspots)
    liveData.point_sources.forEach(src => {
      const emoji = src.type === 'Industry' ? '🏭' : src.type === 'Construction' ? '🚧' : '🚗';
      
      const customIcon = L.divIcon({
        html: `<div style="font-size: 20px; text-shadow: 0 2px 4px rgba(0,0,0,0.5); cursor: pointer;">${emoji}</div>`,
        className: 'custom-map-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([src.lat, src.lng], { icon: customIcon }).addTo(mapRef.current);
      
      marker.bindTooltip(`<strong>Source: ${src.name}</strong><br/>Type: ${src.type}<br/>Emissions Strength: ${src.strength}`, {
        direction: 'top'
      });

      markersRef.current.push(marker);
    });

    // Draw Receptors (Schools / Hospitals)
    liveData.receptors.forEach(rc => {
      const emoji = rc.type === 'Hospital' ? '🏥' : '🏫';
      
      const customIcon = L.divIcon({
        html: `<div style="font-size: 18px; text-shadow: 0 2px 4px rgba(0,0,0,0.5); cursor: pointer;">${emoji}</div>`,
        className: 'custom-map-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker([rc.lat, rc.lng], { icon: customIcon }).addTo(mapRef.current);
      
      marker.bindTooltip(`<strong>Receptor: ${rc.name}</strong><br/>Type: ${rc.type} (Vulnerable Population)`, {
        direction: 'top'
      });

      markersRef.current.push(marker);
    });

    // Draw Active Citizen Reports on Map
    reports.forEach(rep => {
      if (rep.status === 'Resolved') return;

      const reportIcon = L.divIcon({
        html: `<div class="hotspot-pulse" style="background-color: #ef4444; width: 14px; height: 14px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.6);"></div>`,
        className: 'custom-report-icon',
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const marker = L.marker([rep.lat, rep.lng], { icon: reportIcon }).addTo(mapRef.current);
      
      marker.bindPopup(`
        <div style="color: white; font-family: Outfit, sans-serif;">
          <h4 style="margin: 0 0 4px; color: #ef4444; font-size: 14px;">🚨 Citizen Report</h4>
          <p style="margin: 0 0 6px; font-weight: 500; font-size: 12px;">Category: ${rep.category}</p>
          <p style="margin: 0 0 8px; color: #d1d5db; font-size: 11px;">"${rep.description}"</p>
          <div style="display: flex; gap: 4px;">
            <span style="font-size: 10px; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; padding: 1px 4px; border-radius: 3px;">${rep.status}</span>
          </div>
        </div>
      `);

      markersRef.current.push(marker);
    });

  }, [liveData, reports]);

  // Handle temporary citizen location selection pin
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    if (citizenMarkerRef.current) {
      citizenMarkerRef.current.remove();
      citizenMarkerRef.current = null;
    }

    if (selectedLocation) {
      const pinIcon = L.divIcon({
        html: `<div style="font-size: 24px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">📍</div>`,
        className: 'custom-pin',
        iconSize: [24, 24],
        iconAnchor: [12, 24]
      });
      citizenMarkerRef.current = L.marker(selectedLocation, { icon: pinIcon }).addTo(mapRef.current);
      mapRef.current.panTo(selectedLocation);
    }
  }, [selectedLocation]);

  // Submit Citizen Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation) {
      alert("Please select a location on the map first!");
      return;
    }
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: selectedCity,
          lat: selectedLocation[0],
          lng: selectedLocation[1],
          category: reportCategory,
          description: reportDesc
        })
      });
      if (res.ok) {
        setReportSuccess(true);
        setReportDesc('');
        setSelectedLocation(null);
        // Refresh Live data (so the new report maps immediately as a hotspot!)
        fetchLiveData();
        // Hide success message after 3 seconds
        setTimeout(() => setReportSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Error submitting report:", err);
    }
  };

  // Dispatch Inspector Action Submission
  const handleDispatchInspector = async () => {
    if (!inspectorName || !dispatchAction) {
      alert("Please fill in all dispatch details.");
      return;
    }
    try {
      const res = await fetch('/api/dispatches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: targetReportId,
          ward_name: dispatchWardName,
          inspector_name: inspectorName,
          action_taken: dispatchAction
        })
      });
      if (res.ok) {
        setShowDispatchModal(false);
        setInspectorName('');
        setDispatchAction('');
        setTargetReportId(undefined);
        // Refresh live data and dispatch log
        fetchLiveData();
      }
    } catch (err) {
      console.error("Error creating inspector dispatch:", err);
    }
  };

  // Color mapper helper based on AQI values
  function getAqiColorCode(aqi: number) {
    if (aqi <= 50) return '#10b981'; // Emerald
    if (aqi <= 100) return '#84cc16'; // Lime
    if (aqi <= 200) return '#eab308'; // Yellow
    if (aqi <= 300) return '#f97316'; // Orange
    if (aqi <= 400) return '#ef4444'; // Red
    return '#a855f7'; // Purple (Severe)
  }

  // Find nearest ward name to a set of coordinates (for citizen app simulation)
  function getNearestWardName(lat: number, lng: number) {
    if (!liveData || liveData.wards.length === 0) return "Unknown";
    let nearestWard = liveData.wards[0];
    let minDist = 999999.0;
    liveData.wards.forEach(w => {
      const dist = Math.sqrt((w.lat - lat) ** 2 + (w.lng - lng) ** 2);
      if (dist < minDist) {
        minDist = dist;
        nearestWard = w;
      }
    });
    return nearestWard.name;
  }

  // Compute total active alerts/severe hotspots in city
  const activeAlertsCount = liveData?.wards.filter(w => w.aqi > 200).length || 0;
  const pendingReportsCount = reports.filter(r => r.status === 'Pending').length || 0;

  return (
    <div className="dashboard-grid">
      
      {/* 1. LEFT COLUMN: CITY SELECTOR & CONTROLS */}
      <div className="full-viewport-panel glass-panel" style={{ borderRight: '1px solid var(--border-color)', borderLeft: 'none', borderRadius: '0' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ background: 'var(--primary)', padding: '0.4rem', borderRadius: '6px', color: '#fff', display: 'flex', alignItems: 'center' }}>
              <ShieldAlert size={20} />
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, #9ca3af)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AeroGuard AI
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Smart City Intervention Engine
          </span>
        </div>

        <div className="scrollable-content" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Select City preset */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Monitoring Centre
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {cities.map((city) => (
                <button
                  key={city.name}
                  onClick={() => setSelectedCity(city.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid',
                    borderColor: selectedCity === city.name ? 'var(--primary)' : 'transparent',
                    borderRadius: '8px',
                    background: selectedCity === city.name ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                    color: selectedCity === city.name ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: selectedCity === city.name ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={16} color={selectedCity === city.name ? 'var(--primary)' : '#6b7280'} />
                    <span>{city.name}</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                    {city.wards_count} Wards
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Meteorological Data Panel */}
          {liveData && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                <Wind size={16} className="text-secondary" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Live Meteorology</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Wind Velocity</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{liveData.weather.wind_speed}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>km/h</span>
                  </div>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Wind Direction</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{liveData.weather.wind_direction}°</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>N</span>
                  </div>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Temperature</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{liveData.weather.temperature}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>°C</span>
                  </div>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Inversion Trapping</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600, color: liveData.weather.inversion_factor > 1.2 ? 'var(--aqi-poor)' : 'var(--primary)' }}>
                      {liveData.weather.inversion_factor}x
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Vulnerability Indexes */}
          {liveData && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                Receptor Vulnerability
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingTop: '0.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>🏥 Hospital Safety Grids:</span>
                  <strong style={{ color: '#fff' }}>{liveData.receptors.filter(r => r.type === 'Hospital').length} Areas</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>🏫 School Buffer Zones:</span>
                  <strong style={{ color: '#fff' }}>{liveData.receptors.filter(r => r.type === 'School').length} Areas</strong>
                </div>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Enforcement priorities increase when hotspots intersect these buffer boundaries.
                </p>
              </div>
            </div>
          )}

          {/* Action Log / Dispatch log in sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Enforcement Log ({dispatches.length})
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
              {dispatches.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: '6px', textAlign: 'center' }}>
                  No active dispatches logged.
                </div>
              ) : (
                dispatches.map((disp, idx) => (
                  <div key={idx} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <strong style={{ color: 'var(--primary)' }}>{disp.inspector_name}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                        {new Date(disp.dispatch_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>Ward: {disp.ward_name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '2px', fontStyle: 'italic' }}>
                      Action: "{disp.action_taken}"
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Floating Sandbox Toggle button */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setShowCitizenSandbox(!showCitizenSandbox)}
            className="btn-secondary"
            style={{ width: '100%', gap: '0.5rem' }}
          >
            <Smartphone size={16} color="var(--primary)" />
            <span>{showCitizenSandbox ? "Hide Citizen App" : "Show Citizen App"}</span>
          </button>
        </div>
      </div>

      {/* 2. CENTER COLUMN: INTERACTIVE MAP & ALERTS / LIVE INCIDENTS */}
      <div className="full-viewport-panel" style={{ background: '#090d16' }}>
        {/* Header Summary Stats */}
        <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{selectedCity} Air Quality Grid</span>
              {activeAlertsCount > 0 && (
                <span style={{ fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                  🚨 {activeAlertsCount} Hotspots Active
                </span>
              )}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--aqi-good)' }}></div>
              <span style={{ color: 'var(--text-secondary)' }}>Good / Satisfactory</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--aqi-moderate)' }}></div>
              <span style={{ color: 'var(--text-secondary)' }}>Moderate</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--aqi-poor)' }}></div>
              <span style={{ color: 'var(--text-secondary)' }}>Poor</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--aqi-verypoor)' }}></div>
              <span style={{ color: 'var(--text-secondary)' }}>Severe</span>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div style={{ position: 'relative', flex: 1, minHeight: '350px' }}>
          <div id="map-container" ref={mapContainerRef} style={{ width: '100%', height: '100%' }}></div>
          
          {/* Helper overlay when selecting citizen coordinates */}
          {isSelectingLocation && (
            <div style={{ position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(239, 68, 68, 0.95)', color: 'white', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={14} className="hotspot-pulse" style={{ background: '#fff', borderRadius: '50%', padding: '1px', color: '#ef4444' }} />
              <span>Tap anywhere on the map to pin the pollution incident</span>
            </div>
          )}
        </div>

        {/* Active Alerts list & citizen incident queue */}
        <div style={{ height: '220px', background: 'rgba(15,23,42,0.95)', borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1.2fr', overflow: 'hidden' }}>
          
          {/* Citizen Incidents Queue */}
          <div style={{ borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={14} color="#ef4444" />
                Citizen Pollution Reports ({reports.length})
              </span>
              {pendingReportsCount > 0 && (
                <span style={{ fontSize: '0.65rem', background: '#ef4444', color: '#fff', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
                  {pendingReportsCount} NEW
                </span>
              )}
            </div>
            <div className="scrollable-content" style={{ padding: '0.5rem' }}>
              {reports.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textShadow: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center' }}>
                  No reports submitted yet. Open the Citizen Simulator on the bottom-left to test submission.
                </div>
              ) : (
                reports.map((rep) => (
                  <div
                    key={rep.id}
                    style={{
                      padding: '0.6rem',
                      background: rep.status === 'Pending' ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                      border: '1px solid',
                      borderColor: rep.status === 'Pending' ? 'rgba(239, 68, 68, 0.2)' : 'var(--border-color)',
                      borderRadius: '6px',
                      marginBottom: '0.5rem',
                      display: 'grid',
                      gridTemplateColumns: '48px 1fr',
                      gap: '0.6rem'
                    }}
                  >
                    <img
                      src={rep.photo_url}
                      alt="pollution-incident"
                      style={{ width: '48px', height: '48px', borderRadius: '4px', objectFit: 'cover', background: '#111827' }}
                    />
                    <div style={{ fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 600, color: rep.category === 'Waste Burning' ? '#f87171' : '#fbbf24' }}>
                          {rep.category}
                        </span>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            background: rep.status === 'Pending' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: rep.status === 'Pending' ? '#f87171' : '#34d399',
                            border: '1px solid',
                            borderColor: rep.status === 'Pending' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'
                          }}
                        >
                          {rep.status}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginBottom: '4px' }}>
                        "{rep.description}"
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                        <span>Near: {getNearestWardName(rep.lat, rep.lng)}</span>
                        {rep.status === 'Pending' && (
                          <button
                            onClick={() => {
                              setTargetReportId(rep.id);
                              setDispatchWardName(getNearestWardName(rep.lat, rep.lng));
                              setDispatchAction(`Investigate citizen reported ${rep.category}`);
                              setShowDispatchModal(true);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--primary)',
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: '2px 4px',
                              borderRadius: '3px'
                            }}
                          >
                            Dispatch Team
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Wards list grid */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Hyperlocal Ward AQI Standings
              </span>
            </div>
            <div className="scrollable-content" style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {liveData?.wards.map((ward) => (
                <div
                  key={ward.name}
                  onClick={() => setSelectedWard(ward)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    background: selectedWard?.name === ward.name ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.15)',
                    border: '1px solid',
                    borderColor: selectedWard?.name === ward.name ? 'var(--primary)' : 'var(--border-color)',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: selectedWard?.name === ward.name ? '#fff' : 'var(--text-primary)' }}>
                      {ward.name}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {ward.type}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: getAqiColorCode(ward.aqi), fontWeight: 700 }}>
                      {ward.aqi} AQI
                    </span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        padding: '1px 5px',
                        background: `${getAqiColorCode(ward.aqi)}1a`,
                        border: `1px solid ${getAqiColorCode(ward.aqi)}3a`,
                        color: getAqiColorCode(ward.aqi),
                        borderRadius: '3px',
                        fontWeight: 600
                      }}
                    >
                      {ward.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* 3. RIGHT COLUMN: WARD DETAILS & DECISION SUPPORT (GEMINI) */}
      <div className="full-viewport-panel glass-panel" style={{ borderLeft: '1px solid var(--border-color)', borderRight: 'none', borderRadius: '0' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Activity size={16} color="var(--primary)" />
            Hyperlocal Source Analysis
          </h3>
        </div>

        {selectedWard ? (
          <div className="scrollable-content" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Title / Current AQI badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{selectedWard.name}</h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Type: {selectedWard.type}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: getAqiColorCode(selectedWard.aqi) }}>
                  {selectedWard.aqi}
                </span>
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  {selectedWard.status} AQI
                </span>
              </div>
            </div>

            {/* Metrics parameters grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.6rem', color: 'var(--text-muted)' }}>PM2.5</span>
                <strong style={{ fontSize: '0.85rem' }}>{selectedWard.pm25}</strong>
                <span style={{ fontSize: '0.55rem', display: 'block', color: 'var(--text-secondary)' }}>µg/m³</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.6rem', color: 'var(--text-muted)' }}>PM10</span>
                <strong style={{ fontSize: '0.85rem' }}>{selectedWard.pm10}</strong>
                <span style={{ fontSize: '0.55rem', display: 'block', color: 'var(--text-secondary)' }}>µg/m³</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.6rem', color: 'var(--text-muted)' }}>NO2</span>
                <strong style={{ fontSize: '0.85rem' }}>{selectedWard.no2}</strong>
                <span style={{ fontSize: '0.55rem', display: 'block', color: 'var(--text-secondary)' }}>ppb</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.6rem', color: 'var(--text-muted)' }}>SO2</span>
                <strong style={{ fontSize: '0.85rem' }}>{selectedWard.so2}</strong>
                <span style={{ fontSize: '0.55rem', display: 'block', color: 'var(--text-secondary)' }}>ppb</span>
              </div>
            </div>

            {/* Source Attribution (Rendered with custom SVG Bars) */}
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Live Source Attribution
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {Object.entries(selectedWard.source_attribution).map(([source, percentage]) => {
                  let barColor = 'var(--text-muted)';
                  if (source === 'Traffic') barColor = '#3b82f6'; // Blue
                  if (source === 'Industry') barColor = '#ec4899'; // Pink
                  if (source === 'Construction') barColor = '#eab308'; // Yellow
                  if (source === 'Waste Burning') barColor = '#ef4444'; // Red
                  if (source === 'Background / Transboundary') barColor = '#10b981'; // Green
                  
                  return (
                    <div key={source} style={{ fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{source}</span>
                        <strong style={{ color: barColor }}>{percentage}%</strong>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${percentage}%`, height: '100%', background: barColor, borderRadius: '3px', transition: 'width 0.5s ease-out' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 24-72h forecast details */}
            {forecast.length > 0 && (
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  24-72h Predictive Forecast
                </span>
                
                {/* Horizontal line representation representing line chart */}
                <div style={{ position: 'relative', height: '90px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'end', paddingBottom: '1.25rem', paddingTop: '10px' }}>
                  
                  {/* Grid Lines */}
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: '2.5rem', height: '1px', borderBottom: '1px dashed rgba(255,255,255,0.03)', zIndex: 0 }}></div>
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: '4.5rem', height: '1px', borderBottom: '1px dashed rgba(255,255,255,0.03)', zIndex: 0 }}></div>

                  {forecast.map((pt, idx) => {
                    // Normalize height: max AQI in Indian cities can go high, assume 400 is max chart height
                    const heightPercent = Math.max(10, Math.min(100, (pt.aqi / 400) * 100));
                    
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1, zIndex: 1 }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: getAqiColorCode(pt.aqi) }}>
                          {pt.aqi}
                        </span>
                        
                        {/* Bar pillar representing line dot */}
                        <div style={{ width: '4px', height: `${heightPercent}px`, background: `linear-gradient(to top, rgba(255,255,255,0.02), ${getAqiColorCode(pt.aqi)})`, borderRadius: '2px', position: 'relative' }}>
                          <div style={{ position: 'absolute', top: 0, left: '-2px', width: '8px', height: '8px', borderRadius: '50%', background: getAqiColorCode(pt.aqi), boxShadow: `0 0 6px ${getAqiColorCode(pt.aqi)}` }}></div>
                        </div>

                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {pt.time_label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'center' }}>
                  📈 High morning stagnation (inversion traps dust) predicted at +24h forecast window.
                </div>
              </div>
            )}

            {/* AI DECISION SUPPORT: Priority recommendations via Gemini */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  AI Enforcement Directives
                </span>
                <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.1)', color: 'var(--primary)', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>
                  Gemini Agent
                </span>
              </div>
              
              {loadingRecs ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem 0' }}>
                  <div style={{ width: '80%', height: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '3px', animation: 'pulse 1.5s infinite' }}></div>
                  <div style={{ width: '95%', height: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '3px', animation: 'pulse 1.5s infinite' }}></div>
                  <div style={{ width: '70%', height: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '3px', animation: 'pulse 1.5s infinite' }}></div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {recommendations.map((rec, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '0.6rem', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{idx + 1}.</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{rec}</span>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => {
                      setDispatchWardName(selectedWard.name);
                      setDispatchAction(recommendations[0] || `Halt high emission sources in ${selectedWard.name}`);
                      setShowDispatchModal(true);
                    }}
                    className="btn-primary"
                    style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.8rem', padding: '0.6rem 1rem' }}
                  >
                    <CheckSquare size={14} />
                    <span>Dispatch Enforcement Inspector</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <MapPin size={32} style={{ marginBottom: '0.5rem' }} />
            <p style={{ fontSize: '0.8rem' }}>Tap a ward circle overlay on the map to inspect detailed analytics.</p>
          </div>
        )}
      </div>

      {/* 4. FLOATING MOBILE SANDBOX: CITIZEN APP SIMULATOR */}
      {showCitizenSandbox && (
        <div style={{ position: 'absolute', bottom: '80px', left: '300px', zIndex: 1000 }}>
          
          <div className="mobile-device-frame">
            <div className="mobile-notch"></div>
            
            {/* Phone Header */}
            <div style={{ background: '#111827', padding: '1.25rem 1rem 0.6rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '10px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)' }}>AeroGuard</span>
                <span style={{ fontSize: '0.6rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '1px 4px', borderRadius: '3px' }}>CITIZEN</span>
              </div>
              <button
                onClick={() => setShowCitizenSandbox(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem', marginTop: '10px' }}
              >
                Close
              </button>
            </div>

            {/* Phone Body Container */}
            <div className="scrollable-content" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Local Ward Info Card */}
              {selectedWard && (
                <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Location</span>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{selectedWard.name}</h4>
                    </div>
                    <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: `${getAqiColorCode(selectedWard.aqi)}1a`, border: `1px solid ${getAqiColorCode(selectedWard.aqi)}3a`, color: getAqiColorCode(selectedWard.aqi), borderRadius: '4px', fontWeight: 600 }}>
                      {selectedWard.status}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: getAqiColorCode(selectedWard.aqi) }}>
                      {selectedWard.aqi}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>AQI</span>
                  </div>

                  <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0 }}>
                    Refreshed: Live updates from municipal sensors.
                  </p>
                </div>
              )}

              {/* Multilingual Advisory Switcher */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Languages size={12} color="var(--primary)" />
                    HEALTH ADVISORY
                  </span>
                  
                  <select
                    value={citizenLanguage}
                    onChange={(e) => setCitizenLanguage(e.target.value)}
                    style={{
                      background: 'rgba(0,0,0,0.5)',
                      border: '1px solid var(--border-color)',
                      color: 'white',
                      fontSize: '0.65rem',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      outline: 'none'
                    }}
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi (हिंदी)</option>
                    <option value="Telugu">Telugu (తెలుగు)</option>
                    <option value="Tamil">Tamil (தமிழ்)</option>
                    <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                  </select>
                </div>

                {loadingAdvisory ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '0.5rem 0' }}>
                    <div style={{ width: '90%', height: '10px', background: 'rgba(255,255,255,0.01)', borderRadius: '2px', animation: 'pulse 1.5s infinite' }}></div>
                    <div style={{ width: '80%', height: '10px', background: 'rgba(255,255,255,0.01)', borderRadius: '2px', animation: 'pulse 1.5s infinite' }}></div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '6px', borderLeft: `3px solid ${selectedWard ? getAqiColorCode(selectedWard.aqi) : 'var(--primary)'}` }}>
                    {citizenAdvisory}
                  </div>
                )}
              </div>

              {/* Report Pollution Form */}
              <form onSubmit={handleSubmitReport} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Report Local Violation
                </span>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Incident Category</label>
                  <select
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value)}
                    style={{ width: '100%', padding: '0.4rem', background: '#0d1321', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', fontSize: '0.7rem', outline: 'none' }}
                  >
                    <option value="Waste Burning">🔥 Open Waste Burning</option>
                    <option value="Construction Dust">🚧 Construction Dust Uncovered</option>
                    <option value="Industrial Exhaust">🏭 Illegal Chemical Stacks</option>
                    <option value="Idle Vehicles">🚗 Heavily Polluting Transit</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Description</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Type details (e.g. Garbage fire behind apartment block)..."
                    value={reportDesc}
                    onChange={(e) => setReportDesc(e.target.value)}
                    style={{ width: '100%', padding: '0.4rem', background: '#0d1321', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', fontSize: '0.7rem', resize: 'none', outline: 'none' }}
                  />
                </div>

                {/* Coordinate selector pin */}
                <div>
                  <button
                    type="button"
                    onClick={() => setIsSelectingLocation(true)}
                    className="btn-secondary"
                    style={{ width: '100%', fontSize: '0.65rem', padding: '0.4rem 0.75rem', gap: '4px', borderColor: isSelectingLocation ? '#ef4444' : 'var(--border-color)' }}
                  >
                    <MapPin size={12} color={selectedLocation ? 'var(--primary)' : '#6b7280'} />
                    <span>{selectedLocation ? "📍 Location Selected" : "Tap Map Location"}</span>
                  </button>
                  {selectedLocation && (
                    <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px', textAlign: 'center' }}>
                      Coords: {selectedLocation[0].toFixed(4)}, {selectedLocation[1].toFixed(4)}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', fontSize: '0.7rem', padding: '0.5rem 1rem' }}
                >
                  <Send size={12} />
                  <span>Submit Incident Report</span>
                </button>

                {reportSuccess && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.4rem', borderRadius: '4px', fontSize: '0.65rem', textAlign: 'center', fontWeight: 600 }}>
                    Report submitted successfully!
                  </div>
                )}
              </form>

            </div>
          </div>

        </div>
      )}

      {/* 5. ADMIN DISPATCH MODAL */}
      {showDispatchModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="glass-panel" style={{ width: '420px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '2px' }}>🚨 Initiate Enforcement Dispatch</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Assign inspectors to enforce smart-city pollution control codes.</p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '2px', textTransform: 'uppercase' }}>Target Area (Ward)</label>
              <input
                disabled
                value={dispatchWardName}
                style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '6px', fontSize: '0.8rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '2px', textTransform: 'uppercase' }}>Enforcement Officer Name</label>
              <input
                type="text"
                placeholder="e.g. Officer K. R. Sharma"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', background: '#0a0f19', border: '1px solid var(--border-color)', color: 'white', borderRadius: '6px', fontSize: '0.8rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '2px', textTransform: 'uppercase' }}>Action Directive</label>
              <textarea
                rows={3}
                placeholder="Enter specific enforcement action..."
                value={dispatchAction}
                onChange={(e) => setDispatchAction(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', background: '#0a0f19', border: '1px solid var(--border-color)', color: 'white', borderRadius: '6px', fontSize: '0.8rem', outline: 'none', resize: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button
                onClick={() => setShowDispatchModal(false)}
                className="btn-secondary"
                style={{ flex: 1, padding: '0.6rem 1rem', fontSize: '0.8rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDispatchInspector}
                className="btn-primary"
                style={{ flex: 1, padding: '0.6rem 1rem', fontSize: '0.8rem' }}
              >
                <UserCheck size={14} />
                <span>Issue & Dispatch</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
