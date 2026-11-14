# Results sanity audit: the 2028-surprise solves

Independent review of every finished solve on `rerun/surprise-2028` at `a657e6d` (12 Nov 2026, 18:04). The rule applied: every result must make sense in size and direction, and if it does not, the cause is found and stated.

- **Audited:** 21 solve records in `analysis/surprise/output/{zk0.1,zk0}/`. That is 2 continuations and 19 arm solves: 18 reported arms and one rejected R4 iteration (`korinek_share_shift_ramp_r4_1` at ζK = 0.1).
- **Not solved at this commit:** UK low and UK high at ζK = 0, in the verdict table as "not solved"; and every debt-neutral and fixed-spending variant.
- **Method:** `analysis/surprise/audit_2028.py`, written for this audit. It reads the committed JSON only, recomputes every identity from the exported series, and does not import `sanity.py` or the package. No OG solve was run.
- Every number below is printed by that script. Gaps are against the continuation (the no-shock restart) of the same closure.

## Summary

**Verdict counts.** The table has 408 cells: 4 scenarios × 2 closures × 3 arms × 17 rows.

| verdict | cells |
|---|---|
| consistent | 243 |
| surprising-but-explained | 62 |
| wrong | 1 |
| not solved | 102 |

**One model result is wrong in direction.** In the Korinek main arm at ζK = 0, tax/GDP *rises* 0.21pp in 2031 while the labour share falls 3.9pp. Every OBR source has it falling.
- Cause: the single income-tax schedule taxes the extra household capital income that a 142bp higher return brings (+0.41pp), on top of higher business tax (+0.71pp), against −0.59pp from the payroll tax. This is red flag 3 from the literature note, reproduced.
- It is a known limitation that Vahid decided on 12 Nov to keep and report. No rerun is proposed; the fix is a caveat wherever fiscal results at the bound appear (A6, fix 3).

**Everything else holds.** The accounting closes, the shocks are the stated size in the stated years, and every other surprising number has a cause in the model's structure (anomalies A1–A8).

**Three statements about the results are wrong and need changing.** None needs a rerun.

1. **"Holding GDP flat needs output at fixed inputs to fall"** (#27 decision, 17:27) is true at ζK = 0.1 and false at ζK = 0. There the stress test needs output at fixed inputs to *rise*, by 0.03% (UK central) and 0.05% (Korinek), because the technology-unchanged arm's GDP is already slightly below zero (A1).
2. **The sanity gate's investment flag compares unlike years.** It flags the Korinek 2028 jump (+21.3%) against the old 2026 jump (+17.2%). The like-for-like year is the old 2027 (+21.3%), and the two match (A7, A10).
3. **"The tax/GDP sign is right" is not true at ζK = 0 in the main arm.** Korinek is wrong from 2029 (above). UK central is −0.006pp in 2031 and positive from 2032 (A6).

**Four things a reader will trip over, all explained:**
- Debt/GDP ends *higher* in every arm by 2036, including "automation + productivity" (+2.0pp for UK central), because the whole debt stock reprices at the higher interest rate (A4) At the speed the OBR assumes for UK debt the rise is a tenth to two-thirds as large, and the main arm of UK high and Korinek et al. ends lower (PR #43).
- Consumption falls while national income rises in the main arm until 2031–36 (A3).
- 2036 is the debt rule's first year: G falls by up to 23% and investment jumps in every arm. No 2036 flow should be quoted (A9).
- The UK central main arm gives GDP +0.92% against the IMF's +2.5% at year 4 for the same TFP. The capital closure is sufficient to account for the difference (section 7).

## 1. Identities

All recomputed from the exported series; none is read from the records' own `identities_maxabs`.

| check | years | worst error, all 21 solves |
|---|---|---|
| K = K_d + K_f | 2026–36 | 0 |
| K_d = B − D_d | 2026–36 | 0 |
| D = D_d + D_f | 2026–36 | 1.7e-16 (relative) |
| GNI = Y − r_p(K_f + D_f) | 2026–36 | 1.6e-16 |
| NNI = GNI − δK, δ = 0.065 as recorded in each record | 2026–36 | 1.9e-16 |
| Y = Z_t K^γ_t L^(1−γ_t), with γ_t and Z_t rebuilt from the ramp weights | 2026–36 | 7.9e-6 |
| w = (1 − γ_t) Y/L | 2026–36 | 8.9e-6 |
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

- **The 2026–27 zeros are a splice.** Those years are copied from the baseline, so their equality proves the copy. The test of the restart is the 2028 row: wealth, debt and domestic capital at the start of 2028 equal the continuation's exactly in all 19 arm solves.
- **The ramp is in the right years.** The production function and the wage condition hold with weights 0.25, 0.5, 0.75 and 1 in 2028–2031. The labour-share gap in 2031 is −0.700, −1.600, −2.900 and −3.900pp.
- **The γ patch reaches every rule that uses it.** The interest-rate condition and the foreign-capital rule both hold with the arm's own γ_t, with the same constants as the continuation.
- **Z is as documented.** Each fixed-input Z, re-derived from the continuation's 2027 K and L, equals the recorded `Z_terminal` to 2e-16.
- **My gaps equal the sanity gate's.** Across all 2028 and 2031 gaps and the 2031 tax/GDP change in the 21 `.sanity.json` files, the largest difference is 1.3e-14. The gate recorded 0 fails and 4 flags, all of them the investment-jump flag on the four Korinek solves at ζK = 0.1 (A7).

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
| | | technology unchanged | −0.049 | +0.589 | −0.593 | −0.053 |
| | | stress test | +0.005 | +0.591 | −0.595 | +0.001 |

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
| | | technology unchanged | −6.188 | −0.049 | +0.967 | −5.270 | −5.13 |
| | | stress test | −6.188 | +0.005 | +0.970 | −5.213 | −5.08 |

**UK high and UK central both show −1.27%: a genuine offset, not a bug.**
- The two numbers are not equal: −1.2668% and −1.2692%.
- UK high's extra share fall costs 2.072 log points (−4.564 against −2.492).
- Its extra output per hour gives back 2.069: +1.170 from technology (1.547 against 0.377) and +0.900 from capital deepening (1.740 against 0.841).
- The two differ by 0.002, so the wage is the same to two decimals.

**A rule that fits all four scenarios** at ζK = 0.1 in 2031: the wage gap is about −1.06 × (share fall in pp) + 1.12 × (TFP gain in %). The coefficients are −1.083 to −1.038 and 1.115 to 1.121 across scenarios.
- The wage is unchanged when the TFP gain in % is about 0.95 times the share fall in pp.
- The scenarios' ratios are 0.29 (low), 0.25 (central), 0.55 (high) and 0.79 (Korinek). All are below 0.95, so the wage falls in every main arm.
- UK central has the lowest ratio, which is why its wage falls as far as UK high's.
- At ζK = 0 the coefficients are −1.33 and 1.03 for UK central and −1.32 and 1.00 for Korinek, so the break-even ratio is 1.3: the wage falls further at the bound for the same inputs.

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

**The stress test's 2031 GDP is zero** within the 0.01pp tolerance in all six solved sets: +0.004, +0.005, −0.003 and −0.000 at ζK = 0.1, and +0.001 for both UK central and Korinek at ζK = 0. The rejected Korinek iteration (`r4_1`) is −0.019.

**Technology unchanged sits between the other two arms at ζK = 0.1**, for every variable and every scenario. **At ζK = 0 it does not:** its GDP (−0.033% for UK central, −0.053% for Korinek) is below the stress test's (+0.001%). See A1.

**Closures, 2031 (UK central, then Korinek):**

| arm | closure | GDP % | GNI % | NNI % | K % | L % | wage % | C % | Δr bp | debt/GDP pp | tax/GDP pp |
|---|---|---|---|---|---|---|---|---|---|---|---|
| UK central, automation + productivity | ζK 0.1 | +0.92 | +0.57 | +0.27 | +2.01 | −0.30 | −1.27 | −0.39 | +37.8 | −0.13 | −0.19 |
| | ζK 0 | +0.37 | +0.30 | +0.23 | +0.67 | −0.40 | −1.71 | −0.52 | +48.3 | +0.33 | −0.01 |
| UK central, technology unchanged | ζK 0.1 | +0.47 | +0.15 | −0.21 | +1.88 | −0.29 | −1.71 | −0.61 | +34.4 | +0.35 | −0.21 |
| | ζK 0 | −0.03 | −0.10 | −0.24 | +0.63 | −0.38 | −2.12 | −0.73 | +44.0 | +0.78 | −0.05 |
| UK central, stress test | ζK 0.1 | +0.005 | −0.30 | −0.72 | +1.73 | −0.27 | −2.19 | −0.84 | +30.7 | +0.87 | −0.24 |
| | ζK 0 | +0.001 | −0.06 | −0.20 | +0.63 | −0.38 | −2.09 | −0.71 | +44.4 | +0.74 | −0.04 |
| Korinek, automation + productivity | ζK 0.1 | +4.89 | +3.80 | +3.33 | +6.03 | −0.82 | −0.59 | +0.28 | +109.2 | −3.02 | −0.35 |
| | ζK 0 | +3.05 | +2.88 | +3.09 | +1.80 | −1.13 | −2.03 | −0.16 | +141.9 | −1.56 | **+0.21** |
| Korinek, technology unchanged | ζK 0.1 | +1.34 | +0.47 | −0.44 | +4.81 | −0.72 | −4.05 | −1.42 | +81.9 | +0.67 | −0.55 |
| | ζK 0 | −0.05 | −0.21 | −0.56 | +1.53 | −0.97 | −5.13 | −1.75 | +106.8 | +1.85 | −0.10 |
| Korinek, stress test | ζK 0.1 | −0.000 | −0.79 | −1.87 | +4.36 | −0.68 | −5.36 | −2.07 | +71.4 | +2.14 | −0.63 |
| | ζK 0 | +0.001 | −0.16 | −0.50 | +1.53 | −0.97 | −5.08 | −1.72 | +107.4 | +1.79 | −0.10 |

- **Smaller K response at ζK = 0:** UK central +0.63 to +0.67% against +1.73 to +2.01%; Korinek +1.53 to +1.80% against +4.36 to +6.03%. As expected.
- **Larger Δr:** UK central +44 to +48bp against +31 to +38bp; Korinek +107 to +142bp against +71 to +109bp. As expected.
- **GNI ≈ GDP:** the wedge at ζK = 0 is 0.07pp for UK central and 0.16–0.17pp for Korinek (foreign-held gilts only), against 0.30–0.35pp and 0.79–1.09pp at ζK = 0.1. As expected.
- **NNI barely depends on the closure in the main arm** (UK central +0.27 and +0.23%; Korinek +3.33 and +3.09%). The extra capital at ζK = 0.1 is 77–80% foreign-owned, so most of its return and all of its depreciation leave national income.
- **The stress test's wage is slightly less negative at ζK = 0** (UK central −2.09 against −2.19%; Korinek −5.08 against −5.36%), because at ζK = 0.1 it needs a technology cut and at ζK = 0 it does not (A1).
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
| | technology unchanged | +8.06 | +0.66 | −2.03 | +0.45 | 0.00 |
| | stress test | +8.03 | +0.65 | −2.01 | +0.45 | 0.00 |

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
| | technology unchanged | +1.85 | +5.49 | +6.43 | +7.12 | −0.56 | −0.14 |
| | stress test | +1.79 | +5.40 | +6.33 | +7.16 | −0.61 | −0.21 |

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
| Korinek, ζK 0 | +0.001 | +0.183 | +0.182 | −0.021 | +0.421 | −0.218 |

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
- **The technology-unchanged arm at ζK = 0 changes sign on GDP:** +0.053% in the old 2030, −0.053% in the new 2031. Capital is +1.53% against +1.92%, a fifth smaller, and that is enough to tip a number that was near zero (A1). The wage (−5.13 against −4.98%), Δr (+107 against +103bp) and debt/GDP (+1.85pp in both) are close. The stress test shows the same: capital +1.53 against +1.92%, wage −5.08 against −5.04%, debt/GDP +1.79 against +1.91pp.

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
| same | stress test, ζK 0, per pp | −0.027 (UK central), −0.025 (Korinek) | 12–13% | closure: r rises 44–107bp on all household wealth, and the single income-tax schedule taxes that (A6) |
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
| | | technology unchanged | −0.102 | −0.026 | same | −0.585 | −0.063 | +0.647 | −0.166 | +0.064 |
| | | stress test | −0.097 | −0.025 | same | −0.585 | −0.055 | +0.648 | −0.168 | +0.063 |

- **The sign is right in 2031 in every solved arm except one.** The Korinek main arm at ζK = 0 has tax/GDP +0.207pp with the labour share 3.9pp lower. It is negative in 2028 (−0.02pp) and positive from 2029. This is the table's one **wrong** cell (A6).
- **Size at ζK = 0.1:** 0.15–0.16 per pp in the stress test, 0.13–0.14 with technology unchanged, 0.09–0.12 in the main arm. Against the OBR's 0.19–0.23 that is about three quarters, two thirds and a half.
- **Size at ζK = 0:** 0.03 per pp in the two no-TFP arms, for UK central and for Korinek. UK central's main arm is 0.004, which is zero for practical purposes.
- **At ζK = 0 the UK central main arm's sign is also wrong from 2032:** 0.000, +0.007, +0.014, +0.021, +0.029pp in 2032–36. At ζK = 0.1 no arm turns positive in any year.
- **The pattern is one mechanism.** At ζK = 0, both UK central and Korinek give about −0.03 per pp of share fall (the two no-TFP arms) and +0.10 per 1% of TFP (the main arm less the technology-unchanged arm). Tax/GDP turns positive once the TFP gain in % exceeds about 0.3 times the share fall in pp. UK central (0.25) is just below that in 2031 and Korinek (0.79) is above it. UK high (0.55) is not solved at ζK = 0; the rule predicts +0.08pp, a second wrong sign.
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
| NNI % | rises less than GNI in levels | +0.14 | consistent | rises less than GNI in levels | -0.10 | surprising-but-explained (A5) | < 0 | -0.31 | consistent |
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
| NNI % | rises less than GNI in levels | +0.27 | consistent | rises less than GNI in levels | -0.21 | surprising-but-explained (A5) | < 0 | -0.72 | consistent |
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
| NNI % | rises less than GNI in levels | +1.58 | consistent | rises less than GNI in levels | -0.35 | surprising-but-explained (A5) | < 0 | -1.36 | consistent |
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
| NNI % | rises less than GNI in levels | +3.33 | consistent | rises less than GNI in levels | -0.44 | surprising-but-explained (A5) | < 0 | -1.87 | consistent |
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
| NNI % | rises less than GNI in levels | +0.23 | consistent | rises less than GNI in levels | -0.24 | consistent | < 0 | -0.20 | consistent |
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


**Korinek, ζK 0** (labour share −3.9pp, TFP +3.1%). Runs: automation + productivity: `korinek_share_shift_tfp_ramp`; technology unchanged: `korinek_share_shift_ramp_zfixed`; stress test (2031 GDP held): `korinek_share_shift_ramp_r4_1`

| gap (2031 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2031 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +3.05 | consistent | small, sign open (>= 0 if capital flows in) | -0.05 | surprising-but-explained (A1) | 0 within 0.01pp | +0.001 | consistent |
| GNI % | > 0, below GDP | +2.88 | consistent | below GDP | -0.21 | surprising-but-explained (A1) | <= 0 | -0.16 | consistent |
| NNI % | rises less than GNI in levels | +3.09 | surprising-but-explained (A5) | rises less than GNI in levels | -0.56 | consistent | < 0 | -0.50 | consistent |
| capital % | > 0 | +1.80 | consistent | > 0 | +1.53 | consistent | > 0 | +1.53 | consistent |
| labour % | <= 0 by 2031 (wage falls) | -1.13 | consistent | <= 0 by 2031 (wage falls) | -0.97 | consistent | <= 0 by 2031 (wage falls) | -0.97 | consistent |
| wage % | sign open: share effect against productivity | -2.03 | surprising-but-explained (A2) | < 0 | -5.13 | consistent | < 0 | -5.08 | consistent |
| consumption % | sign open; > 0 expected if income rises | -0.16 | surprising-but-explained (A3) | < 0 | -1.75 | consistent | < 0 | -1.72 | consistent |
| investment % | > 0 | +12.67 | consistent | > 0 | +5.94 | consistent | > 0 | +6.06 | consistent |
| return, bp | > 0 | +141.9 | consistent | > 0 | +106.8 | consistent | > 0 | +107.4 | consistent |
| labour share, pp | = -target | -3.90 | consistent | = -target | -3.90 | consistent | = -target | -3.90 | consistent |
| debt/GDP, pp | sign open under the G/Y rule | -1.56 | surprising-but-explained (A4) | > 0 | +1.85 | consistent | > 0 | +1.79 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | +0.21 | WRONG (A6) | < 0 (OBR sign) | -0.10 | surprising-but-explained (A6) | < 0 (OBR sign) | -0.10 | surprising-but-explained (A6) |
| 2028 investment % | > 0, a one-year jump | +6.70 | surprising-but-explained (A7) | > 0, a one-year jump | +8.06 | surprising-but-explained (A7) | > 0, a one-year jump | +8.03 | surprising-but-explained (A7) |
| 2028 labour % | > 0 (more work on the news) | +0.22 | consistent | > 0 (more work on the news) | +0.66 | consistent | > 0 (more work on the news) | +0.65 | consistent |
| 2028 consumption % | < 0 (more saving on the news) | -1.06 | consistent | < 0 (more saving on the news) | -2.03 | consistent | < 0 (more saving on the news) | -2.01 | consistent |
| 2036 GDP % | > 0 | +3.94 | consistent | small, sign open | +0.12 | consistent | near 0, not held after 2031 | +0.183 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | sign open under the G/Y rule | +1.03 | surprising-but-explained (A4) | > 0 | +6.43 | consistent | > 0 | +6.33 | consistent |

## Anomalies and root causes

### A1. At ζK = 0, "technology unchanged" has GDP slightly below zero, and below the stress test

- **What:** technology-unchanged GDP in 2031 at ζK = 0 is −0.033% for UK central and −0.053% for Korinek. At ζK = 0.1 it is +0.20 to +1.34%.
- **Root cause:** with technology unchanged, GDP moves only through inputs. A higher γ raises the return on capital and lowers the wage, so capital rises and labour falls.
  - At ζK = 0.1 the foreign inflow makes capital the larger term. UK central: +0.68 from capital, −0.18 from labour, GDP +0.47%.
  - At ζK = 0 capital comes only from household saving, and the two terms cancel. UK central: +0.230 from capital (K +0.63%), −0.243 from labour (L −0.38%), −0.020 from the anchor drift. Korinek: +0.589, −0.593 and −0.049.
- **Consequences:**
  - To hold 2031 GDP at the reference, the stress test at ζK = 0 needs *more* output at fixed inputs than the technology-unchanged arm, not less. UK central: Z 0.977399 against 0.977069, +0.034%. Korinek: Z 0.945534 against 0.945025, +0.054%. At ζK = 0.1 it needs less, by 0.18%, 0.42%, 0.84% and 1.18% (low to Korinek).
  - So the ordering "technology unchanged sits between the main arm and the stress test" holds at ζK = 0.1 only.
  - At ζK = 0 the two arms are the same run for practical purposes. For UK central in 2031 they differ by at most 0.04pp on GDP, GNI, NNI, the wage, consumption and debt/GDP (wage −2.09 against −2.12%), by 0.07pp on investment and by 0.4bp on the return.
  - The #27 statement that "holding GDP flat needs output at fixed inputs to fall" is true at ζK = 0.1 and false at ζK = 0, in both scenarios solved there.
- **Against the 2026-start runs:** the old Korinek-sized arm at ζK = 0 had GDP +0.05% and an R4 Z below the fixed-input Z. The sign has flipped because capital is a fifth smaller without the anticipation year (section 6). The number is near zero either way.
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
- The same split holds in 2028 (GNI +0.27, G +0.11, saving +0.44, consumption −0.28) and in every main arm. In the Korinek arm at ζK = 0.1 the TFP gain is large enough for consumption to be positive by 2031 (+0.28%); at ζK = 0 it is still −0.16% in 2031 and positive from 2032.
- **Verdict:** surprising-but-explained. It matters for welfare copy: at year 4 aggregate consumption is lower in the main arm in three of the four scenarios at ζK = 0.1, and in both solved scenarios at ζK = 0.

### A4. Debt/GDP rises in every arm by 2036, including the main arm

- **What:** main arm at ζK = 0.1: −0.07, −0.13, −1.35 and −3.02pp in 2031, then +0.84, +1.99, +2.07 and +1.12pp in 2036. At ζK = 0, UK central is positive from 2030 and Korinek from 2034 (+1.03pp in 2036).
- **Root cause:** whole-stock repricing. Gilts are one-period and their rate moves one for one with r, so debt of 95% of GDP pays 17–109bp more from the first year. For UK central that alone adds 2.4pp by 2036; the fall in tax/GDP adds 0.6pp; higher GDP takes off 1.0pp. G and transfers are shares of GDP, so they absorb the rest of the growth dividend.
- **Verdict:** surprising-but-explained, and a known limitation (the referee's point 6 in the literature note). UK gilts have long maturities, so the real stock reprices over many years, not at once.
- **Checked at the OBR's repricing speed** ([PR #43](https://github.com/PolicyEngine/uk-growth-with-ai/pull/43), `docs/debt_repricing.md`): the model reprices all government debt at the new interest rate at once; at the speed the OBR assumes for UK debt, the rise in debt/GDP by 2036 is a tenth to two-thirds as large, and in the main arm of the UK high and Korinek et al. scenarios debt/GDP ends lower than the no-shock path. "Rises in every arm" is the model's result, not a robust one.
- **For the copy:** the 2031 debt figure in the main arm has the opposite sign to the path. Quote it with 2035 or 2036 (decision 7 already says so), and lead with fixed spending once those are solved.

### A5. NNI falls while GNI rises in the technology-unchanged arm

- **What:** UK central: GNI +0.15%, NNI −0.21%. Same sign pattern in all four scenarios at ζK = 0.1.
- **Root cause:** NNI = GNI − δK. Capital is 1.88% higher, which adds 0.32pp of GDP of depreciation (0.065 × 1.88% × K/Y of 2.65), against a GNI gain of 0.15pp. 77% of that extra capital is foreign-owned, but depreciation on capital located in the UK is charged to the UK's net income in the national accounts, and in the model the foreign owners are paid the gross return (r_p + δ).
- **The opposite case, Korinek main arm at ζK = 0:** NNI rises by more than GNI in per cent (+3.09 against +2.88%). In levels it rises by less, as it must: +2.56 against +2.86pp of GDP. Capital rises 1.8%, less than GNI, so depreciation falls as a share of income and the smaller base (NNI is 83% of GDP) gives the larger percentage.
- **Verdict:** surprising-but-explained. It is the reason NNI is the more demanding measure at ζK = 0.1, as intended.

### A6. Tax/GDP: too small everywhere, and the wrong sign in the main arm at ζK = 0

- **What:** section 8.
  - Per pp of share fall, tax/GDP falls 0.09–0.16 at ζK = 0.1, against the OBR's 0.19–0.23. At ζK = 0 it falls 0.03 in the no-TFP arms and 0.004 in UK central's main arm.
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

- **What:** section 5. By 2036 the GDP gap is −0.05, −0.11, −0.23 and −0.32% at ζK = 0.1, and +0.07% (UK central) and +0.18% (Korinek) at ζK = 0.
- **Root cause:** R4 pins one year. After it:
  - **Labour keeps falling in both closures** (UK central: −0.27 to −0.39% at 0.1; −0.38 to −0.53% at 0), as household wealth builds. That takes 0.07–0.09 off GDP.
  - **At ζK = 0.1 capital stops rising** (+1.73 to +1.64%). Debt/GDP rises 3.4pp, and gilts held at home rise 2.4% against household wealth +0.9%, so domestic capital K_d = B − D_d is crowded out. The foreign inflow, a fixed 10% of excess demand, does not make it up.
  - **At ζK = 0 capital keeps rising** (UK central +0.63 to +1.09%; Korinek +1.53 to +2.64%). The return is 44bp higher for UK central, so wealth builds faster (+1.3%) than gilts absorb it.
- **Size:** −0.06 to −0.08pp per pp of share fall after five years at ζK = 0.1, close to the old design's −0.09 (−0.34% for 3.9pp in 2035).
- **Verdict:** surprising-but-explained. Decision 2 already requires the post-target gaps to be quoted.

### A9. 2036 is the debt rule's first year, so 2036 flows are not comparable

- **What:** in 2036, G is 0.4% to 22.9% below the continuation (Korinek main arm −0.4%, UK central main arm −4.9%, Korinek stress test −22.9%). The size follows each arm's 2036 debt/GDP gap. Investment gaps jump: UK central main arm +2.8% in 2035, +7.2% in 2036.
- **Root cause:** `tG1` is 2036. From that year G closes 60% of the gap between debt and 95% of GDP in one year. The rule G = growth × (ρ × 0.95Y + (1 − ρ)D) − (1 + r_gov)D + tax − pensions − TR, fitted across the 14 runs at ζK = 0.1, gives ρ_G = 0.600 with a residual of 1.5e-5 of GDP (the 7 runs at ζK = 0 give the same ρ_G). Each arm has more debt than the continuation, so G is cut by more. Lower debt next year frees household wealth for capital, so 2036 investment jumps.
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

1. **Stress-test copy.** Replace "holding GDP flat needs output at fixed inputs to fall" with a closure-specific statement.
   - At ζK = 0.1 it needs output at fixed inputs 0.2–1.2% lower (0.42% for UK central).
   - At ζK = 0 the technology-unchanged arm's GDP is already 0.03–0.05% below flat, so the stress test needs 0.03–0.05% *more* and the two arms coincide.
   - On the dashboard, show the two arms side by side only at ζK = 0.1, or say that they coincide at the bound.
2. **`analysis/surprise/sanity.py`, the 2028 investment flag.** Compare with the 2026-start arm's 2027 gap (the year with ramp weight 0.25), not its 2026 gap. Against that reference the three Korinek arms' jumps are 1.00, 1.01 and 1.01 times the old ones, so the flag also needs a tolerance (the gate's 30% band would do).
3. **Fiscal copy.** State the tax/GDP result by closure and year, and never as "the sign is right".
   - At ζK = 0.1 tax/GDP falls in every arm and year, by a half to three quarters of the OBR's rate.
   - At ζK = 0 it falls by almost nothing in the no-TFP arms, and in the main arm it *rises*: from 2029 for Korinek (+0.21pp in 2031) and from 2032 for UK central.
   - Wherever a fiscal number at the bound is shown, add that the model's single income-tax schedule makes revenue rise with the return on household wealth, against the OBR's sign. The model fix (separate labour and capital tax functions in OG-UK) is outside this repo.
4. **Charts and tables to 2036.** Quote stocks (GDP, capital, debt/GDP) in 2036, but stop flow series (G, investment, consumption, tax/GDP) at 2035, or mark 2036 as the debt rule's first year.
5. **`docs/uk_calibration.md`.** Add that the TFP targets hold at the 2027 inputs and are 2–6% smaller at the 2031 inputs, and that the scenarios are measured against a baseline that already includes the OBR's central AI productivity path.
6. **Debt copy.** Never quote the main arm's 2031 debt/GDP alone; its sign reverses within one to four years.

## Addendum: solves landed after `a657e6d`

Audited with the same script as each solve lands. The main verdict table above is unchanged: 243 consistent, 62 surprising-but-explained, 1 wrong, 102 not solved.

### `uk_central_share_shift_tfp_ramp_dn`, ζK = 0.1 (at `3715dd5`, 13 Nov 00:02)

The first debt-neutral solve: transfers adjust each year so that debt/GDP follows the continuation's path. **17 cells: 14 consistent, 3 surprising-but-explained, 0 wrong.**

- **The closure does what it says.** Debt/GDP is within 1.1e-5 (relative) of the continuation in every year 2029–36, against a tolerance of 1e-4. The 2031 and 2036 gaps are +0.000 and +0.001pp.
- **Accounting closes.** Identities hold to 1e-16, the resource constraint to 7e-7 of GDP, the 2028 state equals the continuation's exactly, and the labour-share gap is −1.600pp. G/Y is unchanged, as designed.
- **Transfers are 6.5% lower in 2031** (−0.45pp of GDP). That is what holding debt costs: tax/GDP is 0.21pp lower and the interest rate on gilts 39bp higher.
- **Against the same arm under the common G/Y rule, every difference has the expected sign:**

| 2031 gap | common G/Y rule | debt-neutral |
|---|---|---|
| GDP % | +0.92 | +1.02 |
| GNI % | +0.57 | +0.68 |
| K % | +2.01 | +2.14 |
| L % | −0.30 | −0.21 |
| wage % | −1.27 | −1.26 |
| C % | −0.39 | −0.56 |
| Δr bp | +37.8 | +37.6 |
| debt/GDP pp, 2031 / 2036 | −0.13 / +1.99 | 0.00 / 0.00 |
| tax/GDP pp | −0.19 | −0.21 |

  - Lower transfers make households work more (labour −0.21 against −0.30%) and consume less (−0.56 against −0.39%).
  - No extra gilts are issued, so less household wealth is absorbed by debt and capital is higher (+2.14 against +2.01%), which gives the higher GDP.
- **Consumption is lower than under the common rule, by 0.17pp in 2031.** This is the point of the variant: households pay for the shock's fiscal cost. In the main arm, consumption is below the no-shock path in every year to 2036 (−0.18% in 2036).
- The three surprising cells are the same as under the common rule: the wage falls while GDP rises (A2), consumption falls while GNI rises (A3), and the 2028 investment jump (+9.0%, A7).

### `uk_central_share_shift_ramp_zfixed_dn`, ζK = 0.1 (at `a4e2180`, 13 Nov 00:10)

Debt-neutral, technology unchanged. **17 cells: 15 consistent, 2 surprising-but-explained, 0 wrong.**

- **The closure holds:** debt/GDP is within 6.6e-6 (relative) of the continuation in 2029–36. Identities hold to 1e-16, the resource constraint to 6e-7 of GDP, and the labour-share gap is −1.600pp.
- **Transfers are 7.4% lower in 2031** (−0.48pp of GDP), more than in the main arm (6.5%), because there is no TFP gain to raise revenue.
- **Against the same arm under the common G/Y rule, 2031:** GDP +0.60 against +0.47%, GNI +0.28 against +0.15%, K +2.00 against +1.88%, L −0.16 against −0.29%, wage −1.71% in both, C −0.84 against −0.61%. The directions match the main arm's: more work, less consumption, more capital.
- The two surprising cells are NNI below zero with GNI above zero (−0.08 against +0.28%, A5) and the 2028 investment jump (+8.6%, A7).
- The debt-neutral stress test for UK central has no accepted iteration yet, so its column in the table below is still "not solved".

### `uk_central_share_shift_ramp_dn_r4_1`, ζK = 0.1 (at `6843671`, 13 Nov 00:18)

First R4 iteration of the debt-neutral stress test. **Not an accepted iteration:** its 2031 GDP gap is +0.026%, outside the 0.01pp tolerance, so a second iteration is due and this one gets no verdict cells.

- Nothing is wrong with the solve itself. Debt/GDP is within 6.5e-6 (relative) of the continuation in 2029–36, identities hold to 1e-16, the resource constraint to 9e-7 of GDP, and the labour-share gap is −1.600pp.
- Its numbers already have the expected shape: transfers −8.7% in 2031 (the largest of the three arms), GNI −0.26%, wage −2.34%, consumption −1.22% (against −0.84% under the common rule).
- The step used the surprise common-rule secant slope (110.4pp per unit ln Z), and Z is 0.970958 against 0.972100 under the common rule: holding GDP flat needs a larger technology cut when transfers fall, because households work more.

### `uk_central_share_shift_ramp_dn_r4_2`, ζK = 0.1 (at `44867db`, 13 Nov 00:25)

The accepted debt-neutral stress test: 2031 GDP gap 0.000%. **17 cells: 15 consistent, 2 surprising-but-explained, 0 wrong.** The UK central debt-neutral set at ζK = 0.1 is now complete: 44 consistent, 7 surprising-but-explained, 0 wrong.

- **The closure holds:** debt/GDP is within 6.8e-6 (relative) of the continuation in 2029–36. Identities hold to 1e-16, the resource constraint to 1e-6 of GDP, and the labour-share gap is −1.600pp.
- **Transfers are 8.7% lower in 2031** (−0.52pp of GDP). Across the three arms the cut is 6.5%, 7.4% and 8.7%, rising as the output gain falls. That ordering is as expected.
- **Against the stress test under the common G/Y rule, 2031:** GNI −0.28 against −0.30%, K +1.80 against +1.73%, L −0.10 against −0.27%, wage −2.36 against −2.19%, C −1.24 against −0.84%, Δr +29.9 against +30.7bp.
  - Consumption falls by half as much again, because households now pay the fiscal cost that was debt (+0.87pp in 2031, +3.40pp in 2036) under the common rule.
  - The wage is lower because holding GDP flat needs a larger technology cut (Z 0.970724 against 0.972100): lower transfers make households work more, so less technology is needed for the same GDP.
- **The three arms keep their order** on GDP (+1.02, +0.60, 0.00), GNI (+0.68, +0.28, −0.28), wage (−1.26, −1.71, −2.36) and consumption (−0.56, −0.84, −1.24), as under the common rule at this closure.
- The two surprising cells are the 2028 investment jump (+8.2%, A7) and the drift after the target year: GDP −0.12% by 2036 (A8), the same size as under the common rule (−0.11%).

**UK central, ζK 0.1, debt-neutral transfers** (labour share −1.6pp, TFP +0.4%). Runs: automation + productivity: `uk_central_share_shift_tfp_ramp_dn`; technology unchanged: `uk_central_share_shift_ramp_zfixed_dn`; stress test (2031 GDP held): `uk_central_share_shift_ramp_dn_r4_2`

| gap (2031 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2031 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +1.02 | consistent | small, sign open (>= 0 if capital flows in) | +0.60 | consistent | 0 within 0.01pp | +0.000 | consistent |
| GNI % | > 0, below GDP | +0.68 | consistent | below GDP | +0.28 | consistent | <= 0 | -0.28 | consistent |
| NNI % | rises less than GNI in levels | +0.37 | consistent | rises less than GNI in levels | -0.08 | surprising-but-explained (A5) | < 0 | -0.72 | consistent |
| capital % | > 0 | +2.14 | consistent | > 0 | +2.00 | consistent | > 0 | +1.80 | consistent |
| labour % | <= 0 by 2031 (wage falls) | -0.21 | consistent | <= 0 by 2031 (wage falls) | -0.16 | consistent | <= 0 by 2031 (wage falls) | -0.10 | consistent |
| wage % | sign open: share effect against productivity | -1.26 | surprising-but-explained (A2) | < 0 | -1.71 | consistent | < 0 | -2.36 | consistent |
| consumption % | sign open; > 0 expected if income rises | -0.56 | surprising-but-explained (A3) | < 0 | -0.84 | consistent | < 0 | -1.24 | consistent |
| investment % | > 0 | +3.53 | consistent | > 0 | +2.91 | consistent | > 0 | +2.04 | consistent |
| return, bp | > 0 | +37.6 | consistent | > 0 | +34.4 | consistent | > 0 | +29.9 | consistent |
| labour share, pp | = -target | -1.60 | consistent | = -target | -1.60 | consistent | = -target | -1.60 | consistent |
| debt/GDP, pp | 0 (held on the reference path) | +0.000 | consistent | 0 (held on the reference path) | +0.000 | consistent | 0 (held on the reference path) | +0.000 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | -0.21 | consistent | < 0 (OBR sign) | -0.25 | consistent | < 0 (OBR sign) | -0.30 | consistent |
| 2028 investment % | > 0, a one-year jump | +8.96 | surprising-but-explained (A7) | > 0, a one-year jump | +8.63 | surprising-but-explained (A7) | > 0, a one-year jump | +8.16 | surprising-but-explained (A7) |
| 2028 labour % | > 0 (more work on the news) | +0.21 | consistent | > 0 (more work on the news) | +0.31 | consistent | > 0 (more work on the news) | +0.45 | consistent |
| 2028 consumption % | < 0 (more saving on the news) | -0.61 | consistent | < 0 (more saving on the news) | -0.83 | consistent | < 0 (more saving on the news) | -1.13 | consistent |
| 2036 GDP % | > 0 | +1.02 | consistent | small, sign open | +0.55 | consistent | near 0, not held after 2031 | -0.118 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | 0 (held on the reference path) | +0.001 | consistent | 0 (held on the reference path) | +0.000 | consistent | 0 (held on the reference path) | +0.001 | consistent |

### `uk_central_share_shift_tfp_ramp_dn`, ζK = 0 (at `68941b6`, 13 Nov 00:33)

The debt-neutral main arm at the closed-capital bound. **17 cells: 13 consistent, 4 surprising-but-explained, 0 wrong.**

- **The closure holds:** debt/GDP is within 3.8e-6 (relative) of the continuation in 2029–36. Identities hold to 1e-16, the resource constraint to 2.4e-6 of GDP, K_f is zero, and the labour-share gap is −1.600pp.
- **Transfers are 5.4% lower in 2031** (−0.35pp of GDP), less than at ζK = 0.1 (6.5%), because tax/GDP barely falls at the bound.
- **Against the same arm under the common G/Y rule, 2031:** GDP +0.45 against +0.37%, GNI +0.39 against +0.30%, K +0.74 against +0.67%, L −0.31 against −0.40%, wage −1.71% in both, C −0.69 against −0.52%, Δr +48bp in both. The directions are the same as at ζK = 0.1.
- **Tax/GDP keeps the OBR's sign in every year here** (−0.03pp in 2031, −0.01pp in 2036), where the common rule turns positive from 2032. With no extra gilts issued, households have less interest income for the single income-tax schedule to tax. It is still under a tenth of the OBR's rate per pp (A6).
- The four surprising cells: the wage falls while GDP rises (A2), consumption falls while GNI rises (A3), tax/GDP falls by under half the OBR's lower rate (A6), and the 2028 investment jump (+4.0%, A7).

### `uk_central_share_shift_ramp_zfixed_dn`, ζK = 0 (at `7d86728`, 13 Nov 00:41)

Debt-neutral, technology unchanged, at the closed-capital bound. **17 cells: 14 consistent, 3 surprising-but-explained, 0 wrong.**

- **The closure holds:** debt/GDP is within 4.7e-6 (relative) of the continuation in 2029–36. Identities hold to 1e-16, the resource constraint to 3e-6 of GDP, and the labour-share gap is −1.600pp.
- **Transfers are 6.4% lower in 2031** (−0.39pp of GDP), more than in the main arm at this closure (5.4%), as at ζK = 0.1.
- **Against the same arm under the common G/Y rule, 2031:** GDP +0.07 against −0.03%, GNI +0.02 against −0.10%, K +0.70 against +0.63%, L −0.26 against −0.38%, wage −2.14 against −2.12%, C −0.96 against −0.73%.
- **This changes A1 for the debt-neutral variant.** Under the common rule this arm's GDP is slightly below zero at ζK = 0, so the stress test needs more output at fixed inputs. With debt-neutral transfers it is slightly above zero (+0.07%), because households work more, so the debt-neutral stress test at ζK = 0 will need a small technology *cut*. The sign of that statement depends on the fiscal rule as well as the closure; the number is near zero either way.
- The three surprising cells: NNI below zero with GNI above zero (−0.12 against +0.02%, A5), tax/GDP falling by under half the OBR's lower rate (−0.08pp, A6), and the 2028 investment jump (+4.1%, A7).

### `uk_central_share_shift_ramp_dn_r4_1`, ζK = 0 (at `c8458ec`, 13 Nov 00:49)

The debt-neutral stress test at the closed-capital bound, accepted on its first iteration: 2031 GDP gap +0.003%. **17 cells: 14 consistent, 3 surprising-but-explained, 0 wrong.** UK central's debt-neutral set is now complete at both closures: 85 consistent, 17 surprising-but-explained, 0 wrong.

- **The closure holds:** debt/GDP is within 4.9e-6 (relative) of the continuation in 2029–36. Identities hold to 1e-16, the resource constraint to 3e-6 of GDP, and the labour-share gap is −1.600pp.
- **Transfers are 6.5% lower in 2031** (−0.39pp of GDP). The three arms at this closure are 5.4%, 6.4% and 6.5%, the same ordering as at ζK = 0.1.
- **It needs a small technology cut, as the previous solve implied:** Z 0.976386 against the fixed-input 0.977069, −0.07%. Under the common rule at this closure it needed +0.03%.
- **Against the stress test under the common G/Y rule, 2031:** GNI −0.05 against −0.06%, K +0.69 against +0.63%, L −0.25 against −0.38%, wage −2.21 against −2.09%, C −1.01 against −0.71%. The directions are the same as at ζK = 0.1.
- The three surprising cells: tax/GDP falling by under half the OBR's lower rate (−0.09pp, A6), the 2028 investment jump (+4.2%, A7), and the drift after the target year, GDP +0.07% by 2036 (A8; the same sign and size as under the common rule at this closure).

**UK central, ζK 0, debt-neutral transfers** (labour share −1.6pp, TFP +0.4%). Runs: automation + productivity: `uk_central_share_shift_tfp_ramp_dn`; technology unchanged: `uk_central_share_shift_ramp_zfixed_dn`; stress test (2031 GDP held): `uk_central_share_shift_ramp_dn_r4_1`

| gap (2031 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2031 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +0.45 | consistent | small, sign open (>= 0 if capital flows in) | +0.07 | consistent | 0 within 0.01pp | +0.003 | consistent |
| GNI % | > 0, below GDP | +0.39 | consistent | below GDP | +0.02 | consistent | <= 0 | -0.05 | consistent |
| NNI % | rises less than GNI in levels | +0.32 | consistent | rises less than GNI in levels | -0.12 | surprising-but-explained (A5) | < 0 | -0.19 | consistent |
| capital % | > 0 | +0.74 | consistent | > 0 | +0.70 | consistent | > 0 | +0.69 | consistent |
| labour % | <= 0 by 2031 (wage falls) | -0.31 | consistent | <= 0 by 2031 (wage falls) | -0.26 | consistent | <= 0 by 2031 (wage falls) | -0.25 | consistent |
| wage % | sign open: share effect against productivity | -1.71 | surprising-but-explained (A2) | < 0 | -2.14 | consistent | < 0 | -2.21 | consistent |
| consumption % | sign open; > 0 expected if income rises | -0.69 | surprising-but-explained (A3) | < 0 | -0.96 | consistent | < 0 | -1.01 | consistent |
| investment % | > 0 | +3.40 | consistent | > 0 | +2.73 | consistent | > 0 | +2.61 | consistent |
| return, bp | > 0 | +48.4 | consistent | > 0 | +44.4 | consistent | > 0 | +43.7 | consistent |
| labour share, pp | = -target | -1.60 | consistent | = -target | -1.60 | consistent | = -target | -1.60 | consistent |
| debt/GDP, pp | 0 (held on the reference path) | +0.000 | consistent | 0 (held on the reference path) | +0.000 | consistent | 0 (held on the reference path) | +0.000 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | -0.03 | surprising-but-explained (A6) | < 0 (OBR sign) | -0.08 | surprising-but-explained (A6) | < 0 (OBR sign) | -0.09 | surprising-but-explained (A6) |
| 2028 investment % | > 0, a one-year jump | +4.03 | surprising-but-explained (A7) | > 0, a one-year jump | +4.14 | surprising-but-explained (A7) | > 0, a one-year jump | +4.15 | surprising-but-explained (A7) |
| 2028 labour % | > 0 (more work on the news) | +0.27 | consistent | > 0 (more work on the news) | +0.36 | consistent | > 0 (more work on the news) | +0.38 | consistent |
| 2028 consumption % | < 0 (more saving on the news) | -0.83 | consistent | < 0 (more saving on the news) | -1.03 | consistent | < 0 (more saving on the news) | -1.06 | consistent |
| 2036 GDP % | > 0 | +0.60 | consistent | small, sign open | +0.15 | consistent | near 0, not held after 2031 | +0.074 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | 0 (held on the reference path) | +0.000 | consistent | 0 (held on the reference path) | +0.000 | consistent | 0 (held on the reference path) | +0.000 | consistent |

## Final pass 13 Nov 2026 (zk0.5 and debt-neutral)

Audited at `524849d` on `rerun/surprise-2028` (13 Nov 2026, 02:15), with the same script, extended. No solve was run and nothing under `analysis/surprise/output` was changed.

- **New in this pass:** the ζK = 0.5 closure. That is 10 solve records: the restart, and for UK central and Korinek the main arm, technology unchanged, and every stress-test iteration (2 for UK central, 3 for Korinek). The accepted stress tests are `uk_central_share_shift_ramp_r4_2` (2031 GDP gap −0.008%) and `korinek_share_shift_ramp_r4_3` (+0.001%).
- **Rechecked:** the seven debt-neutral UK central solves at ζK = 0.1 and ζK = 0. The addendum above audited them one by one as they landed. This pass adds the orderings across closures and arms.
- **Not solved, so not audited:** UK low and UK high at ζK = 0.5 and ζK = 0; every `_dnfull` and `_fs` variant; debt-neutral Korinek. The script skips them and reports them as "not solved".
- **Script changes:** `"zk0.5"` in `CLOSURES`; four verdict rules keyed to a checked mechanism (A13–A16 below); a new section 9 for orderings and inequalities (`--mono` prints it alone); section 6 skips a closure with no 2026-start arm records. The verdict blocks for ζK = 0.1 and ζK = 0 come out identical, line for line, to the ones the previous version of the script prints.

### Result

**No new result is wrong.** The one wrong cell is still the Korinek main arm at ζK = 0, where tax/GDP rises 0.21pp (A6).

| cells | consistent | surprising-but-explained | wrong | not solved |
|---|---|---|---|---|
| ζK = 0.1 and ζK = 0, common rule (unchanged) | 243 | 62 | 1 | 102 |
| ζK = 0.5, common rule, rules as they stood | 82 | 12 | 8 | 102 |
| ζK = 0.5, common rule, after this pass | 74 | 28 | 0 | 102 |
| Debt-neutral, UK central, ζK = 0.1 and ζK = 0 (unchanged) | 85 | 17 | 0 | – |
| **All audited cells** | **402** | **107** | **1** | |

**ζK = 0.5 is a sensitivity closure, not a central case.** Its no-shock path pays 4.2% of GDP abroad in 2031, against 1.2–1.6% in UK data, and foreign owners hold 38% of the capital stock (8% at ζK = 0.1). Every size below should be read with that in mind.

In the tables printed by the script, `tfp` is the main arm (automation + productivity), `zfixed` is technology unchanged, `r4` is the stress test, `common` is the common G/Y rule and `dn` is debt-neutral transfers.

### The ζK = 0.5 baseline and restart

The 2026-start baseline at ζK = 0.5 took two passes and passed the automatic gate. Verdict: **consistent as a sensitivity closure**, with one known departure from data (payments abroad).

| no-shock path | ζK = 0 | ζK = 0.1 | ζK = 0.5 |
|---|---|---|---|
| return % | 5.72 | 5.35 | 3.77 |
| K/Y | 2.55 | 2.63 | 3.07 |
| C/Y % | 51.3 | 50.4 | 47.0 |
| tax/GDP % | 42.8 | 42.0 | 39.3 |
| GNI/GDP % | 99.44 | 98.42 | 95.81 |
| paid abroad, % of GDP | 0.56 | 1.58 | 4.19 |
| of which on foreign-owned capital | 0.00 | 1.06 | 3.83 |
| K_f/K % | 0.0 | 8.3 | 37.8 |
| D/Y % | 95.1 | 95.2 | 95.3 |
| gate approved | True | True | True |
| passes | 2 | 2 | 2 |
| pass 1 vs pass 0, max rel (Y, K, r, D) | 1.8e-02 | 1.5e-02 | 5.3e-03 |
| baseline_ext vs pass 1, 2026-35 | 0.0e+00 | 0.0e+00 | 0.0e+00 |
| gate: tax/GDP 2026-30 % | 42.90, 42.90, 42.86, 42.83, 42.82 | 42.17, 42.17, 42.11, 42.09, 42.06 | 39.55, 39.50, 39.41, 39.35, 39.30 |
| OBR | 37.00, 37.72, 37.85, 38.29, 38.46 | 37.00, 37.72, 37.85, 38.29, 38.46 | 37.00, 37.72, 37.85, 38.29, 38.46 |
| gate: primary balance % | 2.01, 2.01, 1.95, 1.92, 1.89 | 1.65, 1.64, 1.58, 1.54, 1.51 | 0.11, 0.05, -0.04, -0.10, -0.16 |
| gate: growth 2027-30 % | 1.59, 1.54, 1.58, 1.57 | 1.61, 1.54, 1.58, 1.57 | 1.75, 1.66, 1.69, 1.65 |
| gate: payments abroad % | 0.43, 0.46, 0.48, 0.51, 0.53 | 1.40, 1.44, 1.47, 1.51, 1.55 | 3.82, 3.91, 3.99, 4.07, 4.13 |
| TPI distance | 5.7e-05 | 3.5e-05 | 2.9e-05 |
| gate RC/GDP max | 2.2e-06 | 1.9e-06 | 2.8e-06 |

- The export the restarts read (`baseline_ext`) equals the accepted pass exactly over 2026–35, and the restart reproduces it over 2028–36 to 6.9e-6.
- The levels move in the expected direction as ζK rises: more foreign capital, a lower return (3.8% against 5.3% and 5.7%), more capital per unit of output, and a wider gap between GDP and GNI.
- Tax/GDP is 39.3–39.6%, closer to the OBR's 37.0–38.5% than at ζK = 0.1 (42.1–42.2%).
- The primary balance is near zero (+0.1 to −0.2% of GDP) where ζK = 0.1 has a surplus of 1.5–1.7%. The gilt rate is lower by about as much as the return, so holding debt/GDP at 95% needs a smaller surplus.
- Growth in 2027–30 is 1.65–1.75% a year, slightly above the OBR's 1.6% mean (1.54–1.61% at ζK = 0.1).
- **Payments abroad are 3.8–4.1% of GDP, outside the 1–2% band the ζK = 0.1 baseline was reviewed against.** This is why ζK = 0.5 is a sensitivity only.

### The eight cells the old rules marked wrong

The old rules carried expectations that hold when little capital can flow in. Each of the eight cells fails one of those expectations for a reason that is checked in the series. The rules now test the reason, not the closure name, and return "wrong" if the reason does not hold.

| # | cell (ζK = 0.5) | expected | model | reason | check in the series |
|---|---|---|---|---|---|
| 1 | Korinek, technology unchanged, GDP 2031 | small | +5.15% | A13 | capital term 5.23 log points against a GDP gap of 5.02; bound with the return pinned +6.88% |
| 2 | Korinek, technology unchanged, GDP 2036 | small | +4.85% | A13 | capital term 5.07 against 4.74; bound +6.83% |
| 3 | UK central, technology unchanged, debt/GDP 2031 | > 0 | −0.91pp | A14 | debt +0.92%, GDP +1.90% |
| 4 | Korinek, technology unchanged, debt/GDP 2031 | > 0 | −2.63pp | A14 | debt +2.25%, GDP +5.15% |
| 5 | UK central, main arm, 2028 labour | > 0 | −0.03% | A15 | wage +0.002% in 2028, +0.06% in 2031 |
| 6 | UK central, main arm, 2028 consumption | < 0 | +0.02% | A15 | same |
| 7 | Korinek, main arm, 2028 labour | > 0 | −0.56% | A15 | wage +0.81% in 2028, +3.62% in 2031 |
| 8 | Korinek, main arm, 2028 consumption | < 0 | +1.16% | A15 | same |

Eight further cells that the old rules passed now carry a reason as well: the six tax/GDP cells (A16), and UK central's technology-unchanged GDP in 2031 and 2036 (+1.90% and +1.78%, A13). The "small" test is now per point of share fall (under 0.5% of GDP per pp), so that UK central (1.19 per pp) and Korinek (1.32 per pp) are judged alike. At ζK = 0.1 the same ratio is 0.28–0.34.

### A13. At ζK = 0.5, "technology unchanged" raises GDP by 1.2–1.3% per point of share fall

- The shock raises capital's share of output, so the return on capital rises and capital flows in. At ζK = 0.5 half of the gap to the open-economy capital stock is closed by foreign capital.
- The capital term alone accounts for the GDP gap: 5.23 log points against 5.02 for Korinek, and 1.97 against 1.88 for UK central. Technology at the reference inputs is −0.05 and −0.02, and labour −0.16 and −0.07.
- GDP is under the bound with the return pinned at its no-shock level (+6.88% Korinek, +2.58% UK central), at about three quarters of it.
- Per point of share fall the GDP gap is −0.02 and −0.01 at ζK = 0, 0.28–0.34 at ζK = 0.1, and 1.19 and 1.32 at ζK = 0.5.

| closure | run | year | GDP gap % | per pp of share fall | GDP gap, log points | capital term | bound with the return pinned, log points | bound % | debt gap % | debt/GDP gap pp |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| zk0.5 | uk_central_share_shift_ramp_zfixed | 2031 | +1.90 | 1.19 | +1.88 | +1.97 | +2.55 | +2.58 | +0.92 | -0.91 |
| zk0.5 | uk_central_share_shift_ramp_zfixed | 2036 | +1.78 | 1.11 | +1.77 | +1.90 | +2.53 | +2.56 | +3.80 | +1.95 |
| zk0.5 | korinek_share_shift_ramp_zfixed | 2031 | +5.15 | 1.32 | +5.02 | +5.23 | +6.65 | +6.88 | +2.25 | -2.63 |
| zk0.5 | korinek_share_shift_ramp_zfixed | 2036 | +4.85 | 1.24 | +4.74 | +5.07 | +6.60 | +6.83 | +9.52 | +4.35 |

- Foreign capital finances all of the extra capital in 2031 (100–101% of ΔK). The capital-supply elasticity across the six accepted arms is 5.3–8.0.

### A14. Debt/GDP is lower in 2031 in "technology unchanged", then higher by 2036

- Debt itself is higher in 2031 (+0.92% UK central, +2.25% Korinek). GDP is higher by more (+1.90%, +5.15%), so the ratio falls.
- The primary deficit is 0.48pp and 1.19pp of GDP wider in 2031, because tax/GDP falls. That compounds, and the ratio turns positive in 2033 and reaches +1.95pp and +4.35pp in 2036.
- The split of the 2036 gap for Korinek: +7.5pp from the primary balance, +1.3pp from the interest rate, −4.5pp from higher GDP.
- The main arm has the same shape, larger: −7.06pp in 2031 and −0.82pp in 2036 for Korinek (A4).

### A15. In the main arm at ζK = 0.5, households work less and consume more on the news

- At ζK = 0 and ζK = 0.1 the wage falls in every arm, so on the 2028 news households work more and save more. At ζK = 0.5 the main arm's wage rises (+0.06% UK central, +3.62% Korinek in 2031), so the signs reverse: lifetime labour income is higher.
- The 2028 response lines up with the 2031 wage gap across all six accepted arms at ζK = 0.5, with a rank correlation of −1.00 for labour and +1.00 for consumption:

| closure | run | wage gap 2031 % | wage gap 2028 % | labour 2028 % | consumption 2028 % |
| --- | --- | --- | --- | --- | --- |
| zk0.5 | korinek_share_shift_tfp_ramp | +3.62 | +0.808 | -0.556 | +1.158 |
| zk0.5 | uk_central_share_shift_tfp_ramp | +0.06 | +0.002 | -0.026 | +0.021 |
| zk0.5 | uk_central_share_shift_ramp_zfixed | -0.50 | -0.141 | +0.052 | -0.159 |
| zk0.5 | korinek_share_shift_ramp_zfixed | -0.90 | -0.283 | +0.067 | -0.267 |
| zk0.5 | uk_central_share_shift_ramp_r4_2 | -2.37 | -0.619 | +0.314 | -0.759 |
| zk0.5 | korinek_share_shift_ramp_r4_3 | -5.74 | -1.471 | +0.777 | -1.832 |

- The same holds at the other closures: −1.00 and +0.83 at ζK = 0 (6 arms), −0.99 and +0.98 at ζK = 0.1 (12 arms).
- The sign crosses zero where the wage gap does. UK central's main arm, with a wage gap of +0.06%, has a 2028 labour gap of −0.03% and a consumption gap of +0.02%.
- The positive wage in the Korinek main arm is consistent with Korinek et al. Table 5 at a capital-supply elasticity of about 6. The model's elasticity in that arm is 5.7. The paper was not re-read for this pass.
- The main arm's 2031 labour cell (−0.11% UK central, −0.25% Korinek) is marked consistent against an expectation worded "<= 0 by 2031 (wage falls)". The sign is as expected, but here the wage rises: labour is lower because households are better off, not because work pays less.

### A16. Tax/GDP falls by 0.36–0.38pp per point of share fall at ζK = 0.5, 1.7–1.8 times the OBR's midpoint

- The sign is the OBR's in every arm and every year 2028–36. The size is now above the OBR's 0.19–0.23pp, where at ζK = 0 and ζK = 0.1 it was below it (A6).
- **Cause: the capital income that replaces labour income goes to foreign owners, and the model taxes it only through business tax.** Korinek stress test, 2031, in pp of no-shock GDP, with GDP held flat:
  - labour income −3.90, and income tax plus payroll tax −1.68;
  - gross capital income +3.90, of which household capital income +0.42 and income paid abroad +1.25;
  - business tax +0.42, consumption tax −0.22;
  - total receipts −1.47.
- The same arm across the three closures loses the same labour income (−3.90). Household capital income rises by 3.95 at ζK = 0, 2.56 at ζK = 0.1 and 0.42 at ζK = 0.5, and income tax plus payroll tax falls by 0.64, 1.06 and 1.68:

| closure | run | labour income | gross capital income (Y - wL) | household capital income r_p B | income paid abroad | income tax + payroll | business tax | consumption tax | total receipts | tax/GDP pp per pp of share fall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| zk0 | korinek_share_shift_tfp_ramp | -2.04 | +5.09 | +5.17 | +0.19 | +0.61 | +0.85 | -0.02 | +1.52 | +0.053 |
| zk0 | korinek_share_shift_ramp_zfixed | -3.93 | +3.88 | +3.92 | +0.16 | -0.66 | +0.64 | -0.17 | -0.12 | -0.026 |
| zk0 | korinek_share_shift_ramp_r4_1 | -3.90 | +3.90 | +3.95 | +0.16 | -0.64 | +0.65 | -0.17 | -0.10 | -0.025 |
| zk0.1 | korinek_share_shift_tfp_ramp | -0.91 | +5.80 | +3.85 | +1.15 | +0.73 | +0.88 | +0.03 | +1.69 | -0.089 |
| zk0.1 | korinek_share_shift_ramp_zfixed | -3.08 | +4.42 | +2.92 | +0.88 | -0.57 | +0.66 | -0.14 | +0.01 | -0.141 |
| zk0.1 | korinek_share_shift_ramp_r4_2 | -3.90 | +3.90 | +2.56 | +0.78 | -1.06 | +0.58 | -0.20 | -0.63 | -0.161 |
| zk0.5 | korinek_share_shift_tfp_ramp | +2.18 | +7.77 | +0.95 | +2.55 | +1.32 | +0.86 | +0.18 | +2.37 | -0.360 |
| zk0.5 | korinek_share_shift_ramp_zfixed | -0.75 | +5.90 | +0.71 | +1.91 | -0.14 | +0.65 | -0.01 | +0.51 | -0.370 |
| zk0.5 | korinek_share_shift_ramp_r4_3 | -3.90 | +3.90 | +0.42 | +1.25 | -1.68 | +0.42 | -0.22 | -1.47 | -0.378 |

- The denominator is not the cause: the stress test holds GDP flat and has the largest fall (−1.47pp against −1.40pp in the main arm).
- At ζK = 0 the same arm loses only 0.10pp, because residents own all the extra capital and the single income-tax schedule taxes their higher capital income (the return rises 107bp there, 11bp here).
- This is the known tax limitation seen from the other side. The gap between the effective rates on labour and capital is about 14pp when residents own the capital, and wider when foreign owners do. No fix is proposed for a sensitivity closure. A fiscal number from ζK = 0.5 should not be quoted without this caveat.

### Identities at ζK = 0.5

Recomputed from the exported series for all 10 records.

- K = K_d + K_f, K_d = B − D_d and D = D_d + D_f hold exactly. GNI and NNI rebuild to 4e-16.
- GDP exceeds GNI in every year of every record (the smallest gap is 3.8% of GDP). GNI exceeds NNI in every year (the smallest gap is 19.9% of GDP).
- The resource constraint closes to 4.1e-6 of GDP over 2028–36, and to 1.6e-6 in 2027.
- The production function, the wage condition and the return condition hold to 3.5e-6, 5.8e-6 and 1.1e-6.
- The closure rule K_f = ζK (K_open − K_d) rebuilds to a ratio of 0.9999 in every year of every record.
- All gaps are exactly zero in 2026 and 2027, and the 2028 stocks of wealth and debt equal the restart's.
- The labour-share gap is the target times the ramp weight to 3.6e-4pp.
- The restart reproduces the committed baseline over 2028–36 to 6.9e-6.
- Z in the main and technology-unchanged arms re-derives from the restart's 2027 capital and labour to 1e-16.
- My gaps agree with the committed `.sanity.json` reports to 1.4e-14. The reports record no fails, and seven flags at ζK = 0.5, all the 2028 investment jump.

### The 2028 investment jump

- Investment in 2028 is +21.4% (UK central) and +64.4% (Korinek) in the main arm. It stays there for three years (+74.9% and +86.3% in 2029–30 for Korinek) and drops to +19.9% in 2031.
- This is A7 at a larger size. Capital has no adjustment cost in OG-Core 0.17, so the stock moves as fast as the closure allows, and all of it is foreign-financed. It is a model artefact and no 2028–30 investment number at ζK = 0.5 should be quoted.
- The accounting holds: the growth factor implied by investment and capital equals the restart's in every year 2028–35.

### Orderings

**Across closures (ζK = 0, 0.1, 0.5).** All tests hold. In the main and technology-unchanged arms GDP, GNI, capital and the wage rise with ζK, the rise in the return shrinks, and the gap between GDP and GNI widens.

| scenario | arm | variant | GDP % | GNI % | GDP - GNI, pp | K % | wage % | return bp | C % | tax/GDP pp | 2028 I % | ordering tests |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| uk_central | tfp | common (zk0, zk0.1, zk0.5) | +0.37 / +0.92 / +2.47 | +0.30 / +0.57 / +1.75 | +0.07 / +0.35 / +0.80 | +0.67 / +2.01 / +5.99 | -1.71 / -1.27 / +0.06 | +48.3 / +37.8 / +10.3 | -0.52 / -0.39 / +0.14 | -0.006 / -0.187 / -0.572 | +3.2 / +7.8 / +21.4 | all hold |
| uk_central | zfixed | common (zk0, zk0.1, zk0.5) | -0.03 / +0.47 / +1.90 | -0.10 / +0.15 / +1.22 | +0.06 / +0.33 / +0.73 | +0.63 / +1.88 / +5.52 | -2.12 / -1.71 / -0.50 | +44.0 / +34.4 / +9.2 | -0.73 / -0.61 / -0.13 | -0.046 / -0.215 / -0.579 | +3.3 / +7.6 / +19.7 | all hold |
| uk_central | r4 | common (zk0, zk0.1, zk0.5) | +0.001 / +0.005 / -0.008 | -0.06 / -0.30 / -0.54 | +0.06 / +0.30 / +0.51 | +0.63 / +1.73 / +3.97 | -2.09 / -2.19 / -2.37 | +44.4 / +30.7 / +5.4 | -0.71 / -0.84 / -1.01 | -0.042 / -0.245 / -0.599 | +3.3 / +7.3 / +14.2 | all hold |
| korinek | tfp | common (zk0, zk0.1, zk0.5) | +3.05 / +4.89 / +9.96 | +2.88 / +3.80 / +7.73 | +0.19 / +1.15 / +2.55 | +1.80 / +6.03 / +18.62 | -2.03 / -0.59 / +3.62 | +141.9 / +109.2 / +28.5 | -0.16 / +0.28 / +1.97 | +0.207 / -0.347 / -1.403 | +6.7 / +21.3 / +64.4 | all hold |
| korinek | zfixed | common (zk0, zk0.1, zk0.5) | -0.05 / +1.34 / +5.15 | -0.21 / +0.47 / +3.38 | +0.16 / +0.88 / +1.91 | +1.53 / +4.81 / +14.38 | -5.13 / -4.05 / -0.90 | +106.8 / +81.9 / +20.4 | -1.75 / -1.42 / -0.15 | -0.102 / -0.550 / -1.442 | +8.1 / +19.0 / +50.5 | all hold |
| korinek | r4 | common (zk0, zk0.1, zk0.5) | +0.001 / -0.000 / +0.001 | -0.16 / -0.79 / -1.30 | +0.16 / +0.78 / +1.25 | +1.53 / +4.36 / +9.85 | -5.08 / -5.36 / -5.74 | +107.4 / +71.4 / +11.1 | -1.72 / -2.07 / -2.45 | -0.097 / -0.628 / -1.473 | +8.0 / +18.1 / +35.4 | all hold |
| uk_central | tfp | dn (zk0, zk0.1) | +0.45 / +1.02 | +0.39 / +0.68 | +0.06 / +0.36 | +0.74 / +2.14 | -1.71 / -1.26 | +48.4 / +37.6 | -0.69 / -0.56 | -0.030 / -0.208 | +4.0 / +9.0 | all hold |
| uk_central | zfixed | dn (zk0, zk0.1) | +0.07 / +0.60 | +0.02 / +0.28 | +0.05 / +0.32 | +0.70 / +2.00 | -2.14 / -1.71 | +44.4 / +34.4 | -0.96 / -0.84 | -0.080 / -0.247 | +4.1 / +8.6 | all hold |
| uk_central | r4 | dn (zk0, zk0.1) | +0.003 / +0.000 | -0.05 / -0.28 | +0.05 / +0.28 | +0.69 / +1.80 | -2.21 / -2.36 | +43.7 / +29.9 | -1.01 / -1.24 | -0.089 / -0.302 | +4.2 / +8.2 | all hold |

- In the stress test the wage falls by *more* as ζK rises (−5.08, −5.36, −5.74% for Korinek). This is not a break. With GDP held, the wage gap is the share term minus the labour gap, exactly:

| closure | run | share term dln(1-g) | - dln L | dln Y (held near 0) | sum | dln w | residual |
| --- | --- | --- | --- | --- | --- | --- | --- |
| zk0 | uk_central_share_shift_ramp_r4_1 | -2.492 | +0.385 | +0.001 | -2.107 | -2.107 | 2.6e-05 |
| zk0 | korinek_share_shift_ramp_r4_1 | -6.188 | +0.973 | +0.001 | -5.213 | -5.213 | 6.0e-05 |
| zk0 | uk_central_share_shift_ramp_dn_r4_1 | -2.492 | +0.252 | +0.003 | -2.237 | -2.237 | -3.9e-04 |
| zk0.1 | uk_low_share_shift_ramp_r4_1 | -1.083 | +0.120 | +0.004 | -0.959 | -0.959 | 1.9e-05 |
| zk0.1 | uk_central_share_shift_ramp_r4_1 | -2.492 | +0.275 | +0.005 | -2.212 | -2.212 | 3.2e-05 |
| zk0.1 | uk_high_share_shift_ramp_r4_1 | -4.564 | +0.503 | -0.003 | -4.064 | -4.064 | 1.8e-05 |
| zk0.1 | korinek_share_shift_ramp_r4_2 | -6.188 | +0.680 | -0.000 | -5.507 | -5.507 | -2.6e-05 |
| zk0.1 | uk_central_share_shift_ramp_dn_r4_2 | -2.492 | +0.099 | +0.000 | -2.393 | -2.393 | -4.6e-04 |
| zk0.5 | uk_central_share_shift_ramp_r4_2 | -2.492 | +0.107 | -0.008 | -2.393 | -2.393 | -1.3e-05 |
| zk0.5 | korinek_share_shift_ramp_r4_3 | -6.188 | +0.272 | +0.001 | -5.914 | -5.914 | 7.1e-05 |

- Labour falls by less at higher ζK because residents are worse off: GDP is held, more of it is paid abroad on a larger foreign-owned capital stock, GNI falls by more (−0.16, −0.79, −1.30%), and so does consumption (−1.72, −2.07, −2.45%). Households work more, and the wage per unit of labour is lower.

**Across scenarios (low, central, high, Korinek).** All tests hold at every closure, for the scenarios that are solved: GDP and GNI in the main arm, capital and the return in every arm, and the wage and GNI falls in the stress test. The main arm's wage is not ordered by shock size, as before (A2).

| closure | arm | scenarios | GDP % | GNI % | K % | return bp | tax/GDP pp | wage % (not expected to be ordered, A2) | ordering tests |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| zk0 | tfp | uk_central, korinek | +0.37 / +3.05 | +0.30 / +2.88 | +0.67 / +1.80 | +48.3 / +141.9 | -0.006 / +0.207 | -1.71 / -2.03 | all hold |
| zk0 | zfixed | uk_central, korinek | -0.03 / -0.05 | -0.10 / -0.21 | +0.63 / +1.53 | +44.0 / +106.8 | -0.046 / -0.102 | -2.12 / -5.13 | all hold |
| zk0 | r4 | uk_central, korinek | +0.001 / +0.001 | -0.06 / -0.16 | +0.63 / +1.53 | +44.4 / +107.4 | -0.042 / -0.097 | -2.09 / -5.08 | all hold |
| zk0.1 | tfp | uk_low, uk_central, uk_high, korinek | +0.41 / +0.92 / +2.74 / +4.89 | +0.27 / +0.57 / +2.02 / +3.80 | +0.87 / +2.01 / +4.09 / +6.03 | +16.9 / +37.8 / +75.5 / +109.2 | -0.078 / -0.187 / -0.292 / -0.347 | -0.53 / -1.27 / -1.27 / -0.59 | all hold |
| zk0.1 | zfixed | uk_low, uk_central, uk_high, korinek | +0.20 / +0.47 / +0.94 / +1.34 | +0.06 / +0.15 / +0.32 / +0.47 | +0.81 / +1.88 / +3.50 / +4.81 | +15.2 / +34.4 / +61.5 / +81.9 | -0.092 / -0.215 / -0.400 / -0.550 | -0.76 / -1.71 / -3.05 / -4.05 | all hold |
| zk0.1 | r4 | uk_low, uk_central, uk_high, korinek | +0.004 / +0.005 / -0.003 / -0.000 | -0.13 / -0.30 / -0.57 / -0.79 | +0.75 / +1.73 / +3.19 / +4.36 | +13.7 / +30.7 / +54.2 / +71.4 | -0.105 / -0.245 / -0.457 / -0.628 | -0.95 / -2.19 / -3.98 / -5.36 | all hold |
| zk0.5 | tfp | uk_central, korinek | +2.47 / +9.96 | +1.75 / +7.73 | +5.99 / +18.62 | +10.3 / +28.5 | -0.572 / -1.403 | +0.06 / +3.62 | all hold |
| zk0.5 | zfixed | uk_central, korinek | +1.90 / +5.15 | +1.22 / +3.38 | +5.52 / +14.38 | +9.2 / +20.4 | -0.579 / -1.442 | -0.50 / -0.90 | all hold |
| zk0.5 | r4 | uk_central, korinek | -0.008 / +0.001 | -0.54 / -1.30 | +3.97 / +9.85 | +5.4 / +11.1 | -0.599 / -1.473 | -2.37 / -5.74 | all hold |

**Across arms (main, technology unchanged, stress test).** GDP, GNI, NNI, the wage, consumption, capital and Z are in that order in 8 of 10 sets, including both at ζK = 0.5 and both debt-neutral sets.

| closure | scenario | variant | GDP % | GNI % | NNI % | wage % | C % | K % | Z terminal | ordering tests (GDP, GNI, NNI, wage, C, K, Z: tfp > zfixed > stress) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| zk0 | uk_central | common | +0.366 / -0.033 / +0.001 | +0.30 / -0.10 / -0.06 | +0.23 / -0.24 / -0.20 | -1.71 / -2.12 / -2.09 | -0.52 / -0.73 / -0.71 | +0.67 / +0.63 / +0.63 | 0.980978 / 0.977069 / 0.977399 | known A1 (Y, GNI, NNI, w, C, K, Z) |
| zk0 | korinek | common | +3.047 / -0.053 / +0.001 | +2.88 / -0.21 / -0.16 | +3.09 / -0.56 / -0.50 | -2.03 / -5.13 / -5.08 | -0.16 / -1.75 / -1.72 | +1.80 / +1.53 / +1.53 | 0.974320 / 0.945025 / 0.945534 | known A1 (Y, GNI, NNI, w, C, K, Z) |
| zk0 | uk_central | dn | +0.453 / +0.070 / +0.003 | +0.39 / +0.02 / -0.05 | +0.32 / -0.12 / -0.19 | -1.71 / -2.14 / -2.21 | -0.69 / -0.96 / -1.01 | +0.74 / +0.70 / +0.69 | 0.980978 / 0.977069 / 0.976386 | all hold |
| zk0.1 | uk_low | common | +0.415 / +0.196 / +0.004 | +0.27 / +0.06 / -0.13 | +0.14 / -0.10 / -0.31 | -0.53 / -0.76 / -0.95 | -0.16 / -0.27 / -0.37 | +0.87 / +0.81 / +0.75 | 0.991517 / 0.989538 / 0.987803 | all hold |
| zk0.1 | uk_central | common | +0.917 / +0.475 / +0.005 | +0.57 / +0.15 / -0.30 | +0.27 / -0.21 / -0.72 | -1.27 / -1.71 / -2.19 | -0.39 / -0.61 / -0.84 | +2.01 / +1.88 / +1.73 | 0.980153 / 0.976248 / 0.972100 | all hold |
| zk0.1 | uk_high | common | +2.739 / +0.937 / -0.003 | +2.02 / +0.32 / -0.57 | +1.58 / -0.35 / -1.36 | -1.27 / -3.05 / -3.98 | -0.20 / -1.08 / -1.53 | +4.09 / +3.50 / +3.19 | 0.972683 / 0.957365 / 0.949354 | all hold |
| zk0.1 | korinek | common | +4.890 / +1.344 / -0.000 | +3.80 / +0.47 / -0.79 | +3.33 / -0.44 / -1.87 | -0.59 / -4.05 / -5.36 | +0.28 / -1.42 / -2.07 | +6.03 / +4.81 / +4.36 | 0.972324 / 0.943089 / 0.931947 | all hold |
| zk0.1 | uk_central | dn | +1.024 / +0.600 / +0.000 | +0.68 / +0.28 / -0.28 | +0.37 / -0.08 / -0.72 | -1.26 / -1.71 / -2.36 | -0.56 / -0.84 / -1.24 | +2.14 / +2.00 / +1.80 | 0.980153 / 0.976248 / 0.970724 | all hold |
| zk0.5 | uk_central | common | +2.471 / +1.898 / -0.008 | +1.75 / +1.22 / -0.54 | +0.63 / +0.09 / -1.72 | +0.06 / -0.50 / -2.37 | +0.14 / -0.13 / -1.01 | +5.99 / +5.52 / +3.97 | 0.976442 / 0.972552 / 0.959551 | all hold |
| zk0.5 | korinek | common | +9.957 / +5.151 / +0.001 | +7.73 / +3.38 / -1.30 | +4.86 / +0.48 / -4.24 | +3.62 / -0.90 / -5.74 | +1.97 / -0.15 / -2.45 | +18.62 / +14.38 / +9.85 | 0.963377 / 0.934410 / 0.902807 | all hold |

- The two exceptions are the common-rule sets at ζK = 0, where "technology unchanged" sits just below the stress test (GDP −0.03 against +0.00% for UK central). This is A1, already documented: the technology-unchanged arm's GDP is slightly below zero there, so holding GDP flat needs slightly more technology. The main arm is above both in every measure.

### Debt-neutral solves

- The closure holds in all seven: debt/GDP is within 1.1e-5 (relative) of the restart's in every year 2029–36, against a tolerance of 1e-4.
- The verdict cells are as the addendum reports: 85 consistent, 17 surprising-but-explained, 0 wrong.
- The orderings across the two closures and across the three arms all hold (tables above). In particular the debt-neutral set at ζK = 0 has the three arms in order, where the common rule does not (A1).
- The transfer cut in 2031 is 6.5, 7.4 and 8.7% across the arms at ζK = 0.1, and 5.4, 6.4 and 6.5% at ζK = 0. It rises as the output gain falls, as expected.

### Against the literature at ζK = 0.5

- **IMF.** The UK central main arm gives GDP +2.47% in 2031 for TFP +0.4%, a ratio of 6.2. The IMF's is about 6.0 at year 4 (+2.52% for +0.42%). At ζK = 0.1 the ratio is 2.3. This supports section 7's reading that the capital closure accounts for the distance from the IMF.
- **Korinek et al.** The Korinek main arm's wage is positive (+3.62%) at a capital-supply elasticity of 5.7, consistent with their Table 5 at about 6.

### Verdict tables, ζK = 0.5

**uk_central, ζK 0.5** (labour share −1.6pp, TFP +0.4%). Runs: automation + productivity: `uk_central_share_shift_tfp_ramp`; technology unchanged: `uk_central_share_shift_ramp_zfixed`; stress test (2031 GDP held): `uk_central_share_shift_ramp_r4_2`

| gap (2031 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2031 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +2.47 | consistent | small, sign open (>= 0 if capital flows in) | +1.90 | surprising-but-explained (A13) | 0 within 0.01pp | -0.008 | consistent |
| GNI % | > 0, below GDP | +1.75 | consistent | below GDP | +1.22 | consistent | <= 0 | -0.54 | consistent |
| NNI % | rises less than GNI in levels | +0.63 | consistent | rises less than GNI in levels | +0.09 | consistent | < 0 | -1.72 | consistent |
| capital % | > 0 | +5.99 | consistent | > 0 | +5.52 | consistent | > 0 | +3.97 | consistent |
| labour % | <= 0 by 2031 (wage falls) | -0.11 | consistent | <= 0 by 2031 (wage falls) | -0.11 | consistent | <= 0 by 2031 (wage falls) | -0.11 | consistent |
| wage % | sign open: share effect against productivity | +0.06 | consistent | < 0 | -0.50 | consistent | < 0 | -2.37 | consistent |
| consumption % | sign open; > 0 expected if income rises | +0.14 | consistent | < 0 | -0.13 | consistent | < 0 | -1.01 | consistent |
| investment % | > 0 | +6.11 | consistent | > 0 | +5.44 | consistent | > 0 | +3.21 | consistent |
| return, bp | > 0 | +10.3 | consistent | > 0 | +9.2 | consistent | > 0 | +5.4 | consistent |
| labour share, pp | = -target | -1.60 | consistent | = -target | -1.60 | consistent | = -target | -1.60 | consistent |
| debt/GDP, pp | sign open under the G/Y rule | -1.50 | surprising-but-explained (A4) | > 0 | -0.91 | surprising-but-explained (A14) | > 0 | +1.07 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | -0.57 | surprising-but-explained (A16) | < 0 (OBR sign) | -0.58 | surprising-but-explained (A16) | < 0 (OBR sign) | -0.60 | surprising-but-explained (A16) |
| 2028 investment % | > 0, a one-year jump | +21.39 | surprising-but-explained (A7) | > 0, a one-year jump | +19.73 | surprising-but-explained (A7) | > 0, a one-year jump | +14.18 | surprising-but-explained (A7) |
| 2028 labour % | > 0 (more work on the news) | -0.03 | surprising-but-explained (A15) | > 0 (more work on the news) | +0.05 | consistent | > 0 (more work on the news) | +0.31 | consistent |
| 2028 consumption % | < 0 (more saving on the news) | +0.02 | surprising-but-explained (A15) | < 0 (more saving on the news) | -0.16 | consistent | < 0 (more saving on the news) | -0.76 | consistent |
| 2036 GDP % | > 0 | +2.35 | consistent | small, sign open | +1.78 | surprising-but-explained (A13) | near 0, not held after 2031 | -0.127 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | sign open under the G/Y rule | +1.27 | surprising-but-explained (A4) | > 0 | +1.95 | consistent | > 0 | +4.25 | consistent |

**korinek, ζK 0.5** (labour share −3.9pp, TFP +3.1%). Runs: automation + productivity: `korinek_share_shift_tfp_ramp`; technology unchanged: `korinek_share_shift_ramp_zfixed`; stress test (2031 GDP held): `korinek_share_shift_ramp_r4_3`

| gap (2031 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2031 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +9.96 | consistent | small, sign open (>= 0 if capital flows in) | +5.15 | surprising-but-explained (A13) | 0 within 0.01pp | +0.001 | consistent |
| GNI % | > 0, below GDP | +7.73 | consistent | below GDP | +3.38 | consistent | <= 0 | -1.30 | consistent |
| NNI % | rises less than GNI in levels | +4.86 | consistent | rises less than GNI in levels | +0.48 | consistent | < 0 | -4.24 | consistent |
| capital % | > 0 | +18.62 | consistent | > 0 | +14.38 | consistent | > 0 | +9.85 | consistent |
| labour % | <= 0 by 2031 (wage falls) | -0.25 | consistent | <= 0 by 2031 (wage falls) | -0.26 | consistent | <= 0 by 2031 (wage falls) | -0.27 | consistent |
| wage % | sign open: share effect against productivity | +3.62 | consistent | < 0 | -0.90 | consistent | < 0 | -5.74 | consistent |
| consumption % | sign open; > 0 expected if income rises | +1.97 | consistent | < 0 | -0.15 | consistent | < 0 | -2.45 | consistent |
| investment % | > 0 | +19.91 | consistent | > 0 | +14.19 | consistent | > 0 | +7.98 | consistent |
| return, bp | > 0 | +28.5 | consistent | > 0 | +20.4 | consistent | > 0 | +11.1 | consistent |
| labour share, pp | = -target | -3.90 | consistent | = -target | -3.90 | consistent | = -target | -3.90 | consistent |
| debt/GDP, pp | sign open under the G/Y rule | -7.06 | surprising-but-explained (A4) | > 0 | -2.63 | surprising-but-explained (A14) | > 0 | +2.60 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | -1.40 | surprising-but-explained (A16) | < 0 (OBR sign) | -1.44 | surprising-but-explained (A16) | < 0 (OBR sign) | -1.47 | surprising-but-explained (A16) |
| 2028 investment % | > 0, a one-year jump | +64.45 | surprising-but-explained (A7) | > 0, a one-year jump | +50.50 | surprising-but-explained (A7) | > 0, a one-year jump | +35.38 | surprising-but-explained (A7) |
| 2028 labour % | > 0 (more work on the news) | -0.56 | surprising-but-explained (A15) | > 0 (more work on the news) | +0.07 | consistent | > 0 (more work on the news) | +0.78 | consistent |
| 2028 consumption % | < 0 (more saving on the news) | +1.16 | surprising-but-explained (A15) | < 0 (more saving on the news) | -0.27 | consistent | < 0 (more saving on the news) | -1.83 | consistent |
| 2036 GDP % | > 0 | +9.64 | consistent | small, sign open | +4.85 | surprising-but-explained (A13) | near 0, not held after 2031 | -0.289 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | sign open under the G/Y rule | -0.82 | surprising-but-explained (A4) | > 0 | +4.35 | consistent | > 0 | +10.36 | consistent |

## What this audit did not do

- No solve was run, and nothing under `analysis/surprise/output` was changed.
- UK low and UK high at ζK = 0 are not solved at `a657e6d`. The linear rule in section 8 predicts a wrong-signed tax/GDP for the UK high main arm there. When those solves land, `python analysis/surprise/audit_2028.py --verdict` regenerates the table.
- No debt-neutral (`_dn`) or fixed-spending (`_fs`) solve exists at `a657e6d`, so the fiscal results under the OBR's spending convention are not checked here. The script is ready for them: it tests that debt/GDP tracks the reference to 1e-4 in 2029–36 (`_dn`) and that G and transfers equal the reference levels in 2028–35 (`_fs`), and adds a verdict block per variant once a solve lands.
- Published figures (IMF, OBR, Korinek) are taken from `docs/literature_comparison.md` and `docs/uk_calibration.md` as verified there. They were not re-read from the PDFs.
- The steady-state elasticity and GDP/TFP quoted in section 7 are the sanity gate's diagnostics; the steady state is not in the exported series, so they were not recomputed.

## Reproduce

```
python analysis/surprise/audit_2028.py            # every table in this document
python analysis/surprise/audit_2028.py --verdict  # the verdict table only
python analysis/surprise/audit_2028.py --mono     # section 9: orderings and inequalities (final pass)
```

The script needs numpy and the committed JSON, nothing else.
