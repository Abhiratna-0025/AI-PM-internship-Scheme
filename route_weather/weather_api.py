import requests
import time
from datetime import datetime


OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


def get_weather_batch(route_points):
    """
    Request weather for a small batch of route points.
    """

    latitudes = ",".join(
        str(point["latitude"])
        for point in route_points
    )

    longitudes = ",".join(
        str(point["longitude"])
        for point in route_points
    )

    params = {
        "latitude": latitudes,
        "longitude": longitudes,

        "hourly": (
            "temperature_2m,"
            "relative_humidity_2m,"
            "precipitation_probability,"
            "precipitation,"
            "wind_speed_10m,"
            "weather_code"
        ),

        "forecast_days": 2,

        "timezone": "auto"
    }

    headers = {
        "User-Agent": "WeatherGPT/1.0"
    }

    # Retry 3 times
    for attempt in range(3):

        try:

            print(
                f"Weather request attempt "
                f"{attempt + 1}/3..."
            )

            response = requests.get(
                OPEN_METEO_URL,
                params=params,
                headers=headers,
                timeout=30
            )

            print(
                "Weather API status:",
                response.status_code
            )

            if response.status_code == 200:
                data = response.json()

                if isinstance(data, dict):
                    data = [data]

                return data

            print(
                "API response:",
                response.text[:500]
            )

        except requests.exceptions.ConnectionError as e:

            print(
                "Connection error. Retrying..."
            )

        except requests.exceptions.Timeout:

            print(
                "Request timed out. Retrying..."
            )

        except requests.exceptions.RequestException as e:

            print(
                "Request error:",
                e
            )

        if attempt < 2:
            time.sleep(3)

    raise Exception(
        "Unable to connect to Open-Meteo after 3 attempts."
    )


def get_weather_for_route(route_points):

    """
    Get hourly weather for all route points.

    Requests are divided into small batches
    to make the connection more reliable.
    """

    if not route_points:
        return []

    print(
        f"\nRequesting weather for "
        f"{len(route_points)} route points..."
    )

    results = []

    # -----------------------------------------
    # PROCESS IN SMALL BATCHES
    # -----------------------------------------

    batch_size = 3

    for start in range(
        0,
        len(route_points),
        batch_size
    ):

        batch = route_points[
            start:start + batch_size
        ]

        print(
            f"\nProcessing points "
            f"{start + 1} - "
            f"{start + len(batch)}"
        )

        data = get_weather_batch(batch)

        # -------------------------------------
        # MATCH WEATHER WITH ROUTE POINT
        # -------------------------------------

        for route_point, weather in zip(
            batch,
            data
        ):

            hourly = weather["hourly"]

            target_time = (
                route_point["arrival_time"]
            )

            weather_times = [

                datetime.fromisoformat(time_value)

                for time_value
                in hourly["time"]
            ]

            # Find closest forecast hour

            closest_index = min(

                range(len(weather_times)),

                key=lambda i:
                    abs(
                        weather_times[i]
                        - target_time
                    )
            )

            index = closest_index

            results.append({

                "latitude":
                    route_point["latitude"],

                "longitude":
                    route_point["longitude"],

                "distance_from_start":
                    route_point[
                        "distance_from_start"
                    ],

                "arrival_time":
                    target_time,

                "weather_time":
                    weather_times[index],

                "temperature":
                    hourly[
                        "temperature_2m"
                    ][index],

                "humidity":
                    hourly[
                        "relative_humidity_2m"
                    ][index],

                "rain_probability":
                    hourly[
                        "precipitation_probability"
                    ][index],

                "precipitation":
                    hourly[
                        "precipitation"
                    ][index],

                "wind_speed":
                    hourly[
                        "wind_speed_10m"
                    ][index],

                "weather_code":
                    hourly[
                        "weather_code"
                    ][index]
            })

        # Small delay between requests

        if start + batch_size < len(route_points):
            time.sleep(1)


    print(
        f"\nSuccessfully received weather "
        f"for {len(results)} points."
    )

    return results