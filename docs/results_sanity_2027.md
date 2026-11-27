# Results sanity audit: the 2027-surprise solves

Review of every finished solve on `rerun/surprise-2027` at `a07b55b` (19 Nov 2026, 06:15). The solve records and assembled files last changed at `92c8212`; `a07b55b` adds only `docs/surprise_2027.md`.

**Reviewer: Opus 5.5, Fable unavailable** (Fable 5.2 is away until 25 Nov). Every review statement and ruling below is labelled that way and stands in for Fable's until Fable or the project owner confirms it.

The rule is the 2028 audit's: every result must make sense in size and direction, and if it does not, the cause is found and stated. The template and the reference set are `docs/results_sanity_2028.md` on `audit/sanity-2028-final` (the 2028-surprise solves, shock in 2028, headline year 2031).

- **Audited:** 74 records under `analysis/surprise2027/output/{zk0.1,zk0,zk0.5}/`. Three continuations, 69 arm solves (the verdict design, including rejected R4 iterations), plus `continuation_dnfull` and `uk_central_share_shift_tfp_ramp_dnfull` at ζK = 0.1, which sit outside the verdict design.
- **Method:** `analysis/surprise/audit_surprise.py --year 2027`, a port of `audit_2028.py` that prints byte-identical output for `--year 2028`. It reads the committed JSON only and recomputes every identity from the exported series. I reran all four modes at `a07b55b`, and they match the supplied outputs byte for byte. No OG solve was run.
- **Comparison:** each 2027 table is set beside the same table from `--year 2028` at the same commit (the 2028 records are in `analysis/surprise/output`). Gaps are against the continuation of the same closure.
- **Timing:** the shock is announced at the start of 2027 and ramps with weights 0.25, 0.5, 0.75 and 1 over 2027–30. 2030 is the headline year (year 4). In the 2028 set the same years are 2028–31. Calendar-fixed features do not move: the debt rule starts in 2036 in both sets, and the exported window ends in 2036. So 2036 is year 10 here and year 9 in 2028, and **2035 is the like-for-like year for the 2028 set's 2036**.

## Summary

**Verdict: the 2027 set passes every rule that the 2028 set passed, with the same outcome in every cell.** The verdict tables contain 340 rows in both years. After the year labels are aligned, every verdict, every anomaly code and every accepted run name is identical.

| cells | consistent | surprising-but-explained | wrong |
|---|---|---|---|
| Common rule, ζK 0.1, 0, 0.5 | 466 | 144 | 2 |
| Debt-neutral (UK central, Korinek; ζK 0.1 and 0) | 168 | 35 | 1 |
| Fixed spending (UK central, Korinek; ζK 0.1 and 0) | 165 | 38 | 1 |
| **All** | **799** | **217** | **4** |

The 2028 final refresh had 799 / 217 / 4, and the counts by anomaly code match it too (A7 60, A4 25, A6 22 + 4 wrong, A2 16, A5 14, A3 13, A1 12, A16 12, A8 20, A13 8, A15 8, A14 6, A17 1).

**The 2027 set is the 2028 set moved one year earlier, nearly unchanged.** Across the 36 accepted common-rule solves in section 4, the largest headline-year differences are:
- GDP 0.033pp (Korinek main arm at ζK 0.5: +9.924% against +9.957%);
- capital 0.066pp;
- investment 0.096pp;
- the return 0.39bp;
- debt/GDP 0.048pp;
- tax/GDP 0.002pp.

Main-arm GDP is 0.0–0.5% smaller in relative terms. At ζK 0.1 and 0 that comes mostly from the technology term, which is a little further short of its target (section 2); at ζK 0.5 most of it is the capital term (UK central +2.122 against +2.129 log points).

**The four wrong cells are the same four A6 cells as in 2028.** In each, tax/GDP rises in the main arm at ζK = 0:
- Korinek under the common rule: +0.207pp;
- Korinek debt-neutral: +0.203pp;
- Korinek fixed spending: +0.156pp;
- UK high under the common rule: +0.079pp.

**The `check` failures match 2028.** The assembled-file `check` fails the same four checks in the same two files: ζK = 0.5 Korinek (the external balance in the main arm and the stress test, and I/Y in the main arm) and ζK = 0.5 UK high (the external balance in the main arm). Aligned by ramp year, the values are within 0.25pp of 2028's.

**What differs from 2028, all explained:**
- Anything dated 2036 carries one more year after the headline. For example, UK central's main-arm debt/GDP is +2.41pp in 2036, while 2035 gives +1.99pp, the 2028 set's 2036 value.
- The technology term is 2–7% short of its target (2–6% in 2028).
- Some solver-level worst errors are up to 1.6 times 2028's, all inside the gate.
- The `_dnfull` reference's to-horizon closure is 5.4e-5 against 1.9e-5. That check is report-only.
- `check` prints one fewer WARN, on a knife-edge.

**No anomaly is new in kind, and none is unexplained except one:** the larger worst-case resource-constraint error in the fixed-spending runs at ζK = 0.1 (7.3e-6 against 4.6e-6). It is still under the gate's 1e-5, and I have not identified its cause beyond solver tolerance (section 1).

**Rulings (Opus 5.5, Fable unavailable):** six, collected under "Rulings" near the end. They carry the 2028 decisions over to 2027 and set the IMF bound for `imfGap.json` at **{lo: 2.9, hi: 3.2}**, the same values as now, with a new source string.

## 1. Identities

All recomputed from the exported series. The 2028 column is the worst value over the 2028 set's records, from the same script.

| check | years | worst, 2027 set (72 records) | worst, 2028 set |
|---|---|---|---|
| K = K_d + K_f; K_d = B − D_d | 2026–36 | 0 | 0 |
| D = D_d + D_f (relative) | 2026–36 | 1.7e-16 | 1.8e-16 |
| GNI = Y − r_p(K_f + D_f) | 2026–36 | 1.6e-16 | 1.6e-16 |
| NNI = GNI − δK, δ = 0.065 | 2026–36 | 3.7e-16 | 3.7e-16 |
| Y = Z_t K^γ_t L^(1−γ_t) | 2026–36 | 8.6e-6 | 7.9e-6 |
| w = (1 − γ_t) Y/L | 2026–36 | 9.6e-6 | 8.9e-6 |
| r + δ = 0.826 γ_t Y/K + 0.0086 (fit on each continuation) | 2026–36 | 2.1e-5 | 1.9e-5 |
| resource constraint, share of GDP | from the surprise year | 7.3e-6 | 4.6e-6 |
| I_total = growth × K_{t+1} − (1 − δ)K_t | from the surprise year to 2035 | 0 | 2.2e-16 |
| series equal to `baseline_ext` before the surprise year | 2026 (2026–27 in 2028) | 0 (exact) | 0 (exact) |
| B, D, D_d, D_f, K_d equal to the continuation's in the surprise year | 2027 (2028) | 0 (exact) | 0 (exact) |
| labour share = 65% − target × ramp weight | 2026–36 | 6.1e-4pp | 5.4e-4pp |
| debt law of motion, share of GDP (A12) | 2026–35 | 1.7e-4 | 1.7e-4 |
| continuation against the committed baseline, max relative | after the surprise year | Y 5.1e-6, K 1.7e-6, r 1.4e-5 | Y 5.1e-6, K 1.9e-6, r 2.3e-5 |
| fixed-input Z re-derived from the continuation's 2026 K and L (2027 in 2028) | – | 4.4e-16 | 2e-16 |
| my 2027 and 2030 gaps against `.sanity.json` | – | 1.4e-14 | 1.4e-14 (2028 and 2031) |

**Every check passes the 2028 rule.** The splice, the restart state and the ramp weights hold exactly, and the labour-share gap is −0.70, −1.60, −2.90 and −3.90pp in 2030.

**Larger than in 2028, but inside the gate:**
- The resource constraint: 7.3e-6 in the Korinek fixed-spending stress tests at ζK = 0.1, against 4.6e-6 in 2028 (also a fixed-spending run at ζK = 0.1). The sanity gate's tolerance is 1e-5 (`RC_TOL`).
- The wage condition: 9.6e-6 against 8.9e-6.
- The return equation: 2.1e-5 against 1.9e-5.
- The labour share: 6.1e-4pp against 5.4e-4pp, in the UK central debt-neutral main arm at ζK = 0.

All are at solver tolerance, and none touches a reported gap at two decimals. The higher resource-constraint error in the fixed-spending runs is **not explained** beyond that; it was the worst class in 2028 too.

**The foreign-capital rule** (K_f = ζK × excess demand at the world rate) holds with a ratio of 1.0017–1.0020 in every ζK = 0.1 run, against the continuation's 1.0019–1.0020. In 2028 these were 1.0020–1.0024 and 1.0023–1.0024.
- The level differs because the ratio is computed with return-equation constants fitted on each set's own continuation (0.826148 / 0.008598 here, 0.826361 / 0.008570 in 2028).
- The test is that arms match their own continuation, and they do in both sets.

**The stock-flow break is unchanged (decision 5).** At ζK = 0.1, 2027 capital with no 2026 investment is 0.50% of GDP (UK low), 1.15% (UK central), 2.19% (UK high) and 3.07% (Korinek) in the main arm. In 2028 it was 0.5, 1.1, 2.2 and 3.1%. At ζK = 0 it is zero.

**The sanity gate:** 74 of 74 records `ok`, 0 fails, and 22 flags. Every flag is the investment-jump flag, on the same 22 files as in 2028 (A7, ruling 4).

## 2. Accounting decomposition of the 2030 GDP gap

The split is exact in logs (as in 2028): Δln Y = [ln Z + Δγ ln(K₀/L₀)] + γ₁ Δln K + (1 − γ₁) Δln L. Values are log points × 100, and the residual is under 1e-4.

| closure | scenario | arm | technology | capital | labour | 2030 gap | 2028 set, 2031 gap |
|---|---|---|---|---|---|---|---|
| ζK 0.1 | UK central | automation + productivity | +0.372 | +0.729 | −0.191 | +0.910 | +0.913 |
| | | technology unchanged | −0.027 | +0.680 | −0.182 | +0.471 | +0.473 |
| | | stress test | −0.451 | +0.628 | −0.172 | +0.006 | +0.005 |
| ζK 0.1 | Korinek | automation + productivity | +2.986 | +2.272 | −0.499 | +4.760 | +4.775 |
| ζK 0 | UK central | automation + productivity | +0.374 | +0.245 | −0.254 | +0.365 | +0.366 |
| | | technology unchanged | −0.025 | +0.232 | −0.240 | −0.033 | −0.033 |
| ζK 0 | Korinek | automation + productivity | +2.992 | +0.695 | −0.691 | +2.995 | +3.002 |
| | | technology unchanged | −0.061 | +0.596 | −0.587 | −0.053 | −0.053 |

- **Same pattern as 2028.** At ζK = 0.1, capital is the larger half of the main arm's gap. At ζK = 0, capital and labour cancel, and GDP moves by the technology term alone.
- **The technology term is 2–7% short of its target.** The fixed-input gain at the continuation's 2030 inputs is +0.188% for a 0.2% target (UK low), +0.373% for 0.4% (UK central), +1.550% for 1.6% (UK high) and +3.031% for 3.1% (Korinek). In 2028 the shortfall was 2–6% (UK central +0.377%). The log-point terms in the table are slightly smaller again.
  - In both sets the target is set at the inputs of the year before the shock and measured four years later.
  - Measured at the later inputs, the gain is 0.005pp smaller for UK central than in 2028, because the baseline's inputs move slightly differently over 2026–30 than over 2027–31.
  - This is most of the relative fall in main-arm GDP at ζK 0.1 and 0. "Technology unchanged" is −0.012 to −0.067, against −0.010 to −0.055 in 2028 (A11).

## 3. Wage logic

The identity Δln w = Δln(1 − γ) + Δln(Y/L) holds in every arm with a residual under 6.3e-5 log points × 100.

Main-arm wage gaps at ζK = 0.1, 2030, low to Korinek: −0.54, −1.27, −1.28 and −0.61%. In the 2028 set (2031) they were −0.53, −1.27, −1.27 and −0.59%.
- **The UK central / UK high near-tie remains:** −1.273% against −1.281%, a gap of 0.008pp (0.002pp in 2028, in the same order). UK high's extra share fall (−4.564 against −2.492 log points) is nearly offset by its extra technology (+1.166) and capital deepening (+0.898).
- **The linear rule holds.** At ζK = 0.1 the wage moves −1.042 to −1.087 per pp of share fall and +1.114 to +1.121 per 1% of TFP, so it breaks even at a TFP/share ratio of 0.94–0.97. At ζK = 0 the coefficients are −1.319 to −1.331 and +1.001 to +1.040, so it breaks even at 1.28–1.32. In 2028: −1.04 to −1.08, about +1.12, and break-evens of about 0.95 and 1.3.
- Every scenario's ratio (0.29, 0.25, 0.55, 0.79) is below break-even, so the wage falls in every main arm at ζK 0.1 and 0 (A2). At ζK = 0.5 the main arm's wage rises for every scenario (UK central +0.05%, Korinek +3.59%), as in 2028.

## 4. Cross-scenario consistency

Main arm, headline year: 2030 for this set, 2031 for the 2028 set.

| closure | scenario | GDP % | K % | wage % | C % | Δr bp | debt/GDP pp | tax/GDP pp |
|---|---|---|---|---|---|---|---|---|
| ζK 0.1 | UK low | +0.413 / +0.415 | +0.871 / +0.871 | −0.537 / −0.534 | −0.165 / −0.162 | +16.8 / +16.9 | −0.069 / −0.071 | −0.078 / −0.078 |
| | UK central | +0.914 / +0.917 | +2.012 / +2.013 | −1.273 / −1.267 | −0.397 / −0.390 | +37.8 / +37.8 | −0.121 / −0.126 | −0.187 / −0.187 |
| | UK high | +2.730 / +2.739 | +4.083 / +4.089 | −1.281 / −1.269 | −0.212 / −0.201 | +75.4 / +75.5 | −1.343 / −1.354 | −0.291 / −0.292 |
| | Korinek | +4.875 / +4.890 | +6.015 / +6.028 | −0.610 / −0.592 | +0.265 / +0.278 | +109.0 / +109.2 | −3.000 / −3.018 | −0.346 / −0.347 |
| ζK 0 | UK central | +0.366 / +0.366 | +0.671 / +0.665 | −1.712 / −1.708 | −0.532 / −0.525 | +48.2 / +48.3 | +0.331 / +0.330 | −0.007 / −0.006 |
| | Korinek | +3.041 / +3.047 | +1.803 / +1.795 | −2.039 / −2.029 | −0.171 / −0.160 | +141.5 / +141.9 | −1.555 / −1.562 | +0.207 / +0.207 |
| ζK 0.5 | UK central | +2.460 / +2.471 | +5.970 / +5.990 | +0.047 / +0.057 | +0.131 / +0.137 | +10.4 / +10.3 | −1.480 / −1.496 | −0.572 / −0.572 |
| | Korinek | +9.924 / +9.957 | +18.549 / +18.615 | +3.594 / +3.624 | +1.951 / +1.966 | +28.7 / +28.5 | −7.014 / −7.062 | −1.403 / −1.403 |

**Every 2028 rule holds:**
- Monotonic in shock size at ζK 0.1: in the main arm, everything except the wage, consumption and GDP per unit of TFP; in the other two arms, every column. The same exceptions as in 2028 apply at the other closures (for example, main-arm debt/GDP and tax/GDP at ζK 0); section 9 reports no ordering break.
- The stress test's headline GDP is zero within 0.01pp. The accepted iterations give +0.005, +0.006, +0.003 and −0.000 at ζK 0.1; −0.000, −0.000, −0.000 and +0.001 at ζK 0; and −0.001, −0.008, −0.009 and +0.001 at ζK 0.5.
- "Technology unchanged" lies between the other two arms at ζK = 0.1, and below the stress test at ζK = 0 (A1). Its GDP at ζK = 0 is −0.016, −0.033, −0.048 and −0.053%, against the stress test's 0.000. The stress test needs output at fixed inputs 0.016, 0.033, 0.048 and 0.054% *higher* than "technology unchanged" (2028: 0.034% for UK central and 0.054% for Korinek).
- Per unit of shock, the coefficients match 2028:
  - "technology unchanged" GDP is 0.28–0.34 per pp of share fall at ζK 0.1;
  - the marginal GDP effect of TFP is 1.09–1.14 per 1%;
  - in the main arm, the elasticity of capital supply is 0.57–0.62 at ζK 0.1 and 0.15–0.16 at ζK 0;
  - foreign capital is 75–80% of the extra capital at ζK 0.1.

**The same accepted R4 iterations as in 2028:**
- Korinek `r4_2` at ζK 0.1. Its `r4_1` gives −0.016%, against −0.019% in 2028.
- `r4_2` for UK low and UK central and `r4_3` for Korinek at ζK 0.5; `r4_1` elsewhere.
- One rejected iteration moved: UK low `r4_1` at ζK 0.5 is −0.304% here and +0.037% in 2028. Both are outside 0.01pp, so both sets went to `r4_2`, which gives −0.001% and +0.000%.

## 5. Dynamics

### The 2027 announcement year

| arm | I % | L % | C % | GDP % | K % | 2028 set, its 2028: I / L / C / GDP / K |
|---|---|---|---|---|---|---|
| UK low, ζK 0.1, main | +3.41 | +0.07 | −0.24 | +0.16 | +0.18 | +3.39 / +0.07 / −0.23 / +0.16 / +0.19 |
| UK central, ζK 0.1, main | +7.87 | +0.18 | −0.55 | +0.37 | +0.42 | +7.82 / +0.17 / −0.55 / +0.36 / +0.43 |
| UK central, ζK 0.1, stress test | +7.33 | +0.30 | −0.84 | +0.23 | +0.39 | +7.27 / +0.30 / −0.83 / +0.23 / +0.39 |
| UK high, ζK 0.1, main | +15.14 | +0.17 | −0.67 | +0.80 | +0.81 | +15.07 / +0.17 / −0.66 / +0.80 / +0.82 |
| Korinek, ζK 0.1, main | +21.41 | +0.07 | −0.54 | +1.23 | +1.14 | +21.33 / +0.07 / −0.53 / +1.23 / +1.14 |
| UK central, ζK 0, main | +3.21 | +0.22 | −0.72 | +0.24 | 0.00 | +3.16 / +0.22 / −0.72 / +0.24 / 0.00 |
| Korinek, ζK 0, main | +6.79 | +0.23 | −1.07 | +0.92 | 0.00 | +6.70 / +0.22 / −1.06 / +0.91 / 0.00 |

The signs match 2028 in every solve. On the news, investment and labour rise and consumption falls. At ζK = 0 the 2027 capital gap is exactly zero. Investment holds a three-year plateau and then drops: UK central +7.9, +8.4 and +8.9% in 2027–29, then +3.6% in 2030 (A7). At ζK = 0.5 the main arm's 2027 labour falls and consumption rises (A15), in the same 8 cells as in 2028.

### After 2030

UK central main arm, ζK = 0.1. Each year is shown as the 2027 set / the 2028 set at the same year after the shock.

| | year 4 | year 5 | year 6 | year 7 | year 8 | year 9 | year 10 (2036, 2027 set only) |
|---|---|---|---|---|---|---|---|
| GDP % | +0.91 / +0.92 | +0.93 / +0.93 | +0.94 / +0.94 | +0.94 / +0.94 | +0.93 / +0.94 | +0.93 / +0.93 | +0.91 |
| K % | +2.01 / +2.01 | +2.12 / +2.12 | +2.21 / +2.20 | +2.27 / +2.27 | +2.32 / +2.31 | +2.35 / +2.35 | +2.37 |
| wage % | −1.27 / −1.27 | −1.23 / −1.22 | −1.19 / −1.18 | −1.16 / −1.15 | −1.13 / −1.12 | −1.11 / −1.10 | −1.10 |
| C % | −0.40 / −0.39 | −0.31 / −0.30 | −0.23 / −0.23 | −0.16 / −0.15 | −0.10 / −0.09 | −0.04 / −0.02 | +0.02 |
| debt/GDP pp | −0.12 / −0.13 | +0.30 / +0.30 | +0.72 / +0.72 | +1.14 / +1.14 | +1.56 / +1.57 | +1.99 / +1.99 | +2.41 |

**The paths are the 2028 paths shifted one year.** Every sign change in the main arms comes one calendar year earlier:
- Debt/GDP turns positive in 2031 (UK low, UK central), 2032 (UK high) and 2034 (Korinek) at ζK 0.1, against 2032, 2032, 2033 and 2035.
- The Korinek wage turns positive in 2034, against 2035.

The extra year at the end lets UK central's consumption reach +0.02% in 2036. In the 2028 set it was still −0.02% in 2036.

### Debt/GDP, and the 2036 debt rule

At ζK = 0.1 the UK central main arm's 2036 rise of +2.41pp splits into three counterfactual recursions:
- the interest rate alone: +2.79pp (2028: +2.43);
- the primary balance alone: +0.62pp (+0.56);
- GDP growth alone: −0.99pp (−0.98).

The mechanism is whole-stock repricing (A4). The rise is larger because the stock has repriced for one more year. **Under the common rule, debt/GDP still rises in every arm by 2036 in the model** (under fixed spending the main arm ends lower, as in 2028). PR #43's slower-repricing check (4–66%) was run on the 2028 set and not on this one.

The 2036 G rule refits with ρ_G 0.6006, 0.6005 and 0.6001 by closure (2028: 0.6007, 0.6005 and 0.6001), with residuals at most 8.8e-5 of GDP.
- The 2036 G cut is larger: UK central main arm −5.8% (2028: −4.9%); Korinek stress test −25.8% (−22.9%).
- The arms reach 2036 with one more year of extra debt, and the rule closes 60% of the gap in that year.
- The 2028 ruling stands: **2036 flows (G, I, tax/GDP) are not usable**; 2036 stocks are (A9).

### The stress test after its target year

The GDP gap drifts from 2030 to 2036 (log points × 100; 2028 set in brackets: 2031 to 2036, one year fewer):
- ζK 0.1: UK low −0.062 (−0.049), UK central −0.148 (−0.116), UK high −0.286 (−0.227), Korinek −0.403 (−0.320).
- ζK 0: +0.025 (+0.027), +0.061 (+0.065), +0.122 (+0.128), +0.177 (+0.182).

**At ζK = 0.1 the drift per year matches 2028:** UK central −0.025 against −0.023. The sixth year adds the expected amount.

**At ζK = 0 the six-year drift is 0.002–0.006pp *smaller* than the five-year one.** The capital term is larger (UK central +0.182 against +0.167), but labour falls further (−0.108 against −0.093). That is the same A8 mechanism, wealth building as labour keeps falling, carried one year further. The two terms nearly cancel, so the sign and the size class are unchanged (A8).

## 6. Against the 2026-start results

**This comparison is cleaner than in 2028.** The 2026-start run (`analysis/rerun/output`) ramps over the same calendar years, 2027–30, and its Z values are identical (Korinek main arm 0.972112 in both), because both are set at 2026 inputs. The only difference is the 2026 anticipation year. So the 2027 set isolates what anticipation adds. The 2028 comparison set old 2030 against new 2031.

Korinek main arm, 2030 against the old 2030:

| | ζK 0.1: old | new | new/old | ζK 0: old | new | new/old |
|---|---|---|---|---|---|---|
| GDP % | +4.896 | +4.875 | 0.996 | +3.099 | +3.041 | 0.981 |
| GNI % | +3.820 | +3.791 | 0.993 | +2.937 | +2.875 | 0.979 |
| K % | +6.101 | +6.015 | 0.986 | +2.001 | +1.803 | 0.901 |
| wage % | −0.572 | −0.610 | 1.07 | −1.954 | −2.039 | 1.04 |
| C % | +0.310 | +0.265 | 0.86 (−0.05pp) | −0.079 | −0.171 | 2.2 (−0.09pp) |
| I % | +13.255 | +13.258 | 1.000 | +12.658 | +12.707 | 1.004 |
| Δr bp | +108.3 | +109.0 | 1.007 | +139.8 | +141.5 | 1.013 |
| debt/GDP pp | −3.075 | −3.000 | 0.976 | −1.644 | −1.555 | 0.946 |

- **At ζK = 0.1, anticipation adds almost nothing (A10).** GDP is 0.021pp lower without it (0.006pp in 2028). The investment path in 2027–30 is +21.41, +25.50, +29.66 and +13.26%, against the old +21.34, +25.45, +29.64 and +13.26%. In 2035, GDP is +5.248% against the old +5.266%.
- **At ζK = 0, capital is 10% smaller and GDP 2% smaller**, as in 2028. Capital comes only from household saving, and the surprise has one fewer year of it. Capital gaps are 0.00, +0.48, +1.09 and +1.80% against the old +0.00, +0.28, +0.73, +1.31 and +2.00% (2026–30).
- **"Technology unchanged" at ζK = 0 changes sign on GDP:** −0.053% against the old +0.053%, exactly as in 2028 (A1).
- Every difference is inside the gate's 30% band, or inside the 0.25pp floor for consumption.
- At ζK = 0.5 there are no 2026-start arm records, so there is no comparison (as in 2028).

## 7. Against the literature

### IMF UK (SIP/2026/072): output +2.52% at year 4 (digitised), +3.26% at year 5, TFP +0.42% / +0.53%

| | IMF, year 4 | UK central, ζK 0.1, 2030 (year 4) | 2031 (year 5) | UK central, ζK 0, 2030 |
|---|---|---|---|---|
| TFP input | +0.42% | +0.40% target, +0.37% at 2030 inputs | same | +0.37% |
| output | +2.52% | +0.91% | +0.93% | +0.37% |
| output per unit of TFP (ours) | 6.0 | 2.3 | 2.3 | 0.9 |

**The unchanged-return bound** is arithmetic on UK central's inputs, not a solve. Hold γY/K at its continuation value:
- With labour unchanged, capital rises 7.94% and **GDP rises 3.22%**.
- At the arm's own labour gap, **GDP rises 2.91%**.
- In the 2028 set the same figures were 7.94%, 3.23% and 2.91%.

The bound brackets the IMF's +2.5% (year 4) and +3.3% (year 5). The verdict is unchanged: **plausible given the closure, and below the IMF for a stated reason.**
- In the solve the return rises 37.8bp, and capital rises 2.01%, an elasticity of 0.59.
- The elasticity rises to 0.77 by 2036 (0.75 in 2028) and 1.39 in the steady state.
- GDP per unit of TFP is 3.69 in the steady state (3.72). Both steady-state figures are quoted from the sanity gate's diagnostics.
- The marginal effect of TFP is (0.914 − 0.472)/0.4 = 1.1, as in 2028.

**Numbers for the dashboard's `imfGap.json`** (ruling 5):

```json
"unchanged_return_gdp_pct": { "lo": 2.9, "hi": 3.2 },
"unchanged_return_source": "Results sanity audit, docs/results_sanity_2027.md section 7: capital supplied at an unchanged return gives GDP +3.2% with labour unchanged and +2.9% with the arm's own labour gap (UK central, ζK = 0.1, 2030, year 4 of the 2027 surprise). Arithmetic on UK central's inputs, not a solve."
```

The values are unchanged from the current file. `imf_y4_output_pct` (2.52) and its source are IMF figures and do not depend on this set.

### OBR

Per pp of share fall, the stress test's tax/GDP falls:
- at ζK 0.1: 0.150 (UK low), 0.153 (UK central), 0.158 (UK high) and 0.161 (Korinek), 71–77% of the FRS 2026 Box 4.1 midpoint (0.21);
- at ζK 0: 0.025–0.027, 12–13%.

Both are identical to 2028.

UK low's stress test (the like-for-like for EFO ¶6.18) gives receipts −0.103% of GDP against the OBR's −0.17%. Its debt/GDP is +0.38pp in 2030 (2028: +0.38pp in 2031) and +1.69pp in 2036 (2028: +1.47pp; 2036 is one year further out here). The explanations are unchanged: the tax wedge, no unemployment channel, and the G/Y rule.

## 8. Tax diagnostics

2030 change in tax/GDP, pp per pp of share fall:

| closure | automation + productivity | technology unchanged | stress test | 2028 set (2031), same order |
|---|---|---|---|---|
| ζK 0.1 | −0.111, −0.117, −0.100, −0.089 | −0.132, −0.134, −0.138, −0.141 | −0.150, −0.153, −0.158, −0.161 | same to 0.001 |
| ζK 0 | −0.002, −0.004, **+0.027**, **+0.053** | −0.030, −0.029, −0.028, −0.027 | −0.028, −0.027, −0.026, −0.025 | same to 0.001 |
| ζK 0.5 | −0.353, −0.357, −0.358, −0.360 | −0.358, −0.361, −0.366, −0.370 | −0.373, −0.374, −0.376, −0.377 | same to 0.006 |

Scenarios are listed UK low, UK central, UK high, Korinek. The bases sum to the total to under 1e-14 in every row.

- **Sign:** the OBR sign holds in 2030 everywhere except the two A6 main arms at ζK = 0 (UK high +0.079pp, Korinek +0.207pp). Each turns positive at the same point after the shock as in 2028: Korinek in the second year (2028; 2029 in the 2028 set), UK high in the third (2029; 2030).
  - Korinek: payroll −0.585 + income tax +0.413 + business +0.709 + consumption −0.304 + bequest and wealth −0.027.
  - UK high: −0.435 + 0.196 + 0.513 − 0.197 + 0.001.
- **The knife-edge cases stay explained:**
  - UK central's main arm at ζK = 0 is −0.007pp in 2030, −0.001pp in 2031, and positive from 2032.
  - UK low's is −0.001pp in 2030 and positive from 2031.
  - Both fall by less than half the OBR's figure, so they are A6-explained, not wrong (2028: −0.006 and −0.001pp in 2031).
- **New in the window, not in the verdict:** at ζK = 0 the no-TFP arms turn positive in 2036, by +0.000 to +0.026pp. So do the two no-TFP Korinek fixed-spending arms (+0.001pp). The Korinek stress test is already positive in 2035 (+0.002pp). In the 2028 set, three of these arms were already positive in 2036. The extra year carries the same slow upward drift (household capital income rising with wealth) past zero. 2036 is the debt rule's year (A9), and 2035 is only +0.002, so this is the A6 mechanism, not a new one.
- **Size at ζK 0.5 (A16):** 1.68–1.81 times the OBR midpoint, against 1.7–1.8 in 2028.

**The sanity files' diagnostics.** `diagnostics.tax_gdp_2030` and `effective_rates_2030` are present in 70 of the 74 records; the four without are the three continuations and `continuation_dnfull`. The script recomputes `change_pp` and matches it to 1.4e-14.

The effective-rate wedge (labour rate less gross capital rate) in UK central's reference path:
- 14.83pp at ζK 0.1 (2028: 14.80);
- 13.58pp at ζK 0 (13.55);
- 19.70pp at ζK 0.5 (19.68).

UK central's arms have wedges 0.4–0.7pp lower at ζK 0.1 and 0, and within 0.2pp at ζK 0.5. Against the OBR's 19pp (FRS Box 4.1: 46% against 27%) and 23pp (EFO Nov 2025 ¶2.64: 40% against 17%), the gap is the one 2028 documented (A6, `docs/red_flags_1_3.md`).

## 9. Orderings and inequalities

`--mono` reports **no ordering or inequality break**. The structural diff against 2028 differs only in rounded integer columns.

- **Documented exceptions only:** at ζK = 0, "technology unchanged" is below the stress test on Y, GNI, NNI, w, C, K and Z. This holds for all four scenarios under the common rule, and for UK central and Korinek under fixed spending (A1). The list is the same six as in 2028.
- **A17 pair table:** 12 of 12 accepted debt-neutral and common-rule pairs have opposite signs. Only the two Korinek main arms have higher debt-neutral transfers, with summed gaps over 2027–30 of +40.2 at ζK 0.1 and +18.4 at ζK 0 (2028: +40.1 and +18.3).
- **A16 income table:** the depreciation and foreign shares of the extra gross capital income at ζK 0.5 are 48–50% and 33–34%, as in 2028.
- **No-shock paths in 2030:** the return is 5.70%, 5.33% and 3.75%, and K/Y is 2.55, 2.64 and 3.08, by closure (ζK 0, 0.1, 0.5). These are within 0.02pp and 0.01 of the 2028 set's 2031 values. The baseline gate rows are identical, as the baseline is shared.

## Verdict table

The 2028 rules apply unchanged: the same expectations (`analysis/surprise/expectations.json`), the same "surprising-but-explained" rules (A1–A8, A13–A17), and the same "wrong" rules. **No rule was added or changed for 2027.** As in 2028, the rules were written after the 2028 results had been read, so this is a consistency check, not a blind test.

| | consistent | surprising-but-explained | wrong |
|---|---|---|---|
| Common rule | 466 | 144 | 2 (A6: UK high and Korinek main arms, ζK 0) |
| Debt-neutral | 168 | 35 | 1 (A6: Korinek main arm, ζK 0) |
| Fixed spending | 165 | 38 | 1 (A6: Korinek main arm, ζK 0) |
| All | 799 | 217 | 4 |

The full `--verdict` output is in the appendix. Blocks for scenarios and closures where a variant was never planned are left out.

## Fiscal variants and the `_dnfull` solve

**Fiscal variants:** the closure holds in all 28 records.
- Debt-neutral D/Y matches its reference to at most 2.5e-5 over 2028–36 (tolerance 1e-4).
- Under fixed spending, G and TR equal `baseline_ext` exactly (0) over 2027–35.
- The A14 cells (debt/GDP lower in 2030 under "technology unchanged" with fixed spending at ζK 0.1) and the A17 cell recur as in 2028.

**`_dnfull` (`--dnfull`):** all 10 checks with a pass rule pass. Checks 6, 11 and 13 are report-only.

| check | 2027 set | 2028 set |
|---|---|---|
| 3, 7: debt-neutral closure, D/Y against the reference | 3.5e-8, 3.7e-8 | 3.9e-7, 6.2e-7 |
| 5, 9: identities (Y, w, RC) | 1.2e-7, 1.6e-6, 7.7e-9 | 1.2e-7, 1.6e-6, 7.8e-8 |
| 9: labour share (pp) | 1.1e-4 | 1.1e-4 |
| 10: headline signs; same signs as `_dn` | pass; Y +1.09 vs +1.03, C −0.66 vs −0.58 | pass; Y +1.09 vs +1.02, C −0.65 vs −0.56 |
| 12: gaps against `.sanity.json` | 3.1e-15 | 3.1e-15 |
| 6 (report): reference against `baseline_ext` | 0.72% | 0.71% |
| 11 (report): dnfull less dn, Y / K / w / C % | +0.06 / +0.07 / +0.01 / −0.08 | +0.07 / +0.08 / +0.01 / −0.10 |
| 13 (report): to-horizon closure, from the record | reference 5.4e-5, arm 1.7e-5 | 1.9e-5, 1.6e-5 |

- **The thresholds are tied to this set.** The script draws them from this set's section 1 worst values, which are slightly looser than 2028's (labour share 6.1e-4 against 5.4e-4pp; resource constraint 7.3e-6 against 4.6e-6). Every `_dnfull` value also passes the 2028 thresholds, so no pass depends on the looser ones.
- **Check 13:** the reference's to-horizon closure is 2.8 times 2028's (5.4e-5 against 1.9e-5). It is quoted from the record (`ok=True`) and report-only. I record it as larger, not as a failure.
- **Quote the `_dnfull` arm against its own reference.** Against `continuation_dnfull` its 2030 GDP gap is +1.09%; against `continuation` it is +1.21% (2028: +1.09% and +1.25%).
- **Provenance:** no 2027 record carries an `ss_guess` field, and `uk_growth_with_ai/surprise.py` (line 1089) writes that field whenever a donor steady state is used. So every 2027 solve started from the default guess; the ζK = 0.5 UK high logs mention no donor. In 2028, two ζK = 0.5 UK high records used a donor.

## The `check` log on the assembled files

`analysis/surprise2027/output/check_assembled.log` covers the 20 `scenarios_surprise2027_*.json` files. 18 pass. Two fail with `rc=1`, and these are the known failures documented at `b348144` for 2028:

| file | check | 2027 set | 2028 set |
|---|---|---|---|
| `korinek_zk0.5` | X = Y − C − I − G, main arm (bound: X within ±6% of GDP) | −13.87, −14.16, −14.35% in 2027–29 | −13.82, −13.94, −14.18% in 2028–30 |
| `korinek_zk0.5` | X, stress test | −6.56, −6.73, −6.68% | −6.49, −6.50, −6.50% |
| `korinek_zk0.5` | I/Y in 5–35%, main arm | 23.4 to 40.5% | 23.3 to 40.5% |
| `uk_high_zk0.5` | X, main arm | −9.25, −9.31, −9.22% | −9.19, −9.08, −9.05% |

**Same failures, same files, same arms, and within 0.25pp when matched by ramp year.** The cause is the 2028 one: at ζK 0.5 the frictionless investment surge during the ramp (A7) is financed almost entirely from abroad (foreign capital supplies about 100% of the extra capital at that closure; section 4), so domestic absorption exceeds output by 9–14% of GDP for three years. It reverses when the ramp ends (+2.0% and +1.4% in 2030). UK high's stress test stays inside the bound (−4.78 to −4.90%), as in 2028. (In the assembled files, `share_shift_ramp` is the stress test: its GDP gap is +0.00% in 2030.)

`check` prints 31 WARN against 32 in 2028. The missing WARN is the Korinek stress test at ζK 0.1. Its X/Y moves −1.97pp from 2026 to 2027, against a 2.0pp warning line; the 2028 set's move was −2.05pp. The 2026 baseline's X/Y (+0.29%) is 0.08pp below 2027's (+0.37%), and the shocked level is about the same. A knife-edge, not a change in the model.

## Anomalies: new or larger in 2027

None is new in kind. A1–A17 all recur with the same mechanism and, where dated by headline year, within rounding of 2028's sizes.

| # | what | size | status |
|---|---|---|---|
| N1 | Worst resource-constraint error in the fixed-spending runs at ζK 0.1 | 7.3e-6 against 4.6e-6 (gate 1e-5) | **Not explained** beyond solver tolerance. No reported gap moves. |
| N2 | Wage, return-equation and labour-share worsts | 9.6e-6, 2.1e-5, 6.1e-4pp against 8.9e-6, 1.9e-5, 5.4e-4pp | Solver tolerance; inside the gate. |
| N3 | Foreign-capital rule ratio | 1.0017–1.0020 against 1.0020–1.0024 | Explained: return-equation constants refitted on each continuation (section 1). |
| N4 | Technology term short of target | 2–7% against 2–6% | Explained: baseline K/L, 2026–30 against 2027–31 (section 2, A11). |
| N5 | 2036 values one year further from the headline | e.g. debt/GDP +2.41 against +1.99pp; R4 drift −0.148 against −0.116; G cut −5.8 against −4.9% | Explained: the calendar-fixed window and debt rule. Compare 2035 with 2028's 2036. |
| N6 | ζK 0 R4 drift slightly smaller over six years than five | +0.061 against +0.065 (UK central) | Explained: capital and labour terms both grow (A8). |
| N7 | ζK 0 no-TFP arms' tax/GDP above zero in 2036 | +0.000 to +0.026pp | Explained: A6 drift, one year further; 2036 flows are excluded (A9). |
| N8 | `_dnfull` reference's to-horizon closure | 5.4e-5 against 1.9e-5 | Report-only; `ok=True`; recorded. |
| N9 | One fewer `check` WARN | −1.97pp against the 2.0pp line | Knife-edge. |
| N10 | Rejected UK low `r4_1` at ζK 0.5 | −0.30% against +0.04% | Rejected in both sets; the same `r4_2` is accepted. |

## Rulings

1. **Ruling (Opus 5.5, Fable unavailable): the 2027 set is accepted.** It passes every rule that the 2028 set passed, with identical verdicts in all 340 rows. No rule was changed for it.
2. **Ruling (Opus 5.5, Fable unavailable): the four A6 cells are carried over as "keep and report".** These are tax/GDP rising at ζK = 0 in the main arm of Korinek (common rule, debt-neutral and fixed spending) and UK high (common rule). The project owner's 12 Nov decision covered the 2028 solves only, so it needs his confirmation for 2027. Until then, the ζK = 0 fiscal caveat (2028 fix 3) applies to the 2027 results and names both Korinek and UK high.
3. **Ruling (Opus 5.5, Fable unavailable): the ζK = 0.5 `check` failures are accepted as known.** They are the Korinek external balance (main arm and stress test) and I/Y (main arm), and the UK high external balance (main arm). The bounds stay as they are. Do not quote ζK = 0.5 external-balance or I/Y paths during the 2027–29 ramp as forecasts.
4. **Ruling (Opus 5.5, Fable unavailable): the 22 sanity-gate investment flags are not findings.** The gate compares the 2027 jump with the old 2026 anticipation year (+17.2%, ramp weight 0). The like-for-like year is the old 2027, which has the same ramp weight and the same Z: +21.34% against +21.41% (A7, 2028 fix 2).
5. **Ruling (Opus 5.5, Fable unavailable): `imfGap.json` for the 2027 set carries `unchanged_return_gdp_pct` {lo: 2.9, hi: 3.2}**, with the source string in section 7. This is +2.91% and +3.22% rounded to 0.1.
6. **Ruling (Opus 5.5, Fable unavailable): use 2035 when comparing the two sets at a fixed horizon.** When a 2027-set figure is set beside a 2028-set figure "at the end of the window", compare this set's 2035 with that set's 2036 (year 9 in both). 2036 here is year 10, and it is also the debt rule's first year, so its flows remain unusable (A9).

## What this audit did not do

- No solve was run. No file was changed except this one, which is uncommitted.
- The cohort calculation behind the welfare results (`export_cohorts.py`, `cohorts2027.json`) is not audited. Only the `_dnfull` aggregate path is checked.
- PR #43's debt-repricing range (4–66%) was not recomputed for the 2027 set.
- The assembled `scenarios_surprise2027_*.json` files were checked only through the `check` log, not against the records number by number.
- `methodFacts2027.json` and `surprise2027.json` were not checked against this audit.
- The rules come from the 2028 audit and were written after reading those results. Here they were applied unchanged, but they are a consistency check, not a blind test.
- Published figures (IMF, OBR) are taken from `docs/literature_comparison.md` and `docs/uk_calibration.md` as in 2028. They were not re-read from the PDFs.
- Steady-state elasticity and GDP/TFP are the sanity gate's diagnostics. They were not recomputed.
- The dashboard's `imfGap.json` was not edited.

## Reproduce

```
python3 analysis/surprise/audit_surprise.py --year 2027            # every table in this document
python3 analysis/surprise/audit_surprise.py --year 2027 --verdict  # the verdict tables (appendix)
python3 analysis/surprise/audit_surprise.py --year 2027 --mono     # section 9: orderings and inequalities
python3 analysis/surprise/audit_surprise.py --year 2027 --dnfull   # the `_dnfull` checks
python3 analysis/surprise/audit_surprise.py --year 2028 [--verdict|--mono|--dnfull]   # the 2028 set, for comparison
```

The script needs numpy and the committed JSON, nothing else. For `--year 2028` it is byte-identical to `audit_2028.py`.

## Appendix: verdict tables at `a07b55b` (`--verdict` output)

Blocks where every arm is "not solved" (variants never planned for that scenario and closure) are left out.

**uk_low, zk0.1** (labour share −0.7pp, TFP +0.2%). Runs: automation + productivity: `uk_low_share_shift_tfp_ramp`; technology unchanged: `uk_low_share_shift_ramp_zfixed`; stress test (2030 GDP held): `uk_low_share_shift_ramp_r4_1`

| gap (2030 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2030 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +0.41 | consistent | small, sign open (>= 0 if capital flows in) | +0.19 | consistent | 0 within 0.01pp | +0.005 | consistent |
| GNI % | > 0, below GDP | +0.27 | consistent | below GDP | +0.06 | consistent | <= 0 | -0.12 | consistent |
| NNI % | rises less than GNI in levels | +0.14 | consistent | rises less than GNI in levels | -0.10 | surprising-but-explained (A5) | < 0 | -0.31 | consistent |
| capital % | > 0 | +0.87 | consistent | > 0 | +0.81 | consistent | > 0 | +0.75 | consistent |
| labour % | <= 0 by 2030 (wage falls) | -0.13 | consistent | <= 0 by 2030 (wage falls) | -0.12 | consistent | <= 0 by 2030 (wage falls) | -0.12 | consistent |
| wage % | sign open: share effect against productivity | -0.54 | surprising-but-explained (A2) | < 0 | -0.76 | consistent | < 0 | -0.96 | consistent |
| consumption % | sign open; > 0 expected if income rises | -0.16 | surprising-but-explained (A3) | < 0 | -0.27 | consistent | < 0 | -0.37 | consistent |
| investment % | > 0 | +1.61 | consistent | > 0 | +1.22 | consistent | > 0 | +0.88 | consistent |
| return, bp | > 0 | +16.8 | consistent | > 0 | +15.1 | consistent | > 0 | +13.7 | consistent |
| labour share, pp | = -target | -0.70 | consistent | = -target | -0.70 | consistent | = -target | -0.70 | consistent |
| debt/GDP, pp | sign open under the G/Y rule | -0.07 | surprising-but-explained (A4) | > 0 | +0.17 | consistent | > 0 | +0.38 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | -0.08 | consistent | < 0 (OBR sign) | -0.09 | consistent | < 0 (OBR sign) | -0.10 | consistent |
| 2027 investment % | > 0, a one-year jump | +3.41 | surprising-but-explained (A7) | > 0, a one-year jump | +3.29 | surprising-but-explained (A7) | > 0, a one-year jump | +3.18 | surprising-but-explained (A7) |
| 2027 labour % | > 0 (more work on the news) | +0.08 | consistent | > 0 (more work on the news) | +0.11 | consistent | > 0 (more work on the news) | +0.13 | consistent |
| 2027 consumption % | < 0 (more saving on the news) | -0.24 | consistent | < 0 (more saving on the news) | -0.31 | consistent | < 0 (more saving on the news) | -0.37 | consistent |
| 2036 GDP % | > 0 | +0.42 | consistent | small, sign open | +0.16 | consistent | near 0, not held after 2030 | -0.057 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | sign open under the G/Y rule | +1.02 | surprising-but-explained (A4) | > 0 | +1.38 | consistent | > 0 | +1.69 | consistent |

**uk_central, zk0.1** (labour share −1.6pp, TFP +0.4%). Runs: automation + productivity: `uk_central_share_shift_tfp_ramp`; technology unchanged: `uk_central_share_shift_ramp_zfixed`; stress test (2030 GDP held): `uk_central_share_shift_ramp_r4_1`

| gap (2030 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2030 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +0.91 | consistent | small, sign open (>= 0 if capital flows in) | +0.47 | consistent | 0 within 0.01pp | +0.006 | consistent |
| GNI % | > 0, below GDP | +0.57 | consistent | below GDP | +0.15 | consistent | <= 0 | -0.29 | consistent |
| NNI % | rises less than GNI in levels | +0.27 | consistent | rises less than GNI in levels | -0.21 | surprising-but-explained (A5) | < 0 | -0.72 | consistent |
| capital % | > 0 | +2.01 | consistent | > 0 | +1.88 | consistent | > 0 | +1.73 | consistent |
| labour % | <= 0 by 2030 (wage falls) | -0.30 | consistent | <= 0 by 2030 (wage falls) | -0.29 | consistent | <= 0 by 2030 (wage falls) | -0.27 | consistent |
| wage % | sign open: share effect against productivity | -1.27 | surprising-but-explained (A2) | < 0 | -1.72 | consistent | < 0 | -2.19 | consistent |
| consumption % | sign open; > 0 expected if income rises | -0.40 | surprising-but-explained (A3) | < 0 | -0.62 | consistent | < 0 | -0.85 | consistent |
| investment % | > 0 | +3.60 | consistent | > 0 | +2.81 | consistent | > 0 | +1.98 | consistent |
| return, bp | > 0 | +37.8 | consistent | > 0 | +34.3 | consistent | > 0 | +30.6 | consistent |
| labour share, pp | = -target | -1.60 | consistent | = -target | -1.60 | consistent | = -target | -1.60 | consistent |
| debt/GDP, pp | sign open under the G/Y rule | -0.12 | surprising-but-explained (A4) | > 0 | +0.36 | consistent | > 0 | +0.87 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | -0.19 | consistent | < 0 (OBR sign) | -0.21 | consistent | < 0 (OBR sign) | -0.24 | consistent |
| 2027 investment % | > 0, a one-year jump | +7.86 | surprising-but-explained (A7) | > 0, a one-year jump | +7.60 | surprising-but-explained (A7) | > 0, a one-year jump | +7.33 | surprising-but-explained (A7) |
| 2027 labour % | > 0 (more work on the news) | +0.18 | consistent | > 0 (more work on the news) | +0.24 | consistent | > 0 (more work on the news) | +0.30 | consistent |
| 2027 consumption % | < 0 (more saving on the news) | -0.55 | consistent | < 0 (more saving on the news) | -0.69 | consistent | < 0 (more saving on the news) | -0.84 | consistent |
| 2036 GDP % | > 0 | +0.91 | consistent | small, sign open | +0.40 | consistent | near 0, not held after 2030 | -0.142 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | sign open under the G/Y rule | +2.41 | surprising-but-explained (A4) | > 0 | +3.14 | consistent | > 0 | +3.91 | consistent |

**uk_high, zk0.1** (labour share −2.9pp, TFP +1.6%). Runs: automation + productivity: `uk_high_share_shift_tfp_ramp`; technology unchanged: `uk_high_share_shift_ramp_zfixed`; stress test (2030 GDP held): `uk_high_share_shift_ramp_r4_1`

| gap (2030 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2030 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +2.73 | consistent | small, sign open (>= 0 if capital flows in) | +0.93 | consistent | 0 within 0.01pp | +0.003 | consistent |
| GNI % | > 0, below GDP | +2.02 | consistent | below GDP | +0.32 | consistent | <= 0 | -0.56 | consistent |
| NNI % | rises less than GNI in levels | +1.58 | consistent | rises less than GNI in levels | -0.35 | surprising-but-explained (A5) | < 0 | -1.35 | consistent |
| capital % | > 0 | +4.08 | consistent | > 0 | +3.50 | consistent | > 0 | +3.20 | consistent |
| labour % | <= 0 by 2030 (wage falls) | -0.58 | consistent | <= 0 by 2030 (wage falls) | -0.52 | consistent | <= 0 by 2030 (wage falls) | -0.49 | consistent |
| wage % | sign open: share effect against productivity | -1.28 | surprising-but-explained (A2) | < 0 | -3.06 | consistent | < 0 | -3.98 | consistent |
| consumption % | sign open; > 0 expected if income rises | -0.21 | surprising-but-explained (A3) | < 0 | -1.09 | consistent | < 0 | -1.54 | consistent |
| investment % | > 0 | +8.35 | consistent | > 0 | +5.16 | consistent | > 0 | +3.50 | consistent |
| return, bp | > 0 | +75.4 | consistent | > 0 | +61.4 | consistent | > 0 | +54.1 | consistent |
| labour share, pp | = -target | -2.90 | consistent | = -target | -2.90 | consistent | = -target | -2.90 | consistent |
| debt/GDP, pp | sign open under the G/Y rule | -1.34 | surprising-but-explained (A4) | > 0 | +0.57 | consistent | > 0 | +1.59 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | -0.29 | consistent | < 0 (OBR sign) | -0.40 | consistent | < 0 (OBR sign) | -0.46 | consistent |
| 2027 investment % | > 0, a one-year jump | +15.14 | surprising-but-explained (A7) | > 0, a one-year jump | +14.02 | surprising-but-explained (A7) | > 0, a one-year jump | +13.45 | surprising-but-explained (A7) |
| 2027 labour % | > 0 (more work on the news) | +0.17 | consistent | > 0 (more work on the news) | +0.42 | consistent | > 0 (more work on the news) | +0.55 | consistent |
| 2027 consumption % | < 0 (more saving on the news) | -0.67 | consistent | < 0 (more saving on the news) | -1.23 | consistent | < 0 (more saving on the news) | -1.52 | consistent |
| 2036 GDP % | > 0 | +2.89 | consistent | small, sign open | +0.80 | consistent | near 0, not held after 2030 | -0.282 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | sign open under the G/Y rule | +2.73 | surprising-but-explained (A4) | > 0 | +5.65 | consistent | > 0 | +7.19 | consistent |

**korinek, zk0.1** (labour share −3.9pp, TFP +3.1%). Runs: automation + productivity: `korinek_share_shift_tfp_ramp`; technology unchanged: `korinek_share_shift_ramp_zfixed`; stress test (2030 GDP held): `korinek_share_shift_ramp_r4_2`

| gap (2030 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2030 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +4.88 | consistent | small, sign open (>= 0 if capital flows in) | +1.34 | consistent | 0 within 0.01pp | -0.000 | consistent |
| GNI % | > 0, below GDP | +3.79 | consistent | below GDP | +0.47 | consistent | <= 0 | -0.78 | consistent |
| NNI % | rises less than GNI in levels | +3.32 | consistent | rises less than GNI in levels | -0.44 | surprising-but-explained (A5) | < 0 | -1.87 | consistent |
| capital % | > 0 | +6.02 | consistent | > 0 | +4.81 | consistent | > 0 | +4.36 | consistent |
| labour % | <= 0 by 2030 (wage falls) | -0.81 | consistent | <= 0 by 2030 (wage falls) | -0.71 | consistent | <= 0 by 2030 (wage falls) | -0.67 | consistent |
| wage % | sign open: share effect against productivity | -0.61 | surprising-but-explained (A2) | < 0 | -4.06 | consistent | < 0 | -5.37 | consistent |
| consumption % | sign open; > 0 expected if income rises | +0.27 | consistent | < 0 | -1.44 | consistent | < 0 | -2.08 | consistent |
| investment % | > 0 | +13.26 | consistent | > 0 | +7.00 | consistent | > 0 | +4.63 | consistent |
| return, bp | > 0 | +109.0 | consistent | > 0 | +81.7 | consistent | > 0 | +71.2 | consistent |
| labour share, pp | = -target | -3.90 | consistent | = -target | -3.90 | consistent | = -target | -3.90 | consistent |
| debt/GDP, pp | sign open under the G/Y rule | -3.00 | surprising-but-explained (A4) | > 0 | +0.69 | consistent | > 0 | +2.15 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | -0.35 | surprising-but-explained (A6) | < 0 (OBR sign) | -0.55 | consistent | < 0 (OBR sign) | -0.63 | consistent |
| 2027 investment % | > 0, a one-year jump | +21.41 | surprising-but-explained (A7) | > 0, a one-year jump | +19.12 | surprising-but-explained (A7) | > 0, a one-year jump | +18.27 | surprising-but-explained (A7) |
| 2027 labour % | > 0 (more work on the news) | +0.07 | consistent | > 0 (more work on the news) | +0.55 | consistent | > 0 (more work on the news) | +0.74 | consistent |
| 2027 consumption % | < 0 (more saving on the news) | -0.54 | consistent | < 0 (more saving on the news) | -1.63 | consistent | < 0 (more saving on the news) | -2.05 | consistent |
| 2036 GDP % | > 0 | +5.28 | consistent | small, sign open | +1.15 | consistent | near 0, not held after 2030 | -0.403 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | sign open under the G/Y rule | +1.91 | surprising-but-explained (A4) | > 0 | +7.55 | consistent | > 0 | +9.77 | consistent |

**uk_low, zk0** (labour share −0.7pp, TFP +0.2%). Runs: automation + productivity: `uk_low_share_shift_tfp_ramp`; technology unchanged: `uk_low_share_shift_ramp_zfixed`; stress test (2030 GDP held): `uk_low_share_shift_ramp_r4_1`

| gap (2030 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2030 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +0.18 | consistent | small, sign open (>= 0 if capital flows in) | -0.02 | surprising-but-explained (A1) | 0 within 0.01pp | -0.000 | consistent |
| GNI % | > 0, below GDP | +0.16 | consistent | below GDP | -0.04 | surprising-but-explained (A1) | <= 0 | -0.03 | consistent |
| NNI % | rises less than GNI in levels | +0.13 | consistent | rises less than GNI in levels | -0.11 | consistent | < 0 | -0.09 | consistent |
| capital % | > 0 | +0.30 | consistent | > 0 | +0.28 | consistent | > 0 | +0.28 | consistent |
| labour % | <= 0 by 2030 (wage falls) | -0.17 | consistent | <= 0 by 2030 (wage falls) | -0.16 | consistent | <= 0 by 2030 (wage falls) | -0.16 | consistent |
| wage % | sign open: share effect against productivity | -0.72 | surprising-but-explained (A2) | < 0 | -0.93 | consistent | < 0 | -0.91 | consistent |
| consumption % | sign open; > 0 expected if income rises | -0.22 | surprising-but-explained (A3) | < 0 | -0.33 | consistent | < 0 | -0.32 | consistent |
| investment % | > 0 | +1.52 | consistent | > 0 | +1.09 | consistent | > 0 | +1.12 | consistent |
| return, bp | > 0 | +21.3 | consistent | > 0 | +19.2 | consistent | > 0 | +19.4 | consistent |
| labour share, pp | = -target | -0.70 | consistent | = -target | -0.70 | consistent | = -target | -0.70 | consistent |
| debt/GDP, pp | sign open under the G/Y rule | +0.12 | surprising-but-explained (A4) | > 0 | +0.34 | consistent | > 0 | +0.33 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | -0.00 | surprising-but-explained (A6) | < 0 (OBR sign) | -0.02 | surprising-but-explained (A6) | < 0 (OBR sign) | -0.02 | surprising-but-explained (A6) |
| 2027 investment % | > 0, a one-year jump | +1.40 | surprising-but-explained (A7) | > 0, a one-year jump | +1.49 | surprising-but-explained (A7) | > 0, a one-year jump | +1.48 | surprising-but-explained (A7) |
| 2027 labour % | > 0 (more work on the news) | +0.09 | consistent | > 0 (more work on the news) | +0.12 | consistent | > 0 (more work on the news) | +0.12 | consistent |
| 2027 consumption % | < 0 (more saving on the news) | -0.31 | consistent | < 0 (more saving on the news) | -0.38 | consistent | < 0 (more saving on the news) | -0.37 | consistent |
| 2036 GDP % | > 0 | +0.25 | consistent | small, sign open | +0.00 | consistent | near 0, not held after 2030 | +0.025 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | sign open under the G/Y rule | +0.97 | surprising-but-explained (A4) | > 0 | +1.34 | consistent | > 0 | +1.31 | consistent |

**uk_central, zk0** (labour share −1.6pp, TFP +0.4%). Runs: automation + productivity: `uk_central_share_shift_tfp_ramp`; technology unchanged: `uk_central_share_shift_ramp_zfixed`; stress test (2030 GDP held): `uk_central_share_shift_ramp_r4_1`

| gap (2030 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2030 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +0.37 | consistent | small, sign open (>= 0 if capital flows in) | -0.03 | surprising-but-explained (A1) | 0 within 0.01pp | -0.000 | consistent |
| GNI % | > 0, below GDP | +0.30 | consistent | below GDP | -0.10 | surprising-but-explained (A1) | <= 0 | -0.06 | consistent |
| NNI % | rises less than GNI in levels | +0.23 | consistent | rises less than GNI in levels | -0.24 | consistent | < 0 | -0.20 | consistent |
| capital % | > 0 | +0.67 | consistent | > 0 | +0.64 | consistent | > 0 | +0.64 | consistent |
| labour % | <= 0 by 2030 (wage falls) | -0.40 | consistent | <= 0 by 2030 (wage falls) | -0.38 | consistent | <= 0 by 2030 (wage falls) | -0.38 | consistent |
| wage % | sign open: share effect against productivity | -1.71 | surprising-but-explained (A2) | < 0 | -2.12 | consistent | < 0 | -2.09 | consistent |
| consumption % | sign open; > 0 expected if income rises | -0.53 | surprising-but-explained (A3) | < 0 | -0.74 | consistent | < 0 | -0.72 | consistent |
| investment % | > 0 | +3.34 | consistent | > 0 | +2.48 | consistent | > 0 | +2.55 | consistent |
| return, bp | > 0 | +48.2 | consistent | > 0 | +43.9 | consistent | > 0 | +44.3 | consistent |
| labour share, pp | = -target | -1.60 | consistent | = -target | -1.60 | consistent | = -target | -1.60 | consistent |
| debt/GDP, pp | sign open under the G/Y rule | +0.33 | surprising-but-explained (A4) | > 0 | +0.78 | consistent | > 0 | +0.74 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | -0.01 | surprising-but-explained (A6) | < 0 (OBR sign) | -0.05 | surprising-but-explained (A6) | < 0 (OBR sign) | -0.04 | surprising-but-explained (A6) |
| 2027 investment % | > 0, a one-year jump | +3.21 | surprising-but-explained (A7) | > 0, a one-year jump | +3.39 | surprising-but-explained (A7) | > 0, a one-year jump | +3.38 | surprising-but-explained (A7) |
| 2027 labour % | > 0 (more work on the news) | +0.22 | consistent | > 0 (more work on the news) | +0.28 | consistent | > 0 (more work on the news) | +0.27 | consistent |
| 2027 consumption % | < 0 (more saving on the news) | -0.72 | consistent | < 0 (more saving on the news) | -0.85 | consistent | < 0 (more saving on the news) | -0.84 | consistent |
| 2036 GDP % | > 0 | +0.52 | consistent | small, sign open | +0.02 | consistent | near 0, not held after 2030 | +0.061 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | sign open under the G/Y rule | +2.30 | surprising-but-explained (A4) | > 0 | +3.05 | consistent | > 0 | +2.99 | consistent |

**uk_high, zk0** (labour share −2.9pp, TFP +1.6%). Runs: automation + productivity: `uk_high_share_shift_tfp_ramp`; technology unchanged: `uk_high_share_shift_ramp_zfixed`; stress test (2030 GDP held): `uk_high_share_shift_ramp_r4_1`

| gap (2030 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2030 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +1.55 | consistent | small, sign open (>= 0 if capital flows in) | -0.05 | surprising-but-explained (A1) | 0 within 0.01pp | -0.000 | consistent |
| GNI % | > 0, below GDP | +1.43 | consistent | below GDP | -0.16 | surprising-but-explained (A1) | <= 0 | -0.12 | consistent |
| NNI % | rises less than GNI in levels | +1.46 | surprising-but-explained (A5) | rises less than GNI in levels | -0.43 | consistent | < 0 | -0.37 | consistent |
| capital % | > 0 | +1.29 | consistent | > 0 | +1.15 | consistent | > 0 | +1.15 | consistent |
| labour % | <= 0 by 2030 (wage falls) | -0.79 | consistent | <= 0 by 2030 (wage falls) | -0.70 | consistent | <= 0 by 2030 (wage falls) | -0.70 | consistent |
| wage % | sign open: share effect against productivity | -2.21 | surprising-but-explained (A2) | < 0 | -3.83 | consistent | < 0 | -3.79 | consistent |
| consumption % | sign open; > 0 expected if income rises | -0.50 | surprising-but-explained (A3) | < 0 | -1.33 | consistent | < 0 | -1.30 | consistent |
| investment % | > 0 | +7.92 | consistent | > 0 | +4.49 | consistent | > 0 | +4.59 | consistent |
| return, bp | > 0 | +97.0 | consistent | > 0 | +79.3 | consistent | > 0 | +79.9 | consistent |
| labour share, pp | = -target | -2.90 | consistent | = -target | -2.90 | consistent | = -target | -2.90 | consistent |
| debt/GDP, pp | sign open under the G/Y rule | -0.38 | surprising-but-explained (A4) | > 0 | +1.39 | consistent | > 0 | +1.34 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | +0.08 | WRONG (A6) | < 0 (OBR sign) | -0.08 | surprising-but-explained (A6) | < 0 (OBR sign) | -0.08 | surprising-but-explained (A6) |
| 2027 investment % | > 0, a one-year jump | +5.39 | surprising-but-explained (A7) | > 0, a one-year jump | +6.11 | surprising-but-explained (A7) | > 0, a one-year jump | +6.09 | surprising-but-explained (A7) |
| 2027 labour % | > 0 (more work on the news) | +0.27 | consistent | > 0 (more work on the news) | +0.50 | consistent | > 0 (more work on the news) | +0.49 | consistent |
| 2027 consumption % | < 0 (more saving on the news) | -1.02 | consistent | < 0 (more saving on the news) | -1.53 | consistent | < 0 (more saving on the news) | -1.52 | consistent |
| 2036 GDP % | > 0 | +2.07 | consistent | small, sign open | +0.06 | consistent | near 0, not held after 2030 | +0.123 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | sign open under the G/Y rule | +2.48 | surprising-but-explained (A4) | > 0 | +5.50 | consistent | > 0 | +5.41 | consistent |

**korinek, zk0** (labour share −3.9pp, TFP +3.1%). Runs: automation + productivity: `korinek_share_shift_tfp_ramp`; technology unchanged: `korinek_share_shift_ramp_zfixed`; stress test (2030 GDP held): `korinek_share_shift_ramp_r4_1`

| gap (2030 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2030 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +3.04 | consistent | small, sign open (>= 0 if capital flows in) | -0.05 | surprising-but-explained (A1) | 0 within 0.01pp | +0.001 | consistent |
| GNI % | > 0, below GDP | +2.88 | consistent | below GDP | -0.21 | surprising-but-explained (A1) | <= 0 | -0.16 | consistent |
| NNI % | rises less than GNI in levels | +3.09 | surprising-but-explained (A5) | rises less than GNI in levels | -0.56 | consistent | < 0 | -0.50 | consistent |
| capital % | > 0 | +1.80 | consistent | > 0 | +1.54 | consistent | > 0 | +1.55 | consistent |
| labour % | <= 0 by 2030 (wage falls) | -1.13 | consistent | <= 0 by 2030 (wage falls) | -0.96 | consistent | <= 0 by 2030 (wage falls) | -0.96 | consistent |
| wage % | sign open: share effect against productivity | -2.04 | surprising-but-explained (A2) | < 0 | -5.14 | consistent | < 0 | -5.09 | consistent |
| consumption % | sign open; > 0 expected if income rises | -0.17 | surprising-but-explained (A3) | < 0 | -1.77 | consistent | < 0 | -1.74 | consistent |
| investment % | > 0 | +12.71 | consistent | > 0 | +6.02 | consistent | > 0 | +6.14 | consistent |
| return, bp | > 0 | +141.5 | consistent | > 0 | +106.4 | consistent | > 0 | +107.1 | consistent |
| labour share, pp | = -target | -3.90 | consistent | = -target | -3.90 | consistent | = -target | -3.90 | consistent |
| debt/GDP, pp | sign open under the G/Y rule | -1.56 | surprising-but-explained (A4) | > 0 | +1.85 | consistent | > 0 | +1.79 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | +0.21 | WRONG (A6) | < 0 (OBR sign) | -0.10 | surprising-but-explained (A6) | < 0 (OBR sign) | -0.10 | surprising-but-explained (A6) |
| 2027 investment % | > 0, a one-year jump | +6.79 | surprising-but-explained (A7) | > 0, a one-year jump | +8.19 | surprising-but-explained (A7) | > 0, a one-year jump | +8.17 | surprising-but-explained (A7) |
| 2027 labour % | > 0 (more work on the news) | +0.23 | consistent | > 0 (more work on the news) | +0.67 | consistent | > 0 (more work on the news) | +0.66 | consistent |
| 2027 consumption % | < 0 (more saving on the news) | -1.07 | consistent | < 0 (more saving on the news) | -2.05 | consistent | < 0 (more saving on the news) | -2.03 | consistent |
| 2036 GDP % | > 0 | +4.05 | consistent | small, sign open | +0.11 | consistent | near 0, not held after 2030 | +0.178 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | sign open under the G/Y rule | +1.49 | surprising-but-explained (A4) | > 0 | +7.36 | consistent | > 0 | +7.25 | consistent |

**uk_low, zk0.5** (labour share −0.7pp, TFP +0.2%). Runs: automation + productivity: `uk_low_share_shift_tfp_ramp`; technology unchanged: `uk_low_share_shift_ramp_zfixed`; stress test (2030 GDP held): `uk_low_share_shift_ramp_r4_2`

| gap (2030 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2030 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +1.07 | consistent | small, sign open (>= 0 if capital flows in) | +0.79 | surprising-but-explained (A13) | 0 within 0.01pp | -0.001 | consistent |
| GNI % | > 0, below GDP | +0.76 | consistent | below GDP | +0.51 | consistent | <= 0 | -0.23 | consistent |
| NNI % | rises less than GNI in levels | +0.29 | consistent | rises less than GNI in levels | +0.02 | consistent | < 0 | -0.75 | consistent |
| capital % | > 0 | +2.57 | consistent | > 0 | +2.35 | consistent | > 0 | +1.72 | consistent |
| labour % | <= 0 by 2030 (wage falls) | -0.05 | consistent | <= 0 by 2030 (wage falls) | -0.05 | consistent | <= 0 by 2030 (wage falls) | -0.05 | consistent |
| wage % | sign open: share effect against productivity | +0.03 | consistent | < 0 | -0.25 | consistent | < 0 | -1.03 | consistent |
| consumption % | sign open; > 0 expected if income rises | +0.06 | consistent | < 0 | -0.07 | consistent | < 0 | -0.44 | consistent |
| investment % | > 0 | +2.65 | consistent | > 0 | +2.33 | consistent | > 0 | +1.40 | consistent |
| return, bp | > 0 | +4.8 | consistent | > 0 | +4.2 | consistent | > 0 | +2.5 | consistent |
| labour share, pp | = -target | -0.70 | consistent | = -target | -0.70 | consistent | = -target | -0.70 | consistent |
| debt/GDP, pp | sign open under the G/Y rule | -0.66 | surprising-but-explained (A4) | > 0 | -0.37 | surprising-but-explained (A14) | > 0 | +0.46 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | -0.25 | surprising-but-explained (A16) | < 0 (OBR sign) | -0.25 | surprising-but-explained (A16) | < 0 (OBR sign) | -0.26 | surprising-but-explained (A16) |
| 2027 investment % | > 0, a one-year jump | +9.29 | surprising-but-explained (A7) | > 0, a one-year jump | +8.49 | surprising-but-explained (A7) | > 0, a one-year jump | +6.18 | surprising-but-explained (A7) |
| 2027 labour % | > 0 (more work on the news) | -0.01 | surprising-but-explained (A15) | > 0 (more work on the news) | +0.03 | consistent | > 0 (more work on the news) | +0.14 | consistent |
| 2027 consumption % | < 0 (more saving on the news) | +0.01 | surprising-but-explained (A15) | < 0 (more saving on the news) | -0.08 | consistent | < 0 (more saving on the news) | -0.34 | consistent |
| 2036 GDP % | > 0 | +1.01 | consistent | small, sign open | +0.73 | surprising-but-explained (A13) | near 0, not held after 2030 | -0.065 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | sign open under the G/Y rule | +0.78 | surprising-but-explained (A4) | > 0 | +1.13 | consistent | > 0 | +2.14 | consistent |

**uk_central, zk0.5** (labour share −1.6pp, TFP +0.4%). Runs: automation + productivity: `uk_central_share_shift_tfp_ramp`; technology unchanged: `uk_central_share_shift_ramp_zfixed`; stress test (2030 GDP held): `uk_central_share_shift_ramp_r4_2`

| gap (2030 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2030 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +2.46 | consistent | small, sign open (>= 0 if capital flows in) | +1.89 | surprising-but-explained (A13) | 0 within 0.01pp | -0.008 | consistent |
| GNI % | > 0, below GDP | +1.74 | consistent | below GDP | +1.21 | consistent | <= 0 | -0.53 | consistent |
| NNI % | rises less than GNI in levels | +0.62 | consistent | rises less than GNI in levels | +0.08 | consistent | < 0 | -1.72 | consistent |
| capital % | > 0 | +5.97 | consistent | > 0 | +5.50 | consistent | > 0 | +3.96 | consistent |
| labour % | <= 0 by 2030 (wage falls) | -0.11 | consistent | <= 0 by 2030 (wage falls) | -0.11 | consistent | <= 0 by 2030 (wage falls) | -0.11 | consistent |
| wage % | sign open: share effect against productivity | +0.05 | consistent | < 0 | -0.51 | consistent | < 0 | -2.37 | consistent |
| consumption % | sign open; > 0 expected if income rises | +0.13 | consistent | < 0 | -0.13 | consistent | < 0 | -1.01 | consistent |
| investment % | > 0 | +6.12 | consistent | > 0 | +5.45 | consistent | > 0 | +3.22 | consistent |
| return, bp | > 0 | +10.4 | consistent | > 0 | +9.3 | consistent | > 0 | +5.4 | consistent |
| labour share, pp | = -target | -1.60 | consistent | = -target | -1.60 | consistent | = -target | -1.60 | consistent |
| debt/GDP, pp | sign open under the G/Y rule | -1.48 | surprising-but-explained (A4) | > 0 | -0.90 | surprising-but-explained (A14) | > 0 | +1.07 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | -0.57 | surprising-but-explained (A16) | < 0 (OBR sign) | -0.58 | surprising-but-explained (A16) | < 0 (OBR sign) | -0.60 | surprising-but-explained (A16) |
| 2027 investment % | > 0, a one-year jump | +21.43 | surprising-but-explained (A7) | > 0, a one-year jump | +19.76 | surprising-but-explained (A7) | > 0, a one-year jump | +14.22 | surprising-but-explained (A7) |
| 2027 labour % | > 0 (more work on the news) | -0.02 | surprising-but-explained (A15) | > 0 (more work on the news) | +0.05 | consistent | > 0 (more work on the news) | +0.32 | consistent |
| 2027 consumption % | < 0 (more saving on the news) | +0.02 | surprising-but-explained (A15) | < 0 (more saving on the news) | -0.16 | consistent | < 0 (more saving on the news) | -0.77 | consistent |
| 2036 GDP % | > 0 | +2.32 | consistent | small, sign open | +1.75 | surprising-but-explained (A13) | near 0, not held after 2030 | -0.154 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | sign open under the G/Y rule | +1.83 | surprising-but-explained (A4) | > 0 | +2.53 | consistent | > 0 | +4.91 | consistent |

**uk_high, zk0.5** (labour share −2.9pp, TFP +1.6%). Runs: automation + productivity: `uk_high_share_shift_tfp_ramp`; technology unchanged: `uk_high_share_shift_ramp_zfixed`; stress test (2030 GDP held): `uk_high_share_shift_ramp_r4_1`

| gap (2030 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2030 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +6.02 | consistent | small, sign open (>= 0 if capital flows in) | +3.64 | surprising-but-explained (A13) | 0 within 0.01pp | -0.009 | consistent |
| GNI % | > 0, below GDP | +4.54 | consistent | below GDP | +2.36 | consistent | <= 0 | -0.97 | consistent |
| NNI % | rises less than GNI in levels | +2.47 | consistent | rises less than GNI in levels | +0.26 | consistent | < 0 | -3.13 | consistent |
| capital % | > 0 | +12.38 | consistent | > 0 | +10.35 | consistent | > 0 | +7.25 | consistent |
| labour % | <= 0 by 2030 (wage falls) | -0.19 | consistent | <= 0 by 2030 (wage falls) | -0.19 | consistent | <= 0 by 2030 (wage falls) | -0.20 | consistent |
| wage % | sign open: share effect against productivity | +1.49 | consistent | < 0 | -0.80 | consistent | < 0 | -4.28 | consistent |
| consumption % | sign open; > 0 expected if income rises | +0.90 | consistent | < 0 | -0.17 | consistent | < 0 | -1.83 | consistent |
| investment % | > 0 | +13.08 | consistent | > 0 | +10.25 | consistent | > 0 | +5.91 | consistent |
| return, bp | > 0 | +20.3 | consistent | > 0 | +15.9 | consistent | > 0 | +9.0 | consistent |
| labour share, pp | = -target | -2.90 | consistent | = -target | -2.90 | consistent | = -target | -2.90 | consistent |
| debt/GDP, pp | sign open under the G/Y rule | -4.11 | surprising-but-explained (A4) | > 0 | -1.80 | surprising-but-explained (A14) | > 0 | +1.94 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | -1.04 | surprising-but-explained (A16) | < 0 (OBR sign) | -1.06 | surprising-but-explained (A16) | < 0 (OBR sign) | -1.09 | surprising-but-explained (A16) |
| 2027 investment % | > 0, a one-year jump | +43.77 | surprising-but-explained (A7) | > 0, a one-year jump | +36.81 | surprising-but-explained (A7) | > 0, a one-year jump | +26.10 | surprising-but-explained (A7) |
| 2027 labour % | > 0 (more work on the news) | -0.24 | surprising-but-explained (A15) | > 0 (more work on the news) | +0.07 | consistent | > 0 (more work on the news) | +0.58 | consistent |
| 2027 consumption % | < 0 (more saving on the news) | +0.48 | surprising-but-explained (A15) | < 0 (more saving on the news) | -0.25 | consistent | < 0 (more saving on the news) | -1.38 | consistent |
| 2036 GDP % | > 0 | +5.76 | consistent | small, sign open | +3.38 | surprising-but-explained (A13) | near 0, not held after 2030 | -0.274 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | sign open under the G/Y rule | +1.63 | surprising-but-explained (A4) | > 0 | +4.43 | consistent | > 0 | +8.91 | consistent |

**korinek, zk0.5** (labour share −3.9pp, TFP +3.1%). Runs: automation + productivity: `korinek_share_shift_tfp_ramp`; technology unchanged: `korinek_share_shift_ramp_zfixed`; stress test (2030 GDP held): `korinek_share_shift_ramp_r4_3`

| gap (2030 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2030 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +9.92 | consistent | small, sign open (>= 0 if capital flows in) | +5.12 | surprising-but-explained (A13) | 0 within 0.01pp | +0.001 | consistent |
| GNI % | > 0, below GDP | +7.71 | consistent | below GDP | +3.36 | consistent | <= 0 | -1.29 | consistent |
| NNI % | rises less than GNI in levels | +4.84 | consistent | rises less than GNI in levels | +0.47 | consistent | < 0 | -4.23 | consistent |
| capital % | > 0 | +18.55 | consistent | > 0 | +14.33 | consistent | > 0 | +9.83 | consistent |
| labour % | <= 0 by 2030 (wage falls) | -0.26 | consistent | <= 0 by 2030 (wage falls) | -0.26 | consistent | <= 0 by 2030 (wage falls) | -0.27 | consistent |
| wage % | sign open: share effect against productivity | +3.59 | consistent | < 0 | -0.93 | consistent | < 0 | -5.75 | consistent |
| consumption % | sign open; > 0 expected if income rises | +1.95 | consistent | < 0 | -0.16 | consistent | < 0 | -2.46 | consistent |
| investment % | > 0 | +19.92 | consistent | > 0 | +14.20 | consistent | > 0 | +8.03 | consistent |
| return, bp | > 0 | +28.7 | consistent | > 0 | +20.6 | consistent | > 0 | +11.2 | consistent |
| labour share, pp | = -target | -3.90 | consistent | = -target | -3.90 | consistent | = -target | -3.90 | consistent |
| debt/GDP, pp | sign open under the G/Y rule | -7.01 | surprising-but-explained (A4) | > 0 | -2.59 | surprising-but-explained (A14) | > 0 | +2.60 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | -1.40 | surprising-but-explained (A16) | < 0 (OBR sign) | -1.44 | surprising-but-explained (A16) | < 0 (OBR sign) | -1.47 | surprising-but-explained (A16) |
| 2027 investment % | > 0, a one-year jump | +64.54 | surprising-but-explained (A7) | > 0, a one-year jump | +50.58 | surprising-but-explained (A7) | > 0, a one-year jump | +35.49 | surprising-but-explained (A7) |
| 2027 labour % | > 0 (more work on the news) | -0.55 | surprising-but-explained (A15) | > 0 (more work on the news) | +0.07 | consistent | > 0 (more work on the news) | +0.78 | consistent |
| 2027 consumption % | < 0 (more saving on the news) | +1.15 | surprising-but-explained (A15) | < 0 (more saving on the news) | -0.28 | consistent | < 0 (more saving on the news) | -1.85 | consistent |
| 2036 GDP % | > 0 | +9.55 | consistent | small, sign open | +4.77 | surprising-but-explained (A13) | near 0, not held after 2030 | -0.355 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | sign open under the G/Y rule | +0.42 | surprising-but-explained (A4) | > 0 | +5.79 | consistent | > 0 | +11.98 | consistent |

verdict counts: {'consistent': 466, 'surprising-but-explained': 144, 'WRONG': 2} | cells: 612

### Variant: debt-neutral transfers (`_dn`)

**uk_central, zk0.1, debt-neutral transfers** (labour share −1.6pp, TFP +0.4%). Runs: automation + productivity: `uk_central_share_shift_tfp_ramp_dn`; technology unchanged: `uk_central_share_shift_ramp_zfixed_dn`; stress test (2030 GDP held): `uk_central_share_shift_ramp_dn_r4_2`

| gap (2030 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2030 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +1.03 | consistent | small, sign open (>= 0 if capital flows in) | +0.61 | consistent | 0 within 0.01pp | +0.000 | consistent |
| GNI % | > 0, below GDP | +0.68 | consistent | below GDP | +0.29 | consistent | <= 0 | -0.28 | consistent |
| NNI % | rises less than GNI in levels | +0.38 | consistent | rises less than GNI in levels | -0.07 | surprising-but-explained (A5) | < 0 | -0.72 | consistent |
| capital % | > 0 | +2.15 | consistent | > 0 | +2.01 | consistent | > 0 | +1.81 | consistent |
| labour % | <= 0 by 2030 (wage falls) | -0.20 | consistent | <= 0 by 2030 (wage falls) | -0.15 | consistent | <= 0 by 2030 (wage falls) | -0.09 | consistent |
| wage % | sign open: share effect against productivity | -1.26 | surprising-but-explained (A2) | < 0 | -1.72 | consistent | < 0 | -2.38 | consistent |
| consumption % | sign open; > 0 expected if income rises | -0.58 | surprising-but-explained (A3) | < 0 | -0.86 | consistent | < 0 | -1.27 | consistent |
| investment % | > 0 | +3.63 | consistent | > 0 | +3.02 | consistent | > 0 | +2.14 | consistent |
| return, bp | > 0 | +37.5 | consistent | > 0 | +34.3 | consistent | > 0 | +29.7 | consistent |
| labour share, pp | = -target | -1.60 | consistent | = -target | -1.60 | consistent | = -target | -1.60 | consistent |
| debt/GDP, pp | 0 (held on the reference path) | +0.000 | consistent | 0 (held on the reference path) | +0.000 | consistent | 0 (held on the reference path) | +0.000 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | -0.21 | consistent | < 0 (OBR sign) | -0.25 | consistent | < 0 (OBR sign) | -0.31 | consistent |
| 2027 investment % | > 0, a one-year jump | +9.06 | surprising-but-explained (A7) | > 0, a one-year jump | +8.74 | surprising-but-explained (A7) | > 0, a one-year jump | +8.27 | surprising-but-explained (A7) |
| 2027 labour % | > 0 (more work on the news) | +0.22 | consistent | > 0 (more work on the news) | +0.32 | consistent | > 0 (more work on the news) | +0.46 | consistent |
| 2027 consumption % | < 0 (more saving on the news) | -0.63 | consistent | < 0 (more saving on the news) | -0.85 | consistent | < 0 (more saving on the news) | -1.16 | consistent |
| 2036 GDP % | > 0 | +1.03 | consistent | small, sign open | +0.55 | consistent | near 0, not held after 2030 | -0.129 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | 0 (held on the reference path) | +0.000 | consistent | 0 (held on the reference path) | +0.001 | consistent | 0 (held on the reference path) | +0.002 | consistent |

**korinek, zk0.1, debt-neutral transfers** (labour share −3.9pp, TFP +3.1%). Runs: automation + productivity: `korinek_share_shift_tfp_ramp_dn`; technology unchanged: `korinek_share_shift_ramp_zfixed_dn`; stress test (2030 GDP held): `korinek_share_shift_ramp_dn_r4_2`

| gap (2030 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2030 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +5.07 | consistent | small, sign open (>= 0 if capital flows in) | +1.67 | consistent | 0 within 0.01pp | +0.000 | consistent |
| GNI % | > 0, below GDP | +3.92 | consistent | below GDP | +0.81 | consistent | <= 0 | -0.72 | consistent |
| NNI % | rises less than GNI in levels | +3.40 | consistent | rises less than GNI in levels | -0.10 | surprising-but-explained (A5) | < 0 | -1.83 | consistent |
| capital % | > 0 | +6.39 | consistent | > 0 | +5.16 | consistent | > 0 | +4.56 | consistent |
| labour % | <= 0 by 2030 (wage falls) | -0.74 | consistent | <= 0 by 2030 (wage falls) | -0.39 | consistent | <= 0 by 2030 (wage falls) | -0.21 | consistent |
| wage % | sign open: share effect against productivity | -0.50 | surprising-but-explained (A2) | < 0 | -4.06 | consistent | < 0 | -5.80 | consistent |
| consumption % | sign open; > 0 expected if income rises | +0.18 | consistent | < 0 | -2.01 | consistent | < 0 | -3.09 | consistent |
| investment % | > 0 | +12.30 | consistent | > 0 | +7.45 | consistent | > 0 | +5.05 | consistent |
| return, bp | > 0 | +106.9 | consistent | > 0 | +81.6 | consistent | > 0 | +69.0 | consistent |
| labour share, pp | = -target | -3.90 | consistent | = -target | -3.90 | consistent | = -target | -3.90 | consistent |
| debt/GDP, pp | 0 (held on the reference path) | +0.000 | consistent | 0 (held on the reference path) | +0.000 | consistent | 0 (held on the reference path) | -0.000 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | -0.34 | surprising-but-explained (A6) | < 0 (OBR sign) | -0.63 | consistent | < 0 (OBR sign) | -0.78 | consistent |
| 2027 investment % | > 0, a one-year jump | +24.68 | surprising-but-explained (A7) | > 0, a one-year jump | +21.97 | surprising-but-explained (A7) | > 0, a one-year jump | +20.64 | surprising-but-explained (A7) |
| 2027 labour % | > 0 (more work on the news) | -0.03 | surprising-but-explained (A17) | > 0 (more work on the news) | +0.75 | consistent | > 0 (more work on the news) | +1.14 | consistent |
| 2027 consumption % | < 0 (more saving on the news) | -0.32 | consistent | < 0 (more saving on the news) | -1.99 | consistent | < 0 (more saving on the news) | -2.82 | consistent |
| 2036 GDP % | > 0 | +5.35 | consistent | small, sign open | +1.52 | consistent | near 0, not held after 2030 | -0.349 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | 0 (held on the reference path) | +0.001 | consistent | 0 (held on the reference path) | +0.001 | consistent | 0 (held on the reference path) | -0.000 | consistent |

**uk_central, zk0, debt-neutral transfers** (labour share −1.6pp, TFP +0.4%). Runs: automation + productivity: `uk_central_share_shift_tfp_ramp_dn`; technology unchanged: `uk_central_share_shift_ramp_zfixed_dn`; stress test (2030 GDP held): `uk_central_share_shift_ramp_dn_r4_1`

| gap (2030 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2030 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +0.46 | consistent | small, sign open (>= 0 if capital flows in) | +0.08 | consistent | 0 within 0.01pp | +0.003 | consistent |
| GNI % | > 0, below GDP | +0.40 | consistent | below GDP | +0.03 | consistent | <= 0 | -0.04 | consistent |
| NNI % | rises less than GNI in levels | +0.33 | consistent | rises less than GNI in levels | -0.11 | surprising-but-explained (A5) | < 0 | -0.19 | consistent |
| capital % | > 0 | +0.76 | consistent | > 0 | +0.72 | consistent | > 0 | +0.71 | consistent |
| labour % | <= 0 by 2030 (wage falls) | -0.30 | consistent | <= 0 by 2030 (wage falls) | -0.25 | consistent | <= 0 by 2030 (wage falls) | -0.24 | consistent |
| wage % | sign open: share effect against productivity | -1.72 | surprising-but-explained (A2) | < 0 | -2.14 | consistent | < 0 | -2.22 | consistent |
| consumption % | sign open; > 0 expected if income rises | -0.71 | surprising-but-explained (A3) | < 0 | -0.98 | consistent | < 0 | -1.03 | consistent |
| investment % | > 0 | +3.47 | consistent | > 0 | +2.81 | consistent | > 0 | +2.69 | consistent |
| return, bp | > 0 | +48.3 | consistent | > 0 | +44.3 | consistent | > 0 | +43.5 | consistent |
| labour share, pp | = -target | -1.60 | consistent | = -target | -1.60 | consistent | = -target | -1.60 | consistent |
| debt/GDP, pp | 0 (held on the reference path) | -0.000 | consistent | 0 (held on the reference path) | -0.000 | consistent | 0 (held on the reference path) | -0.000 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | -0.03 | surprising-but-explained (A6) | < 0 (OBR sign) | -0.08 | surprising-but-explained (A6) | < 0 (OBR sign) | -0.09 | surprising-but-explained (A6) |
| 2027 investment % | > 0, a one-year jump | +4.13 | surprising-but-explained (A7) | > 0, a one-year jump | +4.24 | surprising-but-explained (A7) | > 0, a one-year jump | +4.26 | surprising-but-explained (A7) |
| 2027 labour % | > 0 (more work on the news) | +0.28 | consistent | > 0 (more work on the news) | +0.37 | consistent | > 0 (more work on the news) | +0.39 | consistent |
| 2027 consumption % | < 0 (more saving on the news) | -0.84 | consistent | < 0 (more saving on the news) | -1.04 | consistent | < 0 (more saving on the news) | -1.08 | consistent |
| 2036 GDP % | > 0 | +0.63 | consistent | small, sign open | +0.17 | consistent | near 0, not held after 2030 | +0.088 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | 0 (held on the reference path) | +0.001 | consistent | 0 (held on the reference path) | +0.001 | consistent | 0 (held on the reference path) | +0.001 | consistent |

**korinek, zk0, debt-neutral transfers** (labour share −3.9pp, TFP +3.1%). Runs: automation + productivity: `korinek_share_shift_tfp_ramp_dn`; technology unchanged: `korinek_share_shift_ramp_zfixed_dn`; stress test (2030 GDP held): `korinek_share_shift_ramp_dn_r4_1`

| gap (2030 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2030 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +3.18 | consistent | small, sign open (>= 0 if capital flows in) | +0.20 | consistent | 0 within 0.01pp | +0.008 | consistent |
| GNI % | > 0, below GDP | +2.97 | consistent | below GDP | +0.09 | consistent | <= 0 | -0.10 | consistent |
| NNI % | rises less than GNI in levels | +3.15 | surprising-but-explained (A5) | rises less than GNI in levels | -0.24 | surprising-but-explained (A5) | < 0 | -0.46 | consistent |
| capital % | > 0 | +2.04 | consistent | > 0 | +1.73 | consistent | > 0 | +1.71 | consistent |
| labour % | <= 0 by 2030 (wage falls) | -1.06 | consistent | <= 0 by 2030 (wage falls) | -0.65 | consistent | <= 0 by 2030 (wage falls) | -0.63 | consistent |
| wage % | sign open: share effect against productivity | -1.97 | surprising-but-explained (A2) | < 0 | -5.19 | consistent | < 0 | -5.40 | consistent |
| consumption % | sign open; > 0 expected if income rises | -0.26 | surprising-but-explained (A3) | < 0 | -2.33 | consistent | < 0 | -2.47 | consistent |
| investment % | > 0 | +12.00 | consistent | > 0 | +6.79 | consistent | > 0 | +6.45 | consistent |
| return, bp | > 0 | +140.2 | consistent | > 0 | +107.4 | consistent | > 0 | +105.2 | consistent |
| labour share, pp | = -target | -3.90 | consistent | = -target | -3.90 | consistent | = -target | -3.90 | consistent |
| debt/GDP, pp | 0 (held on the reference path) | +0.000 | consistent | 0 (held on the reference path) | +0.000 | consistent | 0 (held on the reference path) | +0.000 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | +0.20 | WRONG (A6) | < 0 (OBR sign) | -0.19 | surprising-but-explained (A6) | < 0 (OBR sign) | -0.22 | surprising-but-explained (A6) |
| 2027 investment % | > 0, a one-year jump | +9.36 | surprising-but-explained (A7) | > 0, a one-year jump | +10.26 | surprising-but-explained (A7) | > 0, a one-year jump | +10.32 | surprising-but-explained (A7) |
| 2027 labour % | > 0 (more work on the news) | +0.19 | consistent | > 0 (more work on the news) | +0.90 | consistent | > 0 (more work on the news) | +0.95 | consistent |
| 2027 consumption % | < 0 (more saving on the news) | -0.97 | consistent | < 0 (more saving on the news) | -2.49 | consistent | < 0 (more saving on the news) | -2.59 | consistent |
| 2036 GDP % | > 0 | +4.10 | consistent | small, sign open | +0.49 | consistent | near 0, not held after 2030 | +0.248 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | 0 (held on the reference path) | +0.001 | consistent | 0 (held on the reference path) | +0.002 | consistent | 0 (held on the reference path) | +0.002 | consistent |

verdict counts, debt-neutral transfers: {'not solved': 408, 'consistent': 168, 'surprising-but-explained': 35, 'WRONG': 1} | cells: 612

### Variant: fixed spending (`_fs`)

**uk_central, zk0.1, fixed spending** (labour share −1.6pp, TFP +0.4%). Runs: automation + productivity: `uk_central_share_shift_tfp_ramp_fs`; technology unchanged: `uk_central_share_shift_ramp_zfixed_fs`; stress test (2030 GDP held): `uk_central_share_shift_ramp_fs_r4_2`

| gap (2030 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2030 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +0.97 | consistent | small, sign open (>= 0 if capital flows in) | +0.51 | consistent | 0 within 0.01pp | -0.000 | consistent |
| GNI % | > 0, below GDP | +0.65 | consistent | below GDP | +0.20 | consistent | <= 0 | -0.29 | consistent |
| NNI % | rises less than GNI in levels | +0.33 | consistent | rises less than GNI in levels | -0.17 | surprising-but-explained (A5) | < 0 | -0.73 | consistent |
| capital % | > 0 | +2.13 | consistent | > 0 | +1.95 | consistent | > 0 | +1.76 | consistent |
| labour % | <= 0 by 2030 (wage falls) | -0.28 | consistent | <= 0 by 2030 (wage falls) | -0.27 | consistent | <= 0 by 2030 (wage falls) | -0.27 | consistent |
| wage % | sign open: share effect against productivity | -1.24 | surprising-but-explained (A2) | < 0 | -1.70 | consistent | < 0 | -2.20 | consistent |
| consumption % | sign open; > 0 expected if income rises | -0.42 | surprising-but-explained (A3) | < 0 | -0.63 | consistent | < 0 | -0.86 | consistent |
| investment % | > 0 | +4.63 | consistent | > 0 | +3.38 | consistent | > 0 | +2.00 | consistent |
| return, bp | > 0 | +37.1 | consistent | > 0 | +33.9 | consistent | > 0 | +30.3 | consistent |
| labour share, pp | = -target | -1.60 | consistent | = -target | -1.60 | consistent | = -target | -1.60 | consistent |
| debt/GDP, pp | < 0 (spending fixed, GDP higher) | -0.77 | consistent | > 0 | -0.08 | surprising-but-explained (A14) | > 0 | +0.69 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | -0.20 | consistent | < 0 (OBR sign) | -0.22 | consistent | < 0 (OBR sign) | -0.25 | consistent |
| 2027 investment % | > 0, a one-year jump | +8.23 | surprising-but-explained (A7) | > 0, a one-year jump | +7.88 | surprising-but-explained (A7) | > 0, a one-year jump | +7.50 | surprising-but-explained (A7) |
| 2027 labour % | > 0 (more work on the news) | +0.19 | consistent | > 0 (more work on the news) | +0.24 | consistent | > 0 (more work on the news) | +0.31 | consistent |
| 2027 consumption % | < 0 (more saving on the news) | -0.57 | consistent | < 0 (more saving on the news) | -0.70 | consistent | < 0 (more saving on the news) | -0.85 | consistent |
| 2036 GDP % | > 0 | +1.19 | consistent | small, sign open | +0.55 | consistent | near 0, not held after 2030 | -0.151 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | < 0 (spending fixed, GDP higher) | -0.82 | consistent | > 0 | +1.38 | consistent | > 0 | +3.84 | consistent |

**korinek, zk0.1, fixed spending** (labour share −3.9pp, TFP +3.1%). Runs: automation + productivity: `korinek_share_shift_tfp_ramp_fs`; technology unchanged: `korinek_share_shift_ramp_zfixed_fs`; stress test (2030 GDP held): `korinek_share_shift_ramp_fs_r4_2`

| gap (2030 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2030 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +5.15 | consistent | small, sign open (>= 0 if capital flows in) | +1.44 | consistent | 0 within 0.01pp | -0.001 | consistent |
| GNI % | > 0, below GDP | +4.15 | consistent | below GDP | +0.60 | consistent | <= 0 | -0.77 | consistent |
| NNI % | rises less than GNI in levels | +3.64 | consistent | rises less than GNI in levels | -0.32 | surprising-but-explained (A5) | < 0 | -1.86 | consistent |
| capital % | > 0 | +6.54 | consistent | > 0 | +5.01 | consistent | > 0 | +4.43 | consistent |
| labour % | <= 0 by 2030 (wage falls) | -0.69 | consistent | <= 0 by 2030 (wage falls) | -0.67 | consistent | <= 0 by 2030 (wage falls) | -0.66 | consistent |
| wage % | sign open: share effect against productivity | -0.47 | surprising-but-explained (A2) | < 0 | -4.01 | consistent | < 0 | -5.38 | consistent |
| consumption % | sign open; > 0 expected if income rises | +0.14 | consistent | < 0 | -1.47 | consistent | < 0 | -2.10 | consistent |
| investment % | > 0 | +18.59 | consistent | > 0 | +8.59 | consistent | > 0 | +4.71 | consistent |
| return, bp | > 0 | +106.3 | consistent | > 0 | +80.6 | consistent | > 0 | +70.5 | consistent |
| labour share, pp | = -target | -3.90 | consistent | = -target | -3.90 | consistent | = -target | -3.90 | consistent |
| debt/GDP, pp | < 0 (spending fixed, GDP higher) | -5.70 | consistent | > 0 | -0.44 | surprising-but-explained (A14) | > 0 | +1.70 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | -0.41 | consistent | < 0 (OBR sign) | -0.57 | consistent | < 0 (OBR sign) | -0.64 | consistent |
| 2027 investment % | > 0, a one-year jump | +22.78 | surprising-but-explained (A7) | > 0, a one-year jump | +19.82 | surprising-but-explained (A7) | > 0, a one-year jump | +18.69 | surprising-but-explained (A7) |
| 2027 labour % | > 0 (more work on the news) | +0.12 | consistent | > 0 (more work on the news) | +0.57 | consistent | > 0 (more work on the news) | +0.75 | consistent |
| 2027 consumption % | < 0 (more saving on the news) | -0.64 | consistent | < 0 (more saving on the news) | -1.66 | consistent | < 0 (more saving on the news) | -2.06 | consistent |
| 2036 GDP % | > 0 | +6.81 | consistent | small, sign open | +1.59 | consistent | near 0, not held after 2030 | -0.413 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | < 0 (spending fixed, GDP higher) | -14.29 | consistent | > 0 | +2.63 | consistent | > 0 | +9.58 | consistent |

**uk_central, zk0, fixed spending** (labour share −1.6pp, TFP +0.4%). Runs: automation + productivity: `uk_central_share_shift_tfp_ramp_fs`; technology unchanged: `uk_central_share_shift_ramp_zfixed_fs`; stress test (2030 GDP held): `uk_central_share_shift_ramp_fs_r4_1`

| gap (2030 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2030 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +0.40 | consistent | small, sign open (>= 0 if capital flows in) | -0.02 | surprising-but-explained (A1) | 0 within 0.01pp | +0.001 | consistent |
| GNI % | > 0, below GDP | +0.34 | consistent | below GDP | -0.08 | surprising-but-explained (A1) | <= 0 | -0.06 | consistent |
| NNI % | rises less than GNI in levels | +0.27 | consistent | rises less than GNI in levels | -0.23 | consistent | < 0 | -0.20 | consistent |
| capital % | > 0 | +0.74 | consistent | > 0 | +0.67 | consistent | > 0 | +0.67 | consistent |
| labour % | <= 0 by 2030 (wage falls) | -0.39 | consistent | <= 0 by 2030 (wage falls) | -0.37 | consistent | <= 0 by 2030 (wage falls) | -0.37 | consistent |
| wage % | sign open: share effect against productivity | -1.69 | surprising-but-explained (A2) | < 0 | -2.11 | consistent | < 0 | -2.09 | consistent |
| consumption % | sign open; > 0 expected if income rises | -0.54 | surprising-but-explained (A3) | < 0 | -0.74 | consistent | < 0 | -0.73 | consistent |
| investment % | > 0 | +3.86 | consistent | > 0 | +2.54 | consistent | > 0 | +2.60 | consistent |
| return, bp | > 0 | +47.8 | consistent | > 0 | +43.7 | consistent | > 0 | +43.9 | consistent |
| labour share, pp | = -target | -1.60 | consistent | = -target | -1.60 | consistent | = -target | -1.60 | consistent |
| debt/GDP, pp | < 0 (spending fixed, GDP higher) | -0.02 | consistent | > 0 | +0.62 | consistent | > 0 | +0.59 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | -0.02 | surprising-but-explained (A6) | < 0 (OBR sign) | -0.05 | surprising-but-explained (A6) | < 0 (OBR sign) | -0.05 | surprising-but-explained (A6) |
| 2027 investment % | > 0, a one-year jump | +3.47 | surprising-but-explained (A7) | > 0, a one-year jump | +3.56 | surprising-but-explained (A7) | > 0, a one-year jump | +3.56 | surprising-but-explained (A7) |
| 2027 labour % | > 0 (more work on the news) | +0.23 | consistent | > 0 (more work on the news) | +0.28 | consistent | > 0 (more work on the news) | +0.28 | consistent |
| 2027 consumption % | < 0 (more saving on the news) | -0.73 | consistent | < 0 (more saving on the news) | -0.86 | consistent | < 0 (more saving on the news) | -0.85 | consistent |
| 2036 GDP % | > 0 | +0.68 | consistent | small, sign open | +0.05 | consistent | near 0, not held after 2030 | +0.081 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | < 0 (spending fixed, GDP higher) | +0.62 | surprising-but-explained (A4) | > 0 | +2.81 | consistent | > 0 | +2.70 | consistent |

**korinek, zk0, fixed spending** (labour share −3.9pp, TFP +3.1%). Runs: automation + productivity: `korinek_share_shift_tfp_ramp_fs`; technology unchanged: `korinek_share_shift_ramp_zfixed_fs`; stress test (2030 GDP held): `korinek_share_shift_ramp_fs_r4_1`

| gap (2030 unless stated) | automation + productivity: expected | model | verdict | technology unchanged: expected | model | verdict | stress test (2030 GDP held): expected | model | verdict |
|---|---|---|---|---|---|---|---|---|---|
| GDP % | > 0 | +3.25 | consistent | small, sign open (>= 0 if capital flows in) | -0.01 | surprising-but-explained (A1) | 0 within 0.01pp | +0.001 | consistent |
| GNI % | > 0, below GDP | +3.13 | consistent | below GDP | -0.16 | surprising-but-explained (A1) | <= 0 | -0.15 | consistent |
| NNI % | rises less than GNI in levels | +3.32 | surprising-but-explained (A5) | rises less than GNI in levels | -0.52 | consistent | < 0 | -0.50 | consistent |
| capital % | > 0 | +2.19 | consistent | > 0 | +1.62 | consistent | > 0 | +1.62 | consistent |
| labour % | <= 0 by 2030 (wage falls) | -1.04 | consistent | <= 0 by 2030 (wage falls) | -0.94 | consistent | <= 0 by 2030 (wage falls) | -0.94 | consistent |
| wage % | sign open: share effect against productivity | -1.93 | surprising-but-explained (A2) | < 0 | -5.12 | consistent | < 0 | -5.11 | consistent |
| consumption % | sign open; > 0 expected if income rises | -0.25 | surprising-but-explained (A3) | < 0 | -1.77 | consistent | < 0 | -1.77 | consistent |
| investment % | > 0 | +16.59 | consistent | > 0 | +6.20 | consistent | > 0 | +6.25 | consistent |
| return, bp | > 0 | +139.3 | consistent | > 0 | +106.0 | consistent | > 0 | +106.1 | consistent |
| labour share, pp | = -target | -3.90 | consistent | = -target | -3.90 | consistent | = -target | -3.90 | consistent |
| debt/GDP, pp | < 0 (spending fixed, GDP higher) | -3.45 | consistent | > 0 | +1.45 | consistent | > 0 | +1.43 | consistent |
| tax/GDP, pp | < 0 (OBR sign) | +0.16 | WRONG (A6) | < 0 (OBR sign) | -0.11 | surprising-but-explained (A6) | < 0 (OBR sign) | -0.11 | surprising-but-explained (A6) |
| 2027 investment % | > 0, a one-year jump | +7.88 | surprising-but-explained (A7) | > 0, a one-year jump | +8.62 | surprising-but-explained (A7) | > 0, a one-year jump | +8.62 | surprising-but-explained (A7) |
| 2027 labour % | > 0 (more work on the news) | +0.26 | consistent | > 0 (more work on the news) | +0.68 | consistent | > 0 (more work on the news) | +0.67 | consistent |
| 2027 consumption % | < 0 (more saving on the news) | -1.13 | consistent | < 0 (more saving on the news) | -2.05 | consistent | < 0 (more saving on the news) | -2.05 | consistent |
| 2036 GDP % | > 0 | +5.27 | consistent | small, sign open | +0.21 | consistent | near 0, not held after 2030 | +0.229 | surprising-but-explained (A8) |
| 2036 debt/GDP, pp | < 0 (spending fixed, GDP higher) | -10.33 | consistent | > 0 | +6.59 | consistent | > 0 | +6.51 | consistent |

verdict counts, fixed spending: {'not solved': 408, 'consistent': 165, 'surprising-but-explained': 38, 'WRONG': 1} | cells: 612
