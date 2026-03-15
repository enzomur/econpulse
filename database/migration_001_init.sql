-- EconPulse Database Schema
-- Run this in Supabase SQL Editor

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- Table: tracts
-- One row per Census tract
-- ============================================
CREATE TABLE IF NOT EXISTS tracts (
    geoid TEXT PRIMARY KEY,  -- 11-digit FIPS code (state + county + tract)
    state_fips TEXT NOT NULL,
    county_fips TEXT NOT NULL,
    tract_fips TEXT NOT NULL,
    name TEXT,
    geometry GEOMETRY(MultiPolygon, 4326),
    area_sq_km NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for spatial queries
CREATE INDEX IF NOT EXISTS idx_tracts_geometry ON tracts USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_tracts_state_county ON tracts (state_fips, county_fips);

-- ============================================
-- Table: tract_metrics
-- Time-series metrics per tract
-- ============================================
CREATE TABLE IF NOT EXISTS tract_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    geoid TEXT NOT NULL REFERENCES tracts(geoid) ON DELETE CASCADE,
    period DATE NOT NULL,  -- First day of reporting period
    period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'annual')),

    -- Employment metrics
    employment_count INTEGER,
    establishment_count INTEGER,
    worker_inflow_count INTEGER,

    -- Economic metrics
    median_household_income NUMERIC,
    business_diversity_index NUMERIC CHECK (business_diversity_index >= 0 AND business_diversity_index <= 1),
    business_formation_rate NUMERIC,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(geoid, period)
);

CREATE INDEX IF NOT EXISTS idx_tract_metrics_geoid ON tract_metrics (geoid);
CREATE INDEX IF NOT EXISTS idx_tract_metrics_period ON tract_metrics (period DESC);

-- ============================================
-- Table: vitality_scores
-- Computed scores per tract per period
-- ============================================
CREATE TABLE IF NOT EXISTS vitality_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    geoid TEXT NOT NULL REFERENCES tracts(geoid) ON DELETE CASCADE,
    period DATE NOT NULL,

    -- Individual scores (0-100 scale)
    employment_density_score NUMERIC CHECK (employment_density_score >= 0 AND employment_density_score <= 100),
    formation_rate_score NUMERIC CHECK (formation_rate_score >= 0 AND formation_rate_score <= 100),
    workforce_inflow_score NUMERIC CHECK (workforce_inflow_score >= 0 AND workforce_inflow_score <= 100),
    income_growth_score NUMERIC CHECK (income_growth_score >= 0 AND income_growth_score <= 100),
    diversity_score NUMERIC CHECK (diversity_score >= 0 AND diversity_score <= 100),

    -- Composite score
    composite_score NUMERIC CHECK (composite_score >= 0 AND composite_score <= 100),

    -- Store the weights used for this calculation
    score_weights JSONB,

    computed_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(geoid, period)
);

CREATE INDEX IF NOT EXISTS idx_vitality_scores_geoid ON vitality_scores (geoid);
CREATE INDEX IF NOT EXISTS idx_vitality_scores_period ON vitality_scores (period DESC);
CREATE INDEX IF NOT EXISTS idx_vitality_scores_composite ON vitality_scores (composite_score DESC);

-- ============================================
-- Table: pois
-- Points of interest from OSM/Google
-- ============================================
CREATE TABLE IF NOT EXISTS pois (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    osm_id TEXT UNIQUE,
    geoid TEXT REFERENCES tracts(geoid) ON DELETE SET NULL,
    name TEXT,
    category TEXT NOT NULL,
    naics_code TEXT,
    geometry GEOMETRY(Point, 4326),
    source TEXT NOT NULL CHECK (source IN ('osm', 'google')),
    last_seen DATE NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pois_geoid ON pois (geoid);
CREATE INDEX IF NOT EXISTS idx_pois_category ON pois (category);
CREATE INDEX IF NOT EXISTS idx_pois_geometry ON pois USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_pois_last_seen ON pois (last_seen DESC);

-- ============================================
-- Table: alerts
-- Economic change notifications
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    geoid TEXT NOT NULL REFERENCES tracts(geoid) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('new_business', 'closure', 'employment_spike', 'competition_change', 'score_change')),
    description TEXT NOT NULL,
    metric_delta JSONB,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_geoid ON alerts (geoid);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts (alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_triggered ON alerts (triggered_at DESC);

-- ============================================
-- Table: leads
-- Free report lead capture
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    geography TEXT NOT NULL,  -- ZIP or county identifier
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    pdf_sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads (email);
CREATE INDEX IF NOT EXISTS idx_leads_requested ON leads (requested_at DESC);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE tracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tract_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE pois ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all data
CREATE POLICY "Authenticated users can read tracts" ON tracts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read tract_metrics" ON tract_metrics
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read vitality_scores" ON vitality_scores
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read pois" ON pois
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read alerts" ON alerts
    FOR SELECT TO authenticated USING (true);

-- Service role can do everything
CREATE POLICY "Service role full access to tracts" ON tracts
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to tract_metrics" ON tract_metrics
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to vitality_scores" ON vitality_scores
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to pois" ON pois
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to alerts" ON alerts
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to leads" ON leads
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- Helper Functions (for API)
-- ============================================

-- Get tract for a point (used by POI ingestion)
CREATE OR REPLACE FUNCTION get_tract_for_point(p_lon FLOAT, p_lat FLOAT)
RETURNS TEXT AS $$
    SELECT geoid
    FROM tracts
    WHERE ST_Contains(geometry, ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326))
    LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Get POI counts by category for a tract
CREATE OR REPLACE FUNCTION get_poi_counts_by_category(p_geoid TEXT)
RETURNS TABLE(category TEXT, count BIGINT) AS $$
    SELECT category, COUNT(*) as count
    FROM pois
    WHERE geoid = p_geoid
    GROUP BY category
    ORDER BY count DESC;
$$ LANGUAGE SQL STABLE;

-- Get latest tract metrics (most recent period per tract)
CREATE OR REPLACE FUNCTION get_latest_tract_metrics()
RETURNS TABLE(
    geoid TEXT,
    period DATE,
    period_type TEXT,
    employment_count INTEGER,
    establishment_count INTEGER,
    worker_inflow_count INTEGER,
    median_household_income NUMERIC,
    business_diversity_index NUMERIC,
    business_formation_rate NUMERIC
) AS $$
    SELECT DISTINCT ON (geoid)
        geoid,
        period,
        period_type,
        employment_count,
        establishment_count,
        worker_inflow_count,
        median_household_income,
        business_diversity_index,
        business_formation_rate
    FROM tract_metrics
    ORDER BY geoid, period DESC;
$$ LANGUAGE SQL STABLE;

-- Get tracts with scores as GeoJSON features
CREATE OR REPLACE FUNCTION get_tracts_with_scores(
    p_state_fips TEXT,
    p_county_fips TEXT,
    p_period DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(t.geometry)::jsonb,
            'properties', jsonb_build_object(
                'geoid', t.geoid,
                'name', t.name,
                'state_fips', t.state_fips,
                'county_fips', t.county_fips,
                'tract_fips', t.tract_fips,
                'area_sq_km', t.area_sq_km,
                'composite_score', vs.composite_score,
                'employment_density_score', vs.employment_density_score,
                'formation_rate_score', vs.formation_rate_score,
                'workforce_inflow_score', vs.workforce_inflow_score,
                'income_growth_score', vs.income_growth_score,
                'diversity_score', vs.diversity_score
            )
        )
    ) INTO result
    FROM tracts t
    LEFT JOIN LATERAL (
        SELECT * FROM vitality_scores
        WHERE vitality_scores.geoid = t.geoid
        ORDER BY period DESC
        LIMIT 1
    ) vs ON true
    WHERE t.state_fips = p_state_fips
      AND t.county_fips = p_county_fips;

    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

-- Find opportunity voids
CREATE OR REPLACE FUNCTION find_opportunity_voids(
    p_state_fips TEXT,
    p_county_fips TEXT,
    p_category TEXT,
    p_min_inflow INTEGER
)
RETURNS TABLE(
    geoid TEXT,
    name TEXT,
    worker_inflow_count INTEGER,
    poi_count BIGINT,
    composite_score NUMERIC
) AS $$
    SELECT
        t.geoid,
        t.name,
        tm.worker_inflow_count,
        COALESCE(pc.count, 0) as poi_count,
        vs.composite_score
    FROM tracts t
    JOIN tract_metrics tm ON tm.geoid = t.geoid
    LEFT JOIN vitality_scores vs ON vs.geoid = t.geoid
    LEFT JOIN LATERAL (
        SELECT COUNT(*) as count
        FROM pois
        WHERE pois.geoid = t.geoid AND pois.category = p_category
    ) pc ON true
    WHERE t.state_fips = p_state_fips
      AND t.county_fips = p_county_fips
      AND tm.worker_inflow_count >= p_min_inflow
      AND COALESCE(pc.count, 0) < 3
    ORDER BY tm.worker_inflow_count DESC;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- Trigger for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tracts_updated_at
    BEFORE UPDATE ON tracts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
