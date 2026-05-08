import type { TractDemographics } from '../types'

interface DemographicsPanelProps {
  demographics: TractDemographics | null
}

const formatNumber = (value: number | undefined, suffix = '') => {
  if (value === undefined || value === null) return '--'
  return `${value.toLocaleString()}${suffix}`
}

const formatPercent = (value: number | undefined) => {
  if (value === undefined || value === null) return '--'
  return `${value.toFixed(1)}%`
}

const formatCurrency = (value: number | undefined) => {
  if (value === undefined || value === null) return '--'
  return `$${value.toLocaleString()}`
}

export default function DemographicsPanel({ demographics }: DemographicsPanelProps) {
  if (!demographics) {
    return (
      <div className="text-sm text-slate-500 text-center py-4">
        No demographic data available
      </div>
    )
  }

  const metrics = [
    {
      label: 'Poverty Rate',
      value: demographics.poverty_rate,
      format: formatPercent,
      color: demographics.poverty_rate !== undefined
        ? demographics.poverty_rate > 20 ? '#ef4444' : demographics.poverty_rate > 10 ? '#f97316' : '#22c55e'
        : '#64748b',
      description: 'Below poverty line',
    },
    {
      label: 'Unemployment',
      value: demographics.unemployment_rate,
      format: formatPercent,
      color: demographics.unemployment_rate !== undefined
        ? demographics.unemployment_rate > 8 ? '#ef4444' : demographics.unemployment_rate > 5 ? '#f97316' : '#22c55e'
        : '#64748b',
      description: 'Labor force',
    },
    {
      label: 'Population Density',
      value: demographics.population_density,
      format: (v: number | undefined) => formatNumber(v, '/km²'),
      color: '#3b82f6',
      description: 'Per square km',
    },
    {
      label: 'College Educated',
      value: demographics.college_educated_pct,
      format: formatPercent,
      color: demographics.college_educated_pct !== undefined
        ? demographics.college_educated_pct > 40 ? '#22c55e' : demographics.college_educated_pct > 20 ? '#eab308' : '#f97316'
        : '#64748b',
      description: "Bachelor's or higher",
    },
    {
      label: 'Median Income',
      value: demographics.median_household_income,
      format: formatCurrency,
      color: '#8b5cf6',
      description: 'Household',
    },
  ]

  return (
    <div className="space-y-3">
      {metrics.map((metric) => (
        <div key={metric.label} className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">{metric.label}</div>
            <div className="text-xs text-slate-500">{metric.description}</div>
          </div>
          <div
            className="text-sm font-mono font-medium"
            style={{ color: metric.color }}
          >
            {metric.format(metric.value)}
          </div>
        </div>
      ))}
    </div>
  )
}
