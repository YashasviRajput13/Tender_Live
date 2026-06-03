# Implementation Plan - TenderAI: Agentic Tender Discovery & Analysis Platform

TenderAI is a production-ready, full-stack agentic platform designed to continuously monitor government and private tender portals (e.g., CPPP, GeM), extract active tender listings, execute multi-agent AI workflows (eligibility analysis, summarization, opportunity scoring, document parsing), and provide real-time updates via Server Sent Events (SSE).

In accordance with the **No Demo Data Policy**, the platform uses real-time live scrapers targeting actual government procurement pages (e.g., GeM, CPPP), stores real tender data, and feeds active data pipelines to Celery workers. The React dashboard functions as a live intelligence terminal showing real-time event updates streamed from backend Redis streams via SSE.

---

## User Review Required

> [!IMPORTANT]
> The platform will be configured to target live government search portals for GeM and CPPP. In production, these portals utilize aggressive rate limiting, CAPTCHAs, and Cloudflare protection. 
> - **Anti-Bot Strategy**: We will implement a resilient scraping engine using `curl_cffi` (to mimic browser TLShandshakes and bypass TLS fingerprinting) and `BeautifulSoup` for high-performance direct parsing. We also integrate a `Playwright` backup engine for JS-rendered portals.
> - **AI Integration**: We will support the Gemini API (`google-generativeai`) as the primary LLM provider, with fallback options for OpenAI. You will need to provide your `GEMINI_API_KEY` (and optional `OPENAI_API_KEY`) in the `.env` file.
> - **Local Storage**: Uploaded tender PDFs and generated reports will be stored in a local volume mounted on the containers, abstracting a generic storage layer that can be easily configured for S3 in the future.

---

## Proposed Project Structure

We will structure the project as a monorepo under `c:\Users\ryash\tender live`:
```
tender-live/
├── docker-compose.yml          # Local container orchestration
├── .env.example                # Template environment variables
├── backend/                    # FastAPI backend codebase
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py                 # FastAPI Application Entry
│   ├── config.py               # Setting declarations (Pydantic settings)
│   ├── database.py             # DB connection, SessionLocal, Base model
│   ├── models.py               # SQLAlchemy Database Models
│   ├── schemas.py              # Pydantic Schemas (Request/Response)
│   ├── auth.py                 # JWT, Password Hashing, Dependency injection
│   ├── sse.py                  # Server-Sent Events broadcasting manager
│   ├── routers/
│   │   ├── auth.py             # Auth endpoints
│   │   ├── company.py          # Company profile endpoints
│   │   ├── tenders.py          # Tender search, retrieval, download endpoints
│   │   ├── tasks.py            # Task triggers and SSE streaming
│   │   ├── documents.py        # PDF upload and document processing
│   │   └── reports.py          # PDF/Excel report retrieval
│   ├── workers/                # Celery application and workers
│   │   ├── celery_app.py       # Celery configuration
│   │   ├── discovery.py        # Scraping and normalization task
│   │   ├── document.py         # PDF parsing and document processing task
│   │   ├── eligibility.py      # Company alignment AI evaluation task
│   │   ├── scoring.py          # Multi-factor opportunity scoring task
│   │   └── report_gen.py       # PDF/Excel document rendering task
│   ├── scrapers/               # Anti-bot scraping modules
│   │   ├── base.py             # Abstract scraper with retry & proxy logic
│   │   ├── gem_scraper.py      # Real GeM live portal scraper
│   │   └── cppp_scraper.py     # Real CPPP live portal scraper
│   └── services/               # Core business services & AI Agents
│       ├── ai_gemini.py        # Gemini API interaction helper
│       ├── eligibility_agent.py# AI Eligibility analysis logic
│       ├── summary_agent.py    # Tender text/HTML parsing and summarization
│       ├── scoring_agent.py    # Opportunity scoring formula + logic
│       └── document_agent.py   # PDF text extraction & structured JSON mapping
├── frontend/                   # React frontend codebase (Vite + TypeScript)
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── types.ts            # Shared TS interfaces
│       ├── components/
│       │   ├── Layout.tsx      # Sidebar/Header with Dark Mode
│       │   ├── Dashboard.tsx   # Live intelligence widgets & distribution charts
│       │   ├── ActiveTasks.tsx # Real-time AI agent status and progress tracking
│       │   ├── LiveActivity.tsx# Streamed logs terminal (CPPP detected, score generated)
│       │   ├── TenderList.tsx  # Advanced grid with filters & sorting
│       │   ├── TenderDetails.tsx # Selected tender summary, score, & download reports
│       │   ├── CompanyProfile.tsx# Company profile editor
│       │   └── DocAnalyzer.tsx # Manual PDF uploader & extraction view
│       └── utils/
│           ├── api.ts          # Axios / Fetch client
│           └── sse_client.ts   # EventSource management for real-time streams
```

---

## Proposed Changes

### 1. Database Schema (`backend/models.py`)

We will define 9 core SQLAlchemy tables:
- **`users`**: ID, email, hashed_password, role (`admin` or `company_user`), full_name, created_at.
- **`companies`**: ID, user_id (FK), name, industry, turnover, registration_numbers, certifications, gst_details, msme_status (Boolean), past_projects (JSON array), team_strength, geographic_coverage (JSON array), required_categories (JSON array), updated_at.
- **`tender_sources`**: ID, name (e.g., CPPP, GeM), base_url, frequency_minutes, last_scraped_at, is_active.
- **`tenders`**: ID, tender_id (String, unique), title, department, location, budget (Numeric), deadline (DateTime), eligibility_criteria, raw_html, source_url, source_name, created_at, status (`discovered`, `processing`, `analyzed`).
- **`tender_documents`**: ID, tender_id (FK), file_name, file_path, doc_type, size_bytes, parsed_json (JSON), created_at.
- **`eligibility_reports`**: ID, tender_id (FK), company_id (FK), eligibility (`eligible`, `partially_eligible`, `not_eligible`), confidence_score (Float), summary (Text), requirements_analysis (JSON), risk_analysis (JSON), timeline (JSON), checklist (JSON), opportunity_score (Int), created_at.
- **`agent_tasks`**: ID (UUID), task_type (e.g., `discovery`, `eligibility`, `report`), status (`pending`, `running`, `completed`, `failed`), progress (Int), log_messages (JSON array), current_agent (`scraper`, `document_intel`, `eligibility_agent`, `summary_agent`, `completed`), created_at, updated_at.
- **`notifications`**: ID, user_id (FK), tender_id (FK), message, is_read, channel (`in_app`, `email`), created_at.
- **`audit_logs`**: ID, user_id (FK), action, details (JSON), ip_address, created_at.

---

### 2. Scraping Engine (`backend/scrapers/`)

We will implement:
- **`backend/scrapers/base.py`**: Handles proxy rotating, random user-agent injection, TLS fingerprint simulation, and retry logic.
- **`backend/scrapers/gem_scraper.py`**: Uses `curl_cffi` or `Playwright` to fetch and parse public bids from GeM. Specifically, parses GeM bids active listing table `https://bidplus.gem.gov.in/bidlists` (or public GeM search page) to extract: bid number, product/service name, department, quantity, start date, end date, and detail document link.
- **`backend/scrapers/cppp_scraper.py`**: Uses `curl_cffi` to fetch and parse CPPP portal active tenders list (or search page) extracting tender ID, title, organization, date, and document links.

---

### 3. Celery Workers (`backend/workers/`)

Five independent scaling workers:
1. **Worker 1: `Tender Discovery`**:
   - Runs on schedule (beat) or manually.
   - Executes `gem_scraper` and `cppp_scraper`.
   - Discovers new tenders, saves them to PostgreSQL, and pushes the event `tender_discovered` to the Redis stream / SSE channels.
2. **Worker 2: `Document Processing`**:
   - Triggered when tender PDFs are downloaded or uploaded.
   - Extracts PDF text content using OCR or text-extraction libraries.
   - Calls `document_agent` to extract structured JSON (Scope, Qualifications, Financials).
3. **Worker 3: `Eligibility Analysis`**:
   - Triggered for a tender.
   - Fetches the active company profile.
   - Runs `eligibility_agent` (evaluates technical & financial criteria).
   - Runs `summary_agent` (builds executive summary, timeline, risks).
   - Runs `scoring_agent` (computes opportunity score: 0 to 100).
   - Pushes `eligibility_completed` and `risk_analysis_completed` events.
4. **Worker 4: `Report Generation`**:
   - Generates PDF report containing summary, eligibility matrix, checklist, risk.
   - Generates Excel sheet listing matching tenders, scores, and deadlines.
5. **Worker 5: `Notifications`**:
   - Dispatches in-app notifications and prints simulated email dispatches to logs (or SMTP).

---

### 4. AI Agent Layer (`backend/services/`)

We will use the **Gemini API** as the primary intelligence layer:
- **Eligibility Agent**: Compares company's MSME, turnover, location, and past projects JSON against tender requirements using a detailed zero-shot analysis prompt, outputting JSON with `eligibility`, `confidence_score`, and detailed rationale.
- **Summarization Agent**: Condenses long PDF texts/HTML summaries into core points (Scope, risks, key dates, submission checklist).
- **Opportunity Scoring Agent**: Evaluates suitability score (0-100) using a multi-factor formula (budget fit, experience fit, location compatibility) + LLM judgment.
- **Document Analysis Agent**: Reads PDF text dump and extracts structural fields into typed JSON schemas.

---

### 5. SSE & Real-Time Event Dispatch (`backend/sse.py`)

We will build an event broadcasting layer using FastAPI and Redis Pub/Sub:
- Whenever a Celery worker progresses, it writes to PostgreSQL and publishes a progress update to Redis (e.g., `task_progress:<task_id>` and general channel `tender_events`).
- FastAPI endpoint `/tasks/{id}/stream` reads from Redis Pub/Sub and yields SSE events:
  ```json
  event: progress
  data: {"task_id": "...", "progress": 40, "agent": "document_intel", "message": "Analyzing extracted tender document"}
  ```
- Endpoint `/tenders/stream` streams system-wide events: `tender_discovered`, `eligibility_completed`, `risk_analysis_completed` so the dashboard updates live in real-time.

---

### 6. React Frontend (`frontend/src/`)

A sleek **Dark Mode SaaS design** mimicking a financial or intelligence terminal:
- **Dashboard Panel**:
  - Top Metrics: Active Tasks, Tenders Discovered (today/week), Upcoming Deadlines count, Avg Eligibility Score.
  - Live charts (using lightweight SVGs or simple Canvas): Eligibility Trends, Opportunity Score Distribution.
- **Real-Time Intelligence Terminal Widgets**:
  - **Live Activity Feed**: Visual logs streaming in real-time (`[10:12:03] New GeM Tender Detected`, etc.).
  - **Active AI Task Stream**: Live progress bars displaying task updates at 10%, 25%, 40%, 60%, 80%, 100%.
- **Tender Explorer**:
  - Filters by Budget, Score, Platform (CPPP/GeM), and Eligibility status.
  - Side-by-side view showing full details, AI Summary, Eligibility Checklists, Opportunity Score, PDF report download, and Document Upload.
- **Company Profile Settings**:
  - Interactive forms for company parameters (Turnover, MSME status, Past projects JSON, categories).

---

### 7. Docker Architecture (`docker-compose.yml`)

We will construct a multi-container Docker setup:
1. **`db`**: PostgreSQL container with volume mount.
2. **`redis`**: Message broker and event publisher.
3. **`backend`**: FastAPI ASGI server (port 8000).
4. **`celery_discovery`**: Celery worker for crawling and scraping.
5. **`celery_workers`**: General Celery workers for AI, Docs, and Reports.
6. **`frontend`**: React App compiled/served via Vite Dev Server (port 5173).

---

## Verification Plan

### Automated & Manual Verification
1. **Docker Compilation**: Spin up container orchestration via `docker-compose up --build -d` and ensure all containers start successfully.
2. **Authentication Flow**: Run backend API test cases or use frontend login/registration forms to verify JWT-based authentication.
3. **Scraper Integrity**: Manually execute discovery worker task and verify in database and logs that real bids from GeM/CPPP are scraped.
4. **AI Processing pipeline**: Trigger a tender analysis, monitor task updates, and verify that the Gemini API processes text, maps correct scores, and generates detailed summaries.
5. **Real-time SSE Streams**: Open the browser's Developer Tools Network tab, inspect `/tasks/{id}/stream` and verify event-driven updates.
6. **Report PDF/Excel verification**: Validate that generated reports are downloadable and match database values.
