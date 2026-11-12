# Results sanity audit: the 2028-surprise solves

Independent review of every finished solve on `rerun/surprise-2028` at `cf5d8ba` (12 Nov 2026, 17:45). The rule applied: every result must make sense in size and direction, and if it does not, the cause is found and stated.

- **Audited:** 18 solve records in `analysis/surprise/output/{zk0.1,zk0}/`. That is 2 continuations and 16 arm solves, of which 15 are reported arms and one (`korinek_share_shift_ramp_r4_1`) is a rejected R4 iteration.
- **Not solved yet:** UK low, UK high and Korinek at ζK = 0. They are in the verdict table as "not solved".
- **Method:** `analysis/surprise/audit_2028.py`, written for this audit. It reads the committed JSON only, recomputes every identity from the exported series, and does not import `sanity.py` or the package. No OG solve was run.
- Every number below is printed by that script. Gaps are against the continuation (the no-shock restart) of the same closure.

## Summary

**Verdict counts.** The table has 408 cells: 4 scenarios × 2 closures × 3 arms × 17 rows.

| verdict | cells |
|---|---|
| consistent | 206 |
| surprising-but-explained | 49 |
| wrong | 0 |
| not solved | 153 |

**No model number is wrong.** The accounting closes, the shocks are the stated size in the stated years, and every surprising number has a cause in the model's structure (anomalies A1–A8).

**Three statements about the results are wrong and need changing.** None needs a rerun.

1. **"Holding GDP flat needs output at fixed inputs to fall"** (#27 decision, 17:27) is true only at ζK = 0.1. At ζK = 0 the stress test needs output at fixed inputs to *rise* by 0.03%, because the technology-unchanged arm's GDP is −0.03% (A1).
2. **The sanity gate's investment flag compares unlike years.** It flags the Korinek 2028 jump (+21.3%) against the old 2026 jump (+17.2%). The like-for-like year is the old 2027 (+21.3%), and the two match (A7, A10).
3. **"The tax/GDP sign is right" holds in 2031 only.** At ζK = 0, tax/GDP in the main arm is −0.006pp in 2031 and positive from 2032 (+0.03pp by 2036), while the labour share is 1.6pp lower (A6).

**Four things a reader will trip over, all explained:**
- Debt/GDP ends *higher* in every arm by 2036, including "automation + productivity" (+2.0pp for UK central), because the whole debt stock reprices at the higher interest rate (A4).
- Consumption falls while national income rises in the main arm until 2031–36 (A3).
- 2036 is the debt rule's first year: G falls 2–23% and investment jumps in every arm. No 2036 flow should be quoted (A9).
- The UK central main arm gives GDP +0.92% against the IMF's +2.5% at year 4 for the same TFP. The capital closure is sufficient to account for the difference (section 7).

## 1. Identities

All recomputed from the exported series; none is read from the records' own `identities_maxabs`.

| check | years | worst error, all 18 solves |
|---|---|---|
| K = K_d + K_f | 2026–36 | 0 |
| K_d = B − D_d | 2026–36 | 0 |
| D = D_d + D_f | 2026–36 | 1.7e-16 (relative) |
| GNI = Y − r_p(K_f + D_f) | 2026–36 | 1.6e-16 |
| NNI = GNI − δK, δ = 0.065 as recorded in each record | 2026–36 | 1.9e-16 |
| Y = Z_t K^γ_t L^(1−γ_t), with γ_t and Z_t rebuilt from the ramp weights | 2026–36 | 7.9e-6 |
| w = (1 − γ_t) Y/L | 2026–36 | 8.7e-6 |
| r + δ = 0.826 γ_t Y/K + 0.0086, fitted on the continuation only | 2026–36 | 0.18bp |
| resource constraint Y − C − I_d − G − (r_p + δ)K_f + new foreign borrowing − foreign debt service, share of GDP | 2028–36 | 4.1e-6 |
| same, 2027 (the baseline's year) | 2027 | 5.8e-7 |
| I_total = growth × K_{t+1} − (1 − δ)K_t with the continuation's growth factors | 2028–35 | 0 |
| every exported series equals the committed baseline (`baseline_ext.json`) | 2026–27 | 0 (exact) |
| B, D, D_d, D_f and K_d equal the continuation's | 2028 | 0 (exact) |
| labour share wL/Y equals 65% − target × ramp weight | 2026–36 | 0.0005pp |
| K_f = ζK × (capital demand at the 2% world rate − K_d), rebuilt with each arm's γ_t and Z_t | 2026–36 | ratio 1.0020–1.0024 in every run (continuation 1.0023–1.0024) |
| new foreign gilts = 0.4 × new borrowing; foreign debt service = r_p D_f | 2026–35 | 9e-15 |
| debt law of motion, share of GDP | 2026–35 | 1.7e-4 (see A12) |
| continuation against the committed baseline, max relative | 2028–36 | Y 5e-6, K 1e-6, r 2e-5 |

- **The 2026–27 zeros are a splice.** Those years are copied from the baseline, so their equality proves the copy. The test of the restart is the 2028 row: wealth, debt and domestic capital at the start of 2028 equal the continuation's exactly in all 16 arm solves.
- **The ramp is in the right years.** The production function and the wage condition hold with weights 0.25, 0.5, 0.75 and 1 in 2028–2031. The labour-share gap in 2031 is −0.700, −1.600, −2.900 and −3.900pp.
- **The γ patch reaches every rule that uses it.** The interest-rate condition and the foreign-capital rule both hold with the arm's own γ_t, with the same constants as the continuation.
- **Z is as documented.** Each fixed-input Z, re-derived from the continuation's 2027 K and L, equals the recorded `Z_terminal` to 2e-16.
- **My gaps equal the sanity gate's.** Across all 2028 and 2031 gaps and the 2031 tax/GDP change in the 18 `.sanity.json` files, the largest difference is 1.2e-14. The gate recorded 0 fails and 4 flags, all of them the investment-jump flag on the four Korinek solves (A7).

**One stock-flow break, disclosed in the design (decision 5).** At ζK = 0.1, foreign capital is reset on impact, so 2028 capital is higher than 2027 capital plus 2027 investment. The capital that appears with no investment recorded is 0.5% of GDP (UK low), 1.1% (UK central), 2.2% (UK high) and 3.1% (Korinek) in the main arm. At ζK = 0 it is zero.

## 2. Accounting decomposition of the 2031 GDP gap

The split is exact in logs: Δln Y = [ln Z + Δγ · ln(K₀/L₀)] + γ₁ Δln K + (1 − γ₁) Δln L, with K₀ and L₀ the continuation's 2031 inputs. The bracket is the technology change at the reference inputs. Raw ln Z is negative in every arm (−0.9 to −7.0 log points) because a higher γ raises K^γ L^(1−γ) at given inputs, so ln Z alone is not a TFP term. The literal split asked for (Δ ln Z, Δ(γ ln K), Δ((1 − γ) ln L)) is also printed by the script and sums to the gap with the same residual.

Log points × 100. The residual is under 1.1e-4 in every row.

| closure | scenario | arm | technology | capital | labour | sum = GDP gap |
|---|---|---|---|---|---|---|
| ζK 0.1 | UK low | automation + productivity | +0.190 | +0.310 | −0.086 | +0.414 |
| | | technology unchanged | −0.010 | +0.286 | −0.081 | +0.195 |
| | | stress test | −0.185 | +0.266 | −0.077 | +0.004 |
| ζK 0.1 | UK central | automation + productivity | +0.377 | +0.729 | −0.193 | +0.913 |
| | | technology unchanged | −0.023 | +0.680 | −0.184 | +0.473 |
| | | stress test | −0.448 | +0.628 | −0.175 | +0.005 |
| ζK 0.1 | UK high | automation + productivity | +1.547 | +1.519 | −0.363 | +2.702 |
| | | technology unchanged | −0.041 | +1.303 | −0.330 | +0.932 |
| | | stress test | −0.881 | +1.190 | −0.312 | −0.003 |
| ζK 0.1 | Korinek | automation + productivity | +2.998 | +2.277 | −0.500 | +4.775 |
| | | technology unchanged | −0.055 | +1.829 | −0.439 | +1.335 |
| | | stress test | −1.243 | +1.659 | −0.416 | −0.000 |
| ζK 0 | UK central | automation + productivity | +0.379 | +0.243 | −0.256 | +0.366 |
| | | technology unchanged | −0.020 | +0.230 | −0.243 | −0.033 |
| | | stress test | +0.014 | +0.231 | −0.244 | +0.001 |
| ζK 0 | Korinek | automation + productivity | +3.004 | +0.692 | −0.694 | +3.002 |

- **Capital is the larger half of the main arm's gap at ζK = 0.1.** For UK central: +0.73 from capital and +0.38 from technology, less 0.19 from labour.
- **At ζK = 0 capital and labour cancel.** For UK central capital adds 0.24 and labour takes 0.26, so GDP moves by the technology term alone (+0.37). The Korinek main arm is the same: +0.69 and −0.69, leaving the technology term (+3.00).
- **The technology term is 2–6% short of its label.** The target (+0.4% for UK central) is set at the 2027 inputs. At the continuation's 2031 inputs it is +0.377%, and +0.366% at 2036, because the baseline's K/L falls after 2027. For the same reason "technology unchanged" is −0.02%, not zero. This is small against the scenario sizes (A11).

## 3. Wage logic

With w = (1 − γ)Y/L, Δln w = Δln(1 − γ) + Δln(Y/L). It holds in every arm solve with a residual under 6e-5 log points × 100. That check only tests the identity, so the table also splits Δln(Y/L) into technology and capital deepening, γ₁ Δln(K/L).

2031, log points × 100.

| closure | scenario | arm | share effect Δln(1 − γ) | technology | capital deepening | wage Δln w | wage gap % |
|---|---|---|---|---|---|---|---|
| ζK 0.1 | UK low | automation + productivity | −1.083 | +0.190 | +0.357 | −0.536 | −0.53 |
| | | technology unchanged | −1.083 | −0.010 | +0.331 | −0.761 | −0.76 |
| | | stress test | −1.083 | −0.185 | +0.309 | −0.959 | −0.95 |
| ζK 0.1 | UK central | automation + productivity | −2.492 | +0.377 | +0.841 | −1.275 | −1.27 |
| | | technology unchanged | −2.492 | −0.023 | +0.786 | −1.729 | −1.71 |
| | | stress test | −2.492 | −0.448 | +0.728 | −2.212 | −2.19 |
| ζK 0.1 | UK high | automation + productivity | −4.564 | +1.547 | +1.740 | −1.277 | −1.27 |
| | | technology unchanged | −4.564 | −0.041 | +1.504 | −3.101 | −3.05 |
| | | stress test | −4.564 | −0.881 | +1.381 | −4.065 | −3.98 |
| ζK 0.1 | Korinek | automation + productivity | −6.188 | +2.998 | +2.595 | −0.594 | −0.59 |
| | | technology unchanged | −6.188 | −0.055 | +2.108 | −4.134 | −4.05 |
| | | stress test | −6.188 | −1.243 | +1.924 | −5.507 | −5.36 |
| ζK 0 | UK central | automation + productivity | −2.492 | +0.379 | +0.391 | −1.723 | −1.71 |
| | | technology unchanged | −2.492 | −0.020 | +0.370 | −2.143 | −2.12 |
| | | stress test | −2.492 | +0.014 | +0.372 | −2.107 | −2.09 |
| ζK 0 | Korinek | automation + productivity | −6.188 | +3.004 | +1.134 | −2.050 | −2.03 |

**UK high and UK central both show −1.27%: a genuine offset, not a bug.**
- The two numbers are not equal: −1.2668% and −1.2692%.
- UK high's extra share fall costs 2.072 log points (−4.564 against −2.492).
- Its extra output per hour gives back 2.069: +1.170 from technology (1.547 against 0.377) and +0.900 from capital deepening (1.740 against 0.841).
- The two differ by 0.002, so the wage is the same to two decimals.

**A rule that fits all four scenarios** at ζK = 0.1 in 2031: the wage gap is about −1.06 × (share fall in pp) + 1.12 × (TFP gain in %). The coefficients are −1.083 to −1.038 and 1.115 to 1.121 across scenarios.
- The wage is unchanged when the TFP gain in % is about 0.95 times the share fall in pp.
- The scenarios' ratios are 0.29 (low), 0.25 (central), 0.55 (high) and 0.79 (Korinek). All are below 0.95, so the wage falls in every main arm.
- UK central has the lowest ratio, which is why its wage falls as far as UK high's.
- At ζK = 0 the UK central coefficients are −1.33 and 1.03, and the break-even ratio is 1.29. Applied to the Korinek inputs they give −1.98%; the solve gives −2.03%.

## 4. Cross-scenario consistency

2031 gaps at ζK = 0.1.

| scenario | arm | GDP % | GNI % | NNI % | K % | L % | wage % | C % | I % | Δr bp | debt/GDP pp | tax/GDP pp |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| UK low | automation + productivity | +0.41 | +0.27 | +0.14 | +0.87 | −0.13 | −0.53 | −0.16 | +1.60 | +16.9 | −0.07 | −0.08 |
| | technology unchanged | +0.20 | +0.06 | −0.10 | +0.81 | −0.13 | −0.76 | −0.27 | +1.21 | +15.2 | +0.17 | −0.09 |
| | stress test | +0.004 | −0.13 | −0.31 | +0.75 | −0.12 | −0.95 | −0.37 | +0.86 | +13.7 | +0.38 | −0.10 |
| UK central | automation + productivity | +0.92 | +0.57 | +0.27 | +2.01 | −0.30 | −1.27 | −0.39 | +3.58 | +37.8 | −0.13 | −0.19 |
| | technology unchanged | +0.47 | +0.15 | −0.21 | +1.88 | −0.29 | −1.71 | −0.61 | +2.78 | +34.4 | +0.35 | −0.21 |
| | stress test | +0.005 | −0.30 | −0.72 | +1.73 | −0.27 | −2.19 | −0.84 | +1.94 | +30.7 | +0.87 | −0.24 |
| UK high | automation + productivity | +2.74 | +2.02 | +1.58 | +4.09 | −0.58 | −1.27 | −0.20 | +8.32 | +75.5 | −1.35 | −0.29 |
| | technology unchanged | +0.94 | +0.32 | −0.35 | +3.50 | −0.53 | −3.05 | −1.08 | +5.10 | +61.5 | +0.57 | −0.40 |
| | stress test | −0.003 | −0.57 | −1.36 | +3.19 | −0.50 | −3.98 | −1.53 | +3.42 | +54.2 | +1.59 | −0.46 |
| Korinek | automation + productivity | +4.89 | +3.80 | +3.33 | +6.03 | −0.82 | −0.59 | +0.28 | +13.22 | +109.2 | −3.02 | −0.35 |
| | technology unchanged | +1.34 | +0.47 | −0.44 | +4.81 | −0.72 | −4.05 | −1.42 | +6.93 | +81.9 | +0.67 | −0.55 |
| | stress test | −0.000 | −0.79 | −1.87 | +4.36 | −0.68 | −5.36 | −2.07 | +4.53 | +71.4 | +2.14 | −0.63 |

**Monotonic in shock size, main arm (low < central < high < Korinek):**
- GDP +0.41, +0.92, +2.74, +4.89: yes.
- Capital +0.87, +2.01, +4.09, +6.03: yes.
- Δr +16.9, +37.8, +75.5, +109.2bp: yes.
- GNI, NNI, labour, investment, debt/GDP and tax/GDP: yes.
- **Wage −0.53, −1.27, −1.27, −0.59: no.** The scenarios differ in two dimensions, and the wage follows the TFP-to-share ratio (section 3, A2).
- **Consumption −0.16, −0.39, −0.20, +0.28: no.** Same cause: it is about −0.37 per pp of share fall and +0.55 per 1% of TFP.
- **GDP per unit of TFP 2.07, 2.29, 1.71, 1.58: no.** GDP is close to additive in the two shocks: 0.28–0.34 per pp of share fall (the technology-unchanged arm) plus 1.10–1.14 per 1% of TFP. The share shift adds a fixed amount, so GDP/TFP is highest where TFP is smallest relative to the share fall. The marginal effect of TFP is 1.10, 1.11, 1.13 and 1.14.

The technology-unchanged and stress-test arms are monotonic in every column.

**The stress test's 2031 GDP is zero** within the 0.01pp tolerance in all five solved sets: +0.004, +0.005, −0.003 and −0.000 at ζK = 0.1, and +0.001 at ζK = 0. The rejected Korinek iteration (`r4_1`) is −0.019.

**Technology unchanged sits between the other two arms at ζK = 0.1**, for every variable and every scenario. **At ζK = 0 it does not:** its GDP (−0.033%) is below the stress test's (+0.001%). See A1.

**Closures, 2031 (UK central, and the Korinek main arm):**

| arm | closure | GDP % | GNI % | NNI % | K % | L % | wage % | C % | Δr bp | debt/GDP pp | tax/GDP pp |
|---|---|---|---|---|---|---|---|---|---|---|---|
| automation + productivity | ζK 0.1 | +0.92 | +0.57 | +0.27 | +2.01 | −0.30 | −1.27 | −0.39 | +37.8 | −0.13 | −0.19 |
| | ζK 0 | +0.37 | +0.30 | +0.23 | +0.67 | −0.40 | −1.71 | −0.52 | +48.3 | +0.33 | −0.01 |
| technology unchanged | ζK 0.1 | +0.47 | +0.15 | −0.21 | +1.88 | −0.29 | −1.71 | −0.61 | +34.4 | +0.35 | −0.21 |
| | ζK 0 | −0.03 | −0.10 | −0.24 | +0.63 | −0.38 | −2.12 | −0.73 | +44.0 | +0.78 | −0.05 |
| stress test | ζK 0.1 | +0.005 | −0.30 | −0.72 | +1.73 | −0.27 | −2.19 | −0.84 | +30.7 | +0.87 | −0.24 |
| | ζK 0 | +0.001 | −0.06 | −0.20 | +0.63 | −0.38 | −2.09 | −0.71 | +44.4 | +0.74 | −0.04 |
| Korinek, automation + productivity | ζK 0.1 | +4.89 | +3.80 | +3.33 | +6.03 | −0.82 | −0.59 | +0.28 | +109.2 | −3.02 | −0.35 |
| | ζK 0 | +3.05 | +2.88 | +3.09 | +1.80 | −1.13 | −2.03 | −0.16 | +141.9 | −1.56 | **+0.21** |

- **Smaller K response at ζK = 0:** UK central +0.63 to +0.67% against +1.73 to +2.01%; Korinek +1.80% against +6.03%. As expected.
- **Larger Δr:** UK central +44 to +48bp against +31 to +38bp; Korinek +142bp against +109bp. As expected.
- **GNI ≈ GDP:** the wedge at ζK = 0 is 0.07pp for UK central and 0.17pp for Korinek (foreign-held gilts only), against 0.30–0.35pp and 1.09pp at ζK = 0.1. As expected.
- **NNI barely depends on the closure in the main arm** (UK central +0.27 and +0.23%; Korinek +3.33 and +3.09%). The extra capital at ζK = 0.1 is 77–80% foreign-owned, so most of its return and all of its depreciation leave national income.
- **Tax/GDP is the one variable whose sign depends on the closure:** the Korinek main arm at ζK = 0 is +0.21pp (section 8, A6).
- **Who finances the extra capital.** At ζK = 0.1 in 2031, foreign capital is 76–80% of ΔK in every arm, household wealth 25–36%, less 6–12% for extra gilts held at home. At ζK = 0, household wealth is 117–128% of ΔK, less 17–28% for gilts.
- **Capital-supply elasticity** (Δln K over Δln of the rental rate γY/K), main arm, 2031: 0.57, 0.59, 0.60 and 0.62 at ζK = 0.1; 0.16 (UK central) and 0.15 (Korinek) at ζK = 0. By 2036 it is 0.75–0.94 at ζK = 0.1, and 0.37 and 0.50 at ζK = 0.

## 5. Dynamics

### The 2028 announcement year

| scenario, ζK 0.1 | arm | I % | L % | C % | GDP % | K % |
|---|---|---|---|---|---|---|
| UK low | automation + productivity | +3.39 | +0.07 | −0.23 | +0.16 | +0.19 |
| UK central | automation + productivity | +7.82 | +0.17 | −0.55 | +0.36 | +0.43 |
| | technology unchanged | +7.55 | +0.23 | −0.68 | +0.30 | +0.41 |
| | stress test | +7.27 | +0.30 | −0.83 | +0.23 | +0.39 |
| UK high | automation + productivity | +15.07 | +0.17 | −0.66 | +0.80 | +0.82 |
| Korinek | automation + productivity | +21.33 | +0.07 | −0.53 | +1.22 | +1.14 |
| | technology unchanged | +19.00 | +0.54 | −1.61 | +0.74 | +1.02 |
| | stress test | +18.14 | +0.73 | −2.02 | +0.56 | +0.97 |
| UK central, ζK 0 | automation + productivity | +3.16 | +0.22 | −0.72 | +0.24 | 0.00 |
| Korinek, ζK 0 | automation + productivity | +6.70 | +0.22 | −1.06 | +0.91 | 0.00 |

- **Direction is the same in every solve:** investment up, labour up, consumption down. Households learn that wages will be lower and returns higher, so they work more and save more now.
- **Investment is monotonic in shock size.** It is the flow needed to move capital to next year's target with no adjustment cost: the capital gap rises by about 0.5pp a year for UK central, and investment is 7.8% of capital, so 0.5/0.078 ≈ +7%.
- **It stays high for three years and then drops.** UK central: +7.8, +8.4, +8.9% in 2028–30, then +3.6% in 2031, when the ramp ends and capital only has to be maintained at its higher level.
- **Labour and consumption are not monotonic in the main arm** (labour +0.07, +0.17, +0.17, +0.07). A larger TFP gain raises lifetime income, which works against the extra labour supply. They are monotonic in the other two arms.
- **Labour changes sign.** It is up in 2028 and down by 2030 in every arm (UK central main arm: +0.17, +0.03, −0.13, −0.30%), as the wage falls and wealth builds.
- **At ζK = 0 the 2028 capital gap is exactly zero**, as the design says; the 2028 GDP gap (+0.24%) comes from labour and the first ramp step.

### After 2031

UK central, main arm, gaps by year.

| | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|
| GDP %, ζK 0.1 | +0.92 | +0.93 | +0.94 | +0.94 | +0.94 | +0.93 |
| GDP %, ζK 0 | +0.37 | +0.41 | +0.45 | +0.47 | +0.50 | +0.51 |
| K %, ζK 0.1 | +2.01 | +2.12 | +2.20 | +2.27 | +2.32 | +2.35 |
| L %, ζK 0.1 | −0.30 | −0.34 | −0.37 | −0.40 | −0.43 | −0.46 |
| wage %, ζK 0.1 | −1.27 | −1.22 | −1.18 | −1.15 | −1.12 | −1.10 |
| C %, ζK 0.1 | −0.39 | −0.30 | −0.23 | −0.15 | −0.09 | −0.02 |
| Δr bp, ζK 0.1 | +37.8 | +36.9 | +36.1 | +35.4 | +34.8 | +34.4 |
| debt/GDP pp, ζK 0.1 | −0.13 | +0.30 | +0.72 | +1.14 | +1.57 | +1.99 |

- **GDP is flat at ζK = 0.1 and still rising at ζK = 0.** At 0.1 most of the capital arrives with the technology (the foreign inflow), and after 2031 slower capital growth is offset by falling labour. At 0 capital comes only from household saving, so it keeps building: +0.67% in 2031, +1.36% in 2036.
- **The wage recovers slowly** as capital deepens: 0.17pp in five years at ζK = 0.1. The Korinek main arm's wage turns positive in 2035 (+0.13%).
- **Consumption recovers** as wealth builds, and reaches zero around 2036 for UK central and UK low, 2032 for UK high.

### Debt/GDP to 2036, and why

pp gap. The last four columns rerun the debt recursion on the continuation's path, swapping in one of the arm's paths at a time; they do not add up exactly because the three interact.

| ζK 0.1 | arm | 2031 | 2035 | 2036 | 2036 from the interest rate alone | from the primary balance/GDP alone | from GDP growth alone |
|---|---|---|---|---|---|---|---|
| UK low | automation + productivity | −0.07 | +0.66 | +0.84 | +1.07 | +0.22 | −0.45 |
| | stress test | +0.38 | +1.25 | +1.47 | +0.90 | +0.52 | +0.04 |
| UK central | automation + productivity | −0.13 | +1.57 | +1.99 | +2.43 | +0.56 | −0.98 |
| | technology unchanged | +0.35 | +2.20 | +2.67 | +2.24 | +0.88 | −0.46 |
| | stress test | +0.87 | +2.88 | +3.40 | +2.04 | +1.23 | +0.10 |
| UK high | automation + productivity | −1.35 | +1.39 | +2.07 | +4.83 | +0.36 | −3.00 |
| | stress test | +1.59 | +5.27 | +6.24 | +3.64 | +2.32 | +0.21 |
| Korinek | automation + productivity | −3.02 | +0.32 | +1.12 | +6.97 | −0.19 | −5.31 |
| | stress test | +2.14 | +7.14 | +8.45 | +4.84 | +3.20 | +0.30 |
| **ζK 0**, UK central | automation + productivity | +0.33 | +1.65 | +1.98 | +3.12 | −0.58 | −0.55 |
| | stress test | +0.74 | +2.23 | +2.61 | +2.90 | −0.22 | −0.08 |
| **ζK 0**, Korinek | automation + productivity | −1.56 | +0.54 | +1.03 | +9.13 | −3.59 | −4.07 |

- **Debt/GDP is higher in every arm by 2036.** In the main arm it is lower in 2031 at ζK = 0.1 and turns positive in 2032 (UK low and central), 2033 (UK high) and 2035 (Korinek).
- **The interest rate is the cause.** The return on gilts moves one for one with r (+37.8bp for UK central), and the model's debt is one-period, so the whole stock (95% of GDP) reprices at once. That alone adds 2.4pp by 2036 for UK central.
- **Higher GDP does not pay it back under this spending rule.** G and transfers are fixed shares of GDP, so they rise with GDP. The only gain from growth is the denominator (−1.0pp). Tax/GDP falls, which adds 0.6pp.
- **The 2031 figure alone misleads.** −0.13pp in 2031 is the denominator effect of the first years; the path is rising by 0.42pp a year from 2032.
- This is the same mechanism as in the 2026-start runs (`docs/literature_comparison.md`, 3.5: whole-stock repricing, and the spending convention). The fixed-spending and debt-neutral variants are not solved yet, so the fiscal results under the OBR's convention cannot be checked here.

### The stress test after its target year

| | GDP gap 2031 | 2036 | change | of which technology | capital | labour |
|---|---|---|---|---|---|---|
| UK low, ζK 0.1 | +0.004 | −0.045 | −0.049 | −0.005 | −0.011 | −0.032 |
| UK central, ζK 0.1 | +0.005 | −0.112 | −0.116 | −0.012 | −0.033 | −0.071 |
| UK high, ζK 0.1 | −0.003 | −0.229 | −0.227 | −0.021 | −0.080 | −0.125 |
| Korinek, ζK 0.1 | −0.000 | −0.319 | −0.320 | −0.028 | −0.126 | −0.165 |
| UK central, ζK 0 | +0.001 | +0.065 | +0.065 | −0.009 | +0.167 | −0.093 |

See A8 for why the sign differs by closure.

## 6. Against the 2026-start results

Korinek-sized arms at ζK = 0.1. "Old" is the committed 2026-start run (`analysis/rerun/output/zk0.1`, the source of `data/scenarios.json` on `main`), 2030 gap against its baseline. "New" is the surprise run's 2031 gap.

| | main arm: old 2030 | new 2031 | new/old | technology unchanged: old | new | new/old | stress test: old | new |
|---|---|---|---|---|---|---|---|---|
| GDP % | +4.896 | +4.890 | 0.999 | +1.396 | +1.344 | 0.96 | −0.001 | −0.000 |
| GNI % | +3.820 | +3.796 | 0.994 | +0.547 | +0.472 | 0.86 | −0.762 | −0.791 |
| K % | +6.101 | +6.028 | 0.988 | +5.060 | +4.813 | 0.95 | +4.650 | +4.357 |
| L % | −0.830 | −0.815 | 0.98 | −0.761 | −0.716 | 0.94 | −0.734 | −0.678 |
| wage % | −0.572 | −0.592 | 1.04 | −3.957 | −4.050 | 1.02 | −5.306 | −5.358 |
| C % | +0.310 | +0.278 | 0.90 | −1.297 | −1.418 | 1.09 | −1.944 | −2.066 |
| I % | +13.26 | +13.22 | 1.00 | +6.94 | +6.93 | 1.00 | +4.40 | +4.53 |
| Δr bp | +108.3 | +109.2 | 1.01 | +79.6 | +81.9 | 1.03 | +68.0 | +71.4 |
| debt/GDP pp | −3.08 | −3.02 | 0.98 | +0.71 | +0.67 | 0.96 | +2.29 | +2.14 |

- **Korinek 2031 ≈ old 2030: confirmed at ζK = 0.1.** In the main arm every variable is within 4% of the old value except consumption (−0.03pp on a small base). GDP differs by 0.006pp.
- **The new path is the old path moved one year, without the anticipation year.** Investment gaps: old 2027–30 are +21.34, +25.45, +29.64, +13.26; new 2028–31 are +21.33, +25.44, +29.64, +13.22. Capital gaps: old +1.26, +2.68, +4.30, +6.10; new +1.14, +2.58, +4.21, +6.03.
- **Later years match too:** GDP +5.27% in the old 2035 and +5.26% in the new 2036.
- **The other two arms lose a little more** (K −0.25 and −0.29pp, GNI −0.08 and −0.03pp). In the old runs, households saved more in the anticipation year: household wealth was +1.45% and +1.51% in 2030, against +1.19% and +1.18% in 2031 now.
- All differences are far inside the gate's 30% band. See A10 for why the design's "somewhat smaller" expectation turned out to be "almost the same".

**At ζK = 0 the surprise run is somewhat smaller, as the design expected.** Korinek main arm (the only Korinek arm solved at ζK = 0):

| | old 2030 | new 2031 | new/old |
|---|---|---|---|
| GDP % | +3.099 | +3.047 | 0.98 |
| GNI % | +2.937 | +2.875 | 0.98 |
| K % | +2.001 | +1.795 | 0.90 |
| L % | −1.156 | −1.130 | 0.98 |
| wage % | −1.954 | −2.029 | 1.04 |
| C % | −0.079 | −0.160 | 2.0 (−0.08pp) |
| I % | +12.66 | +12.67 | 1.00 |
| Δr bp | +139.8 | +141.9 | 1.02 |
| debt/GDP pp | −1.64 | −1.56 | 0.95 |

- With no foreign inflow, all extra capital comes from household saving, so the lost year matters: capital gaps were +0.28, +0.73, +1.31, +2.00% in the old 2027–30 and are 0.00, +0.48, +1.09, +1.80% in the new 2028–31.
- Capital is 10% smaller and GDP 2% smaller. Everything is inside the 30% band except consumption, which is inside the 0.25pp floor.

## 7. Against the literature

Sources and locations are as in `docs/literature_comparison.md` (origin/docs/literature-comparison) and `docs/uk_calibration.md`. "(ours)" marks arithmetic done here.

### IMF UK (SIP/2026/072): output +3.26% at year 5 with TFP +0.53%

| | IMF, year 4 | IMF, year 5 | UK central, ζK 0.1, 2031 (year 4) | 2032 (year 5) | UK central, ζK 0, 2031 |
|---|---|---|---|---|---|
| TFP input | +0.42% | +0.53% | +0.40% target, +0.38% at 2031 inputs | same | +0.38% |
| output | +2.52% (digitised, `uk_calibration.md`) | +3.26% | +0.92% | +0.93% | +0.37% |
| output per unit of TFP (ours) | 6.0 | 6.2 | 2.3 | 2.3 | 0.9 |
| output less TFP (ours) | 2.1pp | 2.7pp | 0.5pp | 0.5pp | 0.0pp |

**Why ours is lower: capital supply.** The TFP input is the same by construction, so the whole gap is in what capital and labour add.
- In the IMF model capital deepens enough to add about 2.1pp at year 4. Ours adds 0.73pp from capital (K +2.0%) and loses 0.19pp from labour.
- **A bound shows this is the closure and not the shock** (arithmetic on the UK central inputs, not a solve). If capital were supplied at an unchanged return, γY/K would stay at its baseline value. With labour unchanged that needs K +7.9% and gives **GDP +3.2%**; with the arm's own labour gap it gives +2.9%. That brackets the IMF's +2.5% (year 4) and +3.3% (year 5).
- In the solve, the return rises 38bp instead, and capital rises 2.0%: a capital-supply elasticity of 0.59. ζK = 0.1 lets in 10% of the excess demand for capital at the world rate, and household saving has had four years.
- **So the closure is sufficient to account for the difference, with the horizon second.** The bound is arithmetic that brackets the IMF figure; it does not show that the IMF model works the same way. The elasticity rises to 0.75 by 2036 and 1.39 in the steady state (the gate's diagnostic), and GDP per unit of TFP to 3.7 in the steady state.
- **The other three features do not explain it.** No unemployment: labour falls 0.3% through hours, a 0.19pp effect. The tax gap affects revenue, not GDP. The surprise timing costs nothing (section 6).
- **Our 2.3 flatters the TFP response.** 0.47pp of the 0.92% comes from the share shift with technology unchanged. The marginal effect of TFP is (0.92 − 0.47)/0.4 = 1.1.

Verdict: **plausible given the closure, and below the IMF for a stated reason.** The copy should say that the central closure delivers about a third of the IMF's output effect for the same TFP, and why.

### OBR

| OBR figure | like-for-like model number | model | position | explained by |
|---|---|---|---|---|
| FRS 2026 Box 4.1: tax/GDP −0.19pp per pp of labour-share fall, GDP unchanged (−0.23 with the Nov 2025 EFO rates) | stress test, ζK 0.1, per pp | −0.150 (low), −0.153 (central), −0.158 (high), −0.161 (Korinek) | 71–77% of the midpoint | the tax gap: OG-UK's labour–capital wedge is about 14pp against the OBR's 19–23pp (`docs/red_flags_1_3.md`) |
| same | stress test, ζK 0, per pp | −0.027 | 13% | closure: r rises 44bp on all household wealth, and the single income-tax schedule taxes that (A6) |
| March 2026 EFO ¶6.18, displacement scenario: receipts −0.17% of GDP, GDP unchanged; implied share fall about 0.7pp (ours, in the literature note) | UK low stress test (0.7pp), ζK 0.1: receipts, % of GDP | −0.10 | 61% | the tax gap; no unemployment (the OBR's fall is mostly lower employment and VAT) |
| same: debt +1.3% of GDP by 2030-31, with spending held at plans and welfare +£3bn a year | UK low stress test: debt/GDP | +0.38pp in 2031, +1.47pp in 2036 | 29% at year 4 | no unemployment or welfare channel; smaller revenue fall; the model's G/Y rule (fixed spending not solved yet) |
| Central AI productivity: +0.2pp a year by year five, about +0.4% on the level at year 4 (ours) | UK central TFP target | +0.4% | equal by construction | the baseline already contains this assumption (A11) |

- **UK central's stress test is 2.3 times the OBR's displacement case** on the share fall (1.6pp against about 0.7pp), and gives receipts −0.24% of GDP and debt +0.87pp in 2031. UK low is the like-for-like size.
- **Korinek et al.'s own numbers** are unchanged as a comparison from the 2026-start runs (GDP +4.9% at ζK = 0.1 and +3.0% at ζK = 0 against their +8.3%; elasticity 0.62 and 0.15 against their lowest case of 1), since the Korinek arm reproduces the old results.

## 8. Tax diagnostics

2031 change in tax/GDP, pp, and its split by base. Payroll is 15% of the labour share by construction (−0.15pp per pp of share fall); it is booked inside the income-tax line in the records and separated here.

| closure | scenario | arm | tax/GDP pp | per pp of share fall | OBR −0.19 to −0.23: sign | payroll | income tax and employee NICs | business | consumption | bequest and wealth |
|---|---|---|---|---|---|---|---|---|---|---|
| ζK 0.1 | UK low | automation + productivity | −0.078 | −0.111 | same | −0.105 | −0.026 | +0.112 | −0.055 | −0.004 |
| | | technology unchanged | −0.092 | −0.132 | same | −0.105 | −0.054 | +0.108 | −0.045 | +0.003 |
| | | stress test | −0.105 | −0.150 | same | −0.105 | −0.078 | +0.105 | −0.035 | +0.008 |
| ζK 0.1 | UK central | automation + productivity | −0.187 | −0.117 | same | −0.240 | −0.069 | +0.255 | −0.124 | −0.008 |
| | | technology unchanged | −0.215 | −0.134 | same | −0.240 | −0.124 | +0.248 | −0.103 | +0.004 |
| | | stress test | −0.245 | −0.153 | same | −0.240 | −0.182 | +0.240 | −0.081 | +0.018 |
| ζK 0.1 | UK high | automation + productivity | −0.292 | −0.101 | same | −0.435 | −0.014 | +0.477 | −0.274 | −0.046 |
| | | technology unchanged | −0.400 | −0.138 | same | −0.435 | −0.229 | +0.449 | −0.191 | +0.006 |
| | | stress test | −0.457 | −0.158 | same | −0.435 | −0.343 | +0.434 | −0.147 | +0.033 |
| ζK 0.1 | Korinek | automation + productivity | −0.347 | −0.089 | same | −0.585 | +0.097 | +0.658 | −0.421 | −0.095 |
| | | technology unchanged | −0.550 | −0.141 | same | −0.585 | −0.312 | +0.604 | −0.261 | +0.005 |
| | | stress test | −0.628 | −0.161 | same | −0.585 | −0.472 | +0.582 | −0.198 | +0.044 |
| ζK 0 | UK central | automation + productivity | −0.006 | −0.004 | same, by 0.006pp | −0.240 | +0.032 | +0.273 | −0.087 | +0.015 |
| | | technology unchanged | −0.046 | −0.029 | same | −0.240 | −0.030 | +0.265 | −0.068 | +0.027 |
| | | stress test | −0.042 | −0.027 | same | −0.240 | −0.025 | +0.266 | −0.070 | +0.026 |
| ζK 0 | Korinek | automation + productivity | **+0.207** | **+0.053** | **opposite** | −0.585 | +0.413 | +0.710 | −0.304 | −0.027 |

- **The sign is right in 2031 in every solved arm except one.** The Korinek main arm at ζK = 0 has tax/GDP +0.207pp with the labour share 3.9pp lower. It is negative in 2028 (−0.02pp) and positive from 2029. This is the table's one **wrong** cell (A6).
- **Size at ζK = 0.1:** 0.15–0.16 per pp in the stress test, 0.13–0.14 with technology unchanged, 0.09–0.12 in the main arm. Against the OBR's 0.19–0.23 that is about three quarters, two thirds and a half.
- **Size at ζK = 0, UK central:** 0.03 per pp in the two no-TFP arms and 0.004 in the main arm, which is zero for practical purposes.
- **At ζK = 0 the UK central main arm's sign is also wrong from 2032:** 0.000, +0.007, +0.014, +0.021, +0.029pp in 2032–36. At ζK = 0.1 no arm turns positive in any year.
- **The pattern is one mechanism.** UK central's two arms at ζK = 0 give about −0.03 per pp of share fall and +0.10 per 1% of TFP. That rule predicts +0.20pp for the Korinek main arm; the solve gives +0.21pp. Tax/GDP turns positive once the TFP gain in % exceeds about 0.3 times the share fall in pp. UK central (0.25) is just below that in 2031 and Korinek (0.79) is above it. UK high (0.55) is not solved at ζK = 0; the rule predicts +0.08pp, a second wrong sign.
- **This reproduces the 2026-start result** (+0.20pp for the same arm), which is red flag 3 in the literature note.
- **Receipts in levels** rise in the main arm (+0.20% of GDP for UK central) because GDP rises. Only the stress test (GDP unchanged) is comparable with the OBR's ¶6.18.
- The bases sum to the total to 1e-14 in every row.

## Verdict table

One block per scenario and closure. Rows are 2031 gaps against the continuation unless a year is given. Codes A1–A8 refer to the anomalies below.

**How the expectations were set.** The expected signs come from the model's structure and from `analysis/surprise/expectations.json`, which was committed before any surprise solve. The rules below for "surprising-but-explained" and "wrong" were written during this audit, after the first gaps had been read, so they are not a blind test. One rule changed during the audit: NNI was first required to rise by less than GNI in per cent; it is now required to rise by less in levels, because NNI = GNI − δK guarantees only that (A5). The rule that a rising tax/GDP in 2031 is wrong was fixed before the solve that breaks it landed.

Rules used for "surprising-but-explained":
- technology-unchanged GDP or GNI below zero (A1);
- the main arm's wage falling while GDP rises (A2);
- the main arm's consumption falling while GNI rises (A3);
- the main arm's debt/GDP, whose sign changes between 2031 and 2036 or is positive with higher GDP (A4);
- NNI below zero while GNI is above zero, or NNI rising by more than GNI in per cent (A5);
- tax/GDP falling by less than half the OBR's lower figure per pp (A6);
- the 2028 investment jump (A7);
- the stress test's GDP more than 0.01pp from zero in 2036 (A8).

"Wrong" is a broken identity, a GNI gap above the GDP gap, NNI rising by more than GNI in levels, a labour share off target, tax/GDP rising in 2031, or a sign against a firm expectation. The table covers 2031 and three other dated rows only; a sign that changes in another year is in the anomalies, not in a cell.

**UK low, ζK 0.1** (labour share −0.7pp, TFP +0.2%). Runs: automation + productivity: `uk_low_share_shift_tfp_ramp`; technology unchanged: `uk_low_share_shift_ramp_zfixed`; stress test (2031 GDP held): `uk_low_share_shift_ramp_r4_1`

| gap (2031 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2031 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +0.41 | consistent | small, sign open (>= 0 if capital flows in) | +0.20 | consistent | 0 within 0.01pp | +0.004 | consistent |
| GNI % | > 0, below GDP | +0.27 | consistent | below GDP | +0.06 | consistent | <= 0 | -0.13 | consistent |
| NNI % | below GNI | +0.14 | consistent | below GNI | -0.10 | surprising-but-explained (A5) | < 0 | -0.31 | consistent |
| capital % | > 0 | +0.87 | consistent | > 0 | +0.81 | consistent | > 0 | +0.75 | consistent |
| labour % | <= 0 by 2031 (wage falls) | -0.13 | consistent | <= 0 by 2031 (wage falls) | -0.13 | consistent | <= 0 by 2031 (wage falls) | -0.12 | consistent |
| wage % | sign open: share effect against productivity | -0.53 | surprising-but-explained (A2) | < 0 | -0.76 | consistent | < 0 | -0.95 | consistent |
| consumption % | sign open; > 0 expected if income rises | -0.16 | surprising-but-explained (A3) | < 0 | -0.27 | consistent | < 0 | -0.37 | consistent |
| investment % | > 0 | +1.60 | consistent | > 0 | +1.21 | consistent | > 0 | +0.86 | consistent |
| return, bp | > 0 | +16.9 | consistent | > 0 | +15.2 | consistent | > 0 | +13.7 | consistent |
| labour share, pp | = -target | -0.70 | consistent | = -target | -0.70 | consistent | = -target | -0.70 | consistent |
| debt/GDP, pp | sign open under the G/Y rule | -0.07 | surprising-but-explained (A4) | > 0 | +0.17 | consistent | > 0 | +0.38 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | -0.08 | consistent | < 0 (OBR sign) | -0.09 | consistent | < 0 (OBR sign) | -0.10 | consistent |
| 2028 investment % | > 0, a one-year jump | +3.39 | surprising-but-explained (A7) | > 0, a one-year jump | +3.27 | surprising-but-explained (A7) | > 0, a one-year jump | +3.15 | surprising-but-explained (A7) |
| 2028 labour % | > 0 (more work on the news) | +0.07 | consistent | > 0 (more work on the news) | +0.10 | consistent | > 0 (more work on the news) | +0.13 | consistent |
| 2028 consumption % | < 0 (more saving on the news) | -0.23 | consistent | < 0 (more saving on the news) | -0.30 | consistent | < 0 (more saving on the news) | -0.36 | consistent |
| 2036 GDP % | > 0 | +0.42 | consistent | small, sign open | +0.17 | consistent | near 0, not held after 2031 | -0.045 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | sign open under the G/Y rule | +0.84 | surprising-but-explained (A4) | > 0 | +1.18 | consistent | > 0 | +1.47 | consistent |

**UK central, ζK 0.1** (labour share −1.6pp, TFP +0.4%). Runs: automation + productivity: `uk_central_share_shift_tfp_ramp`; technology unchanged: `uk_central_share_shift_ramp_zfixed`; stress test (2031 GDP held): `uk_central_share_shift_ramp_r4_1`

| gap (2031 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2031 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +0.92 | consistent | small, sign open (>= 0 if capital flows in) | +0.47 | consistent | 0 within 0.01pp | +0.005 | consistent |
| GNI % | > 0, below GDP | +0.57 | consistent | below GDP | +0.15 | consistent | <= 0 | -0.30 | consistent |
| NNI % | below GNI | +0.27 | consistent | below GNI | -0.21 | surprising-but-explained (A5) | < 0 | -0.72 | consistent |
| capital % | > 0 | +2.01 | consistent | > 0 | +1.88 | consistent | > 0 | +1.73 | consistent |
| labour % | <= 0 by 2031 (wage falls) | -0.30 | consistent | <= 0 by 2031 (wage falls) | -0.29 | consistent | <= 0 by 2031 (wage falls) | -0.27 | consistent |
| wage % | sign open: share effect against productivity | -1.27 | surprising-but-explained (A2) | < 0 | -1.71 | consistent | < 0 | -2.19 | consistent |
| consumption % | sign open; > 0 expected if income rises | -0.39 | surprising-but-explained (A3) | < 0 | -0.61 | consistent | < 0 | -0.84 | consistent |
| investment % | > 0 | +3.58 | consistent | > 0 | +2.78 | consistent | > 0 | +1.94 | consistent |
| return, bp | > 0 | +37.8 | consistent | > 0 | +34.4 | consistent | > 0 | +30.7 | consistent |
| labour share, pp | = -target | -1.60 | consistent | = -target | -1.60 | consistent | = -target | -1.60 | consistent |
| debt/GDP, pp | sign open under the G/Y rule | -0.13 | surprising-but-explained (A4) | > 0 | +0.35 | consistent | > 0 | +0.87 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | -0.19 | consistent | < 0 (OBR sign) | -0.21 | consistent | < 0 (OBR sign) | -0.24 | consistent |
| 2028 investment % | > 0, a one-year jump | +7.82 | surprising-but-explained (A7) | > 0, a one-year jump | +7.55 | surprising-but-explained (A7) | > 0, a one-year jump | +7.27 | surprising-but-explained (A7) |
| 2028 labour % | > 0 (more work on the news) | +0.17 | consistent | > 0 (more work on the news) | +0.23 | consistent | > 0 (more work on the news) | +0.30 | consistent |
| 2028 consumption % | < 0 (more saving on the news) | -0.55 | consistent | < 0 (more saving on the news) | -0.68 | consistent | < 0 (more saving on the news) | -0.83 | consistent |
| 2036 GDP % | > 0 | +0.93 | consistent | small, sign open | +0.42 | consistent | near 0, not held after 2031 | -0.112 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | sign open under the G/Y rule | +1.99 | surprising-but-explained (A4) | > 0 | +2.67 | consistent | > 0 | +3.40 | consistent |

**UK high, ζK 0.1** (labour share −2.9pp, TFP +1.6%). Runs: automation + productivity: `uk_high_share_shift_tfp_ramp`; technology unchanged: `uk_high_share_shift_ramp_zfixed`; stress test (2031 GDP held): `uk_high_share_shift_ramp_r4_1`

| gap (2031 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2031 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +2.74 | consistent | small, sign open (>= 0 if capital flows in) | +0.94 | consistent | 0 within 0.01pp | -0.003 | consistent |
| GNI % | > 0, below GDP | +2.02 | consistent | below GDP | +0.32 | consistent | <= 0 | -0.57 | consistent |
| NNI % | below GNI | +1.58 | consistent | below GNI | -0.35 | surprising-but-explained (A5) | < 0 | -1.36 | consistent |
| capital % | > 0 | +4.09 | consistent | > 0 | +3.50 | consistent | > 0 | +3.19 | consistent |
| labour % | <= 0 by 2031 (wage falls) | -0.58 | consistent | <= 0 by 2031 (wage falls) | -0.53 | consistent | <= 0 by 2031 (wage falls) | -0.50 | consistent |
| wage % | sign open: share effect against productivity | -1.27 | surprising-but-explained (A2) | < 0 | -3.05 | consistent | < 0 | -3.98 | consistent |
| consumption % | sign open; > 0 expected if income rises | -0.20 | surprising-but-explained (A3) | < 0 | -1.08 | consistent | < 0 | -1.53 | consistent |
| investment % | > 0 | +8.32 | consistent | > 0 | +5.10 | consistent | > 0 | +3.42 | consistent |
| return, bp | > 0 | +75.5 | consistent | > 0 | +61.5 | consistent | > 0 | +54.2 | consistent |
| labour share, pp | = -target | -2.90 | consistent | = -target | -2.90 | consistent | = -target | -2.90 | consistent |
| debt/GDP, pp | sign open under the G/Y rule | -1.35 | surprising-but-explained (A4) | > 0 | +0.57 | consistent | > 0 | +1.59 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | -0.29 | consistent | < 0 (OBR sign) | -0.40 | consistent | < 0 (OBR sign) | -0.46 | consistent |
| 2028 investment % | > 0, a one-year jump | +15.07 | surprising-but-explained (A7) | > 0, a one-year jump | +13.93 | surprising-but-explained (A7) | > 0, a one-year jump | +13.35 | surprising-but-explained (A7) |
| 2028 labour % | > 0 (more work on the news) | +0.17 | consistent | > 0 (more work on the news) | +0.41 | consistent | > 0 (more work on the news) | +0.54 | consistent |
| 2028 consumption % | < 0 (more saving on the news) | -0.66 | consistent | < 0 (more saving on the news) | -1.22 | consistent | < 0 (more saving on the news) | -1.51 | consistent |
| 2036 GDP % | > 0 | +2.90 | consistent | small, sign open | +0.84 | consistent | near 0, not held after 2031 | -0.229 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | sign open under the G/Y rule | +2.07 | surprising-but-explained (A4) | > 0 | +4.79 | consistent | > 0 | +6.24 | consistent |

**Korinek, ζK 0.1** (labour share −3.9pp, TFP +3.1%). Runs: automation + productivity: `korinek_share_shift_tfp_ramp`; technology unchanged: `korinek_share_shift_ramp_zfixed`; stress test (2031 GDP held): `korinek_share_shift_ramp_r4_2`

| gap (2031 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2031 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +4.89 | consistent | small, sign open (>= 0 if capital flows in) | +1.34 | consistent | 0 within 0.01pp | -0.000 | consistent |
| GNI % | > 0, below GDP | +3.80 | consistent | below GDP | +0.47 | consistent | <= 0 | -0.79 | consistent |
| NNI % | below GNI | +3.33 | consistent | below GNI | -0.44 | surprising-but-explained (A5) | < 0 | -1.87 | consistent |
| capital % | > 0 | +6.03 | consistent | > 0 | +4.81 | consistent | > 0 | +4.36 | consistent |
| labour % | <= 0 by 2031 (wage falls) | -0.82 | consistent | <= 0 by 2031 (wage falls) | -0.72 | consistent | <= 0 by 2031 (wage falls) | -0.68 | consistent |
| wage % | sign open: share effect against productivity | -0.59 | surprising-but-explained (A2) | < 0 | -4.05 | consistent | < 0 | -5.36 | consistent |
| consumption % | sign open; > 0 expected if income rises | +0.28 | consistent | < 0 | -1.42 | consistent | < 0 | -2.07 | consistent |
| investment % | > 0 | +13.22 | consistent | > 0 | +6.93 | consistent | > 0 | +4.53 | consistent |
| return, bp | > 0 | +109.2 | consistent | > 0 | +81.9 | consistent | > 0 | +71.4 | consistent |
| labour share, pp | = -target | -3.90 | consistent | = -target | -3.90 | consistent | = -target | -3.90 | consistent |
| debt/GDP, pp | sign open under the G/Y rule | -3.02 | surprising-but-explained (A4) | > 0 | +0.67 | consistent | > 0 | +2.14 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | -0.35 | surprising-but-explained (A6) | < 0 (OBR sign) | -0.55 | consistent | < 0 (OBR sign) | -0.63 | consistent |
| 2028 investment % | > 0, a one-year jump | +21.33 | surprising-but-explained (A7) | > 0, a one-year jump | +19.00 | surprising-but-explained (A7) | > 0, a one-year jump | +18.14 | surprising-but-explained (A7) |
| 2028 labour % | > 0 (more work on the news) | +0.06 | consistent | > 0 (more work on the news) | +0.54 | consistent | > 0 (more work on the news) | +0.73 | consistent |
| 2028 consumption % | < 0 (more saving on the news) | -0.53 | consistent | < 0 (more saving on the news) | -1.61 | consistent | < 0 (more saving on the news) | -2.02 | consistent |
| 2036 GDP % | > 0 | +5.26 | consistent | small, sign open | +1.21 | consistent | near 0, not held after 2031 | -0.319 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | sign open under the G/Y rule | +1.12 | surprising-but-explained (A4) | > 0 | +6.38 | consistent | > 0 | +8.45 | consistent |

**UK low, ζK 0** (labour share −0.7pp, TFP +0.2%). Runs: automation + productivity: not solved; technology unchanged: not solved; stress test (2031 GDP held): not solved. All 51 cells: not solved.


**UK central, ζK 0** (labour share −1.6pp, TFP +0.4%). Runs: automation + productivity: `uk_central_share_shift_tfp_ramp`; technology unchanged: `uk_central_share_shift_ramp_zfixed`; stress test (2031 GDP held): `uk_central_share_shift_ramp_r4_1`

| gap (2031 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2031 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +0.37 | consistent | small, sign open (>= 0 if capital flows in) | -0.03 | surprising-but-explained (A1) | 0 within 0.01pp | +0.001 | consistent |
| GNI % | > 0, below GDP | +0.30 | consistent | below GDP | -0.10 | surprising-but-explained (A1) | <= 0 | -0.06 | consistent |
| NNI % | below GNI | +0.23 | consistent | below GNI | -0.24 | consistent | < 0 | -0.20 | consistent |
| capital % | > 0 | +0.67 | consistent | > 0 | +0.63 | consistent | > 0 | +0.63 | consistent |
| labour % | <= 0 by 2031 (wage falls) | -0.40 | consistent | <= 0 by 2031 (wage falls) | -0.38 | consistent | <= 0 by 2031 (wage falls) | -0.38 | consistent |
| wage % | sign open: share effect against productivity | -1.71 | surprising-but-explained (A2) | < 0 | -2.12 | consistent | < 0 | -2.09 | consistent |
| consumption % | sign open; > 0 expected if income rises | -0.52 | surprising-but-explained (A3) | < 0 | -0.73 | consistent | < 0 | -0.71 | consistent |
| investment % | > 0 | +3.31 | consistent | > 0 | +2.45 | consistent | > 0 | +2.52 | consistent |
| return, bp | > 0 | +48.3 | consistent | > 0 | +44.0 | consistent | > 0 | +44.4 | consistent |
| labour share, pp | = -target | -1.60 | consistent | = -target | -1.60 | consistent | = -target | -1.60 | consistent |
| debt/GDP, pp | sign open under the G/Y rule | +0.33 | surprising-but-explained (A4) | > 0 | +0.78 | consistent | > 0 | +0.74 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | -0.01 | surprising-but-explained (A6) | < 0 (OBR sign) | -0.05 | surprising-but-explained (A6) | < 0 (OBR sign) | -0.04 | surprising-but-explained (A6) |
| 2028 investment % | > 0, a one-year jump | +3.16 | surprising-but-explained (A7) | > 0, a one-year jump | +3.33 | surprising-but-explained (A7) | > 0, a one-year jump | +3.32 | surprising-but-explained (A7) |
| 2028 labour % | > 0 (more work on the news) | +0.22 | consistent | > 0 (more work on the news) | +0.27 | consistent | > 0 (more work on the news) | +0.27 | consistent |
| 2028 consumption % | < 0 (more saving on the news) | -0.72 | consistent | < 0 (more saving on the news) | -0.84 | consistent | < 0 (more saving on the news) | -0.83 | consistent |
| 2036 GDP % | > 0 | +0.51 | consistent | small, sign open | +0.02 | consistent | near 0, not held after 2031 | +0.065 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | sign open under the G/Y rule | +1.98 | surprising-but-explained (A4) | > 0 | +2.67 | consistent | > 0 | +2.61 | consistent |

**UK high, ζK 0** (labour share −2.9pp, TFP +1.6%). Runs: automation + productivity: not solved; technology unchanged: not solved; stress test (2031 GDP held): not solved. All 51 cells: not solved.


**Korinek, ζK 0** (labour share −3.9pp, TFP +3.1%). Runs: automation + productivity: not solved; technology unchanged: not solved; stress test (2031 GDP held): not solved. All 51 cells: not solved.

## Anomalies and root causes

### A1. At ζK = 0, "technology unchanged" has lower GDP than the stress test

- **What:** UK central at ζK = 0: technology-unchanged GDP is −0.033% in 2031 and the stress test is +0.001%. The stress test's Z (0.977399) is *above* the fixed-input Z (0.977069), by 0.034%. At ζK = 0.1 it is below, by 0.18%, 0.42%, 0.84% and 1.18% (low to Korinek).
- **Root cause:** with technology unchanged, GDP moves only through inputs. A higher γ raises the return on capital and lowers the wage, so capital rises and labour falls.
  - At ζK = 0.1 the foreign inflow makes capital the larger term: +0.68 from capital, −0.18 from labour, GDP +0.47%.
  - At ζK = 0 capital comes only from household saving: +0.230 from capital (K +0.63%), −0.243 from labour (L −0.38%) and −0.020 from the anchor drift, GDP −0.033%.
- **Consequences:**
  - The ordering "technology unchanged sits between the main arm and the stress test" holds at ζK = 0.1 only.
  - At ζK = 0 the stress test and the technology-unchanged arm are the same run for practical purposes. In 2031 they differ by at most 0.04pp on GDP, GNI, NNI, the wage, consumption and debt/GDP (wage −2.09 against −2.12%), by 0.07pp on investment and by 0.4bp on the return.
  - The #27 statement that "holding GDP flat needs output at fixed inputs to fall" is true at ζK = 0.1 only.
- **Verdict:** surprising-but-explained for the numbers; the statement is wrong as a general claim (fix 1).

### A2. The wage falls in every main arm, and is not monotonic in shock size

- **What:** −0.53, −1.27, −1.27, −0.59% while GDP rises 0.41 to 4.89%.
- **Root cause:** the share effect (−1.08 to −6.19 log points) is larger than what technology and capital deepening give back, because capital supply is inelastic at this horizon (elasticity 0.57–0.62). The wage is about −1.06 × share fall + 1.12 × TFP, so it follows the TFP-to-share ratio, which is lowest in UK central (0.25) and highest in Korinek (0.79). Section 3 has the numbers, including the high/central tie.
- **Verdict:** surprising-but-explained. The copy should not present the UK central wage as the "small shock" case: per unit of GDP gained it is the most adverse of the four.

### A3. Consumption falls while national income rises

- **What:** UK central main arm, 2031: GNI +0.57%, NNI +0.27%, consumption −0.39%. Consumption is below the continuation until about 2036.
- **Root cause**, in pp of GDP, 2031, ζK = 0.1:
  - GNI rises 0.56.
  - Government consumption takes 0.27, because G is a fixed share of GDP (not GNI) and GDP rises 0.92%.
  - National saving rises 0.49. Labour income falls 1.02 and household capital income rises 1.33; the return is 38bp higher, and households save out of capital income to build wealth (+0.51%) that the higher capital stock and the extra gilts need.
  - Consumption is the remainder: 0.56 − 0.27 − 0.49 = −0.20, which is −0.39% of consumption.
- The same split holds in 2028 (GNI +0.27, G +0.11, saving +0.44, consumption −0.28) and in every main arm. In the Korinek arm the TFP gain is large enough for consumption to be positive by 2031 (+0.28%).
- **Verdict:** surprising-but-explained. It matters for welfare copy: at year 4 the average household consumes less in the main arm, in three of the four scenarios.

### A4. Debt/GDP rises in every arm by 2036, including the main arm

- **What:** main arm at ζK = 0.1: −0.07, −0.13, −1.35 and −3.02pp in 2031, then +0.84, +1.99, +2.07 and +1.12pp in 2036. At ζK = 0 it is positive from 2030.
- **Root cause:** whole-stock repricing. Gilts are one-period and their rate moves one for one with r, so debt of 95% of GDP pays 17–109bp more from the first year. For UK central that alone adds 2.4pp by 2036; the fall in tax/GDP adds 0.6pp; higher GDP takes off 1.0pp. G and transfers are shares of GDP, so they absorb the rest of the growth dividend.
- **Verdict:** surprising-but-explained, and a known limitation (the referee's point 6 in the literature note). UK gilts have long maturities, so the real stock reprices over many years, not at once.
- **For the copy:** the 2031 debt figure in the main arm has the opposite sign to the path. Quote it with 2035 or 2036 (decision 7 already says so), and lead with fixed spending once those are solved.

### A5. NNI falls while GNI rises in the technology-unchanged arm

- **What:** UK central: GNI +0.15%, NNI −0.21%. Same sign pattern in all four scenarios at ζK = 0.1.
- **Root cause:** NNI = GNI − δK. Capital is 1.88% higher, which adds 0.32pp of GDP of depreciation (0.065 × 1.88% × K/Y of 2.65), against a GNI gain of 0.15pp. 77% of that extra capital is foreign-owned, but depreciation on capital located in the UK is charged to the UK's net income in the national accounts, and in the model the foreign owners are paid the gross return (r_p + δ).
- **The opposite case, Korinek main arm at ζK = 0:** NNI rises by more than GNI in per cent (+3.09 against +2.88%). In levels it rises by less, as it must: +2.56 against +2.86pp of GDP. Capital rises 1.8%, less than GNI, so depreciation falls as a share of income and the smaller base (NNI is 83% of GDP) gives the larger percentage.
- **Verdict:** surprising-but-explained. It is the reason NNI is the more demanding measure at ζK = 0.1, as intended.

### A6. Tax/GDP: too small everywhere, and the wrong sign in the main arm at ζK = 0

- **What:** section 8.
  - Per pp of share fall, tax/GDP falls 0.09–0.16 at ζK = 0.1 and 0.004–0.03 at ζK = 0 (UK central), against the OBR's 0.19–0.23.
  - **Korinek main arm at ζK = 0: tax/GDP rises 0.21pp in 2031**, and in every year from 2029. Every OBR source has it falling when the labour share falls.
  - UK central main arm at ζK = 0: −0.006pp in 2031, positive from 2032.
- **Root cause**, as diagnosed in `docs/red_flags_1_3.md` and confirmed here on the new solves:
  1. The payroll tax gives −0.15 per pp. That is the whole mechanical labour-to-capital effect in OG-UK, against a 19–23pp wedge at the OBR.
  2. Business tax rises 0.15–0.18 per pp with the capital share, and offsets it.
  3. The income-tax function covers labour and household capital income in one progressive schedule. Its take falls 0.11–0.12 per pp when GDP is held (the stress test). It rises when the return rises on all household wealth, gilts included: +0.03pp for UK central at ζK = 0 (r +48bp) and **+0.41pp for Korinek at ζK = 0** (r +142bp; household capital income +5.2pp of GDP, labour income −2.0pp).
  4. Consumption tax falls with C/Y, by 0.04–0.11 per pp.
  - For Korinek at ζK = 0: −0.585 (payroll) + 0.413 (income tax) + 0.710 (business) − 0.304 (consumption) − 0.027 (bequest and wealth) = +0.207.
- **Verdict:**
  - Korinek main arm, ζK = 0, 2031: **wrong sign**. The cause is known (red flag 3) and the limitation is accepted under Vahid's decision (a) of 12 Nov: keep OG-UK's tax system and report the gap.
  - Everything else: surprising-but-explained.
- **Fix:** a copy caveat here (fix 3). The model fix is separate labour and capital tax functions in OG-UK (option (c) in `docs/red_flags_1_3.md`), which is outside this repo.

### A7. The investment profile: a three-year plateau, a drop in 2031, and capital that arrives without investment

- **What:** UK central main arm investment gap: +7.8, +8.4, +8.9% in 2028–30, +3.6% in 2031. Korinek: +21.3, +25.4, +29.6, +13.2%.
- **Root cause:** OG-Core has no adjustment costs, so investment is exactly what moves capital to next year's target. While γ and Z ramp, the target rises every year; when the ramp ends in 2031, investment falls back to what maintains the higher stock. The spike is a property of frictionless capital, not a forecast (decision 6).
- **At ζK = 0.1, 2028 capital jumps with no investment recorded** (0.5–3.1% of GDP, section 1). So the sum of investment gaps understates the capital build-up at that closure, and the 2028 GDP gap includes output from capital that no 2027 flow paid for (decision 5).
- **The sanity gate's flag is mis-specified.** It compares the 2028 jump with the old 2026 jump (+17.2%), a year with ramp weight zero. The year with the same weight (0.25) is the old 2027: +21.34, +18.90 and +17.95% for the three Korinek arms, against +21.33, +19.00 and +18.14% now. The four flags it raised are therefore not findings (fix 2).
- **Verdict:** surprising-but-explained.

### A8. The stress test drifts after 2031, with opposite signs by closure

- **What:** section 5. By 2036 the GDP gap is −0.05, −0.11, −0.23 and −0.32% at ζK = 0.1, and +0.07% at ζK = 0 (UK central).
- **Root cause:** R4 pins one year. After it:
  - **Labour keeps falling in both closures** (UK central: −0.27 to −0.39% at 0.1; −0.38 to −0.53% at 0), as household wealth builds. That takes 0.07–0.09 off GDP.
  - **At ζK = 0.1 capital stops rising** (+1.73 to +1.64%). Debt/GDP rises 3.4pp, and gilts held at home rise 2.4% against household wealth +0.9%, so domestic capital K_d = B − D_d is crowded out. The foreign inflow, a fixed 10% of excess demand, does not make it up.
  - **At ζK = 0 capital keeps rising** (+0.63 to +1.09%). The return is 44bp higher, so wealth builds faster (+1.3%) than gilts absorb it.
- **Size:** −0.06 to −0.08pp per pp of share fall after five years at ζK = 0.1, close to the old design's −0.09 (−0.34% for 3.9pp in 2035).
- **Verdict:** surprising-but-explained. Decision 2 already requires the post-target gaps to be quoted.

### A9. 2036 is the debt rule's first year, so 2036 flows are not comparable

- **What:** in 2036, G is 2.0% to 22.9% below the continuation (UK central main arm −4.9%, Korinek stress test −22.9%). Investment gaps jump: UK central main arm +2.8% in 2035, +7.2% in 2036.
- **Root cause:** `tG1` is 2036. From that year G closes 60% of the gap between debt and 95% of GDP in one year. The rule G = growth × (ρ × 0.95Y + (1 − ρ)D) − (1 + r_gov)D + tax − pensions − TR, fitted across the 14 runs at ζK = 0.1, gives ρ_G = 0.600 with a residual of 1.5e-5 of GDP. Each arm has more debt than the continuation, so G is cut by more. Lower debt next year frees household wealth for capital, so 2036 investment jumps.
- The continuation has the same cliff (G/Y 29.9% in 2035, 28.3% in 2036).
- **Verdict:** surprising-but-explained. Stocks in 2036 (K, debt, GDP) are usable; **2036 flows (G, I, tax/GDP) are not**, and charts of them should stop at 2035 (fix 4).

### A10. Korinek 2031 is almost exactly the old 2030 at ζK = 0.1, and somewhat smaller at ζK = 0

- **What:** section 6. Main arm GDP +4.890 against +4.896% at ζK = 0.1; +3.047 against +3.099% at ζK = 0, with capital 10% smaller.
- **Root cause:** the design note expected smaller gaps because the surprise arms have no anticipation year.
  - At ζK = 0.1 anticipation added almost nothing to the stocks. In the old runs, 2026 capital was only +0.05%, and 79% of the 2030 capital gap was foreign inflow, which depends on the current year's technology and not on accumulated saving. So the surprise path is the old path moved one year.
  - At ζK = 0 capital is household saving only, and the surprise arms have had three years of it (2028–30) where the old arms had four (2026–29). So capital is smaller, as expected.
- **Verdict:** consistent in size at both closures.

### A11. Two calibration statements need one more sentence each

- **The fixed-input gain is set at 2027 inputs.** At the continuation's 2031 inputs it is +0.190, +0.377, +1.559 and +3.043% for targets of 0.2, 0.4, 1.6 and 3.1%, and "technology unchanged" is −0.010 to −0.055%. The cause is the baseline's falling K/L after 2027. The shortfall is 2–6% of the target.
- **The baseline already contains the OBR's central AI assumption** (`g_y` 0.010 is "OBR central"; `docs/literature_comparison.md` 3, "Units"). UK central adds +0.4% TFP, the same size as that assumption at year 4. So UK central is "AI productivity on top of the OBR's central AI path, plus the share shift", not "AI against no AI". The IMF's +0.42% is measured against no AI. This affects how the scenario is described, not any number.
- **Verdict:** not a results error; wording (fix 5).

### A12. A small unexplained term in the debt law of motion

- **What:** (1 + r_gov)D + G + TR + pensions − tax, divided by growth, misses next year's debt by 0.007–0.017% of GDP in every year and every run, including the baseline's 2026–27. The sign is always the same.
- **Root cause:** not identified. It is the same in the continuation and the arms (the difference is at most 0.003% of GDP a year), so it cancels in every gap. It is of the order of the solver tolerance (`mindist_TPI` 1e-4), and could also be a budget item that is not exported.
- **Verdict:** no effect on any reported gap; recorded for completeness.

## Proposed fixes (no rerun)

1. **Stress-test copy.** Replace "holding GDP flat needs output at fixed inputs to fall" with a closure-specific statement: at ζK = 0.1 it needs output at fixed inputs 0.2–1.2% lower (0.42% for UK central); at ζK = 0 the technology-unchanged arm already has GDP within 0.03pp of flat, so the stress test and that arm coincide. On the dashboard, show the two arms side by side only at ζK = 0.1, or say that they coincide at the bound.
2. **`analysis/surprise/sanity.py`, the 2028 investment flag.** Compare with the 2026-start arm's 2027 gap (the year with ramp weight 0.25), not its 2026 gap. Against that reference the three Korinek arms' jumps are 1.00, 1.01 and 1.01 times the old ones, so the flag also needs a tolerance (the gate's 30% band would do).
3. **Fiscal copy.** Say that tax/GDP falls in 2031 in every solved arm, by a half to three quarters of the OBR's rate at ζK = 0.1 and by almost nothing at ζK = 0; and that at ζK = 0 the main arm's tax/GDP is higher than the no-shock path from 2032. Do not write "the sign is right" without the year and closure.
4. **Charts and tables to 2036.** Quote stocks (GDP, capital, debt/GDP) in 2036, but stop flow series (G, investment, consumption, tax/GDP) at 2035, or mark 2036 as the debt rule's first year.
5. **`docs/uk_calibration.md`.** Add that the TFP targets hold at the 2027 inputs and are 2–6% smaller at the 2031 inputs, and that the scenarios are measured against a baseline that already includes the OBR's central AI productivity path.
6. **Debt copy.** Never quote the main arm's 2031 debt/GDP alone; its sign reverses within one to four years.

## What this audit did not do

- No solve was run, and nothing under `analysis/surprise/output` was changed.
- UK low, UK high and Korinek at ζK = 0, and the debt-neutral and fixed-spending variants, are not solved. The checks on closures, the old-against-new comparison at ζK = 0 and the tax sign therefore cover UK central only at ζK = 0. When those solves land, `python analysis/surprise/audit_2028.py --verdict` regenerates the table.
- Published figures (IMF, OBR, Korinek) are taken from `docs/literature_comparison.md` and `docs/uk_calibration.md` as verified there. They were not re-read from the PDFs.
- The steady-state elasticity and GDP/TFP quoted in section 7 are the sanity gate's diagnostics; the steady state is not in the exported series, so they were not recomputed.

## Reproduce

```
python analysis/surprise/audit_2028.py            # every table in this document
python analysis/surprise/audit_2028.py --verdict  # the verdict table only
```

The script needs numpy and the committed JSON, nothing else.
