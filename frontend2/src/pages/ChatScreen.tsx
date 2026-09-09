import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./GeminiChat.css";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface RiskSummary {
  HIGH?: number;
  MODERATE?: number;
  LOW?: number;
}

interface WeatherPoint {
  location?: string;
  point?: string;
  weather?: string;
  condition?: string;
  temp?: number | string;
  temperature?: number | string;
  risk?: string;
  risk_level?: string;
  description?: string;
  notes?: string;
  [key: string]: any;
}

interface RouteApiResponse {
  message?: string;
  route_info?: any;
  risk_summary?: RiskSummary;
  weather_data?: WeatherPoint[] | any;
  map_json?: any;
  index_html?: string;
}

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/* ----------------------------------------------------
   ICONS — a small consistent glyph set (no emoji)
---------------------------------------------------- */
const IconCloudSun = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17h9.5a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.6A4 4 0 0 0 7 17z" />
    <path d="M4 20h1M6.5 20h1M9 20h1" />
  </svg>
);

const IconChat = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const IconRoute = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="19" r="2" />
    <circle cx="18" cy="5" r="2" />
    <path d="M8 19h7a3 3 0 0 0 3-3v-1a3 3 0 0 0-3-3H9a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h7" />
  </svg>
);

const IconChart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19V5" />
    <path d="M4 19h16" />
    <rect x="7" y="11" width="3" height="8" />
    <rect x="12.5" y="7" width="3" height="12" />
    <rect x="18" y="13" width="3" height="6" />
  </svg>
);

const IconRadar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <path d="M12 12L18 6" />
  </svg>
);

const IconSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.04 4.3l.06.06A1.65 1.65 0 0 0 8.92 4.7H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.3 9v.08c.16.43.5.78.99.92H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconRain = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 13a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.6 1.7A3.5 3.5 0 0 0 6.5 13H16z" />
    <path d="M8 17l-1 2M12 17l-1 2M16 17l-1 2" />
  </svg>
);

const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="5" width="17" height="16" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
);

const IconLeaf = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 4 13c0-5 4.5-9 12-10 1 6-1 15-5 17z" />
    <path d="M4 13c3-1 6-3 8-6" />
  </svg>
);

const IconSend = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const IconPin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.3" />
  </svg>
);

const IconMenu = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const IconChevron = ({ dir }: { dir: "left" | "right" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={dir === "left" ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} />
  </svg>
);

const NAV_ITEMS = [
  { id: "chat", label: "Assistant chat", icon: <IconChat /> },
  { id: "route", label: "Route weather", icon: <IconRoute />, badge: "New" },
  { id: "report", label: "Weather report", icon: <IconChart /> },
  { id: "radar", label: "Interactive radar", icon: <IconRadar /> },
  { id: "settings", label: "Settings", icon: <IconSettings /> },
];

const suggestions = [
  { icon: <IconCloudSun />, title: "Today's weather", text: "What's the current weather forecast for my location?" },
  { icon: <IconRain />, title: "Rain forecast", text: "Will it rain in the next 24 hours?" },
  { icon: <IconCalendar />, title: "7-day outlook", text: "Give me the extended 7-day weather forecast" },
  { icon: <IconLeaf />, title: "Air quality", text: "What is the current AQI and health recommendations?" },
];

/* ----------------------------------------------------
   SUB-COMPONENT: Route Weather Details View
---------------------------------------------------- */
function RouteWeatherView() {
  const [formData, setFormData] = useState({
    origin: "Delhi",
    destination: "Agra",
    departure_time: "08:00",
  });

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<RouteApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch(`${API_URL}/route-weather`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error(`Error: ${res.status} - ${res.statusText}`);

      const data: RouteApiResponse = await res.json();
      setResponse(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch weather route analysis.");
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadgeStyle = (risk?: string) => {
    const r = String(risk || "").toUpperCase();
    switch (r) {
      case "HIGH":
        return { backgroundColor: "rgba(229, 101, 74, 0.16)", color: "#f0a08c", borderColor: "rgba(229, 101, 74, 0.35)" };
      case "MODERATE":
        return { backgroundColor: "rgba(224, 166, 63, 0.16)", color: "#f0cf8f", borderColor: "rgba(224, 166, 63, 0.35)" };
      case "LOW":
        return { backgroundColor: "rgba(70, 201, 166, 0.16)", color: "#8fe0cb", borderColor: "rgba(70, 201, 166, 0.35)" };
      default:
        return { backgroundColor: "rgba(154, 164, 182, 0.16)", color: "#c3cad6", borderColor: "rgba(154, 164, 182, 0.35)" };
    }
  };

  return (
    <div style={routeStyles.scrollWrapper}>
      <div style={routeStyles.container}>
        <header style={routeStyles.header}>
          <h2 style={routeStyles.headerTitle}>Route weather analyzer</h2>
          <p style={routeStyles.headerSubtitle}>Check conditions and risk along a journey, point by point.</p>
        </header>

        <form onSubmit={handleSubmit} style={routeStyles.form}>
          <div style={routeStyles.formGrid}>
            <div style={routeStyles.inputGroup}>
              <label style={routeStyles.label}>Origin</label>
              <input
                type="text"
                name="origin"
                value={formData.origin}
                onChange={handleChange}
                required
                style={routeStyles.input}
                placeholder="e.g. Delhi"
              />
            </div>

            <div style={routeStyles.inputGroup}>
              <label style={routeStyles.label}>Destination</label>
              <input
                type="text"
                name="destination"
                value={formData.destination}
                onChange={handleChange}
                required
                style={routeStyles.input}
                placeholder="e.g. Agra"
              />
            </div>

            <div style={routeStyles.inputGroup}>
              <label style={routeStyles.label}>Departure time</label>
              <input
                type="time"
                name="departure_time"
                value={formData.departure_time}
                onChange={handleChange}
                required
                style={routeStyles.input}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} style={routeStyles.button}>
            {loading ? "Analyzing route…" : "Analyze route"}
          </button>
        </form>

        {error && <div style={routeStyles.error}>{error}</div>}

        {response && (
          <div style={routeStyles.resultsContainer}>
            {response.message && (
              <div style={routeStyles.successBanner}>{response.message}</div>
            )}

            {response.risk_summary && (
              <div style={routeStyles.card}>
                <h3 style={routeStyles.cardTitle}>Risk summary</h3>
                <div style={routeStyles.riskGrid}>
                  <div style={{ ...routeStyles.riskMetricCard, borderColor: "rgba(229, 101, 74, 0.3)" }}>
                    <span style={{ ...routeStyles.riskCount, color: "#f0a08c" }}>{response.risk_summary.HIGH ?? 0}</span>
                    <span style={routeStyles.riskLabel}>High-risk waypoints</span>
                  </div>
                  <div style={{ ...routeStyles.riskMetricCard, borderColor: "rgba(224, 166, 63, 0.3)" }}>
                    <span style={{ ...routeStyles.riskCount, color: "#f0cf8f" }}>{response.risk_summary.MODERATE ?? 0}</span>
                    <span style={routeStyles.riskLabel}>Moderate-risk waypoints</span>
                  </div>
                  <div style={{ ...routeStyles.riskMetricCard, borderColor: "rgba(70, 201, 166, 0.3)" }}>
                    <span style={{ ...routeStyles.riskCount, color: "#8fe0cb" }}>{response.risk_summary.LOW ?? 0}</span>
                    <span style={routeStyles.riskLabel}>Low-risk waypoints</span>
                  </div>
                </div>
              </div>
            )}

            {response.weather_data && (
              <div style={routeStyles.card}>
                <h3 style={routeStyles.cardTitle}>Waypoint forecasts</h3>
                {Array.isArray(response.weather_data) ? (
                  <div style={routeStyles.tableWrapper}>
                    <table style={routeStyles.table}>
                      <thead>
                        <tr>
                          <th style={routeStyles.th}>#</th>
                          <th style={routeStyles.th}>Point</th>
                          <th style={routeStyles.th}>Condition</th>
                          <th style={routeStyles.th}>Temp</th>
                          <th style={routeStyles.th}>Risk</th>
                          <th style={routeStyles.th}>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {response.weather_data.map((item: WeatherPoint, index: number) => {
                          const pointName = item.location || item.point || item.name || `Point ${index + 1}`;
                          const condition = item.weather || item.condition || item.sky || "—";
                          const tempVal = item.temp ?? item.temperature;
                          const tempDisplay = tempVal !== undefined ? `${tempVal}°C` : "—";
                          const riskVal = item.risk || item.risk_level || "NORMAL";
                          const desc = item.description || item.notes || item.summary || (
                            typeof item === "object" ? Object.entries(item)
                              .filter(([k]) => !["location", "point", "weather", "condition", "temp", "temperature", "risk", "risk_level"].includes(k))
                              .map(([k, v]) => `${k}: ${v}`).join(", ") : String(item)
                          );

                          return (
                            <tr key={index} style={routeStyles.tr}>
                              <td style={routeStyles.tdIndex}>{index + 1}</td>
                              <td style={routeStyles.tdBold}>{pointName}</td>
                              <td style={routeStyles.td}>{condition}</td>
                              <td style={routeStyles.td}>{tempDisplay}</td>
                              <td style={routeStyles.td}>
                                <span style={{ ...routeStyles.badge, ...getRiskBadgeStyle(riskVal) }}>
                                  {riskVal.toUpperCase()}
                                </span>
                              </td>
                              <td style={routeStyles.tdDesc}>{desc || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <pre style={routeStyles.jsonBlock}>{JSON.stringify(response.weather_data, null, 2)}</pre>
                )}
              </div>
            )}

            {response.index_html && (
              <div style={routeStyles.card}>
                <h3 style={routeStyles.cardTitle}>Route map</h3>
                <div style={routeStyles.mapWrapper}>
                  <iframe title="Route map preview" srcDoc={response.index_html} style={routeStyles.iframe} />
                </div>
              </div>
            )}

            {response.route_info && (
              <div style={routeStyles.card}>
                <h3 style={routeStyles.cardTitle}>Route parameters</h3>
                <pre style={routeStyles.jsonBlock}>
                  {typeof response.route_info === "object" ? JSON.stringify(response.route_info, null, 2) : response.route_info}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const routeStyles: { [key: string]: React.CSSProperties } = {
  scrollWrapper: { width: "100%", height: "100%", minWidth: 0, overflowY: "auto", overflowX: "hidden", padding: "20px 16px", boxSizing: "border-box" },
  container: { width: "100%", maxWidth: "1400px", minWidth: 0, margin: "0 auto", display: "flex", flexDirection: "column", gap: "18px", boxSizing: "border-box" },
  header: { textAlign: "left" },
  headerTitle: { margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.35rem", fontWeight: 600, letterSpacing: "-0.02em", color: "#edf0f5" },
  headerSubtitle: { margin: "4px 0 0 0", fontSize: "0.85rem", color: "#9aa4b6" },
  form: { display: "flex", flexDirection: "column", gap: "14px", backgroundColor: "#10151d", padding: "18px", borderRadius: "12px", border: "1px solid rgba(237,240,245,0.07)", minWidth: 0, boxSizing: "border-box" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", minWidth: 0 },
  inputGroup: { display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 },
  label: { fontSize: "0.75rem", fontWeight: 600, color: "#9aa4b6" },
  input: { padding: "10px 13px", borderRadius: "8px", border: "1px solid rgba(237,240,245,0.14)", backgroundColor: "#0a0e15", color: "#edf0f5", fontSize: "0.9rem", outline: "none", width: "100%", minWidth: 0, boxSizing: "border-box" },
  button: { padding: "12px 24px", background: "linear-gradient(120deg, #f0a83c 0%, #d9633b 100%)", color: "#14100a", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.92rem", width: "100%" },
  error: { padding: "12px 16px", backgroundColor: "rgba(229, 101, 74, 0.12)", border: "1px solid rgba(229, 101, 74, 0.3)", color: "#f0a08c", borderRadius: "8px", fontSize: "0.875rem" },
  resultsContainer: { display: "flex", flexDirection: "column", gap: "18px" },
  successBanner: { backgroundColor: "rgba(70, 201, 166, 0.1)", border: "1px solid rgba(70, 201, 166, 0.25)", color: "#8fe0cb", padding: "11px 15px", borderRadius: "8px", fontWeight: 500, fontSize: "0.88rem" },
  card: { backgroundColor: "#10151d", padding: "18px", borderRadius: "12px", border: "1px solid rgba(237,240,245,0.07)" },
  cardTitle: { margin: "0 0 14px 0", fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.02rem", fontWeight: 600, color: "#edf0f5" },
  riskGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px" },
  riskMetricCard: { display: "flex", flexDirection: "column", alignItems: "center", padding: "14px", borderRadius: "8px", backgroundColor: "#0a0e15", border: "1px solid transparent" },
  riskCount: { fontSize: "1.6rem", fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" },
  riskLabel: { fontSize: "0.7rem", color: "#9aa4b6", marginTop: "4px" },
  badge: { display: "inline-block", padding: "3px 9px", borderRadius: "12px", fontWeight: 600, fontSize: "0.7rem", border: "1px solid transparent" },
  tableWrapper: { width: "100%", overflowX: "auto", borderRadius: "8px", border: "1px solid rgba(237,240,245,0.07)" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" },
  th: { borderBottom: "1px solid rgba(237,240,245,0.1)", padding: "10px 13px", backgroundColor: "rgba(237,240,245,0.02)", fontWeight: 600, color: "#9aa4b6", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid rgba(237,240,245,0.05)" },
  tdIndex: { padding: "10px 13px", color: "#5f6a7d", width: "36px" },
  tdBold: { padding: "10px 13px", fontWeight: 600, whiteSpace: "nowrap", color: "#edf0f5" },
  td: { padding: "10px 13px", whiteSpace: "nowrap", color: "#c3cad6" },
  tdDesc: { padding: "10px 13px", color: "#9aa4b6", minWidth: "180px", wordBreak: "break-word" },
  jsonBlock: { backgroundColor: "#0a0e15", padding: "13px", borderRadius: "8px", overflowX: "auto", fontSize: "0.78rem", color: "#8fe0cb", margin: 0, border: "1px solid rgba(237,240,245,0.05)" },
  mapWrapper: { width: "100%", borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(237,240,245,0.1)", backgroundColor: "#fff" },
  iframe: { width: "100%", height: "380px", border: "none", display: "block" },
};

/* ----------------------------------------------------
   MAIN APP COMPONENT
---------------------------------------------------- */
interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

type LocationStatus = "pending" | "granted" | "denied" | "unsupported";

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [location, setLocation] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("pending");

  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth > 768 : true
  );
  const [activeNav, setActiveNav] = useState("chat");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationStatus("unsupported");
      return;
    }
    setLocationStatus("pending");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocationStatus("granted");
      },
      () => {
        setLocation(null);
        setLocationStatus("denied");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  };

  // Ask for location once on load so it's ready by the time the first message sends.
  useEffect(() => {
    requestLocation();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const sendMessage = async (overridePrompt?: string) => {
    const prompt = (overridePrompt || input).trim();
    if (!prompt || loading) return;

    const userMessage: Message = { role: "user", content: prompt };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const response = await fetch(`${API_URL}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          location: location
            ? { latitude: location.latitude, longitude: location.longitude, accuracy: location.accuracy }
            : null,
        }),
      });

      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
    } catch (error) {
      console.error("Agent error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't connect to the WeatherGPT server. Please verify your connection or API server status." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => setMessages([]);

  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  const selectNav = (id: string) => {
    setActiveNav(id);
    if (isMobile) setIsSidebarOpen(false);
  };

  return (
    <div className="app-layout">
      {isSidebarOpen && <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />}

      {/* SIDEBAR */}
      <aside className={`sidebar ${isSidebarOpen ? "open" : "collapsed"}`}>
        <div className="sidebar-header">
          <div className="brand-mark"><IconCloudSun /></div>
          {isSidebarOpen && <span className="brand-title">WeatherGPT</span>}
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => selectNav(item.id)}
              className={`nav-item ${activeNav === item.id ? "active" : ""}`}
              title={!isSidebarOpen ? item.label : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              {isSidebarOpen && <span className="nav-label">{item.label}</span>}
              {isSidebarOpen && item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="toggle-sidebar-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)} aria-label="Toggle sidebar">
            <span className="toggle-icon"><IconChevron dir={isSidebarOpen ? "left" : "right"} /></span>
            {isSidebarOpen && <span className="toggle-label">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="main-viewport">
        <header className="gemini-header">
          <div className="header-left">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="menu-trigger-btn" aria-label="Open sidebar">
                <IconMenu />
              </button>
            )}
            <span className="current-view-title">{NAV_ITEMS.find((item) => item.id === activeNav)?.label}</span>
          </div>

          <div className="header-right">
            <button
              className={`location-indicator ${locationStatus}`}
              onClick={() => locationStatus !== "pending" && requestLocation()}
              title={
                locationStatus === "granted"
                  ? "Sharing your location with WeatherGPT"
                  : locationStatus === "denied"
                  ? "Location blocked — click to try again"
                  : locationStatus === "unsupported"
                  ? "Location isn't available in this browser"
                  : "Requesting your location…"
              }
              aria-label="Location status"
            >
              <IconPin />
            </button>
            {activeNav === "chat" && messages.length > 0 && (
              <button onClick={clearChat} className="clear-chat-btn">Clear chat</button>
            )}
            <div className="avatar-badge-outer">
              <div className="avatar-badge-inner">AI</div>
            </div>
          </div>
        </header>

        <div className="view-container">
          {activeNav === "chat" && (
            <div className="gemini-chat-container">
              <main className="chat-body">
                <div className="chat-wrapper">
                  {messages.length === 0 && (
                    <div className="empty-state">
                      <div className="empty-state-mark"><IconCloudSun /></div>
                      <h2 className="greeting-subtext">Where would you like weather updates for today?</h2>

                      <div className="suggestion-grid">
                        {suggestions.map((item, idx) => (
                          <button key={idx} onClick={() => sendMessage(item.text)} className="suggestion-card">
                            <p>{item.text}</p>
                            <div className="suggestion-card-footer">
                              <span className="suggestion-title">{item.title}</span>
                              <div className="suggestion-icon-circle">{item.icon}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.length > 0 && (
                    <div className="message-list">
                      {messages.map((msg, index) => {
                        const isUser = msg.role === "user";
                        return (
                          <div key={index} className={`message-row ${isUser ? "user" : "assistant"}`}>
                            {!isUser && <div className="assistant-avatar"><IconCloudSun /></div>}

                            <div className="message-bubble-container">
                              {isUser ? (
                                <div className="user-bubble"><p>{msg.content}</p></div>
                              ) : (
                                <div className="assistant-bubble">
                                  <div className="assistant-content">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                  </div>
                                </div>
                              )}
                            </div>

                            {isUser && <div className="user-avatar">U</div>}
                          </div>
                        );
                      })}

                      {loading && (
                        <div className="loading-row">
                          <div className="assistant-avatar"><IconCloudSun /></div>
                          <div className="pulse-bar" />
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
              </main>

              <div className="input-area">
                <div className="input-pill-wrapper">
                  <div className="input-pill">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={handleInput}
                      onKeyDown={handleKeyDown}
                      disabled={loading}
                      rows={1}
                      placeholder="Ask WeatherGPT..."
                      className="chat-textarea"
                    />
                    <button onClick={() => sendMessage()} disabled={!input.trim() || loading} className="send-btn" aria-label="Send message">
                      <IconSend />
                    </button>
                  </div>
                </div>
                <p className="disclaimer-text">WeatherGPT may display inaccurate info, including about weather conditions.</p>
              </div>
            </div>
          )}

          {activeNav === "route" && <RouteWeatherView />}

          {activeNav !== "chat" && activeNav !== "route" && (
            <div className="route-placeholder-screen">
              <div className="placeholder-card">
                <span className="placeholder-icon">{NAV_ITEMS.find((item) => item.id === activeNav)?.icon}</span>
                <h2>{NAV_ITEMS.find((item) => item.id === activeNav)?.label}</h2>
                <p>This page route is ready to hold custom components and widgets.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}