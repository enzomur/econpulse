"""
Census County Business Patterns (CBP) Data Ingestion

Fetches establishment and employment counts by industry (NAICS).
"""
import argparse
import logging
import math
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

CBP_URL = "https://api.census.gov/data/2021/cbp"


def fetch_cbp_data(
    state_fips: str,
    county_fips: str,
    api_key: str,
    max_retries: int = 3,
) -> Optional[pd.DataFrame]:
    """
    Fetch County Business Patterns data.
    """
    params = {
        "get": "NAICS2017,NAICS2017_LABEL,ESTAB,EMP",
        "for": f"county:{county_fips}",
        "in": f"state:{state_fips}",
        "key": api_key,
    }

    for attempt in range(max_retries):
        try:
            response = requests.get(CBP_URL, params=params, timeout=60)
            response.raise_for_status()

            data = response.json()

            if len(data) < 2:
                logger.warning("No CBP data returned")
                return None

            df = pd.DataFrame(data[1:], columns=data[0])
            logger.info(f"Fetched {len(df)} industry records from CBP")
            return df

        except requests.exceptions.RequestException as e:
            wait_time = 2 ** attempt
            logger.warning(f"Request failed (attempt {attempt + 1}): {e}. Retrying in {wait_time}s...")
            time.sleep(wait_time)

    logger.error("Max retries exceeded for CBP API")
    return None


def calculate_diversity_index(df: pd.DataFrame) -> float:
    """
    Calculate Shannon entropy as a business diversity index.

    H = -Σ(p * log(p)) where p = share of establishments in each NAICS category
    Normalized to 0-1 range.
    """
    # Filter to 2-digit NAICS codes for broader industry categories
    df_2digit = df[df["NAICS2017"].str.len() == 2].copy()

    if df_2digit.empty:
        return 0.0

    df_2digit["ESTAB"] = pd.to_numeric(df_2digit["ESTAB"], errors="coerce").fillna(0)
    total_estab = df_2digit["ESTAB"].sum()

    if total_estab == 0:
        return 0.0

    # Calculate proportions
    df_2digit["proportion"] = df_2digit["ESTAB"] / total_estab

    # Shannon entropy
    entropy = 0.0
    for p in df_2digit["proportion"]:
        if p > 0:
            entropy -= p * math.log(p)

    # Normalize by max possible entropy (log of number of categories)
    n_categories = len(df_2digit)
    max_entropy = math.log(n_categories) if n_categories > 1 else 1

    diversity_index = entropy / max_entropy if max_entropy > 0 else 0

    return round(diversity_index, 4)


def distribute_to_tracts(
    county_data: dict,
    state_fips: str,
    county_fips: str,
    supabase_url: str,
    supabase_key: str,
) -> pd.DataFrame:
    """
    Distribute county-level data to tracts proportionally by population.
    """
    client = create_client(supabase_url, supabase_key)

    # Get tract populations from existing metrics
    geoid_prefix = f"{state_fips}{county_fips}"

    tracts = (
        client.table("tracts")
        .select("geoid")
        .like("geoid", f"{geoid_prefix}%")
        .execute()
    )

    if not tracts.data:
        logger.warning("No tracts found for county, checking tract_metrics")
        # Fallback: get from tract_metrics
        metrics = (
            client.table("tract_metrics")
            .select("geoid")
            .like("geoid", f"{geoid_prefix}%")
            .execute()
        )
        tract_list = [m["geoid"] for m in metrics.data] if metrics.data else []
    else:
        tract_list = [t["geoid"] for t in tracts.data]

    if not tract_list:
        logger.error("No tracts found for this county")
        return pd.DataFrame()

    # For now, distribute equally (later: use population proportions)
    n_tracts = len(tract_list)
    establishment_per_tract = county_data["establishment_count"] // n_tracts
    employment_per_tract = county_data["employment_count"] // n_tracts

    records = []
    for geoid in tract_list:
        records.append({
            "geoid": geoid,
            "establishment_count": establishment_per_tract,
            "employment_count": employment_per_tract,
            "business_diversity_index": county_data["diversity_index"],
        })

    return pd.DataFrame(records)


def upsert_to_supabase(df: pd.DataFrame, supabase_url: str, supabase_key: str) -> int:
    """
    Upsert business pattern data to Supabase.
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
                "establishment_count": int(row["establishment_count"]),
                "employment_count": int(row["employment_count"]),
                "business_diversity_index": float(row["business_diversity_index"]),
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
    parser = argparse.ArgumentParser(description="Fetch Census CBP data")
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

    logger.info(f"Fetching CBP data for state={args.state}, county={args.county}")

    # Fetch county-level data
    df = fetch_cbp_data(args.state, args.county, api_key)

    if df is None:
        logger.error("Failed to fetch CBP data")
        sys.exit(1)

    # Calculate county totals
    df["ESTAB"] = pd.to_numeric(df["ESTAB"], errors="coerce").fillna(0)
    df["EMP"] = pd.to_numeric(df["EMP"], errors="coerce").fillna(0)

    # Filter to total (NAICS = 00)
    total_row = df[df["NAICS2017"] == "00"]

    county_data = {
        "establishment_count": int(total_row["ESTAB"].sum()) if not total_row.empty else int(df["ESTAB"].sum()),
        "employment_count": int(total_row["EMP"].sum()) if not total_row.empty else int(df["EMP"].sum()),
        "diversity_index": calculate_diversity_index(df),
    }

    logger.info(f"County totals: {county_data}")

    # Distribute to tracts
    tract_df = distribute_to_tracts(
        county_data, args.state, args.county, supabase_url, supabase_key
    )

    if tract_df.empty:
        logger.error("No tract data to upsert")
        sys.exit(1)

    # Load to Supabase
    count = upsert_to_supabase(tract_df, supabase_url, supabase_key)
    logger.info(f"Successfully upserted {count} tract business patterns")


if __name__ == "__main__":
    main()
