import { Sparkles } from 'lucide-react';
import './MobileChatToggle.css';

interface MobileChatToggleProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileChatToggle({ isOpen, onClose }: MobileChatToggleProps) {
  if (typeof window === 'undefined') return null;
  if (window.innerWidth > 768) return null;

  return (
    <button className={`mobile-chat-toggle ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <Sparkles size={16} />
      <span className="toggle-label">WeatherGPT</span>
    </button>
  );
}
