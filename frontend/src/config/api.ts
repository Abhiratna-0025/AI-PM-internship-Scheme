/**
 * API Configuration
 * 
 * Supports both localhost and network IP access
 * - If running on network IP: replace 'localhost' with your machine's IP
 * - Environment variables (if configured in .env.local):
 *   - VITE_API_BASE_URL: Full base URL including port
 */

const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const port = 8080;
    return `http://${hostname}:${port}`;
  }

  return 'https://sih-weathergpt-production.up.railway.app';
};

export const API_BASE_URL = getApiBaseUrl();

// In-flight request deduplication cache: key → promise
const inFlightRequests = new Map<string, Promise<Response>>();

export async function fetchWithDedup(url: string, options?: RequestInit): Promise<Response> {
  const key = `${options?.method || 'GET'}:${url}`;
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing;
  }
  const promise = fetch(url, options).finally(() => {
    inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, promise);
  return promise;
}

// API endpoints
export const WEATHER_ENDPOINTS = {
  CURRENT: (location: string) => `${API_BASE_URL}/api/weather/current?location=${encodeURIComponent(location)}`,
  FORECAST: (location: string, days: number = 7) => `${API_BASE_URL}/api/weather/forecast?location=${encodeURIComponent(location)}&days=${days}`,
  NWP: (location: string) => `${API_BASE_URL}/api/weather/nwp?location=${encodeURIComponent(location)}`,
};

export const ADVISORIES_ENDPOINT = (location: string, sector: string) => 
  `${API_BASE_URL}/api/weather/advisories?location=${encodeURIComponent(location)}&sector=${sector}`;

export const ALERTS_ENDPOINT = (location: string) => 
  `${API_BASE_URL}/api/alerts/early-warnings?location=${encodeURIComponent(location)}`;

export const CLIMATE_ENDPOINT = (location: string, startYear: number = 2015, endYear: number = 2024) => 
  `${API_BASE_URL}/api/weather/climate?location=${encodeURIComponent(location)}&startYear=${startYear}&endYear=${endYear}`;

export const CHAT_ENDPOINT = `${API_BASE_URL}/api/chat/query`;
