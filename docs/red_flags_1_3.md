# Red flags 1 and 3: diagnosis from the existing solves

This responds to PR #37, `docs/literature_comparison.md` §5–6. Everything here comes from the committed 2026-start R1–R4 solves: the TPI and SS pickles in the work directory, `baseline_p1`, `share_shift_tfp_ramp` and the accepted R4 `share_shift_ramp`. Nothing was re-solved and nothing was tuned.

Both diagnostics are reported again for every surprise-2028 solve by `analysis/surprise/sanity.py` (the `diagnostics` block in each `<label>.sanity.json`). For the surprise runs they are measured at 2031, 2036 and the steady state.

## Red flag 1: the capital response is low

**Measure.** The capital-supply elasticity is Korinek et al.'s schedule (6): Δln K / Δln(rental rate), with rental rate γY/K. GDP per unit of TFP is the GDP gap divided by the 3.1% TFP gain. The table covers `share_shift_tfp`, 2026-start:

| horizon | zk0.1 elasticity | zk0.1 GDP/TFP | zk0 elasticity | zk0 GDP/TFP |
|---|---|---|---|---|
| 2030 (year 4, the old headline) | 0.63 | 1.58 | 0.17 | 1.00 |
| 2031 | 0.70 | 1.61 | 0.25 | 1.07 |
| 2036 | 1.00 | 1.71 | 0.58 | 1.32 |
| 2045 | 1.60 | 1.97 | 1.14 | 1.67 |
| 2085 | 1.98 | 2.12 | 1.54 | 1.89 |
| steady state | 1.72 | 2.17 | 1.33 | 1.95 |

The comparators are Korinek et al. (elasticities 1 to ∞, GDP/TFP 2.7) and the IMF UK model (GDP/TFP about 6 at years 5–10).

**Cause 1: mostly the horizon.** The elasticity roughly triples between year 4 and the steady state at zk0.1, and rises eightfold at zk0. Capital is a stock built from saving. At year 4 it has had four years to respond, while r has jumped at once (+108bp at zk0.1, +140bp at zk0), so the measured elasticity is low. Under the 2028 surprise, 2031 is year 3 of response with no anticipation, so the 2031 elasticity is expected to be lower than the 0.70 / 0.25 above.

**Cause 2: who finances the extra capital.** The table shares the extra capital, ΔK = ΔK_d + ΔK_f, where ΔK_d = ΔB − ΔD_d. It covers `share_shift_tfp`, zk0.1:

| | 2030 | 2036 | steady state |
|---|---|---|---|
| foreign capital, ΔK_f / ΔK | 79% | 55% | 29% |
| household wealth, ΔB / ΔK | 27% | 65% | 83% |
| less extra gilts held at home, −ΔD_d / ΔK | −5% | −20% | −12% |

At zk0 all of it is household-financed: ΔB/ΔK is 1.15 in 2030, because households also absorb extra gilts.
- The early response at zk0.1 is mostly the foreign inflow. That inflow is capped by `zeta_K = 0.1`: 10% of the excess demand at the 2% world rate.
- The household part grows only as life-cycle saving accumulates.
- So the short-run elasticity is set by the inflow rule and the speed of household accumulation, not by a long-run saving parameter.

**Cause 3: even the long run is at the bottom of Korinek's range.** Steady-state elasticities are 1.72 (zk0.1) and 1.33 (zk0). r stays 65bp and 75bp above baseline in the steady state, so households require a permanently higher return to hold the extra capital. That reflects OG-UK's finite-life household saving: σ = 1.5, β = 0.965, Frisch 0.35, with the partial `zeta_K` inflow. A perfectly elastic supply (Korinek ∞, or our r-pinned bound in `docs/results_sanity_audit.md`) would arbitrage the gap away.

The R4 `share_shift` arm shows the same pattern: 0.75 at 2030 and 1.15 in the steady state at zk0.1, and 0.22 and 0.98 at zk0.

**Conclusion.** The low year-4 response is mainly the horizon and the capped foreign inflow. The model's long-run capital supply is at the low end, about 1.3–1.7, but inside Korinek et al.'s range. None of this is a bug, and nothing is tuned to a target. The copy should say plainly that the headline-year capital response is less elastic than any case in Korinek et al. It should give the horizon profile above, and add that by the steady state the model is inside their range.

## Red flag 3: tax/GDP rises in `share_shift_tfp` at zk0

**Decomposition of the 2030 change in tax/GDP** (pp of GDP, `share_shift_tfp` against its closure's baseline, 2026-start):

| base | zk0.1 | zk0 |
|---|---|---|
| household income tax (labour and capital income, one function) | −0.49 | −0.18 |
| business (corporate) tax | +0.66 | +0.71 |
| consumption tax | −0.42 | −0.30 |
| bequest tax | −0.03 | −0.01 |
| wealth tax | −0.07 | −0.02 |
| payroll tax | 0.00 | 0.00 |
| **total** | **−0.35** | **+0.20** |

**Effective rates in OG-UK** (baseline 2030; household income tax split pro rata between labour income w·L and household capital income r_p·B; capital also pays the business tax):

| rate | zk0.1 | zk0 | OBR FRS 2026 Box 4.1 | OBR EFO Nov 2025 ¶2.64 |
|---|---|---|---|---|
| labour | 31.5% | 31.3% | 46% | 40% |
| capital, on gross capital income γY | 25.0% | 26.8% | 27% | 17% |
| capital, net of depreciation (γY − δK) | 49.0% | 50.8% | | |
| labour minus capital (gross basis) | 6.5pp | 4.5pp | 19pp | 23pp |

**Cause, in three parts.**

1. **The wedge between labour and capital taxation is about a quarter of the OBR's.**
   - OG-UK taxes household labour and capital income with one income-tax function (one effective rate on total income, about 31%), and its payroll tax revenue is zero.
   - The labour rate is therefore 15pp below the FRS 46%, which includes employee and employer NICs, and 9pp below the EFO 40%.
   - On a gross basis the capital rate matches the FRS 27%. It is 8–10pp above the EFO 17%. On a net-of-depreciation basis it is about 50%.
   - So moving a point of income from labour to capital lowers revenue by about 0.05pp in OG-UK, against 0.19–0.23pp for the OBR.
2. **Household capital income rises by more than labour income falls.**
   - At zk0, household capital income r_p·B goes from 17.5% to 22.0% of GDP, +4.5pp, while the labour share falls 3.9pp.
   - The reason is that r_p rises by 140bp, from 5.16% to 6.56%, on all household wealth, including gilts.
   - The OBR's composition exercise holds GDP and returns fixed, so it has no such channel.
   - At zk0.1 the rise is +2.9pp, because r rises less and part of the return goes to foreign owners. That is why household income tax falls more there (−0.49 against −0.18).
3. **Business tax rises with the capital share**, by +0.66 to +0.71pp, roughly in proportion to γY. Consumption tax falls with C/Y.

At zk0 the second and third parts outweigh the first, and tax/GDP rises.

**What would change it.** These are not changed without asking:
- a payroll tax or a separate labour-income tax function, to restore the labour–capital wedge;
- a lower tax rate on household capital income.

The capital rate is not out of line with the FRS on a gross basis. It is out of line with the EFO by about 8–10pp, and it is about 23–25pp above the FRS on a net basis. Which comparison is right depends on the OBR's profit definition, which `docs/literature_comparison.md` should state. The robust finding is the wedge. OG-UK's labour rate is too low relative to its capital rate, by about 13–18pp against the OBR's 19–23pp gap.

## Red flags 2 and 4 in the rerun

- **Red flag 2.** The UK-calibrated arms (`uk_*`, `analysis/surprise/uk_targets.json`) carry a 0.7–2.9pp share fall instead of 3.9pp. Each solve's diagnostics report its labour-share fall, the tax/GDP change per point of share fall against the OBR's 0.19–0.23, and the receipts change as a share of GDP against ¶6.18's −0.17%.
- **Red flag 4.** Each results file records `debt_by_fiscal_convention`: the debt/GDP path of the same arm under the common G/Y rule, fixed spending and debt-neutral transfers, wherever those solves exist. The copy can then lead with fixed spending for fiscal results.
