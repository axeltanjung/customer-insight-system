# Customer Insight & Trend Intelligences System

A production-quality NLP platform that extracts actionable business insights from user-generated text data using transformer-based sentiment analysis, BERTopic clustering, and automated trend detection.

## Business Use Case

**Problem**: Companies receive thousands of customer mentions across social media and forums daily. Manual monitoring is impossible at scale, and teams miss critical sentiment shifts, emerging complaints, and trending topics until they become PR crises.

**Solution**: This system automates the entire customer intelligence pipeline:

1. **Ingests** real-time data from Reddit (or synthetic fallback)
2. **Analyzes** sentiment using both VADER (fast) and RoBERTa transformers (accurate)
3. **Discovers** topics via BERTopic unsupervised clustering
4. **Detects** anomalies — negative spikes, emerging topics, sentiment shifts
5. **Alerts** stakeholders when negative sentiment exceeds thresholds

### Example Business Decisions Enabled

| Insight | Action |
|---------|--------|
| Negative spike on "authentication" topic | Engineering escalation to investigate auth service outage |
| Emerging topic around "billing" with 300% growth | Product team reviews recent pricing change impact |
| Sustained sentiment decline over 2 weeks | Customer success team launches proactive outreach campaign |
| New topic cluster around competitor mentions | Marketing adjusts positioning strategy |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│  Dashboard │ Topic Explorer │ Trends │ Search │ API  │
└─────────────────────┬───────────────────────────────┘
                      │ REST API
┌─────────────────────┴───────────────────────────────┐
│                  Backend (FastAPI)                    │
│  /analyze │ /topics │ /trends │ /search │ /alerts    │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────┐
│               NLP Pipeline                           │
│  Ingestion → Processing → Sentiment → Topics → NER  │
│  (Reddit/     (cleaning,   (VADER +    (BERTopic)    │
│   Synthetic)   lang detect)  RoBERTa)                │
└─────────────────────────────────────────────────────┘
```

## Features

### Core NLP Pipeline
- **Data Ingestion**: Reddit API (PRAW) with 5000+ record synthetic fallback
- **Text Processing**: HTML/URL cleanup, emoji demojization, language detection
- **Sentiment Analysis**: Dual-model (VADER baseline + RoBERTa transformer)
- **Topic Modeling**: BERTopic with automatic human-readable labeling
- **Named Entity Recognition**: spaCy NER extraction and aggregation
- **Trend Detection**: Spike detection (z-score), emerging topics, sentiment shifts

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/pipeline/run` | POST | Run full NLP pipeline |
| `/analyze` | POST | Analyze single text |
| `/kpis` | GET | Dashboard KPIs |
| `/topics` | GET | All topics with keywords |
| `/trends` | GET | Time-series trend data |
| `/alerts` | GET | Active alerts |
| `/search` | GET | Search with filters |
| `/entities` | GET | NER entity summary |
| `/data/sample` | GET | Raw data sample |

### Frontend Dashboard
- **Dashboard**: KPI cards, sentiment trend chart, topic distribution, alerts
- **Topic Explorer**: Expandable topic clusters with keywords and example texts
- **Trend Analysis**: Time-series charts, spike detection, emerging topic tracking
- **Search**: Full-text search with sentiment and topic filters
- **Alerts**: Severity-categorized alert center
- **Live Analyze**: Real-time text analysis tool

---

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Clone the project
cd customer-insight-system

# Configure (optional — synthetic data works without API keys)
cp backend/.env.example backend/.env
# Edit backend/.env with Reddit API credentials if desired

# Build and run
docker-compose up --build

# Access
# Frontend: http://localhost:3000
# API:      http://localhost:8000/docs

# Run the pipeline (first time)
curl -X POST http://localhost:8000/pipeline/run?limit=5000
```

### Option 2: Local Development

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Start server
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Run Pipeline:**
```bash
curl -X POST http://localhost:8000/pipeline/run?limit=5000
```

---

## Insights Generated

### Sentiment Distribution
The system classifies every mention into positive/negative/neutral with confidence scores, enabling tracking of brand health over time.

### Topic Clusters
BERTopic discovers organic conversation themes without predefined categories — surfacing what customers actually talk about, not what you assume they talk about.

### Anomaly Detection
- **Negative Spikes**: Z-score based detection flags days with abnormal negative sentiment
- **Emerging Topics**: Compares recent vs. historical topic share to surface new conversation threads
- **Sentiment Shifts**: Rolling-window analysis detects sustained directional changes

### Named Entities
Automatic extraction of organizations, products, features, and locations mentioned alongside sentiment context.

---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Backend | Python 3.11, FastAPI, uvicorn |
| Sentiment | VADER, cardiffnlp/twitter-roberta-base-sentiment |
| Topics | BERTopic, sentence-transformers |
| NER | spaCy (en_core_web_sm) |
| Frontend | React 18, TypeScript, Vite |
| Charts | Recharts |
| Styling | Tailwind CSS (dark mode) |
| Animation | Framer Motion |
| Deployment | Docker, docker-compose, nginx |

---

## Project Structure

```
customer-insight-system/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py          # Configuration & paths
│   │   ├── ingestion.py       # Reddit API + synthetic data
│   │   ├── processing.py      # Text cleaning & language detection
│   │   ├── sentiment.py       # VADER + Transformer sentiment
│   │   ├── topics.py          # BERTopic modeling
│   │   ├── trends.py          # Trend & anomaly detection
│   │   ├── ner.py             # Named entity recognition
│   │   ├── pipeline.py        # Orchestration pipeline
│   │   └── main.py            # FastAPI application
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx            # Router + navigation
│   │   ├── api.ts             # API client
│   │   ├── index.css          # Tailwind + custom styles
│   │   └── pages/
│   │       ├── Dashboard.tsx
│   │       ├── TopicExplorer.tsx
│   │       ├── TrendAnalysis.tsx
│   │       ├── SearchPage.tsx
│   │       ├── AlertsPage.tsx
│   │       └── AnalyzePage.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```
