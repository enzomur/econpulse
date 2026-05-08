import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { VitalityScore } from '../types'

interface TrendChartProps {
  scores: VitalityScore[]
  selectedMetric: 'composite' | 'employment_density' | 'formation_rate' | 'workforce_inflow' | 'income_growth' | 'diversity'
}

const metricLabels: Record<string, string> = {
  composite: 'Composite',
  employment_density: 'Employment Density',
  formation_rate: 'Business Formation',
  workforce_inflow: 'Workforce Inflow',
  income_growth: 'Income Level',
  diversity: 'Business Diversity',
}

export default function TrendChart({ scores, selectedMetric }: TrendChartProps) {
  if (!scores || scores.length < 2) {
    return (
      <div className="text-sm text-slate-500 text-center py-4">
        Not enough historical data for trend chart
      </div>
    )
  }

  // Reverse to show oldest first (left to right chronological)
  const chartData = [...scores].reverse().map((score) => ({
    period: score.period,
    composite: score.composite_score,
    selected: selectedMetric === 'composite'
      ? score.composite_score
      : selectedMetric === 'employment_density'
        ? score.employment_density_score
        : selectedMetric === 'formation_rate'
          ? score.formation_rate_score
          : selectedMetric === 'workforce_inflow'
            ? score.workforce_inflow_score
            : selectedMetric === 'income_growth'
              ? score.income_growth_score
              : score.diversity_score,
  }))

  // Format period label (e.g., "2024Q1" -> "Q1 '24")
  const formatPeriod = (period: string) => {
    const match = period.match(/(\d{4})Q(\d)/)
    if (match) {
      return `Q${match[2]} '${match[1].slice(2)}`
    }
    return period
  }

  const showSecondLine = selectedMetric !== 'composite'

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="period"
            tickFormatter={formatPeriod}
            stroke="#64748b"
            tick={{ fontSize: 10 }}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#64748b"
            tick={{ fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#94a3b8' }}
            labelFormatter={formatPeriod}
            formatter={(value: number, name: string) => [
              value?.toFixed(1) || '--',
              name === 'composite' ? 'Composite' : metricLabels[selectedMetric],
            ]}
          />
          {showSecondLine && (
            <Legend
              wrapperStyle={{ fontSize: '10px' }}
              formatter={(value: string) =>
                value === 'composite' ? 'Composite' : metricLabels[selectedMetric]
              }
            />
          )}
          <Line
            type="monotone"
            dataKey="composite"
            stroke="#00d4aa"
            strokeWidth={2}
            dot={{ r: 3, fill: '#00d4aa' }}
            activeDot={{ r: 5 }}
          />
          {showSecondLine && (
            <Line
              type="monotone"
              dataKey="selected"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ r: 3, fill: '#8b5cf6' }}
              activeDot={{ r: 5 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
