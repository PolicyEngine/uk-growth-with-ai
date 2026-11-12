#!/usr/bin/env bash
# Pull new 2028-surprise solves, rebuild the dashboard data and the site, and
# restart the local server on 4320. Only the server whose PID is in $PIDFILE
# is stopped; nothing else is touched. No solve is run.
#   analysis/surprise/refresh_dashboard.sh [pidfile]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PIDFILE="${1:-${DASH_PIDFILE:-$ROOT/.dashboard-4320.pid}}"
LOG="${PIDFILE%.pid}.log"
cd "$ROOT"
git fetch -q origin
git merge -q --no-edit origin/rerun/surprise-2028
python3 analysis/surprise/build_dashboard_data.py
cd dashboard
# stop our server first: never rebuild .next under a running server
if [[ -f "$PIDFILE" ]] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  kill "$(cat "$PIDFILE")"; sleep 1
fi
bun --bun run build
nohup bun --bun ./node_modules/.bin/next start -p 4320 >"$LOG" 2>&1 &
echo $! >"$PIDFILE"
sleep 3
curl -sf -o /dev/null http://localhost:4320 && echo "serving http://localhost:4320 (pid $(cat "$PIDFILE"))"
