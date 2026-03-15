import { useState } from 'react'
import { api } from '../api'

export default function Reports() {
  const [geoid, setGeoid] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    if (!geoid || geoid.length !== 11) {
      setError('Please enter a valid 11-digit GEOID')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const result = await api.generateReport(geoid)
      setJobId(result.job_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-white mb-2">Generate Report</h1>
      <p className="text-slate-400 mb-8">
        Create a comprehensive District Health Report PDF for any Census tract.
      </p>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">
              Census Tract GEOID
            </label>
            <input
              type="text"
              value={geoid}
              onChange={(e) => setGeoid(e.target.value)}
              placeholder="e.g., 36061000100"
              maxLength={11}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white font-mono placeholder:text-slate-500 focus:border-teal-accent focus:outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              11-digit code: 2-digit state + 3-digit county + 6-digit tract
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {jobId && (
            <div className="bg-teal-accent/10 border border-teal-accent/30 text-teal-accent rounded-lg px-4 py-3 text-sm">
              Report queued! Job ID: <span className="font-mono">{jobId}</span>
              <br />
              <span className="text-slate-400">The report will be emailed when ready.</span>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !geoid}
            className="w-full bg-teal-accent hover:bg-teal-400 text-slate-900 font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Recent Reports (placeholder) */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-white mb-4">Recent Reports</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-slate-500">
          <p>No reports generated yet.</p>
          <p className="text-sm mt-1">Reports you generate will appear here.</p>
        </div>
      </div>
    </div>
  )
}
