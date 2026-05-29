# Jenkins Pipeline Setup Guide — Tattoo Assistant (Ink AI)

This guide walks you through everything needed to get your Jenkins CI/CD pipeline running
from scratch, in the exact order to do it.

---

## PHASE 1 — Prerequisites (Install on your machine)

### Step 1: Install Docker Desktop
- Download from https://www.docker.com/products/docker-desktop
- Start Docker Desktop and make sure it's running (whale icon in menu bar)
- Verify: `docker --version` and `docker compose version`

### Step 2: Install Java (Jenkins requires it)
```bash
brew install openjdk@17
```
Or download from https://adoptium.net

### Step 3: Install Jenkins
```bash
brew install jenkins-lts
brew services start jenkins-lts
```
- Jenkins will start at http://localhost:8080
- Get the initial admin password:
```bash
cat ~/.jenkins/secrets/initialAdminPassword
```
- Paste it into the browser, click "Install suggested plugins", create your admin user.

---

## PHASE 2 — Jenkins Plugin Setup

### Step 4: Install Required Jenkins Plugins
Go to: **Manage Jenkins → Plugins → Available plugins**

Search and install each of these:
- `Docker Pipeline`
- `Pipeline`
- `JUnit`
- `SonarQube Scanner`
- `Credentials Binding`
- `Git`
- `Timestamper`
- `Workspace Cleanup`

Click **Install** and restart Jenkins after.

---

## PHASE 3 — Set Up SonarQube

SonarQube handles your Code Quality stage. Run it locally via Docker.

### Step 5: Start SonarQube
```bash
docker run -d \
  --name sonarqube \
  -p 9000:9000 \
  sonarqube:community
```
- Wait ~1 minute, then open http://localhost:9000
- Login: `admin` / `admin` → it will ask you to change the password (set something you'll remember)

### Step 6: Create a SonarQube Token
- Top-right → My Account → **Security** tab
- Generate token: name it `jenkins`, type = "Global Analysis Token"
- **Copy the token** — you won't see it again

### Step 7: Create a SonarQube Project
- Click **Create Project → Manually**
- Project key: `ink-ai` (must match `sonar-project.properties`)
- Display name: `Ink AI — Tattoo Assistant`
- Click **Set up** → choose "With Jenkins" → skip the rest (your Jenkinsfile handles it)

### Step 8: Configure SonarQube in Jenkins
Go to: **Manage Jenkins → System**

Scroll to **SonarQube servers** section:
- Check "Environment variables"
- Click **Add SonarQube**
  - Name: `SonarQube` ← must match exactly
  - Server URL: `http://host.docker.internal:9000`
    (use `host.docker.internal` not `localhost` so Jenkins-inside-Docker can reach it)
  - Server authentication token: click **Add → Jenkins**
    - Kind: Secret text
    - Secret: paste your SonarQube token
    - ID: `sonar-token`
  - Select `sonar-token` from the dropdown
- Save

---

## PHASE 4 — Jenkins Credentials Setup

All secrets live in Jenkins Credentials, never in code.

Go to: **Manage Jenkins → Credentials → System → Global credentials → Add Credential**

### Step 9: Add `staging-env-file` (Secret File)
This is the `.env` file used by docker-compose.staging.yml.

First, create the file on your computer at `~/staging.env`:
```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=tattoo_assistant
JWT_SECRET_KEY=your-secret-key-here
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o
AZURE_OPENAI_IMAGE_DEPLOYMENT=gpt-image-1
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin
```
(Fill in your actual Azure keys if you have them. Empty values are fine for pipeline testing.)

Then in Jenkins:
- Kind: **Secret file**
- File: upload `~/staging.env`
- ID: `staging-env-file`
- Save

### Step 10: Add `docker-registry` (Username + Password)
- Kind: **Username with password**
- Username: any (e.g. `jenkins`)
- Password: any (e.g. `password`) — for a local registry this doesn't matter
- ID: `docker-registry`
- Save

### Step 11: Add `github-token` (Secret Text)
- Go to https://github.com/settings/tokens
- Generate a classic token with `repo` scope
- Back in Jenkins:
  - Kind: **Secret text**
  - Secret: paste your GitHub token
  - ID: `github-token`
  - Save

---

## PHASE 5 — Push Code to GitHub

### Step 12: Create a GitHub Repository
- Go to https://github.com/new
- Name it `tattoo-assistant` (or similar), set to **Public**
- Don't initialise with README

### Step 13: Push Your Code
Open Terminal, navigate to your project folder:
```bash
cd ~/Documents/Tattoo-assistant
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tattoo-assistant.git
git push -u origin main
```

---

## PHASE 6 — Set Up Local Docker Registry (for Release stage)

The Release stage pushes versioned images to a registry. Run one locally:

### Step 14: Start a Local Docker Registry
```bash
docker run -d -p 5000:5000 --name registry --restart=always registry:2
```
The Jenkinsfile already defaults `REGISTRY` to `localhost:5000`.

---

## PHASE 7 — Create the Jenkins Pipeline

### Step 15: Create a New Pipeline Job
- Jenkins home → **New Item**
- Name: `tattoo-assistant`
- Type: **Pipeline**
- Click OK

### Step 16: Configure the Pipeline
In the job configuration:

**General:**
- Check "Discard old builds" → Max # of builds: 20

**Pipeline:**
- Definition: **Pipeline script from SCM**
- SCM: **Git**
- Repository URL: your GitHub repo URL (e.g. `https://github.com/YOUR_USERNAME/tattoo-assistant.git`)
- Credentials: add your GitHub credentials if private (not needed if public)
- Branch: `*/main`
- Script Path: `Jenkinsfile`

Click **Save**.

---

## PHASE 8 — Fix Frontend Test Config (one-time code change)

Your `package.json` already has `test:ci` script. Just verify the Jest config outputs JUnit XML.

### Step 17: Check for jest-junit
```bash
cd ~/Documents/Tattoo-assistant/frontend
cat package.json | grep jest-junit
```

If nothing appears, install it:
```bash
npm install --save-dev jest-junit
```

Check if your `jest.config.js` (or `jest.config.ts`) exists:
```bash
ls ~/Documents/Tattoo-assistant/frontend/jest*
```

If there's no Jest config, create `frontend/jest.config.js`:
```js
const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })

module.exports = createJestConfig({
  testEnvironment: 'node',
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'test-results', outputName: 'frontend.xml' }]
  ],
  collectCoverageFrom: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'lib/**/*.ts'],
})
```

If you made changes, commit and push:
```bash
cd ~/Documents/Tattoo-assistant
git add frontend/
git commit -m "fix: add jest-junit reporter for Jenkins"
git push
```

---

## PHASE 9 — Run the Pipeline

### Step 18: Trigger Your First Build
- Go to your Jenkins job → **Build Now**
- Click the build number → **Console Output** to watch it live

**What each stage does in order:**
1. **Initialise** — reads git SHA and sets version tag
2. **Build** — builds Docker images for backend and frontend in parallel
3. **Test** — runs pytest + Jest with coverage, publishes JUnit results
4. **Code Quality** — SonarQube scan + backend/frontend linting in parallel
5. **Deploy** — spins up staging stack, waits for health check on `:8001/health`
6. **Release** — only runs on `main` branch with a git semver tag (see below)
7. **Monitoring** — starts Prometheus + Grafana, verifies scrape targets are UP

### Step 19: Trigger the Release Stage
The Release stage is gated on a semver git tag on `main`. To trigger it:
```bash
cd ~/Documents/Tattoo-assistant
git tag v1.0.0
git push origin v1.0.0
```
Then go to Jenkins → **Build Now** again (or it will auto-trigger if you set up a webhook).

---

## PHASE 10 — Verify Everything Worked

### Step 20: Check Each Stage Passed
In the pipeline view, all stages should be green.

Then verify the running services:
```bash
# Backend health
curl http://localhost:8001/health

# Metrics endpoint (needed for Prometheus)
curl http://localhost:8001/metrics

# Prometheus
open http://localhost:9090

# Grafana (admin/admin)
open http://localhost:3030

# SonarQube results
open http://localhost:9000/dashboard?id=ink-ai

# Staging app
open http://localhost:3001
```

### Step 21: Set Up Jenkins Webhook (optional but good to show in demo)
- Go to your GitHub repo → **Settings → Webhooks → Add webhook**
- Payload URL: `http://YOUR_IP:8080/github-webhook/`
  (use `ngrok http 8080` if Jenkins is on localhost to get a public URL)
- Content type: `application/json`
- Events: Just the push event
- Now every `git push` will auto-trigger the pipeline.

---

## Quick Troubleshooting

| Problem | Fix |
|---------|-----|
| SonarQube quality gate hangs | Make sure the SonarQube webhook is configured: SonarQube → Admin → Webhooks → Add → URL: `http://host.docker.internal:8080/sonarqube-webhook/` |
| Docker: permission denied | Add Jenkins user to docker group or run Docker Desktop |
| `host.docker.internal` not resolving | On Linux, add `--add-host=host.docker.internal:host-gateway` to docker run commands |
| Release stage skipped | It only runs on `main` branch + a semver git tag (`v1.0.0` format) |
| Staging health check fails | Check `docker compose -f docker-compose.staging.yml logs` for backend errors |

---

## Summary Checklist

- [ ] Docker Desktop installed and running
- [ ] Jenkins installed and running on :8080
- [ ] Required plugins installed
- [ ] SonarQube running on :9000 with project `ink-ai` created
- [ ] SonarQube server configured in Jenkins with token
- [ ] `staging-env-file` credential added in Jenkins
- [ ] `docker-registry` credential added in Jenkins
- [ ] `github-token` credential added in Jenkins
- [ ] Code pushed to GitHub
- [ ] Local Docker registry running on :5000
- [ ] Jenkins pipeline job created pointing to your repo
- [ ] `jest-junit` installed in frontend
- [ ] First build triggered and all stages green
- [ ] Git tag `v1.0.0` pushed to trigger Release stage
- [ ] All endpoints verified (health, metrics, Prometheus, Grafana)
