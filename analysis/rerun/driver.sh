#!/usr/bin/env bash
# Sequential, resumable driver for the corrective reruns R1-R4 (#27).
#
#   PY=~/ogmodels/OG-UK/.venv/bin/python WORK=~/ugai-rerun-work \
#     analysis/rerun/driver.sh <stage> <closure> [<closure> ...]
#
# stage = baseline (R1 calibration passes) or arms (needs the approved gate,
# analysis/rerun/output/<closure>/GATE_baseline.json).  ONE solve per python
# process, one at a time.  `rerun next` reads the outputs already present, so a
# finished solve is never repeated and an interrupted one is simply re-run.
# After each solve: commit and push its JSON + log, then refresh the progress
# comment on #27.
set -uo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
PY="${PY:?set PY to the OG-UK venv python}"
WORK="${WORK:?set WORK to a scratch directory}"
STAGE="$1"; shift
BRANCH="${BRANCH:-$(git -C "$REPO" branch --show-current)}"   # push to the checked-out branch
OUT="$REPO/analysis/rerun/output"
mkdir -p "$WORK" "$OUT"
: > "$WORK/un_api_token.txt"   # empty: OG-Core reads the GitHub mirror, as every run so far
export PYTHONPATH="$REPO"

cli() { ( cd "$WORK" && "$PY" -m uk_growth_with_ai rerun "$@" --outdir "$OUT" \
            --prior-dir "$REPO/analysis/closure/output" </dev/null ); }

push() {
  cd "$REPO" || return 1
  git add analysis/rerun/output
  git commit -q -m "$1" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" \
    || { echo "nothing to commit"; return 0; }
  for i in 1 2 3; do git push -q origin "$BRANCH" && return 0; sleep 20; done
  echo "PUSH FAILED: $1"
}

progress() {
  local body id
  body="$(BRANCH="$BRANCH" "$PY" "$REPO/analysis/rerun/progress.py" "$OUT")" || return 0
  id="$(cat "$WORK/progress_comment_id" 2>/dev/null)"
  if [[ -n "$id" ]]; then
    gh api -X PATCH "repos/PolicyEngine/uk-growth-with-ai/issues/comments/$id" \
      -f body="$body" >/dev/null || echo "progress comment update failed"
  else
    gh api "repos/PolicyEngine/uk-growth-with-ai/issues/27/comments" -f body="$body" \
      --jq .id > "$WORK/progress_comment_id" || echo "progress comment failed"
  fi
}

for C in "$@"; do
  while true; do
    label="$(cli next --closure "$C" --stage "$STAGE" 2>"$WORK/next.err")" || {
      echo "STOP $C $STAGE: $(tail -1 "$WORK/next.err")"; break; }
    [[ -z "$label" ]] && { echo "=== $C $STAGE done"; break; }
    # DEADLINE (epoch seconds): start no solve that could run past it (8 min each).
    if [[ -n "${DEADLINE:-}" && $(( $(date +%s) + 480 )) -gt $DEADLINE ]]; then
      echo "DEADLINE: not starting $C $label"; exit 3; fi
    log="$OUT/$C/$label.log"; mkdir -p "$OUT/$C"
    echo "=== start $C $label $(date -u +%H:%M:%SZ)"
    ( cd "$WORK" && caffeinate -i "$PY" -u -m uk_growth_with_ai rerun step --closure "$C" \
        --stage "$STAGE" --outdir "$OUT" --work "$WORK" \
        --prior-dir "$REPO/analysis/closure/output" </dev/null >"$log" 2>&1 )
    rc=$?
    if [[ $rc -ne 0 || ! -f "$OUT/$C/$label.json" ]]; then
      echo "FAILED $C $label (exit $rc)"; tail -30 "$log"; exit 1
    fi
    grep "^OK " "$log" | tail -1
    push "rerun $C: solve $label"
    progress
  done
done
echo "=== driver done $(date -u +%H:%M:%SZ)"
