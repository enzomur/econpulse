import { useEffect } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import { useStore } from '../store'
import { api } from '../api'
import type { TractFeature } from '../types'

// Score quintile colors
const quintileColors = [
  '#ef4444', // Q1 - Red (lowest)
  '#f97316', // Q2 - Orange
  '#eab308', // Q3 - Yellow
  '#84cc16', // Q4 - Lime
  '#00d4aa', // Q5 - Teal (highest)
]

function getQuintileColor(score: number | undefined): string {
  if (score === undefined || score === null) return '#475569'
  if (score < 20) return quintileColors[0]
  if (score < 40) return quintileColors[1]
  if (score < 60) return quintileColors[2]
  if (score < 80) return quintileColors[3]
  return quintileColors[4]
}

export default function Dashboard() {
  const {
    selectedState,
    selectedCounty,
    tracts,
    setTracts,
    isLoadingTracts,
    setLoadingTracts,
    selectedTractId,
    selectTract,
    tractDetail,
    setTractDetail,
    setLoadingDetail,
    scoreMetric,
    setScoreMetric,
    weights,
    setWeight,
    setError,
  } = useStore()

  // Fetch tracts on load
  useEffect(() => {
    async function fetchTracts() {
      setLoadingTracts(true)
      try {
        const data = await api.getTracts(selectedState, selectedCounty)
        setTracts(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tracts')
      } finally {
        setLoadingTracts(false)
      }
    }
    fetchTracts()
  }, [selectedState, selectedCounty, setTracts, setLoadingTracts, setError])

  // Fetch tract detail when selected
  useEffect(() => {
    if (!selectedTractId) {
      setTractDetail(null)
      return
    }

    async function fetchDetail() {
      setLoadingDetail(true)
      try {
        const data = await api.getTractDetail(selectedTractId!)
        setTractDetail(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tract details')
      } finally {
        setLoadingDetail(false)
      }
    }
    fetchDetail()
  }, [selectedTractId, setTractDetail, setLoadingDetail, setError])

  const getScoreValue = (feature: TractFeature): number | undefined => {
    const props = feature.properties
    if (scoreMetric === 'composite') return props.composite_score
    if (scoreMetric === 'employment_density') return props.employment_density_score
    if (scoreMetric === 'formation_rate') return props.formation_rate_score
    if (scoreMetric === 'workforce_inflow') return props.workforce_inflow_score
    if (scoreMetric === 'income_growth') return props.income_growth_score
    if (scoreMetric === 'diversity') return props.diversity_score
    return props.composite_score
  }

  return (
    <div className="flex h-full">
      {/* Left Panel - Controls */}
      <div className="w-72 bg-slate-900 border-r border-slate-800 p-4 overflow-y-auto">
        <div className="space-y-6">
          {/* Area Selector */}
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Area</h3>
            <div className="space-y-2">
              <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                <option value="36">New York</option>
              </select>
              <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                <option value="061">Manhattan (New York County)</option>
              </select>
            </div>
          </div>

          {/* Metric Selector */}
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Display Metric</h3>
            <select
              value={scoreMetric}
              onChange={(e) => setScoreMetric(e.target.value as typeof scoreMetric)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="composite">Composite Score</option>
              <option value="employment_density">Employment Density</option>
              <option value="formation_rate">Business Formation</option>
              <option value="workforce_inflow">Workforce Inflow</option>
              <option value="income_growth">Income Level</option>
              <option value="diversity">Business Diversity</option>
            </select>
          </div>

          {/* Weight Sliders */}
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-3">Score Weights</h3>
            <div className="space-y-3">
              {Object.entries(weights).map(([key, value]) => (
                <div key={key}>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span className="capitalize">{key.replace('_', ' ')}</span>
                    <span>{value}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => setWeight(key as keyof typeof weights, parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Legend</h3>
            <div className="space-y-1">
              {[
                { range: '80-100', color: quintileColors[4], label: 'Very High' },
                { range: '60-80', color: quintileColors[3], label: 'High' },
                { range: '40-60', color: quintileColors[2], label: 'Moderate' },
                { range: '20-40', color: quintileColors[1], label: 'Low' },
                { range: '0-20', color: quintileColors[0], label: 'Very Low' },
              ].map((item) => (
                <div key={item.range} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-400">{item.range}</span>
                  <span className="text-slate-500">({item.label})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Center Panel - Map */}
      <div className="flex-1 relative">
        {isLoadingTracts && (
          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-[1000]">
            <div className="text-teal-accent">Loading tracts...</div>
          </div>
        )}
        <MapContainer
          center={[40.7831, -73.9712]}
          zoom={12}
          className="h-full w-full"
          style={{ background: '#1e293b' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {tracts && tracts.features.length > 0 && (
            <GeoJSON
              key={scoreMetric}
              data={tracts}
              style={(feature) => ({
                fillColor: getQuintileColor(getScoreValue(feature as TractFeature)),
                fillOpacity: feature?.properties?.geoid === selectedTractId ? 0.9 : 0.6,
                color: feature?.properties?.geoid === selectedTractId ? '#00d4aa' : '#475569',
                weight: feature?.properties?.geoid === selectedTractId ? 3 : 1,
              })}
              onEachFeature={(feature, layer) => {
                layer.on('click', () => {
                  selectTract(feature.properties.geoid)
                })
                layer.bindTooltip(
                  `${feature.properties.name || feature.properties.geoid}<br/>Score: ${
                    getScoreValue(feature as TractFeature)?.toFixed(1) || 'N/A'
                  }`,
                  { sticky: true }
                )
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Right Panel - Tract Detail */}
      <div className="w-80 bg-slate-900 border-l border-slate-800 p-4 overflow-y-auto">
        {!selectedTractId ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
            <p className="text-sm">Click a tract on the map to view details</p>
          </div>
        ) : tractDetail ? (
          <div className="space-y-6">
            {/* Tract Header */}
            <div>
              <h2 className="text-lg font-semibold text-white">
                {tractDetail.tract.name || `Tract ${tractDetail.tract.geoid}`}
              </h2>
              <p className="text-sm text-slate-400 font-mono">{tractDetail.tract.geoid}</p>
            </div>

            {/* Composite Score */}
            <div className="text-center py-6 bg-slate-800 rounded-xl">
              <div className="text-5xl font-bold font-mono" style={{
                color: getQuintileColor(tractDetail.scores[0]?.composite_score)
              }}>
                {tractDetail.scores[0]?.composite_score?.toFixed(1) || '--'}
              </div>
              <p className="text-sm text-slate-400 mt-1">Composite Score</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                {tractDetail.trend === 'up' && <span className="text-green-400">↑ Rising</span>}
                {tractDetail.trend === 'down' && <span className="text-red-400">↓ Declining</span>}
                {tractDetail.trend === 'flat' && <span className="text-slate-400">→ Stable</span>}
              </div>
            </div>

            {/* Score Breakdown */}
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-3">Score Breakdown</h3>
              <div className="space-y-3">
                {tractDetail.scores[0] && [
                  { label: 'Employment Density', value: tractDetail.scores[0].employment_density_score },
                  { label: 'Business Formation', value: tractDetail.scores[0].formation_rate_score },
                  { label: 'Workforce Inflow', value: tractDetail.scores[0].workforce_inflow_score },
                  { label: 'Income Level', value: tractDetail.scores[0].income_growth_score },
                  { label: 'Business Diversity', value: tractDetail.scores[0].diversity_score },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>{item.label}</span>
                      <span className="font-mono">{item.value?.toFixed(1) || '--'}</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${item.value || 0}%`,
                          backgroundColor: getQuintileColor(item.value),
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* POI Counts */}
            {tractDetail.poi_counts.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-3">Business Categories</h3>
                <div className="grid grid-cols-2 gap-2">
                  {tractDetail.poi_counts.map((poi) => (
                    <div key={poi.category} className="bg-slate-800 rounded-lg px-3 py-2">
                      <div className="text-lg font-mono text-white">{poi.count}</div>
                      <div className="text-xs text-slate-400 capitalize">
                        {poi.category.replace('_', ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generate Report Button */}
            <button className="w-full bg-teal-accent hover:bg-teal-400 text-slate-900 font-medium py-3 rounded-lg transition-colors">
              Generate Report
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-teal-accent">Loading...</div>
          </div>
        )}
      </div>
    </div>
  )
}
