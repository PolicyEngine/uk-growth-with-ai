# Part 3 data notes: the uk-ai-study results (provisional)

Source: PolicyEngine/uk-ai-study PR #18, "Move the study to Microcosm UK 2024-25 and rerun every result (WIP)", branch `data/microcosm-2024-25`, commit `02956bdbf68638221a9af5e14d5989f58c56d95c` (read 15 Nov 2026). The PR is an open draft. The PR body describes head `63d475b`. The 7 commits after it change only paper text and figure PNGs under `results/`; no result data changed (`git diff --stat 63d475b..02956bd -- results/` lists 16 PNGs).

Pipeline: `analysis/story/ai_study/` holds exact copies of the committed result files at their repo paths, plus `SOURCE.json`. `dashboard/scripts/build_ai_study_data.py` reads only that folder and writes `dashboard/src/data/aiStudy2425.json`. It uses the formulas of the study's emitter (`analysis/emit_tex_values.py` and its helpers `post_takeup_runs.py`, `post_wage_cut.py` and `revision_accounting.py`). It checks each rounded value against the value the paper prints (`paper/values_generated.tex` at the same commit) and exits if one differs. All checks pass.

## Common definitions

- **Data and year.** Microcosm UK 2024-25 (build `microcosm-uk-2024-25-national-20261107T020434Z-eeb6093e`), simulated for 2026 with PolicyEngine-UK (`policyengine[uk]==6.16.1`).
- **Central scenario.** 7% of employees are displaced, with each employee's probability proportional to their occupation's AI exposure (C-AIOE). Survivors' wages rise 2.6% on average. Interest and dividend income rise 39.8% (+0.4pp return). Each displaced worker loses a full year of earnings.
- **Exchequer cost.** The fall in the government balance: income tax, employee and employer NI, and benefits. It counts no corporation tax. A negative cost is a net gain. The public-sector pay bill of displaced public employees is not netted.
- **Poverty.** Absolute poverty before housing costs (BHC), with the line frozen at its baseline value. The rate is over persons, in percentage points. AHC and relative (60% of the shocked median) figures are labelled where given.
- **Gini.** Shocked minus baseline, times 100 (points). The baseline Gini is 0.302.
- **Draws.** One draw is one random assignment of who is displaced. SDs describe variation across draws only, not survey sampling or model uncertainty.

## Exported values

### headline
| id | value | file | key | basis |
|---|---|---|---|---|
| central_cost | £7.38bn (SD 1.83, SE 0.26, range 2.94-11.15) | results/robustness/central_monte_carlo.json | exchequer_cost_bn.mean / .sd / .mcse / .min / .max | 50 draws |
| central_poverty | +2.34pp (SD 0.21) | same | poverty_change_bhc_pp.mean | 50 draws; the paper calls it an upper bound for exposure-proportional incidence |
| central_poverty_ahc | +2.58pp | same | poverty_change_ahc_pp.mean | 50 draws |
| central_poverty_relative | +0.64pp | same | relative_poverty_change_bhc_pp.mean | 50 draws |
| central_gini | +1.76pp (SD 0.12) | same | gini_change_pp.mean | 50 draws |
| central_displaced | 2.04m | same | displaced_weighted_m.mean | 50 draws |
| low_cost / low_poverty / low_gini | -£10.4bn (net gain) / -0.01pp / +0.73pp | results/low.json | exchequer_cost/1e9; poverty_rate_change_bhc*100; (gini_shocked-gini_baseline)*100 | seed 0 only; 1% displacement, no survivor-wage gain, full capital uplift |
| high_cost / high_poverty / high_gini | £43.4bn / +5.29pp / +2.81pp | results/high.json | same keys | seed 0 only; 13% displacement |

The paper prints low and high poverty and Gini only in its Table 1 (`genPresetMcRows`; low: -0.01 BHC, +0.73 Gini). Low and high are single draws. Do not set them beside the 50-draw central as a band of equal standing.

### ladder
| id | cost £bn | BHC pp | Gini pp | draws | file / key |
|---|---|---|---|---|---|
| central_50 | 7.38 | 2.34 | 1.76 | 50 | central_monte_carlo.json |
| central_20 | 7.23 | 2.31 | 1.73 | 20 | results/robustness/dividend_coverage_draws.csv, rows run=central, seeds 0-19, means |
| takeup | 9.90 | 2.10 | 1.56 | 20 | results/takeup/takeup_draws.csv, scenario=central, variant=takeup1 |
| takeup_jsa | 12.61 | 1.92 | 1.46 | 20 | same file, variant=jsa |
| wage_cuts | 18.87 | 0.20 | 0.28 | 20 | results/wage_cut/wage_cut_draws.csv, variant=table3 |
| obr | 9.74 | 0.63 | 0.20 | 20 | results/next_runs/obr_benchmark.json, summary.*.mean |
| obr_takeup | 10.40 | 0.57 | 0.16 | 20 | takeup_draws.csv, scenario=obr, variant=takeup1 |
| obr_takeup_jsa | 11.07 | 0.51 | 0.13 | 20 | same file, variant=jsa |

- **Pairing.** The take-up, JSA and wage-cut rungs pair with central seeds 0-19, so compare them with central_20 (£7.2bn), not with the 50-draw £7.4bn.
- **Take-up = 1.** Every benefit unit with a displaced worker claims UC, in both the paired baseline and the shock.
- **JSA.** 26 weeks of new-style JSA (£95.55 a week at 25 and over) for displaced workers aged 18-65 who meet the contribution condition. UC counts JSA as unearned income, and the model taxes JSA.
- **Wage cuts.** Occupation wage cuts graded by C-AIOE remove each seed's displaced wage bill. The survivor uplift and the capital shock stay on.
- **OBR rows.** These are a different shock: 1.67% displacement, no survivor-wage or capital change. The means agree with `takeup_runs.json` results.*.*.mean, and the builder asserts it.

### rules (50 paired draws, results/robustness/incidence_monte_carlo.json, `<rule>.exchequer_cost_bn.mean`)
| rule | cost £bn |
|---|---|
| uniform | 2.21 |
| junior | 7.10 |
| exposure (central) | 7.38 |
| compression | 11.18 |
| klein_top_loaded ("top-loaded stress test") | 26.91 |

Every rule has the same expected displaced count. The file also holds each rule's SD, BHC poverty and Gini, and all are exported.

### per_pound (pence of cost per £1 of gross earnings removed)
The government basis is the fall in the government balance and includes employer NI. The household basis is the fall in income tax plus employee NI minus benefits.

| id | gov | household | basis | file / key |
|---|---|---|---|---|
| job_loss | 42.2 | 28.8 | seed 0, displacement only (no wage or capital channel) | results/tax_composition/composition_grid.csv row unemployment_pct=7: -microsim_gov_balance_change_bn and -microsim_net_revenue_change_bn, divided by results/wage_margin_central.json gross_cut_realised/1e9 (£97.13bn) |
| job_loss_takeup | 44.7 | 31.3 | seed 0, displacement only | takeup_draws.csv scenario=disp_only, variant=takeup1: exchequer_cost_bn and -narrow_cash_change_bn, divided by wage_bill_lost_bn |
| job_loss_takeup_jsa | 47.3 | 33.9 | same | variant=jsa |
| wage_cuts | 54.9 | 40.0 | 20 draws, wage cuts alone (no uplift or capital), ratio of means | wage_cut_draws.csv variant=cut_only: mean(exchequer_cost_bn)/mean(gross_cut_bn), mean(household_basis_cost_bn)/mean(gross_cut_bn) |

### displaced (OBR-sized run, results/takeup/takeup_runs.json `diagnostics.obr.*`)
The shares count benefit units containing a displaced worker, not persons.

| id | value | key |
|---|---|---|
| claim_uc | 47.9% | flag_true_share (the data's baseline take-up flag) |
| claim_uc_entitled | 53.0% | flag_true_share_entitled_after |
| existing_unemployed_claim | 88.1% | existing_unemployed.flag_true_share_entitled |
| capital_over_limit | 42.2% | over_capital_limit_share (£16,000) |
| other_earner | 59.3% | other_earner_share |
| homeowner | 70.3% | owner_share |
| uc_per_displaced | £1,385 (paper rounds to £1,380) | results/next_runs/obr_benchmark_draws.csv: mean(uc_change_bn)*1e3/mean(displaced_weighted_m) |
| uc_per_displaced_takeup | £2,735 (paper £2,740) | takeup_draws.csv obr/takeup1, same ratio |
| uc_per_existing_unemployed | £6,038 (paper £6,000) | existing_unemployed.uc_per_person_gbp |

### deciles
- **File.** `results/appendix/decomposition_ci.csv`, column `disposable_change_pct`, with `ci_low` and `ci_high` (95% interval for the mean).
- **Measure.** The % change in HBAI household disposable income (BHC) by baseline income decile, in the central scenario.
- **Weighting.** Each household is weighted by its number of members.
- **Draws.** 20 draws, as the column `draws` of `decile_ranking_sensitivity.csv` records.
- **Values, deciles 1 to 10.** +1.78, -0.90, -0.59, -1.29, -1.62, -2.41, -2.13, -2.86, -2.34, +0.09.
- **Main decile basis.** The paper's text uses this file. Its Figure 4 split uses seed 0 with households weighted once (`results/jr16/fig4_4_decomposition.csv`), so it is not used here.
- **Caveat: the bottom income decile.** The paper declines to report decile 1 as a finding because its sign depends on the ranking: +1.78% under HBAI, -0.33% on income before pension contributions, and -0.10% when households with large personal pension contributions are excluded (`decile_ranking_sensitivity.csv`). Some high-weight households with large pension contributions sit in decile 1 and receive capital income. The JSON carries this caveat in `deciles.bottom_decile_caveat`, and the chart should show it or grey out decile 1.

### regions
`null`. `results/geo/region_summary.csv` is not on this branch: commit f9aa571 removed it in the move to Microcosm. It exists on `main`, but `main` holds the processed-FRS results that this PR supersedes, and the paper has no geography section. It is not exported.

## Cross-check against the PR body "Final numbers"
Every PR figure matches after rounding. The full-precision values are £7.38bn, £7.23bn, £9.90bn, £12.61bn, £18.87bn, £9.74bn, £10.40bn and £11.07bn. The pence are 42.2/28.8, 44.7/31.3, 47.3/33.9 and 54.9/40.0. UC per worker is £1,385 and £2,735, against £1,380 and £2,740 in the PR. The earlier notes folded inside the PR body give older figures that are now superseded: wage cuts at 54p and £18.6bn, which were seed 0, and job loss at 1.95pp, also seed 0. The final table and the paper both use 55p and £18.9bn.

## Caveats
- The results are provisional. The PR is an unmerged draft, and the panel recommendation was "minor revision".
- The cost is the difference between flows several times its size. Its sign depends on three assumptions: survivor wages (break-even +3.7%, seed 0), the capital uplift, and duration. The low scenario is a net gain only because it keeps the full capital uplift.
- There is no corporation tax and no closure of the displaced wage bill into profits. The paper's closed account, `revision_accounting`, covers this and is not exported here.
- Displacement is static: a full year out of work, no behavioural or macro response. The 2008-10 backcast over-predicts the poverty response.
- The draw count differs by row (see the ladder). Seed 0 is a bottom-tail draw for poverty and the Gini.
- The wage-cut figures come from `wage_cut_draws.csv`. The emitter also checks that the file's `code_fingerprint` matches the current `wage_cut_household.py`. That check needs the source repo, so the builder does not repeat it. The paper's printed values, which the builder does check, passed it at this commit.
