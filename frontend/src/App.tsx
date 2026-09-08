import { useState, useRef, useEffect, useCallback } from 'react';
import { useVoiceInput } from './hooks/useVoiceInput';
import { useVoiceOutput } from './hooks/useVoiceOutput';
import { 
  Sparkles,
  Mic,
  Send,
  MapPin,
  Wind,
  Droplets,
  Thermometer,
  Cloud,
  Radar,
  BarChart3,
  Bell,
  TrendingUp,
  Cpu,
  Layers,
  Volume2,
  VolumeX,
  CheckCircle
} from 'lucide-react';
import { WEATHER_ENDPOINTS, ADVISORIES_ENDPOINT, ALERTS_ENDPOINT, CLIMATE_ENDPOINT, CHAT_ENDPOINT } from './config/api';
import MobileWeatherGPT from './components/MobileWeatherGPT';
import MobileChatToggle from './components/MobileChatToggle';
import ChatDrawer from './components/ChatDrawer';
import WeeklyForecastFooter, { placeholderWeeklyDays, toWeeklyDays } from './components/WeeklyForecastFooter';
import './App.css';

type MessageRole = 'user' | 'bot';

const LANGUAGES = [
  { code: 'en', label: 'English', speechLocale: 'en-IN' },
  { code: 'hi', label: 'हिन्दी (Hindi)', speechLocale: 'hi-IN' },
  { code: 'ta', label: 'தமிழ் (Tamil)', speechLocale: 'ta-IN' },
  { code: 'te', label: 'తెలుగు (Telugu)', speechLocale: 'te-IN' },
  { code: 'bn', label: 'বাংলা (Bengali)', speechLocale: 'bn-IN' },
  { code: 'mr', label: 'मराठी (Marathi)', speechLocale: 'mr-IN' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati)', speechLocale: 'gu-IN' },
];



export default function App() {
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<'weather' | 'forecast' | 'nwp' | 'sectors' | 'alerts' | 'climate'>('weather');
  const [selectedLang, setSelectedLang] = useState('en');
  const [currentCity, setCurrentCity] = useState('Delhi');
  
  const [messages, setMessages] = useState<{ id: string; role: MessageRole; content: string; voiceAnswer?: string }[]>([
    {
      id: '1',
      role: 'bot',
      content: "👋 Hello! I'm **WeatherGPT**, your AI meteorological & disaster decision-support assistant aligned with MoES / IMD.\n\nAsk me about live forecasts, crop sowing advisories, NWP models (GFS/ECMWF), or climate trends!",
    },
  ]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sectorLoading, setSectorLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [currentWeather, setCurrentWeather] = useState<any>(null);
  const [forecastList, setForecastList] = useState<any[]>([]);
  const [nwpComparison, setNwpComparison] = useState<any>(null);
  const [sectorAdvisory, setSectorAdvisory] = useState<any>(null);
  const [activeSector, setActiveSector] = useState<'agriculture' | 'aviation' | 'marine' | 'urban'>('agriculture');
  const [alertsList, setAlertsList] = useState<any[]>([]);
  const [climateInfo, setClimateInfo] = useState<any>(null);
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeLangObj = LANGUAGES.find(l => l.code === selectedLang) || LANGUAGES[0];

  const {
    status: sttStatus,
    isSupported: sttSupported,
    startListening,
    stopListening,
  } = useVoiceInput({
    lang: activeLangObj.speechLocale,
    onTranscript: (text) => {
      if (!text) return;
      setInput(text);
    },
    onError: (err) => {
      console.error('Voice error:', err);
    },
  });

  const { speak, stop: stopSpeech, isSpeaking } = useVoiceOutput();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Fetch initial meteorological data — consolidated to avoid duplicate advisories calls
  useEffect(() => {
    const controller = new AbortController();

    const loadAll = async () => {
      try {
        await fetchWeatherData(currentCity, controller.signal);
        await fetchNwpData(currentCity, controller.signal);
        await fetchSectorData(currentCity, activeSector, controller.signal);
        await fetchAlertsData(currentCity, controller.signal);
        await fetchClimateData(currentCity, controller.signal);
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          return;
        }
        console.warn("Initial data load failed:", e);
      }
    };

    loadAll();

    return () => {
      controller.abort();
    };
  }, [currentCity, activeSector]);

  const fetchWeatherData = async (city: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(WEATHER_ENDPOINTS.CURRENT(city), { signal });
      const data = await res.json();
      if (data.success && data.data) {
        setCurrentWeather(data.data);
      }
      const fRes = await fetch(WEATHER_ENDPOINTS.FORECAST(city, 7), { signal });
      const fData = await fRes.json();
      if (fData.success && fData.data?.days) {
        setForecastList(fData.data.days);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        return;
      }
      console.warn("Weather fetch failed:", e);
    }
  };

  const fetchNwpData = async (city: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(WEATHER_ENDPOINTS.NWP(city), { signal });
      const data = await res.json();
      if (data.success && data.data) {
        setNwpComparison(data.data);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        return;
      }
      console.warn("NWP fetch failed:", e);
    }
  };

  const fetchSectorData = async (city: string, sector: string, signal?: AbortSignal) => {
    setSectorLoading(true);
    try {
      const res = await fetch(ADVISORIES_ENDPOINT(city, sector), { signal });
      const data = await res.json();
      if (data.success && data.data) {
        setSectorAdvisory(data.data);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        return;
      }
      console.warn("Sector fetch failed:", e);
    } finally {
      setSectorLoading(false);
    }
  };

  const fetchAlertsData = async (city: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(ALERTS_ENDPOINT(city), { signal });
      const data = await res.json();
      if (data.success && data.data?.alerts) {
        setAlertsList(data.data.alerts);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        return;
      }
      console.warn("Alerts fetch failed:", e);
    }
  };

  const fetchClimateData = async (city: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(CLIMATE_ENDPOINT(city), { signal });
      const data = await res.json();
      if (data.success && data.data) {
        setClimateInfo(data.data);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        return;
      }
      console.warn("Climate fetch failed:", e);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentCity(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
      },
      (err) => alert("Location access error: " + err.message)
    );
  };

  const toggleVoice = useCallback(() => {
    if (sttStatus === 'listening') {
      stopListening();
      setVoiceEnabled(false);
    } else {
      stopSpeech();
      startListening();
      setVoiceEnabled(true);
    }
  }, [sttStatus, startListening, stopListening, stopSpeech]);

  const handleSend = useCallback(async (customMessage?: string) => {
    const text = (customMessage || input).trim();
    if (!text || isLoading) return;

    if (!customMessage) setInput('');
    setIsLoading(true);

    const userMsg = {
      id: Date.now().toString(),
      role: 'user' as MessageRole,
      content: text,
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          language: selectedLang,
          sector: activeSector,
          sessionId: 'desktop-session',
        }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        const botData = data.data;
        const botMsg = {
          id: (Date.now() + 1).toString(),
          role: 'bot' as MessageRole,
          content: botData.answer || 'Query processed.',
          voiceAnswer: botData.voiceAnswer || botData.answer,
        };
        setMessages(prev => [...prev, botMsg]);

        if (botData.location?.name) {
          setCurrentCity(botData.location.name);
        }

        if (voiceEnabled && botData.voiceAnswer) {
          speak(botData.voiceAnswer, activeLangObj.speechLocale);
        }
      } else {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          content: data.message || "Query could not be processed.",
        }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: "⚠️ Unable to connect to backend service.",
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, selectedLang, activeSector, voiceEnabled, activeLangObj, speak]);

  const handleSpeakText = (msg: { id: string; content: string; voiceAnswer?: string }) => {
    if (isSpeaking && isSpeakingId === msg.id) {
      stopSpeech();
      setIsSpeakingId(null);
    } else {
      stopSpeech();
      const textToSpeak = (msg.voiceAnswer || msg.content).replace(/[*#`_~]/g, '');
      speak(textToSpeak, activeLangObj.speechLocale);
      setIsSpeakingId(msg.id);
    }
  };

  // Mobile viewport handler
  if (typeof window !== 'undefined' && window.innerWidth <= 768) {
    return <MobileWeatherGPT />;
  }

  // Desktop Interface
  const weeklyDays = forecastList.length > 0 ? toWeeklyDays(forecastList) : placeholderWeeklyDays();  return (
    <div className="simple-weathergpt">
      <div className="glass-orb glass-orb-1" aria-hidden="true" />
        <div className="glass-orb glass-orb-2" aria-hidden="true" />
        <div className="glass-orb glass-orb-3" aria-hidden="true" />
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Branding Logo — Breeze icon from Figma */}
        <button className="sidebar-logo" title="WeatherGPT" aria-label="WeatherGPT">
          <svg className="breeze-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            {/* Outer circle */}
            <path d="M2 16C2 23.7268 8.2732 30 16 30C23.7268 30 30 23.7268 30 16C30 8.2732 23.7268 2 16 2C8.2732 2 2 8.2732 2 16V16" stroke="white" strokeOpacity="0.225" strokeWidth="2.2" strokeLinecap="round"/>
            {/* Wave 1 */}
            <path d="M9 13.5C11.5 12 14 12 16.5 13.5C19 15 21.5 15 24 13.5" stroke="white" strokeOpacity="0.9" strokeWidth="2.2" strokeLinecap="round"/>
            {/* Wave 2 */}
            <path d="M8 17.5C10.5 16 13 16 15.5 17.5C18 19 20.5 19 23 17.5" stroke="white" strokeOpacity="0.9" strokeWidth="2.2" strokeLinecap="round"/>
            {/* Wave 3 */}
            <path d="M10 21.5C12 20.5 14 20.5 16 21.5C18 22.5 20 22.5 22 21.5" stroke="white" strokeOpacity="0.9" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        </button>

      <nav className="sidebar-nav">
          <button
            className={`sidebar-item ${activeNav === 'weather' ? 'active' : ''}`}
            onClick={() => setActiveNav('weather')}
            title="Nowcasting & Live Weather"
            aria-label="Nowcasting & Live Weather"
          >
            <Radar size={20} />
          </button>
          <button
            className={`sidebar-item ${activeNav === 'forecast' ? 'active' : ''}`}
            onClick={() => setActiveNav('forecast')}
            title="7-Day Numerical Forecast"
            aria-label="7-Day Numerical Forecast"
          >
            <BarChart3 size={20} />
          </button>
          <button
            className={`sidebar-item ${activeNav === 'nwp' ? 'active' : ''}`}
            onClick={() => setActiveNav('nwp')}
            title="NWP Models (GFS vs ECMWF vs WRF)"
            aria-label="NWP Models (GFS vs ECMWF vs WRF)"
          >
            <Cpu size={20} />
          </button>
          <button
            className={`sidebar-item ${activeNav === 'sectors' ? 'active' : ''}`}
            onClick={() => setActiveNav('sectors')}
            title="Sector Decision Support (Agri/Aviation/Marine)"
            aria-label="Sector Decision Support (Agri/Aviation/Marine)"
          >
            <Layers size={20} />
          </button>
          <button
            className={`sidebar-item ${activeNav === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveNav('alerts')}
            title="IMD Extreme Weather Alerts"
            aria-label="IMD Extreme Weather Alerts"
          >
            <Bell size={20} />
          </button>
          <button
            className={`sidebar-item ${activeNav === 'climate' ? 'active' : ''}`}
            onClick={() => setActiveNav('climate')}
            title="Climate Trend Analytics"
            aria-label="Climate Trend Analytics"
          >
            <TrendingUp size={20} />
          </button>
        </nav>

      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Header */}
        <header className="simple-header">
          <div className="header-brand">
            <div className="header-logo-icon">
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M2 16C2 23.7268 8.2732 30 16 30C23.7268 30 30 23.7268 30 16C30 8.2732 23.7268 2 16 2C8.2732 2 2 8.2732 2 16V16" stroke="currentColor" strokeOpacity="0.225" strokeWidth="2.2" strokeLinecap="round"/>
                <path d="M9 13.5C11.5 12 14 12 16.5 13.5C19 15 21.5 15 24 13.5" stroke="currentColor" strokeOpacity="0.9" strokeWidth="2.2" strokeLinecap="round"/>
                <path d="M8 17.5C10.5 16 13 16 15.5 17.5C18 19 20.5 19 23 17.5" stroke="currentColor" strokeOpacity="0.9" strokeWidth="2.2" strokeLinecap="round"/>
                <path d="M10 21.5C12 20.5 14 20.5 16 21.5C18 22.5 20 22.5 22 21.5" stroke="currentColor" strokeOpacity="0.9" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="header-title-group">
              <h1>WeatherGPT</h1>
              <p className="header-subtitle">AI-Powered Meteorological Intelligence</p>
            </div>
          </div>

          <nav className="header-nav">
            <button className={`header-nav-item ${activeNav === 'weather' ? 'active' : ''}`} onClick={() => setActiveNav('weather')}>
              Nowcasting
            </button>
            <button className={`header-nav-item ${activeNav === 'forecast' ? 'active' : ''}`} onClick={() => setActiveNav('forecast')}>
              Forecast
            </button>
            <button className={`header-nav-item ${activeNav === 'nwp' ? 'active' : ''}`} onClick={() => setActiveNav('nwp')}>
              NWP Models
            </button>
            <button className={`header-nav-item ${activeNav === 'sectors' ? 'active' : ''}`} onClick={() => setActiveNav('sectors')}>
              Sectors
            </button>
            <button className={`header-nav-item ${activeNav === 'alerts' ? 'active' : ''}`} onClick={() => setActiveNav('alerts')}>
              Alerts
            </button>
            <button className={`header-nav-item ${activeNav === 'climate' ? 'active' : ''}`} onClick={() => setActiveNav('climate')}>
              Climate
            </button>
          </nav>

          <div className="header-actions">
            <button className="header-action-btn" onClick={handleUseMyLocation} title="Use My Location" aria-label="Use My Location">
              <MapPin size={16} />
            </button>
            <button className={`header-action-btn voice-btn ${sttStatus === 'listening' ? 'active' : ''}`} onClick={toggleVoice} disabled={!sttSupported} title="Voice Query" aria-label="Voice Query">
              <Mic size={16} />
              <span className="voice-label">{sttStatus === 'listening' ? 'Listening...' : 'Voice'}</span>
            </button>
            <button className="header-action-btn chat-btn" onClick={() => setChatDrawerOpen(!chatDrawerOpen)} title="Open Chat" aria-label="Open Chat">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span className="chat-label">Chat</span>
            </button>
          </div>
        </header>

        {/* Dynamic Panels based on Sidebar Navigation */}
        <div className="dashboard-view-container">
          {/* Active Panel 1: Live Nowcast */}
          {activeNav === 'weather' && currentWeather && (
            <div className="weather-card-simple">
              <div className="weather-card-header">
                <MapPin size={16} />
                <span>{currentWeather.location?.name}, {currentWeather.location?.country}</span>
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#94a3b8' }}>Live Observation</span>
              </div>
              <div className="weather-card-main">
                <span className="weather-temp">{Math.round(currentWeather.temperature)}°C</span>
                <span className="weather-desc">{currentWeather.weatherDescription}</span>
              </div>
              <div className="weather-card-metrics">
                <div className="metric">
                  <Thermometer size={14} />
                  <span>Feels {Math.round(currentWeather.apparentTemperature || currentWeather.temperature)}°C</span>
                </div>
                <div className="metric">
                  <Droplets size={14} />
                  <span>{currentWeather.humidity}% humidity</span>
                </div>
                <div className="metric">
                  <Wind size={14} />
                  <span>{currentWeather.windSpeed} km/h wind</span>
                </div>
                <div className="metric">
                  <Cloud size={14} />
                  <span>{currentWeather.pressure} hPa</span>
                </div>
              </div>
            </div>
          )}

          {/* Active Panel 2: 7-Day Forecast */}
          {activeNav === 'forecast' && (
            <div className="forecast-panel-desktop">
              <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>📅 7-Day Numerical Weather Forecast for {currentCity}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
                {forecastList.map((day, idx) => (
                  <div key={idx} className="forecast-day-glass">
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>{idx === 0 ? 'Today' : (idx === 1 ? 'Tomorrow' : day.date)}</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, margin: '6px 0' }}>{Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°</div>
                    <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{day.weatherDescription}</div>
                    <div style={{ fontSize: '11px', color: '#67e8f9', marginTop: '4px' }}>🌧️ {day.precipitationProbabilityMax}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Panel 3: NWP Models */}
          {activeNav === 'nwp' && nwpComparison && (
            <div className="nwp-panel-desktop">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>🛰️ Numerical Weather Prediction (NWP) Multi-Model Ensemble</h3>
                <span style={{ background: '#0284c7', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
                  Consensus: {nwpComparison.consensus?.consensusScorePercentage}% ({nwpComparison.consensus?.confidenceLevel})
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#cbd5e1', margin: '0 0 12px' }}>{nwpComparison.consensus?.synopticSummary}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {nwpComparison.models?.map((m: any, idx: number) => (
                  <div key={idx} style={{ background: 'rgba(2, 6, 23, 0.6)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <strong style={{ color: '#38bdf8' }}>{m.modelName}</strong> ({m.resolution})
                    <div style={{ fontSize: '12px', margin: '4px 0' }}>Max: {m.maxTemp}°C | Min: {m.minTemp}°C</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Rain: {m.totalPrecipitation} mm | Wind: {m.maxWindSpeed} km/h</div>
                    <div style={{ fontSize: '11px', color: '#67e8f9', marginTop: '4px' }}>{m.synopticCondition}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Panel 4: Sector Advisories */}
          {activeNav === 'sectors' && (
            <div className="sector-panel-desktop">
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => setActiveSector('agriculture')}
                  style={{ background: activeSector === 'agriculture' ? '#0284c7' : 'rgba(255,255,255,0.05)', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                >
                  🌾 Agriculture / Farmers
                </button>
                <button 
                  onClick={() => setActiveSector('aviation')}
                  style={{ background: activeSector === 'aviation' ? '#0284c7' : 'rgba(255,255,255,0.05)', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                >
                  ✈️ Aviation (METAR)
                </button>
                <button 
                  onClick={() => setActiveSector('marine')}
                  style={{ background: activeSector === 'marine' ? '#0284c7' : 'rgba(255,255,255,0.05)', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                >
                  ⚓ Marine & Fisheries
                </button>
                <button 
                  onClick={() => setActiveSector('urban')}
                  style={{ background: activeSector === 'urban' ? '#0284c7' : 'rgba(255,255,255,0.05)', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                >
                  🏙️ Smart City
                </button>
              </div>

              {sectorLoading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                  <p>Loading {activeSector} advisory...</p>
                  <div style={{ animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.6 }}>⏳</div>
                </div>
              ) : (
                <>
                  {activeSector === 'agriculture' && sectorAdvisory?.agriculture && (
                    <div style={{ fontSize: '12px', lineHeight: '1.7', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '12px', borderRadius: '8px' }}>
                        <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#86efac' }}>🌾 Sowing Advice</p>
                        <p style={{ margin: 0, color: '#cbd5e1' }}>{sectorAdvisory.agriculture.sowingAdvisory}</p>
                      </div>
                      <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '12px', borderRadius: '8px' }}>
                        <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#93c5fd' }}>💧 Irrigation</p>
                        <p style={{ margin: 0, color: '#cbd5e1' }}>{sectorAdvisory.agriculture.irrigationRecommendation}</p>
                      </div>
                      <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '12px', borderRadius: '8px' }}>
                        <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#d8b4fe' }}>🧪 Spraying</p>
                        <p style={{ margin: 0, color: '#cbd5e1' }}>{sectorAdvisory.agriculture.sprayingWindow}</p>
                      </div>
                      <div style={{ background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.3)', padding: '12px', borderRadius: '8px' }}>
                        <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#fed7aa' }}>📊 Soil & Pest</p>
                        <p style={{ margin: 0, color: '#cbd5e1' }}>Moisture: <strong>{sectorAdvisory.agriculture.soilMoistureIndex}%</strong> | Risk: <strong style={{ color: '#ff6b6b' }}>{sectorAdvisory.agriculture.pestDiseaseRisk}</strong></p>
                      </div>
                    </div>
                  )}
                  {activeSector === 'aviation' && sectorAdvisory?.aviation && (
                    <div style={{ fontSize: '12px', lineHeight: '1.7', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '12px', borderRadius: '8px' }}>
                        <p style={{ margin: '0 0 4px', fontWeight: 600 }}>✈️ Flight Category</p>
                        <p style={{ margin: 0, color: '#cbd5e1', fontWeight: 700 }}>{sectorAdvisory.aviation.flightCategory}</p>
                      </div>
                      <div style={{ background: 'rgba(17, 24, 39, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '11px', overflow: 'auto' }}>
                        <p style={{ margin: 0, color: '#93c5fd' }}>{sectorAdvisory.aviation.metarCode}</p>
                      </div>
                      <div style={{ background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.3)', padding: '12px', borderRadius: '8px' }}>
                        <p style={{ margin: 0, color: '#cbd5e1' }}>👁️ Visibility: <strong>{sectorAdvisory.aviation.visibilityKm}</strong> km | 🌫️ Ceiling: <strong>{sectorAdvisory.aviation.cloudCeiling}</strong></p>
                      </div>
                    </div>
                  )}
                  {activeSector === 'marine' && sectorAdvisory?.marine && (
                    <div style={{ fontSize: '12px', lineHeight: '1.7', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '12px', borderRadius: '8px' }}>
                        <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#67e8f9' }}>⚓ Fishermen Directive</p>
                        <p style={{ margin: 0, color: '#cbd5e1' }}>{sectorAdvisory.marine.fishermenAction}</p>
                      </div>
                      <div style={{ background: 'rgba(79, 172, 254, 0.1)', border: '1px solid rgba(79, 172, 254, 0.3)', padding: '12px', borderRadius: '8px' }}>
                        <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#bfdbfe' }}>🌊 Sea State</p>
                        <p style={{ margin: 0, color: '#cbd5e1' }}>{sectorAdvisory.marine.seaState} | Wave: <strong>{sectorAdvisory.marine.waveHeightMeters}m</strong> | Wind: <strong>{sectorAdvisory.marine.windSpeedKnots}</strong> kt</p>
                      </div>
                    </div>
                  )}
                  {activeSector === 'urban' && sectorAdvisory?.smartCity && (
                    <div style={{ fontSize: '12px', lineHeight: '1.7', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ background: 'rgba(217, 119, 6, 0.1)', border: '1px solid rgba(217, 119, 6, 0.3)', padding: '12px', borderRadius: '8px' }}>
                        <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#fcd34d' }}>🌊 Flood Risk</p>
                        <p style={{ margin: 0, color: '#cbd5e1' }}>{sectorAdvisory.smartCity.waterloggingFloodRisk}</p>
                      </div>
                      <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '8px' }}>
                        <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#fca5a5' }}>🌡️ Heat & Safety</p>
                        <p style={{ margin: 0, color: '#cbd5e1' }}>Heat Index: <strong>{sectorAdvisory.smartCity.urbanHeatIslandIndex}</strong> | Labor: <strong>{sectorAdvisory.smartCity.outdoorLaborSafety}</strong></p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Active Panel 5: Extreme Weather Alerts */}
          {activeNav === 'alerts' && (
            <div className="alerts-panel-desktop">
              <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>🚨 IMD Colour-Coded Early Warnings & Alerts</h3>
              {alertsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#10b981' }}>
                  <CheckCircle size={36} />
                  <p>🟢 <strong>IMD Green: Normal Weather Conditions</strong></p>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>No severe weather warnings active for {currentCity}.</span>
                </div>
              ) : (
                alertsList.map((alert: any) => (
                  <div key={alert.id} style={{ background: 'rgba(2, 6, 23, 0.5)', borderLeft: '4px solid #f59e0b', padding: '10px 14px', borderRadius: '6px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '11px', marginBottom: '4px' }}>
                      <span style={{ background: '#ef4444', color: 'white', padding: '1px 6px', borderRadius: '4px' }}>{alert.severity}</span>
                      <span style={{ color: '#38bdf8' }}>{alert.informationClass}</span>
                    </div>
                    <strong style={{ fontSize: '14px' }}>{alert.title}</strong>
                    <p style={{ margin: '4px 0', fontSize: '12px', color: '#cbd5e1' }}>{alert.description}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Active Panel 6: Climate Trends */}
          {activeNav === 'climate' && climateInfo && (
            <div className="climate-panel-desktop">
              <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>📈 10-Year Climate Trend Analysis ({climateInfo.analysisPeriod})</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                <div style={{ background: 'rgba(2, 6, 23, 0.6)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Warming Trend</span>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#f87171' }}>+{climateInfo.warmingRatePerDecade}°C / dec</div>
                </div>
                <div style={{ background: 'rgba(2, 6, 23, 0.6)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Baseline Normal Temp</span>
                  <div style={{ fontSize: '18px', fontWeight: 800 }}>{climateInfo.baselineMeanTemperature}°C</div>
                </div>
                <div style={{ background: 'rgba(2, 6, 23, 0.6)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Annual Rain Baseline</span>
                  <div style={{ fontSize: '18px', fontWeight: 800 }}>{climateInfo.baselineAnnualPrecipitation} mm</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Messages Flow */}
        <div className="simple-chat">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="message-bubble">
                {msg.content.split('\n').map((line, idx) => (
                  <p key={idx} className={line.startsWith('•') ? 'message-bullet' : (line.startsWith('**') ? 'message-bold' : '')}>
                    {line.replace(/\*\*/g, '')}
                  </p>
                ))}

                {msg.role === 'bot' && (
                  <button 
                    className="read-aloud-btn" 
                    onClick={() => handleSpeakText(msg)}
                    style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '12px' }}
                  >
                    {isSpeaking && isSpeakingId === msg.id ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    <span>{isSpeaking && isSpeakingId === msg.id ? "Stop Speech" : "Listen"}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message bot typing">
              <div className="typing-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="input-area">
          <div className="input-container">
            <input
              ref={inputRef}
              type="text"
              placeholder={voiceEnabled ? 'Listening in ' + activeLangObj.label + '...' : "Ask WeatherGPT in " + activeLangObj.label + "... (e.g., 'Crop sowing in Pune', 'Rain in Delhi')"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className={voiceEnabled ? 'voice-active' : ''}
            />
            <button
              className={`mic-btn ${voiceEnabled ? 'active' : ''}`}
              onClick={toggleVoice}
              disabled={!sttSupported}
              title="Voice Input"
              aria-label="Voice Input"
            >
              <Mic size={20} />
            </button>
            <button
              className="send-btn"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="input-hint">
            Multilingual Support Active ({activeLangObj.label}) • Press Enter to send • MoES / IMD Aligned
          </p>
        </div>

        <footer className="simple-footer">
          <p>WeatherGPT Platform • Ministry of Earth Sciences (MoES) / IMD Mission • Open-Meteo & WIS 2.0 Telemetry</p>
        </footer>
      </main>

      <WeeklyForecastFooter days={weeklyDays} cityName={currentCity} activeIndex={3} />

      <ChatDrawer
        isOpen={chatDrawerOpen}
        onClose={() => setChatDrawerOpen(false)}
        selectedLang={selectedLang}
        onLanguageChange={setSelectedLang}
      />

      <MobileChatToggle isOpen={mobileChatOpen} onClose={() => setMobileChatOpen(false)} />
    </div>
  );
}
