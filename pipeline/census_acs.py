"""
Census American Community Survey (ACS) 5-Year Data Ingestion

Fetches demographic and economic data at the Census tract level.
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

# Configure logging - never log API keys
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# ACS 5-Year variables to fetch
ACS_VARIABLES = {
    "B19013_001E": "median_household_income",
    "B01003_001E": "total_population",
    "B25001_001E": "total_housing_units",
    "B25002_003E": "vacant_units",
    "B15003_022E": "edu_bachelors",
    "B15003_023E": "edu_masters",
    "B15003_024E": "edu_professional",
    "B15003_025E": "edu_doctorate",
}

BASE_URL = "https://api.census.gov/data/2022/acs/acs5"


def fetch_acs_data(
    state_fips: str,
    county_fips: str,
    api_key: str,
    max_retries: int = 3,
) -> Optional[pd.DataFrame]:
    """
    Fetch ACS 5-year data for all tracts in a county.
    """
    variables = ",".join(ACS_VARIABLES.keys())

    params = {
        "get": f"NAME,{variables}",
        "for": "tract:*",
        "in": f"state:{state_fips} county:{county_fips}",
        "key": api_key,
    }

    for attempt in range(max_retries):
        try:
            response = requests.get(BASE_URL, params=params, timeout=60)
            response.raise_for_status()

            data = response.json()

            if len(data) < 2:
                logger.warning("No data returned from Census API")
                return None

            # First row is header
            df = pd.DataFrame(data[1:], columns=data[0])
            logger.info(f"Fetched {len(df)} tracts from Census ACS")
            return df

        except requests.exceptions.RequestException as e:
            wait_time = 2 ** attempt
            logger.warning(f"Request failed (attempt {attempt + 1}): {e}. Retrying in {wait_time}s...")
            time.sleep(wait_time)

    logger.error("Max retries exceeded for Census ACS API")
    return None


def transform_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean and transform ACS data.
    """
    # Construct GEOID (11-digit FIPS: state + county + tract)
    df["geoid"] = df["state"] + df["county"] + df["tract"]

    # Rename columns
    rename_map = {old: new for old, new in ACS_VARIABLES.items()}
    df = df.rename(columns=rename_map)

    # Convert to numeric
    numeric_cols = list(ACS_VARIABLES.values())
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # Calculate derived metrics
    df["vacancy_rate"] = df["vacant_units"] / df["total_housing_units"]
    df["vacancy_rate"] = df["vacancy_rate"].fillna(0).clip(0, 1)

    df["college_educated"] = (
        df["edu_bachelors"] + df["edu_masters"] + df["edu_professional"] + df["edu_doctorate"]
    )

    # Select final columns
    result = df[
        [
            "geoid",
            "NAME",
            "median_household_income",
            "total_population",
            "total_housing_units",
            "vacant_units",
            "vacancy_rate",
            "college_educated",
        ]
    ].copy()

    result = result.rename(columns={"NAME": "name"})

    return result


def upsert_to_supabase(df: pd.DataFrame, supabase_url: str, supabase_key: str) -> int:
    """
    Upsert tract metrics to Supabase.
    """
    client = create_client(supabase_url, supabase_key)

    success_count = 0
    today = pd.Timestamp.now().strftime("%Y-%m-%d")

    for _, row in df.iterrows():
        try:
            record = {
                "geoid": row["geoid"],
                "period": today,
                "period_type": "annual",
                "median_household_income": (
                    float(row["median_household_income"])
                    if pd.notna(row["median_household_income"])
                    else None
                ),
            }

            # Upsert to tract_metrics
            client.table("tract_metrics").upsert(
                record,
                on_conflict="geoid,period",
            ).execute()

            success_count += 1

        except Exception as e:
            logger.error(f"Failed to upsert tract {row['geoid']}: {e}")

    return success_count


def main():
    parser = argparse.ArgumentParser(description="Fetch Census ACS data")
    parser.add_argument("--state", required=True, help="State FIPS code (e.g., 36)")
    parser.add_argument("--county", required=True, help="County FIPS code (e.g., 061)")
    args = parser.parse_args()

    # Validate inputs
    if not args.state.isdigit() or len(args.state) != 2:
        logger.error("State FIPS must be a 2-digit number")
        sys.exit(1)

    if not args.county.isdigit() or len(args.county) != 3:
        logger.error("County FIPS must be a 3-digit number")
        sys.exit(1)

    # Get environment variables
    api_key = os.getenv("CENSUS_API_KEY")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

    if not api_key:
        logger.error("CENSUS_API_KEY not set")
        sys.exit(1)

    if not supabase_url or not supabase_key:
        logger.error("Supabase credentials not set")
        sys.exit(1)

    logger.info(f"Fetching ACS data for state={args.state}, county={args.county}")

    # Fetch data
    df = fetch_acs_data(args.state, args.county, api_key)

    if df is None:
        logger.error("Failed to fetch ACS data")
        sys.exit(1)

    # Transform
    df = transform_data(df)
    logger.info(f"Transformed {len(df)} records")

    # Load
    count = upsert_to_supabase(df, supabase_url, supabase_key)
    logger.info(f"Successfully upserted {count} tract metrics")


if __name__ == "__main__":
    main()
