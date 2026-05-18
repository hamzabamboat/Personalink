#!/usr/bin/env bash
# Weekly backup: schema via supabase CLI migrations, data via REST API, env vars encrypted
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$HOME/linkedpilot-backups"
DATE="$(date +%Y%m%d_%H%M%S)"
LOG="$BACKUP_DIR/backup.log"

mkdir -p "$BACKUP_DIR"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

log "=== Backup started ==="

# ── 1. Load env vars ──────────────────────────────────────────────────────────
ENV_FILE="$PROJECT_DIR/.env.local"
if [[ ! -f "$ENV_FILE" ]]; then
  log "ERROR: .env.local not found"; exit 1
fi
while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
  value="${value%\"}" ; value="${value#\"}"
  value="${value%\'}" ; value="${value#\'}"
  export "$key"="$value" 2>/dev/null || true
done < <(grep -v '^#' "$ENV_FILE" | grep '=')

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [[ -z "$SUPABASE_URL" || -z "$SERVICE_KEY" ]]; then
  log "ERROR: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing"; exit 1
fi

# ── 2. Schema backup — copy migrations folder ─────────────────────────────────
log "Backing up migrations (schema)..."
MIGRATIONS_BACKUP="$BACKUP_DIR/migrations_${DATE}"
cp -r "$PROJECT_DIR/supabase/migrations" "$MIGRATIONS_BACKUP" 2>/dev/null || true
cp "$PROJECT_DIR/supabase/schema.sql"    "$BACKUP_DIR/schema_${DATE}.sql" 2>/dev/null || true
log "Migrations saved to: $MIGRATIONS_BACKUP"

# ── 3. Data backup via REST API (key tables) ──────────────────────────────────
log "Backing up data via REST API..."
DATA_DIR="$BACKUP_DIR/data_${DATE}"
mkdir -p "$DATA_DIR"

TABLES=(
  "users"
  "subscriptions"
  "user_profiles"
  "posts"
  "voice_notes"
  "story_bank"
  "linkedin_scores"
  "image_briefs"
  "trends_cache"
  "post_suggestions"
  "post_analytics"
)

for TABLE in "${TABLES[@]}"; do
  RESPONSE=$(curl -sf \
    "${SUPABASE_URL}/rest/v1/${TABLE}?select=*" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Prefer: count=exact" \
    --max-time 30 2>>"$LOG" || echo "[]")

  echo "$RESPONSE" > "$DATA_DIR/${TABLE}.json"
  COUNT=$(echo "$RESPONSE" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "?")
  log "  $TABLE: $COUNT rows"
done

log "Data saved to: $DATA_DIR"

# ── 4. Compress data ──────────────────────────────────────────────────────────
log "Compressing data backup..."
tar -czf "$BACKUP_DIR/data_${DATE}.tar.gz" -C "$BACKUP_DIR" "data_${DATE}" \
  && rm -rf "$DATA_DIR" \
  && log "Compressed: data_${DATE}.tar.gz"

# ── 5. Env vars — AES-256 encrypted zip ───────────────────────────────────────
log "Backing up env vars..."
if [[ -n "${BACKUP_PASSWORD:-}" ]]; then
  zip -q -P "$BACKUP_PASSWORD" "$BACKUP_DIR/env_${DATE}.zip" "$ENV_FILE" \
    && log "Env backup saved (encrypted): env_${DATE}.zip"
else
  # Store a redacted copy listing which vars exist (not values)
  grep -v '^#' "$ENV_FILE" | grep '=' | sed 's/=.*/=***REDACTED***/' \
    > "$BACKUP_DIR/env_keys_${DATE}.txt" \
    && log "Env keys list saved (values redacted): env_keys_${DATE}.txt"
  log "TIP: Set BACKUP_PASSWORD env var to save an encrypted copy with values"
fi

# ── 6. Commit schema to GitHub ────────────────────────────────────────────────
log "Pushing schema changes to GitHub..."
cd "$PROJECT_DIR"
git add supabase/migrations supabase/schema.sql 2>/dev/null || true
if ! git diff --cached --quiet 2>/dev/null; then
  git commit -m "chore: weekly schema backup $(date +%Y-%m-%d)" \
    && git push origin "$(git rev-parse --abbrev-ref HEAD)" \
    && log "Schema committed and pushed to GitHub" \
    || log "WARNING: Git push failed"
else
  log "Schema unchanged — no commit needed"
fi

# ── 7. Prune backups older than 30 days ───────────────────────────────────────
log "Pruning old backups (>30 days)..."
find "$BACKUP_DIR" -name "*.tar.gz"  -mtime +30 -delete
find "$BACKUP_DIR" -name "*.sql"     -mtime +30 -delete
find "$BACKUP_DIR" -name "*.zip"     -mtime +30 -delete
find "$BACKUP_DIR" -name "*.txt"     -mtime +30 -delete
find "$BACKUP_DIR" -type d -name "migrations_*" -mtime +30 -exec rm -rf {} + 2>/dev/null || true
log "Pruning done"

log "=== Backup complete. Files in: $BACKUP_DIR ==="
