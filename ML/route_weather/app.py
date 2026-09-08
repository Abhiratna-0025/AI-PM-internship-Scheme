import json
import os
from datetime import datetime

from geocoding import get_coordinates
from route_api import get_route
from route_processor import (
    sample_route,
    add_arrival_times
)
from weather_api import get_weather_for_route
from analyzer import analyze_route


# ==========================================
# USER INPUT
# ==========================================

print("\n================================")
print("       WEATHERGPT ROUTE WEATHER")
print("================================")

origin_name = input(
    "\nEnter starting location: "
).strip()

destination_name = input(
    "Enter destination: "
).strip()


departure_input = input(
    "Enter departure time (HH:MM): "
).strip()


# ==========================================
# CONVERT LOCATIONS TO COORDINATES
# ==========================================

print("\nFinding locations...")


origin = get_coordinates(
    origin_name
)

destination = get_coordinates(
    destination_name
)


print(
    f"{origin_name}: "
    f"{origin}"
)

print(
    f"{destination_name}: "
    f"{destination}"
)


# ==========================================
# DEPARTURE TIME
# ==========================================

today = datetime.now().strftime(
    "%Y-%m-%d"
)


departure_time = datetime.strptime(
    f"{today} {departure_input}",
    "%Y-%m-%d %H:%M"
)


# ==========================================
# GET ROUTE
# ==========================================

print("\n==============================")
print("GETTING ROUTE")
print("==============================")


route = get_route(
    origin,
    destination
)


print(
    f"Distance: "
    f"{route['distance_km']:.2f} km"
)


print(
    f"Travel time: "
    f"{route['duration_minutes']:.2f} minutes"
)


print(
    f"Route coordinates: "
    f"{len(route['coordinates'])}"
)


# ==========================================
# SAMPLE ROUTE
# ==========================================

print("\n==============================")
print("SAMPLING ROUTE")
print("==============================")


route_points = sample_route(
    route["coordinates"],
    interval_km=30
)


print(
    f"Weather points: "
    f"{len(route_points)}"
)


# ==========================================
# ARRIVAL TIMES
# ==========================================

route_points = add_arrival_times(

    route_points,

    route["distance_km"],

    route["duration_minutes"],

    departure_time

)


# ==========================================
# WEATHER
# ==========================================

print("\n==============================")
print("GETTING WEATHER")
print("==============================")


weather_data = get_weather_for_route(
    route_points
)


# ==========================================
# ANALYZE
# ==========================================

print("\n==============================")
print("ANALYZING WEATHER")
print("==============================")


analyzed_data = analyze_route(
    weather_data
)


# ==========================================
# PRINT REPORT
# ==========================================

print("\n==============================")
print("ROUTE WEATHER REPORT")
print("==============================")


for weather in analyzed_data:

    print("\n--------------------------------")

    print(
        f"Distance: "
        f"{weather['distance_from_start']:.1f} km"
    )

    print(
        f"Arrival: "
        f"{weather['arrival_time'].strftime('%H:%M')}"
    )

    print(
        f"Condition: "
        f"{weather['condition']}"
    )

    print(
        f"Temperature: "
        f"{weather['temperature']} °C"
    )

    print(
        f"Rain probability: "
        f"{weather['rain_probability']}%"
    )

    print(
        f"Wind: "
        f"{weather['wind_speed']} km/h"
    )

    print(
        f"Risk: "
        f"{weather['risk']}"
    )


# ==========================================
# CREATE MAP DATA
# ==========================================

map_data = {

    "route": [

        [
            coordinate[1],
            coordinate[0]
        ]

        for coordinate
        in route["coordinates"]

    ],


    "weather_points": [

        {

            **weather,

            "arrival_time":
                weather[
                    "arrival_time"
                ].isoformat(),

            "weather_time":
                weather[
                    "weather_time"
                ].isoformat()

        }

        for weather
        in analyzed_data

    ],


    "route_info": {

        "origin":
            origin_name,

        "destination":
            destination_name,

        "distance_km":
            route["distance_km"],

        "duration_minutes":
            route[
                "duration_minutes"
            ],

        "departure_time":
            departure_time.isoformat()

    }

}


# ==========================================
# SAVE MAP JSON
# ==========================================

map_folder = os.path.join(

    os.path.dirname(__file__),

    "map"

)


os.makedirs(

    map_folder,

    exist_ok=True

)


json_path = os.path.join(

    map_folder,

    "route_weather_data.json"

)


with open(

    json_path,

    "w",

    encoding="utf-8"

) as file:

    json.dump(

        map_data,

        file,

        indent=2

    )


print("\n================================")
print("MAP DATA CREATED")
print("================================")

print(
    f"Saved to:\n{json_path}"
)


# ==========================================
# RISK SUMMARY
# ==========================================

high = sum(

    1

    for item
    in analyzed_data

    if item["risk"] == "HIGH"

)


moderate = sum(

    1

    for item
    in analyzed_data

    if item["risk"] == "MODERATE"

)


low = sum(

    1

    for item
    in analyzed_data

    if item["risk"] == "LOW"

)


print("\n==============================")
print("RISK SUMMARY")
print("==============================")


print(
    f"🔴 HIGH: {high}"
)

print(
    f"🟠 MODERATE: {moderate}"
)

print(
    f"🟢 LOW: {low}"
)


print("\nWeatherGPT route analysis complete!")