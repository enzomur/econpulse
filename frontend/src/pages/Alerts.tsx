import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { api } from '../api'

const alertTypeColors: Record<string, string> = {
  new_business: 'bg-green-500/20 text-green-400 border-green-500/30',
  closure: 'bg-red-500/20 text-red-400 border-red-500/30',
  employment_spike: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  competition_change: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  score_change: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
}

const alertTypeLabels: Record<string, string> = {
  new_business: 'New Business',
  closure: 'Closure',
  employment_spike: 'Employment Spike',
  competition_change: 'Competition',
  score_change: 'Score Change',
}

export default function Alerts() {
  const { alerts, setAlerts, isLoadingAlerts, setLoadingAlerts, setError, selectTract } = useStore()
  const [filterType, setFilterType] = useState<string>('')
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchAlerts() {
      setLoadingAlerts(true)
      try {
        const data = await api.getAlerts({ alert_type: filterType || undefined, limit: 50 })
        setAlerts(data.alerts)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load alerts')
      } finally {
        setLoadingAlerts(false)
      }
    }
    fetchAlerts()
  }, [filterType, setAlerts, setLoadingAlerts, setError])

  function handleAlertClick(geoid: string) {
    selectTract(geoid)
    navigate('/')
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Alerts</h1>
          <p className="text-slate-400 text-sm mt-1">
            Recent economic changes and notable events
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">All Types</option>
            <option value="new_business">New Business</option>
            <option value="closure">Closure</option>
            <option value="employment_spike">Employment Spike</option>
            <option value="score_change">Score Change</option>
          </select>
        </div>
      </div>

      {isLoadingAlerts ? (
        <div className="text-center py-12 text-slate-400">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          No alerts found. Check back after the next data pipeline run.
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => handleAlertClick(alert.geoid)}
              className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 cursor-pointer transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Alert Type Badge */}
                <div
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                    alertTypeColors[alert.alert_type] || 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {alertTypeLabels[alert.alert_type] || alert.alert_type}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-white">{alert.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                    <span className="font-mono">{alert.geoid}</span>
                    <span>{formatDate(alert.triggered_at)}</span>
                  </div>
                </div>

                {/* Delta indicator */}
                {alert.metric_delta && Object.keys(alert.metric_delta).length > 0 && (
                  <div className="text-right">
                    {Object.entries(alert.metric_delta).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="text-slate-400">{key}: </span>
                        <span
                          className={`font-mono ${
                            (value as number) > 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {(value as number) > 0 ? '+' : ''}
                          {(value as number).toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
