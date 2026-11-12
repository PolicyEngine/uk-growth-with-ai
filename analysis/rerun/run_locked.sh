#!/usr/bin/env bash
# Run driver.sh <stage> <closures...> (and optionally the params export) while
# holding the machine's heavy-job lock, /tmp/pe-heavy.lock, as a FILE.
#   - takes it with noclobber, or adopts it if it already carries LABEL;
#   - removes it on exit, success or failure (trap); never touches anyone else's.
#   LABEL=ugai-fixed-spending PARAMS=1 PY=... WORK=... analysis/rerun/run_locked.sh arms_fs zk0.1 zk0
set -uo pipefail
LOCK=/tmp/pe-heavy.lock
LABEL="${LABEL:?set LABEL}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
if ( set -o noclobber; echo "$$ $LABEL" > "$LOCK" ) 2>/dev/null; then
  echo "took $LOCK"
elif [[ -f "$LOCK" ]] && grep -q " $LABEL\$" "$LOCK"; then
  echo "$$ $LABEL" >| "$LOCK"; echo "adopted $LOCK"
else
  echo "lock held by someone else: $(cat "$LOCK" 2>/dev/null || echo directory)"; exit 2
fi
release() { grep -q "^$$ $LABEL\$" "$LOCK" 2>/dev/null && rm -f "$LOCK" && echo "released $LOCK $(date -u +%H:%M:%SZ)"; }
trap release EXIT
"$REPO/analysis/rerun/driver.sh" "$@"; rc=$?
if [[ $rc -eq 0 && "${PARAMS:-0}" == 1 && -n "${DEADLINE:-}" && $(( $(date +%s) + 900 )) -gt $DEADLINE ]]; then
  echo "DEADLINE: skipping the params export"
elif [[ $rc -eq 0 && "${PARAMS:-0}" == 1 ]]; then
  ( cd "$WORK" && PYTHONPATH="$REPO" WORK="$WORK" caffeinate -i "$PY" -u \
      "$REPO/analysis/rerun/export_cohorts.py" --params </dev/null 2>&1 | grep -v "^Failed\|diff:" )
fi
exit $rc
