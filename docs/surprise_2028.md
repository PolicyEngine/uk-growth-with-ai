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

**The continuation gate (decided 12 Nov 2026).** Every gap is measured against a no-shock restart, not the committed baseline. Before any arm, one no-shock restart per closure (`--stage continuation`, with γ and Z at baseline) must reproduce the committed baseline over 2028–2036, through the debt rule's first year. The checks:

| what | tolerance, max over 2028–2036 |
|---|---|
| GDP (Y), relative | 1e-4 |
| capital (K), relative | 1e-4 |
| debt/GDP, relative | 1e-4 |
| L, C, r, w, D and B, relative | 1e-3 |
| investment: \|ΔI\| as a share of GDP | 1e-3 |
| 2028 resource-constraint error, share of GDP | 1e-5 |

Investment is measured as a share of GDP because it is a difference of capital stocks, so solver noise in K is amplified in I measured against itself. A wrong pre-period row shows up in the 2028 resource-constraint error, as it did in #15. The baselines have about 1e-6 there.

If the restart passes, `surprise gate --approve` writes `GATE_continuation.json` with `reference: continuation`; the driver does this itself. The arms will not start without that file. The R4 secant and `assemble` both read the reference from it, so the R4 target and the reported gaps are measured against the same path. If the restart fails, the driver stops and nothing else runs. This is the only end-to-end test that the shift list and the initial state are complete.

Two things make the restart inexact. OG-UK's TPI tolerance is `mindist_TPI = 1e-4`, the same order as the tight tolerances. And T = 60 from 2028 lands on the steady state in 2088 rather than 2086. So the 1e-4 gate could fail on a correct restart. If it does, the driver stops and the gate report goes to Vahid; the tolerance is not loosened silently.

**Calibration in the new timing.**
- Z for `share_shift_tfp` (+3.1% at fixed inputs), and the fixed-input Z for `share_shift`, are solved at the baseline's 2027 K and L. 2027 is the ramp's zero-weight year, as 2026 was before. See the decision list.
- R4 solves `share_shift`'s Z so its 2031 GDP gap is zero, within 0.01pp. The gap is read from the full calendar series, because the top-level arrays only cover 2027–2031.
- The first R4 step takes its slope from the committed 2026-start secant at the same closure. The fixed-spending variant takes its slope from the surprise common-G/Y secant.
- Old R4 points cannot leak into the new secant, because the solves live in a separate output directory (tested).

## The scenario grid

Decided by Vahid on 12 Nov 2026. The UK targets are in `analysis/surprise/uk_targets.json`, derived in `docs/uk_calibration.md` (from docs/literature-comparison at 43b2605). All are levels reached in 2031, the first full-weight year:

| id | labour-share fall | γ terminal | TFP gain at fixed inputs | role |
|---|---|---|---|---|
| `uk_low` | 0.7pp | 0.357 | +0.2% | UK low (BP9 J-curve; IMF task mapping) |
| `uk_central` | 1.6pp | 0.366 | +0.4% | UK central (IMF SIP/2026/072, year 4) |
| `uk_high` | 2.9pp | 0.379 | +1.6% | UK high (OBR FRS 2026 Box 4.1 upper end) |
| `korinek` | 3.9pp | 0.389 | +3.1% | upper scenario, labelled "Korinek US substantial" |

Each scenario has two arms:
- `<id>_share_shift_tfp`: the share shift plus the TFP gain, with Z at fixed inputs anchored at the baseline's 2027 K and L;
- `<id>_share_shift`: the share shift alone, with Z solved by R4 so that 2031 GDP equals the reference.

Labels are self-describing, for example `uk_central_share_shift_tfp_ramp_dn`. The grid checks each file's `gamma_terminal` against 0.35 + fall/100.

Results files are written per scenario: `scenarios_surprise2028_<id>[_debt_neutral|_fixed_spending][_zk0].json`. The schema is the same, with `assumptions.scenario` and `scenario_targets`.

## The debt-neutral variant (`_dn`)

Approved by Vahid on 12 Nov 2026 (#27, and the referee report on #24). The welfare headline uses these arms.

**Closure.** From 2028, transfers (TR) adjust every year so that debt/GDP follows the no-shock restart's path. G keeps its usual rule: `alpha_G · Y` before `tG1`, and the debt rule from `tG1`. Households therefore receive, or pay for, the shock's fiscal effect through transfers, instead of it showing up in debt.

The target covers 2029–2036. 2028 debt is predetermined. 2036 is `tG1`, the debt rule's first year: from then on G closes the budget towards the long-run debt ratio in every run, and TR returns to `alpha_T · Y`. Targeting debt with TR beyond `tG1` would give two instruments for one target. G's rule fixes next year's debt whatever TR is, so the TR fixed point would have no solution.

**How OG-Core 0.17 is made to do it.** OG-Core 0.17 has no closure for this:
- `budget_balance` sets TR to revenue minus spending, with no debt at all.
- `baseline_spending` fixes G and TR at the baseline's levels.
- The debt rule (`tG1`, `tG2`, `rho_G`, `debt_ratio_ss`) moves G, not TR.

TR is, however, one of the TPI outer-loop fixed-point variables. Each outer iteration computes `TR_new = fiscal.get_TR(...)`, and TR is damped or Anderson-accelerated towards it. `surprise.debt_neutral` replaces `get_TR` for that one TPI run; SS calls pass through unchanged.
- `TR_new_t` is the transfer that puts `D_{t+1}/Y_{t+1}` on the target. It uses `D_G_path`'s own law of motion, `growth_{t+1} D_{t+1} = (1 + r_gov,t) D_t + G_t + I_g,t + TR_t + UBI_t + pensions_t − revenue_t − aid_t`.
- The inputs are the iterate's Y, G, revenue and pensions, and r_gov at the target ratio.
- r is read from the `D_G_path` call made earlier in the same outer iteration.

At the fixed point, `D_G_path`'s debt is the target path. **No outer loop is added**, so each arm is one solve, as before. Convergence of the TPI with this TR map is not yet proven on the real model. If it fails to converge, it shows up as a failed solve, not as more solves.

**Checks.**
- Tests: the transfers put D/Y on the target exactly (1e-12) through a copy of OG-Core's debt recursion, with r_gov depending on D/Y. TR reverts to `alpha_T · Y` from `tG1`. G and SS are untouched, and the patch is restored afterwards.
- After each solve, `dn_check` requires D/Y within 1e-4 (relative) of the target in 2029–2036, or the arm is not used (R4, `assemble`, sanity).

**Arms.** `share_shift_tfp_ramp_dn`, and `share_shift_ramp_dn`, whose Z is solved by R4 under this closure (2031 GDP gap zero; points `share_shift_ramp_zfixed_dn`, `share_shift_ramp_dn_r4_n`). Both are run at both closures. `surprise assemble --debt-neutral` writes `scenarios_surprise2028_debt_neutral*.json`.

## Net national income

Every run now exports NNI = GNI − δ·K. δ = 0.065 is the model's per-period depreciation: OG-UK's `delta_annual` (ONS CAPSTK), and with S = 80 a model period is one year. Each record stores `p.delta`, and the splice refuses if it differs.

The baseline's NNI for 2026–36 is in `baseline_ext.json`: 81.3% of GDP in 2031 at zk0.1 and 82.9% at zk0, against GNI at 98.4% and 99.4%.

## The sanity gate after every solve

`analysis/surprise/sanity.py` runs automatically after each solve (`driver.sh`). On any failure it stops the run, pushes the record, log and report, and exits non-zero. Each failure needs an explanation before the run continues. The expectations were written and committed **before any surprise solve**, in `analysis/surprise/expectations.json`, from the 2026-start results.

| check | rule |
|---|---|
| identities, 2026–36 | K = K_d + K_f, K_d = B − D_d, D = D_d + D_f (1e-8 relative); GNI ≤ GDP where K_f > 0; NNI < GNI |
| resource constraint | \|RC/GDP\| ≤ 1e-5 in 2027 (baseline) and 2028–36 (run) |
| single point | every exported series equals the reference exactly in 2026 and 2027 |
| labour share on the ramp | with ε = 1 and one sector it is 1 − γ, so its gap must be −(the scenario's fall) × the ramp weight in 2028–31, within 0.02pp (for example −0.975, −1.95, −2.925, −3.9pp for Korinek) |
| size band | each 2031 gap within 30% of the 2026-start arm's 2030 gap, or within an absolute floor (0.25pp; I 1pp; r 10bp; debt/GDP 0.5pp); a flipped sign above the floor fails |
| 2028 jump | I and L gaps reported; flagged, not failed, if the I gap exceeds the old 2026 +17% |

Size bands apply **only to the Korinek arms**, the only scenario with a 2026-start counterpart. Signs, identities and the labour-share check apply to every scenario. Size bands compare 2031 with 2030, the first full-weight year in each design. The surprise arms have had three years of response (2028–30), where the 2026-start arms had four plus anticipation. So somewhat smaller K and Y gaps are expected, and 30% is the stated tolerance for that, not a fitted number. The continuation, the R4 iterations other than the accepted one, and the debt-neutral arms have no band, because they have no 2026-start counterpart.

**Red-flag diagnostics, reported for every solve and never failed** (`docs/red_flags_1_3.md`):
- the capital-supply elasticity (Korinek's rental-rate definition) and GDP per unit of TFP at 2031, 2036 and the steady state;
- the tax/GDP change by base and per point of share fall, against the OBR's 0.19–0.23;
- the receipts change as a share of GDP, against ¶6.18's −0.17%;
- effective labour and capital rates, against OBR FRS 46/27% and EFO 40/17%.

**Expected direction at 2031, for every scenario, written before the solves:**

| arm | expected |
|---|---|
| `share_shift_tfp` | GDP > 0, K > 0, r up, labour share down |
| `share_shift` (R4) | GDP ≈ 0 (within 0.01pp, by construction), wage < 0, labour share down, GNI ≤ 0 |
| `share_shift` fixed-input Z and R4 iterations | wage < 0, labour share down |
| zk0, any arm | K_f = 0; Δr larger than the same arm at zk0.1 |
| fixed spending | G equals the baseline's level, 2028–35 |
| debt-neutral | debt/GDP tracks the reference path within 1e-4, 2029–36 |

**Reference numbers (2026-start, 2030 gaps; the bands are built from these):**

| closure, arm | GDP | GNI | K | L | wage | C | I | Δr bp | debt/GDP pp |
|---|---|---|---|---|---|---|---|---|---|
| zk0.1 `share_shift_tfp` | +4.90 | +3.82 | +6.10 | −0.83 | −0.57 | +0.31 | +13.3 | +108 | −3.08 |
| zk0.1 `share_shift` R4 | 0.00 | −0.76 | +4.65 | −0.73 | −5.31 | −1.94 | +4.4 | +68 | +2.29 |
| zk0 `share_shift_tfp` | +3.10 | +2.94 | +2.00 | −1.16 | −1.95 | −0.08 | +12.7 | +140 | −1.64 |
| zk0 `share_shift` R4 | 0.00 | −0.15 | +1.92 | −1.01 | −5.04 | −1.61 | +5.8 | +103 | +1.91 |

The fixed-input and fixed-spending rows are in `expectations.json`. The fixed-spending ones come from PR #36 at 37bd0e2.

After each solve, the driver writes a summary table to the progress comment on #27. The table gives, per solve: minutes, sanity result, the 2028 I and L jump, and the 2031 GDP, K, wage, labour share, Δr, GNI and NNI gaps.

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

## Decisions (Vahid, 12 Nov 2026)

1. **Z anchor: the baseline's 2027 K and L.**
   - 2027 is the ramp's zero-weight year, the role 2026 had.
   - It is the last year every scenario shares with the baseline, so "+3.1% at fixed inputs" is measured at inputs no scenario has touched.
   - Z moves by about 0.02% against the 2026 anchor (table above).
2. **R4 holds `share_shift`'s 2031 GDP at its reference.** 2031 is the first full-weight year, the role 2030 had. The results file reports the GDP gap after the target year, 2032–2036, as `r4_post_target_gdp_gap_pct`, and the write-up quotes those numbers. Under the old design the R4 arm's gap drifted from −0.05% in 2031 to −0.34% in 2035 at zk0.1.
3. **Every gap is measured against the no-shock restart, which is gated** (above). 2026–27 are the committed baseline's values exactly.
4. **The 2028 gap is not a pure announcement effect.** It is the response to the announcement plus the first 25% step of the ramp. The old 2026 gap was pure anticipation, because its ramp weight was zero. Call 2028 the announcement-year response, including the first ramp step.
5. **Capital moves on impact in 2028 at `zeta_K = 0.1`.** Only wealth, debt, foreign-held debt and domestic capital carry over from 2027. Foreign-owned capital is reset every year by the `zeta_K` rule, so part of the 2028 capital gap is an instant inflow from abroad with no investment recorded in 2027. At `zeta_K = 0` this does not happen.
6. **Investment is expected to jump in 2028, because OG-Core 0.17 has no adjustment costs.** `adj_cost` is defined in `ogcore/firm.py` (line 749) and never called. Investment is whatever moves capital to next year's target, so the announcement gives a one-year spike, like the old +17% in 2026. It reflects the model's frictionless capital, not a forecast.
7. **Debt horizon.** The debt rule starts in 2036 (`tG1 = 10` from 2026). The exports run to 2036, and the baseline's 2036 comes from its pickle, so the debt gap is quoted for 2031 together with 2036.
8. **Fixed-spending variants.** The 2026-start fixed-spending staging is in PR #36, which is not merged. This branch has its own `arms_fs` stage with the same `_fs` labels, in `analysis/surprise/output`, and does not depend on #36.
9. **Downstream readers are a follow-up, done right after the results exist, on this branch if it is clean.** This includes NNI in the results files, `check`, the dashboard and the paper macros. `check`, `report`, `dashboard_data` and the dashboard still assume the 2026–2030 window with the headline at index 4. The surprise results files (`uk_growth_with_ai/data/scenarios_surprise2028*.json`) carry `years: [2027..2031]` and `window`. In each solve record, `g_n_used`, `diagnostics.rc_first5`, `diagnostics.rc_rel_Y_signed` and `series_run` are indexed from the run's period 0 (2028, in `run_period0_year`), not from a calendar year.

## Solve plan (step 2: needs the GO and the heavy-job lock)

```
PY=~/ogmodels/OG-UK/.venv/bin/python WORK=~/ugai-rerun-work analysis/surprise/run_locked.sh
```

`run_locked.sh` handles the lock and the deadline:
- It takes `/tmp/pe-heavy.lock` as a file containing `<pid> ugai-surprise-2028`, with noclobber. It adopts the lock only if it already carries that label.
- It never touches anyone else's lock, file or directory; it exits 2 instead.
- It releases the lock on exit, through a trap, only if the lock is still its own.
- `DEADLINE_AT` defaults to 19:25 local, because a drill rerun is booked from 20:00. No step starts unless it can finish 10 minutes (`SOLVE_BUDGET`) before then.

`driver.sh` runs the plan one step at a time. It commits each output by path and pushes after each one. A rerun skips everything already done, so a plan cut at the deadline stops at a solve boundary and resumes on the next call.

Default order: Vahid's priority of 12 Nov 2026. Each solve is about 8 minutes of wall time; the committed solves took 6.7–7.8 minutes. Allow about 1 more minute per solve for the sanity check and the push.

| # | step | solves |
|---|---|---|
| 1 | `check-specs`: one specification build, about 15 GB, no SS or TPI; both closures | 0 |
| 1 | restart (continuation) and gate, zk0.1 then zk0 | 2 |
| 2 | UK central at zk0.1, then zk0 | 6–8 |
| 3 | UK low and UK high at zk0.1 | 6–8 |
| 4 | Korinek (upper) at zk0.1, then zk0 | 6–8 |
| 5 | debt-neutral: UK central at both closures, then Korinek at both | 12–16 |
| 6 | UK low and UK high at zk0 | 6–8 |
| 7 | fixed spending: UK central at both closures, then Korinek at both | 12–16 |
| | **total** | **50–66** |

Each arm set is three or four solves: `_share_shift_tfp_ramp`, `_share_shift_ramp_zfixed`, and one or two R4 iterations.

The total is about 7 h 30 min to 9 h 50 min. The 16:20–19:25 window fits about 19–20 solves after check-specs, which reaches steps 1–3 and possibly the start of step 4. The rest resumes on later calls, in the same order.

The 2026-start R4 needed 2 iterations at zk0.1 and 1 at zk0, for both the common and the fixed-spending arms. The debt-neutral R4 starts from the surprise common-G/Y secant's slope. No baseline is re-solved.

## Cohort paths for the welfare results

`analysis/surprise/export_cohorts.py` writes `analysis/surprise/cohorts/<closure>/<label>.npz`. The default set, per closure:
- the continuation;
- the UK central arms under the common rule;
- the UK central arms under debt-neutral transfers.

In each case the arms are tfp, fixed-input Z and the accepted R4.

The arrays are `c`, `n`, `b_s`, `b_sp1`, `bq` and `tr`, by calendar period, age and type, with shape (60, 80, 7) and dtype float32. The first two periods, 2026–27, come from the baseline and the rest from the run. `ss_c`, `ss_n` and `ss_b_s` are the run's steady state.

**The handover is checked.** The run's 2028 starting wealth must equal the baseline's end-of-2027 wealth. It does exactly in every file exported so far.

**`params.npz` is not rebuilt.** It comes from PR #36's R1–R4 export at 37bd0e2, verified against the accepted baselines. Its omega, g_n, rho, imm_rates and pre-period demographic hashes all equal the baseline's recorded ones. It contains the household parameters plus the R2-corrected demographics on the calendar from 2026, the same object the solves ran on. So no specification build, and no lock, is needed for the export.

**When it runs.** It reads only the SS/TPI pickles under `$WORK/surprise2028/`, which are never deleted. The final export runs after the last debt-neutral UK central solve.
