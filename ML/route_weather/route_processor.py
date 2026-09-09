from math import radians, sin, cos, sqrt, atan2
from datetime import timedelta


def calculate_distance(point1, point2):
    """
    Calculate distance between two coordinates.

    Points are:
    [longitude, latitude]

    Returns distance in kilometers.
    """

    lon1, lat1 = point1
    lon2, lat2 = point2

    R = 6371.0

    lat1 = radians(lat1)
    lat2 = radians(lat2)

    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)

    a = (
        sin(dlat / 2) ** 2
        + cos(lat1)
        * cos(lat2)
        * sin(dlon / 2) ** 2
    )

    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return R * c


def sample_route(coordinates, interval_km=30):
    """
    Select approximately one point every interval_km.
    Always includes the destination.
    """

    if not coordinates:
        return []

    sampled_points = []

    total_distance = 0
    last_sample_distance = 0

    # Add starting point
    sampled_points.append({
        "longitude": coordinates[0][0],
        "latitude": coordinates[0][1],
        "distance_from_start": 0
    })

    for i in range(1, len(coordinates)):

        segment_distance = calculate_distance(
            coordinates[i - 1],
            coordinates[i]
        )

        total_distance += segment_distance

        if total_distance - last_sample_distance >= interval_km:

            sampled_points.append({
                "longitude": coordinates[i][0],
                "latitude": coordinates[i][1],
                "distance_from_start": total_distance
            })

            last_sample_distance = total_distance

    # Always add destination
    last_point = coordinates[-1]

    if (
        sampled_points[-1]["longitude"] != last_point[0]
        or sampled_points[-1]["latitude"] != last_point[1]
    ):
        sampled_points.append({
            "longitude": last_point[0],
            "latitude": last_point[1],
            "distance_from_start": total_distance
        })

    return sampled_points


def add_arrival_times(
    points,
    total_route_distance,
    total_route_duration,
    departure_time
):
    """
    Estimate arrival time at each sampled route point.
    """

    result = []

    for point in points:

        distance = point["distance_from_start"]

        if total_route_distance > 0:
            fraction = distance / total_route_distance
        else:
            fraction = 0

        arrival_minutes = (
            fraction * total_route_duration
        )

        arrival_time = (
            departure_time
            + timedelta(minutes=arrival_minutes)
        )

        result.append({
            **point,
            "arrival_time": arrival_time
        })

    return result