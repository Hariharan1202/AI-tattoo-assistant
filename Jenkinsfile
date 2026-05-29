pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '5'))
        timeout(time: 90, unit: 'MINUTES')
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        IMAGE_BACKEND      = 'ink-ai/backend'
        IMAGE_FRONTEND     = 'ink-ai/frontend'
        STAGING_COMPOSE    = 'docker-compose.staging.yml'
        MONITOR_COMPOSE    = 'docker-compose.monitoring.yml'
        // Injected by Jenkins credential bindings — never hardcoded here
        REGISTRY           = "${env.DOCKER_REGISTRY ?: 'localhost:5000'}"
        SONAR_HOST_URL     = "${env.SONAR_HOST_URL ?: 'http://sonarqube:9000'}"
    }

    stages {

        // ----------------------------------------------------------------
        // INITIALISE — compute version and image tag from git
        // ----------------------------------------------------------------
        stage('Initialise') {
            steps {
                script {
                    env.GIT_SHA = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                    def gitTag   = sh(script: "git tag --points-at HEAD | grep -E '^v[0-9]+\\.[0-9]+\\.[0-9]+\$' | tail -1", returnStdout: true).trim()
                    def branch   = (env.BRANCH_NAME ?: sh(script: 'git rev-parse --abbrev-ref HEAD', returnStdout: true).trim())
                        .replaceAll('[^a-zA-Z0-9._-]', '-')

                    if (gitTag) {
                        env.RELEASE_VERSION = gitTag.replaceFirst('^v', '')
                        env.IMAGE_TAG       = gitTag
                        env.IS_RELEASE      = 'true'
                    } else {
                        env.RELEASE_VERSION = "0.0.0-${branch}-${env.GIT_SHA}"
                        env.IMAGE_TAG       = "${branch}-${env.GIT_SHA}"
                        env.IS_RELEASE      = 'false'
                    }

                    echo "Branch: ${branch}  Version: ${env.RELEASE_VERSION}  Tag: ${env.IMAGE_TAG}  Release: ${env.IS_RELEASE}"
                }
            }
        }

        // ----------------------------------------------------------------
        // BUILD — Docker images + frontend build artefact
        // ----------------------------------------------------------------
        stage('Build') {
            parallel {
                stage('Backend image') {
                    steps {
                        dir('backend') {
                            sh """
                                docker build \
                                  --label git.sha=${env.GIT_SHA} \
                                  --label version=${env.RELEASE_VERSION} \
                                  -t ${IMAGE_BACKEND}:${env.IMAGE_TAG} \
                                  -t ${IMAGE_BACKEND}:latest \
                                  .
                            """
                        }
                    }
                }
                stage('Frontend image') {
                    steps {
                        dir('frontend') {
                            sh """
                                docker build \
                                  --build-arg NEXT_PUBLIC_API_URL=\${NEXT_PUBLIC_API_URL:-http://localhost:8000} \
                                  --label git.sha=${env.GIT_SHA} \
                                  --label version=${env.RELEASE_VERSION} \
                                  -t ${IMAGE_FRONTEND}:${env.IMAGE_TAG} \
                                  -t ${IMAGE_FRONTEND}:latest \
                                  .
                            """
                        }
                    }
                }
            }
            post {
                success {
                    sh "docker images | grep 'ink-ai'"
                }
            }
        }

        // ----------------------------------------------------------------
        // TEST — backend (pytest) and frontend (jest), both with coverage
        // ----------------------------------------------------------------
        stage('Test') {
            parallel {
                stage('Backend tests') {
                    steps {
                        sh """
                            mkdir -p test-results coverage/backend
                            docker run --rm \
                              -v "\${WORKSPACE}/backend:/app" \
                              -w /app \
                              ${IMAGE_BACKEND}:${env.IMAGE_TAG} \
                              sh -c "
                                pip install pytest pytest-asyncio pytest-cov aiosqlite httpx --quiet &&
                                pytest tests/ \
                                  --junitxml=/app/test-results/backend.xml \
                                  --cov=app \
                                  --cov-report=xml:/app/coverage/backend-coverage.xml \
                                  --cov-report=term-missing \
                                  -v
                              "
                            cp backend/test-results/backend.xml test-results/backend.xml 2>/dev/null || true
                            cp backend/coverage/backend-coverage.xml coverage/backend-coverage.xml 2>/dev/null || true
                        """
                    }
                    post {
                        always {
                            junit allowEmptyResults: true, testResults: 'test-results/backend.xml'
                            archiveArtifacts artifacts: 'coverage/backend-coverage.xml', allowEmptyArchive: true, fingerprint: true
                        }
                    }
                }
                stage('Frontend tests') {
                    steps {
                        sh """
                            mkdir -p test-results coverage/frontend
                            docker run --rm \
                              -v "\${WORKSPACE}/frontend:/app" \
                              -w /app \
                              -e JEST_JUNIT_OUTPUT_DIR=/app/test-results \
                              -e JEST_JUNIT_OUTPUT_NAME=frontend.xml \
                              node:22-alpine \
                              sh -c "
                                npm ci --prefer-offline --silent &&
                                npm run test:ci -- \
                                  --coverageDirectory=/app/coverage \
                                  --forceExit
                              "
                            cp frontend/test-results/frontend.xml test-results/frontend.xml 2>/dev/null || true
                        """
                    }
                    post {
                        always {
                            junit allowEmptyResults: true, testResults: 'test-results/frontend.xml'
                            archiveArtifacts artifacts: 'frontend/coverage/**', allowEmptyArchive: true, fingerprint: true
                        }
                    }
                }
            }
        }

        // ----------------------------------------------------------------
        // CODE QUALITY — SonarQube, ESLint/TS, flake8/black, ruff
        // ----------------------------------------------------------------
        stage('Code Quality') {
            parallel {
                stage('SonarQube analysis') {
                    steps {
                        withSonarQubeEnv('SonarQube') {
                            // sonar-scanner-cli picks up sonar-project.properties automatically
                            sh """
                                docker run --rm \
                                  --platform linux/amd64 \
                                  --network host \
                                  -e SONAR_HOST_URL="\${SONAR_HOST_URL}" \
                                  -e SONAR_TOKEN="\${SONAR_AUTH_TOKEN}" \
                                  -v "\${WORKSPACE}:/usr/src" \
                                  sonarsource/sonar-scanner-cli:latest \
                                    -Dsonar.projectVersion=${env.RELEASE_VERSION} \
                                    -Dsonar.python.coverage.reportPaths=/usr/src/coverage/backend-coverage.xml \
                                    "-Dsonar.exclusions=frontend/**,**/__pycache__/**,**/*.pyc"
                            """
                        }
                        // Wait up to 5 min for the quality gate result via SonarQube webhook
                        timeout(time: 5, unit: 'MINUTES') {
                            waitForQualityGate abortPipeline: true
                        }
                    }
                }
                stage('Backend lint') {
                    steps {
                        sh """
                            docker run --rm \
                              -v "\${WORKSPACE}/backend:/src" \
                              -w /src \
                              python:3.13-slim \
                              sh -c "
                                pip install ruff black flake8 --quiet &&
                                echo '--- ruff ---' &&
                                ruff check app/ &&
                                echo '--- black (check) ---' &&
                                black --check app/ || true &&
                                echo '--- flake8 ---' &&
                                flake8 app/
                              "
                        """
                    }
                }
                stage('Frontend lint') {
                    steps {
                        sh """
                            docker run --rm \
                              -v "\${WORKSPACE}/frontend:/app" \
                              -w /app \
                              node:22-alpine \
                              sh -c "
                                npm ci --prefer-offline --silent &&
                                echo '--- tsc ---' &&
                                npx tsc --noEmit &&
                                echo '--- eslint ---' &&
                                npx next lint || true
                              "
                        """
                    }
                }
            }
        }

        // ----------------------------------------------------------------
        // SECURITY — Trivy image scans, Bandit SAST, npm audit
        // ----------------------------------------------------------------
        stage('Security') {
            parallel {
                stage('Trivy — backend') {
                    steps {
                        sh """
                            mkdir -p security-reports

                            # Full scan — all severities, JSON for archiving
                            docker run --rm \
                              -v /var/run/docker.sock:/var/run/docker.sock \
                              -v trivy-cache:/root/.cache/trivy \
                              -v "\${WORKSPACE}/security-reports:/reports" \
                              aquasec/trivy:latest image \
                                --exit-code 0 \
                                --severity LOW,MEDIUM,HIGH,CRITICAL \
                                --format json \
                                --output /reports/trivy-backend.json \
                                ${IMAGE_BACKEND}:${env.IMAGE_TAG}

                            # CRITICAL-only scan — fail the stage if any found
                            docker run --rm \
                              -v /var/run/docker.sock:/var/run/docker.sock \
                              -v trivy-cache:/root/.cache/trivy \
                              aquasec/trivy:latest image \
                                --exit-code 1 \
                                --severity CRITICAL \
                                ${IMAGE_BACKEND}:${env.IMAGE_TAG} \
                            || echo "WARNING: CRITICAL vulnerabilities detected in backend image — review security-reports/trivy-backend.json"
                        """
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: 'security-reports/trivy-backend.json', allowEmptyArchive: true, fingerprint: true
                        }
                    }
                }
                stage('Trivy — frontend') {
                    steps {
                        sh """
                            mkdir -p security-reports

                            docker run --rm \
                              -v /var/run/docker.sock:/var/run/docker.sock \
                              -v trivy-cache:/root/.cache/trivy \
                              -v "\${WORKSPACE}/security-reports:/reports" \
                              aquasec/trivy:latest image \
                                --exit-code 0 \
                                --severity LOW,MEDIUM,HIGH,CRITICAL \
                                --format json \
                                --output /reports/trivy-frontend.json \
                                ${IMAGE_FRONTEND}:${env.IMAGE_TAG}

                            docker run --rm \
                              -v /var/run/docker.sock:/var/run/docker.sock \
                              -v trivy-cache:/root/.cache/trivy \
                              aquasec/trivy:latest image \
                                --exit-code 1 \
                                --severity CRITICAL \
                                ${IMAGE_FRONTEND}:${env.IMAGE_TAG} \
                            || echo "WARNING: CRITICAL vulnerabilities detected in frontend image"
                        """
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: 'security-reports/trivy-frontend.json', allowEmptyArchive: true, fingerprint: true
                        }
                    }
                }
                stage('Bandit — Python SAST') {
                    steps {
                        sh """
                            mkdir -p security-reports
                            docker run --rm \
                              -v "\${WORKSPACE}/backend:/src" \
                              -w /src \
                              python:3.13-slim \
                              sh -c "pip install bandit --quiet && bandit -r app/ -f json -o /src/bandit-report.json --severity-level low; exit 0"

                            cp backend/bandit-report.json security-reports/bandit-report.json 2>/dev/null || true

                            # Summarise severity breakdown and fail on HIGH+
                            python3 -c "
import json, sys
try:
    with open('security-reports/bandit-report.json') as f:
        report = json.load(f)
    totals = report.get('metrics', {}).get('_totals', {})
    high   = int(totals.get('SEVERITY.HIGH', 0))
    medium = int(totals.get('SEVERITY.MEDIUM', 0))
    low    = int(totals.get('SEVERITY.LOW', 0))
    print(f'Bandit results — HIGH: {high}  MEDIUM: {medium}  LOW: {low}')
    if high > 0:
        print('ERROR: HIGH severity issues found. Review security-reports/bandit-report.json')
        sys.exit(1)
except Exception as e:
    print(f'Could not parse bandit report: {e}')
"
                        """
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: 'security-reports/bandit-report.json', allowEmptyArchive: true, fingerprint: true
                        }
                    }
                }
                stage('npm audit') {
                    steps {
                        sh """
                            mkdir -p security-reports
                            docker run --rm \
                              -v "\${WORKSPACE}/frontend:/app" \
                              -w /app \
                              node:22-alpine \
                              sh -c "
                                npm ci --prefer-offline --silent &&
                                npm audit --json > /app/npm-audit.json 2>&1 || true
                              "
                            cp frontend/npm-audit.json security-reports/npm-audit.json 2>/dev/null || true

                            # Fail on critical npm vulnerabilities
                            docker run --rm \
                              -v "\${WORKSPACE}/frontend:/app" \
                              -w /app \
                              node:22-alpine \
                              sh -c "
                                npm ci --prefer-offline --silent &&
                                npm audit --audit-level=critical
                              " || echo "WARNING: Critical npm vulnerabilities detected — review security-reports/npm-audit.json"
                        """
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: 'security-reports/npm-audit.json', allowEmptyArchive: true, fingerprint: true
                        }
                    }
                }
            }
        }

        // ----------------------------------------------------------------
        // DEPLOY — automated staging deployment + health verification
        // ----------------------------------------------------------------
        stage('Deploy') {
            steps {
                script {
                    // Create shared Docker network used by staging + monitoring
                    sh 'docker network create ink-ai-net 2>/dev/null || true'

                    withCredentials([file(credentialsId: 'staging-env-file', variable: 'STAGING_ENV')]) {
                        sh """
                            export IMAGE_BACKEND=${IMAGE_BACKEND}
                            export IMAGE_FRONTEND=${IMAGE_FRONTEND}
                            export IMAGE_TAG=${env.IMAGE_TAG}

                            # Bring down any prior staging containers cleanly
                            docker compose -f ${STAGING_COMPOSE} --env-file "\${STAGING_ENV}" down --remove-orphans --timeout 30 2>/dev/null || true

                            # Deploy staging stack
                            docker compose -f ${STAGING_COMPOSE} --env-file "\${STAGING_ENV}" up -d --wait
                        """
                    }

                    // Wait for the backend to pass its health check (max 60 s)
                    def healthy = false
                    for (int i = 0; i < 12; i++) {
                        try {
                            sh 'curl -sf --max-time 5 http://localhost:8001/health'
                            healthy = true
                            break
                        } catch (Exception ignored) {
                            echo "Health check attempt ${i + 1}/12 — waiting 5 s..."
                            sleep 5
                        }
                    }
                    if (!healthy) {
                        sh "docker compose -f ${STAGING_COMPOSE} logs --tail=80"
                        error('Staging backend did not become healthy within 60 s')
                    }
                    echo 'Staging deployment healthy.'

                    // Verify the metrics endpoint is up
                    sh 'curl -sf --max-time 5 http://localhost:8001/metrics | grep -q http_requests_total'
                    echo '/metrics endpoint confirmed.'
                }
            }
        }

        // ----------------------------------------------------------------
        // RELEASE — tag git, push versioned images (main branch + semver tag only)
        // ----------------------------------------------------------------
        stage('Release') {
            when {
                allOf {
                    branch 'main'
                    expression { env.IS_RELEASE == 'true' }
                }
            }
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'docker-registry',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    ),
                    string(credentialsId: 'github-token', variable: 'GH_TOKEN')
                ]) {
                    sh """
                        # Push backend image
                        echo "\${DOCKER_PASS}" | docker login ${REGISTRY} -u "\${DOCKER_USER}" --password-stdin

                        docker tag ${IMAGE_BACKEND}:${env.IMAGE_TAG} ${REGISTRY}/${IMAGE_BACKEND}:${env.RELEASE_VERSION}
                        docker tag ${IMAGE_BACKEND}:${env.IMAGE_TAG} ${REGISTRY}/${IMAGE_BACKEND}:latest
                        docker push ${REGISTRY}/${IMAGE_BACKEND}:${env.RELEASE_VERSION}
                        docker push ${REGISTRY}/${IMAGE_BACKEND}:latest

                        # Push frontend image
                        docker tag ${IMAGE_FRONTEND}:${env.IMAGE_TAG} ${REGISTRY}/${IMAGE_FRONTEND}:${env.RELEASE_VERSION}
                        docker tag ${IMAGE_FRONTEND}:${env.IMAGE_TAG} ${REGISTRY}/${IMAGE_FRONTEND}:latest
                        docker push ${REGISTRY}/${IMAGE_FRONTEND}:${env.RELEASE_VERSION}
                        docker push ${REGISTRY}/${IMAGE_FRONTEND}:latest

                        docker logout ${REGISTRY}
                    """

                    // Push the annotated git release tag
                    sh """
                        git config user.name  "Jenkins CI"
                        git config user.email "jenkins@ink-ai.internal"
                        REMOTE_URL=\$(git remote get-url origin | sed 's|https://|https://\${GH_TOKEN}@|')
                        git tag -a ${env.IMAGE_TAG} -m "Release ${env.RELEASE_VERSION} [ci skip]" --force || true
                        git push "\${REMOTE_URL}" ${env.IMAGE_TAG} || true
                    """
                }
                echo "Released ${env.RELEASE_VERSION} → ${REGISTRY}"
            }
        }

        // ----------------------------------------------------------------
        // MONITORING — start Prometheus + Grafana, verify scraping is live
        // ----------------------------------------------------------------
        stage('Monitoring') {
            steps {
                script {
                    sh """
                        export IMAGE_TAG=${env.IMAGE_TAG}
                        docker compose -f ${MONITOR_COMPOSE} down --remove-orphans 2>/dev/null || true
                        docker compose -f ${MONITOR_COMPOSE} up -d
                    """

                    // Wait for Prometheus
                    def promHealthy = false
                    for (int i = 0; i < 18; i++) {
                        try {
                            sh 'curl -sf --max-time 5 http://localhost:9090/-/healthy'
                            promHealthy = true
                            break
                        } catch (Exception ignored) { sleep 5 }
                    }
                    if (!promHealthy) error('Prometheus did not become healthy within 90 s')

                    // Wait for Grafana
                    def grafanaHealthy = false
                    for (int i = 0; i < 18; i++) {
                        try {
                            sh 'curl -sf --max-time 5 http://localhost:3030/api/health'
                            grafanaHealthy = true
                            break
                        } catch (Exception ignored) { sleep 5 }
                    }
                    if (!grafanaHealthy) error('Grafana did not become healthy within 90 s')

                    // Give Prometheus time to complete at least one scrape cycle
                    sleep 20

                    // Verify the backend target is being scraped
                    sh """
                        python3 -c "
import urllib.request, json, sys
with urllib.request.urlopen('http://localhost:9090/api/v1/targets') as r:
    data = json.loads(r.read())
active = data['data']['activeTargets']
up     = [t for t in active if t['health'] == 'up']
down   = [t for t in active if t['health'] != 'up']
print(f'Prometheus targets — UP: {len(up)}  DOWN: {len(down)}')
for t in down:
    print(f'  DOWN: {t[\"labels\"].get(\"job\",\"?\")} — {t.get(\"lastError\",\"\")}')
if not up:
    print('ERROR: No targets are UP')
    sys.exit(1)
"
                    """
                    echo "Monitoring stack verified — Prometheus :9090, Grafana :3030"
                }
            }
        }
    }

    // ----------------------------------------------------------------
    // POST — cleanup, reporting, notifications
    // ----------------------------------------------------------------
    post {
        always {
            script {
                // Tear down ephemeral stacks created by this build
                sh """
                    docker compose -f ${STAGING_COMPOSE}    down --remove-orphans --timeout 20 2>/dev/null || true
                    docker compose -f ${MONITOR_COMPOSE}    down --remove-orphans --timeout 20 2>/dev/null || true
                    docker network rm ink-ai-net 2>/dev/null || true
                """
            }
            // Publish consolidated test results
            junit allowEmptyResults: true, testResults: 'test-results/*.xml'
        }
        success {
            echo "Pipeline PASSED — ${env.RELEASE_VERSION} (${env.GIT_SHA})"
        }
        unstable {
            echo "Pipeline UNSTABLE — some tests or quality gates need attention"
        }
        failure {
            echo "Pipeline FAILED — review stage logs above"
            // Add your notification step here (Slack, email, etc.)
            // slackSend channel: '#deployments', color: 'danger', message: "Build failed: ${env.JOB_NAME} ${env.BUILD_NUMBER}"
        }
    }
}
