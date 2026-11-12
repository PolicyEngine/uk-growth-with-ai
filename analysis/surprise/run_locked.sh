#!/usr/bin/env bash
# Run driver.sh [ITEM ...] while holding the machine's heavy-job lock,
# /tmp/pe-heavy.lock, as a FILE containing "<pid> ugai-surprise-2028".
#   - takes it with noclobber, or adopts it if it already carries our label;
#   - never touches anyone else's lock (a file with another label, or a
#     directory such as the PIP drill's): exits 2 instead;
#   - releases it on exit, success or failure (trap), only if it is still ours.
# DEADLINE_AT (local HH:MM today, default 19:25: a drill rerun is booked from
# 20:00) becomes the driver's DEADLINE: no solve starts unless it can finish
# SOLVE_BUDGET (default 600 s) before it; the plan stops at a solve boundary and
# resumes on the next call.  The driver pushes after each output.
#
#   PY=~/ogmodels/OG-UK/.venv/bin/python WORK=~/ugai-rerun-work \
#     analysis/surprise/run_locked.sh                 # the default plan
set -uo pipefail
LOCK=/tmp/pe-heavy.lock
LABEL="ugai-surprise-2028"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
DEADLINE_AT="${DEADLINE_AT:-19:25}"
DEADLINE="$(date -j -f "%Y-%m-%d %H:%M:%S" "$(date +%Y-%m-%d) $DEADLINE_AT:00" +%s)" || exit 1
export DEADLINE
if (( $(date +%s) + ${SOLVE_BUDGET:-600} > DEADLINE )); then
  echo "past the deadline ($DEADLINE_AT): not taking the lock"; exit 3
fi
if ( set -o noclobber; echo "$$ $LABEL" > "$LOCK" ) 2>/dev/null; then
  echo "took $LOCK"
elif [[ -f "$LOCK" ]] && grep -q " $LABEL\$" "$LOCK"; then
  echo "$$ $LABEL" >| "$LOCK"; echo "adopted $LOCK"
else
  echo "lock held by someone else: $( [[ -d "$LOCK" ]] && echo "directory $(ls "$LOCK" 2>/dev/null | head -3 | tr '\n' ' ')" || cat "$LOCK" 2>/dev/null )"
  exit 2
fi
release() {
  [[ -f "$LOCK" ]] && grep -q "^$$ $LABEL\$" "$LOCK" 2>/dev/null \
    && rm -f "$LOCK" && echo "released $LOCK $(date +%H:%M)"
}
trap release EXIT
trap 'exit 130' INT TERM
echo "deadline $DEADLINE_AT ($(date -r "$DEADLINE"))"
"$REPO/analysis/surprise/driver.sh" "$@"
