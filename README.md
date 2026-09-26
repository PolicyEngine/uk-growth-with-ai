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
| No AI | `baseline` | γ = 0.35 (labour share 65%) | Z = 1 | OG-UK default |
| Automation only | `obr` | γ: 0.35 → 0.389 (labour share −3.9pp) | no output gain at fixed K and L | OBR, March 2026 EFO, Box 2.2 |
| Automation + productivity | `anthropic` | γ: 0.35 → 0.389 | +3.1% output at fixed K and L | Korinek et al. (2026), Table 3, "substantial" |

At `epsilon = 1` (Cobb-Douglas) the labour share is exactly `1 − γ`. All runs are
1-sector (`multi_sector=False`). Z is solved jointly with γ, because raising γ alone
changes output at fixed inputs (+6.06% at the baseline's K/L); the solved values are
`Z = 0.972062` (Automation + productivity) and `0.942834` (Automation only). Their level
below 1 reflects the units of K/L and has no economic meaning.

Every scenario shares the baseline's initial assets and debt and its government
spending share `alpha_G`; the switch to debt targeting is moved to `tG1 = 10` (2036),
past the reported window; and `g_y_annual = 0.010`, the OBR's productivity growth. A
second run holds government spending and transfers at baseline levels instead
(`--baseline-spending`), the OBR's convention.

**Results, 2030, against the no-AI baseline:** GDP +4.9% (Automation + productivity)
and +1.4% (Automation only), driven by investment; the labour share falls 3.9pp in
both; wages are lower in both. Full results, caveats and the comparison with Korinek et
al. and the OBR are in the dashboard.

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

```bash
export HUGGING_FACE_TOKEN=...
python -m uk_growth_with_ai run --baseline-only --out results/baseline.json   # ~7 min
python -m uk_growth_with_ai check --results results/baseline.json
python -m uk_growth_with_ai run --out results/scenarios.json                   # ~20 min
python -m uk_growth_with_ai check --results results/scenarios.json
python -m uk_growth_with_ai run --baseline-spending --out results/scenarios_fixed_spending.json
cp results/scenarios.json uk_growth_with_ai/data/scenarios.json
cp results/scenarios_fixed_spending.json uk_growth_with_ai/data/scenarios_fixed_spending.json
python -m uk_growth_with_ai dashboard
python -m pytest
```

Each scenario takes about 7 minutes on a laptop; keep the machine awake
(`caffeinate -i` on macOS), since run times are wall-clock.

## Commands

```bash
python -m uk_growth_with_ai run [--only anthropic|obr] [--shapes ramp|step|both]
                                [--baseline-only] [--baseline-spending]
                                [--tG1 N] [--g-y-annual X] [--out PATH]
python -m uk_growth_with_ai check [--results PATH]
python -m uk_growth_with_ai report [--arm anthropic_ramp|obr_ramp]
python -m uk_growth_with_ai obr
python -m uk_growth_with_ai dashboard [--check]
```

* `run` solves the steady state and transition path for the baseline and the shocked
  scenarios and writes `./results/scenarios.json` (never the committed file unless
  `--out` points there). `--baseline-only` stops after the baseline and the Z solve.
  `--baseline-spending` holds government spending and transfers at baseline levels.
  `--tG1` and `--g-y-annual` default to 10 and 0.010.
* `check` runs the validation checks in issue #9 on a results file: no fiscal-rule break
  in 2030, a common spending share, potential output against the OBR, the Z targets,
  the labour share and solution quality (including the 2026 resource-constraint error).
* `report` prints the year-by-year gaps, GDP growth, the labour share and, for
  `anthropic_ramp`, the comparison with Korinek et al. Table 3.
* `obr` compares the no-AI baseline with the OBR's March 2026 EFO: GDP growth
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
  calibrate.py       γ for a labour-share fall, the γ-only gain, the Z solvers
  solve.py           the OG-UK runner (lazy ogcore/oguk import, SS, TPI, diagnostics)
  checks.py          validation checks on a results file
  report.py          result tables and the re-trending
  obr.py             the OBR baseline comparison and the published OBR figures
  dashboard_data.py  builds the dashboard's data files from the results
  data_access.py     data loading
  cli.py             run | check | report | obr | dashboard
  data/              scenarios.json, scenarios_fixed_spending.json, og_uk_params.json,
                     obr_history.json (OBR/ONS chart series, with provenance),
                     anthropic_us_2030.json
patches/             ogcore-0.17.0-firm-gamma-tv.diff
tests/               pytest over the functions and the committed numbers
analysis/            the original scripts these modules were refactored from
docs/                modelling notes, the OBR comparison write-up, the patch design
dashboard/           the Next.js front end
```

## Tests

```bash
python -m pytest
```
