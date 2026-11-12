# The 2028 surprise: one starting point, an unanticipated AI shock

Vahid asked for this on 12 Nov 2026. It replaces the perfect-foresight timing of the R1–R4 arms (`docs/rerun_r1_r4.md`).

- Every scenario equals the baseline exactly in 2026 and 2027.
- The AI path is announced at the start of 2028 and was not anticipated.
- Charts start at the single 2027 point. The reporting window is 2027–2031, and the headline year is 2031.

Status: code, tests and a dry run only. No solve has been run and no specification has been built. The solve plan is at the end.

```
python -m uk_growth_with_ai surprise prepare     --closure zk0.1 --work ~/ugai-rerun-work   # dry run, pickles only
python -m uk_growth_with_ai surprise check-specs --closure zk0.1 --work ~/ugai-rerun-work   # HEAVY: one spec build, no solve
python -m uk_growth_with_ai surprise step        --closure zk0.1 --stage continuation --work ~/ugai-rerun-work
python -m uk_growth_with_ai surprise gate        --closure zk0.1 [--approve --reference baseline|continuation --note TEXT]
python -m uk_growth_with_ai surprise step        --closure zk0.1 --stage arms    --work ~/ugai-rerun-work
python -m uk_growth_with_ai surprise step        --closure zk0.1 --stage arms_fs --work ~/ugai-rerun-work
python -m uk_growth_with_ai surprise assemble    --closure zk0.1 [--fixed-spending]
```

`--start 2028` is the default. Every date below is derived from it in `surprise.window`. Solves are written to `analysis/surprise/output/<closure>/`, apart from the R1–R4 solves.

## Why the old lines diverged in 2026

The R1–R4 arms solve a perfect-foresight transition from 2026. Households and firms know the whole γ and Z path at t = 0. The ramp's weight in 2026 is zero, so technology is still at baseline that year. Behaviour is not: it moves at once on news of the future.

At `zeta_K = 0.1`, the 2026 gaps are GDP +0.19% (`share_shift_tfp`) and +0.74% (`share_shift`), with investment +17%. These are anticipation effects. The new design removes them by making 2026 and 2027 history.

## Method

**Baselines.** The committed R1–R4 baselines are reused unchanged at both closures (`baseline_p1` in `analysis/rerun/output/<closure>/`, with its pickles in the work directory). They still start in 2026 with perfect foresight, and that is correct: the baseline contains no AI shock to anticipate.

**How OG-Core 0.17 sets a run's starting point.** `TPI.get_initial_SS_values`:

- Initial wealth is the baseline steady state's `b_sp1`, rescaled so aggregate wealth equals the steady-state B at the pre-period population: `initial_b = b_sp1_ss · B_ss / B0`.
- `n_preTP` is the steady-state labour.
- A reform run takes debt `D[0]` and public capital `K_g[0]` from the baseline TPI's period 0. A baseline takes them from `initial_debt_ratio · Y[0]`.
- Foreign-held debt is `initial_foreign_debt_ratio · D[0]` (`fiscal.D_G_path`).
- The bequests in period 0 come from `initial_b` with the pre-period population (`omega_S_preTP`, `rho_preTP`, `g_n_preTP`, `aggregates.get_BQ`).
- K is not a state. `aggregates.get_K_splits` sets `K_d = B − D_d` and `K_f = zeta_K ×` excess demand at the world rate, every period including period 0.

A reform run therefore always starts from the baseline's 2026 state. Nothing in OG-Core starts a run from a later period of an earlier path.

**Starting in 2028 without editing OG-Core or OG-UK.** This is `uk_growth_with_ai/surprise.py`, wired into `solve.run_arm(surprise=...)`, with k = 2028 − 2026 = 2.

1. Build the specification for 2026, as for the baseline. The tax functions, demographics, g_n guard and the R2 pre-period and splice fixes are all unchanged. A specification built at `start_year = 2028` would re-estimate the tax functions and refetch demographics, which breaks the link to the baseline, so it is not used.
2. Shift every time-indexed input forward by k periods and pad the end by repeating the last row. The tail rows are steady-state values, so the padding is exact (`shift_time_params`).
   - The list is OG-Core 0.17's own (`parameters.compute_default_params`): the `tp_param_list`s, the tax-function parameters, `e`, `chi_n`, `eta` and the arrays derived from them.
   - OG-UK's `omega`, `g_n`, `rho` and `imm_rates` are shifted too.
   - Any other attribute with a leading T or T+S dimension that varies over time stops the run (`ShiftError`).
   - The steady-state objects (`omega_SS`, `g_n_ss`) are checked to be unchanged, so the reform steady state is the same as before.
3. Set the pre-period objects to the baseline's 2027 rows (`omega`, `g_n`, `rho`, `imm_rates` at row 1, after the splice repair). The population law of motion is re-checked on the shifted specification and must hold to 1e-10.
4. Move `tG1` and `tG2` back by k, so the debt rule still starts in calendar 2036.
5. Set `initial_foreign_debt_ratio = D_f[2028] / D[2028]` from the baseline: 0.0995 at both closures, against 0.0904 in 2026.
6. Wrap `TPI.get_initial_SS_values` for the one solve (`surprise.initial_state`) so that:
   - `initial_b` is the baseline's `b_sp1` of 2027, the wealth each cohort carries into 2028, and `b_sinit` and `b_splus1init` are rebuilt from it;
   - `D[0]` and `K_g[0]` are the baseline's 2028 values;
   - the baseline paths that a reform run reads (Y for remittances, and G, TR and I_g under fixed spending) are shifted by k.
   
   B0 must equal the baseline's B[2028] to 1e-8, and the inherited bequests must equal the baseline's BQ[2028] to 1e-3, or the run stops (`state_check`). The check runs right after the shift, before SS, and again inside TPI. The bequest tolerance is looser because the pickle's BQ is the last outer iteration's.
7. The γ and Z ramp keeps the old shape, one year later (`ramp_weights`). Offset 0 reproduces the old ramp bit for bit (tested).

   | year | 2026 | 2027 | 2028 | 2029 | 2030 | 2031+ |
   |---|---|---|---|---|---|---|
   | old weight (2026 start, foreseen) | 0 | 0.25 | 0.5 | 0.75 | 1 | 1 |
   | new weight (2028 surprise) | baseline | 0 (baseline) | 0.25 | 0.5 | 0.75 | 1 |

8. After the solve, the run's own 2028 B, D, D_f, D_d and K_d must equal the baseline's 2028 values to 1e-6, or the record is not written (`predetermined_check`). The calendar series is then the baseline for 2026–27 followed by the run from 2028 (`calendar_record`). The run's raw series is kept as `series_run`, and the series cover 2026–2036.

The splice refuses to run unless the check in step 8 passed. That makes "2026 and 2027 are identical to the baseline" a test of the restart, not just of the copying.

**The continuation gate.** Before any arm, one no-shock restart per closure (`--stage continuation`, with γ and Z at baseline) must pass three checks:
- it reproduces the baseline in 2028–2031 to within 0.1% on Y, K, L, C, r, w, D and B;
- its investment is within 0.1% of GDP of the baseline's. I is a difference of capital stocks, so solver noise in K is amplified in I measured against itself;
- its 2028 resource-constraint error is at most 1e-5 of GDP. The baselines have about 1e-6, and a wrong pre-period row shows up here, as it did in #15.

`surprise gate --approve --reference baseline|continuation` then records the gap reference in `GATE_continuation.json`. The arms will not start without it. The R4 secant and `assemble` both read the reference from that file, so the R4 target and the reported gaps use the same path. This is the only end-to-end test that the shift list and the initial state are complete.

Two things make it inexact. OG-UK's TPI tolerance is `mindist_TPI = 1e-4`. And T = 60 from 2028 lands on the steady state in 2088 rather than 2086.

**Calibration in the new timing.**
- Z for `share_shift_tfp` (+3.1% at fixed inputs), and the fixed-input Z for `share_shift`, are solved at the baseline's 2027 K and L. 2027 is the ramp's zero-weight year, as 2026 was before. See the decision list.
- R4 solves `share_shift`'s Z so its 2031 GDP gap is zero, within 0.01pp. The gap is read from the full calendar series, because the top-level arrays only cover 2027–2031.
- The first R4 step takes its slope from the committed 2026-start secant at the same closure. The fixed-spending variant takes its slope from the surprise common-G/Y secant.
- Old R4 points cannot leak into the new secant, because the solves live in a separate output directory (tested).

## What changes economically

- **No anticipation in 2026–27.** Every 2026 and 2027 gap is exactly zero. The old +0.19%/+0.74% GDP and +17% investment in 2026 disappear.
The points below are what the model's structure implies. No surprise solve has been run, so none of them is a result yet.

- **The 2028 gap is the announcement-year response plus the first quarter of the ramp.** At the start of 2028, households learn the whole path and re-plan from the wealth they hold. Labour supply and saving are expected to jump that year, and so is investment, because next year's capital target moves at once. γ and Z also take their first 25% step in 2028. So 2028 is not a pure news effect, unlike the old 2026 gap, where the weight was zero. Report it as the announcement-year response, including the first ramp step.
- **Capital moves on impact at `zeta_K = 0.1`.** Only B, D, D_f, D_d and K_d are predetermined. The foreign-owned capital K_f is reset each period to `zeta_K ×` excess demand. Part of 2028's K gap is therefore an instantaneous inflow of foreign capital, with no investment recorded in 2027. OG-Core treats period 0 this way in every run, including the old 2026-start arms (2026 K +0.05% at zk0.1). At `zeta_K = 0` K_f is zero and 2028's K gap is zero.
- **Investment still jumps, because OG-Core 0.17 has no adjustment costs.** `firm.adj_cost` (ogcore/firm.py, line 749) defines a quadratic cost Ψ = (ψ/2)(I/K − μ)²/(I/K), but nothing in OG-Core 0.17 calls it. The firm's first-order conditions and the resource constraint never include it.
  - Investment is whatever moves K to next period's target: I_t = e^{g_y}(1 + g_n,t+1)K_{t+1} − (1 − δ)K_t.
  - The announcement is therefore expected to produce a one-year spike in I in 2028, of the same nature as the old +17% in 2026. It is a feature of the model's frictionless capital, not a forecast of an investment boom.
  - Removing the spike needs adjustment costs in the firm problem, which means editing OG-Core. That is outside this change.
- **Smaller numbers by 2030, expected.** The ramp ends a year later, and the 2028–30 years get no head start from anticipation. So 2030 gaps should be smaller than the old 2030 headline. 2031 is the like-for-like year: the first year at full weight, as 2030 was before.

## Dry run (12 Nov 2026, pickles and JSON only)

`surprise prepare` reads each closure's `baseline_p1/TPI/TPI_vars.pkl` and writes `analysis/surprise/output/<closure>/baseline_ext.json`. That file holds the baseline series for 2026–2036 and the state handed over in 2028. Checks, both closures:

| check | zk0.1 | zk0 |
|---|---|---|
| pickle Y, K, L, C, D, B, r, w for 2026–35 equal the committed JSON (max relative difference) | 0 | 0 |
| wealth handed over: `b_s[2028]` equals `b_sp1[2027]` shifted one age (max absolute difference) | 0 | 0 |
| K_d = B − D_d in 2028 (relative) | 0 | 0 |
| D(2028), model units | 0.67803 | 0.66316 |
| foreign share of debt, 2028 | 0.09947 | 0.09945 |
| B(2028) | 2.34900 | 2.38648 |
| baseline debt/GDP 2031 / 2035 / 2036 | 95.17 / 96.48 / 96.94% | 95.12 / 96.25 / 96.66% |

The checks that need `omega` and the tax functions wait for the go, because a specification build costs about 15 GB. They are B0 and BQ0 against the baseline, the law of motion after the shift, and the shift list's completeness. `surprise check-specs` runs them on one build, which covers both closures: B0 and BQ0 depend only on the demographics and the handed-over wealth, and the closures differ only in `zeta_K`. It stops before SS. Every solve repeats them before its own SS. In CI they are tested on synthetic populations against copies of OG-Core's `get_B` and `get_BQ`.

Z at fixed inputs by anchor year:

| | 2026 (old) | 2027 (proposed) | 2028 |
|---|---|---|---|
| zk0.1 `share_shift_tfp` | 0.972112 | 0.972324 | 0.972487 |
| zk0.1 `share_shift` fixed-input | 0.942883 | 0.943089 | 0.943247 |
| zk0 `share_shift_tfp` | 0.974118 | 0.974320 | 0.974469 |
| zk0 `share_shift` fixed-input | 0.944829 | 0.945025 | 0.945169 |

The anchor moves Z by about 0.02%, which is small against the scenario sizes.

## Decisions to flag (not taken silently)

1. **Z anchor: the baseline's 2027 K and L (recommended, implemented).**
   - 2027 is the ramp's zero-weight year, the role 2026 had.
   - It is the last year both paths share, so "+3.1% at fixed inputs" is measured at inputs no scenario has touched.
   - 2028 inputs already contain the announcement's K_f inflow at zk0.1 if taken from the scenario. If taken from the baseline, they are a year the scenario does not share.
   - The numbers barely move (table above).
2. **R4 at 2031 (implemented, as asked).** It is the first full-weight year, the role 2030 had. Holding 2031 GDP leaves 2028–30 and 2032+ free. Under the old design, the 2031–35 GDP gap of the R4 arm drifted from −0.05% to −0.34% at zk0.1, and something similar is expected after 2031.
3. **Gap reference: the committed baseline or the continuation.** It is fixed once, at the continuation gate, and used by both R4 and `assemble`. "baseline" leaves the restart's solver error, at most the gate tolerance, in the 2028+ gaps. "continuation" removes that error. 2026–27 are the baseline's exactly under either choice. Choose after the continuation solve reports its error.
4. **Debt horizon.** The debt rule starts in 2036 (`tG1 = 10` from 2026). The surprise exports run to 2036, and the baseline's 2036 comes from its pickle (above), so the debt gap can be quoted for 2031 together with 2036. The old JSON series stopped at 2035.
5. **Fixed-spending variants.** The fixed-spending staging (`arms_fs`, `_fs` labels) for the 2026-start runs is in PR #36, which is not merged, so it is not on `origin/main`. This branch implements its own `arms_fs` stage with the same label convention, in `analysis/surprise/output`. It does not depend on #36.
6. **Downstream readers.** `check`, `report`, `dashboard_data` and the dashboard still assume the 2026–2030 window, with the headline at index 4. In each surprise solve record, `g_n_used`, `diagnostics.rc_first5`, `diagnostics.rc_rel_Y_signed` and `series_run` are indexed from the run's period 0 (2028, in `run_period0_year`), not from a calendar year. The surprise results files (`uk_growth_with_ai/data/scenarios_surprise2028*.json`) carry `years: [2027..2031]` and `window`. Pointing the readers at them is a follow-up after the solves, once the numbers exist.

## Solve plan (step 2: needs the go and the heavy-job lock)

Each solve builds the OG-UK specification and then runs SS and TPI. The committed solves took 6.7–7.8 minutes each (`elapsed_min`), so allow about 8 minutes of wall time per solve. Run one at a time.

First, `surprise check-specs`: one specification build, about 7 minutes and about 15 GB, with no SS or TPI. It covers both closures. If it fails, stop and fix the shift.

| per closure | solves |
|---|---|
| continuation (gate) | 1 |
| `share_shift_tfp_ramp`, `share_shift_ramp_zfixed`, R4 1–2 | 3–4 |
| fixed spending: the same four with `_fs` | 3–4 |
| **total** | **7–9** |

That is 14–18 solves for both closures plus the spec check, about 2 h to 2 h 30 min. The 2026-start R4 needed 2 iterations at zk0.1 and 1 at zk0, for both the common and the fixed-spending arms. No baseline is re-solved. If a continuation fails its gate, stop there, after one solve per closure.
