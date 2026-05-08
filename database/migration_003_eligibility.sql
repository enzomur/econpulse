-- EconPulse Migration 003: Eligibility Zones
-- Adds federal program eligibility tracking

-- ============================================
-- Table: tract_eligibility
-- Federal program eligibility flags per tract
-- ============================================
CREATE TABLE IF NOT EXISTS tract_eligibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    geoid TEXT NOT NULL REFERENCES tracts(geoid) ON DELETE CASCADE,

    -- Federal designations
    opportunity_zone BOOLEAN DEFAULT FALSE,
    empowerment_zone BOOLEAN DEFAULT FALSE,
    hub_zone BOOLEAN DEFAULT FALSE,
    promise_zone BOOLEAN DEFAULT FALSE,
    new_market_tax_credit BOOLEAN DEFAULT FALSE,

    -- State/local designations (can be extended)
    state_enterprise_zone BOOLEAN DEFAULT FALSE,

    -- Metadata
    designation_year INTEGER,
    expiration_date DATE,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(geoid)
);

CREATE INDEX IF NOT EXISTS idx_tract_eligibility_geoid ON tract_eligibility (geoid);
CREATE INDEX IF NOT EXISTS idx_tract_eligibility_oz ON tract_eligibility (opportunity_zone) WHERE opportunity_zone = TRUE;

-- Enable RLS
ALTER TABLE tract_eligibility ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read eligibility data
CREATE POLICY "Authenticated users can read tract_eligibility" ON tract_eligibility
    FOR SELECT TO authenticated USING (true);

-- Anon users can read eligibility data (for public dashboard)
CREATE POLICY "Anon users can read tract_eligibility" ON tract_eligibility
    FOR SELECT TO anon USING (true);

-- Service role can do everything
CREATE POLICY "Service role full access to tract_eligibility" ON tract_eligibility
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- Function to get eligibility for a tract
-- ============================================
CREATE OR REPLACE FUNCTION get_tract_eligibility(p_geoid TEXT)
RETURNS TABLE(
    opportunity_zone BOOLEAN,
    empowerment_zone BOOLEAN,
    hub_zone BOOLEAN,
    promise_zone BOOLEAN,
    new_market_tax_credit BOOLEAN,
    state_enterprise_zone BOOLEAN,
    designation_year INTEGER
) AS $$
    SELECT
        opportunity_zone,
        empowerment_zone,
        hub_zone,
        promise_zone,
        new_market_tax_credit,
        state_enterprise_zone,
        designation_year
    FROM tract_eligibility
    WHERE geoid = p_geoid
    LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Add comments
COMMENT ON TABLE tract_eligibility IS 'Federal and state program eligibility flags for census tracts';
COMMENT ON COLUMN tract_eligibility.opportunity_zone IS 'Federal Opportunity Zone designation (Tax Cuts and Jobs Act 2017)';
COMMENT ON COLUMN tract_eligibility.empowerment_zone IS 'Federal Empowerment Zone designation';
COMMENT ON COLUMN tract_eligibility.hub_zone IS 'SBA HUBZone designation for small business contracting';
COMMENT ON COLUMN tract_eligibility.promise_zone IS 'Federal Promise Zone designation';
COMMENT ON COLUMN tract_eligibility.new_market_tax_credit IS 'Eligible for New Market Tax Credits';

-- Trigger for updated_at
CREATE TRIGGER tract_eligibility_updated_at
    BEFORE UPDATE ON tract_eligibility
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
