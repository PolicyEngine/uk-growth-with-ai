# Corrective reruns R1–R4

Tracker #27, step 9. The decision is Vahid's (11 Nov 2026): run R1+R2+R3+R4 once, together, and leave R5 out. Issues: #32 (debt path), #15 (2026 and 2028 residuals), #16 (capital closure), #8 (`share_shift` GDP).

All results come from the package. `python -m uk_growth_with_ai rerun` runs one solve per process, and `analysis/rerun/driver.sh` runs them in sequence. It skips any solve whose output exists and pushes each output as it lands. Every solve's full record (settings, demographics, diagnostics and the 2026–2035 series) is in `analysis/rerun/output/<closure>/<label>.json`. `rerun assemble` builds the results files:

| file | closure | role |
|---|---|---|
| `uk_growth_with_ai/data/scenarios.json` | `zeta_K = 0.1` | primary: the central closure (#16, #27), and the dashboard data source |
| `uk_growth_with_ai/data/scenarios_zk0.json` | `zeta_K = 0` | closed-capital bound, shown alongside |
| `uk_growth_with_ai/data/legacy/scenarios_2026-11-11.json` | `zeta_K = 0.1`, before R1–R4 | the previous committed run, unchanged |
| `uk_growth_with_ai/data/legacy/scenarios_fixed_spending_2026-11-11.json` | the same, spending held at baseline levels | not re-run (see "Not done") |

Tables are printed by `python3 analysis/rerun/summarise.py`. Per-arm sanity output is printed by `python3 analysis/rerun/sanity.py <closure> <label>`.

## What changed and why

**Held fixed and stated in every file.** `zeta_D = 0.4` and a 2% world rate (`world_int_rate_annual`). Also unchanged: `epsilon = 1`, `tG1 = 10`, `g_y_annual = 0.010`, the common-G/Y fiscal rule (#2), the 2026→2030 linear ramp, and the vendored-g_n guard (`GNDriftError`). The guard stays active and passed on every solve; the demographics came from the GitHub fallback, as before.

**R2: demographics (#15).** `uk_growth_with_ai/demography.py` patches the specifications in-process, before the solve. No OG-UK or OG-Core file is edited.

- **Pre-TP inputs.** `g_n_preTP`, `rho_preTP` and `imm_rates_preTP` are taken from the same UK `get_pop_objs` fetch as `omega` (the #30 test, now applied to every arm).
- **The 2027→28 data splice.** `ogcore.demographics.get_pop_objs` (0.17.0, the loop that projects from `final_data_year`) builds the first projected population, 2027→2028, from the final data year's rates (2028). The 2027 rows of `rho` and `imm_rates` kept the 2027 data rates, so that one transition broke the law of motion by up to 0.25%. The fix gives the 2027 rows the rates that generated the step. Neither `omega` nor `g_n` changes, so the g_n guard is unaffected. The largest change is 0.0013 in a mortality rate and 0.0019 in an immigration rate.
- **The check.** `apply_splice` refuses to run unless that transition is the broken one, and fails unless the fix closes it.
- **The result.** The population law of motion now holds to 4e-16 in every transition. Both residuals disappear in every solve, which confirms the splice as the cause of the 2028 residual (#15).

**R3: closure (#16).** `zeta_K` is set explicitly per run: 0.1 is central and 0 is the bound. The order was closure, then R1 per closure, then R4, as the #30 notes asked, because the steady-state primary balance moves with the closure. The zk0.1 gate also checks `docs/closure_choice.md`'s condition that the calibrated baseline pays 1–2% of GDP abroad. It pays 1.40%, 1.44%, 1.47%, 1.51% and 1.55% in 2026–30, which passes.

**R1: debt path (#32).**
- **Target.** Baseline debt/GDP in 2030 equals the OBR's March 2026 EFO figure (95.05%, `obr_history.json`), from the model's common 95.0% start. It is reached by secant within 0.1pp, in two passes per closure.
- **Instrument: the baseline's pre-`tG1` G/Y.** The window share is the steady-state share plus a shift. The arms inherit it, so G/Y stays common across arms.
- **Cause, now tested.** `alpha_G` was the steady-state G/Y, which stabilises debt for the steady-state economy. That economy has r_gov ≈ 2.4% and growth ≈ 1.06% (`g_n_ss` = 0.0005), with tax/GDP 41.2%. In 2026–30, r_gov is 3.2%, growth is about 1.6% and tax/GDP is 42.2%. The same share therefore left a 2.3–2.6% primary surplus against the ~1.4% that holds debt flat.
- **Why G/Y and not tG1 or tax, as the evidence stands.**
  - G enters no household's budget or utility in OG-Core. Moving it changes the debt path, and through D_d the crowding out of private capital, but no marginal decision the arms are studying.
  - A tax route would change effective and marginal rates. That moves the labour and saving responses that make up the scenario gaps, and would need the estimated tax functions rescaled period by period.
  - A transfer route (`alpha_T`) adds lump-sum income effects to labour supply.
  - Bringing in the debt rule earlier (`tG1`) would make G differ across arms inside the reporting window, which is the defect #3 removed.
  - The cost is that G/Y moves further from the data: 29.9% (zk0.1) and 30.2% (zk0) against the OBR's 21.5%. Tax/GDP stays at 42.2% against 37.0%. The model's level ratios were already off and remain so; the dashboard's levels caveat covers this.
- **What is matched.** The model is real, so flat debt needs a surplus of (r_gov − g)·D/Y. The calibrated surplus is 1.65% → 1.51% of GDP (zk0.1) and 2.01% → 1.89% (zk0). The OBR's nominal primary balance is not in the repository and was not fetched. The debt path is matched; the primary balance is matched only in that sense.
- **After 2030.** The window share runs to 2035, and the debt rule starts in 2036. Baseline debt/GDP rises to 96.5% (zk0.1) and 96.3% (zk0) by 2035. This is outside the reporting window and is disclosed here.

**R4: `share_shift` GDP (#8).**
- **Target.** Z is solved by secant so that the 2030 equilibrium GDP gap is zero, within 0.01pp. This is #8 option (b), "the TPI path of Y matches baseline in 2030", and 2030 is the scenarios' horizon. Only 2030 is targeted; the other years are reported, not targeted.
- **The fixed-input arm is kept.** The arm with the fixed-input Z (zero technology wedge at baseline 2026 inputs) is solved too, as `share_shift_ramp_zfixed`. It is the first secant point and the like-for-like comparison with the old definition. The results file records it as `assumptions.Z_share_shift_fixed_input`.
- **`share_shift_tfp`.** Z is re-solved per closure against that closure's own baseline 2026 K and L (+3.1% at fixed inputs), as before.

## Results

The tables below are the output of `analysis/rerun/summarise.py`. "Old" is the #30 solve of the same arm and closure: stock demographics, no debt calibration, and the fixed-input Z. At `zeta_K = 0.1` those solves equal the legacy committed file bit for bit. Gaps are against each closure's own new baseline. GNI = Y − r_p·(K_f + D_f).


### zeta_K = 0.1

**Baseline, old (#30, stock demographics, no debt calibration) against new**

| | 2026 | 2027 | 2028 | 2029 | 2030 |
|---|---|---|---|---|---|
| debt/GDP old | 95.00 | 93.71 | 92.62 | 91.55 | 90.56 |
| debt/GDP new | 95.00 | 94.88 | 94.86 | 94.89 | 95.00 |
| debt/GDP OBR | 94.81 | 95.74 | 96.28 | 96.07 | 95.05 |
| primary balance new, % GDP | +1.65 | +1.64 | +1.58 | +1.54 | +1.51 |
| RC/GDP old, % | -0.9495 | +0.0000 | -0.0894 | +0.0000 | +0.0000 |
| RC/GDP new, % | +0.0001 | +0.0001 | +0.0001 | +0.0000 | +0.0000 |
| r old, % | 5.20 | 5.21 | 5.23 | 5.25 | 5.26 |
| r new, % | 5.21 | 5.25 | 5.28 | 5.31 | 5.33 |
| GDP growth new, % | – | 1.61 | 1.54 | 1.58 | 1.57 |

alpha_G: steady state 0.2889, window 0.2987 (shift +0.0097). Passes: baseline_p0 +0.01123 → 95.653%; baseline_p1 +0.00973 → 94.998%

**2030 gaps against the closure's own baseline**

| run | GDP | GNI | K | L | wage | C | I | Δr (bp) | foreign share of extra K | debt/GDP (pp) |
|---|---|---|---|---|---|---|---|---|---|---|
| `share_shift_tfp_ramp` old (#30) | +4.92% | +3.87% | +6.06% | -0.83% | -0.55% | +0.32% | +13.1% | +108 | +78.5% | -3.00 |
| `share_shift_tfp_ramp` new | +4.90% | +3.82% | +6.10% | -0.83% | -0.57% | +0.31% | +13.3% | +108 | +78.8% | -3.08 |
| `share_shift_ramp` old (#30) | +1.42% | +0.59% | +5.02% | -0.76% | -3.94% | -1.29% | +6.9% | +80 | +73.5% | +0.68 |
| `share_shift_ramp` new, fixed-input Z | +1.40% | +0.55% | +5.06% | -0.76% | -3.96% | -1.30% | +6.9% | +80 | +73.7% | +0.71 |
| `share_shift_ramp` new, R4 Z | -0.00% | -0.76% | +4.65% | -0.73% | -5.31% | -1.94% | +4.4% | +68 | +71.0% | +2.29 |

R4 iterations: share_shift_ramp_zfixed Z 0.942883 → 2030 GDP gap +1.3959%; share_shift_ramp_r4_1 Z 0.929813 → 2030 GDP gap -0.1600%; share_shift_ramp_r4_2 Z 0.931148 → 2030 GDP gap -0.0013%

Z: share_shift_tfp 0.972112; share_shift fixed-input 0.942883, R4 0.931148

**`share_shift_tfp_ramp` new, year by year**

| year | GDP | GNI | K | L | wage | C | I | Δr (bp) | foreign share of extra K | debt/GDP (pp) |
|---|---|---|---|---|---|---|---|---|---|---|
| 2026 | +0.19% | +0.19% | +0.05% | +0.27% | -0.08% | -0.53% | +17.2% | +2 | +100.0% | -0.18 |
| 2027 | +1.25% | +1.02% | +1.26% | +0.04% | -0.31% | -0.47% | +21.3% | +30 | +88.9% | -1.20 |
| 2028 | +2.38% | +1.90% | +2.68% | -0.22% | -0.47% | -0.30% | +25.5% | +57 | +84.5% | -2.02 |
| 2029 | +3.60% | +2.84% | +4.30% | -0.51% | -0.55% | -0.04% | +29.6% | +83 | +81.2% | -2.64 |
| 2030 | +4.90% | +3.82% | +6.10% | -0.83% | -0.57% | +0.31% | +13.3% | +108 | +78.8% | -3.08 |

2031–35 GDP gap: +5.00%, +5.09%, +5.16%, +5.22%, +5.27%

**`share_shift_ramp` new, year by year**

| year | GDP | GNI | K | L | wage | C | I | Δr (bp) | foreign share of extra K | debt/GDP (pp) |
|---|---|---|---|---|---|---|---|---|---|---|
| 2026 | +0.74% | +0.71% | +0.18% | +1.04% | -0.30% | -1.68% | +17.7% | +6 | +100.0% | -0.70 |
| 2027 | +0.65% | +0.46% | +1.41% | +0.65% | -1.50% | -1.79% | +17.9% | +22 | +63.3% | -0.38 |
| 2028 | +0.50% | +0.15% | +2.58% | +0.22% | -2.73% | -1.88% | +17.9% | +37 | +64.0% | +0.21 |
| 2029 | +0.29% | -0.26% | +3.67% | -0.23% | -4.00% | -1.94% | +17.5% | +53 | +66.9% | +1.10 |
| 2030 | -0.00% | -0.76% | +4.65% | -0.73% | -5.31% | -1.94% | +4.4% | +68 | +71.0% | +2.29 |

2031–35 GDP gap: -0.05%, -0.10%, -0.17%, -0.25%, -0.34%

### zeta_K = 0.0

**Baseline, old (#30, stock demographics, no debt calibration) against new**

| | 2026 | 2027 | 2028 | 2029 | 2030 |
|---|---|---|---|---|---|
| debt/GDP old | 95.00 | 93.61 | 92.44 | 91.27 | 90.16 |
| debt/GDP new | 95.00 | 94.89 | 94.87 | 94.89 | 94.98 |
| debt/GDP OBR | 94.81 | 95.74 | 96.28 | 96.07 | 95.05 |
| primary balance new, % GDP | +2.01 | +2.01 | +1.95 | +1.92 | +1.89 |
| RC/GDP old, % | -0.9865 | +0.0000 | -0.0930 | +0.0000 | +0.0001 |
| RC/GDP new, % | +0.0001 | +0.0001 | +0.0001 | +0.0001 | +0.0001 |
| r old, % | 5.58 | 5.58 | 5.60 | 5.61 | 5.62 |
| r new, % | 5.59 | 5.63 | 5.66 | 5.68 | 5.70 |
| GDP growth new, % | – | 1.59 | 1.54 | 1.58 | 1.57 |

alpha_G: steady state 0.2915, window 0.3019 (shift +0.0104). Passes: baseline_p0 +0.01223 → 95.767%; baseline_p1 +0.01044 → 94.978%

**2030 gaps against the closure's own baseline**

| run | GDP | GNI | K | L | wage | C | I | Δr (bp) | foreign share of extra K | debt/GDP (pp) |
|---|---|---|---|---|---|---|---|---|---|---|
| `share_shift_tfp_ramp` old (#30) | +3.14% | +3.01% | +1.99% | -1.15% | -1.92% | -0.07% | +12.4% | +139 | +0.0% | -1.65 |
| `share_shift_tfp_ramp` new | +3.10% | +2.94% | +2.00% | -1.16% | -1.95% | -0.08% | +12.7% | +140 | +0.0% | -1.64 |
| `share_shift_ramp` old (#30) | +0.09% | -0.04% | +1.90% | -1.01% | -4.95% | -1.58% | +5.8% | +103 | +0.0% | +1.75 |
| `share_shift_ramp` new, fixed-input Z | +0.05% | -0.10% | +1.92% | -1.02% | -4.98% | -1.59% | +5.9% | +103 | +0.0% | +1.85 |
| `share_shift_ramp` new, R4 Z | +0.00% | -0.15% | +1.92% | -1.01% | -5.04% | -1.61% | +5.8% | +103 | +0.0% | +1.91 |

R4 iterations: share_shift_ramp_zfixed Z 0.944829 → 2030 GDP gap +0.0534%; share_shift_ramp_r4_1 Z 0.944324 → 2030 GDP gap +0.0010%

Z: share_shift_tfp 0.974118; share_shift fixed-input 0.944829, R4 0.944324

**`share_shift_tfp_ramp` new, year by year**

| year | GDP | GNI | K | L | wage | C | I | Δr (bp) | foreign share of extra K | debt/GDP (pp) |
|---|---|---|---|---|---|---|---|---|---|---|
| 2026 | +0.34% | +0.34% | +0.00% | +0.52% | -0.18% | -0.97% | +4.0% | +4 | +nan% | -0.32 |
| 2027 | +0.98% | +0.95% | +0.28% | +0.18% | -0.71% | -0.92% | +6.6% | +39 | +0.0% | -0.92 |
| 2028 | +1.66% | +1.59% | +0.73% | -0.22% | -1.17% | -0.75% | +8.9% | +74 | +0.0% | -1.32 |
| 2029 | +2.37% | +2.26% | +1.31% | -0.66% | -1.59% | -0.47% | +10.9% | +107 | +0.0% | -1.56 |
| 2030 | +3.10% | +2.94% | +2.00% | -1.16% | -1.95% | -0.08% | +12.7% | +140 | +0.0% | -1.64 |

2031–35 GDP gap: +3.32%, +3.52%, +3.69%, +3.84%, +3.97%

**`share_shift_ramp` new, year by year**

| year | GDP | GNI | K | L | wage | C | I | Δr (bp) | foreign share of extra K | debt/GDP (pp) |
|---|---|---|---|---|---|---|---|---|---|---|
| 2026 | +0.66% | +0.66% | +0.00% | +1.02% | -0.35% | -1.71% | +7.7% | +7 | +nan% | -0.62 |
| 2027 | +0.58% | +0.55% | +0.55% | +0.58% | -1.50% | -1.78% | +7.9% | +32 | +0.0% | -0.35 |
| 2028 | +0.45% | +0.38% | +1.06% | +0.10% | -2.66% | -1.79% | +7.6% | +56 | +0.0% | +0.15 |
| 2029 | +0.26% | +0.16% | +1.53% | -0.43% | -3.84% | -1.74% | +6.9% | +79 | +0.0% | +0.90 |
| 2030 | +0.00% | -0.15% | +1.92% | -1.01% | -5.04% | -1.61% | +5.8% | +103 | +0.0% | +1.91 |

2031–35 GDP gap: +0.06%, +0.10%, +0.13%, +0.14%, +0.13%

## Reading the changes

**`share_shift_tfp` barely moves at either closure.**
- At 0.1, GDP is +4.90% (was +4.92%) and GNI +3.82% (was +3.87%). K is +6.10%, the wage −0.57% and r +108bp, and 78.8% of the extra capital is foreign-owned.
- At 0 it is GDP +3.10% and GNI +2.94%.
- The demographics fix and the higher-debt baseline change these 2030 gaps by 0.05pp or less. That settles #15's open question: the published gaps survive the residual fix.
- **Except 2026 investment.** The 2026 investment gap was the number #15 expected to move, and it does: +16.1% → +17.2% at 0.1, +3.7% → +4.0% at 0.

**`share_shift` changes meaning under R4.** Holding 2030 GDP at baseline takes a Z 1.2% lower than the fixed-input one at 0.1: 0.931148 against 0.942883. At fixed inputs the arm then has a technology loss of 1.24%. At 0 the change is 0.05%: 0.944324 against 0.944829, because without the inflow the arm was already +0.05%.
- **At 0.1 with GDP held flat.** GNI is −0.76% in 2030 and wages −5.31%. Consumption is −1.94% and debt/GDP +2.29pp. Capital is still +4.65% (71.0% foreign-owned) and labour −0.73%.
- **The same sign as the OBR's fiscal effect.** Debt/GDP is now higher, like the OBR's ¶6.18 figure (+1.3% of GDP), and larger. It is still not a like-for-like comparison: the model has no unemployment, and the OBR holds spending plans fixed rather than G/Y.
- **Outside the targeted year.** The GDP gap is +0.74% in 2026, the announcement year (labour +1.04%). It falls to 0 by 2030 and to −0.34% by 2035.
- **At 0.** The 2030 GDP gap is zero by construction, and GNI is −0.15%. GDP is +0.66% in 2026 (the announcement year), and between +0.06% and +0.14% in 2031–35.

**The baseline.** The level path is now on the OBR's debt path, and the residuals are gone.
- **Investment.** I/Y now runs smoothly at 19.1% → 19.3%, against the old 20.3% → 19.6% jump between 2026 and 2027.
- **GDP growth.** Growth in 2027–30 averages 1.57% (1.68% before), against the OBR's 1.6%.
- **Crowding out.** By 2030 the new baseline has K 0.75% lower and r 5bp higher than the #30 pre-TP baseline (zk0.1). That difference is the higher debt path alone, since the demographics are the same. At zk0, against the #30 stock-demographics baseline, it is K −1.18% and r +9bp. That figure combines the debt path and the demographics fix, with no foreign capital to offset either.

## Sanity checks

**Done before any arm ran** (`analysis/rerun/output/<closure>/GATE_baseline.json`, which holds the full report):
- **Debt/GDP.** 95.00, 94.88, 94.86, 94.89, 95.00 (zk0.1); 95.00, 94.89, 94.87, 94.89, 94.98 (zk0). The OBR's path is 94.8, 95.7, 96.3, 96.1, 95.1.
- **Residuals.** RC/GDP is +0.00007% in 2026 and +0.00006% / +0.00007% in 2028. They were −0.95% / −0.99% and −0.089% / −0.093%. The largest interior residual is 0.0002% of GDP.
- **Growth.** 1.61, 1.54, 1.58, 1.57 (zk0.1). The OBR's mean is 1.6.
- **Demographics.** The law of motion holds to 4.3e-16 everywhere.
- **Convergence.** TPI converged in 9 iterations (3.5e-5 and 5.7e-5), with Euler errors ≤ 5.8e-12.

**Done after every arm** (`analysis/rerun/sanity.py`), all passing:
- **Identities.** K = K_d + K_f, K_d = B − D_d and D = D_d + D_f hold to 1e-16. At zk0, K_f is exactly 0.
- **Residuals.** RC/GDP is ≤ 0.0001% in 2026–30, and the interior max is ≤ 0.0008%.
- **Convergence.** TPI converged in 8–9 iterations with final distances of 5.7e-5 to 7.6e-5.
- **GNI.** GNI ≤ GDP in every period of every arm, since foreigners hold gilts even at zk0. Payments abroad in 2030 are 2.56% (`share_shift_tfp`) and 2.30% (`share_shift`) of GDP at 0.1, against 1.55% in the baseline.
- **Signs.** Every 2030 sign (GDP, K, L, wage, C, I, r) matches the #30 solve of the same arm and closure. The one exception is `share_shift` GDP under R4, which is zero by construction.
- **First principles.**
  - More closed means less capital and a larger rise in r: K +2.00% / +6.10% and +140 / +108bp (`share_shift_tfp`).
  - The 2026 capital gap is exactly 0 at zk0.
  - A lower Z in R4 lowers K, r, wages and consumption against the fixed-input arm.
- **`check`.** ALL CHECKS PASSED on both files. There are 2 WARNs at zk0.1: Y − C − I − G swings +3.77pp and +2.35pp of GDP in 2029→30. That is the foreign inflow stopping when γ stops rising (audit anomaly H). R5, a smooth ramp, would spread it out and was not run.

## Exports

**Per arm, in the results files and the per-solve records.**
- **Levels.** B, K, K_d, K_f, D, D_d, D_f, r, r_p, r_gov, Y, C, I, I_total, L, w, G, TR, I_g, pensions, total tax revenue and GNI. The first five years are at the top level; 2026–2035 are under `series`.
- **Diagnostics.** The signed RC/GDP for every period (`diagnostics.rc_rel_Y_signed`) and the TPI distance history.
- **Demographics.** Hashes of omega, omega_SS, omega_S_preTP, g_n, rho, imm_rates, rho_preTP and imm_rates_preTP, plus the law-of-motion residual before and after the fixes, and the closure dict.
- **A correction.** The first records were written with the closure dict overwritten by its label (fixed in `2529d3e`). `assemble` rebuilds the dict from `CLOSURES` and OG-UK's `zeta_D` and world rate, which are never overridden, and marks it `rebuilt`.

**Cohort incidence, for the paper** (`analysis/rerun/cohorts/<closure>/<label>.npz`).
- **Contents.** Consumption, labour, assets (b_s and b_sp1), bequests and transfers by period (all 60), age (80) and lifetime-earnings type (7), plus the steady-state profiles.
- **Coverage and format.** One file each for the accepted baseline, both arms and the fixed-input `share_shift` arm, per closure. They are float32 and about 0.5MB each.
- **No re-solve.** They are read from the SS/TPI pickles every rerun solve left in its work directory.
- **Parameters.** `params.npz` holds the household parameters a consumption-equivalent welfare calculation needs. It needs one specifications build per closure and is queued behind the machine's heavy-job lock.

## Not done

- **The fixed-spending runs** (`--baseline-spending`) were not re-run. The legacy file stays, as `legacy/scenarios_fixed_spending_2026-11-11.json`, but it no longer shares a baseline with the primary file. The dashboard therefore no longer carries the fixed-spending comparison block (it renders without it). Re-running would take 2 solves per closure plus an R4 secant under that rule, and would need a decision.
- **R5** (smooth ramp) was not run, by decision.
- **Dashboard copy is unchanged.** The data files are regenerated from `scenarios.json`. Copy that describes the old numbers or the 2026 residual needs the separate copy pass.
- **The world rate and `zeta_D`** were not varied (#30 did not vary them either).
