import { useId, useState } from 'react';
import './WeeklyForecastFooter.css';
import { Sun, CloudSun, CloudRain, CloudLightning, Cloud, CloudDrizzle } from 'lucide-react';

export interface DayForecast {
  label: string;
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

const ICON_COLOR: Record<DayForecast['icon'], string> = {
  sun: '#FCD34D',
  'cloud-sun': '#FDE68A',
  rain: '#99F6E4',
  drizzle: '#99F6E4',
  storm: '#A5F3FC',
  cloud: '#E2E8F0',
};

interface WeeklyForecastFooterProps {
  days: DayForecast[];
  cityName?: string;
  activeIndex?: number;
  onDaySelect?: (index: number) => void;
}

export function mapWeatherIcon(description?: string): DayForecast['icon'] {
  const d = (description || '').toLowerCase();
  if (d.includes('thunder') || d.includes('storm')) return 'storm';
  if (d.includes('drizzle')) return 'drizzle';
  if (d.includes('rain') || d.includes('shower')) return 'rain';
  if (d.includes('overcast')) return 'cloud';
  if (d.includes('partly') || d.includes('mainly') || (d.includes('cloud') && d.includes('sun'))) return 'cloud-sun';
  if (d.includes('cloud') || d.includes('fog') || d.includes('mist')) return 'cloud';
  return 'sun';
}

export function toWeeklyDays(days: Array<{
  date?: string;
  tempMax?: number;
  temperatureMax?: number;
  weatherDescription?: string;
  description?: string;
}>): DayForecast[] {
  return days.slice(0, 6).map((day, i) => {
    const date = day.date ? new Date(day.date) : new Date(Date.now() + i * 86400000);
    const valid = !Number.isNaN(date.getTime());
    const high = Math.round(day.tempMax ?? day.temperatureMax ?? 30);
    const description = day.weatherDescription || day.description || '';
    return {
      label: valid ? date.toLocaleDateString('en-US', { weekday: 'long' }) : `Day ${i + 1}`,
      high,
      icon: mapWeatherIcon(description),
      description,
    };
  });
}

export function placeholderWeeklyDays(): DayForecast[] {
  const highs = [11, 24, 21, 30, 28, 25];
  const icons: DayForecast['icon'][] = ['cloud', 'rain', 'storm', 'storm', 'sun', 'rain'];
  const labels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  return highs.map((high, i) => ({
    label: labels[i],
    high,
    icon: icons[i],
  }));
}

function catmullRomPath(pts: { x: number; y: number }[]) {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export default function WeeklyForecastFooter({
  days,
  cityName,
  activeIndex,
  onDaySelect,
}: WeeklyForecastFooterProps) {
  const uid = useId().replace(/:/g, '');
  const [picked, setPicked] = useState<number | null>(null);
  if (!days || days.length === 0) return null;

  const selected = picked ?? activeIndex ?? Math.min(3, days.length - 1);

  const width = 1155;
  const height = 64;
  const padX = width * 0.0333;
  const step = days.length > 1 ? (width - padX * 2) / (days.length - 1) : 0;
  const highs = days.map(d => d.high);
  const min = Math.min(...highs);
  const max = Math.max(...highs);
  const range = Math.max(max - min, 1);
  const yTop = height * 0.075;
  const yBottom = height * (1 - 0.1513);
  const ySpan = yBottom - yTop;

  const points = days.map((d, i) => {
    const x = padX + i * step;
    const t = (d.high - min) / range;
    const y = yBottom - t * ySpan;
    return { x, y };
  });

  const path = catmullRomPath(points);
  const activePt = points[selected] || points[0];
  const glowId = `wffSplineGlow-${uid}`;
  const strikeId = `wffStrikeGlow-${uid}`;
  const nodeId = `wffNodeGlow-${uid}`;
  const flashId = `wffFlash-${uid}`;
  const strokeId = `wffStroke-${uid}`;

  const handleSelect = (index: number) => {
    setPicked(index);
    onDaySelect?.(index);
  };

  return (
    <footer className="weekly-spline-forecast" aria-label="Weekly spline forecast">
      <div className="wff-temps" role="list">
        {days.map((d, i) => {
          const Icon = ICONS[d.icon] || Cloud;
          const active = i === selected;
          return (
            <button
              type="button"
              key={`temp-${d.label}-${i}`}
              className={`wff-temp-cell ${active ? 'is-active' : ''}`}
              onClick={() => handleSelect(i)}
              title={`${d.label}: ${d.high}°`}
            >
              <span className="wff-temp-shadow">
                <span className="wff-temp">{d.high}°</span>
                <Icon size={16} color={ICON_COLOR[d.icon]} strokeWidth={1.33} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="wff-spline">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="wff-svg" aria-hidden="true">
          <defs>
            <linearGradient id={strokeId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="white" stopOpacity="0.2" />
              <stop offset="35%" stopColor="white" stopOpacity="0.7" />
              <stop offset="55%" stopColor="white" stopOpacity="1" />
              <stop offset="75%" stopColor="white" stopOpacity="0.7" />
              <stop offset="100%" stopColor="white" stopOpacity="0.2" />
            </linearGradient>
            <radialGradient id={flashId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="40%" stopColor="#C8F5FF" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
            <filter id={glowId} x="-8%" y="-80%" width="116%" height="260%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feColorMatrix in="b" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id={strikeId} x="-200%" y="-10%" width="500%" height="120%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feColorMatrix in="b" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 0" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id={nodeId} x="-250%" y="-250%" width="600%" height="600%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feColorMatrix in="b" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            d={path}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="6.325"
            strokeLinecap="round"
          />
          <path
            d={path}
            fill="none"
            stroke={`url(#${strokeId})`}
            strokeWidth="3.795"
            strokeLinecap="round"
            filter={`url(#${glowId})`}
          />

          <line
            x1={activePt.x}
            y1={0}
            x2={activePt.x}
            y2={height}
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="1.8975"
            strokeDasharray="2.53 2.53"
            filter={`url(#${strikeId})`}
          />

          <ellipse
            cx={activePt.x}
            cy={activePt.y}
            rx="26.95"
            ry="11.2"
            fill={`url(#${flashId})`}
          />
          <ellipse
            cx={activePt.x}
            cy={activePt.y}
            rx="6.05"
            ry="2.8"
            fill="#FFFFFF"
            filter={`url(#${nodeId})`}
          />
        </svg>
      </div>

      <div className="wff-names">
        {days.map((d, i) => {
          const active = i === selected;
          return (
            <button
              type="button"
              key={`name-${d.label}-${i}`}
              className={`wff-name ${active ? 'is-active' : ''}`}
              onClick={() => handleSelect(i)}
            >
              {d.label}
              {active && <span className="wff-name-underline" />}
            </button>
          );
        })}
      </div>
      {cityName ? <span className="sr-only">{cityName}</span> : null}
    </footer>
  );
}
