# Surprise 2027: AI arrives in 2027, full size in 2030

Vahid, 18 Nov 2026: "AI is already here … assume from 2027 we will have different path."

The design is `docs/surprise_2028.md` moved one year earlier. Every date follows the shock year through `surprise.window(year)`. The 2028 set is untouched.

| | 2028 set | 2027 set |
|---|---|---|
| announced, unanticipated | start of 2028 | start of 2027 |
| ramp weights | 0.25, 0.5, 0.75, 1 over 2028–31 | 0.25, 0.5, 0.75, 1 over 2027–30 |
| headline year (full size; R4 holds GDP here) | 2031 | 2030 |
| report window | 2027–2031 | 2026–2030 |
| history (every gap exactly 0) | 2026–27 | 2026 |
| Z anchor (baseline K, L) | 2027 | 2026 |
| debt rule's first year (tG1) | 2036 (run period 8) | 2036 (run period 9) |
| solve records | `analysis/surprise/output/` | `analysis/surprise2027/output/` |
| cohort paths | `analysis/surprise/cohorts/` | `analysis/surprise2027/cohorts/` |
| work dir | `$WORK/surprise2028/` | `$WORK/surprise2027/` |
| results files | `scenarios_surprise2028_*.json` | `scenarios_surprise2027_*.json` |
| dashboard data | `surprise2028.json`, `cohorts2028.json`, `methodFacts.json` | `surprise2027.json`, `cohorts2027.json`, `methodFacts2027.json` |

The baseline is the same (OG-UK at the OBR central forecast, the accepted R1–R4 baselines). So are the scenario inputs, the closures and the gap reference, the same closure's no-shock continuation.

## Pipeline commands (2027)

From the repository root, with `PY` and `WORK` set as for 2028:

```
export PY=/path/to/og-uk/.venv/bin/python WORK=~/ugai-rerun-work
export PYTHONPATH=$PWD OUT=$PWD/analysis/surprise2027/output RERUN=$PWD/analysis/rerun/output
# the surprise CLI as driver.sh calls it; --start 2027 is required (the CLI defaults to 2028)
sp() { ( cd "$WORK" && "$PY" -m uk_growth_with_ai surprise "$@" --outdir "$OUT" --rerun-dir "$RERUN" --start 2027 ); }
```

**The whole plan, under the heavy-job lock.** `YEAR=2027` sets the branch check, the output folders and `--start`. `NO_PUSH=1` commits each output without pushing. `FAIL_CONTINUE=1` keeps the lock past a failed solve.

```
YEAR=2027 NO_PUSH=1 FAIL_CONTINUE=1 SOLVE_TIMEOUT=3600 DEADLINE_AT=13:30 \
  caffeinate -dims analysis/surprise/run_locked.sh check zk0.1:prepare zk0:prepare zk0.5:prepare \
  zk0.1:continuation zk0.1:gate zk0:continuation zk0:gate zk0.5:continuation zk0.5:gate \
  zk0.1:arms:uk_central zk0:arms:uk_central zk0.1:arms:korinek zk0:arms:korinek \
  zk0.1:arms_dn:uk_central zk0:arms_dn:uk_central zk0.1:arms_dn:korinek zk0:arms_dn:korinek \
  zk0.1:arms_fs:uk_central zk0:arms_fs:uk_central zk0.1:arms_fs:korinek zk0:arms_fs:korinek \
  zk0.1:arms:uk_low zk0.1:arms:uk_high zk0:arms:uk_low zk0:arms:uk_high \
  zk0.5:arms:uk_central zk0.5:arms:uk_low zk0.5:arms:korinek zk0.5:arms:uk_high \
  zk0.1:continuation_dnfull zk0.1:arms_dnfull:uk_central cohorts
```

**Single steps:**

```
sp check-specs --closure zk0.1 --work "$WORK"     # asserts the gamma ramp equals calendar_weights(2027)
sp step --closure zk0.1 --stage continuation --work "$WORK"
sp gate --closure zk0.1 --approve --reference continuation --note "..."
sp next --closure zk0.1 --stage arms --scenario uk_central
sp step --closure zk0.1 --stage arms --scenario uk_central --work "$WORK"
"$PY" analysis/surprise/sanity.py zk0.1 uk_central_share_shift_tfp_ramp --outdir "$OUT" --year 2027
python3 -m uk_growth_with_ai.cli surprise assemble --closure zk0.1 --scenario uk_central --start 2027 --outdir "$OUT"
#   writes uk_growth_with_ai/data/scenarios_surprise2027_uk_central.json
```

**Exports.** No solve is run, but these read the solves' pickles under `$WORK`:

```
WORK="$WORK" UGAI_SURPRISE_YEAR=2027 "$PY" analysis/surprise/export_cohorts.py      # analysis/surprise2027/cohorts/
WORK="$WORK" python3 analysis/surprise/build_dashboard_data.py --year 2027          # dashboard/src/data/surprise2027.json
UGAI_SURPRISE_YEAR=2027 python3 paper/cohort_welfare.py --json dashboard/src/data/cohorts2027.json
python3 dashboard/scripts/build_method_facts.py --year 2027                         # dashboard/src/data/methodFacts2027.json
python3 analysis/surprise/audit_surprise.py --year 2027 [--verdict|--mono|--dnfull] # docs/results_sanity_2027.md
python3 analysis/surprise2027/compare_report.py                                     # old (2031) vs new (2030) tables
```

## Code changes the 2027 set needed

- **`run_arm` ramp offset** (`5520c2a`). The offset is 1 for every shock year: model period 0 is the shock year, and the ramp's zero-weight year is the year before. The old `k − 1` was right only for 2028. The 2028 solves are unaffected. `check-specs` now asserts the ramp.
- **Year passed through the tools.**
  - `driver.sh` / `run_locked.sh`: `YEAR`, `NO_PUSH`, `FAIL_CONTINUE`.
  - `sanity.py --year`.
  - `export_cohorts.py`, `cohort_welfare.py`: `UGAI_SURPRISE_YEAR`.
  - `build_dashboard_data.py --year`, `build_method_facts.py --year`, `audit_surprise.py --year`.
  - With the default (2028), each reproduces its 2028 output exactly.
- **Year-named keys** follow the year: `foreign_share_dK_<headline>`, `profile_<shock>`, `income_<shock>_35_age45`, `wealth_by_age_<shock>`.

The run report (results, rulings and the 2028 comparison) is kept outside the repository; its tables are reproduced by `analysis/surprise2027/compare_report.py`.
