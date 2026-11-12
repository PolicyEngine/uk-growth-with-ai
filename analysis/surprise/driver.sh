#!/usr/bin/env bash
# Sequential, resumable driver for the 2028 surprise solves (docs/surprise_2028.md).
#
#   PY=~/ogmodels/OG-UK/.venv/bin/python WORK=~/ugai-rerun-work \
#     analysis/surprise/driver.sh <stage> <closure> [<closure> ...]
#
# stage = continuation | arms | arms_fs.  ONE solve per python process, one at
# a time; `surprise next` reads what exists, so a finished solve is never
# repeated.  After each solve its JSON and log are committed (by path) and
# pushed.  This script does NOT take /tmp/pe-heavy.lock: run it only when the
# lock is ours.  Needs `surprise prepare` to have written baseline_ext.json.
set -uo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
PY="${PY:?set PY to the OG-UK venv python}"
WORK="${WORK:?set WORK to the directory holding <closure>/baseline_p1}"
STAGE="$1"; shift
BRANCH="rerun/surprise-2028"
OUT="$REPO/analysis/surprise/output"
RERUN="$REPO/analysis/rerun/output"
: > "$WORK/un_api_token.txt"   # empty: OG-Core reads the GitHub mirror, as every run so far
export PYTHONPATH="$REPO"

cli() { ( cd "$WORK" && "$PY" -m uk_growth_with_ai surprise "$@" --outdir "$OUT" \
            --rerun-dir "$RERUN" </dev/null ); }

for C in "$@"; do
  while true; do
    label="$(cli next --closure "$C" --stage "$STAGE" 2>"$WORK/surprise_next.err")" || {
      echo "STOP $C $STAGE: $(tail -1 "$WORK/surprise_next.err")"; break; }
    [[ -z "$label" ]] && { echo "=== $C $STAGE done"; break; }
    log="$OUT/$C/$label.log"; mkdir -p "$OUT/$C"
    echo "=== start $C $label $(date -u +%H:%M:%SZ)"
    ( cd "$WORK" && caffeinate -i "$PY" -u -m uk_growth_with_ai surprise step --closure "$C" \
        --stage "$STAGE" --outdir "$OUT" --rerun-dir "$RERUN" --work "$WORK" \
        </dev/null >"$log" 2>&1 )
    rc=$?
    if [[ $rc -ne 0 || ! -f "$OUT/$C/$label.json" ]]; then
      echo "FAILED $C $label (rc $rc); see $log"; tail -5 "$log"; exit 1
    fi
    ( cd "$REPO" && git add "analysis/surprise/output/$C/$label.json" \
        "analysis/surprise/output/$C/$label.log" \
      && git commit -q -m "surprise 2028 $C: solve $label" \
           -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" \
      && for i in 1 2 3; do git push -q origin "$BRANCH" && break; sleep 20; done )
  done
done
