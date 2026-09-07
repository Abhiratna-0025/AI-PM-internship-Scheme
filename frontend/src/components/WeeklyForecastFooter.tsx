import './WeeklyForecastFooter.css';
import { Sun, CloudSun, CloudRain, CloudLightning, Cloud, CloudDrizzle } from 'lucide-react';

export interface DayForecast {
  label: string;      // 'Sun', 'Mon', ...
  high: number;
  low?: number;
  icon: 'sun' | 'cloud-sun' | 'rain' | 'storm' | 'cloud' | 'drizzle';
  description?: string;
}

const ICONS = {
  sun: Sun,
  'cloud-sun': CloudSun,
  rain: CloudRain,
  storm: CloudLightning,
  cloud: Cloud,
  drizzle: CloudDrizzle,
};

interface WeeklyForecastFooterProps {
  days: DayForecast[];
  cityName?: string;
  activeIndex?: number; // which day is "today" / highlighted
  onDaySelect?: (index: number) => void;
}

/**
 * A footer strip showing a 6-7 day outlook as a connected spline curve,
 * meant to sit directly below the chat input box.
 */
export default function WeeklyForecastFooter({ 
  days, 
  cityName,
  activeIndex = 0,
  onDaySelect 
}: WeeklyForecastFooterProps) {
  if (!days || days.length === 0) return null;

  const width = 1200;
  const height = 55;
  const padX = 40;
  const step = days.length > 1 ? (width - padX * 2) / (days.length - 1) : 0;
  const highs = days.map(d => d.high);
  const min = Math.min(...highs);
  const max = Math.max(...highs);
  const range = Math.max(max - min, 1);

  const points = days.map((d, i) => {
    const x = padX + i * step;
    const y = height - 10 - ((d.high - min) / range) * (height - 22);
    return { x, y };
  });

  // Smooth spline path via simple cubic bezier through points
  const path = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  // Gradient area fill under the curve
  const areaPath = points.length > 0 
    ? `${path} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z` 
    : '';

  return (
    <footer className="weekly-forecast-footer" aria-label="Weekly Weather Forecast">
      <div className="wff-header">
        <div className="wff-header-left">
          <span className="wff-badge">7-Day Forecast</span>
          <span className="wff-title">Temperature & Weather Outlook</span>
        </div>
        {cityName && (
          <span className="wff-city">📍 {cityName}</span>
        )}
      </div>

      <div className="wff-curve-layer">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="wff-svg">
          <defs>
            <linearGradient id="wffCurveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {areaPath && <path d={areaPath} fill="url(#wffCurveGradient)" />}
          <path d={path} className="wff-path" fill="none" />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === activeIndex ? 5.5 : 3.5}
              className={i === activeIndex ? 'wff-node wff-node-active' : 'wff-node'}
            />
          ))}
        </svg>
      </div>

      <div className="wff-days">
        {days.map((d, i) => {
          const Icon = ICONS[d.icon] || Cloud;
          const active = i === activeIndex;
          return (
            <button
              type="button"
              key={d.label + '-' + i}
              className={`wff-day ${active ? 'wff-day-active' : ''}`}
              onClick={() => onDaySelect?.(i)}
              title={`${d.label}: ${d.high}°C ${d.description || ''}`}
            >
              <Icon size={16} className="wff-icon" />
              <span className="wff-temp">{d.high}°</span>
              <span className="wff-label">{d.label}</span>
              {active && <div className="wff-underline" />}
            </button>
          );
        })}
      </div>
    </footer>
  );
}
