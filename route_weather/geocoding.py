import requests


GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"


def get_coordinates(place):

    params = {
        "name": place,
        "count": 1,
        "language": "en",
        "format": "json"
    }

    response = requests.get(
        GEOCODING_URL,
        params=params,
        timeout=20
    )

    if response.status_code != 200:
        raise Exception(
            f"Geocoding failed: {response.status_code}"
        )

    data = response.json()

    if "results" not in data or not data["results"]:
        raise Exception(
            f"Location not found: {place}"
        )

    result = data["results"][0]

    return (
        result["latitude"],
        result["longitude"]
    )