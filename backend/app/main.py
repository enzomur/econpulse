"""
EconPulse API - Economic Intelligence Platform
"""
import os
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from supabase import create_client, Client

load_dotenv()

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="EconPulse API",
    description="Economic Intelligence Platform for BIDs & EDOs",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client
def get_supabase() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not url or not key:
        raise HTTPException(status_code=500, detail="Database configuration missing")
    return create_client(url, key)


# Pydantic models for request/response validation
class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str = "1.0.0"


class ReportRequest(BaseModel):
    geoid: str = Field(..., min_length=11, max_length=11, pattern=r"^\d{11}$")
    period: Optional[str] = None


class ReportResponse(BaseModel):
    job_id: str
    status: str


# Error handler for production
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if os.getenv("ENVIRONMENT") == "production":
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )
    raise exc


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="ok",
        timestamp=datetime.utcnow().isoformat(),
    )


@app.get("/api/tracts")
@limiter.limit("100/minute")
async def get_tracts(
    request: Request,
    state: str = Query(..., min_length=2, max_length=2, pattern=r"^\d{2}$"),
    county: str = Query(..., min_length=3, max_length=3, pattern=r"^\d{3}$"),
    period: Optional[str] = Query(None),
):
    """
    Get all tracts for a state/county as GeoJSON with vitality scores.
    """
    supabase = get_supabase()

    # Get tracts with geometries via RPC
    tracts = supabase.rpc(
        "get_tracts_geojson",
        {"p_state_fips": state, "p_county_fips": county}
    ).execute()

    if not tracts.data:
        return {"type": "FeatureCollection", "features": []}

    # Get latest scores for these tracts
    geoids = [t["geoid"] for t in tracts.data]
    scores = (
        supabase.table("vitality_scores")
        .select("*")
        .in_("geoid", geoids)
        .order("period", desc=True)
        .execute()
    )

    # Build a map of geoid -> latest score
    score_map = {}
    for s in scores.data or []:
        if s["geoid"] not in score_map:
            score_map[s["geoid"]] = s

    # Build GeoJSON features
    features = []
    for tract in tracts.data:
        score = score_map.get(tract["geoid"], {})
        features.append({
            "type": "Feature",
            "geometry": tract.get("geometry_json"),
            "properties": {
                "geoid": tract["geoid"],
                "name": tract["name"],
                "state_fips": tract["state_fips"],
                "county_fips": tract["county_fips"],
                "tract_fips": tract["tract_fips"],
                "area_sq_km": tract["area_sq_km"],
                "composite_score": score.get("composite_score"),
                "employment_density_score": score.get("employment_density_score"),
                "formation_rate_score": score.get("formation_rate_score"),
                "workforce_inflow_score": score.get("workforce_inflow_score"),
                "income_growth_score": score.get("income_growth_score"),
                "diversity_score": score.get("diversity_score"),
            }
        })

    return {"type": "FeatureCollection", "features": features}


@app.get("/api/tract/{geoid}")
@limiter.limit("100/minute")
async def get_tract_detail(
    request: Request,
    geoid: str,
):
    """
    Get detailed data for a single tract.
    """
    if not geoid or len(geoid) != 11 or not geoid.isdigit():
        raise HTTPException(status_code=400, detail="Invalid GEOID format")

    supabase = get_supabase()

    # Get tract info
    tract = supabase.table("tracts").select("*").eq("geoid", geoid).single().execute()

    if not tract.data:
        raise HTTPException(status_code=404, detail="Tract not found")

    # Get score history (last 8 periods)
    scores = (
        supabase.table("vitality_scores")
        .select("*")
        .eq("geoid", geoid)
        .order("period", desc=True)
        .limit(8)
        .execute()
    )

    # Get latest metrics
    metrics = (
        supabase.table("tract_metrics")
        .select("*")
        .eq("geoid", geoid)
        .order("period", desc=True)
        .limit(1)
        .execute()
    )

    # Get POI counts by category (direct query instead of RPC)
    pois_result = supabase.table("pois").select("category").eq("geoid", geoid).execute()
    poi_counts = {}
    for p in pois_result.data or []:
        cat = p.get("category", "other")
        poi_counts[cat] = poi_counts.get(cat, 0) + 1
    pois_data = [{"category": k, "count": v} for k, v in poi_counts.items()]

    # Calculate trend
    trend = "flat"
    if scores.data and len(scores.data) >= 3:
        recent_scores = [s["composite_score"] for s in scores.data[:3]]
        if recent_scores[0] > recent_scores[2] + 5:
            trend = "up"
        elif recent_scores[0] < recent_scores[2] - 5:
            trend = "down"

    return {
        "tract": tract.data,
        "scores": scores.data,
        "metrics": metrics.data[0] if metrics.data else None,
        "poi_counts": pois_data,
        "trend": trend,
    }


@app.get("/api/alerts")
@limiter.limit("100/minute")
async def get_alerts(
    request: Request,
    geoid: Optional[str] = Query(None, min_length=11, max_length=11),
    alert_type: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
):
    """
    Get recent alerts, optionally filtered by tract or type.
    """
    supabase = get_supabase()

    query = supabase.table("alerts").select("*").order("triggered_at", desc=True).limit(limit)

    if geoid:
        query = query.eq("geoid", geoid)
    if alert_type:
        query = query.eq("alert_type", alert_type)

    result = query.execute()

    return {"alerts": result.data}


@app.get("/api/voids")
@limiter.limit("100/minute")
async def get_voids(
    request: Request,
    state: str = Query(..., min_length=2, max_length=2, pattern=r"^\d{2}$"),
    county: str = Query(..., min_length=3, max_length=3, pattern=r"^\d{3}$"),
    category: str = Query(..., min_length=1),
    min_inflow: int = Query(100, ge=0),
):
    """
    Find opportunity voids - high traffic areas underserved for a category.
    """
    supabase = get_supabase()

    result = supabase.rpc(
        "find_opportunity_voids_with_coords",
        {
            "p_state_fips": state,
            "p_county_fips": county,
            "p_category": category,
            "p_min_inflow": min_inflow,
        }
    ).execute()

    return {"voids": result.data if result.data else []}


@app.post("/api/report", response_model=ReportResponse)
@limiter.limit("10/minute")
async def generate_report(
    request: Request,
    body: ReportRequest,
):
    """
    Trigger PDF report generation for a tract.
    """
    import uuid

    job_id = str(uuid.uuid4())

    # TODO: Queue report generation job
    # For now, return job ID for polling

    return ReportResponse(
        job_id=job_id,
        status="queued",
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
