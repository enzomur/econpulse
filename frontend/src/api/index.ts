import type { TractGeoJSON, TractDetail, Alert, VoidResult } from '../types'

const API_BASE = import.meta.env.VITE_API_URL || ''

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
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
  health: () => fetchJson<{ status: string; timestamp: string }>('/api/health'),

  // Get tracts with scores as GeoJSON
  getTracts: (state: string, county: string, period?: string) => {
    const params = new URLSearchParams({ state, county })
    if (period) params.set('period', period)
    return fetchJson<TractGeoJSON>(`/api/tracts?${params}`)
  },

  // Get detailed tract info
  getTractDetail: (geoid: string) =>
    fetchJson<TractDetail>(`/api/tract/${geoid}`),

  // Get alerts
  getAlerts: (params?: { geoid?: string; alert_type?: string; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.geoid) searchParams.set('geoid', params.geoid)
    if (params?.alert_type) searchParams.set('alert_type', params.alert_type)
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    return fetchJson<{ alerts: Alert[] }>(`/api/alerts?${searchParams}`)
  },

  // Find opportunity voids
  getVoids: (state: string, county: string, category: string, minInflow: number) => {
    const params = new URLSearchParams({
      state,
      county,
      category,
      min_inflow: minInflow.toString(),
    })
    return fetchJson<{ voids: VoidResult[] }>(`/api/voids?${params}`)
  },

  // Generate report
  generateReport: (geoid: string, period?: string) =>
    fetchJson<{ job_id: string; status: string }>('/api/report', {
      method: 'POST',
      body: JSON.stringify({ geoid, period }),
    }),
}

export { ApiError }
