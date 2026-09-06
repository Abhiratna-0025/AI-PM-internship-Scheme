import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Badge } from './components/ui/badge';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import './App.css';

type Message = {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
};

type WeatherInfo = {
  name: string;
  country: string;
  state?: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDeg: number;
  description: string;
  icon: string;
  visibility: number;
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'bot',
      content: '👋 Hello! I\'m WeatherGPT, your AI-powered weather assistant. Ask me about weather in any city, or click below to get weather for your current location!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'unknown' | 'checking' | 'granted' | 'denied'>('unknown');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const detectWeatherIntent = (text: string): string | null => {
    const lower = text.toLowerCase();
    if (lower.includes('weather') || lower.includes('temperature') || lower.includes('forecast') || lower.includes('rain') || lower.includes('sun') || lower.includes('cold') || lower.includes('hot') || lower.includes('humid') || lower.includes('climate')) {
      const cityMatch = text.match(/(?:in|at|for|of)\s+([A-Z][a-zA-Z\s]+)/i);
      if (cityMatch) return cityMatch[1].trim();
      if (lower.includes('here')) return 'current location';
      return null;
    }
    return null;
  };

  const extractCity = (text: string): string | null => {
    const pattern1 = /(?:in|at|for|of)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/;
    const match1 = text.match(pattern1);
    if (match1 && match1[1]) {
      return match1[1].trim();
    }

    const pattern2 = /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:weather|temperature|forecast|climate|conditions)/;
    const match2 = text.match(pattern2);
    if (match2 && match2[1]) {
      return match2[1].trim();
    }

    const pattern3 = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/;
    const match3 = text.match(pattern3);
    if (match3 && match3[1]) {
      const city = match3[1].trim();
      const skipWords = ['Will', 'What', 'How', 'Is', 'Can', 'The', 'This', 'That', 'Here', 'Today', 'Tomorrow', 'Yesterday', 'By', 'In', 'At', 'For', 'Help', 'Hello', 'Hi', 'Hey', 'Give', 'Me', 'Do', 'Does', 'Are', 'There'];
      if (!skipWords.includes(city)) {
        return city;
      }
    }

    return null;
  };

  const getWeatherIcon = (icon: string) => {
    const iconMap: Record<string, string> = {
      '01d': '☀️', '01n': '🌙',
      '02d': '⛅', '02n': '☁️',
      '03d': '☁️', '03n': '☁️',
      '04d': '☁️', '04n': '☁️',
      '09d': '🌧️', '09n': '🌧️',
      '10d': '🌦️', '10n': '🌧️',
      '11d': '⛈️', '11n': '⛈️',
      '13d': '❄️', '13n': '❄️',
      '50d': '🌫️', '50n': '🌫️',
    };
    return iconMap[icon] || '🌤️';
  };

  const fetchWeatherByLocation = async (lat: number, lon: number) => {
    try {
      const res = await fetch(`http://localhost:8080/api/weather/current?lat=${lat}&lon=${lon}`);
      const data = await res.json();
      if (data.success && data.data) {
        const apiData = data.data as any;
        return {
          name: apiData.location?.name || 'Unknown',
          country: apiData.location?.country || 'Unknown',
          state: apiData.location?.admin1 || undefined,
          temp: apiData.temperature,
          feelsLike: apiData.apparentTemperature,
          humidity: apiData.humidity,
          windSpeed: apiData.windSpeed,
          windDeg: apiData.windDirection,
          description: apiData.weatherDescription,
          icon: getWeatherIcon(apiData.weatherCode),
          visibility: apiData.visibility,
        };
      }
    } catch (error) {
      console.error('Weather fetch error:', error);
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
          state: apiData.location.admin1 || undefined,
          temp: apiData.temperature,
          feelsLike: apiData.apparentTemperature,
          humidity: apiData.humidity,
          windSpeed: apiData.windSpeed,
          windDeg: apiData.windDirection,
          description: apiData.weatherDescription,
          icon: getWeatherIcon(apiData.weatherCode),
          visibility: apiData.visibility,
        };
      }
    } catch (error) {
      console.error('Weather fetch error:', error);
    }
    return null;
  };

  const fetchForecast = async (city: string) => {
    try {
      const res = await fetch(`http://localhost:8080/api/weather/forecast?location=${encodeURIComponent(city)}&days=3`);
      const data = await res.json();
      if (data.success && data.data) {
        return (data.data as any).days.map((day: any) => ({
          date: day.date,
          tempMax: day.tempMax,
          tempMin: day.tempMin,
          description: day.weatherDescription,
        }));
      }
    } catch (error) {
      console.error('Forecast fetch error:', error);
    }
    return null;
  };

  const generateTips = (weather: WeatherInfo): string => {
    const tips: string[] = [];

    if (weather.humidity >= 80) {
      tips.push(' 💧 High humidity today — stay hydrated and consider a light, breathable outfit.');
    } else if (weather.humidity < 30) {
      tips.push(' 💨 Low humidity — the air is dry, so keep some water handy and use lip balm or moisturizer if needed.');
    }

    if (weather.windSpeed >= 8) {
      tips.push(' 💨 Strong winds expected — secure loose outdoor items and be careful with umbrellas.');
    } else if (weather.windSpeed >= 5) {
      tips.push(' 🌬️ Breezy conditions — a wind-resistant jacket could come in handy.');
    }

    if (weather.feelsLike > weather.temp + 3) {
      tips.push(' 🌡️ It feels hotter than the actual temperature — light clothing and shade breaks are recommended.');
    } else if (weather.feelsLike < weather.temp - 3) {
      tips.push(' 🥶 It feels colder than the thermometer reads — layer up if you are heading out.');
    }

    if (weather.description.toLowerCase().includes('rain') || weather.description.toLowerCase().includes('drizzle') || weather.description.toLowerCase().includes('shower')) {
      tips.push(' ☔ Carry an umbrella or a raincoat — you might get wet between buildings or while commuting.');
    }
    if (weather.description.toLowerCase().includes('thunder')) {
      tips.push(' ⛈️ Thunderstorm activity possible — avoid open fields and tall isolated trees if outdoors.');
    }
    if (weather.description.toLowerCase().includes('snow') || weather.description.toLowerCase().includes('ice')) {
      tips.push(' ❄️ Slippery surfaces likely — drive or walk carefully and use appropriate footwear.');
    }

    if (weather.visibility < 2000) {
      tips.push(' 👁️ Visibility is quite low — take extra caution while driving or crossing roads.');
    }

    if (weather.temp > 35) {
      tips.push(' 🔥 Very hot day — limit outdoor activity during peak hours (11 AM–3 PM) and drink plenty of water.');
    } else if (weather.temp > 30) {
      tips.push(' ☀️ Warm day ahead — stay in the shade when possible and keep up your water intake.');
    } else if (weather.temp < 10) {
      tips.push(' 🧥 Chilly weather — a warm jacket, scarf, and gloves will make being outside more comfortable.');
    } else if (weather.temp < 15) {
      tips.push(' 🍂 Cool day — a light jacket or sweater should be enough for most outdoor plans.');
    }

    if (tips.length === 0) {
      tips.push(' 🌤️ Pleasant conditions — a great day for a walk, outdoor plans, or just enjoying the weather!');
    }

    return tips.slice(0, 3).join('');
  };

  const generateForecastText = (forecast: { date: string; tempMax: number; tempMin: number; description: string }[]): string => {
    if (!forecast || forecast.length === 0) return '';

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const lines: string[] = [];

    forecast.forEach((day, idx) => {
      const dateObj = new Date(day.date);
      const dayName = dayNames[dateObj.getDay()];
      const tempRange = `${Math.round(day.tempMin)}°–${Math.round(day.tempMax)}°C`;
      let summary = '';

      const desc = day.description.toLowerCase();

      if (desc.includes('rain') || desc.includes('drizzle') || desc.includes('shower')) {
        summary = 'with rain';
        if (desc.includes('thunder')) summary = 'with thunderstorms';
        else if (desc.includes('heavy')) summary = 'with heavy rain';
      } else if (desc.includes('cloud')) {
        summary = 'cloudy';
      } else if (desc.includes('sun') || desc.includes('clear')) {
        summary = 'sunny and clear';
      } else if (desc.includes('fog') || desc.includes('mist')) {
        summary = 'foggy with reduced visibility';
      } else if (desc.includes('snow') || desc.includes('ice')) {
        summary = 'snowy';
      } else {
        summary = desc;
      }

      const trend = day.tempMax > 30 ? 'hot' : day.tempMax > 25 ? 'warm' : day.tempMax > 15 ? 'mild' : 'cool';
      const feel = day.tempMax - day.tempMin > 10 ? ' with a big day-night swing' : '';

      lines.push(
        `${idx === 0 ? 'Today' : dayName}, ${dateObj.toLocaleDateString('en', { month: 'short', day: 'numeric' })}: ` +
        `${summary}, ${tempRange}, ${trend} conditions${feel}.`
      );
    });

    return lines.join('\n');
  };

  const getUserLocation = useCallback(async () => {
    setLocationStatus('checking');
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      const msg: Message = {
        id: Date.now().toString(),
        role: 'bot',
        content: '⚠️ Geolocation is not supported by your browser. Please enter a city name manually.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, msg]);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        setLocationStatus('granted');

        const weather = await fetchWeatherByLocation(latitude, longitude);
        if (weather) {
          const card = `
            <div class="weather-card">
              <div class="weather-main">
                <div class="weather-location"><h3>${weather.name}${weather.state ? ', ' + weather.state : ''}, ${weather.country}</h3></div>
                <div class="weather-temp-row"><span class="weather-icon">${weather.icon}</span><span class="weather-temp">${Math.round(weather.temp)}°C</span></div>
                <p class="weather-desc">${weather.description}</p>
              </div>
              <div class="weather-details">
                <div class="detail"><span class="detail-icon">🌡️</span><span>Feels like ${Math.round(weather.feelsLike)}°C</span></div>
                <div class="detail"><span class="detail-icon">💧</span><span>Humidity: ${weather.humidity}%</span></div>
                <div class="detail"><span class="detail-icon">💨</span><span>Wind: ${weather.windSpeed} m/s</span></div>
                <div class="detail"><span class="detail-icon">👁️</span><span>Visibility: ${(weather.visibility / 1000).toFixed(1)} km</span></div>
              </div>
            </div>
          `;
          const msg1: Message = {
            id: Date.now().toString(),
            role: 'bot',
            content: `📍 **Location detected:** ${weather.name}, ${weather.country}${weather.state ? ', ' + weather.state : ''}\n\n`,
            timestamp: new Date(),
          };
          const msg2: Message = {
            id: (Date.now() + 1).toString(),
            role: 'bot',
            content: card,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, msg1, msg2]);
        }
      },
      async (error) => {
        console.error('Geolocation error:', error);
        setLocationStatus('denied');
        const msg1: Message = {
          id: Date.now().toString(),
          role: 'bot',
          content: '📍 Location access was denied. Showing weather for a default location. You can ask for any city!',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, msg1]);
        const weather = await fetchWeatherByCity('Delhi');
        if (weather) {
          const card = `
            <div class="weather-card">
              <div class="weather-main">
                <div class="weather-location"><h3>${weather.name}, ${weather.country}</h3></div>
                <div class="weather-temp-row"><span class="weather-icon">${weather.icon}</span><span class="weather-temp">${Math.round(weather.temp)}°C</span></div>
                <p class="weather-desc">${weather.description}</p>
              </div>
              <div class="weather-details">
                <div class="detail"><span class="detail-icon">🌡️</span><span>Feels like ${Math.round(weather.feelsLike)}°C</span></div>
                <div class="detail"><span class="detail-icon">💧</span><span>Humidity: ${weather.humidity}%</span></div>
                <div class="detail"><span class="detail-icon">💨</span><span>Wind: ${weather.windSpeed} m/s</span></div>
                <div class="detail"><span class="detail-icon">👁️</span><span>Visibility: ${(weather.visibility / 1000).toFixed(1)} km</span></div>
              </div>
            </div>
          `;
          const msg2: Message = {
            id: (Date.now() + 1).toString(),
            role: 'bot',
            content: card,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, msg2]);
        }
      }
    );
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      let botResponse = '';
      let weatherInfo: WeatherInfo | null = null;
      let forecastInfo: { date: string; tempMax: number; tempMin: number; description: string }[] | null = null;

      const city = extractCity(userMessage) || detectWeatherIntent(userMessage);

      if (userMessage.toLowerCase().includes('my location') || userMessage.toLowerCase().includes('current location') || userMessage.toLowerCase().includes('where i am')) {
        if (userLocation) {
          weatherInfo = await fetchWeatherByLocation(userLocation.latitude, userLocation.longitude);
          if (weatherInfo) forecastInfo = await fetchForecast(weatherInfo.name);
          botResponse = `📍 Here's the weather for your **current location** in ${weatherInfo?.name || 'your area'}:`;
          const locTips = weatherInfo ? generateTips(weatherInfo) : '';
          const locForecast = (weatherInfo && forecastInfo) ? generateForecastText(forecastInfo) : '';
          let locFull = botResponse;
          if (locTips) locFull += '\n\n' + locTips;
          if (locForecast) locFull += '\n\n**3-day outlook:**\n' + locForecast;
          botResponse = locFull;
        } else {
          botResponse = '📍 Let me detect your location first...';
          getUserLocation();
          setIsLoading(false);
          return;
        }
      } else if (city) {
        weatherInfo = await fetchWeatherByCity(city);
        if (weatherInfo) forecastInfo = await fetchForecast(weatherInfo.name);
        if (weatherInfo) {
          botResponse = `Here's the weather for **${weatherInfo.name}${weatherInfo.state ? ', ' + weatherInfo.state : ''}, ${weatherInfo.country}**:`;
        } else {
          botResponse = `❌ Sorry, I couldn't find weather data for **${city}**. Please check the city name and try again.`;
        }
      } else {
        const greetings = [
          "I'm here to help with weather information! 🌤️",
          "Try asking me about the weather in a specific city!",
          "I can tell you the temperature, forecast, and more!",
          "What city would you like to know about?",
        ];
        botResponse = greetings[Math.floor(Math.random() * greetings.length)];

        if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi') || userMessage.toLowerCase().includes('hey')) {
          botResponse = "Hello! 👋 I'm WeatherGPT. Ask me about weather in any city! For example: *'What's the weather in Delhi?'* or click the button below to get weather for your **current location**.";
        } else if (userMessage.toLowerCase().includes('help')) {
          botResponse = "I can help you with:\n\n🌤️ Current weather conditions\n📊 3-day forecasts\n🌡️ Temperature & feels like\n💧 Humidity & wind info\n📍 Your current location weather\n\nJust ask me about any city! For example: *'Weather in London'* or click the 👇 button below.";
        } else if (userMessage.toLowerCase().includes('thank')) {
          botResponse = "You're welcome! 😊 Feel free to ask anytime about weather. Stay informed! 🌤️";
        } else if (userMessage.toLowerCase().includes('current') || userMessage.toLowerCase().includes('here')) {
          getUserLocation();
          setIsLoading(false);
          return;
        }
      }

      if (weatherInfo && !botResponse.includes('**')) {
        botResponse = `Here's the weather for **${weatherInfo.name}${weatherInfo.state ? ', ' + weatherInfo.state : ''}, ${weatherInfo.country}**:`;
      }

      const tips = weatherInfo ? generateTips(weatherInfo) : '';
      const forecastText = (weatherInfo && forecastInfo) ? generateForecastText(forecastInfo) : '';

      let fullResponse = botResponse;
      if (tips) fullResponse += '\n\n' + tips;
      if (forecastText) fullResponse += '\n\n**3-day outlook:**\n' + forecastText;

      const introMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: fullResponse,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, introMsg]);

      if (weatherInfo) {
        setTimeout(() => {
          const card = `
            <div class="weather-card">
              <div class="weather-main">
                <div class="weather-location"><h3>${weatherInfo.name}${weatherInfo.state ? ', ' + weatherInfo.state : ''}, ${weatherInfo.country}</h3></div>
                <div class="weather-temp-row"><span class="weather-icon">${weatherInfo.icon}</span><span class="weather-temp">${Math.round(weatherInfo.temp)}°C</span></div>
                <p class="weather-desc">${weatherInfo.description}</p>
              </div>
              <div class="weather-details">
                <div class="detail"><span class="detail-icon">🌡️</span><span>Feels like ${Math.round(weatherInfo.feelsLike)}°C</span></div>
                <div class="detail"><span class="detail-icon">💧</span><span>Humidity: ${weatherInfo.humidity}%</span></div>
                <div class="detail"><span class="detail-icon">💨</span><span>Wind: ${weatherInfo.windSpeed} m/s</span></div>
                <div class="detail"><span class="detail-icon">👁️</span><span>Visibility: ${(weatherInfo.visibility / 1000).toFixed(1)} km</span></div>
              </div>
              ${forecastInfo && forecastInfo.length > 0 ? `
                <div class="forecast-section">
                  <h4>3-DAY FORECAST</h4>
                  <div class="forecast-grid">
                    ${forecastInfo.map(day => `
                      <div class="forecast-day">
                        <span class="forecast-date">${new Date(day.date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        <span class="forecast-temp">${Math.round(day.tempMax)}° / ${Math.round(day.tempMin)}°</span>
                        <span class="forecast-desc">${day.description}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          `;
          const cardMsg: Message = {
            id: (Date.now() + 2).toString(),
            role: 'bot',
            content: card,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, cardMsg]);
        }, 100);
      }
    } catch (error) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: '⚠️ Oops! Something went wrong. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, userLocation]);

  const quickActions = [
    { label: '📍 My Location', action: '' },
    { label: '🌤️ Delhi', action: 'Weather in Delhi' },
    { label: '🌧️ Mumbai', action: 'Is it raining in Mumbai?' },
    { label: '❄️ London', action: 'Temperature in London' },
    { label: '☀️ Tokyo', action: 'Forecast for Tokyo' },
  ];

  return (
    <div className="chatbot-app">
      <header className="chatbot-header">
        <div className="chatbot-logo">
          <Avatar className="logo-avatar">
            <AvatarFallback className="logo-fallback">🌤️</AvatarFallback>
          </Avatar>
          <div className="logo-text">
            <h1>WeatherGPT</h1>
            <p>AI-Powered Weather Intelligence</p>
          </div>
        </div>
        <div className="header-actions">
          <Button
            variant="outline"
            size="sm"
            onClick={getUserLocation}
            disabled={locationStatus === 'checking'}
            className="locate-btn"
          >
            {locationStatus === 'checking' ? '⏳ Detecting...' : locationStatus === 'granted' ? '✓ Located' : '📍 My Location'}
          </Button>
          <Badge variant="secondary" className="status-badge">● Online</Badge>
        </div>
      </header>

      <main className="chatbot-main">
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <Avatar className="message-avatar">
                <AvatarFallback>{msg.role === 'bot' ? '🌤️' : '👤'}</AvatarFallback>
              </Avatar>
              <div className="message-content">
                {msg.role === 'bot' ? (
                  <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                ) : (
                  <p>{msg.content}</p>
                )}
                <span className="message-time">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message bot typing">
              <Avatar className="message-avatar">
                <AvatarFallback>🌤️</AvatarFallback>
              </Avatar>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length <= 1 && (
          <div className="quick-actions">
            <p className="quick-actions-title">Try asking me or click a button:</p>
            <div className="quick-actions-grid">
              {quickActions.map((qa, idx) => (
                <Button
                  key={idx}
                  variant={qa.action === '' ? 'default' : 'outline'}
                  className={qa.action === '' ? 'locate-quick-btn' : 'quick-action-btn'}
                  onClick={() => {
                    if (qa.action === '') {
                      getUserLocation();
                    } else {
                      setInput(qa.action);
                      inputRef.current?.focus();
                    }
                  }}
                >
                  {qa.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="chat-input-area">
          <div className="chat-input-container">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Ask about weather... (e.g., 'What's the weather in Delhi?')"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="chat-input"
            />
            <Button onClick={handleSend} disabled={!input.trim() || isLoading} className="send-btn">
              {isLoading ? '...' : 'Send'}
            </Button>
          </div>
          <div className="input-hint">
            Press Enter to send • Ask about any city or click 📍 for your location
          </div>
        </div>
      </main>

      <footer className="chatbot-footer">
        <p>Powered by OpenWeatherMap API • Built with React & shadcn/ui</p>
      </footer>
    </div>
  );
}
