export default function Methodology() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-white mb-2">Data Sources & Methodology</h1>
      <p className="text-slate-400 mb-8">
        Transparency about where our data comes from and how we calculate vitality scores.
      </p>

      {/* Data Sources */}
      <section className="mb-10">
        <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-teal-accent/20 text-teal-accent flex items-center justify-center text-sm">1</span>
          Data Sources
        </h2>

        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-white">Census American Community Survey (ACS)</h3>
              <span className="text-xs bg-teal-accent/20 text-teal-accent px-2 py-1 rounded">Annual</span>
            </div>
            <p className="text-sm text-slate-400 mb-2">
              Demographics, median household income, housing vacancy rates, educational attainment.
            </p>
            <p className="text-xs text-slate-500">
              Source: U.S. Census Bureau • 5-year estimates • Tract level
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-white">LEHD Origin-Destination Employment Statistics (LODES)</h3>
              <span className="text-xs bg-amber-accent/20 text-amber-accent px-2 py-1 rounded">2-3 Year Lag</span>
            </div>
            <p className="text-sm text-slate-400 mb-2">
              Worker commuting patterns — where people live vs. where they work. Used as a proxy for daytime foot traffic.
            </p>
            <p className="text-xs text-slate-500">
              Source: U.S. Census Bureau • Latest available: 2021 • Block level aggregated to tract
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-white">County Business Patterns (CBP)</h3>
              <span className="text-xs bg-teal-accent/20 text-teal-accent px-2 py-1 rounded">Annual</span>
            </div>
            <p className="text-sm text-slate-400 mb-2">
              Establishment counts and employment by industry (NAICS code). Used to calculate business diversity.
            </p>
            <p className="text-xs text-slate-500">
              Source: U.S. Census Bureau • County level distributed to tracts
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-white">OpenStreetMap (OSM)</h3>
              <span className="text-xs bg-teal-accent/20 text-teal-accent px-2 py-1 rounded">Weekly</span>
            </div>
            <p className="text-sm text-slate-400 mb-2">
              Points of interest — restaurants, retail, offices, banks, etc. Crowdsourced and continuously updated.
            </p>
            <p className="text-xs text-slate-500">
              Source: OpenStreetMap Contributors • Point level assigned to tracts
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-white">TIGER/Line Shapefiles</h3>
              <span className="text-xs bg-slate-600 text-slate-300 px-2 py-1 rounded">Static</span>
            </div>
            <p className="text-sm text-slate-400 mb-2">
              Geographic boundaries for Census tracts. Updated after each decennial Census.
            </p>
            <p className="text-xs text-slate-500">
              Source: U.S. Census Bureau • 2022 boundaries
            </p>
          </div>
        </div>
      </section>

      {/* Vitality Score */}
      <section className="mb-10">
        <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-teal-accent/20 text-teal-accent flex items-center justify-center text-sm">2</span>
          Vitality Score Methodology
        </h2>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <p className="text-slate-300 mb-4">
            The composite vitality score (0-100) measures relative economic health by combining five metrics.
            Each metric is converted to a <strong className="text-white">percentile rank</strong> across all tracts in the dataset,
            then combined using configurable weights.
          </p>

          <div className="space-y-4 mt-6">
            <div className="flex items-center gap-4">
              <div className="w-16 text-right">
                <span className="text-2xl font-mono text-teal-accent">25%</span>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium">Employment Density</h4>
                <p className="text-sm text-slate-400">Jobs per square kilometer. Higher density = more economic activity.</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 text-right">
                <span className="text-2xl font-mono text-teal-accent">20%</span>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium">Business Formation</h4>
                <p className="text-sm text-slate-400">Rate of new business creation. Indicates entrepreneurial activity.</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 text-right">
                <span className="text-2xl font-mono text-teal-accent">20%</span>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium">Workforce Inflow</h4>
                <p className="text-sm text-slate-400">Workers commuting into the area daily. Proxy for foot traffic.</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 text-right">
                <span className="text-2xl font-mono text-teal-accent">20%</span>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium">Income Level</h4>
                <p className="text-sm text-slate-400">Median household income percentile. Indicates purchasing power.</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 text-right">
                <span className="text-2xl font-mono text-teal-accent">15%</span>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium">Business Diversity</h4>
                <p className="text-sm text-slate-400">Shannon entropy of industry mix. Diverse economies are more resilient.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-800 rounded-lg">
            <p className="text-sm text-slate-300">
              <strong className="text-white">Formula:</strong> Composite = (Employment × 0.25) + (Formation × 0.20) + (Inflow × 0.20) + (Income × 0.20) + (Diversity × 0.15)
            </p>
          </div>
        </div>
      </section>

      {/* Limitations */}
      <section className="mb-10">
        <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-amber-accent/20 text-amber-accent flex items-center justify-center text-sm">!</span>
          Limitations & Considerations
        </h2>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <ul className="space-y-3 text-slate-300">
            <li className="flex gap-3">
              <span className="text-amber-accent">•</span>
              <span><strong className="text-white">Data Lag:</strong> Most Census data is 1-2 years old by release. LEHD data may be 2-3 years lagged. Scores reflect recent history, not real-time conditions.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-accent">•</span>
              <span><strong className="text-white">Annual Granularity:</strong> Data updates annually. Not suitable for detecting week-to-week or month-to-month changes.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-accent">•</span>
              <span><strong className="text-white">Tract Resolution:</strong> Census tracts average ~4,000 residents. Data cannot be disaggregated to individual blocks or addresses.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-accent">•</span>
              <span><strong className="text-white">Worker Flows ≠ All Foot Traffic:</strong> LEHD captures commuters, not shoppers, tourists, or residents moving within neighborhoods.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-accent">•</span>
              <span><strong className="text-white">Relative Scores:</strong> A score of 75 means "better than 75% of tracts in this dataset" — not an absolute measure. Scores may shift as new tracts are added.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Best Use Cases */}
      <section>
        <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-teal-accent/20 text-teal-accent flex items-center justify-center text-sm">✓</span>
          Best Use Cases
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2">Strategic Planning</h3>
            <p className="text-sm text-slate-400">Identify which areas to prioritize for investment, outreach, or improvement projects.</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2">Trend Analysis</h3>
            <p className="text-sm text-slate-400">Track how neighborhoods change over quarters and years. Spot decline early.</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2">Opportunity Identification</h3>
            <p className="text-sm text-slate-400">Find underserved high-traffic areas for tenant recruitment or new business siting.</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2">Reporting & Advocacy</h3>
            <p className="text-sm text-slate-400">Quantify economic health for board presentations, grant applications, and policy discussions.</p>
          </div>
        </div>
      </section>

      <footer className="mt-12 pt-6 border-t border-slate-800 text-center text-sm text-slate-500">
        Questions about our methodology? Contact us at methodology@econpulse.com
      </footer>
    </div>
  )
}
