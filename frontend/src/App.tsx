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
  Settings,
  Search,
} from 'lucide-react';
import MobileWeatherGPT from './components/MobileWeatherGPT';
import MobileChatToggle from './components/MobileChatToggle';
import './App.css';

type MessageRole = 'user' | 'bot';

export default function App() {
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('weather');
  
  const [messages, setMessages] = useState<{ id: string; role: MessageRole; content: string }[]>([
    {
      id: '1',
      role: 'bot',
      content: '👋 Hello! I\'m WeatherGPT, your AI-powered weather assistant. Ask me about weather in any city, or click below to get weather for your current location!',
    },
  ]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [currentWeather, setCurrentWeather] = useState<{
    city: string;
    temp: number;
    apparentTemp: number;
    humidity: number;
    wind: number;
    cloudCover: number;
    description: string;
  } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    status: sttStatus,
    isSupported: sttSupported,
    startListening,
    stopListening,
  } = useVoiceInput({
    onTranscript: (text) => {
      if (!text) return;
      setInput(text);
    },
    onError: (err) => {
      console.error('Voice error:', err);
    },
  });

  const { speak, stop: stopSpeech } = useVoiceOutput();

  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'processing' | 'error'>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  useEffect(() => {
    if (!sttSupported) {
      setVoiceStatus('error');
      setVoiceError('Voice not supported. Try Chrome or Edge.');
      return;
    }
    if (sttStatus === 'listening') {
      setVoiceStatus('listening');
    } else if (sttStatus === 'error') {
      setVoiceStatus('error');
      setVoiceError('Speech recognition error.');
    } else if (voiceEnabled && sttStatus === 'idle' && voiceStatus === 'listening') {
      setVoiceStatus('idle');
    }
  }, [sttStatus, sttSupported, voiceEnabled]);

  useEffect(() => {
    if (!voiceEnabled) {
      stopSpeech();
      return;
    }
    const botMessages = messages.filter(m => m.role === 'bot');
    if (botMessages.length === 0) return;
    const lastBot = botMessages[botMessages.length - 1];
    const plainText = stripHtml(lastBot.content);
    if (plainText && plainText.trim().length > 0) {
      window.speechSynthesis?.cancel();
      speak(plainText, 'en-IN');
    }
  }, [messages, voiceEnabled]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      stopListening();
    };
  }, [stopListening]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const stripHtml = (html: string): string => {
    if (!html) return '';
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const startVoice = useCallback(() => {
    if (!sttSupported) return;
    window.speechSynthesis?.cancel();
    setVoiceError(null);
    setVoiceStatus('listening');
    startListening();
  }, [sttSupported, startListening]);

  const stopVoice = useCallback(() => {
    stopListening();
    setVoiceStatus('idle');
    setVoiceError(null);
  }, [stopListening]);

  const toggleVoice = useCallback(() => {
    if (voiceEnabled) {
      stopVoice();
      setVoiceEnabled(false);
    } else {
      setVoiceEnabled(true);
      startVoice();
    }
  }, [voiceEnabled, startVoice, stopVoice]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    const userMsg: { id: string; role: MessageRole; content: string } = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      let botResponse = '';
      const city = extractCity(userMessage) || detectWeatherIntent(userMessage);

      if (city) {
        // Fetch real-time weather from official API
        const weatherInfo = await fetchWeatherByCity(city);
        // Fetch forecast data
        const forecast = await fetchForecastByCity(city);
        
        if (weatherInfo) {
          setCurrentWeather({
            city: weatherInfo.name,
            temp: weatherInfo.temp,
            apparentTemp: weatherInfo.apparentTemp || weatherInfo.temp,
            humidity: weatherInfo.humidity,
            wind: weatherInfo.windSpeed,
            cloudCover: weatherInfo.cloudCover || 0,
            description: weatherInfo.description,
          });

          // Build weather prediction response based on API data
          botResponse = `📍 **${weatherInfo.name}, ${weatherInfo.country}**

**Current Conditions:**
${weatherInfo.description}

🌡️ **Temperature:** ${Math.round(weatherInfo.temp)}°C
💧 **Humidity:** ${weatherInfo.humidity}%
💨 **Wind:** ${weatherInfo.windSpeed} m/s
☁️ **Cloud Cover:** ${weatherInfo.cloudCover || 'N/A'}%

`;

          // Add forecast if available
          if (forecast && forecast.length > 0) {
            botResponse += `**${forecast.length}-Day Forecast:**\n`;
            forecast.slice(0, 3).forEach((day: { date: string; tempMax: number; tempMin: number; weatherDescription: string }, idx: number) => {
              const date = new Date(day.date);
              const dayName = idx === 0 ? 'Today' : date.toLocaleDateString('en', { weekday: 'short' });
              botResponse += `\n${dayName}: ${Math.round(day.tempMax)}°C / ${Math.round(day.tempMin)}°C, ${day.weatherDescription}`;
            });
          }

          // Add weather prediction/advisory based on conditions
          botResponse += `\n\n**Weather Advisory:**\n`;
          if (weatherInfo.humidity > 80) {
            botResponse += `• High humidity expected - stay hydrated\n`;
          }
          if (weatherInfo.windSpeed > 10) {
            botResponse += `• Strong winds - secure loose outdoor items\n`;
          }
          if (weatherInfo.description?.toLowerCase().includes('rain') || weatherInfo.description?.toLowerCase().includes('thunder')) {
            botResponse += `• Precipitation likely - carry umbrella if going out\n`;
          }
          if (weatherInfo.temp > 35) {
            botResponse += `• High temperature alert - avoid outdoor activities during peak hours\n`;
          }
          if (weatherInfo.temp < 10) {
            botResponse += `• Cold conditions - dress warmly\n`;
          }

        } else {
          botResponse = `❌ Sorry, I couldn't fetch weather data for **${city}**. The location may not be available in the weather database. Please try another city.`;
        }
      } else if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi') || userMessage.toLowerCase().includes('hey')) {
        botResponse = "👋 Hello! I'm WeatherGPT, your weather intelligence assistant. I can provide:\n\n• **Real-time weather** for any city\n• **Weather forecasts** (up to 7 days)\n• **Temperature predictions**\n• **Humidity & wind conditions**\n• **Weather advisories**\n\nTry asking: *'What's the weather in Delhi?'* or *'Will it rain in Mumbai tomorrow?'*";
      } else if (userMessage.toLowerCase().includes('help') || userMessage.toLowerCase().includes('what can you')) {
        botResponse = "I'm WeatherGPT - your AI weather assistant powered by official meteorological data. I can help you with:\n\n🌤️ **Current Weather** - Real-time conditions for any city\n📊 **Forecasts** - Multi-day weather predictions\n🌡️ **Temperature** - Current and forecasted temps\n💧 **Humidity & Wind** - Atmospheric conditions\n⚠️ **Weather Alerts** - Advisories based on conditions\n\n**Try asking:**\n• *'Weather in Delhi'*\n• *'Will it rain in Mumbai?'*\n• *'Temperature in London'*\n• *'Forecast for Tokyo'*";
      } else if (userMessage.toLowerCase().includes('forecast') || userMessage.toLowerCase().includes('예측') || userMessage.toLowerCase().includes('tomorrow') || userMessage.toLowerCase().includes('week')) {
        if (city) {
          const forecast = await fetchForecastByCity(city);
          if (forecast && forecast.length > 0) {
            botResponse = `**${city} Forecast**\n\n`;
            forecast.forEach((day: { date: string; tempMax: number; tempMin: number; weatherDescription: string }, idx: number) => {
              const date = new Date(day.date);
              const dayName = idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : date.toLocaleDateString('en', { weekday: 'long' });
              botResponse += `${dayName}: ${Math.round(day.tempMax)}°C / ${Math.round(day.tempMin)}°C - ${day.weatherDescription}\n`;
            });
          } else {
            botResponse = `I couldn't retrieve the forecast for **${city}**. Please try again later.`;
          }
        } else {
          botResponse = "Please specify a city for the forecast. For example: *'Forecast for Delhi'* or *'Will it rain in Mumbai tomorrow?'*";
        }
      } else if (userMessage.toLowerCase().includes('rain') || userMessage.toLowerCase().includes('precipitation')) {
        if (city) {
          const weatherInfo = await fetchWeatherByCity(city);
          const forecast = await fetchForecastByCity(city);
          
          if (weatherInfo) {
            const isRaining = weatherInfo.description?.toLowerCase().includes('rain') || 
                             weatherInfo.description?.toLowerCase().includes('drizzle') ||
                             weatherInfo.description?.toLowerCase().includes('shower');
            
            botResponse = `**Precipitation Report for ${city}**\n\n`;
            botResponse += `Current: ${weatherInfo.description}\n`;
            botResponse += `Humidity: ${weatherInfo.humidity}%\n\n`;
            
            if (isRaining) {
              botResponse += `⚠️ **Rain is occurring now** in ${city}. Expect wet conditions.`;
            } else {
              botResponse += `No rain currently in ${city}.`;
            }
            
            if (forecast) {
              const rainyDays = forecast.filter((d: { weatherDescription?: string }) => 
                d.weatherDescription?.toLowerCase().includes('rain') ||
                d.weatherDescription?.toLowerCase().includes('drizzle') ||
                d.weatherDescription?.toLowerCase().includes('shower')
              );
              
              if (rainyDays.length > 0) {
                botResponse += `\n**Upcoming Rain:**\n`;
                rainyDays.slice(0, 2).forEach((day: { date: string; weatherDescription: string }, idx: number) => {
                  const date = new Date(day.date);
                  const dayName = idx === 0 ? 'Tomorrow' : date.toLocaleDateString('en', { weekday: 'short' });
                  botResponse += `${dayName}: ${day.weatherDescription}\n`;
                });
              } else {
                botResponse += `\nNo rain expected in the next few days.`;
              }
            }
          } else {
            botResponse = `I couldn't check rain conditions for **${city}**. Please try another location.`;
          }
        } else {
          botResponse = "Which city would you like to check for rain? For example: *'Is it raining in Delhi?'* or *'Will it rain in Mumbai tomorrow?'*";
        }
      } else if (userMessage.toLowerCase().includes('temperature') || userMessage.toLowerCase().includes('hot') || userMessage.toLowerCase().includes('cold')) {
        if (city) {
          const weatherInfo = await fetchWeatherByCity(city);
          if (weatherInfo) {
            botResponse = `**Temperature in ${city}**\n\n`;
            botResponse += `Current: **${Math.round(weatherInfo.temp)}°C**\n`;
            botResponse += `Feels like: ${Math.round(weatherInfo.apparentTemp || weatherInfo.temp)}°C\n`;
            botResponse += `Description: ${weatherInfo.description}\n\n`;
            
            if (weatherInfo.temp > 30) {
              botResponse += `🔥 It's quite hot in ${city} today. Stay hydrated and avoid prolonged sun exposure.`;
            } else if (weatherInfo.temp > 20) {
              botResponse += `☀️ Pleasant weather in ${city}. Good conditions for outdoor activities.`;
            } else if (weatherInfo.temp > 10) {
              botResponse += `🌤️ Cool weather in ${city}. A light jacket may be needed.`;
            } else {
              botResponse += `🥶 Cold conditions in ${city}. Dress warmly if going outside.`;
            }
          } else {
            botResponse = `I couldn't get temperature data for **${city}**. Please try another city.`;
          }
        } else {
          botResponse = "Which city's temperature would you like to know? For example: *'Temperature in Delhi'*";
        }
      } else {
        botResponse = "I can help you with weather information! Try asking about:\n\n• **Current weather** - *'Weather in Delhi'*\n• **Forecast** - *'Forecast for Mumbai'*\n• **Rain check** - *'Is it raining in London?'*\n• **Temperature** - *'Temperature in Tokyo'*\n\nJust mention a city name!";
      }

      const introMsg: { id: string; role: MessageRole; content: string } = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: botResponse,
      };
      setMessages(prev => [...prev, introMsg]);
    } catch (error) {
      console.error('Error:', error);
      const errMsg: { id: string; role: MessageRole; content: string } = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: '⚠️ Unable to fetch weather data right now. Please try again later.',
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  const extractCity = (text: string): string | null => {
    const pattern = /(?:in|at|for|of)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/;
    const match = text.match(pattern);
    if (match && match[1]) return match[1].trim();
    return null;
  };

  const detectWeatherIntent = (text: string): string | null => {
    const lower = text.toLowerCase();
    if (lower.includes('weather') || lower.includes('temperature') || lower.includes('forecast')) {
      const cityMatch = text.match(/(?:in|at|for|of)\s+([A-Z][a-zA-Z\s]+)/i);
      if (cityMatch) return cityMatch[1].trim();
    }
    return null;
  };

  const fetchWeatherByCity = async (city: string) => {
    try {
      const res = await fetch(`http://localhost:8080/api/weather/current?location=${encodeURIComponent(city)}`);
      const data = await res.json();
      if (data.success && data.data) {
        const apiData = data.data as any;
        return {
          name: apiData.location.name,
          country: apiData.location.country,
          temp: apiData.temperature,
          apparentTemp: apiData.apparentTemperature,
          humidity: apiData.humidity,
          windSpeed: apiData.windSpeed,
          description: apiData.weatherDescription,
          cloudCover: apiData.cloudCover || 0,
          visibility: apiData.visibility,
        };
      }
    } catch (error) {
      console.error('Weather fetch error:', error);
    }
    return null;
  };

  const fetchForecastByCity = async (city: string) => {
    try {
      const res = await fetch(`http://localhost:8080/api/weather/forecast?location=${encodeURIComponent(city)}&days=7`);
      const data = await res.json();
      if (data.success && data.data) {
        return (data.data as any).days.map((day: any) => ({
          date: day.date,
          tempMax: day.tempMax,
          tempMin: day.tempMin,
          weatherDescription: day.weatherDescription,
          precipitation: day.precipitationSum || 0,
          humidity: day.humidityMax || 0,
        }));
      }
    } catch (error) {
      console.error('Forecast fetch error:', error);
    }
    return null;
  };

  const quickActions = [
    { label: '📍 My Location', action: '' },
    { label: '🌤️ Delhi', action: 'Weather in Delhi' },
    { label: '🌧️ Mumbai', action: 'Is it raining in Mumbai?' },
    { label: '❄️ London', action: 'Temperature in London' },
  ];

  // Mobile view: show mobile chat
  if (typeof window !== 'undefined' && window.innerWidth <= 768) {
    return (
      <MobileWeatherGPT />
    );
  }

  // Desktop view: clean conversational interface
  return (
    <div className="simple-weathergpt">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Sparkles size={24} />
        </div>
        <nav className="sidebar-nav">
          <button
            className={`sidebar-item ${activeNav === 'weather' ? 'active' : ''}`}
            onClick={() => setActiveNav('weather')}
            title="Nowcasting"
          >
            <Radar size={20} />
          </button>
          <button
            className={`sidebar-item ${activeNav === 'forecast' ? 'active' : ''}`}
            onClick={() => setActiveNav('forecast')}
            title="7-Day Forecast"
          >
            <BarChart3 size={20} />
          </button>
          <button
            className={`sidebar-item ${activeNav === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveNav('alerts')}
            title="Alerts"
          >
            <Bell size={20} />
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button className="sidebar-exit" title="Settings">
            <Settings size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="simple-header">
          <div className="header-logo">
            <div className="logo-icon">
              <Sparkles size={22} />
            </div>
            <div className="logo-text">
              <h1>WeatherGPT</h1>
              <p className="logo-subtitle">AI-Powered Weather Intelligence</p>
            </div>
          </div>
          <div className="header-controls">
            <div className="header-quick-actions">
              <button className="quick-action-btn" title="Add Location">
                <MapPin size={16} />
              </button>
              <button className="quick-action-btn" title="Search">
                <Search size={16} />
              </button>
              <button className="quick-action-btn" title="Notifications">
                <Bell size={16} />
              </button>
            </div>
            <button
              className={`voice-toggle ${voiceEnabled ? 'active' : ''}`}
              onClick={toggleVoice}
              disabled={!sttSupported}
            >
              {voiceEnabled ? (
                <>
                  <Mic size={18} />
                  <span>Stop Voice</span>
                </>
              ) : (
                <>
                  <Mic size={18} />
                  <span>Voice</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Current Weather Card (if available) */}
        {currentWeather && (
          <div className="weather-card-simple">
            <div className="weather-card-header">
              <MapPin size={16} />
              <span>{currentWeather.city}</span>
            </div>
            <div className="weather-card-main">
              <span className="weather-temp">{Math.round(currentWeather.temp)}°C</span>
              <span className="weather-desc">{currentWeather.description}</span>
            </div>
            <div className="weather-card-metrics">
              <div className="metric">
                <Thermometer size={14} />
                <span>{currentWeather.temp}°C (feels {Math.round(currentWeather.apparentTemp)}°C)</span>
              </div>
              <div className="metric">
                <Droplets size={14} />
                <span>{currentWeather.humidity}% humidity</span>
              </div>
              <div className="metric">
                <Wind size={14} />
                <span>{currentWeather.wind} m/s wind</span>
              </div>
              <div className="metric">
                <Cloud size={14} />
                <span>{currentWeather.cloudCover}% cloud</span>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="simple-chat">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="message-bubble">
                {msg.content.split('\n').map((line, idx) => (
                  <p key={idx} className={line.startsWith('**') ? 'message-bold' : ''}>
                    {line.replace(/\*\*/g, '')}
                  </p>
                ))}
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

        {/* Quick Actions */}
        {messages.length <= 1 && (
          <div className="quick-actions">
            <p>Try asking or click a button:</p>
            <div className="quick-actions-grid">
              {quickActions.map((qa, idx) => (
                <button
                  key={idx}
                  className={`quick-btn ${qa.action === '' ? 'primary' : 'secondary'}`}
                  onClick={() => {
                    if (qa.action === '') {
                      // TODO: implement geolocation
                    } else {
                      setInput(qa.action);
                      inputRef.current?.focus();
                    }
                  }}
                >
                  {qa.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Voice Status */}
        {voiceEnabled && (
          <div className={`voice-status ${voiceStatus}`}>
            <span className="voice-dot"></span>
            {voiceStatus === 'listening' && 'Listening...'}
            {voiceStatus === 'processing' && 'Processing...'}
            {voiceStatus === 'error' && voiceError}
          </div>
        )}

        {/* Input Area */}
        <div className="input-area">
          <div className="input-container">
            <input
              ref={inputRef}
              type="text"
              placeholder={voiceEnabled ? 'Speak your question…' : "Ask about weather... (e.g., 'What's the weather in Delhi?')"}
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
              className="mic-btn"
              onClick={toggleVoice}
              disabled={!sttSupported}
            >
              <Mic size={20} />
            </button>
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
            >
              <Send size={18} />
            </button>
          </div>
          <p className="input-hint">
            {voiceEnabled
              ? '🎤 Voice active — speak, then send'
              : 'Press Enter to send • Ask about any city'}
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="simple-footer">
        <p>Powered by Open-Meteo API • Built with React</p>
      </footer>

      {/* Mobile Toggle */}
      <MobileChatToggle isOpen={mobileChatOpen} onClose={() => setMobileChatOpen(false)} />
    </div>
  );
}
