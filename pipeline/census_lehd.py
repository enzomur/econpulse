"""
Census LEHD/LODES Worker Flow Data Ingestion

Downloads Origin-Destination Employment Statistics for workforce flow analysis.
This serves as a free proxy for foot traffic data.
"""
import argparse
import gzip
import logging
import os
import sys
import tempfile
from io import BytesIO
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

# LODES data URL template
LODES_URL = "https://lehd.ces.census.gov/data/lodes/LODES8/{state}/od/{state}_od_main_JT00_{year}.csv.gz"


def download_lodes_data(state: str, year: int = 2021) -> Optional[pd.DataFrame]:
    """
    Download LODES Origin-Destination data for a state.
    """
    url = LODES_URL.format(state=state.lower(), year=year)
    logger.info(f"Downloading LODES data from {url}")

    try:
        response = requests.get(url, timeout=300, stream=True)
        response.raise_for_status()

        # Decompress and read CSV
        with gzip.GzipFile(fileobj=BytesIO(response.content)) as f:
            df = pd.read_csv(f)

        logger.info(f"Downloaded {len(df)} OD records")
        return df

    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to download LODES data: {e}")
        return None
    except Exception as e:
        logger.error(f"Failed to parse LODES data: {e}")
        return None


def aggregate_to_tracts(df: pd.DataFrame, county_fips: Optional[str] = None) -> pd.DataFrame:
    """
    Aggregate block-level OD data to tract level.

    w_geocode = workplace Census block (15 digits)
    h_geocode = home Census block (15 digits)
    S000 = total jobs
    """
    # Extract tract codes (first 11 digits of block code)
    df["w_tract"] = df["w_geocode"].astype(str).str.zfill(15).str[:11]
    df["h_tract"] = df["h_geocode"].astype(str).str.zfill(15).str[:11]

    # Filter to county if specified
    if county_fips:
        state_county = df["w_tract"].str[:5]
        # county_fips should be full 5-digit state+county
        df = df[state_county == county_fips]
        logger.info(f"Filtered to {len(df)} records for county {county_fips}")

    # Aggregate worker inflows by workplace tract
    inflows = df.groupby("w_tract").agg(
        worker_inflow_count=("S000", "sum"),
        unique_home_tracts=("h_tract", "nunique"),
    ).reset_index()

    inflows = inflows.rename(columns={"w_tract": "geoid"})

    logger.info(f"Aggregated to {len(inflows)} tracts")
    return inflows


def upsert_to_supabase(df: pd.DataFrame, supabase_url: str, supabase_key: str) -> int:
    """
    Upsert worker inflow data to Supabase.
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
                "worker_inflow_count": int(row["worker_inflow_count"]),
            }

            client.table("tract_metrics").upsert(
                record,
                on_conflict="geoid,period",
            ).execute()

            success_count += 1

        except Exception as e:
            logger.error(f"Failed to upsert tract {row['geoid']}: {e}")

    return success_count


def main():
    parser = argparse.ArgumentParser(description="Fetch LEHD LODES worker flow data")
    parser.add_argument("--state", required=True, help="State abbreviation (e.g., ny)")
    parser.add_argument("--county", help="County FIPS to filter (5-digit state+county, e.g., 36061)")
    parser.add_argument("--year", type=int, default=2021, help="Data year (default: 2021)")
    args = parser.parse_args()

    # Validate inputs
    if len(args.state) != 2:
        logger.error("State must be 2-letter abbreviation")
        sys.exit(1)

    # Get environment variables
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

    if not supabase_url or not supabase_key:
        logger.error("Supabase credentials not set")
        sys.exit(1)

    logger.info(f"Fetching LEHD data for state={args.state}, year={args.year}")

    # Download data
    df = download_lodes_data(args.state, args.year)

    if df is None:
        logger.error("Failed to download LODES data")
        sys.exit(1)

    # Aggregate to tracts
    df = aggregate_to_tracts(df, args.county)

    # Load to Supabase
    count = upsert_to_supabase(df, supabase_url, supabase_key)
    logger.info(f"Successfully upserted {count} tract worker flows")


if __name__ == "__main__":
    main()
