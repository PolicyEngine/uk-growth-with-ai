# uk-growth-with-ai

The macroeconomic effects of AI on the UK, 2026–2030, in
[OG-UK](https://github.com/PSLmodels/OG-UK), the UK calibration of the
[OG-Core](https://github.com/PSLmodels/OG-Core) overlapping-generations model. The
model results are committed, so every table and the dashboard rebuild without
re-running the model.

## Scenarios

AI enters production `Y = Z K^γ (e^{g_y t} L)^{1−γ}` in two ways, both phased in
linearly from 2026 to 2030 and held thereafter:

| Scenario | Internal id | Automation (γ) | Productivity (Z) solved for | Calibration source |
|---|---|---|---|---|
| OBR central | `baseline` | γ = 0.35 (labour share 65%) | Z = 1 | OG-UK default |
| Automation only | `share_shift` | γ: 0.35 → 0.389 (labour share −3.9pp) | equilibrium GDP in 2030 equal to the baseline's (R4, #8) | Automation intensity from Korinek et al.; motivated by OBR March 2026 EFO Box 2.2 but **not** a reproduction of it — see below |
| Automation + productivity | `share_shift_tfp` | γ: 0.35 → 0.389 | +3.1% output at fixed K and L | Korinek et al. (2026), Table 3, "substantial" |

At `epsilon = 1` (Cobb-Douglas) the labour share is exactly `1 − γ`. All runs are
1-sector (`multi_sector=False`). Z is solved jointly with γ, because raising γ alone
changes output at fixed inputs (+6.06% at the baseline's K/L). In the central results
(`zeta_K = 0.1`) Z is 0.972112 for Automation + productivity. For Automation only, Z is
solved by secant over full solves so that 2030 GDP equals the baseline's: 0.931148,
against 0.942883 for a zero technology wedge at fixed inputs (recorded as
`Z_share_shift_fixed_input`). Each closure has its own Z values (`docs/rerun_r1_r4.md`).
Their level below 1 reflects the units of K/L and has no economic meaning.

Every scenario shares the baseline's initial assets and debt and its government
spending share; the baseline's share is set so that its debt/GDP in 2030 equals the
OBR's (R1, #32; 2030 is matched, not the path). The switch to debt targeting is moved to `tG1 = 10` (2036),
past the reported window; and `g_y_annual = 0.010`, the OBR's 1.0% medium-term
productivity growth. That path already contains the OBR's own AI assumption, which
builds non-linearly with adoption (Briefing paper No.9 paras B.12, B.14), and a scalar `g_y` cannot
strip a ramp out, so the baseline is **"OBR central"**, not a no-AI counterfactual:
each scenario's gap is an AI effect *in addition to* the OBR's own. A run
holding government spending and transfers at baseline levels instead
(`--baseline-spending`, the OBR's convention) has not been redone on the corrected
baseline; the earlier one is kept in `data/legacy/` and is not used. By default (`--g-n vendored`) a run stops
if OG-UK's live demographic fetch gives a different `g_n` for the reported window from
the one the committed run recorded. That run had no UN API token, so OG-Core read a
GitHub mirror of the UN data (`EAPD-DRB/Population-Data`) instead of the UN API; a run
with a valid token takes the API route, which has not been compared with the recorded
values.

Both arms are named for what they impose (issue #14): `share_shift` is the capital-share
shift with Z set so that 2030 GDP is unchanged (it had a zero technology wedge at the
baseline's fixed 2026 inputs before R4), and
`share_shift_tfp` adds +3.1% output at those inputs. Nothing in the model identifies AI
as the cause; the sizes are Korinek et al.'s. `share_shift` is compared with, not a
reproduction of, the OBR's Box 2.2. Since R4 it shares Box 2.2's defining result, the
**level of GDP unchanged**, but in 2030 only and through the choice of Z rather than
through unemployment, which OG-UK does not have; Box 2.2 also publishes no
labour-share number. The arms were called `obr` (later
`zero_tfp`) and `anthropic` before the rename; readers accept every legacy key at any
depth (`data_access.normalise_arms`), writers emit only the new ones.

**Capital closure.** The central results use `zeta_K = 0.1`, OG-UK's default (inherited
from OG-Core, not calibrated to the UK), with `zeta_D = 0.4` and a 2% world rate;
`zeta_K = 0` is published beside it as the closed-capital bound
(`docs/closure_choice.md`, #16, #27). National income (GNI) leads, because about three
quarters of the extra capital is foreign-owned at 0.1, so the GNI gap is below the GDP gap.

**Results, 2030, against the OBR-central baseline** (`data/scenarios.json`, bound in
`data/scenarios_zk0.json`): with Automation + productivity, GNI +3.8% (bound +2.9%) and
GDP +4.9% (bound +3.1%); with Automation only, GDP is unchanged by construction, GNI
−0.8% (bound −0.2%) and the wage rate −5.3% (bound −5.0%). The labour share falls 3.9pp
in both. The sign of the wage change with productivity gains depends on the closure.
Debt/GDP gaps keep moving after 2030; quote them with their 2035 values. Tables are in
`docs/rerun_r1_r4.md`; full results and caveats are in the dashboard.

## Install

```bash
pip install -e ".[test]"
```

`ogcore` and `oguk` are not dependencies: they are needed only for `run`, and
`solve.py` imports them lazily, so every other command works without them. The
committed results used OG-Core 0.17.0 and OG-UK 0.3.2 at
[vahid-ahmadi/OG-UK@d0e6ae5](https://github.com/vahid-ahmadi/OG-UK/commit/d0e6ae535da4ffbface55f0e64fb2074583a46a6),
with policyengine 5.0.4 and policyengine-uk 2.90.2. OG-UK's calibration reads
PolicyEngine's UK data from Hugging Face, so `run` needs `HUGGING_FACE_TOKEN` set.

### Time-varying γ patch

Stock OG-Core indexes γ by industry only, so automation can step but not ramp.
`patches/ogcore-0.17.0-firm-gamma-tv.diff` adds a time dimension to `ogcore/firm.py`
(design and verification in `docs/firm_gamma_tv.md`). It is applied to the installed
package in the environment that runs the model; OG-Core itself is not modified.

```bash
SITE=$(python -c "import ogcore, os; print(os.path.dirname(os.path.dirname(ogcore.__file__)))")
python -c "import ogcore; assert ogcore.__version__ == '0.17.0', ogcore.__version__"
patch -d "$SITE" -p1 --dry-run < patches/ogcore-0.17.0-firm-gamma-tv.diff
patch -d "$SITE" -p1 < patches/ogcore-0.17.0-firm-gamma-tv.diff
```

`run` refuses to start if `ogcore.firm` is unpatched.

## Reproduce

The committed results come from the corrective reruns (`docs/rerun_r1_r4.md`): one solve
per process, about 7 minutes each, one at a time, resumable. `analysis/rerun/driver.sh`
loops over `rerun next` / `rerun step`. It also commits each solve's record and pushes it
to the `rerun/r1-r4` branch, and updates the progress comment on #27, so edit `BRANCH`
and `progress` before running it from a fork.

```bash
export HUGGING_FACE_TOKEN=...
export PY=/path/to/og-uk/venv/bin/python WORK=~/ugai-rerun-work
analysis/rerun/driver.sh baseline zk0.1 zk0       # R1 baseline passes, per closure
python -m uk_growth_with_ai rerun gate --closure zk0.1          # read the gate report
python -m uk_growth_with_ai rerun gate --closure zk0.1 --approve --note "..."
python -m uk_growth_with_ai rerun gate --closure zk0 --approve --note "..."
analysis/rerun/driver.sh arms zk0.1 zk0           # both arms, R4 secant for share_shift
python -m uk_growth_with_ai rerun assemble --closure zk0.1 --out uk_growth_with_ai/data/scenarios.json
python -m uk_growth_with_ai rerun assemble --closure zk0 --out uk_growth_with_ai/data/scenarios_zk0.json
python -m uk_growth_with_ai check --results uk_growth_with_ai/data/scenarios.json
python -m uk_growth_with_ai check --results uk_growth_with_ai/data/scenarios_zk0.json
python -m uk_growth_with_ai dashboard
python -m pytest
```

`assemble` without `--out` writes `uk_growth_with_ai/data/scenarios_<closure>.json`.
Keep the machine awake (`caffeinate -i` on macOS); run times are wall-clock. The plain
`run` command below solves with OG-UK's stock settings (no closure, demographics or
debt calibration) and writes to `./results/`; do not copy its output over the committed
files.

## Commands

```bash
python -m uk_growth_with_ai run [--only share_shift|share_shift_tfp] [--shapes ramp|step|both] [--g-n vendored|live]
                                [--baseline-only] [--baseline-spending]
                                [--tG1 N] [--g-y-annual X] [--out PATH]
python -m uk_growth_with_ai check [--results PATH] [--baseline-only]
python -m uk_growth_with_ai report [--arm share_shift_tfp_ramp|share_shift_ramp]
python -m uk_growth_with_ai obr
python -m uk_growth_with_ai dashboard [--check]
```

* `run` solves the steady state and transition path for the baseline and the shocked
  scenarios and writes `./results/scenarios.json` (never the committed file unless
  `--out` points there). `--baseline-only` stops after the baseline and the Z solve.
  `--baseline-spending` holds government spending and transfers at baseline levels.
  `--tG1` and `--g-y-annual` default to 10 and 0.010. `--g-n` defaults to `vendored`:
  the first five periods of OG-UK's run-time UN fetch must match the committed run's
  recorded `g_n` (to 1e-9), or the run raises `GNDriftError` rather than silently
  moving with the fetch date. Nothing is overwritten: the solve always uses the live
  fetch, because the tail, `g_n_ss`, `omega` and `imm_rates` come from it and were
  never recorded. `--g-n live` skips the check. See
  `uk_growth_with_ai/data/g_n_committed_run.json` for what is and is not checked.
* `check` runs the validation checks in issue #9 on a results file: no fiscal-rule break
  in 2030, the fiscal invariant of the recorded closure (a common G/Y, or baseline G
  levels under `--baseline-spending`), balanced growth against the OBR's potential
  output, the Z targets, the labour share and solution quality for the baseline and
  every arm. It exits 1 if an expected arm (`arms.py`, or the run's recorded
  `arms_requested`) is missing, any arm failed, or the file is malformed (issue #17).
  A baseline-only file must say so: new runs record it, older files need `--baseline-only`.
  It also checks the national accounts and signs: the model's resource-constraint error
  in every reported year (0.1% of GDP; the 2026 residual, #15, is reported as KNOWN up
  to 1.0%), Y − C − I − G (not net exports: public investment and net external flows
  are not saved), and positivity and share bands. Tolerances are documented in
  `checks.py`. WARN and KNOWN lines are counted in the summary but do not fail the run.
* `report` prints the year-by-year gaps, GDP growth, the labour share and, for
  `share_shift_tfp_ramp`, the comparison with Korinek et al. Table 3.
* `obr` compares the OBR-central baseline with the OBR's March 2026 EFO: GDP growth
  2027–30 and its components (productivity, population growth, balanced-growth rate).
* `dashboard` writes `dashboard/src/data/aiScenarios.json` and `ukAiPaths.json` from
  the results; `--check` writes nothing and exits 1 if the committed files are stale.
  The test suite runs the same check, so hand edits to those files fail `pytest`.

Model output is detrended; the readers re-trend it with the `g_y` and `g_n` each
results file records (`--oguk-dir` or the vendored `data/og_uk_params.json` are used
only for results files that predate those fields).

## Dashboard

```bash
cd dashboard && bun install && bun dev
```

A Next.js app with five tabs: Economic effects, Model, Scenario design, Model
comparison and Code. Its data files are generated, not edited by hand.

## Layout

```
uk_growth_with_ai/
  scenarios.py       scenario definitions and run settings (tG1, g_y_annual)
  arms.py            the shocked arms a complete results file must contain
  calibrate.py       γ for a labour-share fall, the γ-only gain, the Z solvers
  solve.py           the OG-UK runner (lazy ogcore/oguk import, SS, TPI, diagnostics)
  checks.py          validation checks on a results file
  report.py          result tables and the re-trending
  obr.py             the OBR baseline comparison and the published OBR figures
  dashboard_data.py  builds the dashboard's data files from the results
  data_access.py     data loading
  cli.py             run | rerun | check | report | obr | dashboard
  rerun.py           the corrective reruns R1-R4, one solve per process
  data/              scenarios.json (zeta_K = 0.1), scenarios_zk0.json (zeta_K = 0),
                     legacy/ (earlier runs, unused), og_uk_params.json,
                     obr_history.json (OBR/ONS chart series, with provenance),
                     anthropic_us_2030.json
patches/             ogcore-0.17.0-firm-gamma-tv.diff
tests/               pytest over the functions and the committed numbers
analysis/            the original scripts these modules were refactored from
docs/                the OBR comparison write-up, the patch design
dashboard/           the Next.js front end
```

## Tests

```bash
python -m pytest
```
