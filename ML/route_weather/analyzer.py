def get_weather_condition(weather_code):

    conditions = {

        0: "Clear sky",

        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Cloudy",

        45: "Foggy",
        48: "Foggy",

        51: "Drizzle",
        53: "Drizzle",
        55: "Drizzle",

        56: "Freezing drizzle",
        57: "Freezing drizzle",

        61: "Rain",
        63: "Rain",
        65: "Heavy rain",

        66: "Freezing rain",
        67: "Freezing rain",

        71: "Snow",
        73: "Snow",
        75: "Heavy snow",
        77: "Snow",

        80: "Rain showers",
        81: "Rain showers",
        82: "Heavy rain showers",

        85: "Snow showers",
        86: "Snow showers",

        95: "Thunderstorm",
        96: "Thunderstorm with hail",
        99: "Thunderstorm with hail"
    }

    return conditions.get(
        weather_code,
        "Unknown"
    )


def calculate_risk(
    rain_probability,
    precipitation,
    wind_speed,
    weather_code
):

    score = 0

    # Rain probability
    if rain_probability >= 70:
        score += 3

    elif rain_probability >= 40:
        score += 2

    elif rain_probability >= 20:
        score += 1

    # Precipitation
    if precipitation >= 5:
        score += 3

    elif precipitation >= 2:
        score += 2

    elif precipitation > 0:
        score += 1

    # Wind
    if wind_speed >= 50:
        score += 3

    elif wind_speed >= 30:
        score += 2

    elif wind_speed >= 20:
        score += 1

    # Severe weather
    if weather_code in [95, 96, 99]:
        score += 4

    # Final risk
    if score >= 6:
        return "HIGH"

    elif score >= 3:
        return "MODERATE"

    return "LOW"


def analyze_weather(weather):

    condition = get_weather_condition(
        weather["weather_code"]
    )

    risk = calculate_risk(
        weather["rain_probability"],
        weather["precipitation"],
        weather["wind_speed"],
        weather["weather_code"]
    )

    return {

        "latitude":
            weather["latitude"],

        "longitude":
            weather["longitude"],

        "distance_from_start":
            weather["distance_from_start"],

        "arrival_time":
            weather["arrival_time"],

        "weather_time":
            weather["weather_time"],

        "temperature":
            weather["temperature"],

        "humidity":
            weather["humidity"],

        "rain_probability":
            weather["rain_probability"],

        "precipitation":
            weather["precipitation"],

        "wind_speed":
            weather["wind_speed"],

        "weather_code":
            weather["weather_code"],

        "condition":
            condition,

        "risk":
            risk
    }


def analyze_route(weather_data):

    return [
        analyze_weather(weather)
        for weather in weather_data
    ]