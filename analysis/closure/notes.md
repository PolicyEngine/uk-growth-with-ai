## Findings

**1. The headline mostly measures the capital closure, not AI.** The arms are the same at every `zeta_K` (same γ path, same fixed-input technology target). Only the share of excess capital demand that foreigners supply changes. The 2030 GDP gap moves from +3.14% to +9.93% (`share_shift_tfp`) and from +0.09% to +5.12% (`share_shift`) between `zeta_K = 0` and `0.5`. At OG-UK's default of 0.1 the committed run reproduces bit for bit (table below), so the published +4.92% / +1.42% sit at one point on this range. Nothing in the repository chose that point: `zeta_K` is never set.

The gaps are each measured against **that closure's own no-AI baseline**, and the baselines differ:
- **GDP (detrended, 2030):** 0.699 / 0.714 / 0.786
- **r:** 5.6% / 5.3% / 3.7%
- **Foreign share of capital (K_f / K):** 0% / 8% / 37%

So the three columns describe three different stylised UKs, not one UK under three assumptions.

**2. GDP overstates what residents gain whenever foreign capital comes in.** At the default closure, foreigners own 78.5% (`share_shift_tfp`) and 73.5% (`share_shift`) of the extra 2030 capital. GNI rises +3.87% against GDP +4.92%, and +0.59% against +1.42%. These figures confirm #16's inference from the exported paths. For `share_shift`, extra payments abroad are 0.83% of baseline GDP in 2030, inside #16's back-of-envelope range of 0.7–0.9%. The gap between GDP and GNI widens with openness: −0.14pp / −1.05pp / −2.23pp (`share_shift_tfp`) at `zeta_K` = 0 / 0.1 / 0.5. Using the firm rate `r` instead of `r_p` on K_f lowers the 2030 GNI gaps by 0.06pp / 0.05pp at the default closure and by 0.14pp / 0.13pp at `zeta_K = 0.5` (`gni_gap_r_variant`).

**3. `share_shift` stays close to GDP-neutral only when the economy is closed.** The scenario is built so that output at fixed inputs is unchanged.
- **At `zeta_K = 0`:** the GDP gap is +0.65% in 2026 and falls to +0.09% in 2030 (GNI −0.04%). It then drifts back up to +0.30% by 2035.
- **At 0.1:** it is +1.42% in 2030 and +1.33% in 2035.
- **At 0.5:** it is +5.12% in 2030 and +4.83% in 2035.

So the +1.42% headline is mostly capital inflow drawn in by the higher capital share.

**4. Every result passes the sign-and-size checks.**
- **Capital and the interest rate.** A more closed economy shows a smaller K response and a larger r rise in both arms. For `share_shift_tfp`, K is +1.99% / +6.06% / +18.43% and Δr is +139 / +108 / +30bp. For `share_shift`, K is +1.90% / +5.02% / +14.28% and Δr is +103 / +80 / +21bp.
- **2026.** At `zeta_K = 0` the 2026 capital gap is exactly 0.00%, because assets are inherited and there is no inflow. The 2026 K-gap / L-gap ratio is 0 / 0.171 / 0.678. It is identical across the two arms at each closure, so it is the pricing rule `K_f = zeta_K·(K_open − K_d)` at work and not saving (#16).
- **GNI below GDP.** GNI sits below GDP in every baseline: 99.56% / 98.57% / 95.99% of GDP. That includes `zeta_K = 0`, where K_f = 0 but foreigners still hold 9.5% of government debt (`zeta_D = 0.4`).
- **Accounting identities.** K = K_d + K_f, K_d = B − D_d and D = D_d + D_f hold to 1e-16 in every run.
- **Results that looked odd and were checked.**
  - At `zeta_K = 0.5`, `share_shift_tfp`'s 2026 GDP gap is negative (−0.50%) and foreigners fund more than 100% of the extra capital.
  - **The 2026 GDP gap is a labour response.** With a large inflow, r barely rises and wages rise (+3.56% by 2030, against −1.92% at `zeta_K = 0`). Households expect higher lifetime labour income, so consumption rises at once (+0.84% in 2026) and labour falls (−0.56%). Domestically owned capital is inherited in 2026 (gap exactly 0). The −0.38% capital gap is foreign capital following labour down through the rule: 0.5 × K_open/K (1.37) = 0.68 of the labour gap.
  - **The same reading holds in all six cells.** The 2026 labour gap has the opposite sign to the 2030 wage gap in every arm and closure (wage −4.95% to +3.56%, labour +1.00% to −0.56%).
  - **The foreign share above 100% has two causes.** K_d = B − D_d. In 2027–28 household wealth falls (B −0.28% in 2027, K_d −0.35%): that is the wealth effect. By 2030 household wealth is back at baseline (B +0.01%) and K_d is still −0.45%, because domestically held government debt is up (D_d +1.1%). The 100.1% in `share_shift` is also debt: B is +0.43% and D_d +1.5%.
  - At `zeta_K = 0` the sign flips: r rises 139bp, households work and save more early (C −0.96%, L +0.52% in 2026), and domestic capital carries all of the increase.
  - So **the sign of the wage response also depends on the closure**.

**5. The 2030 investment drop is the inflow stopping.** At `zeta_K = 0`, `share_shift_tfp`'s investment gap keeps rising through 2030 (+10.7% → +12.4%). At 0.1 and 0.5 it collapses when γ stops rising (+28.9% → +13.1% and +84.8% → +19.8%). "Investment is a residual" is wrong (#16).

**6. Convergence.**
- Every one of the 10 transition paths reached OG-Core's `mindist_TPI = 1e-4`, in 8–10 outer iterations with final distances of 3.4e-5 to 7.2e-5 in the nine closure runs and 9.85e-5 in the pre-TP run. Euler errors are ≤ 6.3e-12.
- **2026 residual.** The signed 2026 resource-constraint residual is negative in all nine closure runs (the pre-TP run is point 8) and is shared by the arms of a closure to within 0.006% of GDP. Its size depends on the closure: −0.99% (0), −0.95% (0.1), −0.81% (0.5) of GDP.
- **Interior residuals.** The largest interior residual (2027…T−2) is in 2028 in every run: −0.07% to −0.09% of GDP. Every other interior period is below 0.0006% of GDP in the closure runs and below 0.0008% in the pre-TP run.
- **Final period.** The last period carries OG-UK's known boundary error of −21% to −27% of GDP, which OG-UK's own `RC_TPI = 0.2` override waives (`api.py`).

**7. The period-0 demographics are inconsistent, and the 2028 residual has a candidate cause.** See the section below. OG-Core's shipped pre-period mortality and immigration rates break the pre-period → 2026 population law of motion by up to 5.9% at some ages. The UK-consistent values from the same fetch satisfy it to 2.5e-16. Separately, the 2027 → 2028 transition breaks it by 0.25% under either set of pre-TP inputs. That is where OG-UK's demographic data window ends (`final_data_year = 2028`) and the projection begins, and it lines up with the 2028 resource-constraint residual. The splice is not fixed by the pre-TP patch.

**8. Passing UK-consistent pre-TP demographics removes the 2026 residual (#15).**
- **The test.** A baseline at `zeta_K = 0.1` with `g_n_preTP`, `rho_preTP` and `imm_rates_preTP` taken from the same UK fetch, with everything else identical (the demographic hashes match).
- **The 2026 residual.** It goes from −0.9495% to +0.0001% of GDP. The 2028 residual is unchanged (−0.089%), which is consistent with point 7: it has a separate cause.
- **Levels.** From 2027 on the levels move by less than 0.3% (Y −0.07% to −0.08%, K −0.23% to −0.29%, r about +2bp). The 2026 investment level moves −3.8%. That follows from the capital law of motion, because K in 2027 is −0.29% with K in 2026 unchanged, and baseline I/K ≈ 0.076. The pre-TP inputs enter only through `get_B`, `get_BQ` and `fiscal.py`, not `get_I` directly.
- **Not tested here: whether the published gaps survive.** The ramp arms were not re-solved under this baseline. That rerun is R2 on #27. The 2026 investment gap is the number most likely to move.
- **Convergence.** This path converged with a final distance of 9.85e-5, just inside the 1e-4 tolerance.

**9. Exports the results-sanity audit requested on #27.** These are in `output/extra_exports.json` and needed no extra solve.
- **Population law of motion.** The per-period residual is in `law_of_motion`. It is ~1e-16 in every transition except pre → 2026 (stock pre-TP inputs only) and 2027 → 2028 (0.25%).
- **Fiscal aggregates.** Steady-state G, TR, tax revenue, outlays and primary balance for each baseline are in `fiscal_baselines`, along with `g_n_ss = 0.000511`. The steady-state primary surplus is 1.31% of GDP at `zeta_K = 0.1`. The pre-TP patch leaves it unchanged. It is 1.55% at `zeta_K = 0` and 0.27% at 0.5, so the closure also moves the fiscal steady state.

### What this means for the corrective rerun (R3 on #27)

- Report results at more than one closure, or at least state `zeta_K`, `zeta_D` and the world rate next to every headline.
- Report GNI alongside GDP.
- **What `zeta_K` controls.** K_open is the capital demanded at the 2% world rate, backed out as K_d + K_f / zeta_K. Its 2030 gap is nearly the same at 0.1 and 0.5: +28.3% vs +27.1% (`share_shift_tfp`) and +22.1% vs +20.9% (`share_shift`). The AI shock raises capital demand at the world rate by about the same amount in both, and `zeta_K` sets how much of the excess (K_open − K_d) actually arrives. With r ≈ 5.2% against a 2% world rate, that excess is large in the baseline (1.5–1.8 in model units, about K_d's size).
- **Not tested here.** No run varied `world_int_rate_annual` or `zeta_D`, so their effect is unknown.
- **R3, revised in review and adopted by Vahid on 12 November 2026 (#16): keep `zeta_K = 0.1` as the central closure, publish `zeta_K = 0` beside it as the closed-capital bound, and lead with GNI.** The first draft of this note proposed `zeta_K = 0` as central because it is the only setting that does not depend on the uncalibrated 2% world rate. Against UK data it misses the two things that drive the headline: its baseline pays 0.44% of GDP abroad against the UK's 1.2–1.6% (1.43% at 0.1), and extra national saving covers 86–92% of its extra investment (25–28% at 0.1; published estimates for open European economies are 0.14–0.36). The evidence and the weaknesses of 0.1 are in `docs/closure_choice.md`.
- **Sequencing for the combined rerun.** Choose the closure before R1, because the steady-state primary balance moves with it (1.55% / 1.31% / 0.27% of GDP). Re-solve Z against each closure's own baseline. Apply the pre-TP fix to the baseline and to the arms. Decide R4 (a GDP-neutral Z for `share_shift`) at the chosen closure: at `zeta_K = 0` the arm is already +0.09% in 2030, but +0.65% in 2026 and +0.30% by 2035.
