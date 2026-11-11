#!/usr/bin/env bash
# Sequential driver for the closure / pre-TP diagnostic solves (issues #16, #15).
#
#   PY=/path/to/og-uk-venv/bin/python WORK=/some/scratch analysis/closure/driver.sh
#
# One solve at a time (each ~7 min). Finished solves (output JSON present) are
# skipped, so the script can be restarted after an interruption. After each
# solve the output JSON and the regenerated summary are committed and pushed.
# Baseline directories (SS/TPI pickles the ramp arms inherit) live under $WORK.
set -uo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
PY="${PY:?set PY to the OG-UK venv python}"
WORK="${WORK:?set WORK to a scratch directory}"
OUT="$REPO/analysis/closure/output"
BRANCH="analysis/closure-sensitivity"
mkdir -p "$WORK" "$OUT"
# OG-Core reads the UN API token from the cwd; an empty file means "no token"
# (and no stdin prompt), which is how the committed run was made.
: > "$WORK/un_api_token.txt"

# label | arm | zeta_K | pretp | baseline label
PLAN=(
  "zk0.1_baseline|baseline|0.1|0|"
  "zk0.1_anthropic_ramp|anthropic_ramp|0.1|0|zk0.1_baseline"
  "zk0.1_obr_ramp|obr_ramp|0.1|0|zk0.1_baseline"
  "zk0_baseline|baseline|0|0|"
  "zk0_anthropic_ramp|anthropic_ramp|0|0|zk0_baseline"
  "zk0_obr_ramp|obr_ramp|0|0|zk0_baseline"
  "zk0.5_baseline|baseline|0.5|0|"
  "zk0.5_anthropic_ramp|anthropic_ramp|0.5|0|zk0.5_baseline"
  "zk0.5_obr_ramp|obr_ramp|0.5|0|zk0.5_baseline"
  "pretp_zk0.1_baseline|baseline|0.1|1|"
)

commit_push() {
  local msg="$1"
  cd "$REPO" || return 1
  "$PY" analysis/closure/summarise.py || echo "summarise failed (continuing)"
  git add analysis/closure/output docs/closure_sensitivity.md
  git commit -q -m "$msg" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" \
    || { echo "nothing to commit"; return 0; }
  for i in 1 2 3; do
    git push -q origin "$BRANCH" && return 0
    sleep 20
  done
  echo "PUSH FAILED for: $msg"
}

for row in "${PLAN[@]}"; do
  IFS='|' read -r label arm zk pretp base <<<"$row"
  if [[ -f "$OUT/$label.json" ]]; then echo "skip $label (done)"; continue; fi
  bdir_label="${base:-$label}"
  args=(--label "$label" --arm "$arm" --zeta-K "$zk" --base-dir "$WORK/$bdir_label")
  [[ "$pretp" == 1 ]] && args+=(--pretp)
  if [[ -n "$base" ]]; then
    if [[ ! -f "$OUT/$base.json" ]]; then echo "skip $label: baseline $base missing"; continue; fi
    args+=(--baseline-json "$OUT/$base.json")
  fi
  echo "=== start $label $(date -u +%H:%M:%SZ)"
  ( cd "$WORK" && caffeinate -i "$PY" -u "$REPO/analysis/closure/run_closure.py" "${args[@]}" \
      </dev/null >"$WORK/$label.log" 2>&1 )
  rc=$?
  cp "$WORK/$label.log" "$OUT/$label.log" 2>/dev/null
  if [[ $rc -ne 0 || ! -f "$OUT/$label.json" ]]; then
    echo "FAILED $label (exit $rc); log: $WORK/$label.log"
    tail -30 "$WORK/$label.log"
    continue
  fi
  tail -1 "$WORK/$label.log"
  commit_push "closure study: solve $label (zeta_K=$zk, pretp=$pretp)"
done
echo "=== driver done $(date -u +%H:%M:%SZ)"
