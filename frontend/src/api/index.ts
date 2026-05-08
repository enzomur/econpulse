import type { TractGeoJSON, TractDetail, Alert, VoidResult, TractFeature, TractDemographics, TractEligibility } from '../types'

// Supabase direct connection (no backend needed)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://aqbarpuahhbivcqgfjns.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxYmFycHVhaGhiaXZjcWdmam5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODUxNDUsImV4cCI6MjA4OTE2MTE0NX0.OV1TF_4dm3Fhte-SbFxcP6iIUNGZ5fIKh4Ci024xXvE'

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function supabaseRpc<T>(fnName: string, params: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new ApiError(response.status, message)
  }

  return response.json()
}

async function supabaseQuery<T>(table: string, query: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new ApiError(response.status, message)
  }

  return response.json()
}

export const api = {
  // Health check
  health: async () => ({ status: 'ok', timestamp: new Date().toISOString() }),

  // Get tracts with scores as GeoJSON
  getTracts: async (state: string, county: string, _period?: string): Promise<TractGeoJSON> => {
    // Get tracts with geometry
    const tracts = await supabaseRpc<Array<{
      geoid: string
      name: string
      state_fips: string
      county_fips: string
      tract_fips: string
      area_sq_km: number
      geometry_json: object | null
    }>>('get_tracts_geojson', {
      p_state_fips: state,
      p_county_fips: county,
    })

    // Get scores only for the tracts we have (using IN filter)
    // This avoids issues with mixed geoid formats in the database
    const tractGeoids = tracts.map(t => t.geoid)
    const geoidList = tractGeoids.join(',')

    const scores = await supabaseQuery<Array<{
      geoid: string
      composite_score: number
      employment_density_score: number
      formation_rate_score: number
      workforce_inflow_score: number
      income_growth_score: number
      diversity_score: number
    }>>('vitality_scores', `select=geoid,composite_score,employment_density_score,formation_rate_score,workforce_inflow_score,income_growth_score,diversity_score&geoid=in.(${geoidList})&order=period.desc`)

    // Build score map (latest score per geoid)
    const scoreMap = new Map<string, typeof scores[0]>()
    for (const s of scores) {
      if (!scoreMap.has(s.geoid)) {
        scoreMap.set(s.geoid, s)
      }
    }

    // Build GeoJSON features
    const features: TractFeature[] = tracts
      .filter(t => t.geometry_json)
      .map(tract => {
        const score = scoreMap.get(tract.geoid)
        return {
          type: 'Feature' as const,
          geometry: tract.geometry_json as TractFeature['geometry'],
          properties: {
            geoid: tract.geoid,
            name: tract.name,
            state_fips: tract.state_fips,
            county_fips: tract.county_fips,
            tract_fips: tract.tract_fips,
            area_sq_km: tract.area_sq_km,
            composite_score: score?.composite_score,
            employment_density_score: score?.employment_density_score,
            formation_rate_score: score?.formation_rate_score,
            workforce_inflow_score: score?.workforce_inflow_score,
            income_growth_score: score?.income_growth_score,
            diversity_score: score?.diversity_score,
          },
        }
      })

    return { type: 'FeatureCollection', features }
  },

  // Get detailed tract info
  getTractDetail: async (geoid: string): Promise<TractDetail> => {
    // Get tract info
    const [tract] = await supabaseQuery<Array<{
      geoid: string
      name: string
      state_fips: string
      county_fips: string
      tract_fips: string
      area_sq_km: number
    }>>('tracts', `select=geoid,name,state_fips,county_fips,tract_fips,area_sq_km&geoid=eq.${geoid}`)

    if (!tract) {
      throw new ApiError(404, 'Tract not found')
    }

    // Get score history
    const scores = await supabaseQuery<Array<{
      geoid: string
      period: string
      composite_score: number
      employment_density_score: number
      formation_rate_score: number
      workforce_inflow_score: number
      income_growth_score: number
      diversity_score: number
      score_weights: Record<string, number>
      computed_at: string
    }>>('vitality_scores', `select=*&geoid=eq.${geoid}&order=period.desc&limit=8`)

    // Get POI counts
    const pois = await supabaseQuery<Array<{ category: string }>>('pois', `select=category&geoid=eq.${geoid}`)
    const poiCountMap = new Map<string, number>()
    for (const p of pois) {
      poiCountMap.set(p.category, (poiCountMap.get(p.category) || 0) + 1)
    }
    const poi_counts = Array.from(poiCountMap.entries()).map(([category, count]) => ({ category, count }))

    // Get demographics from tract_metrics (graceful fail if columns don't exist)
    let demographics: TractDemographics | null = null
    try {
      const metricsData = await supabaseQuery<Array<{
        poverty_rate: number | null
        unemployment_rate: number | null
        population_density: number | null
        college_educated_pct: number | null
        median_household_income: number | null
      }>>('tract_metrics', `select=poverty_rate,unemployment_rate,population_density,college_educated_pct,median_household_income&geoid=eq.${geoid}&order=period.desc&limit=1`)

      demographics = metricsData[0] ? {
        poverty_rate: metricsData[0].poverty_rate ?? undefined,
        unemployment_rate: metricsData[0].unemployment_rate ?? undefined,
        population_density: metricsData[0].population_density ?? undefined,
        college_educated_pct: metricsData[0].college_educated_pct ?? undefined,
        median_household_income: metricsData[0].median_household_income ?? undefined,
      } : null
    } catch {
      // Demographics columns may not exist yet - continue without them
    }

    // Get eligibility data (graceful fail if table doesn't exist)
    let eligibility: TractEligibility | null = null
    try {
      const eligibilityData = await supabaseQuery<Array<{
        opportunity_zone: boolean | null
        empowerment_zone: boolean | null
        hub_zone: boolean | null
        promise_zone: boolean | null
        new_market_tax_credit: boolean | null
        state_enterprise_zone: boolean | null
        designation_year: number | null
      }>>('tract_eligibility', `select=opportunity_zone,empowerment_zone,hub_zone,promise_zone,new_market_tax_credit,state_enterprise_zone,designation_year&geoid=eq.${geoid}&limit=1`)

      eligibility = eligibilityData[0] ? {
        opportunity_zone: eligibilityData[0].opportunity_zone ?? undefined,
        empowerment_zone: eligibilityData[0].empowerment_zone ?? undefined,
        hub_zone: eligibilityData[0].hub_zone ?? undefined,
        promise_zone: eligibilityData[0].promise_zone ?? undefined,
        new_market_tax_credit: eligibilityData[0].new_market_tax_credit ?? undefined,
        state_enterprise_zone: eligibilityData[0].state_enterprise_zone ?? undefined,
        designation_year: eligibilityData[0].designation_year ?? undefined,
      } : null
    } catch {
      // Eligibility table may not exist yet - continue without it
    }

    // Calculate trend
    let trend: 'up' | 'flat' | 'down' = 'flat'
    if (scores.length >= 3) {
      const recent = scores.slice(0, 3).map(s => s.composite_score)
      if (recent[0] > recent[2] + 5) trend = 'up'
      else if (recent[0] < recent[2] - 5) trend = 'down'
    }

    return { tract, scores, metrics: null, demographics, eligibility, poi_counts, trend }
  },

  // Get alerts
  getAlerts: async (params?: { geoid?: string; alert_type?: string; limit?: number }): Promise<{ alerts: Alert[] }> => {
    let query = 'select=*&order=triggered_at.desc'
    if (params?.geoid) query += `&geoid=eq.${params.geoid}`
    if (params?.alert_type) query += `&alert_type=eq.${params.alert_type}`
    query += `&limit=${params?.limit || 20}`

    const alerts = await supabaseQuery<Alert[]>('alerts', query)
    return { alerts }
  },

  // Find opportunity voids
  getVoids: async (state: string, county: string, category: string, minInflow: number): Promise<{ voids: VoidResult[] }> => {
    const voids = await supabaseRpc<VoidResult[]>('find_opportunity_voids_with_coords', {
      p_state_fips: state,
      p_county_fips: county,
      p_category: category,
      p_min_inflow: minInflow,
    })
    return { voids: voids || [] }
  },

  // Generate PDF report via Supabase Edge Function
  generateReport: async (geoid: string): Promise<Blob> => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ geoid }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new ApiError(response.status, error.error || 'Failed to generate report')
    }

    return response.blob()
  },

  // Download report helper
  downloadReport: async (geoid: string): Promise<void> => {
    const blob = await api.generateReport(geoid)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `econpulse-report-${geoid}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },
}

export { ApiError }
