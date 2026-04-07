"""
GPS Geofence Service
══════════════════════════════════════════════════════════════════
Checks if a student's mobile GPS is inside their classroom boundary.
Uses Haversine formula — no hardware needed, purely phone GPS.

College hallways are ~15m wide, classrooms ~10–20m.
Default geofence radius = 30m (generous for GPS drift on mobile).
Admin can configure per-classroom in the DB.
══════════════════════════════════════════════════════════════════
"""
import math
from app.core.database import DBConn

EARTH_RADIUS_M = 6_371_000


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Straight-line distance in metres between two GPS coordinates."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi       = math.radians(lat2 - lat1)
    dlambda    = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return EARTH_RADIUS_M * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _get_classroom_gps(class_id: str) -> dict | None:
    """
    Look up the classroom GPS centre and allowed radius for a class session.
    Returns None if classroom GPS has not been configured in the DB.
    """
    with DBConn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT cl.latitude, cl.longitude, cl.radius_meters, cl.name
                FROM   classes    c
                JOIN   classrooms cl ON cl.id = c.classroom_id
                WHERE  c.id = %s
                """,
                (class_id,),
            )
            row = cur.fetchone()

    if row is None:
        return None

    return {
        "latitude":      float(row[0]),
        "longitude":     float(row[1]),
        "radius_meters": float(row[2]) if row[2] else 30.0,
        "room_name":     row[3],
    }


def check_location(class_id: str, student_lat: float, student_lon: float) -> dict:
    """
    Main function called by the verify-student route.

    Returns:
        inside          bool
        distance_meters float
        allowed_radius  float
        message         str
    """
    classroom = _get_classroom_gps(class_id)

    if classroom is None:
        # GPS not set for this classroom — skip check, log warning
        return {
            "inside":           True,
            "distance_meters":  0.0,
            "allowed_radius":   0.0,
            "message":          "Classroom GPS not configured — location check skipped",
        }

    distance = haversine_distance(
        student_lat, student_lon,
        classroom["latitude"], classroom["longitude"],
    )
    inside = distance <= classroom["radius_meters"]

    return {
        "inside":           inside,
        "distance_meters":  round(distance, 2),
        "allowed_radius":   classroom["radius_meters"],
        "message": (
            f"Inside {classroom['room_name']} ✓ ({distance:.1f}m from centre)"
            if inside else
            f"Outside classroom — {distance:.1f}m away "
            f"(allowed {classroom['radius_meters']}m from {classroom['room_name']})"
        ),
    }
