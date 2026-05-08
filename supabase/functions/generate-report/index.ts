// Supabase Edge Function for generating PDF reports
// Deploy with: supabase functions deploy generate-report

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { jsPDF } from "https://esm.sh/jspdf@2.5.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TractData {
  geoid: string
  name: string
  state_fips: string
  county_fips: string
  area_sq_km: number
}

interface ScoreData {
  composite_score: number
  employment_density_score: number
  formation_rate_score: number
  workforce_inflow_score: number
  income_growth_score: number
  diversity_score: number
  period: string
}

interface DemographicsData {
  poverty_rate: number | null
  unemployment_rate: number | null
  population_density: number | null
  college_educated_pct: number | null
  median_household_income: number | null
}

interface EligibilityData {
  opportunity_zone: boolean
  empowerment_zone: boolean
  hub_zone: boolean
  designation_year: number | null
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { geoid } = await req.json()

    if (!geoid || geoid.length !== 11) {
      return new Response(
        JSON.stringify({ error: 'Invalid geoid. Must be 11 digits.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch tract data
    const { data: tractData, error: tractError } = await supabase
      .from('tracts')
      .select('geoid, name, state_fips, county_fips, area_sq_km')
      .eq('geoid', geoid)
      .single()

    if (tractError || !tractData) {
      return new Response(
        JSON.stringify({ error: 'Tract not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tract = tractData as TractData

    // Fetch latest scores
    const { data: scoresData } = await supabase
      .from('vitality_scores')
      .select('composite_score, employment_density_score, formation_rate_score, workforce_inflow_score, income_growth_score, diversity_score, period')
      .eq('geoid', geoid)
      .order('period', { ascending: false })
      .limit(1)

    const scores: ScoreData | null = scoresData?.[0] || null

    // Fetch demographics
    const { data: metricsData } = await supabase
      .from('tract_metrics')
      .select('poverty_rate, unemployment_rate, population_density, college_educated_pct, median_household_income')
      .eq('geoid', geoid)
      .order('period', { ascending: false })
      .limit(1)

    const demographics: DemographicsData | null = metricsData?.[0] || null

    // Fetch eligibility
    const { data: eligibilityData } = await supabase
      .from('tract_eligibility')
      .select('opportunity_zone, empowerment_zone, hub_zone, designation_year')
      .eq('geoid', geoid)
      .limit(1)

    const eligibility: EligibilityData | null = eligibilityData?.[0] || null

    // Fetch POI counts
    const { data: poisData } = await supabase
      .from('pois')
      .select('category')
      .eq('geoid', geoid)

    const poiCounts: Record<string, number> = {}
    if (poisData) {
      for (const poi of poisData) {
        poiCounts[poi.category] = (poiCounts[poi.category] || 0) + 1
      }
    }

    // Generate PDF
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 20

    // Helper functions
    const addTitle = (text: string) => {
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text(text, pageWidth / 2, y, { align: 'center' })
      y += 12
    }

    const addSubtitle = (text: string) => {
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(text, 20, y)
      y += 8
    }

    const addText = (label: string, value: string) => {
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(`${label}: ${value}`, 25, y)
      y += 6
    }

    const addSpacer = () => { y += 8 }

    // Title
    addTitle('EconPulse District Health Report')

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(tract.name || `Census Tract ${geoid}`, pageWidth / 2, y, { align: 'center' })
    y += 8
    doc.setFontSize(10)
    doc.text(`GEOID: ${geoid}`, pageWidth / 2, y, { align: 'center' })
    y += 6
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: 'center' })
    y += 15

    // Eligibility badges
    if (eligibility) {
      const badges: string[] = []
      if (eligibility.opportunity_zone) badges.push('Opportunity Zone')
      if (eligibility.empowerment_zone) badges.push('Empowerment Zone')
      if (eligibility.hub_zone) badges.push('HUBZone')

      if (badges.length > 0) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(`Federal Designations: ${badges.join(', ')}`, pageWidth / 2, y, { align: 'center' })
        y += 10
      }
    }

    // Economic Vitality Score
    addSubtitle('Economic Vitality Score')
    if (scores) {
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      const scoreColor = scores.composite_score >= 60 ? [0, 150, 100] : scores.composite_score >= 40 ? [200, 150, 0] : [200, 50, 50]
      doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2])
      doc.text(scores.composite_score.toFixed(1), 25, y + 2)
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('/ 100', 50, y + 2)
      doc.text(`(as of ${scores.period})`, 70, y + 2)
      y += 12
    } else {
      addText('Score', 'No data available')
    }

    addSpacer()

    // Score Breakdown
    if (scores) {
      addSubtitle('Score Components')
      addText('Employment Density', `${scores.employment_density_score?.toFixed(1) || '--'} / 100`)
      addText('Business Formation', `${scores.formation_rate_score?.toFixed(1) || '--'} / 100`)
      addText('Workforce Inflow', `${scores.workforce_inflow_score?.toFixed(1) || '--'} / 100`)
      addText('Income Level', `${scores.income_growth_score?.toFixed(1) || '--'} / 100`)
      addText('Business Diversity', `${scores.diversity_score?.toFixed(1) || '--'} / 100`)
      addSpacer()
    }

    // Demographics
    addSubtitle('Demographics')
    if (demographics) {
      addText('Poverty Rate', demographics.poverty_rate != null ? `${demographics.poverty_rate.toFixed(1)}%` : 'N/A')
      addText('Unemployment Rate', demographics.unemployment_rate != null ? `${demographics.unemployment_rate.toFixed(1)}%` : 'N/A')
      addText('Population Density', demographics.population_density != null ? `${demographics.population_density.toFixed(0)} per km²` : 'N/A')
      addText('College Educated', demographics.college_educated_pct != null ? `${demographics.college_educated_pct.toFixed(1)}%` : 'N/A')
      addText('Median Household Income', demographics.median_household_income != null ? `$${demographics.median_household_income.toLocaleString()}` : 'N/A')
    } else {
      addText('Demographics', 'No data available')
    }
    addSpacer()

    // Business Categories
    const poiEntries = Object.entries(poiCounts).sort((a, b) => b[1] - a[1])
    if (poiEntries.length > 0) {
      addSubtitle('Business Categories')
      for (const [category, count] of poiEntries.slice(0, 8)) {
        const label = category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        addText(label, count.toString())
      }
      addSpacer()
    }

    // Investment Priority
    addSubtitle('Investment Priority Analysis')
    if (scores) {
      const needScore = 100 - scores.composite_score
      const potentialScore = scores.workforce_inflow_score || 50
      const rawPriority = needScore * 0.6 + potentialScore * 0.4
      const normalizedPriority = Math.max(0, Math.min(100, ((rawPriority - 35) / 30) * 100))

      let priorityLabel = 'Moderate'
      if (normalizedPriority >= 80) priorityLabel = 'Critical - Highest Priority'
      else if (normalizedPriority >= 60) priorityLabel = 'High Priority'
      else if (normalizedPriority >= 40) priorityLabel = 'Moderate'
      else if (normalizedPriority >= 20) priorityLabel = 'Lower Priority'
      else priorityLabel = 'Low Priority (Thriving Area)'

      addText('Investment Priority Score', normalizedPriority.toFixed(1))
      addText('Priority Level', priorityLabel)
    }

    // Footer
    y = doc.internal.pageSize.getHeight() - 20
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.text('Generated by EconPulse Economic Intelligence Platform', pageWidth / 2, y, { align: 'center' })
    doc.text('Data sources: Census ACS, LEHD, County Business Patterns, OpenStreetMap', pageWidth / 2, y + 5, { align: 'center' })

    // Output PDF
    const pdfOutput = doc.output('arraybuffer')

    return new Response(pdfOutput, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="econpulse-report-${geoid}.pdf"`,
      },
    })

  } catch (error) {
    console.error('Error generating report:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate report', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
