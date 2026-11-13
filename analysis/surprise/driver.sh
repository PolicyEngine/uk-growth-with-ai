#!/usr/bin/env bash
# Sequential, resumable driver for the 2028 surprise solves (docs/surprise_2028.md).
#
#   PY=~/ogmodels/OG-UK/.venv/bin/python WORK=~/ugai-rerun-work \
#     analysis/surprise/driver.sh [ITEM ...]
#
# Items run in order; each is resumable (a finished solve, check or gate is
# never repeated):
#   check            surprise check-specs (one spec build, no solve; both closures)
#   nics             analysis/nics/measure_nics.py: PolicyEngine-UK NICs rates,
#                    2027-28, evidence only (non-fatal: logged and pushed)
#   <closure>:continuation | <closure>:gate
#   <closure>:<arms|arms_dn|arms_fs>:<scenario>   scenario = uk_low | uk_central |
#                                                  uk_high | korinek
# Default plan (Vahid, 12 Nov 2026): check-specs and both restart gates; UK
# central at both closures; UK low and high at zk0.1; Korinek (upper) at both;
# debt-neutral for UK central then Korinek; UK low/high at zk0; fixed spending.
#
# After EVERY solve, analysis/surprise/sanity.py is a hard gate: on any failure
# the driver pushes the record, its log and the sanity report, and exits 1.
# The per-solve summary table is written to the progress comment on #27.
#
# gate: approves the continuation with reference = continuation ONLY if it
# passes (Y, K, debt/GDP within 1e-4 over 2028-36, the rest within 1e-3,
# 2028 RC/Y <= 1e-5); on failure the driver stops and nothing else runs.
#
# DEADLINE (epoch seconds, optional): no heavy step starts unless it can end
# SOLVE_BUDGET seconds (default 600) before it; the run stops at a step
# boundary and resumes later.  Every output is committed by path and pushed.
# This script does NOT take /tmp/pe-heavy.lock: use run_locked.sh.
set -uo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
PY="${PY:?set PY to the OG-UK venv python}"
WORK="${WORK:?set WORK to the directory holding <closure>/baseline_p1}"
SOLVE_BUDGET="${SOLVE_BUDGET:-600}"
SOLVE_TIMEOUT="${SOLVE_TIMEOUT:-1800}"   # a solve takes ~7 min; kill it (by PID) after 30
NET_TIMEOUT="${NET_TIMEOUT:-60}"         # git push / gh calls
BRANCH="rerun/surprise-2028"
OUT="$REPO/analysis/surprise/output"
RERUN="$REPO/analysis/rerun/output"
PLAN=("$@")
[[ ${#PLAN[@]} -eq 0 ]] && PLAN=(check nics
  zk0.1:continuation zk0.1:gate zk0:continuation zk0:gate
  zk0.1:arms:uk_central zk0:arms:uk_central
  zk0.1:arms:uk_low zk0.1:arms:uk_high
  zk0.1:arms:korinek zk0:arms:korinek
  zk0.1:arms_dn:uk_central zk0:arms_dn:uk_central zk0.1:arms_dn:korinek zk0:arms_dn:korinek
  zk0:arms:uk_low zk0:arms:uk_high
  zk0.1:arms_fs:uk_central zk0:arms_fs:uk_central zk0.1:arms_fs:korinek zk0:arms_fs:korinek)
: > "$WORK/un_api_token.txt"   # empty: OG-Core reads the GitHub mirror, as every run so far
export PYTHONPATH="$REPO"

[[ "$(git -C "$REPO" rev-parse --abbrev-ref HEAD)" == "$BRANCH" ]] || {
  echo "not on $BRANCH"; exit 1; }

run_to() {   # run_to <seconds> <cmd...>: kill the command (its own PID only) on timeout
  local secs="$1"; shift
  "$@" & local pid=$! t=0
  while kill -0 "$pid" 2>/dev/null; do
    if (( t >= secs )); then
      kill "$pid" 2>/dev/null; sleep 5; kill -9 "$pid" 2>/dev/null
      echo "TIMEOUT after ${secs}s: $*"; wait "$pid" 2>/dev/null; return 124
    fi
    sleep 5; t=$((t + 5))
  done
  wait "$pid"
}

cli() { ( cd "$WORK" && "$PY" -m uk_growth_with_ai surprise "$@" --outdir "$OUT" \
            --rerun-dir "$RERUN" </dev/null ); }

push() {   # push <message> <path>...
  local msg="$1"; shift
  ( cd "$REPO" && git add -- "$@" \
    && git commit -q -m "$msg" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- "$@" \
    && for i in 1 2 3; do run_to "$NET_TIMEOUT" git push -q origin "$BRANCH" && exit 0; sleep 20; done
    echo "PUSH FAILED: $msg" )
}

progress() {
  local body id
  body="$("$PY" "$REPO/analysis/surprise/sanity.py" --progress --outdir "$OUT")" || return 0
  id="$(cat "$WORK/surprise_progress_comment_id" 2>/dev/null)"
  if [[ -n "$id" ]]; then
    run_to "$NET_TIMEOUT" gh api -X PATCH "repos/PolicyEngine/uk-growth-with-ai/issues/comments/$id" \
      -f body="$body" >/dev/null || echo "progress comment update failed"
  else
    run_to "$NET_TIMEOUT" gh api "repos/PolicyEngine/uk-growth-with-ai/issues/27/comments" -f body="$body" \
      --jq .id > "$WORK/surprise_progress_comment_id" || echo "progress comment failed"
  fi
}

sanity() {   # sanity <closure> <label>: the hard gate; pushes and exits on failure
  local C="$1" label="$2" slog="$OUT/$1/$2.sanity.log"
  "$PY" "$REPO/analysis/surprise/sanity.py" "$C" "$label" --outdir "$OUT" >"$slog" 2>&1
  local rc=$?
  tail -1 "$slog"
  if [[ $rc -ne 0 ]]; then
    push "surprise 2028 $C: $label FAILED the sanity gate" \
      "$OUT/$C/$label.json" "$OUT/$C/$label.log" "$slog" "$OUT/$C/$label.sanity.json"
    progress
    echo "STOP: $C $label failed the sanity gate; investigate before continuing"; exit 1
  fi
}

time_ok() {
  [[ -z "${DEADLINE:-}" ]] && return 0
  if (( $(date +%s) + SOLVE_BUDGET > DEADLINE )); then
    echo "DEADLINE: not starting $1 ($(date +%H:%M); deadline $(date -r "$DEADLINE" +%H:%M)); resume later"
    return 1
  fi
}

for item in "${PLAN[@]}"; do
  if [[ "$item" == check ]]; then
    f="$OUT/check_specs.json"
    [[ -f "$f" ]] && { echo "=== check-specs already done"; continue; }
    time_ok check-specs || exit 3
    echo "=== start check-specs $(date +%H:%M)"
    ( cd "$WORK" && caffeinate -i "$PY" -u -m uk_growth_with_ai surprise check-specs \
        --closure zk0.1 --outdir "$OUT" --rerun-dir "$RERUN" --work "$WORK" \
        </dev/null >"$OUT/check_specs.log" 2>&1 )
    rc=$?
    # the JSON report is the last thing printed: everything from the first "{" line
    sed -n '/^{/,$p' "$OUT/check_specs.log" > "$f.tmp"
    if [[ $rc -ne 0 ]] || ! "$PY" -c "import json,sys; json.load(open(sys.argv[1]))" "$f.tmp" 2>/dev/null; then
      rm -f "$f.tmp"; push "surprise 2028: check-specs FAILED (log)" "$OUT/check_specs.log"
      echo "STOP: check-specs failed (rc $rc); see $OUT/check_specs.log"; tail -5 "$OUT/check_specs.log"; exit 1
    fi
    mv "$f.tmp" "$f"
    push "surprise 2028: check-specs passed (one spec build, both closures)" "$f" "$OUT/check_specs.log"
    continue
  fi
  if [[ "$item" == nics ]]; then
    N="$REPO/analysis/nics"
    [[ -f "$N/nics_2028.json" ]] && { echo "=== nics already measured"; continue; }
    time_ok nics || exit 3
    echo "=== start nics $(date +%H:%M)"
    ( cd "$REPO" && caffeinate -i "$PY" -u analysis/nics/measure_nics.py </dev/null \
        >"$N/measure_nics.log" 2>&1 )
    rc=$?
    tail -3 "$N/measure_nics.log"
    files=("$N/measure_nics.log"); for y in 2027 2028; do
      [[ -f "$N/nics_$y.json" ]] && files+=("$N/nics_$y.json"); done
    push "NICs measurement on PolicyEngine-UK (evidence only, rc $rc)" "${files[@]}"
    [[ $rc -ne 0 ]] && echo "nics measurement failed (rc $rc); continuing: evidence only"
    continue
  fi
  IFS=: read -r C STAGE SCEN <<<"$item"
  SCEN="${SCEN:-korinek}"
  if [[ "$STAGE" == gate ]]; then
    g="$OUT/$C/GATE_continuation.json"
    [[ -f "$g" ]] && { echo "=== $C gate already approved"; continue; }
    cli gate --closure "$C" --approve --reference continuation \
        --note "driver: continuation passed the tight gate; gaps measured against it" \
        > "$OUT/$C/gate.log" 2>&1
    rc=$?
    if [[ $rc -ne 0 || ! -f "$g" ]]; then
      push "surprise 2028 $C: continuation gate FAILED" "$OUT/$C/gate.log"
      echo "STOP: $C continuation gate failed; nothing else runs"; cat "$OUT/$C/gate.log"; exit 1
    fi
    push "surprise 2028 $C: continuation gate passed (reference = continuation)" "$g" "$OUT/$C/gate.log"
    continue
  fi
  while true; do
    label="$(cli next --closure "$C" --stage "$STAGE" --scenario "$SCEN" 2>"$WORK/surprise_next.err")" || {
      echo "STOP $C $STAGE: $(tail -1 "$WORK/surprise_next.err")"; exit 1; }
    [[ -z "$label" ]] && { echo "=== $C $STAGE $SCEN done"; break; }
    time_ok "$C $label" || exit 3
    log="$OUT/$C/$label.log"; mkdir -p "$OUT/$C"
    echo "=== start $C $label $(date +%H:%M)"
    ( cd "$WORK" && run_to "$SOLVE_TIMEOUT" caffeinate -i "$PY" -u -m uk_growth_with_ai surprise \
        step --closure "$C" --stage "$STAGE" --scenario "$SCEN" --outdir "$OUT" \
        --rerun-dir "$RERUN" --work "$WORK" </dev/null >"$log" 2>&1 )
    rc=$?
    if [[ $rc -ne 0 || ! -f "$OUT/$C/$label.json" ]]; then
      push "surprise 2028 $C: $label FAILED (log)" "$log"
      echo "FAILED $C $label (rc $rc); see $log"; tail -5 "$log"; exit 1
    fi
    sanity "$C" "$label"
    push "surprise 2028 $C: solve $label (sanity pass)" "$OUT/$C/$label.json" "$log" \
      "$OUT/$C/$label.sanity.log" "$OUT/$C/$label.sanity.json"
    progress
  done
done
echo "=== plan complete"
