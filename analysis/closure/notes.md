## Findings

**1. The headline mostly measures the capital closure, not AI.** The arms are the same at every `zeta_K` (same γ path, same fixed-input technology target). Only the share of excess capital demand that foreigners supply changes. The 2030 GDP gap moves from +3.14% to +9.93% (`share_shift_tfp`) and from +0.09% to +5.12% (`share_shift`) between `zeta_K = 0` and `0.5`. At OG-UK's default of 0.1 the committed run reproduces bit for bit (table below), so the published +4.92% / +1.42% sit at one point on this range. Nothing in the repository chose that point: `zeta_K` is never set.

**2. GDP overstates what residents gain whenever foreign capital comes in.** At the default closure, foreigners own 78.5% (`share_shift_tfp`) and 73.5% (`share_shift`) of the extra 2030 capital. GNI rises +3.87% against GDP +4.92%, and +0.59% against +1.42%. These figures confirm #16's inference from the exported paths. For `share_shift`, extra payments abroad are 0.82pp of GDP in 2030, inside #16's back-of-envelope range of 0.7–0.9%. The gap between GDP and GNI widens with openness: −0.14pp / −1.05pp / −2.23pp (`share_shift_tfp`) at `zeta_K` = 0 / 0.1 / 0.5. Using the firm rate `r` instead of `r_p` on K_f moves the default-closure GNI gaps by 0.05pp or less (`gni_gap_r_variant`).

**3. `share_shift` is GDP-neutral only when the economy is closed.** The scenario is built so that output at fixed inputs is unchanged. At `zeta_K = 0` its 2030 GDP gap is +0.09% and its GNI gap −0.04%. The +1.42% headline is almost entirely capital inflow drawn in by the higher capital share.

**4. Every result passes the sign-and-size checks.**
- **Capital and the interest rate.** A more closed economy shows a smaller K response and a larger r rise in both arms. For `share_shift_tfp`, K is +1.99% / +6.06% / +18.43% and Δr is +139 / +108 / +30bp. For `share_shift`, K is +1.90% / +5.02% / +14.28% and Δr is +103 / +80 / +21bp.
- **2026.** At `zeta_K = 0` the 2026 capital gap is exactly 0.00%, because assets are inherited and there is no inflow. The 2026 K-gap / L-gap ratio is 0 / 0.171 / 0.678. It is identical across the two arms at each closure, so it is the pricing rule `K_f = zeta_K·(K_open − K_d)` at work and not saving (#16).
- **GNI below GDP.** GNI sits below GDP in every baseline: 99.56% / 98.57% / 95.99% of GDP. That includes `zeta_K = 0`, where K_f = 0 but foreigners still hold 9.5% of government debt (`zeta_D = 0.4`).
- **Accounting identities.** K = K_d + K_f, K_d = B − D_d and D = D_d + D_f hold to 1e-16 in every run.
- **Results that looked odd and were checked.**
  - At `zeta_K = 0.5`, `share_shift_tfp`'s 2026 GDP gap is negative (−0.50%) and foreigners fund more than 100% of the extra capital.
  - Both have the same cause. With a large inflow, r barely rises and wages rise (+3.56% by 2030, against −1.92% at `zeta_K = 0`). The wealth effect therefore dominates: consumption rises at once (+0.84% in 2026), labour falls (−0.56%) and domestic capital falls (K_d −0.35% in 2027).
  - At `zeta_K = 0` the sign flips: r rises 139bp, households work and save more early (C −0.96%, L +0.52% in 2026), and domestic capital carries all of the increase.
  - So **the sign of the wage response also depends on the closure**.

**5. The 2030 investment drop is the inflow stopping.** At `zeta_K = 0`, `share_shift_tfp`'s investment gap keeps rising through 2030 (+10.7% → +12.4%). At 0.1 and 0.5 it collapses when γ stops rising (+28.9% → +13.1% and +84.8% → +19.8%). "Investment is a residual" is wrong (#16).

**6. Convergence.**
- Every one of the 10 transition paths reached OG-Core's `mindist_TPI = 1e-4`, in 8–10 outer iterations with final distances of 3.4e-5 to 7.2e-5. Euler errors are ≤ 6.3e-12.
- **2026 residual.** The signed 2026 resource-constraint residual is negative in every run and is shared by the arms of a closure to within 0.006% of GDP. Its size depends on the closure: −0.99% (0), −0.95% (0.1), −0.81% (0.5) of GDP.
- **Interior residuals.** The largest interior residual (2027…T−2) is in 2028 in every run: −0.07% to −0.09% of GDP. Every other interior period is below 0.0006% of GDP.
- **Final period.** The last period carries OG-UK's known boundary error of −21% to −27% of GDP, which OG-UK's own `RC_TPI = 0.2` override waives (`api.py`).

**7. The period-0 demographics are inconsistent, and the 2028 residual has a candidate cause.** See the section below. OG-Core's shipped pre-period mortality and immigration rates break the pre-period → 2026 population law of motion by up to 5.9% at some ages. The UK-consistent values from the same fetch satisfy it to 2.5e-16. Separately, the 2027 → 2028 transition breaks it by 0.25% under either set of pre-TP inputs. That is where OG-UK's demographic data window ends (`final_data_year = 2028`) and the projection begins, and it lines up with the 2028 resource-constraint residual. The splice is not fixed by the pre-TP patch.

**8. Passing UK-consistent pre-TP demographics removes the 2026 residual (#15).**
- **The test.** A baseline at `zeta_K = 0.1` with `g_n_preTP`, `rho_preTP` and `imm_rates_preTP` taken from the same UK fetch, with everything else identical (the demographic hashes match).
- **The 2026 residual.** It goes from −0.9495% to +0.0001% of GDP. The 2028 residual is unchanged (−0.089%), which is consistent with point 7: it has a separate cause.
- **Levels.** From 2027 on the levels move by less than 0.3% (Y −0.07% to −0.08%, K −0.23% to −0.29%, r about +2bp). The 2026 investment level moves −3.8%, because period-0 investment uses the pre-TP growth and immigration rates.
- **Not tested here: whether the published gaps survive.** The ramp arms were not re-solved under this baseline. That rerun is R2 on #27. The 2026 investment gap is the number most likely to move.
- **Convergence.** This path converged with a final distance of 9.85e-5, just inside the 1e-4 tolerance.

**9. Exports the results-sanity audit requested on #27.** These are in `output/extra_exports.json` and needed no extra solve.
- **Population law of motion.** The per-period residual is in `law_of_motion`. It is ~1e-16 in every transition except pre → 2026 (stock pre-TP inputs only) and 2027 → 2028 (0.25%).
- **Fiscal aggregates.** Steady-state G, TR, tax revenue, outlays and primary balance for each baseline are in `fiscal_baselines`, along with `g_n_ss = 0.000511`. The steady-state primary surplus is 1.31% of GDP at `zeta_K = 0.1`. The pre-TP patch leaves it unchanged. It is 1.55% at `zeta_K = 0` and 0.27% at 0.5, so the closure also moves the fiscal steady state.

### What this means for the corrective rerun (R3 on #27)

- Report results at more than one closure, or at least state `zeta_K`, `zeta_D` and the world rate next to every headline.
- Report GNI alongside GDP.
- The source of the sensitivity is the gap between the baseline return (r ≈ 5.2% at `zeta_K = 0.1`) and `world_int_rate_annual = 0.02`. Any `zeta_K > 0` draws in foreign capital in proportion to that 3pp wedge, so the headline is roughly `zeta_K × (K_open − K_d)`, a number set by two uncalibrated parameters.
