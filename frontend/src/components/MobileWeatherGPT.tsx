import { useState, useRef, useEffect } from 'react';
import { 
  Sparkles,
  X,
  Send,
  Volume2,
} from 'lucide-react';
import { useVoiceOutput } from '../hooks/useVoiceOutput';
import './MobileWeatherGPT.css';

interface ChatMessage {
  id: string;
  role: 'bot' | 'user';
  content: string;
  timestamp: Date;
}

export default function MobileWeatherGPT() {
  const { speak } = useVoiceOutput();
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'bot',
      content: '👋 Hello! I\'m WeatherGPT, your AI-powered weather assistant. Ask me about weather in any city!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Simulate bot response
    setTimeout(() => {
      const botResponse = generateResponse(userMessage);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: botResponse,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
      setIsLoading(false);
    }, 1000);
  };

  const speakMessage = () => {
    // In a real implementation, this would call the TTS service
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance('WeatherGPT synthesis ready');
      utterance.lang = 'en-IN';
      window.speechSynthesis.speak(utterance);
    }
  };

  const generateResponse = (userMessage: string): string => {
    const lower = userMessage.toLowerCase();
    
    if (lower.includes('rain') || lower.includes('potato') || lower.includes('sowing')) {
      return `**WeatherGPT Synthesis**

Direct Summary: Severe convective precipitation (32 mm/hr peak) will strike Greater Noida between 11:30 PM and 03:00 AM IST.

**SECTOR ACTION: POSTPONE SOWING**

Soil moisture index will exceed field capacity (94%), inducing seed rotting risk. Sowing should be deferred to Wednesday morning.

*Consensus: GFS+WRF 94% • INSAT Doppler Active*`;
    }
    
    if (lower.includes('weather') || lower.includes('temperature')) {
      return `Here's the current weather information:

🌡️ Temperature: 29°C
💧 Humidity: 78%
💨 Wind: 19 km/h NE
☁️ Conditions: Heavy rain with thunderstorms

Stay safe and hydrated!`;
    }
    
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      return 'Hello! 👋 I am WeatherGPT, your synoptic intelligence assistant. How can I help you with weather operations today?';
    }
    
    return 'I am WeatherGPT, synced with real-time INSAT-3D Doppler telemetry and the IMD Multi-Model Ensemble (MME). Please ask me about weather conditions, forecasts, or sector advisories.';
  };

  const isMobile = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  };

  useEffect(() => {
    if (!isMobile()) {
      setMessages([]);
    } else {
      if (messages.length === 0) {
        setMessages([{
          id: '1',
          role: 'bot',
          content: 'Greetings, Argonauts Command. I am WeatherGPT, synced with real-time INSAT-3D Doppler telemetry and the IMD Multi-Model Ensemble (MME). How can I assist your synoptic or sector operations?',
          timestamp: new Date(),
        }]);
      }
    }
  }, []);

  if (!isMobile() || messages.length === 0) {
    return null;
  }

  return (
    <div className="mobile-weathergpt-container">
      <div className="mobile-chat-window">
        {/* Top Bar */}
        <div className="mobile-chat-header">
          <div className="mobile-header-left">
            <div className="mobile-profile-icon">
              <Sparkles size={18} />
            </div>
            <div className="mobile-header-title">
              <h1 className="mobile-title">WeatherGPT Intelligence</h1>
              <p className="mobile-subtitle">
                <span className="status-dot"></span>
                MoES Multi-Model Ensemble • Latency: 182ms
              </p>
            </div>
          </div>
          <button className="mobile-close-btn" onClick={() => window.location.href = '/'}>
            <X size={20} />
          </button>
        </div>

        {/* Chat Body */}
        <div className="mobile-chat-body">
          {messages.map((msg) => (
            <div key={msg.id} className={`mobile-message ${msg.role}`}>              {msg.role === 'bot' ? (
                <div className="bot-message-container">
                  <div className="bot-message-content">
                    {msg.content.split('\n\n').map((paragraph, idx) => (
                      <div key={idx} className={paragraph.startsWith('**') ? 'bot-message-section' : ''}>
                        {paragraph.replace(/\*\*/g, '')}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="user-message-container">
                  <div className="user-message-label">Command In Charge</div>
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

        {/* Input Bar */}
        <div className="mobile-input-bar">
          <input
            ref={inputRef}
            type="text"
            className="mobile-input-field"
            placeholder="Type prompt or command..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button 
            className="mobile-send-btn" 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
