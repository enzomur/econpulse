# EconPulse

**Economic Intelligence Platform for Business Improvement Districts & Economic Development Organizations**

A zero-cost platform that transforms public Census data into actionable economic insights. Track neighborhood vitality, identify opportunity gaps, and monitor economic changes across any U.S. geography.

![License](https://img.shields.io/badge/license-proprietary-red)
![Status](https://img.shields.io/badge/status-beta-yellow)

---

## Features

- **Vitality Scoring**: Composite economic health scores (0-100) for every Census tract based on 5 key metrics
- **Interactive Choropleth Map**: Color-coded visualization of economic vitality across neighborhoods
- **Opportunity Gap Finder**: Identify high-traffic areas underserved by specific business categories
- **Trend Analysis**: Track economic changes over time with historical comparisons
- **Automated Alerts**: Get notified of significant economic changes (new businesses, closures, employment spikes)
- **PDF Reports**: Generate professional "District Health Reports" for any geography

---

## Architecture

```
econpulse/
├── backend/          # FastAPI Python API
│   ├── app/
│   │   └── main.py   # API routes
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/         # React + Vite + TypeScript
│   ├── src/
│   │   ├── pages/    # Dashboard, VoidFinder, Alerts, Reports
│   │   ├── components/
│   │   ├── store/    # Zustand state management
│   │   └── api/      # Typed API client
│   └── package.json
├── pipeline/         # Data ingestion scripts
│   ├── census_acs.py     # Demographics & income
│   ├── census_lehd.py    # Worker flow data
│   ├── census_cbp.py     # Business patterns
│   ├── osm_pois.py       # Points of interest
│   └── scoring.py        # Vitality score computation
├── database/
│   └── migration_001_init.sql  # PostgreSQL + PostGIS schema
└── .github/workflows/
    ├── pipeline.yml      # Weekly data refresh
    └── deploy.yml        # CI/CD deployment
```

---

## Data Sources

| Source | Data | Update Frequency |
|--------|------|------------------|
| Census ACS 5-Year | Demographics, income, housing | Annual |
| Census LEHD/LODES | Worker origin-destination flows | Annual |
| Census CBP | Business establishments by industry | Annual |
| Census TIGER | Tract boundary geometries | Static |
| OpenStreetMap | Points of interest | Weekly |

---

## Vitality Score Methodology

The composite vitality score (0-100) is a weighted combination of 5 metrics:

| Metric | Weight | Description |
|--------|--------|-------------|
| Employment Density | 25% | Jobs per square kilometer |
| Business Formation | 20% | Rate of new business creation |
| Workforce Inflow | 20% | Workers commuting into the area |
| Income Level | 20% | Median household income percentile |
| Business Diversity | 15% | Shannon entropy of industry mix |

Each metric is converted to a percentile rank (0-100) across all tracts in the dataset, then combined using the weights above.

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Supabase account (free tier)
- Census API key (free)

### 1. Clone and Setup

```bash
git clone https://github.com/yourusername/econpulse.git
cd econpulse
cp .env.example .env
# Fill in your API keys in .env
```

### 2. Database Setup

1. Create a Supabase project at https://supabase.com
2. Run `database/migration_001_init.sql` in the SQL Editor
3. Add your Supabase URL and keys to `.env`

### 3. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. Load Data

```bash
cd pipeline
pip install -r requirements.txt
python census_acs.py --state 36 --county 061
python scoring.py
```

---

## Environment Variables

```env
# Census API (required)
CENSUS_API_KEY=your_key_here

# Supabase (required)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Optional
SENDGRID_API_KEY=          # For email alerts
ANTHROPIC_API_KEY=         # For AI report summaries
GOOGLE_PLACES_KEY=         # For enhanced POI data

# App Config
CORS_ORIGINS=http://localhost:5173
ENVIRONMENT=development
```

---

## Deployment

### Backend (Railway)

```bash
cd backend
railway login
railway init
railway up
```

### Frontend (Vercel)

```bash
cd frontend
vercel --prod
```

Set `VITE_API_URL` environment variable in Vercel to your Railway backend URL.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/tracts?state=36&county=061` | Get all tracts as GeoJSON |
| GET | `/api/tract/{geoid}` | Get tract details with score history |
| GET | `/api/alerts` | Get recent economic alerts |
| GET | `/api/voids?state=36&county=061&category=food_beverage&min_inflow=500` | Find opportunity gaps |
| POST | `/api/report` | Generate PDF report |

---

## Target Geography

Default configuration targets Manhattan, NY:
- State FIPS: `36` (New York)
- County FIPS: `061` (New York County)
- Bounding Box: `40.70,-74.02,40.88,-73.90`

To target a different area, update the values in `.env` and re-run the data pipeline.

---

## Cost Structure

| Service | Free Tier | Paid Threshold |
|---------|-----------|----------------|
| Supabase | 500MB DB, 2GB bandwidth | ~500 tracts |
| Railway | $5/mo after trial | First customer |
| Vercel | 100GB bandwidth | High traffic |
| Census API | Unlimited | Never |
| OpenStreetMap | Fair use | Never |

**Total cost to first paying customer: $0-50**

---

## Roadmap

- [x] Core dashboard with choropleth map
- [x] Vitality scoring engine
- [x] Census data pipeline (ACS, LEHD, CBP)
- [x] Tract boundary loading (TIGER)
- [ ] PDF report generation
- [ ] Email alert system
- [ ] Lead capture page
- [ ] Multi-tenant support
- [ ] Custom geography selection

---

## License

Proprietary - All rights reserved.

---

## Acknowledgments

Data sources:
- U.S. Census Bureau (ACS, LEHD, CBP, TIGER)
- Bureau of Labor Statistics
- OpenStreetMap contributors
