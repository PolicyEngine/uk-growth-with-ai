#!/usr/bin/env bash
# Keeps ONE progress comment on tracker issue #27 up to date while driver.sh runs.
#   WORK=/same/scratch analysis/closure/progress.sh &
# Edits the same comment (id stored in $WORK/progress_comment_id) each time a solve
# finishes, so a restarted session can see done/pending at a glance. Exits when the
# driver prints "driver done" or all 10 solves exist.
set -uo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="${WORK:?set WORK}"
OUT="$REPO/analysis/closure/output"
GH_REPO=PolicyEngine/uk-growth-with-ai
IDF="$WORK/progress_comment_id"
ALL=(zk0.1_baseline zk0.1_anthropic_ramp zk0.1_obr_ramp zk0_baseline zk0_anthropic_ramp
     zk0_obr_ramp zk0.5_baseline zk0.5_anthropic_ramp zk0.5_obr_ramp pretp_zk0.1_baseline)

body() {
  local done=0
  echo "**Step 5 solve progress** (branch \`analysis/closure-sensitivity\`, auto-updated after each solve; one OG solve at a time on Vahid's laptop; restart with \`analysis/closure/driver.sh\`, which skips finished solves)."
  echo
  echo "| solve | status | TPI converged | RC/GDP 2026 |"
  echo "|---|---|---|---|"
  for s in "${ALL[@]}"; do
    if [[ -f "$OUT/$s.json" ]]; then
      done=$((done+1))
      python3 - "$OUT/$s.json" "$s" <<'EOF'
import json, sys
r = json.load(open(sys.argv[1])); c = r["convergence"]
print(f"| `{sys.argv[2]}` | done ({r['elapsed_min']:.1f} min) | {'yes' if c['converged'] else 'NO'} "
      f"(dist {c['tpi_final_distance']:.1e}) | {100*c['rc_rel_Y_signed'][0]:+.4f}% |")
EOF
    else
      echo "| \`$s\` | pending | | |"
    fi
  done
  echo
  echo "$done of ${#ALL[@]} done, last updated $(date -u +%Y-%m-%dT%H:%MZ). Results and tables: \`analysis/closure/output/\`, \`docs/closure_sensitivity.md\`."
}

post() {
  local b; b="$(body)"
  if [[ -s "$IDF" ]]; then
    gh api -X PATCH "repos/$GH_REPO/issues/comments/$(cat "$IDF")" -f body="$b" >/dev/null
  else
    gh api "repos/$GH_REPO/issues/27/comments" -f body="$b" --jq .id > "$IDF"
  fi
  echo "posted progress $(date -u +%H:%M:%SZ)"
}

last=""
while true; do
  cur="$(ls "$OUT"/*.json 2>/dev/null | grep -v summary.json | sort | tr '\n' ' ' || true)"
  echo "tick $(date -u +%H:%M:%SZ) cur=[$cur]"
  if [[ "$cur" != "$last" ]]; then post && last="$cur"; fi
  n=$(ls "$OUT"/*.json 2>/dev/null | grep -vc summary.json)
  if [[ "$n" -ge ${#ALL[@]} ]] || grep -q "driver done" "$WORK/driver.out" 2>/dev/null; then
    post; exit 0
  fi
  sleep 30
done
