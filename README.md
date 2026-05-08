# EconPulse

**Economic Intelligence Platform for Business Improvement Districts & Economic Development Organizations**

A zero-cost platform that transforms public Census data into actionable economic insights. Track neighborhood vitality, identify opportunity gaps, and monitor economic changes across any U.S. geography.

![License](https://img.shields.io/badge/license-proprietary-red)
![Status](https://img.shields.io/badge/status-beta-yellow)

**Live Demo:** [https://econpulse-nine.vercel.app](https://econpulse-nine.vercel.app)

---

## Table of Contents

- [Features](#features)
- [User Guide](#user-guide)
- [Architecture](#architecture)
- [Data Sources](#data-sources)
- [Quick Start](#quick-start)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Methodology](#methodology)

---

## Features

### Core Capabilities

- **Dual View Modes**: Toggle between Economic Vitality (identify thriving areas) and Investment Priority (identify where to focus resources)
- **Interactive Choropleth Map**: Color-coded visualization of economic health across Census tracts
- **Trend Analysis**: 8-quarter historical score charts showing economic trajectory
- **Demographics Panel**: Poverty rate, unemployment, population density, education levels
- **Federal Eligibility Badges**: Opportunity Zone, HUBZone, Empowerment Zone indicators
- **Opportunity Gap Finder**: Identify high-traffic areas underserved by specific business categories
- **PDF Report Generation**: Download professional "District Health Reports" for any tract
- **Automated Alerts**: Track significant economic changes (new businesses, closures, score shifts)

---

## User Guide

### Dashboard (Main Map)

The primary interface for exploring economic data across Census tracts.

#### Left Panel Controls

**View Mode Toggle**
| Mode | Colors | Use Case |
|------|--------|----------|
| Economic Vitality | Green=thriving, Red=struggling | Assess current economic health |
| Investment Priority | Red=high priority, Gray=low priority | Identify where to focus resources |

**Display Metric**
| Metric | Description |
|--------|-------------|
| Composite Score | Weighted average of all 5 metrics (default) |
| Employment Density | Jobs per square kilometer |
| Business Formation | New business creation rate |
| Workforce Inflow | Daily commuters entering the area |
| Income Level | Median household income percentile |
| Business Diversity | Industry mix variety (Shannon entropy) |

**Score Weights**
Customize how the composite score is calculated by adjusting the sliders. Default weights:
- Employment Density: 25%
- Business Formation: 20%
- Workforce Inflow: 20%
- Income Level: 20%
- Business Diversity: 15%

#### Map Interaction

- **Click** any tract to view detailed information
- **Hover** to see tract name and score tooltip
- Colors represent quintiles (20-point ranges)

#### Right Panel - Tract Detail

When you select a tract, you'll see:

1. **Header**: Tract name and 11-digit GEOID
2. **Eligibility Badges**: Federal designations (OZ=Opportunity Zone, HUB=HUBZone, etc.)
3. **Score Display**: Large score with trend indicator (↑ Rising, → Stable, ↓ Declining)
4. **Score Breakdown**: Bar chart of all 5 component scores
5. **Score History**: Line chart showing 8 quarters of trend data
6. **Demographics**: Poverty rate, unemployment, population density, education level, median income
7. **Business Categories**: Count of POIs by type
8. **Download Report**: Generate a PDF report for this tract

---

### Opportunity Gaps (VoidFinder)

Find high-traffic areas underserved by specific business categories.

#### Parameters

| Parameter | Recommended | Description |
|-----------|-------------|-------------|
| Category | Based on focus | Type of business you're scouting for |
| Min. Worker Inflow | 500-1000 | Minimum daily commuters (higher = busier areas) |

#### Available Categories
- Food & Beverage
- Retail
- Professional Services
- Financial
- Healthcare
- Education

#### How to Use
1. Select a business category
2. Set minimum worker inflow threshold
3. Click "Find Opportunities"
4. Review results showing tracts with high foot traffic but few existing businesses

#### Reading Results
- **Inflow**: Daily workers entering (potential customers)
- **POIs**: Current businesses of that type (competition)
- **Score**: Overall economic vitality

---

### Alerts

Monitor economic changes and notable events.

| Alert Type | Color | Meaning |
|------------|-------|---------|
| New Business | Green | New establishment opened |
| Closure | Red | Business closed |
| Employment Spike | Blue | Significant job gains |
| Score Change | Amber | Vitality score shifted significantly |

Click any alert to navigate to that tract on the Dashboard.

---

### Reports

Generate PDF reports for council presentations or grant applications.

**From Dashboard**: Click "Download Report" on any selected tract.

**From Reports Page**: Enter an 11-digit GEOID manually.

#### Report Contents
- Tract identification and location
- Federal program eligibility badges
- Economic Vitality Score (color-coded)
- All 5 component scores
- Demographics (poverty, unemployment, education, income)
- Business category breakdown
- Investment Priority analysis

---

### Methodology

View detailed documentation on data sources, scoring methodology, limitations, and best use cases.

---

## Practical Workflows

### For Planning Committees
1. Open Dashboard in **Investment Priority** mode
2. Identify red/pink tracts (high priority areas)
3. Click to view demographics and eligibility badges
4. Check Score History for trend direction
5. Use Opportunity Gaps to find missing businesses
6. Download PDF reports for presentations

### For Site Selection
1. Use **Economic Vitality** mode to find thriving areas
2. Look for high Workforce Inflow scores
3. Use Opportunity Gaps to confirm category isn't oversaturated
4. Check Demographics for income levels

### For Grant Applications
1. Switch to **Investment Priority** mode
2. Find high-priority tracts
3. Document: low vitality, high poverty, Opportunity Zone status
4. Use Score History to show declining trend
5. Download PDF report as supporting documentation

---

## Architecture

```
econpulse/
├── frontend/              # React + Vite + TypeScript
│   ├── src/
│   │   ├── pages/         # Dashboard, VoidFinder, Alerts, Reports, Methodology
│   │   ├── components/    # TrendChart, DemographicsPanel, EligibilityBadges
│   │   ├── store/         # Zustand state management
│   │   ├── api/           # Supabase API client
│   │   └── types/         # TypeScript interfaces
│   └── package.json
├── supabase/
│   └── functions/
│       └── generate-report/  # Edge Function for PDF generation
├── pipeline/              # Data ingestion scripts
│   ├── census_acs.py      # Demographics & income
│   ├── census_cbp.py      # Business patterns
│   ├── load_eligibility.py # Opportunity Zone data
│   └── scoring.py         # Vitality score computation
├── database/
│   ├── migration_001_init.sql         # Core schema
│   ├── migration_002_demographics.sql # Demographics columns
│   └── migration_003_eligibility.sql  # Eligibility table
└── .env                   # Environment variables
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| State | Zustand |
| Maps | Leaflet, react-leaflet |
| Charts | Recharts |
| Database | Supabase (PostgreSQL + PostGIS) |
| PDF Generation | Supabase Edge Functions + jsPDF |
| Hosting | Vercel (frontend), Supabase (backend) |

---

## Data Sources

| Source | Data | Update Frequency |
|--------|------|------------------|
| Census ACS 5-Year | Demographics, income, education, poverty | Annual |
| Census LEHD/LODES | Worker origin-destination flows | Annual |
| Census CBP | Business establishments by industry | Annual |
| Census TIGER | Tract boundary geometries | Static |
| OpenStreetMap | Points of interest | Weekly |
| IRS/Treasury | Opportunity Zone designations | Static |

---

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Supabase account (free tier)
- Census API key (free from https://api.census.gov/data/key_signup.html)

### 1. Clone and Setup

```bash
git clone https://github.com/enzomur/econpulse.git
cd econpulse
cp .env.example .env
# Fill in your API keys in .env
```

### 2. Database Setup

1. Create a Supabase project at https://supabase.com
2. Run migrations in SQL Editor (in order):
   - `database/migration_001_init.sql`
   - `database/migration_002_demographics.sql`
   - `database/migration_003_eligibility.sql`
3. Add your Supabase URL and keys to `.env`

### 3. Load Data

```bash
# Install Python dependencies
pip install pandas requests python-dotenv supabase

# Load Census ACS demographics (Manhattan)
python pipeline/census_acs.py --state 36 --county 061

# Load Opportunity Zone eligibility
python pipeline/load_eligibility.py
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:5173

### 5. Deploy Edge Function (for PDF export)

```bash
npx supabase login
npx supabase functions deploy generate-report --project-ref YOUR_PROJECT_REF
```

---

## Deployment

### Frontend (Vercel)

```bash
cd frontend
npm run build
vercel --prod
```

Or connect your GitHub repo to Vercel for automatic deployments.

### Edge Functions (Supabase)

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy generate-report
```

---

## Environment Variables

```env
# Census API (required for data pipeline)
CENSUS_API_KEY=your_key_here

# Supabase (required)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Frontend (set in Vercel)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Optional
SENDGRID_API_KEY=          # For email alerts
GOOGLE_PLACES_KEY=         # For enhanced POI data

# App Config
STATE_FIPS=36              # New York
COUNTY_FIPS=061            # Manhattan
```

---

## API Reference

The frontend calls Supabase directly using the anon key. Key queries:

| Function | Description |
|----------|-------------|
| `get_tracts_geojson(state, county)` | Returns tract geometries as GeoJSON |
| `vitality_scores` table | Economic scores by tract and period |
| `tract_metrics` table | Demographics and economic metrics |
| `tract_eligibility` table | Federal program eligibility flags |
| `pois` table | Points of interest with categories |
| `alerts` table | Economic change notifications |

### Edge Functions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/functions/v1/generate-report` | POST | Generate PDF report for a tract |

---

## Methodology

### Vitality Score

The composite score (0-100) combines 5 metrics, each converted to a percentile rank:

| Metric | Weight | Description |
|--------|--------|-------------|
| Employment Density | 25% | Jobs per square kilometer |
| Business Formation | 20% | Rate of new business creation |
| Workforce Inflow | 20% | Workers commuting into the area |
| Income Level | 20% | Median household income percentile |
| Business Diversity | 15% | Shannon entropy of industry mix |

### Investment Priority Score

Calculated as: `(100 - Vitality) × 0.6 + Workforce Inflow × 0.4`

This identifies areas with both **need** (low vitality) and **potential** (high foot traffic).

### Color Scales

**Vitality Mode**
| Score | Color | Meaning |
|-------|-------|---------|
| 80-100 | Teal | Thriving |
| 60-80 | Lime | Strong |
| 40-60 | Yellow | Stable |
| 20-40 | Orange | Struggling |
| 0-20 | Red | Distressed |

**Investment Priority Mode**
| Score | Color | Meaning |
|-------|-------|---------|
| 80-100 | Red | Critical - Highest Priority |
| 60-80 | Pink | High Priority |
| 40-60 | Purple | Moderate |
| 20-40 | Blue | Lower Priority |
| 0-20 | Gray | Thriving - Low Priority |

### Limitations

- **Data Lag**: Census data is 1-2 years old; LEHD may be 2-3 years lagged
- **Annual Updates**: Not suitable for real-time monitoring
- **Tract Resolution**: ~4,000 residents per tract; cannot disaggregate further
- **Commuter Data**: LEHD captures workers, not shoppers or tourists
- **Relative Scores**: Percentile-based; scores shift as data changes

---

## Target Geography

Default configuration targets Manhattan, NY:
- State FIPS: `36` (New York)
- County FIPS: `061` (New York County / Manhattan)

To target a different area:
1. Update `STATE_FIPS` and `COUNTY_FIPS` in `.env`
2. Re-run the data pipeline scripts
3. Update the map center coordinates in `Dashboard.tsx`

---

## Roadmap

- [x] Core dashboard with choropleth map
- [x] Vitality scoring engine
- [x] Dual view modes (Vitality / Investment Priority)
- [x] Trend visualization with historical charts
- [x] Demographics panel
- [x] Federal eligibility badges (Opportunity Zones)
- [x] PDF report generation
- [x] Opportunity Gap finder
- [ ] Email alert system
- [ ] Multi-county support
- [ ] Custom geography selection UI
- [ ] County comparison reports

---

## License

Proprietary - All rights reserved.

---

## Acknowledgments

Data sources:
- U.S. Census Bureau (ACS, LEHD, CBP, TIGER)
- U.S. Treasury / IRS (Opportunity Zone designations)
- OpenStreetMap contributors

Built with:
- React, TypeScript, Vite, Tailwind CSS
- Supabase (PostgreSQL, PostGIS, Edge Functions)
- Leaflet, Recharts, jsPDF
