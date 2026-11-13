# Debt/GDP with debt repriced at the OBR's speed

13 November 2026. Arithmetic on the existing surprise-2028 solves. No model run.

## Why

OG-UK's government debt is one-period debt. The whole stock pays the current interest rate every year, so a rise in the rate reaches all debt at once. UK debt reprices over many years. The dashboard's statement that debt/GDP is higher in every arm by 2036 rests on that interest effect, so this note checks whether it holds when the rate rise reaches the debt stock at the speed the OBR uses.

## Method

`analysis/surprise/debt_repricing.py` redoes the model's debt recursion for each common-rule arm, against the no-shock restart at the same closure.

- **Held from the solves:** GDP, the primary balance, the market interest rate and the no-shock path. There is no feedback from lower debt interest to anything else (first order).
- **Changed:** the rate paid on debt. Each year's change in the rate gap (arm less restart) reaches the debt stock in steps: 26% in its first year, 46% in its fifth, 50% in its sixth.
- **Check:** with 100% pass-through in every year, the recursion returns each solve's debt path to 1e-12, and the model gaps equal `debt_gdp_pp` in `dashboard/src/data/surprise2028.json` (branch `dashboard/ab2026-tabs`, `2ebcc4d`) for all 18 solved cells.

### Pass-through schedule

The source is the OBR's October 2026 debt interest ready reckoner ([table 5.1](https://obr.uk/download/october-2026-economic-and-fiscal-outlook-detailed-forecast-tables-debt-interest-ready-reckoner/)). It gives the cost of a 1 percentage point rise that starts in 2026-27 and lasts through the forecast:

| £ billion | 2026-27 | 2027-28 | 2028-29 | 2029-30 | 2030-31 | 2031-32 |
|---|---|---|---|---|---|---|
| Gilt rates | 1.1 | 3.7 | 6.5 | 8.7 | 10.6 | 12.6 |
| Short rates | 6.5 | 7.2 | 6.6 | 6.2 | 5.5 | 5.2 |
| Both, as a share of 1% of public sector net debt | 26% | 35% | 40% | 44% | 46% | 50% |

- The two rows are added, because the model has one interest rate. The inflation row is left out, because the model's rate is real.
- The denominator is public sector net debt, the stock the model's 95% of GDP is matched to (£3.0 trillion at the end of 2026-27), averaged over each year's opening and closing stock. It comes from the same forecast's [aggregates tables](https://obr.uk/download/october-2026-economic-and-fiscal-outlook-detailed-forecast-tables-aggregates/) 6.13 and 6.17.
- The OBR gives six years and the 2036 debt gap needs eight. The main column extends the schedule by its average step over years three to six (53% and 56%). A second column holds it at 50%. No sign depends on this choice.
- The March 2025 ready reckoner, used in the real-world review, gives about a third in year one and 45–50% by year five on a flat GDP of £3.0 trillion. The October 2026 table has a lower first year.

## Results

Debt/GDP gap against the no-shock restart, percentage points. "Break-even share" is the constant share of the model's rate gap at which the 2036 gap is zero; "none" means debt ends higher even with no interest effect.

| Closure | Scenario | Arm | 2031 model | 2031 OBR speed | 2036 model | 2036 OBR speed | 2036 OBR speed, flat tail | 2036 sign changes | Break-even share |
|---|---|---|---|---|---|---|---|---|---|
| ζK = 0.1 | UK low | Main | −0.07 | −0.25 | +0.84 | +0.21 | +0.21 | no | 22% |
| ζK = 0.1 | UK low | Technology unchanged | +0.17 | +0.01 | +1.18 | +0.60 | +0.60 | no | none |
| ζK = 0.1 | UK low | Stress test | +0.38 | +0.23 | +1.47 | +0.95 | +0.94 | no | none |
| ζK = 0.1 | UK central | Main | −0.13 | −0.52 | +1.99 | +0.58 | +0.57 | no | 18% |
| ζK = 0.1 | UK central | Technology unchanged | +0.35 | −0.01 | +2.67 | +1.36 | +1.35 | no | none |
| ζK = 0.1 | UK central | Stress test | +0.87 | +0.54 | +3.40 | +2.19 | +2.18 | no | none |
| ζK = 0.1 | UK high | Main | −1.35 | −2.12 | +2.07 | −0.69 | −0.72 | yes | 57% |
| ζK = 0.1 | UK high | Technology unchanged | +0.57 | −0.09 | +4.79 | +2.41 | +2.39 | no | none |
| ζK = 0.1 | UK high | Stress test | +1.59 | +1.00 | +6.24 | +4.07 | +4.05 | no | none |
| ζK = 0.1 | Korinek et al. | Main | −3.02 | −4.09 | +1.12 | −2.77 | −2.81 | yes | 83% |
| ζK = 0.1 | Korinek et al. | Technology unchanged | +0.67 | −0.20 | +6.38 | +3.19 | +3.16 | no | none |
| ζK = 0.1 | Korinek et al. | Stress test | +2.14 | +1.35 | +8.45 | +5.56 | +5.53 | no | none |
| ζK = 0 | UK central | Main | +0.33 | −0.18 | +1.98 | +0.17 | +0.15 | no | 36% |
| ζK = 0 | UK central | Technology unchanged | +0.78 | +0.30 | +2.67 | +0.99 | +0.97 | no | 7% |
| ζK = 0 | UK central | Stress test | +0.74 | +0.26 | +2.61 | +0.92 | +0.90 | no | 10% |
| ζK = 0 | Korinek et al. | Main | −1.56 | −3.00 | +1.03 | −4.08 | −4.13 | yes | 89% |
| ζK = 0 | Korinek et al. | Technology unchanged | +1.85 | +0.68 | +6.43 | +2.24 | +2.20 | no | 10% |
| ζK = 0 | Korinek et al. | Stress test | +1.79 | +0.61 | +6.33 | +2.13 | +2.09 | no | 12% |

UK low and UK high are not solved at ζK = 0.

## What it shows

- **2036, main arm.** The sign changes in three of the six solved cells: UK high (+2.07 to −0.69pp) and Korinek et al. at both closures (+1.12 to −2.77pp; +1.03 to −4.08pp). UK low and UK central stay higher than the no-shock path, at between a tenth and a third of the model's figure (UK central: +1.99 to +0.58pp at ζK = 0.1, +1.98 to +0.17pp at ζK = 0).
- **2036, technology unchanged and stress test.** Debt/GDP stays higher in all twelve solved cells. The gap is a third to two-thirds of the model’s figure.
- **2031.** The sign changes in four cells. Three are the technology-unchanged arm at ζK = 0.1 for UK central, UK high and Korinek et al. (−0.01, −0.09 and −0.20pp; the first is zero to rounding). The fourth is UK central's main arm at ζK = 0 (+0.33 to −0.18pp). The main arm's 2031 fall in debt/GDP at ζK = 0.1 is larger in every scenario.
- **The statement "debt/GDP is higher in every arm by 2036"** holds in 15 of 18 solved cells at the OBR's speed. It does not hold for the main arm in UK high or Korinek et al.

## Limits

- First order. Lower debt interest would also change household saving, the interest rate and tax receipts, and none of that is fed back.
- The ready reckoner is for a rise in nominal rates on today's debt stock. The model's rate is real, and its debt stock in 2028–36 is not the OBR's.
- Pass-through beyond year six is extrapolated.
- From 2036 the model's debt rule moves spending towards the long-run debt ratio. That affects debt from 2037, outside this window.

## Suggested reader caveat

> The model reprices all government debt at the new interest rate at once; at the speed the OBR assumes for UK debt, the rise in debt/GDP by 2036 is a tenth to two-thirds as large, and in the main arm of the UK high and Korinek et al. scenarios debt/GDP ends lower than the no-shock path.
