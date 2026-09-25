# uk-growth-with-ai

OG-UK transition-path runs of two AI-growth scenarios for the UK, against a common
baseline, with the results committed so the tables and charts can be rebuilt without
re-running the model.

| scenario | shock | what pins Z down |
|---|---|---|
| `anthropic` | labour share −3.9pp | +3.1% measured TFP by 2030 (Korinek, Jones, Sacher, Cotter & McCrory 2026, Anthropic Institute WP 2026‑02, Table 3, "substantial") |
| `obr` | labour share −3.9pp | the GDP **level** unchanged (OBR March 2026 EFO Box 2.2, technological-displacement case) |

Each scenario is run twice, with `gamma` **stepped** and `gamma` **ramped** over
2026–2030, so the effect of the time-varying-gamma patch (`docs/firm_gamma_tv.patch`)
can be read straight off the results. All runs are **1-sector** (`multi_sector=False`)
with `epsilon = 1.0`, so the labour share is exactly `1 − gamma` and the labour-share
target is hit by construction rather than by calibration.

Two things worth knowing before reading the code:

* **Z is solved, not assumed.** Moving `gamma` from 0.35 to 0.389 alone already raises
  output by +5.9938% at baseline factor levels, so `Z` must be solved *jointly* with
  `gamma` against the scenario's technology target. Both solved values are below 1
  (`Z_anthropic = 0.9726980294575099`, `Z_obr = 0.9434510470004948`).
* **The counterfactual is common-start.** The baseline writes its steady state and every
  shocked arm inherits it (`baseline=False, baseline_dir=base_dir`), so initial assets and
  debt are shared and the arm-vs-baseline gap contains no starting-point difference.

## Install

```bash
pip install -e ".[test]"
```

`ogcore` and `oguk` are **not** dependencies. They are external (the ramp arms need
`docs/firm_gamma_tv.patch` applied to `ogcore/firm.py`) and are imported lazily inside
`uk_growth_with_ai/solve.py`, so `report` and `obr` work without them installed.

## Commands

```bash
python -m uk_growth_with_ai run [--only anthropic|obr] [--shapes step|ramp|both] [--out PATH]
python -m uk_growth_with_ai report [--arm anthropic_ramp|anthropic_step|obr_ramp|obr_step]
python -m uk_growth_with_ai obr
```

* `run` — solves SS and TPI for the baseline and the requested shocked arms and writes
  `./results/scenarios.json`. Needs `ogcore` + `oguk`; takes hours. Pass
  `--out uk_growth_with_ai/data/scenarios.json` to replace the committed results.
* `report` — the year-by-year gap table, GDP growth, the labour-share path and (for the
  `anthropic` arms) the comparison against Table 3.
* `obr` — the OG-UK baseline against the OBR's published March 2026 EFO baseline, with
  the component decomposition and the `g_y_annual` mis-sourcing note.

Both readers take `--results PATH` and `--oguk-dir PATH`; the latter re-reads `g_n` and
`g_y_annual` from a live OG-UK checkout instead of the copy vendored in
`data/og_uk_params.json`.

## Layout

```
uk_growth_with_ai/
  scenarios.py    Scenario dataclass + the ANTHROPIC / OBR definitions
  calibrate.py    gamma_for_labour_share_fall, gamma_only_gain, the Z solvers
  solve.py        the OG-UK runner (lazy ogcore/oguk import, SS, TPI, diagnostics)
  report.py       result tables from the committed JSON
  obr.py          the OBR baseline comparison + the published OBR constants
  data_access.py  data loading, incl. the vendored trend parameters
  cli.py          run | report | obr
  data/           scenarios.json, trajectories.json, og_uk_params.json
tests/            pytest over the pure functions and the committed numbers
analysis/         the original scripts these modules were refactored from
```

`dashboard/` is the Next.js front end that presents these results (it carries its own copy
of the derived chart data); it is not part of this package. `docs/` holds the modelling notes (`OG_UK_NOTES.md`), the OBR comparison
write-up (`OG_UK_OBR_COMPARISON.md`) and the time-varying-gamma patch.

## Tests

```bash
python -m pytest
```
