"""
weather_service.py

Global weather + air-quality service using Open-Meteo.

Features:
- Current weather
- 7-day daily forecast
- 7-day / 168-hour hourly forecast
- Air quality
- PM2.5 / PM10
- CO / CO2 / NO2 / SO2 / O3
- AQI
- UV index
- Wind
- Rain
- Snow
- Cloud cover
- Visibility
- Pressure
- Dew point
- Apparent temperature
- Soil conditions
- Evapotranspiration
- Sunrise / sunset
- Timezone / location metadata

No API key required for non-commercial use within Open-Meteo's
free usage terms.

Install:
    pip install httpx

Usage:

    import asyncio
    from weather_service import WeatherService

    async def main():
        service = WeatherService()

        data = await service.get_weather(
            latitude=28.6139,
            longitude=77.2090,
        )

        print(data["current"])
        print(data["daily"])
        print(data["air_quality"])

    asyncio.run(main())
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

import httpx


# ============================================================
# Exceptions
# ============================================================

class WeatherAPIError(Exception):
    """Base exception for weather service errors."""


class InvalidCoordinatesError(WeatherAPIError):
    """Raised when latitude/longitude are invalid."""


class WeatherProviderError(WeatherAPIError):
    """Raised when a weather provider fails."""


class AirQualityProviderError(WeatherAPIError):
    """Raised when an air-quality provider fails."""


# ============================================================
# Configuration
# ============================================================

class WeatherConfig:
    """
    Central configuration.

    Keeping configuration separate means providers can be changed
    without modifying business logic.
    """

    WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast"
    AIR_QUALITY_API_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"

    FORECAST_DAYS = 7

    REQUEST_TIMEOUT = 15.0


# ============================================================
# Interfaces / Abstractions
# ============================================================

class WeatherProvider(ABC):
    """
    Abstraction for a weather provider.

    Any future provider such as WeatherAPI, NOAA, IMD, etc.
    can implement this interface.
    """

    @abstractmethod
    async def get_weather(
        self,
        latitude: float,
        longitude: float,
    ) -> Dict[str, Any]:
        pass


class AirQualityProvider(ABC):
    """
    Abstraction for an air-quality provider.
    """

    @abstractmethod
    async def get_air_quality(
        self,
        latitude: float,
        longitude: float,
    ) -> Dict[str, Any]:
        pass


# ============================================================
# HTTP Client Abstraction
# ============================================================

class HTTPClient:
    """
    Small HTTP abstraction.

    Keeps networking concerns outside the weather business logic.
    """

    def __init__(self, timeout: float = WeatherConfig.REQUEST_TIMEOUT):
        self.timeout = timeout

    async def get(
        self,
        url: str,
        params: Dict[str, Any],
    ) -> Dict[str, Any]:

        try:
            async with httpx.AsyncClient(
                timeout=self.timeout
            ) as client:

                response = await client.get(
                    url,
                    params=params,
                )

                response.raise_for_status()

                return response.json()

        except httpx.HTTPError as exc:
            raise WeatherAPIError(
                f"HTTP request failed: {exc}"
            ) from exc


# ============================================================
# Open-Meteo Weather Provider
# ============================================================

class OpenMeteoWeatherProvider(WeatherProvider):

    def __init__(
        self,
        http_client: HTTPClient,
    ):
        self.http_client = http_client

    async def get_weather(
        self,
        latitude: float,
        longitude: float,
    ) -> Dict[str, Any]:

        params = {
            "latitude": latitude,
            "longitude": longitude,

            # Automatically determine local timezone.
            "timezone": "auto",

            # ------------------------------------------------
            # CURRENT
            # ------------------------------------------------
            "current": ",".join([
                "temperature_2m",
                "relative_humidity_2m",
                "apparent_temperature",
                "is_day",
                "precipitation",
                "rain",
                "showers",
                "snowfall",
                "weather_code",
                "cloud_cover",
                "pressure_msl",
                "surface_pressure",
                "wind_speed_10m",
                "wind_direction_10m",
                "wind_gusts_10m",
                "visibility",
                "uv_index",
                "uv_index_clear_sky",
                "cape",
                "vapour_pressure_deficit",
            ]),

            # ------------------------------------------------
            # HOURLY
            # ------------------------------------------------
            "hourly": ",".join([
                # Temperature
                "temperature_2m",
                "apparent_temperature",
                "dew_point_2m",

                # Humidity
                "relative_humidity_2m",

                # Precipitation
                "precipitation_probability",
                "precipitation",
                "rain",
                "showers",
                "snowfall",

                # Weather
                "weather_code",

                # Clouds
                "cloud_cover",
                "cloud_cover_low",
                "cloud_cover_mid",
                "cloud_cover_high",

                # Pressure
                "pressure_msl",
                "surface_pressure",

                # Wind
                "wind_speed_10m",
                "wind_direction_10m",
                "wind_gusts_10m",

                # Visibility
                "visibility",

                # Radiation / UV
                "uv_index",
                "uv_index_clear_sky",
                "shortwave_radiation",
                "direct_radiation",
                "diffuse_radiation",
                "direct_normal_irradiance",

                # Solar
                "sunshine_duration",

                # Agriculture
                "evapotranspiration",
                "et0_fao_evapotranspiration",
                "vapour_pressure_deficit",

                # Soil
                "soil_temperature_0_to_7cm",
                "soil_temperature_7_to_28cm",
                "soil_temperature_28_to_100cm",
                "soil_temperature_100_to_255cm",

                "soil_moisture_0_to_7cm",
                "soil_moisture_7_to_28cm",
                "soil_moisture_28_to_100cm",
                "soil_moisture_100_to_255cm",
            ]),

            # ------------------------------------------------
            # DAILY
            # ------------------------------------------------
            "daily": ",".join([
                # Temperature
                "temperature_2m_max",
                "temperature_2m_min",
                "temperature_2m_mean",

                # Apparent temperature
                "apparent_temperature_max",
                "apparent_temperature_min",
                "apparent_temperature_mean",

                # Precipitation
                "precipitation_sum",
                "rain_sum",
                "showers_sum",
                "snowfall_sum",

                "precipitation_hours",
                "precipitation_probability_max",
                "precipitation_probability_mean",

                # Weather
                "weather_code",

                # Wind
                "wind_speed_10m_max",
                "wind_gusts_10m_max",
                "wind_direction_10m_dominant",

                # UV
                "uv_index_max",
                "uv_index_clear_sky_max",

                # Sun
                "sunrise",
                "sunset",
                "daylight_duration",
                "sunshine_duration",

                # Energy / agriculture
                "shortwave_radiation_sum",
                "et0_fao_evapotranspiration",
            ]),

            # Seven days.
            "forecast_days": WeatherConfig.FORECAST_DAYS,

            # Useful units.
            "temperature_unit": "celsius",
            "wind_speed_unit": "kmh",
            "precipitation_unit": "mm",
        }

        try:
            return await self.http_client.get(
                WeatherConfig.WEATHER_API_URL,
                params,
            )

        except WeatherAPIError as exc:
            raise WeatherProviderError(
                f"Weather provider failed: {exc}"
            ) from exc


# ============================================================
# Open-Meteo Air Quality Provider
# ============================================================

class OpenMeteoAirQualityProvider(AirQualityProvider):

    def __init__(
        self,
        http_client: HTTPClient,
    ):
        self.http_client = http_client

    async def get_air_quality(
        self,
        latitude: float,
        longitude: float,
    ) -> Dict[str, Any]:

        params = {
            "latitude": latitude,
            "longitude": longitude,

            "timezone": "auto",

            "forecast_days": 7,

            # ------------------------------------------------
            # CURRENT AIR QUALITY
            # ------------------------------------------------
            "current": ",".join([
                "pm10",
                "pm2_5",
                "carbon_monoxide",
                "carbon_dioxide",
                "nitrogen_dioxide",
                "sulphur_dioxide",
                "ozone",

                "aerosol_optical_depth",
                "dust",

                "uv_index",
                "uv_index_clear_sky",

                "us_aqi",
                "us_aqi_pm2_5",
                "us_aqi_pm10",
                "us_aqi_carbon_monoxide",
                "us_aqi_nitrogen_dioxide",
                "us_aqi_sulphur_dioxide",
                "us_aqi_ozone",

                "european_aqi",
            ]),

            # ------------------------------------------------
            # HOURLY AIR QUALITY
            # ------------------------------------------------
            "hourly": ",".join([
                "pm10",
                "pm2_5",

                "carbon_monoxide",
                "carbon_dioxide",

                "nitrogen_dioxide",
                "sulphur_dioxide",
                "ozone",

                "aerosol_optical_depth",
                "dust",

                "uv_index",
                "uv_index_clear_sky",

                "us_aqi",
                "us_aqi_pm2_5",
                "us_aqi_pm10",
                "us_aqi_carbon_monoxide",
                "us_aqi_nitrogen_dioxide",
                "us_aqi_sulphur_dioxide",
                "us_aqi_ozone",

                "european_aqi",
            ]),
        }

        try:
            return await self.http_client.get(
                WeatherConfig.AIR_QUALITY_API_URL,
                params,
            )

        except WeatherAPIError as exc:
            raise AirQualityProviderError(
                f"Air quality provider failed: {exc}"
            ) from exc


# ============================================================
# Coordinate Validator
# ============================================================

class CoordinateValidator:
    """
    Validates geographical coordinates.

    Single responsibility: validation only.
    """

    @staticmethod
    def validate(
        latitude: float,
        longitude: float,
    ) -> None:

        if not isinstance(latitude, (int, float)):
            raise InvalidCoordinatesError(
                "Latitude must be a number."
            )

        if not isinstance(longitude, (int, float)):
            raise InvalidCoordinatesError(
                "Longitude must be a number."
            )

        if not -90 <= latitude <= 90:
            raise InvalidCoordinatesError(
                "Latitude must be between -90 and 90."
            )

        if not -180 <= longitude <= 180:
            raise InvalidCoordinatesError(
                "Longitude must be between -180 and 180."
            )


# ============================================================
# Weather Normalizer
# ============================================================

class WeatherNormalizer:
    """
    Converts provider responses into a consistent structure.

    The original API response is retained so that no useful
    information is accidentally lost.
    """

    @staticmethod
    def normalize(
        weather: Dict[str, Any],
        air_quality: Dict[str, Any],
    ) -> Dict[str, Any]:

        return {
            "location": {
                "latitude": weather.get("latitude"),
                "longitude": weather.get("longitude"),
                "elevation_m": weather.get("elevation"),

                "timezone": weather.get("timezone"),
                "timezone_abbreviation": weather.get(
                    "timezone_abbreviation"
                ),

                "utc_offset_seconds": weather.get(
                    "utc_offset_seconds"
                ),
            },

            "units": {
                "weather": weather.get("current_units", {}),
                "hourly": weather.get("hourly_units", {}),
                "daily": weather.get("daily_units", {}),
                "air_quality": air_quality.get(
                    "current_units",
                    {}
                ),
            },

            # ------------------------------------------------
            # CURRENT
            # ------------------------------------------------

            "current": weather.get(
                "current",
                {}
            ),

            # ------------------------------------------------
            # HOURLY
            # ------------------------------------------------

            "hourly": weather.get(
                "hourly",
                {}
            ),

            # ------------------------------------------------
            # DAILY
            # ------------------------------------------------

            "daily": weather.get(
                "daily",
                {}
            ),

            # ------------------------------------------------
            # AIR QUALITY
            # ------------------------------------------------

            "air_quality": {
                "current": air_quality.get(
                    "current",
                    {}
                ),

                "hourly": air_quality.get(
                    "hourly",
                    {}
                ),

                "units": air_quality.get(
                    "hourly_units",
                    {}
                ),
            },

            # ------------------------------------------------
            # RAW PROVIDER DATA
            # ------------------------------------------------

            "metadata": {
                "weather_generation_time": weather.get(
                    "generationtime_ms"
                ),

                "air_quality_generation_time": air_quality.get(
                    "generationtime_ms"
                ),

                "weather_provider": "Open-Meteo",
                "air_quality_provider": "Open-Meteo / CAMS",
            },
        }


# ============================================================
# Main Weather Service
# ============================================================

class WeatherService:
    """
    High-level application service.

    The rest of your application should interact with this class
    rather than directly calling Open-Meteo.
    """

    def __init__(
        self,
        weather_provider: Optional[WeatherProvider] = None,
        air_quality_provider: Optional[AirQualityProvider] = None,
    ):

        http_client = HTTPClient()

        self.weather_provider = (
            weather_provider
            or OpenMeteoWeatherProvider(
                http_client
            )
        )

        self.air_quality_provider = (
            air_quality_provider
            or OpenMeteoAirQualityProvider(
                http_client
            )
        )

    async def get_weather(
        self,
        latitude: float,
        longitude: float,
    ) -> Dict[str, Any]:

        # Validate first.
        CoordinateValidator.validate(
            latitude,
            longitude,
        )

        # Fetch both APIs concurrently.
        import asyncio

        weather_task = self.weather_provider.get_weather(
            latitude,
            longitude,
        )

        air_quality_task = self.air_quality_provider.get_air_quality(
            latitude,
            longitude,
        )

        weather, air_quality = await asyncio.gather(
            weather_task,
            air_quality_task,
        )

        return WeatherNormalizer.normalize(
            weather,
            air_quality,
        )


# ============================================================
# Convenience Function
# ============================================================

async def get_weather(
    latitude: float,
    longitude: float,
) -> Dict[str, Any]:
    """
    Simple function for application code.

    Example:

        data = await get_weather(
            28.6139,
            77.2090
        )
    """

    service = WeatherService()

    return await service.get_weather(
        latitude,
        longitude,
    )


# ============================================================
# Synchronous Convenience Function
# ============================================================

def get_weather_sync(
    latitude: float,
    longitude: float,
) -> Dict[str, Any]:
    """
    Synchronous wrapper for scripts that don't use asyncio.

    Example:

        data = get_weather_sync(
            28.6139,
            77.2090
        )
    """

    import asyncio

    return asyncio.run(
        get_weather(
            latitude,
            longitude,
        )
    )


# ============================================================
# Example
# ============================================================

if __name__ == "__main__":

    data = get_weather_sync(
        latitude=28.6139,
        longitude=77.2090,
    )
    print(data)