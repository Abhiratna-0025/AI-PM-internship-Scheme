import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send, 
  Mic, 
  Volume2, 
  VolumeX, 
  MapPin, 
  CheckCircle
} from 'lucide-react';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useVoiceOutput } from '../hooks/useVoiceOutput';
import { API_BASE_URL } from '../config/api';
import './MobileWeatherGPT.css';

interface ChatMessage {
  id: string;
  role: 'bot' | 'user';
  content: string;
  timestamp: Date;
  voiceText?: string;
  structuredData?: any;
}

const LANGUAGES = [
  { code: 'en', label: 'English', speechLocale: 'en-IN' },
  { code: 'hi', label: 'हिन्दी (Hindi)', speechLocale: 'hi-IN' },
  { code: 'ta', label: 'தமிழ் (Tamil)', speechLocale: 'ta-IN' },
  { code: 'te', label: 'తెలుగు (Telugu)', speechLocale: 'te-IN' },
  { code: 'bn', label: 'বাংলা (Bengali)', speechLocale: 'bn-IN' },
  { code: 'mr', label: 'मराठी (Marathi)', speechLocale: 'mr-IN' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati)', speechLocale: 'gu-IN' },
];

export default function MobileWeatherGPT() {
  const [activeTab, setActiveTab] = useState<'chat' | 'nowcast' | 'nwp' | 'sectors' | 'alerts' | 'climate'>('chat');
  const [selectedLang, setSelectedLang] = useState('en');
  const [currentCity, setCurrentCity] = useState('Delhi');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);



  // Live Data States
  const [nowcastData, setNowcastData] = useState<any>(null);
  const [forecastDays, setForecastDays] = useState<any[]>([]);
  const [nwpData, setNwpData] = useState<any>(null);
  const [sectorData, setSectorData] = useState<any>(null);
  const [activeSector, setActiveSector] = useState<'agriculture' | 'aviation' | 'marine' | 'urban'>('agriculture');
  const [alertsData, setAlertsData] = useState<any>(null);
  const [climateData, setClimateData] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeLangObj = LANGUAGES.find(l => l.code === selectedLang) || LANGUAGES[0];

  const { speak, stop: stopSpeech, isSpeaking } = useVoiceOutput();

  const {
    status: voiceStatus,
    isSupported: voiceSupported,
    startListening,
    stopListening,
  } = useVoiceInput({
    lang: activeLangObj.speechLocale,
    onTranscript: (text) => {
      if (!text) return;
      setInput(text);
    },
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'bot',
      content: "👋 Greetings! I am **WeatherGPT**, your AI meteorological & disaster decision-support assistant aligned with MoES / IMD.\n\nAsk me in your preferred language about forecasts, crop advisories, NWP multi-model predictions, or extreme weather alerts!",
      timestamp: new Date(),
    },
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Initial load of weather data
  useEffect(() => {
    const controller = new AbortController();

    const loadAll = async () => {
      try {
        await fetchNowcast(currentCity, controller.signal);
        await fetchNwp(currentCity, controller.signal);
        await fetchSectorAdvisories(currentCity, activeSector, controller.signal);
        await fetchAlerts(currentCity, controller.signal);
        await fetchClimate(currentCity, controller.signal);
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          return;
        }
        console.warn("Mobile data load failed:", e);
      }
    };

    loadAll();

    return () => {
      controller.abort();
    };
  }, [currentCity, activeSector]);

  const fetchNowcast = async (city: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/weather/current?location=${encodeURIComponent(city)}`, { signal });
      const data = await res.json();
      if (data.success && data.data) {
        setNowcastData(data.data);
      }
      const fRes = await fetch(`${API_BASE_URL}/api/weather/forecast?location=${encodeURIComponent(city)}&days=7`, { signal });
      const fData = await fRes.json();
      if (fData.success && fData.data?.days) {
        setForecastDays(fData.data.days);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        return;
      }
      console.warn("Could not fetch nowcast:", e);
    }
  };

  const fetchNwp = async (city: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/weather/nwp?location=${encodeURIComponent(city)}`, { signal });
      const data = await res.json();
      if (data.success && data.data) {
        setNwpData(data.data);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        return;
      }
      console.warn("Could not fetch NWP:", e);
    }
  };

  const fetchSectorAdvisories = async (city: string, sector: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/weather/advisories?location=${encodeURIComponent(city)}&sector=${sector}`, { signal });
      const data = await res.json();
      if (data.success && data.data) {
        setSectorData(data.data);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        return;
      }
      console.warn("Could not fetch sector advisories:", e);
    }
  };

  const fetchAlerts = async (city: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alerts/early-warnings?location=${encodeURIComponent(city)}`, { signal });
      const data = await res.json();
      if (data.success && data.data) {
        setAlertsData(data.data);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        return;
      }
      console.warn("Could not fetch alerts:", e);
    }
  };

  const fetchClimate = async (city: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/weather/climate?location=${encodeURIComponent(city)}&startYear=2015&endYear=2024`, { signal });
      const data = await res.json();
      if (data.success && data.data) {
        setClimateData(data.data);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        return;
      }
      console.warn("Could not fetch climate data:", e);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentCity(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
        const userMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          content: `📍 My GPS location: ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
          const res = await fetch(`${API_BASE_URL}/api/weather/advisories?latitude=${latitude}&longitude=${longitude}&sector=all`);
          const data = await res.json();
          if (data.success && data.data) {
            setSectorData(data.data);
            const botMsg: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'bot',
              content: `📍 **Field Location Coordinates: ${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E**\n\nHyper-local advisories retrieved for Agriculture, Smart City, and Severe Weather.\n\n• Sowing Advisory: ${data.data.agriculture?.sowingAdvisory || 'Normal'}\n• Irrigation: ${data.data.agriculture?.irrigationRecommendation || 'Adequate'}\n• Marine/Fisheries: ${data.data.marine?.fishermenAction || 'Safe'}`,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, botMsg]);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        alert("Location access denied or unavailable: " + err.message);
      }
    );
  };

  const handleSend = useCallback(async (customMessage?: string) => {
    const textToSend = (customMessage || input).trim();
    if (!textToSend || isLoading) return;

    if (!customMessage) setInput('');
    setIsLoading(true);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          language: selectedLang,
          sector: activeSector,
          sessionId: 'mobile-session-01',
        }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        const botData = data.data;
        const botMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          content: botData.answer || 'Query processed.',
          voiceText: botData.voiceAnswer || botData.answer,
          structuredData: botData,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botMsg]);

        // If location was returned, update current city
        if (botData.location?.name) {
          setCurrentCity(botData.location.name);
        }

        // Auto-play voice if Hindi/Tamil/etc or voice was used
        if (botData.voiceAnswer && (voiceStatus === 'listening' || selectedLang !== 'en')) {
          speak(botData.voiceAnswer, activeLangObj.speechLocale);
        }
      } else {
        const errAnswer = data.message || "I couldn't process that query. Please try asking about weather in a city.";
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          content: `⚠️ ${errAnswer}`,
          timestamp: new Date(),
        }]);
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: "⚠️ Unable to reach WeatherGPT backend. Please verify your internet connection.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, selectedLang, activeSector, activeLangObj, voiceStatus, speak]);

  const toggleListen = () => {
    if (voiceStatus === 'listening') {
      stopListening();
    } else {
      stopSpeech();
      startListening();
    }
  };

  const handleReadAloud = (msg: ChatMessage) => {
    if (isSpeaking && isSpeakingId === msg.id) {
      stopSpeech();
      setIsSpeakingId(null);
    } else {
      stopSpeech();
      const textToSpeak = msg.voiceText || msg.content.replace(/[*#`_~]/g, '');
      speak(textToSpeak, activeLangObj.speechLocale);
      setIsSpeakingId(msg.id);
    }
  };

  return (
    <div className="mobile-weathergpt-container">
      {/* Top Mobile Bar */}
      <header className="mobile-chat-header">
        <div className="mobile-header-left">
          <button className="mobile-branding-logo" title="WeatherGPT">
            <svg className="mobile-breeze-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M2 16C2 23.7268 8.2732 30 16 30C23.7268 30 30 23.7268 30 16C30 8.2732 23.7268 2 16 2C8.2732 2 2 8.2732 2 16V16" stroke="white" strokeOpacity="0.225" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M9 13.5C11.5 12 14 12 16.5 13.5C19 15 21.5 15 24 13.5" stroke="white" strokeOpacity="0.9" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M8 17.5C10.5 16 13 16 15.5 17.5C18 19 20.5 19 23 17.5" stroke="white" strokeOpacity="0.9" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M10 21.5C12 20.5 14 20.5 16 21.5C18 22.5 20 22.5 22 21.5" stroke="white" strokeOpacity="0.9" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </button>
          <div className="mobile-header-title">
            <h1 className="mobile-title">WeatherGPT Intelligence</h1>
            <p className="mobile-subtitle">
              <span className="status-dot"></span>
              MoES / IMD Multi-Model Ensemble • Latency: 142ms
            </p>
          </div>
        </div>

        <div className="mobile-header-actions">
          <button 
            className="gps-btn" 
            onClick={handleUseMyLocation}
            title="Use My Location (GPS)"
          >
            <MapPin size={16} />
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="mobile-nav-tabs">
        <button 
          className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          💬 Chat
        </button>
        <button 
          className={`nav-tab ${activeTab === 'nowcast' ? 'active' : ''}`}
          onClick={() => setActiveTab('nowcast')}
        >
          🌤️ Nowcast
        </button>
        <button 
          className={`nav-tab ${activeTab === 'nwp' ? 'active' : ''}`}
          onClick={() => setActiveTab('nwp')}
        >
          🛰️ NWP Models
        </button>
        <button 
          className={`nav-tab ${activeTab === 'sectors' ? 'active' : ''}`}
          onClick={() => setActiveTab('sectors')}
        >
          🌾 Sectors
        </button>
        <button 
          className={`nav-tab ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          🚨 Alerts {alertsData?.totalAlerts > 0 && <span className="tab-badge">{alertsData.totalAlerts}</span>}
        </button>
        <button 
          className={`nav-tab ${activeTab === 'climate' ? 'active' : ''}`}
          onClick={() => setActiveTab('climate')}
        >
          📈 Climate
        </button>
      </nav>

      {/* Content Panes */}
      <div className="mobile-content-area">
        {/* TAB 1: CHAT */}
        {activeTab === 'chat' && (
          <div className="mobile-chat-body">
            {/* Quick action chips */}
            <div className="quick-chip-tray">
              <button className="chip" onClick={() => handleSend(`Weather in ${currentCity}`)}>
                🌤️ Weather in {currentCity}
              </button>
              <button className="chip" onClick={() => handleSend(`Will it rain tomorrow in ${currentCity}?`)}>
                🌧️ Rain Tomorrow
              </button>
              <button className="chip" onClick={() => handleSend(`Sowing advisory for ${currentCity}`)}>
                🌾 Sowing Guidance
              </button>
              <button className="chip" onClick={() => handleSend(`Compare GFS and ECMWF models for ${currentCity}`)}>
                🛰️ NWP Models
              </button>
              <button className="chip" onClick={() => handleSend(`Climate trend for ${currentCity}`)}>
                📈 Climate Trend
              </button>
            </div>

            {/* Chat Messages */}
            {messages.map((msg) => (
              <div key={msg.id} className={`mobile-message ${msg.role}`}>
                {msg.role === 'bot' ? (
                  <div className="bot-message-container">
                    <div className="bot-message-content">
                      {msg.content.split('\n\n').map((paragraph, idx) => (
                        <div key={idx} className="bot-message-section">
                          {paragraph.split('\n').map((line, lIdx) => (
                            <p key={lIdx} className={line.startsWith('•') ? 'bullet-line' : (line.startsWith('*') ? 'bold-line' : '')}>
                              {line.replace(/\*\*/g, '')}
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>

                    <div className="bot-message-footer">
                      <button 
                        className="voice-read-btn" 
                        onClick={() => handleReadAloud(msg)}
                        title="Read aloud"
                      >
                        {isSpeaking && isSpeakingId === msg.id ? <VolumeX size={15} /> : <Volume2 size={15} />}
                        <span>{isSpeaking && isSpeakingId === msg.id ? "Stop Speech" : "Listen"}</span>
                      </button>
                      <span className="source-tag">MoES / IMD Synoptic Data</span>
                    </div>
                  </div>
                ) : (
                  <div className="user-message-container">
                    <div className="user-message-bubble">
                      {msg.content}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="mobile-message bot typing-message">
                <div className="typing-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* TAB 2: NOWCAST & FORECAST */}
        {activeTab === 'nowcast' && (
          <div className="nowcast-pane">
            <div className="city-search-box">
              <input 
                type="text" 
                value={currentCity} 
                onChange={(e) => setCurrentCity(e.target.value)}
                placeholder="Enter city..."
              />
              <button onClick={() => fetchNowcast(currentCity)}>Fetch</button>
            </div>

            {nowcastData ? (
              <div className="metric-dashboard">
                <div className="main-temp-card">
                  <div className="card-top">
                    <span className="card-city">{nowcastData.location?.name}, {nowcastData.location?.country}</span>
                    <span className="card-obs">{nowcastData.observedAt || 'Live'}</span>
                  </div>
                  <div className="temp-hero">
                    <span className="temp-val">{Math.round(nowcastData.temperature)}°C</span>
                    <span className="condition-pill">{nowcastData.weatherDescription}</span>
                  </div>
                  <div className="metrics-row">
                    <div className="mini-metric">
                      <span className="m-lbl">Feels Like</span>
                      <span className="m-val">{Math.round(nowcastData.apparentTemperature)}°C</span>
                    </div>
                    <div className="mini-metric">
                      <span className="m-lbl">Humidity</span>
                      <span className="m-val">{nowcastData.humidity}%</span>
                    </div>
                    <div className="mini-metric">
                      <span className="m-lbl">Wind</span>
                      <span className="m-val">{nowcastData.windSpeed} km/h</span>
                    </div>
                    <div className="mini-metric">
                      <span className="m-lbl">Pressure</span>
                      <span className="m-val">{nowcastData.pressure} hPa</span>
                    </div>
                  </div>
                </div>

                {/* 7-Day Forecast */}
                <h3 className="section-title">📅 7-Day Numerical Forecast</h3>
                <div className="forecast-scroll-row">
                  {forecastDays.map((day, idx) => (
                    <div key={idx} className="forecast-day-card">
                      <span className="f-date">{idx === 0 ? 'Today' : (idx === 1 ? 'Tmrw' : day.date.substring(5))}</span>
                      <span className="f-temp">{Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°</span>
                      <span className="f-desc">{day.weatherDescription}</span>
                      <span className="f-rain">🌧️ {day.precipitationProbabilityMax}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="loading-state">Loading Nowcast telemetry...</div>
            )}
          </div>
        )}

        {/* TAB 3: NWP MODELS */}
        {activeTab === 'nwp' && (
          <div className="nwp-pane">
            <h3 className="section-title">🛰️ Numerical Weather Prediction (NWP) Ensemble</h3>
            <p className="section-sub">Direct comparison across NOAA GFS, ECMWF IFS (High Res), and WRF regional models.</p>

            {nwpData ? (
              <div>
                <div className="consensus-banner">
                  <div className="score-ring">
                    <span className="score-num">{nwpData.consensus?.consensusScorePercentage}%</span>
                    <span className="score-lbl">Consensus</span>
                  </div>
                  <div className="consensus-info">
                    <strong>Confidence: {nwpData.consensus?.confidenceLevel}</strong>
                    <p>{nwpData.consensus?.synopticSummary}</p>
                    <span className="spread-note">Thermal Spread: {nwpData.consensus?.tempSpread}°C • Rain Spread: {nwpData.consensus?.precipSpread} mm</span>
                  </div>
                </div>

                <div className="models-table">
                  {nwpData.models?.map((m: any, idx: number) => (
                    <div key={idx} className="model-row">
                      <div className="model-header">
                        <span className="model-name">{m.modelName}</span>
                        <span className="model-res">{m.resolution}</span>
                      </div>
                      <div className="model-stats">
                        <span>Max: <strong>{m.maxTemp}°C</strong></span>
                        <span>Min: <strong>{m.minTemp}°C</strong></span>
                        <span>Rain: <strong>{m.totalPrecipitation} mm</strong> ({m.precipitationProbability}%)</span>
                        <span>Wind: <strong>{m.maxWindSpeed} km/h</strong></span>
                      </div>
                      <div className="model-syn">{m.synopticCondition}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="loading-state">Loading NWP model data...</div>
            )}
          </div>
        )}

        {/* TAB 4: SECTOR ADVISORIES */}
        {activeTab === 'sectors' && (
          <div className="sectors-pane">
            <div className="sector-selector-bar">
              <button 
                className={`sector-tab ${activeSector === 'agriculture' ? 'active' : ''}`}
                onClick={() => setActiveSector('agriculture')}
              >
                🌾 Agriculture
              </button>
              <button 
                className={`sector-tab ${activeSector === 'aviation' ? 'active' : ''}`}
                onClick={() => setActiveSector('aviation')}
              >
                ✈️ Aviation
              </button>
              <button 
                className={`sector-tab ${activeSector === 'marine' ? 'active' : ''}`}
                onClick={() => setActiveSector('marine')}
              >
                ⚓ Marine
              </button>
              <button 
                className={`sector-tab ${activeSector === 'urban' ? 'active' : ''}`}
                onClick={() => setActiveSector('urban')}
              >
                🏙️ Smart City
              </button>
            </div>

            {sectorData ? (
              <div className="sector-advisory-card">
                {activeSector === 'agriculture' && sectorData.agriculture && (
                  <div>
                    <h4 className="advisory-title">🌱 Agromet Crop-Weather Directives</h4>
                    <div className="directive-item alert-success">
                      <strong>Sowing Advice:</strong> {sectorData.agriculture.sowingAdvisory}
                    </div>
                    <div className="directive-item">
                      <strong>Irrigation:</strong> {sectorData.agriculture.irrigationRecommendation}
                    </div>
                    <div className="directive-item">
                      <strong>Chemical Spraying:</strong> {sectorData.agriculture.sprayingWindow}
                    </div>
                    <div className="directive-item">
                      <strong>Harvest Window:</strong> {sectorData.agriculture.harvestingGuidance}
                    </div>
                    <div className="metric-pills">
                      <span>Soil Moisture: <strong>{sectorData.agriculture.soilMoistureIndex}%</strong></span>
                      <span>Pest Risk: <strong>{sectorData.agriculture.pestDiseaseRisk}</strong></span>
                    </div>
                  </div>
                )}

                {activeSector === 'aviation' && sectorData.aviation && (
                  <div>
                    <h4 className="advisory-title">✈️ Airport & Aviation Weather Briefing</h4>
                    <div className="directive-item">
                      <strong>Flight Category:</strong> <span className="cat-badge">{sectorData.aviation.flightCategory}</span>
                    </div>
                    <div className="code-box">
                      <code>{sectorData.aviation.metarCode}</code>
                    </div>
                    <div className="directive-item">
                      <strong>Visibility:</strong> {sectorData.aviation.visibilityKm} km | <strong>Ceiling:</strong> {sectorData.aviation.cloudCeiling}
                    </div>
                    <div className="directive-item">
                      <strong>Crosswind:</strong> {sectorData.aviation.crosswindKnots} kt | <strong>Turbulence:</strong> {sectorData.aviation.turbulenceRisk}
                    </div>
                  </div>
                )}

                {activeSector === 'marine' && sectorData.marine && (
                  <div>
                    <h4 className="advisory-title">⚓ Marine & Coastal Fisheries Advisory</h4>
                    <div className={`directive-item ${sectorData.marine.fishermenWarningActive ? 'alert-danger' : 'alert-success'}`}>
                      <strong>Fishermen Directive:</strong> {sectorData.marine.fishermenAction}
                    </div>
                    <div className="directive-item">
                      <strong>Sea State:</strong> {sectorData.marine.seaState} (Wave Height: {sectorData.marine.waveHeightMeters} m)
                    </div>
                    <div className="directive-item">
                      <strong>Wind:</strong> {sectorData.marine.windSpeedKnots} knots (Beaufort Scale {sectorData.marine.windBeaufortScale})
                    </div>
                  </div>
                )}

                {activeSector === 'urban' && sectorData.smartCity && (
                  <div>
                    <h4 className="advisory-title">🏙️ Smart City Weather & Heat Island Monitoring</h4>
                    <div className="directive-item">
                      <strong>Flood / Waterlogging Risk:</strong> {sectorData.smartCity.waterloggingFloodRisk}
                    </div>
                    <div className="directive-item">
                      <strong>Heat Island Index:</strong> {sectorData.smartCity.urbanHeatIslandIndex} (Heat Index: {sectorData.smartCity.outdoorWorkHeatIndex}°C)
                    </div>
                    <div className="directive-item">
                      <strong>Outdoor Labor Safety:</strong> {sectorData.smartCity.outdoorLaborSafety}
                    </div>
                    <div className="directive-item">
                      <strong>Municipal Storm Pumping:</strong> {sectorData.smartCity.municipalPumpingAdvice}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="loading-state">Loading sector advisories...</div>
            )}
          </div>
        )}

        {/* TAB 5: ALERTS */}
        {activeTab === 'alerts' && (
          <div className="alerts-pane">
            <h3 className="section-title">🚨 IMD Extreme Weather Alerts & Early Warnings</h3>
            <p className="section-sub">Standardized MoES/IMD colour-coded warnings (Green, Yellow, Orange, Red).</p>

            {alertsData && alertsData.alerts ? (
              <div className="alerts-list">
                {alertsData.alerts.length === 0 ? (
                  <div className="green-alert-box">
                    <CheckCircle size={32} className="green-icon" />
                    <h4>🟢 IMD Green: Normal Weather</h4>
                    <p>No severe weather warnings active for {currentCity}. Standard meteorological conditions prevail.</p>
                  </div>
                ) : (
                  alertsData.alerts.map((alert: any) => (
                    <div key={alert.id} className={`alert-card ${alert.severity?.toLowerCase()}`}>
                      <div className="alert-card-header">
                        <span className="alert-severity-badge">{alert.severity}</span>
                        <span className="alert-type-badge">{alert.alertType}</span>
                        <span className="info-class-badge">{alert.informationClass}</span>
                      </div>
                      <h4 className="alert-card-title">{alert.title}</h4>
                      <p className="alert-card-desc">{alert.description}</p>
                      <div className="alert-card-meta">
                        <span>Source: {alert.source}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="loading-state">Checking early warnings...</div>
            )}
          </div>
        )}

        {/* TAB 6: CLIMATE TRENDS */}
        {activeTab === 'climate' && (
          <div className="climate-pane">
            <h3 className="section-title">📈 10-Year Climate Trend Analytics</h3>
            <p className="section-sub">Decadal climate analytics over {currentCity} based on historical reanalysis records.</p>

            {climateData ? (
              <div className="climate-card">
                <div className="climate-stats-grid">
                  <div className="c-stat">
                    <span className="c-lbl">Decadal Warming Rate</span>
                    <span className="c-val hot">+{climateData.warmingRatePerDecade}°C / dec</span>
                  </div>
                  <div className="c-stat">
                    <span className="c-lbl">Baseline Mean Temp</span>
                    <span className="c-val">{climateData.baselineMeanTemperature}°C</span>
                  </div>
                  <div className="c-stat">
                    <span className="c-lbl">Annual Rain Baseline</span>
                    <span className="c-val">{climateData.baselineAnnualPrecipitation} mm</span>
                  </div>
                </div>

                <h4 className="trend-title">Yearly Mean Temperature Deviation</h4>
                <div className="trend-bars">
                  {climateData.yearlyMetrics?.map((m: any) => (
                    <div key={m.year} className="year-bar-col">
                      <span className="bar-anomaly">{m.tempAnomalyVsBaseline > 0 ? `+${m.tempAnomalyVsBaseline}` : m.tempAnomalyVsBaseline}°</span>
                      <div 
                        className={`bar-fill ${m.tempAnomalyVsBaseline > 0 ? 'pos' : 'neg'}`}
                        style={{ height: `${Math.min(100, Math.max(20, Math.abs(m.tempAnomalyVsBaseline * 40)))}px` }}
                      />
                      <span className="bar-year">{m.year.toString().substring(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="climate-insights-box">
                  <h4>Key Meteorological Findings:</h4>
                  <ul>
                    {climateData.climateInsights?.map((ins: string, idx: number) => (
                      <li key={idx}>{ins}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="loading-state">Loading climate analytics...</div>
            )}
          </div>
        )}
      </div>

      {/* Input Bar (Always accessible) */}
      <div className="mobile-input-bar">
        <input
          ref={inputRef}
          type="text"
          className="mobile-input-field"
          placeholder={voiceStatus === 'listening' ? "Listening in " + activeLangObj.label + "..." : "Ask WeatherGPT (e.g. Sowing in Pune, Rain in Delhi)..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        {/* Voice Recognition Button */}
        <button 
          className={`mobile-voice-btn ${voiceStatus === 'listening' ? 'pulsing' : ''}`}
          onClick={toggleListen}
          disabled={!voiceSupported}
          title={voiceSupported ? "Speak in your language" : "Voice not supported in this browser"}
        >
          <Mic size={18} />
        </button>

        {/* Send Button */}
        <button 
          className="mobile-send-btn" 
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
