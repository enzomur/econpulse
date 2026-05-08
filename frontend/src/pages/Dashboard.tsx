import { useEffect } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import { useStore } from '../store'
import { api } from '../api'
import TrendChart from '../components/TrendChart'
import DemographicsPanel from '../components/DemographicsPanel'
import EligibilityBadges from '../components/EligibilityBadges'
import type { TractFeature, ViewMode } from '../types'

// Vitality mode colors (green = high score = thriving)
const vitalityColors = [
  '#ef4444', // Q1 - Red (lowest)
  '#f97316', // Q2 - Orange
  '#eab308', // Q3 - Yellow
  '#84cc16', // Q4 - Lime
  '#00d4aa', // Q5 - Teal (highest)
]

// Investment priority mode colors (higher = more investment needed)
const investmentColors = [
  '#6b7280', // Q1 - Gray (low priority)
  '#3b82f6', // Q2 - Blue
  '#8b5cf6', // Q3 - Purple
  '#ec4899', // Q4 - Pink
  '#ef4444', // Q5 - Red (high priority)
]

function getQuintileColor(score: number | undefined, viewMode: ViewMode): string {
  const colors = viewMode === 'vitality' ? vitalityColors : investmentColors
  if (score === undefined || score === null) return '#475569'
  if (score < 20) return colors[0]
  if (score < 40) return colors[1]
  if (score < 60) return colors[2]
  if (score < 80) return colors[3]
  return colors[4]
}

// Calculate investment priority score (inverted vitality + weighted by potential)
// Returns raw score - normalization happens at display time
function calculateInvestmentPriority(feature: TractFeature): number {
  const props = feature.properties
  const compositeScore = props.composite_score ?? 50
  const workforceInflowScore = props.workforce_inflow_score ?? 50

  // 60% need (inverse of vitality) + 40% potential (workforce inflow)
  const needScore = 100 - compositeScore
  const potentialScore = workforceInflowScore
  const rawScore = needScore * 0.6 + potentialScore * 0.4

  // Normalize to spread out the typical range (30-70) to full 0-100 scale
  // Most scores cluster between 35-65, so we expand that range
  const normalized = ((rawScore - 35) / 30) * 100
  return Math.max(0, Math.min(100, normalized))
}

export default function Dashboard() {
  const {
    viewMode,
    setViewMode,
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
    // In investment mode with composite selected, use investment priority calculation
    if (viewMode === 'investment' && scoreMetric === 'composite') {
      return calculateInvestmentPriority(feature)
    }

    const props = feature.properties
    if (scoreMetric === 'composite') return props.composite_score
    if (scoreMetric === 'employment_density') return props.employment_density_score
    if (scoreMetric === 'formation_rate') return props.formation_rate_score
    if (scoreMetric === 'workforce_inflow') return props.workforce_inflow_score
    if (scoreMetric === 'income_growth') return props.income_growth_score
    if (scoreMetric === 'diversity') return props.diversity_score
    return props.composite_score
  }

  // Get legend labels based on view mode
  const getLegendLabels = () => {
    if (viewMode === 'vitality') {
      return [
        { range: '80-100', label: 'Very High', description: 'Thriving' },
        { range: '60-80', label: 'High', description: 'Strong' },
        { range: '40-60', label: 'Moderate', description: 'Stable' },
        { range: '20-40', label: 'Low', description: 'Struggling' },
        { range: '0-20', label: 'Very Low', description: 'Distressed' },
      ]
    }
    return [
      { range: '80-100', label: 'Critical', description: 'Highest Priority' },
      { range: '60-80', label: 'High', description: 'Strong Need' },
      { range: '40-60', label: 'Moderate', description: 'Some Need' },
      { range: '20-40', label: 'Low', description: 'Lower Priority' },
      { range: '0-20', label: 'Minimal', description: 'Thriving Area' },
    ]
  }

  const legendLabels = getLegendLabels()
  const currentColors = viewMode === 'vitality' ? vitalityColors : investmentColors

  return (
    <div className="flex h-full">
      {/* Left Panel - Controls */}
      <div className="w-72 bg-slate-900 border-r border-slate-800 p-4 overflow-y-auto">
        <div className="space-y-6">
          {/* View Mode Toggle */}
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">View Mode</h3>
            <div className="flex bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('vitality')}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'vitality'
                    ? 'bg-teal-accent text-slate-900'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Economic Vitality
              </button>
              <button
                onClick={() => setViewMode('investment')}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'investment'
                    ? 'bg-purple-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Investment Priority
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {viewMode === 'vitality'
                ? 'Higher scores = thriving areas'
                : 'Higher scores = more investment needed'}
            </p>
          </div>

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
            <h3 className="text-sm font-medium text-slate-300 mb-2">
              {viewMode === 'vitality' ? 'Economic Vitality' : 'Investment Priority'}
            </h3>
            <div className="space-y-1">
              {legendLabels.map((item, index) => (
                <div key={item.range} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: currentColors[4 - index] }}
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
              key={`${scoreMetric}-${viewMode}`}
              data={tracts}
              style={(feature) => ({
                fillColor: getQuintileColor(getScoreValue(feature as TractFeature), viewMode),
                fillOpacity: feature?.properties?.geoid === selectedTractId ? 0.9 : 0.6,
                color: feature?.properties?.geoid === selectedTractId ? (viewMode === 'vitality' ? '#00d4aa' : '#a855f7') : '#475569',
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
              {tractDetail.eligibility && (
                <div className="mt-2">
                  <EligibilityBadges eligibility={tractDetail.eligibility} />
                </div>
              )}
            </div>

            {/* Score Display */}
            <div className="text-center py-6 bg-slate-800 rounded-xl">
              {viewMode === 'vitality' ? (
                <>
                  <div className="text-5xl font-bold font-mono" style={{
                    color: getQuintileColor(tractDetail.scores[0]?.composite_score, viewMode)
                  }}>
                    {tractDetail.scores[0]?.composite_score?.toFixed(1) || '--'}
                  </div>
                  <p className="text-sm text-slate-400 mt-1">Economic Vitality Score</p>
                </>
              ) : (
                <>
                  <div className="text-5xl font-bold font-mono" style={{
                    color: getQuintileColor(
                      (() => {
                        const composite = tractDetail.scores[0]?.composite_score ?? 50
                        const inflow = tractDetail.scores[0]?.workforce_inflow_score ?? 50
                        return (100 - composite) * 0.6 + inflow * 0.4
                      })(),
                      viewMode
                    )
                  }}>
                    {(() => {
                      const composite = tractDetail.scores[0]?.composite_score ?? 50
                      const inflow = tractDetail.scores[0]?.workforce_inflow_score ?? 50
                      return ((100 - composite) * 0.6 + inflow * 0.4).toFixed(1)
                    })()}
                  </div>
                  <p className="text-sm text-slate-400 mt-1">Investment Priority Score</p>
                  <p className="text-xs text-slate-500 mt-1">
                    (Vitality: {tractDetail.scores[0]?.composite_score?.toFixed(1) || '--'})
                  </p>
                </>
              )}
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
                          backgroundColor: getQuintileColor(item.value, 'vitality'),
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trend Chart */}
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-3">Score History</h3>
              <TrendChart scores={tractDetail.scores} selectedMetric={scoreMetric} />
            </div>

            {/* Demographics */}
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-3">Demographics</h3>
              <DemographicsPanel demographics={tractDetail.demographics} />
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
