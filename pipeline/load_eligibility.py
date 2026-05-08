"""
Load federal program eligibility data (Opportunity Zones, etc.)

Opportunity Zone data source: IRS/Treasury designated tracts
https://www.cdfifund.gov/opportunity-zones
"""
import logging
import os
import sys

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Manhattan (New York County, FIPS 36061) Opportunity Zone tracts
# Source: https://www.cdfifund.gov/opportunity-zones
MANHATTAN_OPPORTUNITY_ZONES = [
    "36061000900",  # Tract 9 - Chinatown
    "36061001600",  # Tract 16 - Lower East Side
    "36061002201",  # Tract 22.01 - East Village
    "36061002600",  # Tract 26 - Lower East Side
    "36061002700",  # Tract 27 - Lower East Side
    "36061002900",  # Tract 29 - Lower East Side
    "36061003000",  # Tract 30 - Lower East Side
    "36061003200",  # Tract 32 - Lower East Side
    "36061003600",  # Tract 36 - Stuyvesant Town
    "36061004100",  # Tract 41 - Gramercy
    "36061014300",  # Tract 143 - Central Harlem
    "36061016900",  # Tract 169 - Central Harlem
    "36061017500",  # Tract 175 - Central Harlem
    "36061019700",  # Tract 197 - Central Harlem
    "36061019900",  # Tract 199 - Central Harlem
    "36061020100",  # Tract 201 - Central Harlem
    "36061020300",  # Tract 203 - Central Harlem
    "36061020700",  # Tract 207 - Central Harlem
    "36061020900",  # Tract 209 - Central Harlem
    "36061021100",  # Tract 211 - Central Harlem
    "36061021500",  # Tract 215 - Central Harlem
    "36061021700",  # Tract 217 - Central Harlem
    "36061021900",  # Tract 219 - Central Harlem
    "36061022301",  # Tract 223.01 - East Harlem
    "36061022302",  # Tract 223.02 - East Harlem
    "36061022500",  # Tract 225 - East Harlem
    "36061022900",  # Tract 229 - East Harlem
    "36061023100",  # Tract 231 - East Harlem
    "36061023300",  # Tract 233 - East Harlem
    "36061023700",  # Tract 237 - East Harlem
    "36061023900",  # Tract 239 - East Harlem
    "36061024100",  # Tract 241 - East Harlem
    "36061026100",  # Tract 261 - Washington Heights
    "36061026300",  # Tract 263 - Washington Heights
    "36061026700",  # Tract 267 - Washington Heights
    "36061026900",  # Tract 269 - Washington Heights
    "36061027100",  # Tract 271 - Washington Heights
    "36061027700",  # Tract 277 - Washington Heights
    "36061027900",  # Tract 279 - Washington Heights
    "36061028100",  # Tract 281 - Washington Heights
    "36061028300",  # Tract 283 - Washington Heights
    "36061028500",  # Tract 285 - Washington Heights
    "36061028700",  # Tract 287 - Washington Heights
    "36061028900",  # Tract 289 - Inwood
    "36061029300",  # Tract 293 - Inwood
    "36061029500",  # Tract 295 - Inwood
    "36061029700",  # Tract 297 - Inwood
    "36061030500",  # Tract 305 - Marble Hill
]


def main():
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

    if not supabase_url or not supabase_key:
        logger.error("Supabase credentials not set")
        sys.exit(1)

    client = create_client(supabase_url, supabase_key)

    # Get all Manhattan tracts
    result = client.table("tracts").select("geoid").eq("state_fips", "36").eq("county_fips", "061").execute()
    all_tracts = {row["geoid"] for row in result.data}

    logger.info(f"Found {len(all_tracts)} tracts in Manhattan")

    success_count = 0
    oz_count = 0

    for geoid in all_tracts:
        is_oz = geoid in MANHATTAN_OPPORTUNITY_ZONES

        try:
            record = {
                "geoid": geoid,
                "opportunity_zone": is_oz,
                "designation_year": 2018 if is_oz else None,
            }

            client.table("tract_eligibility").upsert(
                record,
                on_conflict="geoid",
            ).execute()

            success_count += 1
            if is_oz:
                oz_count += 1

        except Exception as e:
            logger.error(f"Failed to upsert eligibility for {geoid}: {e}")

    logger.info(f"Successfully loaded eligibility for {success_count} tracts")
    logger.info(f"Marked {oz_count} tracts as Opportunity Zones")


if __name__ == "__main__":
    main()
