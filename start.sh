#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"
: "${OPENCODE_WEB_DIR:?OPENCODE_WEB_DIR must point to worker metadata storage}"
PORT="${PORT:-3000}"
export PORT

run_timed() {
  local label="$1"
  shift
  /usr/bin/time -f "[timing] ${label}: %e s" "$@"
}

run_timed "create metadata directory" mkdir -p "$OPENCODE_WEB_DIR"
run_timed "install dependencies" npm ci --no-audit --no-fund
run_timed "production build" npm run build
run_timed "write deployment metadata" node -e '
  const fs = require("node:fs");
  const path = require("node:path");
  const [project, directory, output] = process.argv.slice(1);
  fs.writeFileSync(output, JSON.stringify({ project, directory: path.resolve(directory) }));
' "$PROJECT_DIR" "$PROJECT_DIR/dist" "$OPENCODE_WEB_DIR/deployment-output.json"

[[ -f "$PROJECT_DIR/dist/index.html" ]] || { echo "Build output is missing dist/index.html" >&2; exit 1; }
echo "Serving $PROJECT_DIR/dist on 0.0.0.0:$PORT"
run_timed "static preview server" node "$PROJECT_DIR/node_modules/vite/bin/vite.js" preview --host 0.0.0.0 --port "$PORT" --strictPort
