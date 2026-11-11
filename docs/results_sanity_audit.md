# Results sanity audit: magnitude and direction of every reported number

Audited at `0d451a5` (main): `uk_growth_with_ai/data/scenarios.json` (shared spending share) and
`scenarios_fixed_spending.json` (spending held at baseline levels). All ten series of every arm
in both files are identical, value for value, on `fix/baseline-contamination` (#22, at `d366c0a`)
and `paper/first-draft` (#24, at `f8413ba`); only the arm keys differ.

| This report | Key on main | Key on #22 |
|---|---|---|
| `share_shift_tfp` (automation + productivity) | `anthropic_ramp` | `share_shift_tfp_ramp` |
| `share_shift` (automation only) | `obr_ramp` | `share_shift_ramp` |

Every model number below is printed by `python analysis/results_sanity_audit.py`, which reads only
committed files: the two results files, `obr_history.json` and the dashboard's `ukAiPaths.json`
(section `[X]`). No OG-UK solve was run for this audit. With
`--export analysis/closure/output/zk0.1_baseline.json` (from `analysis/closure-sensitivity`, #30,
at `fddd9bc`) the script also cross-checks against a re-solve of the baseline that exports the
foreign positions.

## Summary

The model's internal accounting is sound. The production function, the labour share, the
interest-rate condition and the external accounts all close to rounding error on the committed
numbers. The problems are in what the numbers mean and how the copy describes them.

1. **GDP overstates the gain to UK residents.** 78.5% (`share_shift_tfp`) and 73.5%
   (`share_shift`) of the extra 2030 capital is foreign-owned. Income paid abroad rises by 1.10%
   and 0.83% of baseline GDP. In national-income terms the 2030 gains are **+3.87%** against GDP
   +4.92%, and **+0.59%** against GDP +1.42%.
2. **The capital response is set by one uncalibrated default.** With the baseline saving rate and
   no foreign inflow, capital would be 0.33% higher in 2030, not 6.06%. The inflow rule
   (`zeta_K = 0.1`, world rate 2%) supplies the rest.
3. **2026 gaps are announcement effects.** Technology and domestic wealth are at baseline in 2026;
   91.5% of the 2026 GDP gap is extra labour supply by households that foresee the ramp. In
   `share_shift` that is 40.7% of the 2030 gap.
4. **The 2026 resource residual is common to every arm.** It is −0.95% of GDP with the same sign
   in every arm and differs across arms by at most 0.0005% of GDP, so the gaps carry no
   differential accounting error. Whether the gaps are unchanged once its cause is fixed is
   untested (rerun R2).
5. **The wage sign in `share_shift_tfp` is not robust.** −0.55% is the share term (−6.19 log
   points) plus output per unit of labour (+5.63). A capital gap of 7.6% instead of 6.1% would
   make it zero.
6. **The baseline debt path is not a forecast.** Debt/GDP falls 95.0% → 90.6% because the
   baseline runs an implied primary surplus of about 2.6% of GDP from 2026. The OBR's path over
   the same years is 94.8% → 95.1%.

Verdicts: **C** consistent with first principles; **S** surprising but explained; **W** wrong or
unexplained as reported (the number or the sentence that describes it needs correcting).

## How the expectations were formed

The comparators in the "expected" column are computed by the script from inputs only: γ, Z, δ,
the corporate tax wedge and the baseline path. I had seen the model values before formalising
them, so they are not blind predictions; they are reproducible bounds.

| Comparator | What it assumes | Role |
|---|---|---|
| Inputs fixed | K and L at baseline; only γ and Z move | Lower bound on GDP; the calibration target |
| Solow | Investment a fixed share of GDP (the baseline's); labour at baseline | What domestic saving alone delivers in four years |
| r pinned | Return on capital stays at the baseline's, so K/Y scales with γ | Closed-economy long run, or a perfectly open economy at once; upper bound |

For 2030 (`[E]` in the script output):

| | Inputs fixed | Solow | r pinned | Model |
|---|---|---|---|---|
| `share_shift_tfp` GDP, % | +3.07 | +3.20 | +12.38 | +4.92 |
| `share_shift_tfp` capital, % | 0.00 | +0.33 | +24.90 | +6.06 |
| `share_shift_tfp` wage, % | −3.12 | −2.99 | +5.64 | −0.55 |
| `share_shift_tfp` r, bp | +158 | +156 | 0 | +108 |
| `share_shift` GDP, % | −0.03 | −0.03 | +6.90 | +1.42 |
| `share_shift` capital, % | 0.00 | +0.01 | +18.81 | +5.02 |
| `share_shift` wage, % | −6.03 | −6.03 | +0.49 | −3.94 |
| `share_shift` r, bp | +121 | +121 | 0 | +80 |

External benchmarks. Those marked "local note" come from a benchmark note that is not in the
repository and that I did not check against the primary PDFs; treat them as unverified. The rest
are in tracked files.

- OBR Briefing paper No.9, Annex B (local note): AI raises the level of UK productivity by about 2.3% over ten
  years, +0.2pp a year by the forecast horizon, with most of the effect in the second half.
- OBR March 2026 EFO Box 2.2 and paragraph 6.18: GDP level unchanged, lower labour share,
  receipts about −0.2% of GDP, debt +1.3% of GDP by 2030-31 (`dashboard/src/tabs/ai/metrics.js`).
- OBR effective tax rates of 46% on wages and 27% on profits (local note), giving a rule of thumb of
  (0.46 − 0.27) × −3.9pp = −0.74pp of GDP in receipts for this labour-share fall.
- Korinek et al. (2026) Table 3, "substantial": GDP +8.3%, capital +13.8%, labour share 60.0 → 56.1
  (`uk_growth_with_ai/scenarios.py`).
- OBR March 2026 EFO paths (`uk_growth_with_ai/data/obr_history.json`).

## Identities checked

| Identity | Max error, all arms, 2026–30 | Script section |
|---|---|---|
| Y = Z K^γ L^(1−γ) | 2.9e-06 (relative) | `[1]` |
| wL/Y = 1 − γ | 2.8e-06 | `[1]` |
| r = (1 − τ_b) γ Y/K − δ + τ_b δ_τ, with τ_b = 0.175 | 1.6e-06 | `[1]` |
| K = K_d + ζ_K (K_open − K_d): 2026 capital gap / labour gap | 0.1715 in the model, 0.1715 from the rule, both arms | `[9]` |
| 2026 gap in domestically owned capital (assets are inherited) | 0.000000% | `[9]` |
| Y − C − I − G = (1 + r_p) F_t − growth × F_{t+1} + residual, F = K_f + D_f | ≤0.0002% of GDP in 2027 and 2029; reproduces the stored residual in 2026 and 2028 | `[9c]` |
| I_t = growth × K_{t+1} − (1 − δ) K_t − immigrants' wealth | Immigrant term stable at 0.0108–0.0113 in every arm | `[8]` |
| Debt law of motion with r_gov = r − 0.02 | Implied transfers constant at 10.66–10.68% of GDP in the baseline | `[10]` |
| Inferred K_f, D_f, r_p against the exported re-solve (#30), baseline | 6e-16, 2e-16, 2e-08 | `[X]` with `--export` |

The external identity is the important one. It shows that the foreign capital, foreign debt and
portfolio return recovered from the committed JSON are the model's own, so the national-income
figures in this report are model output rather than a back-of-envelope estimate.

## Results table

2030 gap against the baseline unless a year is given. "Expected" is the comparator range above or
the stated benchmark.

### Baseline

| Result | Expected | Model | Verdict | Evidence |
|---|---|---|---|---|
| Real GDP growth, 2027–30 mean | 1.6% (OBR); balanced growth g_y + g_n ≈ 1.8% | 1.68% (1.81, 1.61, 1.67, 1.64) | C | `[0]` |
| Return on capital r | Pinned by the firm's condition; 2% world rate in the closure | 5.20% → 5.26% | S | Identity holds. The 3.2pp wedge over the closure's world rate makes desired "open" capital 1.72 times actual capital, which is what the inflow rule works on (anomaly C) |
| C/Y, I/Y, G/Y, tax/Y, 2026 | 60.5, 18.75, 21.5, 37.0 (OBR/ONS) | 50.95, 20.32, 28.89, 42.20 | S | Disclosed in the dashboard's levels caveat. Matters for composition: government absorbs 28.9% of any GDP gain under the shared-share rule |
| Debt/GDP | 94.8 → 95.1 (OBR, 2026-27 to 2030-31) | 95.00 → 90.56 | W | Anomaly F |
| 2026 resource residual | 0 | −0.95% of GDP (signed), 0.00 in 2027, −0.09% in 2028 | W | Anomaly B |
| I/Y in 2026 against 2027 | Smooth | 20.32 → 19.59; Y − C − I − G moves −0.16% → +0.79% of GDP | W | The 2026 residual shows up as 0.95pp of extra absorption in 2026, mostly in investment (anomaly B) |

### `share_shift_tfp` (shared spending share)

| Result | Expected | Model (2026, 27, 28, 29, 30) | Verdict | Evidence |
|---|---|---|---|---|
| GDP, % | +3.1 (inputs fixed) to +12.4 (r pinned); Solow +3.2 | +0.19, +1.25, +2.38, +3.61, +4.92 | S | Log gap 4.80 = technology 3.02 + capital 2.29 + labour −0.51 (`[4]`). 1.7pp above Solow comes from capital that is 78.5% foreign-owned |
| National income (GNI), % | Below GDP when the capital is foreign-financed | +0.18, +1.02, +1.92, +2.86, +3.87 | W (not reported) | Anomaly C. GNI is 79% of the GDP gain |
| Capital, % | +0.3 (Solow) to +24.9 (r pinned) | +0.05, +1.25, +2.66, +4.27, +6.06 | S | 18 times the Solow response; domestically owned capital is +1.42% |
| Labour input, % | Small; sign depends on wealth and wage effects | +0.27, +0.04, −0.23, −0.52, −0.83 | S | 2026 rise is anticipation (anomaly A). Falls as consumption recovers and the wage stays lower |
| Wage per efficiency unit, % | −3.0 (Solow) to +5.6 (r pinned) | −0.08, −0.31, −0.46, −0.54, −0.55 | S, sign fragile | Anomaly D |
| Labour income wL, % | (0.611/0.65) × GDP gain | +0.19, −0.27, −0.69, −1.06, −1.38 | C | Identity. Source scenario: +1.26% |
| r, basis points | 0 (open) to +156 (Solow) | +2, +30, +57, +83, +108 | S | Identity holds. A rise of this size sits oddly with a 59% rise in foreign-owned capital (anomaly C) |
| Investment, % | +2.4 in 2029 (Solow) | +16.1, +20.8, +24.7, +28.9, +13.1 | S; profile is an artefact | Anomaly C |
| Consumption, % | Below GDP; follows resident income net of saving | −0.53, −0.46, −0.29, −0.03, +0.32 | S | Of the 4.92% of GDP gained in 2030, consumption takes 0.16, government 1.42, investment 2.60, and the external balance 0.73 (`[7]`) |
| Government consumption, % | Equal to the GDP gap by construction | +0.19 … +4.92 | C | G/Y = 28.89% in every arm |
| Tax revenue, % | Below the GDP gap: income shifts to the lower-taxed base | +0.08, +0.96, +1.91, +2.94, +4.05 | C | Revenue gap / GDP gap = 0.82 |
| Tax/GDP, pp | −0.74 (OBR effective-rate rule of thumb) | −0.35 | C | Right sign, about half the size |
| Debt, % and debt/GDP, pp | Ambiguous under the shared-share rule | +1.44%; −3.00pp | C | Spending rises with GDP and r_gov rises 83bp; the ratio falls through the denominator |
| GDP growth in 2030 | Above baseline during the ramp | 2.93% against 1.64% | C | `[3]` |

### `share_shift` (shared spending share)

| Result | Expected | Model (2026, 27, 28, 29, 30) | Verdict | Evidence |
|---|---|---|---|---|
| GDP, % | 0 (inputs fixed) to +6.9 (r pinned); Solow −0.03 | +0.58, +0.82, +1.04, +1.25, +1.42 | S | Log gap 1.41 = technology −0.03 + capital 1.91 + labour −0.47. Anomaly E |
| National income (GNI), % | Below GDP | +0.55, +0.62, +0.66, +0.65, +0.59 | W (not reported) | GNI is 42% of the GDP gain and does not rise after 2028 |
| Capital, % | 0 (Solow) to +18.8 (r pinned) | +0.14, +1.36, +2.59, +3.82, +5.02 | S | 73.5% foreign-owned |
| Labour input, % | Rises on announcement (lifetime labour income falls), then falls with the wage | +0.81, +0.47, +0.09, −0.32, −0.76 | S | Anomaly A |
| Wage, % | −6.0 (Solow) to +0.5 (r pinned) | −0.23, −1.15, −2.08, −3.00, −3.94 | C | Robust in sign: it would take a capital gap of 16.4% to offset |
| Labour income wL, % | (0.611/0.65) × GDP gain | +0.58, −0.70, −1.99, −3.31, −4.67 | C | Identity |
| r, basis points | 0 to +121 | +5, +24, +43, +62, +80 | S | As above |
| Investment, % | About 0 (Solow) | +16.4, +18.4, +19.5, +20.4, +6.9 | S; profile is an artefact | Anomaly C |
| Consumption, % | Falls: resident income falls | −1.34, −1.40, −1.42, −1.38, −1.29 | C | Labour income −4.67%, GNI +0.59%, government takes 0.41% of GDP more |
| Tax revenue, % | Near zero or negative | +0.29, +0.27, +0.23, +0.18, +0.09 | C | Revenue gap / GDP gap = 0.07 |
| Tax/GDP, pp | −0.74 (rule of thumb); about −0.2 (OBR ¶6.18) | −0.55 | C | Between the two benchmarks |
| Debt/GDP, pp | Up (OBR: +1.3% of GDP by 2030-31) | +0.68 | C | Half the OBR figure; the OBR's includes welfare costs of higher unemployment that the model lacks |

### Fixed-spending file

2030 gap; `share_shift_tfp` first, `share_shift` second. Verdicts and mechanisms are those of the
shared-share rows unless stated.

| Result | Expected | Model, 2030 | Verdict | Evidence |
|---|---|---|---|---|
| GDP, % | Slightly above the shared-share run: less public absorption | +5.20, +1.54 | S | Log gap 5.07 = 3.02 + 2.49 − 0.43; 1.53 = −0.03 + 2.00 − 0.44 |
| GNI, % | Below GDP | +4.24, +0.75 | W (not reported) | Foreign share of extra capital 71.6%, 69.7% |
| Capital, % | Above the shared-share run | +6.60, +5.27 | S | Domestically owned capital +2.04%, +1.74% |
| Labour input, % | As shared-share | −0.71, −0.71 | S | 2026: +0.31, +0.83 (announcement) |
| Wage, % | As shared-share | −0.40, −3.87 | S, sign fragile for `share_shift_tfp` | Capital gap needed for a zero wage gap: 7.7% against 6.6% |
| Labour income wL, % | Identity | −1.11, −4.55 | C | |
| r, basis points | As shared-share | +105, +78 | S | |
| Investment, % (2029 → 2030) | Same profile | +32.5 → +18.2; +21.7 → +8.5 | S; profile is an artefact | Anomaly C |
| Consumption, % | As shared-share | +0.20, −1.32 | S, C | 2026: −0.61, −1.37 |
| Government consumption, % | Zero by construction | 0.00, 0.00 | C | Held at baseline levels |
| Tax revenue, % | Below the GDP gap | +4.18, +0.15 | C | Revenue gap / GDP gap 0.80, 0.10 |
| Tax/GDP, pp | −0.74 (rule of thumb) | −0.41, −0.58 | C | |
| Debt, % | Down when revenue rises and spending is fixed | −1.44, +0.72 | C | |
| Debt/GDP, pp: `share_shift_tfp` | Down | −5.72 | C | Implied primary surplus rises from 2.75% to 3.70% of GDP |
| Debt/GDP, pp: `share_shift` | Up (OBR: +1.3% of GDP under this convention) | −0.73 | S | Opposite sign to the OBR. Follows from anomaly E: GDP is +1.54% here and unchanged in the OBR's scenario, and the model has no unemployment-related spending |
| 2026 residual, % of GDP | Same as the main file | −0.948, −0.944 | W | Anomaly B |

### Headline statements in the dashboard and paper

| Statement | Where | Verdict | Why |
|---|---|---|---|
| "UK GDP against the no-AI baseline, 2030: +4.9%, +1.4%" | Dashboard KPI tiles; README; paper abstract | S; incomplete | Correct as GDP. Needs GNI beside it (+3.9%, +0.6%) |
| "The GDP gain is investment-led, not consumption-led" | `ResultsPanel.jsx` | C | `[7]` |
| "Capital accumulation: households save and the capital stock builds" | `AiChannels.jsx:28` | W | Domestically owned capital rises 1.4%; foreign-owned capital rises 59% and 46% |
| "Consumption falls to finance it" | `scenarioStory.jsx`, investment caveat | W | Domestic resources cover 33% (`share_shift_tfp`) and 37% (`share_shift`) of the extra 2026–29 investment |
| "Cohorts respond by saving more" | Paper `results.tex`, `discussion.tex` | W | Same |
| "Investment is the residual in the resource constraint and absorbs numerical error" | Paper `results.tex`, `limitations.tex` | W | Investment comes from the capital law of motion in every arm (`[8]`). Its 2026 level carries the common residual, but the residual does not differ across arms, so the investment gaps are not absorbing error |
| "Both paths build steadily rather than jumping" | Paper `results.tex` | W for `share_shift` | 40.7% of the 2030 gap is present in 2026 |
| "Wages are below the baseline in every year in both scenarios" | `ResultsPanel.jsx` | S; overstated for `share_shift_tfp` | True of the run; the 2030 sign turns on 1.5pp of capital |
| "The gap between consumption and GDP is the resource cost of capital accumulation" | Paper `results.tex` | W | In 2030 the gap is 1.42pp government, 2.60pp investment, 0.73pp external balance; income paid abroad is up 1.10% of GDP |
| "The undershoot against Korinek et al. has structural sources": the elasticity, absent channels and "a capital-supply elasticity" | Paper `results.tex` | S; incomplete | The sentence lists capital supply last and unquantified. At the source's capital gap (+13.8%) the same production function gives GDP +7.8% against their +8.3%, so capital supply carries almost all of the undershoot and should lead |
| "2026 levels carry an accounting error … equally in every scenario, so gaps are unaffected" | `scenarioStory.jsx`, `checks.py` | S | "Equally in every scenario" is now established: same sign, differences ≤0.0005% of GDP. "Unaffected" holds in that sense only; invariance of the gaps to fixing the cause is untested |
| "2026 gaps are anticipation" | `scenarioStory.jsx` | C | Anomaly A |
| "Automation only is not the OBR's scenario" | `scenarioStory.jsx` | C | Anomaly E |
| Context chart, "No AI" debt line 94.8 → 90.4 beside the OBR's 94.8 → 95.1 | `ukAiPaths.json` | W | Anomaly F |
| Context chart, "No AI" investment 18.75 → 18.08 between 2026 and 2027 | `ukAiPaths.json` | W | The chart rebases on the 2026 ratio, which carries the residual (anomaly B) |

## Anomaly A: 41% of the `share_shift` 2030 GDP gap appears in 2026

**Finding.** Perfect-foresight anticipation. Not the period-0 demographics defect, and not a
numerical artefact.

**Evidence.**

- In 2026 the technology term is exactly zero (γ and Z at baseline) and the gap in domestically
  owned capital is 0.000000%. State and technology are identical across arms, so any 2026
  difference can only come from expected future prices.
- The 2026 GDP gap is 91.5% labour in both arms and both files: labour input is +0.81%
  (`share_shift`) and +0.27% (`share_shift_tfp`). The remaining 8.5% is foreign capital responding
  to the extra labour through the inflow rule.
- Consumption falls 1.34% and 0.53% in 2026. Households foresee lower lifetime labour income
  (−4.67% and −1.38% by 2030) and a higher return on saving, so they consume less and work more.
  A back-of-envelope check with the model's Frisch elasticity (0.35) and risk aversion (1.5) gives
  +0.63% and +0.25% for 2026; it is an aggregate approximation and drifts in later years, so I do
  not lean on it.
- The resource residual cannot be the cause: it differs across arms by 0.0005% of GDP, against
  2026 GDP gaps of 0.58% and 0.19%.

**Size.** `share_shift`: +0.58% in 2026 against +1.42% in 2030, 40.7% (38.2% under fixed
spending). `share_shift_tfp`: 3.9%. The contrast between arms is itself evidence: the arm with the
larger expected fall in labour income has the larger announcement effect.

**Correction (reframing).**

- Label 2026 as the announcement year in every table and chart, and do not describe 2026 gaps as
  effects of AI in 2026.
- Remove "both paths build steadily" from the paper for `share_shift`.
- State the labour contribution to the 2030 gap (−0.51 and −0.47 log points): labour supply adds to
  GDP early and subtracts later.

## Anomaly B: the 2026 resource residual is larger than the 2026 effects

**Finding.** The 2026 gaps carry no differential accounting error, so they can be read as model
output. The 2026 levels and ratios are not exact. Whether the gaps move when the cause is fixed
has not been tested.

**Evidence.**

- The sign, which `solve.py` discards, is recoverable from the committed data through the
  external identity (`[9c]`): the residual is **−0.9495%** of GDP in the baseline, −0.9479% in
  `share_shift_tfp` and −0.9445% in `share_shift`. Same sign in every arm. The re-solve on #30
  reports −0.009495 for the baseline, the same number.
- Across arms it differs by 0.0002–0.0005% of GDP, about 1,000 times smaller than the 2026 GDP
  gaps.
- It appears only in 2026 (−0.95%) and 2028 (−0.09%), in the baseline as much as in the shocked
  arms. It is zero to 0.0002% of GDP in 2027, 2029 and 2030.
- In the baseline it is visible in the national accounts: Y − C − I − G is −0.16% of GDP in 2026
  and +0.79% in 2027, and I/Y is 20.32% in 2026 against 19.59% in 2027.

**Root cause.** Not established here. A common period-0 level error that does not respond to the
shock is what the period-0 demographics defect would produce (OG-UK passes `omega_S_preTP` but not
`g_n_preTP`, `rho_preTP` or `imm_rates_preTP`, so the opening wealth aggregate is built on
OG-Core's shipped values). The #30 export supports the premise: with the stock inputs the
period-0 population law of motion misses by up to 5.9% in relative terms, and with UK-consistent
inputs it closes to 2.5e-16. Whether that removes the residual is what the pre-TP baseline on #30
tests; it is a baseline-only run, so it will not show whether the gaps move.

**Correction.**

- Code: store the signed residual (`solve.py:93` takes `np.abs`).
- Dashboard: the context chart rebases each ratio on its 2026 model value, so the "No AI"
  investment line drops from 18.75% to 18.08% of GDP in 2027 for no economic reason. Rebase on
  2027, or fix the period-0 inputs and regenerate.
- Copy: say the residual is common to every scenario rather than that gaps are unaffected. Add that 2026 investment and the 2026
  external balance in levels are off by up to 0.95% of GDP.

## Anomaly C: investment +28.9% in 2029 and +13.1% in 2030, r up 108bp, and national income

**Finding.** The sign is right. The size is set by an uncalibrated closure. The year-to-year
profile is an artefact of the ramp and of having no adjustment costs. GDP is not the right
headline while most of the new capital is foreign-owned.

**Mechanism.** OG-Core sets foreign-owned capital to `zeta_K × (K_open − K_d)`, where `K_open`
is the capital firms would want at the world interest rate (2%). Because the domestic return is
5.2%, `K_open` is 1.72 times actual capital in the baseline. Raising γ raises `K_open` steeply:
+28.3% by 2030 in `share_shift_tfp`, +22.1% in `share_shift`. Ten per cent of that gap arrives
each year, whatever domestic saving does.

**Evidence.**

- Foreign-owned capital rises 58.7% and 45.5% by 2030; domestically owned capital rises 1.42% and
  1.45%. Foreign share of the extra capital: 78.5% and 73.5%.
- With the baseline saving rate and no inflow (Solow), the 2030 capital gap would be +0.33% and
  +0.01%, and 2029 investment +2.4% and 0.0%.
- Each year's rise in γ adds 1.2–1.8pp to the capital gap. Investment in 2030 builds the 2031
  capital stock, and γ no longer rises after 2030, so the implied 2031 capital gap grows by only
  0.49pp and 0.11pp. Of the +13.1% investment gap in 2030, +6.7% is what it takes to hold the 2030
  capital gap constant; for `share_shift` it is +5.5% of +6.9%.
- I/Y reaches 24.6% in the model's units in 2029 (25.3% under fixed spending). On the dashboard's
  OBR-rebased chart that is 22.7% of GDP, against a highest value since 2000 of 19.0%.
- The 108bp rise in r is exactly what the firm's condition implies given Y/K. The inconsistency is
  between price and quantity: foreign investors add 59% to their UK capital while the return on it
  rises from 3.2pp to 4.3pp above the rate the closure says they can earn elsewhere.

**National income.** Foreigners earn the portfolio return on their capital and on the gilts they
hold. Income paid abroad rises from 1.43% to 2.42% of GDP in `share_shift_tfp` and to 2.23% in
`share_shift`.

| 2030 | GDP gap | GNI gap | GNI / GDP gain |
|---|---|---|---|
| `share_shift_tfp` | +4.92% | +3.87% | 0.79 |
| `share_shift` | +1.42% | +0.59% | 0.42 |
| `share_shift_tfp`, fixed spending | +5.20% | +4.24% | 0.81 |
| `share_shift`, fixed spending | +1.54% | +0.75% | 0.49 |

In `share_shift`, GNI is +0.55% in 2026 and +0.59% in 2030: all of the GDP growth after the
announcement year accrues to foreign owners.

**Correction.**

- Code: export `K_d`, `K_f`, `D_f`, `r_p` and report GNI next to GDP in `report.py`, the dashboard
  tiles and the paper tables. Until the export lands, the inversion in
  `analysis/results_sanity_audit.py` gives the same numbers from the committed JSON.
- Parameter: `zeta_K` and `world_int_rate_annual` are inherited defaults that this repository
  never sets or states. The closure reruns on #30 (`zeta_K` = 0, 0.1, 0.5) show how much of the
  headline depends on them. A world rate equal to the baseline domestic return would remove the
  standing 72% gap that the rule acts on; that is a calibration decision for the maintainer.
- Reframing: replace "households save" and "consumption falls to finance it" with the foreign
  share. Delete "investment is the residual". Describe the 2030 investment fall as the end of the
  inflow, and do not present the four-year investment profile as informative about timing.

## Anomaly D: wages fall while the source's labour income rises

The task note attributes −0.55% to the zero-TFP arm. It belongs to `share_shift_tfp`; the
zero-TFP arm (`share_shift`) is −3.94%.

**Finding.** Neither is wrong; they differ in capital, not in technology. The model's wage is an
identity, and its sign in `share_shift_tfp` depends on the capital closure.

**Evidence.**

- d ln w = ln(0.611/0.650) + d ln(Y/L) = −6.19 + 5.63 = −0.56 log points (−0.55%). Output per unit
  of labour would have to rise 6.38% for an unchanged wage; it rises 5.79%.
- Like for like, labour income is **−1.38%** in the model and **+1.26%** in the source
  ((56.1/60.0) × 1.083 − 1). The difference is GDP: +4.92% against +8.3%.
- The GDP difference is capital: +6.06% against +13.8%. Putting the source's capital gap through
  the model's production function at the model's labour input gives GDP +7.83% and a wage of
  +2.21%. This is accounting, not a replication of the source.
- The capital gap that makes the wage gap zero is 7.6% (7.7% under fixed spending), against 6.1%
  (6.6%).
- For `share_shift` the wage fall is robust: it would take a capital gap of 16.4%.

**Correction (reframing).** Report the `share_shift_tfp` wage as "about unchanged; the sign
depends on how much capital arrives" and give the −3.0% (no inflow) to +2.2% (source's capital)
range. Keep "wages fall" for `share_shift`. Report labour income (−1.38%, −4.67%) beside the
wage, since hours fall too. The `zeta_K` reruns on #30 will show the sign under each closure.

## Anomaly E: `share_shift` does not hold equilibrium GDP unchanged

**Finding.** The fixed-input target is met; the equilibrium gain is the capital inflow.

**Evidence.** The technology term is −0.03 log points in 2030 (and +0.04 in 2028, the
interpolation point already listed in #21). Capital adds 1.91 and labour subtracts 0.47, giving
1.41 log points (+1.42%). Without the inflow the 2030 gap would be −0.03%. In national-income
terms the gain is +0.59%.

**Against the OBR.** Box 2.2 holds GDP unchanged with unemployment at 5.5%. The model has no
unemployment: labour input falls 0.76% by choice. The fiscal comparison inherits the difference:
under the OBR's fixed-spending convention the model's debt/GDP is 0.73pp lower, where the OBR has
debt 1.3% of GDP higher.

**Correction.**

- Reframing (already decided on #27): the arm is `share_shift`, not an OBR replication. Update the
  +1.7% in the title of #8 to +1.42%.
- Do not present the debt comparison with OBR ¶6.18 as like for like.
- If a GDP-neutral arm is wanted, solve Z against the 2030 equilibrium GDP gap. A first guess is
  Z ≈ 0.9296 (0.942834 × e^−0.0141); it will overshoot slightly because lower Z also lowers
  `K_open`, so expect two or three solves with a secant step. Whether that is worth doing depends
  on the #30 result: at `zeta_K = 0` the gap should already be near zero.

## Anomaly F: baseline debt/GDP falls from 95.0% to 90.6%

**Finding.** Arithmetically consistent, not credible as a UK path, and shown on the dashboard
beside an OBR line that does the opposite.

**Evidence.**

- The debt law of motion closes with r_gov = r − 0.02 (3.2%): implied transfers are constant at
  10.66–10.68% of GDP.
- The implied primary surplus is 2.64%, 2.60%, 2.54%, 2.48% of GDP in 2026–29. The surplus that
  would hold debt/GDP constant is (r_gov − g) × D/Y ≈ 1.3pp. The 1.2–1.3pp difference is the
  annual fall in the ratio.
- The OBR's March 2026 path is 94.81, 95.74, 96.28, 96.07, 95.05. The model's is 95.00, 93.71,
  92.62, 91.55, 90.56: 4.5pp lower by 2030.
- Tax/GDP is 42.2% in the model against 37.0% in the OBR data.

**Root cause (hypothesis).** `solve.py` sets `alpha_G` to the baseline steady state's G/Y and
holds it through the window, with the debt rule off until 2036. The steady state has debt at 95%
of GDP (#30 export), so that spending share is the one that stabilises debt for the steady-state
economy. In 2026–30 the same share leaves a larger surplus. Confirming this needs the steady-state
revenue, transfers and population growth, which are not exported.

**Correction.**

- Reframing, now: do not plot or quote the baseline debt/GDP level as a projection. Report debt
  only as a gap against the baseline, and say in the fiscal caveat that the baseline itself runs a
  primary surplus of about 2.6% of GDP.
- Parameter, if the level is wanted: choose `alpha_G` or `alpha_T` so that the 2026 primary
  balance matches the OBR's, then re-solve all arms.
- The shocked-arm debt gaps (−3.00pp, +0.68pp; −5.72pp, −0.73pp under fixed spending) are less
  affected than the level but are not independent of it, since the interest bill scales with the
  stock.

## Anomaly G: the 2028 resource residual (flagged by the checks on #28)

**Finding.** A second common level error, one tenth the size of the 2026 one. It adds no
differential error to the 2028 gaps.

**Evidence.**

- Signed, from the external identity: −0.0894% of GDP in the baseline, −0.0879% in
  `share_shift_tfp`, −0.0888% in `share_shift` (−0.0875% and −0.0885% under fixed spending). The
  neighbouring years are 0.0000–0.0002%.
- It is in the baseline, which has no ramp, so it is not the ramp kink.
- Every solve in both files gives the same value to two significant figures, and the Euler errors are
  below 6e-12, so it is not a convergence spike.
- Across arms it differs by at most 0.0006% of GDP, against 2028 GDP gaps of 2.38% and 1.04%.

**Root cause (hypothesis).** The run log reads "Demographics data: Initial Data year = 2026,
Final Data year = 2028". OG-Core takes the population from data up to the final data year
(`final_data_year = START_YEAR + 2` by default) and projects it from fixed rates afterwards, so
2028 is where data are spliced to projection. A population path that does not satisfy its own law
of motion in that year would leave a residual in exactly that period, in every arm, independent of
the shock. The test is the per-period population law-of-motion residual from the demographic
fetch, which #30 already computes for period 0.

**Correction.** None to the gaps. Record the signed residual per period, and name 2028 beside 2026
in the accounting caveat. If the splice is confirmed, the fix belongs with the period-0
demographics fix.

## Anomaly H: Y − C − I − G swings by 2.7–3.9 points of GDP in 2030 (flagged by the checks on #28)

**Finding.** It is the foreign-capital closure meeting the end of the ramp. It is not an
end-of-window artefact and not numerical error.

**Evidence.** The external identity splits Y − C − I − G into income paid abroad minus the net
foreign inflow (new foreign-owned capital and gilts). As gaps against the baseline, in % of
baseline GDP (`[9d]`):

| `share_shift_tfp` | 2026 | 2027 | 2028 | 2029 | 2030 |
|---|---|---|---|---|---|
| Y − C − I − G | −2.87 | −2.95 | −3.05 | −3.14 | +0.73 |
| Net foreign inflow | +2.88 | +3.19 | +3.55 | +3.92 | +0.37 |
| Income paid abroad | +0.01 | +0.24 | +0.49 | +0.78 | +1.10 |

| `share_shift` | 2026 | 2027 | 2028 | 2029 | 2030 |
|---|---|---|---|---|---|
| Y − C − I − G | −2.24 | −2.32 | −2.39 | −2.45 | +0.29 |
| Net foreign inflow | +2.27 | +2.52 | +2.78 | +3.05 | +0.54 |
| Income paid abroad | +0.03 | +0.20 | +0.39 | +0.60 | +0.83 |

- The 2029 → 2030 swing is +3.87pp in `share_shift_tfp`: the inflow gap falls 3.55pp and income
  paid abroad rises 0.32pp. In `share_shift` it is +2.75pp: 2.52pp and 0.23pp. Under fixed
  spending the swings are +4.08pp and +2.77pp.
- The investment gap falls by nearly the same amount: from 5.72% to 2.60% of baseline GDP, and
  from 4.04% to 1.36%. Investment in 2030 builds the 2031 capital stock, γ stops rising after
  2030, so `K_open` stops rising and the inflow stops.
- The baseline's inflow is steady at 0.60–0.63% of GDP and its Y − C − I − G at 0.70–0.83% after
  2026, which is why the baseline does not swing.
- The identity closes to 0.0002% of GDP in the years where it can be checked against next-year
  stocks (2027, 2029), so no export is needed to close Y = C + I + G + external.

**What it means.** For four years the UK runs an external deficit 2.2–3.1 points of GDP larger
than baseline, financed by foreign purchases of UK capital. In the first year after the ramp the
inflow stops and the economy moves to a surplus 0.3–0.7 points larger than baseline, because it
now owes foreigners an extra 0.8–1.1% of GDP a year. The one-year size of the swing comes from the
linear ramp having a kink and the model having no adjustment costs; with a smooth ramp it would be
spread over several years.

**Correction.** Same as anomaly C: report the external balance and income paid abroad, state the
closure, and do not present the 2029–30 profile as a timing result. A check that
Y − C − I − G is smooth should compare against the identity above, not against a tolerance.

## Other findings

- **Revenue composition.** Tax/GDP falls 0.35pp and 0.55pp, the right sign and 47–74% of the
  effective-rate rule of thumb. The paper is right that the split by base is not identified.
- **Government absorption.** Under the shared-share rule government consumption takes 1.42% of
  baseline GDP of the 4.92% gain. This is an assumption, and the fixed-spending file is the
  alternative; the headline should say which is shown.
- **GDP against the OBR's AI judgement.** +4.9% by 2030 is five to ten times the 2030 effect
  implied by Briefing paper No.9 (about +0.5% to +1.0%), because the +3.1% technology gain and the
  −3.9pp labour share are imposed from a US scenario. That is a calibration choice already flagged
  in the dashboard's first caveat, not a model defect.

## Corrections, in order

| # | Correction | Type | Where |
|---|---|---|---|
| 1 | Report GNI beside GDP everywhere a GDP gap is shown | Code + copy | `report.py`, `dashboard_data.py`, tiles, paper tables; #16 |
| 2 | Replace the domestic-saving story with the foreign share; delete "investment is the residual" | Copy | `AiChannels.jsx:28`, `scenarioStory.jsx` investment caveat, paper `results.tex`, `discussion.tex`, `limitations.tex`; #16 |
| 3 | State `zeta_K`, `zeta_D` and the world rate; show results across closures | Parameter + docs | README, Scenario design tab, paper methodology; #16, #30 |
| 4 | Label 2026 as the announcement year; remove "build steadily" for `share_shift` | Copy | Tables, charts, paper `results.tex`; #15 |
| 5 | Store the signed residual; rebase the context chart away from 2026 or fix period-0 inputs | Code | `solve.py:93`, `dashboard_data.py: uk_paths`; #15 |
| 6 | Wage: "about unchanged, sign depends on capital" for `share_shift_tfp`; add labour income | Copy | `ResultsPanel.jsx` headline bullet, paper `results.tex` |
| 7 | Attribute the undershoot against Korinek et al. to capital supply | Copy | Paper `results.tex` |
| 8 | Stop showing the baseline debt level as a projection; disclose the 2.6% primary surplus | Copy, then parameter | Context chart debt panel, fiscal caveat, paper fiscal section; #32 |
| 9 | Drop the like-for-like reading of the OBR ¶6.18 debt comparison; fix the +1.7% in #8 | Copy | `scenarioStory.jsx` note box; #8 |

## Reruns the corrections would need

None of these has been run or requested. Each waits for the maintainer's decision. Times assume
about 7 minutes a solve on a laptop, one at a time.

| # | Defect | Proposed fix | Solves | Rough time |
|---|---|---|---|---|
| R1 | Baseline debt/GDP falls 4.4pp where the OBR's is flat (anomaly F) | Set `alpha_G` or `alpha_T` so the 2026 primary balance matches the OBR's; re-solve every arm under both spending rules | 1–2 baseline passes to hit the target, then 5 | 45–60 min |
| R2 | 2026 and 2028 residuals (anomalies B, G) | Pass UK-consistent `g_n_preTP`, `rho_preTP`, `imm_rates_preTP`, and repair the 2028 data-to-projection splice if the test on #30 confirms it; regenerate both files | 6 | 45 min |
| R3 | Headline depends on an inherited capital closure (anomaly C) | Choose and state `zeta_K` and the world rate; if the world rate is recalibrated to the baseline return, that is a new closure not covered by #30 | 3 per closure, 6 with fixed spending | 20–45 min |
| R4 | `share_shift` is not GDP-neutral in equilibrium (anomaly E) | Solve Z against the 2030 equilibrium gap, starting from Z ≈ 0.9296 | 2–3 | 15–25 min |
| R5 | One-year investment and external swing in 2030 (anomalies C, H) | Optional: a smooth ramp in place of the linear one | 4 | 30 min |

R1–R3 change the baseline or the closure, so they should be decided together and run once; R4 and
R5 only make sense after that.

Needing no rerun: GNI and the foreign split (corrections 1–3), the signed residual, the wage and
announcement-year wording, and the OBR comparison wording. This PR adds the report and the script
only. It leaves the dashboard, paper and model files alone because `fix/baseline-contamination`
(#22), `dashboard/ui-fixes` (#25) and `paper/first-draft` (#24) are rewriting the same lines.

## What this audit did not do

- No OG-UK solve. The closure, pre-TP and convergence runs are on #30.
- It did not re-read the OBR or Korinek et al. PDFs. Benchmarks come from tracked data and
  constants, except the two marked "local note" above.
- It did not test whether the gaps are invariant to fixing the residuals (rerun R2).
- It did not test the cause of the 2026 residual or of the baseline primary surplus; both are
  stated as hypotheses with the run that would settle them.
- Steady-state values are not in the committed results, so nothing here speaks to the long run.

## Reproduce

```bash
python analysis/results_sanity_audit.py                                   # both committed files
python analysis/results_sanity_audit.py --export PATH/zk0.1_baseline.json    # plus the #30 cross-check
```
