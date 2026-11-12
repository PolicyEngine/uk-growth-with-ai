#!/usr/bin/env bash
# Pull new 2028-surprise solves, rebuild the dashboard data and the site, and
# restart the local server (port 4330 by default). Only the server whose PID
# is in the pidfile is stopped; if the port is held by any other process the
# script stops before touching anything. No solve is run.
#   analysis/surprise/refresh_dashboard.sh                 # port 4330
#   DASH_PORT=4320 analysis/surprise/refresh_dashboard.sh  # another port
# With CHECK_NUMBERS=1 it then dumps every tab and runs the number check
# (needs playwright; PW_DIR is a folder that has it installed).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${DASH_PORT:-4330}"
PIDFILE="${DASH_PIDFILE:-$ROOT/.dashboard-$PORT.pid}"
LOG="${PIDFILE%.pid}.log"
OURS=""
[[ -f "$PIDFILE" ]] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null && OURS="$(cat "$PIDFILE")"
for p in $(lsof -t -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true); do
  if [[ "$p" != "$OURS" ]]; then
    echo "port $PORT is held by pid $p, which this script did not start; stopping" >&2; exit 1
  fi
done
cd "$ROOT"
git fetch -q origin
git merge -q --no-edit origin/rerun/surprise-2028
python3 analysis/surprise/build_dashboard_data.py
# stop our server first: never rebuild .next under a running server
if [[ -n "$OURS" ]]; then kill "$OURS"; while kill -0 "$OURS" 2>/dev/null; do sleep 0.5; done; fi
cd dashboard
bun --bun run build
nohup bun --bun ./node_modules/.bin/next start -p "$PORT" >"$LOG" 2>&1 &
NEW=$!
echo "$NEW" >"$PIDFILE"
for _ in $(seq 1 20); do curl -sf -o /dev/null "http://localhost:$PORT" && break; sleep 0.5; done
if kill -0 "$NEW" 2>/dev/null && curl -sf -o /dev/null "http://localhost:$PORT"; then
  echo "serving http://localhost:$PORT (pid $NEW, log $LOG)"
else
  echo "server failed to start; see $LOG" >&2; exit 1
fi
if [[ "${CHECK_NUMBERS:-0}" == "1" ]]; then
  DUMP="$(mktemp -t dashdump).json"
  cp scripts/dumptabs.mjs "${PW_DIR:?set PW_DIR to a folder with playwright installed}/dumptabs_refresh.mjs"
  (cd "$PW_DIR" && bun dumptabs_refresh.mjs "http://localhost:$PORT" "$DUMP")
  python3 scripts/check_numbers.py "$DUMP"
fi
