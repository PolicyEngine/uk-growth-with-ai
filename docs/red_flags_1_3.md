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

*Corrected 12 Nov 2026.* The first version of this section read OG-Core's `payroll_tax_revenue` (zero) as "no payroll tax". That was wrong, and so were its effective rates.

### What OG-UK already contains (checked in the code)

**Employee NICs are inside the income-tax functions.**
- OG-UK estimates its Gouveia–Strauss ETR and MTR functions on PolicyEngine-UK person-level `income_tax + national_insurance` (`oguk/api.py`, `_get_micro_data`: `_person_tax`, and `tax` for the ETR).
- In PolicyEngine-UK 2.90.2, `national_insurance` adds `ni_class_1_employee`, `ni_class_2`, `ni_class_3` and `ni_class_4`. That is employee and self-employed NICs only.
- `ni_employer` is a separate variable and is **not** in the fitted functions.
- The labour base is `employment_income + self_employment_income`, which excludes employer NICs.

**Employer NICs are a flat payroll tax.** `oguk/macro_params.py` `get_uk_tax_rates` sets `tau_payroll = 0.15`, commented "Employer NICs: 15% from April 2025".
- OG-Core levies it on all labour income: `tax.income_tax_liab` returns T_I + T_P, with T_P = `tau_payroll` · w·e·n.
- It is in the labour first-order condition: `household.FOC_labor` uses 1 − `tau_payroll` − MTR.
- It applies from the first pound, with no secondary threshold or Employment Allowance, on the model's whole labour income (65% of GDP). So it raises **9.75% of GDP**.

**Why the revenue line reads zero.** OG-UK sets `frac_tax_payroll = 0` (its microdata `payroll_tax_liab` is zeros). So OG-Core's `iit_revenue` contains the payroll tax, and `payroll_tax_revenue` reads 0. It is a labelling split, not an absence.

**Consequence: adding UK NICs would double count both sides.** Employee NICs are already in T_I, and employer NICs are already T_P. The open question is the size of T_P, not whether it exists. A flat 15% on all labour income is above the average employer rate, because of the secondary threshold and the Employment Allowance. 9.75% of GDP also looks large next to total UK NICs (employee plus employer) of roughly 6% of GDP. That is a rough figure, which step 2 of the NICs plan measures on PolicyEngine-UK.

### Decomposition of the 2030 change in tax/GDP

pp of GDP, `share_shift_tfp` against its closure's baseline, 2026-start:

| base | zk0.1 | zk0 |
|---|---|---|
| payroll tax (employer NICs, 15% of w·L) | −0.59 | −0.59 |
| income tax and employee NICs (one function of total household income) | +0.10 | +0.41 |
| business (corporate) tax | +0.66 | +0.71 |
| consumption tax | −0.42 | −0.30 |
| bequest tax | −0.03 | −0.01 |
| wealth tax | −0.07 | −0.02 |
| **total** | **−0.35** | **+0.20** |

### Effective rates in OG-UK

Baseline 2030. The payroll tax goes to labour. The income-tax function is split pro rata between labour income w·L and household capital income r_p·B. Capital also pays the business tax.

| rate | zk0.1 | zk0 | OBR FRS 2026 Box 4.1 | OBR EFO Nov 2025 ¶2.64 |
|---|---|---|---|---|
| labour (income tax, employee NICs, payroll) | 34.5% | 34.4% | 46% | 40% |
| of which the income-tax function (ETR on total household income) | 19.5% | 19.4% | | |
| capital, on gross capital income γY | 19.6% | 20.9% | 27% | 17% |
| capital, net of depreciation (γY − δK) | 38.4% | 39.6% | | |
| labour minus capital (gross basis) | 14.8pp | 13.6pp | 19pp | 23pp |

### Cause

1. **The labour–capital wedge is about 14pp, against the OBR's 19–23pp.**
   - So each point of income moved from labour to capital lowers revenue by about 0.14pp in OG-UK, against 0.19–0.23pp for the OBR.
   - That alone gives the right sign but too small a size (−0.53pp for 3.9 points).
2. **The income-tax function's take rises: +0.41pp at zk0, +0.10pp at zk0.1.**
   - At zk0, household capital income r_p·B rises from 17.5% to 22.0% of GDP, because r_p rises by 140bp on all household wealth, gilts included.
   - The progressive ETR on total household income then rises from 19.4% to 19.8%.
   - The OBR's composition exercise holds GDP and returns fixed, so it has no such channel.
   - At zk0.1, r rises less and part of the return goes abroad.
3. **Business tax rises with the capital share**, by +0.66 to +0.71pp. Consumption tax falls with C/Y.

At zk0, the second and third parts outweigh the payroll fall (−0.59pp), and tax/GDP rises.

### What it means for the NICs plan

- **Adding NICs on top would double count.**
- **Re-sizing `tau_payroll` to the measured average employer rate** (PolicyEngine-UK `ni_employer` ÷ employment income) would probably *lower* it. That cuts payroll revenue and narrows the wedge further, which moves red flag 3 the wrong way. Tax/GDP would also fall, so R1 would have to re-solve G/Y.
- **The UK labour rate is high because of employee and employer NICs on top of income tax.** OG-UK's labour rate is 34%, against the OBR's 40–46%, and the shortfall is in the income-tax function (19.5% on total household income). The function is a single schedule for labour and capital income, and is progressive in total income.
- **An honest fix for the wedge** is OG-Core's separate labour and capital tax functions (`mtrx` and `mtry`), estimated by OG-UK with different parameters. OG-UK currently reuses the ETR parameters for both (`_estimate_tax_functions`: "reuses them for MTRx and MTRy"). That needs a tax-function re-estimation in OG-UK, which is not allowed in this repo without asking.
- **Decided by Vahid (12 Nov 2026): (a).** OG-UK's tax system is kept and `tau_payroll` is not changed. The 14pp wedge, against the OBR's 19–23pp, is reported as a limitation. `analysis/nics/measure_nics.py` measures PolicyEngine-UK's actual employer and employee NIC rates for 2027–28 as evidence only. It runs under the heavy-job lock, after check-specs. The options were:
  - (a) leave the tax side as is and report the wedge;
  - (b) re-size `tau_payroll` from PolicyEngine-UK, with R1 re-solved, accepting a smaller wedge;
  - (c) re-estimate separate labour and capital tax functions in OG-UK, which is outside this repo.

## Red flags 2 and 4 in the rerun

- **Red flag 2.** The UK-calibrated arms (`uk_*`, `analysis/surprise/uk_targets.json`) carry a 0.7–2.9pp share fall instead of 3.9pp. Each solve's diagnostics report its labour-share fall, the tax/GDP change per point of share fall against the OBR's 0.19–0.23, and the receipts change as a share of GDP against ¶6.18's −0.17%.
- **Red flag 4.** Each results file records `debt_by_fiscal_convention`: the debt/GDP path of the same arm under the common G/Y rule, fixed spending and debt-neutral transfers, wherever those solves exist. The copy can then lead with fixed spending for fiscal results.
