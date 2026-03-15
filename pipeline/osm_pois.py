"""
OpenStreetMap Points of Interest Ingestion

Fetches business POIs using the Overpass API (free, no key required).
"""
import argparse
import logging
import os
import sys
import time
from typing import Optional

import pandas as pd
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# OSM tag to category mapping
TAG_CATEGORIES = {
    # Food & Beverage
    "restaurant": "food_beverage",
    "cafe": "food_beverage",
    "bar": "food_beverage",
    "fast_food": "food_beverage",
    "pub": "food_beverage",
    "food_court": "food_beverage",
    # Retail
    "shop": "retail",
    "supermarket": "retail",
    "convenience": "retail",
    "clothes": "retail",
    "department_store": "retail",
    # Professional Services
    "office": "professional_services",
    "coworking_space": "professional_services",
    # Financial
    "bank": "financial",
    "atm": "financial",
    # Education
    "school": "education",
    "university": "education",
    "college": "education",
    "library": "education",
    # Healthcare
    "hospital": "healthcare",
    "clinic": "healthcare",
    "pharmacy": "healthcare",
    "doctors": "healthcare",
    "dentist": "healthcare",
}


def build_overpass_query(bbox: str) -> str:
    """
    Build Overpass QL query for POIs within bounding box.
    bbox format: "min_lat,min_lon,max_lat,max_lon"
    """
    return f"""
    [out:json][timeout:120];
    (
      node["amenity"~"restaurant|cafe|bar|fast_food|bank|school|university|hospital|clinic|pharmacy"]({bbox});
      node["shop"]({bbox});
      node["office"]({bbox});
      way["amenity"~"restaurant|cafe|bar|fast_food|bank|school|university|hospital|clinic|pharmacy"]({bbox});
      way["shop"]({bbox});
      way["office"]({bbox});
    );
    out center;
    """


def categorize_poi(tags: dict) -> str:
    """
    Map OSM tags to simplified category.
    """
    # Check amenity tag first
    amenity = tags.get("amenity", "")
    if amenity in TAG_CATEGORIES:
        return TAG_CATEGORIES[amenity]

    # Check shop tag
    if "shop" in tags:
        return "retail"

    # Check office tag
    if "office" in tags:
        return "professional_services"

    return "other"


def fetch_pois(bbox: str, max_retries: int = 3) -> Optional[pd.DataFrame]:
    """
    Fetch POIs from Overpass API.
    """
    query = build_overpass_query(bbox)

    for attempt in range(max_retries):
        try:
            response = requests.post(
                OVERPASS_URL,
                data={"data": query},
                timeout=180,
            )
            response.raise_for_status()

            data = response.json()
            elements = data.get("elements", [])

            logger.info(f"Fetched {len(elements)} POIs from Overpass")

            records = []
            for el in elements:
                # Get coordinates (for ways, use center)
                if el["type"] == "node":
                    lat, lon = el["lat"], el["lon"]
                else:
                    center = el.get("center", {})
                    lat = center.get("lat")
                    lon = center.get("lon")
                    if not lat or not lon:
                        continue

                tags = el.get("tags", {})
                name = tags.get("name", "Unnamed")

                records.append({
                    "osm_id": f"{el['type']}/{el['id']}",
                    "name": name[:255] if name else "Unnamed",
                    "category": categorize_poi(tags),
                    "lat": lat,
                    "lon": lon,
                    "tags": tags,
                })

            return pd.DataFrame(records)

        except requests.exceptions.RequestException as e:
            wait_time = 2 ** attempt
            logger.warning(f"Overpass request failed (attempt {attempt + 1}): {e}. Retrying in {wait_time}s...")
            time.sleep(wait_time)

    logger.error("Max retries exceeded for Overpass API")
    return None


def assign_tracts(df: pd.DataFrame, supabase_url: str, supabase_key: str) -> pd.DataFrame:
    """
    Assign each POI to its Census tract using PostGIS spatial query.
    """
    client = create_client(supabase_url, supabase_key)

    # For now, we'll do this in batches via RPC
    # In production, you'd want to do a bulk spatial join

    geoids = []
    for _, row in df.iterrows():
        try:
            result = client.rpc(
                "get_tract_for_point",
                {"p_lon": row["lon"], "p_lat": row["lat"]}
            ).execute()

            geoid = result.data if result.data else None
            geoids.append(geoid)

            # Rate limit to be nice to the API
            time.sleep(0.05)

        except Exception as e:
            logger.debug(f"Could not assign tract for POI {row['osm_id']}: {e}")
            geoids.append(None)

    df["geoid"] = geoids

    # Filter out POIs without a tract assignment
    assigned = df[df["geoid"].notna()].copy()
    logger.info(f"Assigned {len(assigned)} of {len(df)} POIs to tracts")

    return assigned


def upsert_to_supabase(df: pd.DataFrame, supabase_url: str, supabase_key: str) -> int:
    """
    Upsert POIs to Supabase.
    """
    client = create_client(supabase_url, supabase_key)

    success_count = 0
    today = pd.Timestamp.now().strftime("%Y-%m-%d")

    for _, row in df.iterrows():
        try:
            record = {
                "osm_id": row["osm_id"],
                "geoid": row["geoid"],
                "name": row["name"],
                "category": row["category"],
                "source": "osm",
                "last_seen": today,
            }

            client.table("pois").upsert(
                record,
                on_conflict="osm_id",
            ).execute()

            success_count += 1

            # Rate limit
            time.sleep(0.1)

        except Exception as e:
            logger.error(f"Failed to upsert POI {row['osm_id']}: {e}")

    return success_count


def main():
    parser = argparse.ArgumentParser(description="Fetch OSM POI data")
    parser.add_argument(
        "--bbox",
        required=True,
        help="Bounding box: min_lat,min_lon,max_lat,max_lon (e.g., 40.70,-74.02,40.88,-73.90)",
    )
    args = parser.parse_args()

    # Validate bbox format
    try:
        parts = [float(x) for x in args.bbox.split(",")]
        if len(parts) != 4:
            raise ValueError("Expected 4 values")
    except ValueError as e:
        logger.error(f"Invalid bbox format: {e}")
        sys.exit(1)

    # Get environment variables
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

    if not supabase_url or not supabase_key:
        logger.error("Supabase credentials not set")
        sys.exit(1)

    logger.info(f"Fetching OSM POIs for bbox={args.bbox}")

    # Fetch POIs
    df = fetch_pois(args.bbox)

    if df is None or df.empty:
        logger.error("No POI data fetched")
        sys.exit(1)

    # Log category counts
    category_counts = df["category"].value_counts()
    logger.info(f"POI counts by category:\n{category_counts}")

    # Assign to tracts (skip if no tracts table populated yet)
    # df = assign_tracts(df, supabase_url, supabase_key)

    # For initial load without tract boundaries, skip tract assignment
    logger.info("Skipping tract assignment (tracts table not yet populated)")
    df["geoid"] = None

    # Upsert to Supabase
    count = upsert_to_supabase(df, supabase_url, supabase_key)
    logger.info(f"Successfully upserted {count} POIs")


if __name__ == "__main__":
    main()
