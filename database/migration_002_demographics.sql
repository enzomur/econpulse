-- EconPulse Migration 002: Demographics
-- Adds demographic data columns to tract_metrics

-- ============================================
-- Add demographic columns to tract_metrics
-- ============================================
ALTER TABLE tract_metrics
ADD COLUMN IF NOT EXISTS poverty_rate NUMERIC CHECK (poverty_rate >= 0 AND poverty_rate <= 100),
ADD COLUMN IF NOT EXISTS unemployment_rate NUMERIC CHECK (unemployment_rate >= 0 AND unemployment_rate <= 100),
ADD COLUMN IF NOT EXISTS population_density NUMERIC CHECK (population_density >= 0),
ADD COLUMN IF NOT EXISTS college_educated_pct NUMERIC CHECK (college_educated_pct >= 0 AND college_educated_pct <= 100);

-- Add comments for documentation
COMMENT ON COLUMN tract_metrics.poverty_rate IS 'Percentage of population below poverty line (ACS data)';
COMMENT ON COLUMN tract_metrics.unemployment_rate IS 'Unemployment rate as percentage (ACS/BLS data)';
COMMENT ON COLUMN tract_metrics.population_density IS 'Population per square kilometer';
COMMENT ON COLUMN tract_metrics.college_educated_pct IS 'Percentage with bachelor''s degree or higher';

-- ============================================
-- Update get_latest_tract_metrics to include demographics
-- ============================================
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
    business_formation_rate NUMERIC,
    poverty_rate NUMERIC,
    unemployment_rate NUMERIC,
    population_density NUMERIC,
    college_educated_pct NUMERIC
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
        business_formation_rate,
        poverty_rate,
        unemployment_rate,
        population_density,
        college_educated_pct
    FROM tract_metrics
    ORDER BY geoid, period DESC;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- Function to get demographics for a specific tract
-- ============================================
CREATE OR REPLACE FUNCTION get_tract_demographics(p_geoid TEXT)
RETURNS TABLE(
    poverty_rate NUMERIC,
    unemployment_rate NUMERIC,
    population_density NUMERIC,
    college_educated_pct NUMERIC,
    median_household_income NUMERIC
) AS $$
    SELECT
        poverty_rate,
        unemployment_rate,
        population_density,
        college_educated_pct,
        median_household_income
    FROM tract_metrics
    WHERE geoid = p_geoid
    ORDER BY period DESC
    LIMIT 1;
$$ LANGUAGE SQL STABLE;
