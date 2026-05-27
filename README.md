# Ink AI — AI Tattoo Recommendation Studio

A production-grade multimodal AI chatbot that helps users develop tattoo ideas through conversation, image analysis, voice input, and AI-generated concept art.

---

## Features

- **Conversational recommendations** — multi-turn GPT-4o chat with style, placement, and sizing advice
- **Image upload & analysis** — attach reference images; GPT-4o vision identifies style, elements, and recommendations
- **Voice input** — record a voice note; Azure Speech Services transcribes it into the chat
- **AI concept generation** — generate tattoo concept images via Azure gpt-image-1 directly from the chat
- **Personal gallery** — all generated concepts saved per user, browsable with a lightbox view
- **Preference memory** — GPT-4o extracts style/theme/colour preferences from each conversation and injects them into the system prompt for future sessions
- **JWT authentication** — register, login, protected routes; demo mode available without a backend

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Zustand |
| Backend | FastAPI (Python 3.13), SQLAlchemy 2 async, Alembic |
| Database | PostgreSQL 16 |
| AI — Chat & Vision | Azure OpenAI GPT-4o |
| AI — Image Generation | Azure OpenAI gpt-image-1 |
| AI — Voice | Azure Speech Services |
| Containerisation | Docker, Docker Compose |
| CI/CD | Jenkins (declarative pipeline) |
| Observability | Prometheus + Grafana |
| Code Quality | SonarQube, Ruff, Flake8, Black, ESLint |
| Security Scanning | Trivy, Bandit, npm audit |

---

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/routes/          # auth, chat, images, voice, user
│   │   ├── core/                # config, database, security, dependencies
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic request/response models
│   │   └── services/            # azure_openai, azure_vision, azure_speech, azure_image_gen, memory
│   ├── alembic/                 # database migrations
│   ├── tests/                   # pytest test suite
│   ├── uploads/                 # user-uploaded and generated images
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── (auth)/              # login, register pages
│   │   └── (app)/               # chat, gallery pages (protected)
│   ├── components/
│   │   ├── chat/                # ChatInput, ChatWindow, MessageBubble, VoiceInput, GenerateButton
│   │   ├── gallery/             # TattooCard, TattooLightbox
│   │   ├── layout/              # Sidebar
│   │   └── ui/                  # Button, Input
│   ├── lib/                     # api, chatApi, streaming, mockGenerate
│   ├── store/                   # authStore, chatStore, galleryStore (Zustand)
│   ├── proxy.ts                 # Next.js 16 middleware (protected route guard)
│   └── Dockerfile
├── monitoring/
│   ├── prometheus.yml            # scrape config targeting backend-staging:8000
│   └── grafana/
│       ├── provisioning/         # auto-provisioned datasource + dashboard
│       └── dashboards/           # ink-ai.json (6-panel API metrics dashboard)
├── docker-compose.yml            # production stack
├── docker-compose.staging.yml    # staging stack (ports 8001/3001/5433)
├── docker-compose.monitoring.yml # Prometheus + Grafana
├── sonar-project.properties
├── Jenkinsfile
└── .env.example
```

---

## Quick Start

### Option A — Docker Compose (recommended)

**1. Copy the environment file and fill in your credentials:**

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/tattoo_assistant
JWT_SECRET_KEY=<at-least-32-random-characters>
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com
AZURE_OPENAI_API_KEY=<your-key>
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o
AZURE_OPENAI_IMAGE_DEPLOYMENT=gpt-image-1
AZURE_SPEECH_KEY=<your-key>
AZURE_SPEECH_REGION=<your-region>
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**2. Build and start:**

```bash
docker compose up --build
```

**3. Open the app:**
- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs
- Backend health: http://localhost:8000/health

The backend automatically runs `alembic upgrade head` on startup.

---

### Option B — Local Development

**Backend:**

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Copy and fill in env
cp ../.env.example .env
# Edit .env — set DATABASE_URL to point to your local Postgres instance

# Run migrations
alembic upgrade head

# Start the dev server
uvicorn app.main:app --reload --port 8000
```

**Frontend:**

```bash
cd frontend
npm install

# Create frontend/.env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm run dev
```

Frontend is available at http://localhost:3000.

> **Demo mode** — click *Continue with Demo* on the login page to explore the full UI without any backend or Azure credentials. All AI responses are replaced with realistic mock data.

---

## Environment Variables

All variables are loaded by the backend via `pydantic-settings` (from `.env` or the process environment). The frontend reads `NEXT_PUBLIC_*` variables at build time.

### Backend

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL async URL (`postgresql+asyncpg://user:pass@host/db`) |
| `JWT_SECRET_KEY` | Yes | — | Secret for signing JWTs — use at least 32 random characters |
| `JWT_ALGORITHM` | No | `HS256` | JWT signing algorithm |
| `AZURE_OPENAI_ENDPOINT` | Yes | — | Azure OpenAI resource endpoint |
| `AZURE_OPENAI_API_KEY` | Yes | — | Azure OpenAI API key |
| `AZURE_OPENAI_CHAT_DEPLOYMENT` | Yes | — | GPT-4o deployment name |
| `AZURE_OPENAI_IMAGE_DEPLOYMENT` | Yes | — | gpt-image-1 deployment name |
| `AZURE_OPENAI_API_VERSION` | No | `2024-12-01-preview` | Azure OpenAI API version |
| `AZURE_SPEECH_KEY` | Yes* | — | Azure Speech key (*required for voice transcription) |
| `AZURE_SPEECH_REGION` | Yes* | — | Azure Speech region (*required for voice transcription) |
| `CORS_ORIGINS` | No | `*` | Comma-separated list of allowed CORS origins |

### Frontend

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:8000` | Backend URL as seen by the browser |

### Monitoring (Grafana)

| Variable | Required | Default | Description |
|---|---|---|---|
| `GRAFANA_ADMIN_USER` | No | `admin` | Grafana admin username |
| `GRAFANA_ADMIN_PASSWORD` | No | `admin` | Grafana admin password — change in production |

---

## Database Migrations

Migrations are managed with Alembic. The backend Dockerfile runs `alembic upgrade head` automatically on container start.

```bash
# Apply all pending migrations
alembic upgrade head

# Create a new migration after changing a model
alembic revision --autogenerate -m "add style column to messages"

# Roll back one step
alembic downgrade -1

# Show current revision
alembic current
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create account, returns JWT |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | JWT | Current user info |
| POST | `/api/chat/conversations` | JWT | Create new conversation |
| GET | `/api/chat/conversations` | JWT | List conversations (paginated) |
| GET | `/api/chat/conversations/{id}` | JWT | Full message history |
| POST | `/api/chat/conversations/{id}/messages` | JWT | Send message → SSE stream |
| POST | `/api/images/upload` | JWT | Upload a reference image |
| POST | `/api/images/analyze` | JWT | Analyse image with GPT-4o vision |
| POST | `/api/images/generate` | JWT | Generate concept with gpt-image-1 |
| GET | `/api/images/history` | JWT | User's generated images |
| POST | `/api/voice/transcribe` | JWT | Audio file → transcribed text |
| GET | `/api/user/preferences` | JWT | User style preferences |
| GET | `/api/user/history` | JWT | User's image history |
| GET | `/health` | — | Liveness check |
| GET | `/metrics` | — | Prometheus metrics |

Interactive API docs are available at http://localhost:8000/docs when the backend is running.

---

## Staging Deployment

The staging stack runs on separate ports to avoid conflicts with a production instance.

```bash
# Create the shared Docker network (only needed once)
docker network create ink-ai-net

# Start staging (backend :8001, frontend :3001, postgres :5433)
docker compose -f docker-compose.staging.yml --env-file staging.env up -d --build

# Health check
curl http://localhost:8001/health
```

`staging.env` must contain the same variables as `.env` with `DATABASE_URL` pointing to port `5433`.

---

## Monitoring

Prometheus and Grafana run as a separate compose stack that attaches to the shared `ink-ai-net` network and scrapes `backend-staging:8000/metrics`.

```bash
# Create the shared network if not already present
docker network create ink-ai-net

# Start the monitoring stack
docker compose -f docker-compose.monitoring.yml up -d

# Open Grafana
open http://localhost:3030
# Default credentials: admin / admin (set GRAFANA_ADMIN_PASSWORD to change)
```

The **Ink AI — API Metrics** dashboard is auto-provisioned and shows:
- HTTP request rate by endpoint
- Response time percentiles (p50 / p95 / p99)
- Error rate (5xx)
- Request volume
- Requests by status code
- Response throughput (bytes/s)

Prometheus UI is available at http://localhost:9090.

---

## Running Tests

**Backend (pytest):**

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v

# With coverage report
pytest tests/ --cov=app --cov-report=term-missing
```

Tests use an in-memory SQLite database — no real PostgreSQL or Azure credentials required.

**Frontend (Jest):**

```bash
cd frontend
npx jest

# Watch mode
npx jest --watch
```

---

## CI/CD Pipeline

The `Jenkinsfile` defines a **7-stage declarative pipeline**:

| Stage | What it does |
|---|---|
| **Initialise** | Detects git tag → sets `RELEASE_VERSION`, `IMAGE_TAG`, `IS_RELEASE` |
| **Build** | Builds backend and frontend Docker images in parallel |
| **Test** | Runs pytest + Jest in parallel; publishes JUnit XML reports |
| **Code Quality** | SonarQube scan + quality gate; Ruff/Black/Flake8; `tsc` + ESLint |
| **Security** | Trivy image scan (fails on CRITICAL); Bandit SAST (fails on HIGH+); npm audit |
| **Deploy** | Brings up the staging stack; retries health check on `:8001/health`; verifies `/metrics` |
| **Release** | Pushes versioned images to registry; creates git release tag (runs on `main` with semver tag only) |
| **Monitoring** | Starts Prometheus + Grafana; verifies both are healthy; confirms Prometheus targets are UP |

### Jenkins Credentials

Configure these credentials in **Manage Jenkins → Credentials** before running the pipeline:

| Credential ID | Type | Description |
|---|---|---|
| `staging-env-file` | Secret file | The staging `.env` file (all backend env vars for staging) |
| `docker-registry` | Username + Password | Docker registry login for image push |
| `github-token` | Secret text | GitHub token with `repo` scope (for git tag push in Release stage) |
| `SonarQube` | (configured via SonarQube plugin) | Set up under **Manage Jenkins → Configure System → SonarQube servers** |

### SonarQube Setup

1. Install the **SonarQube Scanner** plugin in Jenkins.
2. Add the SonarQube server under **Manage Jenkins → Configure System → SonarQube servers** with the name `SonarQube`.
3. Generate an analysis token in SonarQube and save it as the `SONAR_AUTH_TOKEN` — the `withSonarQubeEnv('SonarQube')` block injects it automatically.
4. In SonarQube, create a webhook pointing to `http://<jenkins-host>/sonarqube-webhook/` so the quality gate result is reported back to Jenkins.

### Release Flow

A release build is triggered by pushing a semver git tag from the `main` branch:

```bash
git tag v1.2.0
git push origin v1.2.0
```

Jenkins detects the tag, sets `IS_RELEASE=true`, and the Release stage pushes `ink-ai/backend:1.2.0` and `ink-ai/backend:latest` (same for frontend) to the configured registry.

Snapshot builds (non-tagged commits) are tagged `<branch>-<short-SHA>` and are not pushed.
