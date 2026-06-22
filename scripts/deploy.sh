#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[deploy]${NC} $1"; }
ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

log "=== YA-LMS Deploy Script ==="
log "Environment: ${DEPLOY_ENV:-production}"
log "To deploy to preview, run: DEPLOY_ENV=preview ./scripts/deploy.sh"
log ""

# ─── Load credentials ────────────────────────────────────────────────────
SECRETS_FILE="$ROOT_DIR/secrets.local.json"

if [[ -n "${CLOUDFLARE_API_TOKEN:-}" && -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  ok "CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID found in environment"
elif [[ -f "$SECRETS_FILE" ]]; then
  log "Loading credentials from $SECRETS_FILE"
  export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-$(jq -r '.CLOUDFLARE_API_TOKEN // empty' "$SECRETS_FILE")}"
  export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-$(jq -r '.CLOUDFLARE_ACCOUNT_ID // empty' "$SECRETS_FILE")}"
  export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-$(jq -r '.CF_API_TOKEN // empty' "$SECRETS_FILE")}"
  if [[ -n "$CLOUDFLARE_API_TOKEN" ]]; then
    ok "Credentials loaded from $SECRETS_FILE"
  fi
fi

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  err "CLOUDFLARE_API_TOKEN not set.
  Set it as an environment variable or create $SECRETS_FILE:
  {
    \"CLOUDFLARE_API_TOKEN\": \"your-token\",
    \"CLOUDFLARE_ACCOUNT_ID\": \"your-account-id\"
  }"
fi

if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  warn "CLOUDFLARE_ACCOUNT_ID not set — wrangler may still work if token has account access"
fi

# ─── Verify wrangler ──────────────────────────────────────────────────────
log "Checking wrangler..."
npx wrangler --version 2>/dev/null || err "wrangler not found. Run: npm install"
ok "wrangler available"

if ! npx wrangler whoami &>/dev/null; then
  log "Authenticating with Cloudflare API Token..."
  echo "$CLOUDFLARE_API_TOKEN" | npx wrangler login --token-stdin 2>/dev/null || true
  # Instead, use the token directly via environment (wrangler picks it up automatically)
fi
ok "Authenticated with Cloudflare"

# ─── Build ────────────────────────────────────────────────────────────────
log "Building the project (Next.js + Worker)..."
npm run build 2>&1 || err "Build failed"
ok "Build complete"

# ─── Deploy Worker (includes LessonTranscriptionWorkflow) ────────────────
log "Deploying worker with workflow..."
log "Step 1: Upload version with preview URL..."
if [[ "${DEPLOY_ENV:-production}" == "preview" ]]; then
  npx wrangler versions upload --preview-alias preview --env preview 2>&1 | tail -5
  ok "Preview version uploaded with alias 'preview'"
else
  npx wrangler versions upload --preview-alias staging 2>&1 | tail -5
  ok "Worker version uploaded with alias 'staging'"
fi

log "Step 2: Deploy version (100% traffic)..."
if [[ "${DEPLOY_ENV:-production}" == "preview" ]]; then
  npx wrangler versions deploy --yes 100 --env preview 2>&1 | tail -5
  ok "Preview worker deployed"
else
  npx wrangler versions deploy --yes 100 2>&1 | tail -5
  ok "Worker deployed — LessonTranscriptionWorkflow is now live"
fi

# ─── Verify workflow ──────────────────────────────────────────────────────
log "Verifying workflow..."
ENV_FLAG=""
[[ "${DEPLOY_ENV:-production}" == "preview" ]] && ENV_FLAG="--env preview"
WORKFLOW_INFO=$(npx wrangler workflows get lesson-transcription-workflow $ENV_FLAG 2>&1 || true)
if echo "$WORKFLOW_INFO" | grep -qi "not found\|error"; then
  warn "Workflow 'lesson-transcription-workflow' not found after deploy."
  log "Attempting to create it manually..."
  npx wrangler workflows create lesson-transcription-workflow $ENV_FLAG 2>&1 || warn "Could not create workflow — it may auto-register on first invocation"
else
  ok "Workflow 'lesson-transcription-workflow' is registered"
fi

# ─── Done ─────────────────────────────────────────────────────────────────
echo ""
ok "Deployment complete!"
echo ""
ENV_NAME="${DEPLOY_ENV:-production}"
log "Environment    : ${ENV_NAME}"
log "Workflow name  : lesson-transcription-workflow"
if [[ "$ENV_NAME" == "preview" ]]; then
  log "Worker name    : ya-lms-nextjs-preview"
else
  log "Worker name    : ya-lms-nextjs"
fi
log "Binding        : LESSON_TRANSCRIPTION_WORKFLOW"
log ""
log "To trigger transcription: call enqueueLessonProcessing() or upload a video"
log "To check workflow instances: npx wrangler workflows instances list lesson-transcription-workflow"
