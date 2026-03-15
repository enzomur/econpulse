"""
Vitality Score Computation Engine

Computes composite economic vitality scores for each Census tract.
"""
import argparse
import json
import logging
import os
import sys
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Default scoring weights
DEFAULT_WEIGHTS = {
    "employment_density": 0.25,
    "formation_rate": 0.20,
    "workforce_inflow": 0.20,
    "income_growth": 0.20,
    "diversity": 0.15,
}


def load_weights(weights_file: Optional[str] = None) -> dict:
    """
    Load scoring weights from config file or use defaults.
    """
    if weights_file and Path(weights_file).exists():
        with open(weights_file) as f:
            weights = json.load(f)
            logger.info(f"Loaded weights from {weights_file}")
            return weights

    # Check default location
    default_path = Path(__file__).parent.parent / "configs" / "score_weights.json"
    if default_path.exists():
        with open(default_path) as f:
            weights = json.load(f)
            logger.info(f"Loaded weights from {default_path}")
            return weights

    logger.info("Using default weights")
    return DEFAULT_WEIGHTS


def fetch_tract_data(supabase_url: str, supabase_key: str) -> pd.DataFrame:
    """
    Fetch latest tract metrics from Supabase.
    """
    client = create_client(supabase_url, supabase_key)

    # Get the latest period for each tract
    result = client.rpc("get_latest_tract_metrics").execute()

    if not result.data:
        # Fallback: direct query
        result = (
            client.table("tract_metrics")
            .select("*")
            .order("period", desc=True)
            .execute()
        )

    if not result.data:
        return pd.DataFrame()

    df = pd.DataFrame(result.data)
    logger.info(f"Fetched metrics for {len(df)} tracts")
    return df


def fetch_tract_areas(supabase_url: str, supabase_key: str) -> pd.DataFrame:
    """
    Fetch tract area data for density calculations.
    """
    client = create_client(supabase_url, supabase_key)

    result = client.table("tracts").select("geoid,area_sq_km").execute()

    if not result.data:
        return pd.DataFrame()

    return pd.DataFrame(result.data)


def compute_percentile_scores(series: pd.Series) -> pd.Series:
    """
    Convert raw values to percentile rank scores (0-100).
    """
    # Handle missing values
    valid_mask = series.notna()
    result = pd.Series(index=series.index, dtype=float)

    if valid_mask.sum() == 0:
        return result.fillna(50)  # Default to median if no data

    # Compute percentile ranks
    ranks = series[valid_mask].rank(pct=True) * 100
    result[valid_mask] = ranks

    # Fill missing with median
    result = result.fillna(50)

    return result


def compute_scores(df: pd.DataFrame, areas: pd.DataFrame, weights: dict) -> pd.DataFrame:
    """
    Compute vitality sub-scores and composite score for each tract.
    """
    # Merge with areas for density calculation
    if not areas.empty:
        df = df.merge(areas, on="geoid", how="left")
    else:
        df["area_sq_km"] = 1  # Fallback

    # Compute employment density
    df["employment_density"] = df["employment_count"] / df["area_sq_km"].replace(0, 1)

    # Compute percentile scores for each metric
    scores = pd.DataFrame({"geoid": df["geoid"]})

    # Employment density score
    scores["employment_density_score"] = compute_percentile_scores(df["employment_density"])

    # Business formation rate score (using establishment count as proxy for now)
    if "business_formation_rate" in df.columns:
        scores["formation_rate_score"] = compute_percentile_scores(df["business_formation_rate"])
    else:
        scores["formation_rate_score"] = compute_percentile_scores(df["establishment_count"])

    # Workforce inflow score
    scores["workforce_inflow_score"] = compute_percentile_scores(df["worker_inflow_count"])

    # Income score (using level as proxy for growth)
    scores["income_growth_score"] = compute_percentile_scores(df["median_household_income"])

    # Diversity score
    scores["diversity_score"] = compute_percentile_scores(df["business_diversity_index"])

    # Compute composite score (weighted sum)
    scores["composite_score"] = (
        scores["employment_density_score"] * weights.get("employment_density", 0.25)
        + scores["formation_rate_score"] * weights.get("formation_rate", 0.20)
        + scores["workforce_inflow_score"] * weights.get("workforce_inflow", 0.20)
        + scores["income_growth_score"] * weights.get("income_growth", 0.20)
        + scores["diversity_score"] * weights.get("diversity", 0.15)
    )

    # Round all scores
    score_cols = [c for c in scores.columns if c.endswith("_score")]
    scores[score_cols] = scores[score_cols].round(2)

    # Add period from source data
    scores["period"] = df["period"].iloc[0] if "period" in df.columns else pd.Timestamp.now().strftime("%Y-%m-%d")

    logger.info(f"Computed scores for {len(scores)} tracts")
    logger.info(f"Composite score range: {scores['composite_score'].min():.1f} - {scores['composite_score'].max():.1f}")

    return scores


def upsert_scores(
    scores: pd.DataFrame,
    weights: dict,
    supabase_url: str,
    supabase_key: str,
) -> int:
    """
    Upsert vitality scores to Supabase.
    """
    client = create_client(supabase_url, supabase_key)

    success_count = 0
    now = pd.Timestamp.now().isoformat()

    for _, row in scores.iterrows():
        try:
            record = {
                "geoid": row["geoid"],
                "period": row["period"],
                "employment_density_score": float(row["employment_density_score"]),
                "formation_rate_score": float(row["formation_rate_score"]),
                "workforce_inflow_score": float(row["workforce_inflow_score"]),
                "income_growth_score": float(row["income_growth_score"]),
                "diversity_score": float(row["diversity_score"]),
                "composite_score": float(row["composite_score"]),
                "score_weights": weights,
                "computed_at": now,
            }

            client.table("vitality_scores").upsert(
                record,
                on_conflict="geoid,period",
            ).execute()

            success_count += 1

        except Exception as e:
            logger.error(f"Failed to upsert score for tract {row['geoid']}: {e}")

    return success_count


def main():
    parser = argparse.ArgumentParser(description="Compute vitality scores")
    parser.add_argument(
        "--weights-file",
        help="Path to JSON file with custom scoring weights",
    )
    args = parser.parse_args()

    # Get environment variables
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

    if not supabase_url or not supabase_key:
        logger.error("Supabase credentials not set")
        sys.exit(1)

    # Load weights
    weights = load_weights(args.weights_file)
    logger.info(f"Using weights: {weights}")

    # Fetch data
    df = fetch_tract_data(supabase_url, supabase_key)

    if df.empty:
        logger.error("No tract metrics found")
        sys.exit(1)

    # Fetch areas
    areas = fetch_tract_areas(supabase_url, supabase_key)

    # Compute scores
    scores = compute_scores(df, areas, weights)

    # Upsert to database
    count = upsert_scores(scores, weights, supabase_url, supabase_key)
    logger.info(f"Successfully upserted {count} vitality scores")


if __name__ == "__main__":
    main()
