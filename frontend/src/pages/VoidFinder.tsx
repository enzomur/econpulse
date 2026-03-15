import { useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { useStore } from '../store'
import { api } from '../api'

const categories = [
  { value: 'food_beverage', label: 'Food & Beverage' },
  { value: 'retail', label: 'Retail' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'financial', label: 'Financial' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
]

export default function VoidFinder() {
  const {
    selectedState,
    selectedCounty,
    voidCategory,
    setVoidCategory,
    voidMinInflow,
    setVoidMinInflow,
    voidResults,
    setVoidResults,
    isLoadingVoids,
    setLoadingVoids,
    setError,
  } = useStore()

  const [hasSearched, setHasSearched] = useState(false)

  async function handleSearch() {
    setLoadingVoids(true)
    setHasSearched(true)
    try {
      const data = await api.getVoids(selectedState, selectedCounty, voidCategory, voidMinInflow)
      setVoidResults(data.voids)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find opportunities')
      setVoidResults([])
    } finally {
      setLoadingVoids(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-96 bg-slate-900 border-r border-slate-800 flex flex-col">
        {/* Search Controls */}
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white mb-4">
            Opportunity Gaps
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Find high-traffic areas underserved for specific business categories.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Category</label>
              <select
                value={voidCategory}
                onChange={(e) => setVoidCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">
                Min. Worker Inflow
              </label>
              <input
                type="number"
                value={voidMinInflow}
                onChange={(e) => setVoidMinInflow(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>

            <button
              onClick={handleSearch}
              disabled={isLoadingVoids}
              className="w-full bg-amber-accent hover:bg-amber-400 text-slate-900 font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoadingVoids ? 'Searching...' : 'Find Opportunities'}
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4">
          {!hasSearched ? (
            <p className="text-sm text-slate-500 text-center py-8">
              Configure search parameters and click "Find Opportunities"
            </p>
          ) : voidResults.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              No opportunity gaps found with current criteria
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-400 mb-2">
                {voidResults.length} opportunities found
              </p>
              {voidResults.map((void_, idx) => (
                <div
                  key={void_.geoid}
                  className="bg-slate-800 rounded-lg p-4 hover:bg-slate-750 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-white">
                        {void_.name || `Tract ${void_.geoid}`}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono">{void_.geoid}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-mono text-amber-accent">
                        #{idx + 1}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-slate-400">Inflow:</span>{' '}
                      <span className="text-white font-mono">
                        {void_.worker_inflow_count.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">POIs:</span>{' '}
                      <span className="text-white font-mono">{void_.poi_count}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Score:</span>{' '}
                      <span className="text-white font-mono">
                        {void_.composite_score?.toFixed(1) || '--'}
                      </span>
                    </div>
                    {void_.nearest_competitor_distance && (
                      <div>
                        <span className="text-slate-400">Nearest:</span>{' '}
                        <span className="text-white font-mono">
                          {void_.nearest_competitor_distance.toFixed(2)} mi
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
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
          {voidResults.map((void_: any) => (
            void_.lat && void_.lng ? (
              <CircleMarker
                key={void_.geoid}
                center={[void_.lat, void_.lng]}
                radius={Math.min(25, Math.max(10, void_.worker_inflow_count / 200))}
                pathOptions={{
                  fillColor: '#f59e0b',
                  fillOpacity: 0.8,
                  color: '#fbbf24',
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="text-slate-900">
                    <strong>{void_.name || void_.geoid}</strong>
                    <br />
                    Worker Inflow: {void_.worker_inflow_count.toLocaleString()}
                    <br />
                    Current POIs: {void_.poi_count}
                  </div>
                </Popup>
              </CircleMarker>
            ) : null
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
