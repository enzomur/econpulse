import { create } from 'zustand'
import type { TractGeoJSON, TractDetail, Alert, VoidResult } from '../types'

interface AppState {
  // Geography selection
  selectedState: string
  selectedCounty: string
  setGeography: (state: string, county: string) => void

  // Map data
  tracts: TractGeoJSON | null
  setTracts: (tracts: TractGeoJSON | null) => void
  isLoadingTracts: boolean
  setLoadingTracts: (loading: boolean) => void

  // Selected tract
  selectedTractId: string | null
  selectTract: (geoid: string | null) => void
  tractDetail: TractDetail | null
  setTractDetail: (detail: TractDetail | null) => void
  isLoadingDetail: boolean
  setLoadingDetail: (loading: boolean) => void

  // Score display mode
  scoreMetric: 'composite' | 'employment_density' | 'formation_rate' | 'workforce_inflow' | 'income_growth' | 'diversity'
  setScoreMetric: (metric: AppState['scoreMetric']) => void

  // Score weights
  weights: {
    employment_density: number
    formation_rate: number
    workforce_inflow: number
    income_growth: number
    diversity: number
  }
  setWeight: (metric: keyof AppState['weights'], value: number) => void

  // Void finder
  voidCategory: string
  setVoidCategory: (category: string) => void
  voidMinInflow: number
  setVoidMinInflow: (value: number) => void
  voidResults: VoidResult[]
  setVoidResults: (results: VoidResult[]) => void
  isLoadingVoids: boolean
  setLoadingVoids: (loading: boolean) => void

  // Alerts
  alerts: Alert[]
  setAlerts: (alerts: Alert[]) => void
  isLoadingAlerts: boolean
  setLoadingAlerts: (loading: boolean) => void

  // Errors
  error: string | null
  setError: (error: string | null) => void
}

export const useStore = create<AppState>((set) => ({
  // Geography - default to Manhattan
  selectedState: '36',
  selectedCounty: '061',
  setGeography: (state, county) => set({ selectedState: state, selectedCounty: county }),

  // Map data
  tracts: null,
  setTracts: (tracts) => set({ tracts }),
  isLoadingTracts: false,
  setLoadingTracts: (loading) => set({ isLoadingTracts: loading }),

  // Selected tract
  selectedTractId: null,
  selectTract: (geoid) => set({ selectedTractId: geoid }),
  tractDetail: null,
  setTractDetail: (detail) => set({ tractDetail: detail }),
  isLoadingDetail: false,
  setLoadingDetail: (loading) => set({ isLoadingDetail: loading }),

  // Score display
  scoreMetric: 'composite',
  setScoreMetric: (metric) => set({ scoreMetric: metric }),

  // Weights
  weights: {
    employment_density: 25,
    formation_rate: 20,
    workforce_inflow: 20,
    income_growth: 20,
    diversity: 15,
  },
  setWeight: (metric, value) =>
    set((state) => ({
      weights: { ...state.weights, [metric]: value },
    })),

  // Void finder
  voidCategory: 'food_beverage',
  setVoidCategory: (category) => set({ voidCategory: category }),
  voidMinInflow: 500,
  setVoidMinInflow: (value) => set({ voidMinInflow: value }),
  voidResults: [],
  setVoidResults: (results) => set({ voidResults: results }),
  isLoadingVoids: false,
  setLoadingVoids: (loading) => set({ isLoadingVoids: loading }),

  // Alerts
  alerts: [],
  setAlerts: (alerts) => set({ alerts }),
  isLoadingAlerts: false,
  setLoadingAlerts: (loading) => set({ isLoadingAlerts: loading }),

  // Errors
  error: null,
  setError: (error) => set({ error }),
}))
