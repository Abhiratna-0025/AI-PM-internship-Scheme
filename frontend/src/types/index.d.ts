// Types barrel export

// API Response Types
export interface ApiWeatherLocation {
  name: string
  latitude: number
  longitude: number
  admin1?: string
  country: string
  timezone: string
}

export interface ApiCurrentWeatherData {
  location: ApiWeatherLocation
  temperature: number
  apparentTemperature: number
  humidity: number
  windSpeed: number
  windDirection: number
  weatherCode: number
  weatherDescription: string
  pressure: number
  visibility: number
  isDay: boolean
  observedAt: string
  timezone: string
  provider: string
}

export interface ApiCurrentWeatherApiResponse {
  success: boolean
  message: string
  data: ApiCurrentWeatherData
}

export interface ApiForecastDay {
  date: string
  weatherCode: number
  weatherDescription: string
  tempMax: number
  tempMin: number
  precipitationProbabilityMax: number
  precipitationSum: number
  windSpeedMax: number
  humidityMax: number
}

export interface ApiForecastData {
  location: ApiWeatherLocation
  timezone: string
  days: ApiForecastDay[]
  provider: string
}

export interface ApiForecastApiResponse {
  success: boolean
  message: string
  data: ApiForecastData
}

// UI-friendly types
export interface WeatherData {
  name: string
  country: string
  dt: number
  temp: number
  feelsLike: number
  humidity: number
  windSpeed: number
  windDeg: number
  description: string
  icon: string
  visibility: number
}

export interface ForecastDay {
  dt: number
  tempMax: number
  tempMin: number
  description: string
  icon: string
  precipitation: number
}

export interface CitySuggestion {
  id: number
  name: string
  country: string
}

export interface Alert {
  id: string
  title: string
  description: string
  severity: "advisory" | "official" | "observation"
  issuedAt: string
  expiresAt: string
}

export interface ChatMessage {
  id: string
  query: string
  answer: string
  time: string
}

export interface User {
  id: number
  fullName: string
  email: string
  phoneNumber: string
  role: string
  emailVerified: boolean
  createdAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  tokenType?: string
  expiresIn?: number
  user?: User
}

export interface LoginResponse {
  success: boolean
  message: string
  data?: AuthTokens
}

export interface RegisterResponse {
  success: boolean
  message: string
  data?: AuthTokens
}
