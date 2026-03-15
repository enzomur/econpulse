export interface Tract {
  geoid: string
  name: string
  state_fips: string
  county_fips: string
  tract_fips: string
  area_sq_km: number
}

export interface TractMetrics {
  geoid: string
  period: string
  employment_count: number
  establishment_count: number
  worker_inflow_count: number
  median_household_income: number
  business_diversity_index: number
  business_formation_rate: number
}

export interface VitalityScore {
  geoid: string
  period: string
  employment_density_score: number
  formation_rate_score: number
  workforce_inflow_score: number
  income_growth_score: number
  diversity_score: number
  composite_score: number
  score_weights: Record<string, number>
  computed_at: string
}

export interface POICount {
  category: string
  count: number
}

export interface Alert {
  id: string
  geoid: string
  alert_type: 'new_business' | 'closure' | 'employment_spike' | 'competition_change' | 'score_change'
  description: string
  metric_delta: Record<string, number>
  triggered_at: string
  sent_at: string | null
}

export interface TractFeature {
  type: 'Feature'
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: number[][][]
  }
  properties: Tract & {
    composite_score?: number
    employment_density_score?: number
    formation_rate_score?: number
    workforce_inflow_score?: number
    income_growth_score?: number
    diversity_score?: number
  }
}

export interface TractGeoJSON {
  type: 'FeatureCollection'
  features: TractFeature[]
}

export interface TractDetail {
  tract: Tract
  scores: VitalityScore[]
  metrics: TractMetrics | null
  poi_counts: POICount[]
  trend: 'up' | 'flat' | 'down'
}

export interface VoidResult {
  geoid: string
  name: string
  worker_inflow_count: number
  poi_count: number
  composite_score: number
  nearest_competitor_distance?: number
  lat: number
  lng: number
}
