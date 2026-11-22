# UK calibration of the AI scenarios (2028-surprise rerun)

Decision (Vahid, 12 Nov 2026): the headline scenarios are calibrated to UK sources. Korinek et al.'s US "substantial" case is kept as a labelled upper scenario. Machine-readable targets are in `analysis/surprise/uk_targets.json`. Source texts and locations are as in `docs/literature_comparison.md`. "(derived here)" marks arithmetic or inference done for this study, not a figure printed in the source.

**Timing.** AI is an unanticipated shock from 2028. The γ and Z ramp weights are 0, 0.25, 0.5, 0.75 and 1 over 2027–2031, so 2028–2031 are adoption years 1–4. Every target is the level reached in **year 4 (2031)**.

**Mapping to the model.** At ε = 1 the labour share is 1 − γ, which is 0.65 at baseline. A fall of f points gives γ₁ = 0.35 + f/100. The TFP target is output at the baseline's inputs, with Z solved jointly with γ, as in `share_shift_tfp`.

## The pairs

| Scenario | Labour-share fall by 2031 | γ terminal | TFP / output at fixed inputs, 2031 |
|---|---|---|---|
| UK low | −0.7pp | 0.357 | +0.2% |
| **UK central** | **−1.6pp** | **0.366** | **+0.4%** |
| UK high | −2.9pp | 0.379 | +1.6% |
| Korinek US "substantial" (upper, labelled) | −3.9pp | 0.389 | +3.1% |

## 1. Labour-share fall

UK sources give **one labour-share path each**, not a range:

1. **IMF UK Selected Issues 2026** (Bellon, Deb, Gandhi and Rockall, SIP/2026/072).
   - The model is calibrated so that AI "raises the aggregate capital share by approximately 10 percentage points in the long run", reached "in 17 years rather than 34" (¶44, p.24; Annex III ¶4, p.37).
   - The share is the model's Cobb-Douglas capital share α(z), aggregated across 100 sectors (Annex III ¶1, p.37). That is a factor share of output, the same concept as the model's γ, so it maps point for point.
   - **Where "about 0.6pp a year" came from.** It is 10/17 = 0.59pp, a straight line in time (derived here). Over four years that gives 2.35pp.
   - **That overstates year 4.** The IMF does not publish the share path. Its adoption path is convex: TFP is about +0.42% at year 4, +0.53% at year 5 and +1.40% at year 10 (Table 1, p.29; Figure 9, p.25). In its task framework each automated task saves 27% of its cost (¶44), so the output share moved from labour to AI capital is about the TFP gain divided by 0.27 (derived here):
     - 1.56pp at year 4;
     - 1.96pp at year 5;
     - 5.2pp at year 10, against 10pp in the long run.
   - **The UK central scenario uses 1.6pp**, derived here as the IMF-consistent year-4 value (see the disclosure under section 2).
2. **OBR *Fiscal risks and sustainability*, July 2026, Box 4.1.**
   - "The wage and salary share falls from 40 per cent in 2030-31 to 20 per cent in 2075-76" (p.87). The OBR calls this scale "at the upper end of the scenarios explored" in the literature.
   - The share is **wages and salaries as a share of GDP** (footnote a, p.88). It excludes employer social contributions and the labour part of mixed income, so it is not the model's factor share.
   - **Where "0.44pp a year" came from.** It is 20pp over 45 years (derived here). Chart E (p.88), digitised from the PDF's vector data, shows the tax gap opening linearly from 2030-31: about 0.26pp of GDP after 3 years and 3.7pp by 2073-74. That confirms a linear path.
   - After 4 years the fall is **1.78pp of GDP**, in wages-and-salaries terms.
   - **Mapping onto 1 − γ = 0.65:**
     - point for point, 1.78pp;
     - scaled to the OBR's labour-income share of 47% (Nov 2025 EFO ¶2.64), 2.09pp;
     - proportional to the model's 65%, **2.89pp**, the same relative fall of 4.4% of the share.
   - **UK high** uses the proportional mapping, because the OBR presents this path as the upper end.

**How the labour-share and TFP figures are paired.** The IMF model ties the two together through the 27% cost saving, so each UK pair moves them together:
- **Low:** 0.2% TFP / 0.27 → 0.7pp (derived here).
- **Central:** derived from the IMF's year-4 TFP reading (≈0.42%, 0.41–0.44%; the IMF prints only years 5 and 10) → 1.6pp.
- **High:** the OBR upper-end share path (2.9pp) with the OBR's high productivity alternative. Here the IMF mapping (1.6/0.27 = 5.9pp) would exceed the OBR's own upper end, so the share is capped there.

**No UK source supports a share shift with zero TFP.** That case was the old `share_shift` arm.

## 2. TFP / output at fixed inputs by 2031

| Source | Published figure | Year-4 level (derived here) |
|---|---|---|
| IMF SIP/2026/072 baseline | TFP +0.53% at year 5 (Table 1, p.29) | Figure 9 vector data give 0.443 / 0.570 at years 4 and 5 (raw values, before rescaling). Rescaled to the table's 0.53 (0.53 × 0.78), the year-4 reading is **≈0.42% (0.41–0.44%)**: only years 5 and 10 are printed. The digitised output line reproduces the table exactly (3.26% at year 5, 7.95% at year 10), and gives 2.52% at year 4. |
| OBR central (BP9 ¶B.14; EFO Oct 2026 ¶1.27, p.21; FRS 2026 Box 4.1, p.86) | Growth boost 0.2pp a year by the five-year horizon; "somewhere between the J and S-curves" (¶B.14) | BP9 Chart B.4 (p.51, read off the chart's vector data): **0.19% (J) to 0.33% (S)** at year 4; 0.30–0.57% at year 5. The OBR publishes no central year-by-year path, and ¶B.12 rejects a linear one |
| OBR J-curve (BP9 ¶B.12) | 0.1pp a year by year five | **0.2%** (Chart B.4: 0.19%) |
| OBR S-curve (BP9 ¶B.12) | 0.25pp a year by year five | Chart B.4: 0.33% |
| OBR high alternative (FRS 2026 Box 4.1, p.86) | "up to 0.8 percentage points" a year | **1.6%** |
| IMF Article IV 2026, risk matrix (p.47) | TFP +1 to 5pp over 10 years | 0.4–2.0% if linear |

**Year 4 rather than year 5.** The ramp reaches its terminal value in the fourth adoption year (2031), so the target is the year-4 level. Keeping the IMF's year-5 0.53% would front-load the IMF's own path by one year.

**Central +0.4%.** The model input is the IMF's ≈0.42% (0.41–0.44%) at year 4, rounded. The OBR's own effect at year 4 is 0.19–0.33% on Chart B.4, so the IMF and OBR figures are two estimates of one effect, and the OBR's forecast path already includes it: UK central's input is not net of the OBR's (issue #27, revised 18 Nov 2026). On calendar years, the OBR curves add 0.41–0.80% over 2028–2031 (OBR years 3–6) and 0.27–0.54% over 2027–2030 (years 2–5). An earlier version of this note derived 0.4% from the OBR's 0.2pp by a linear ramp; that reading sits above the OBR's own S-curve and is withdrawn.

**The UK central share fall, −1.6pp: derived, not published by the IMF.** Year-4 TFP is read off IMF SIP/2026/072 Figure 9 as about 0.42% (0.41–0.44%). Divided by the IMF's 27% cost saving, the 0.41–0.44% reading gives 1.5–1.6pp; the UK central scenario uses 1.6pp (`labour_share_fall_pp: 1.6` in analysis/surprise/uk_targets.json). The share is derived from the 0.42 reading while the TFP input is the rounded 0.4, which alone would give 0.4 ÷ 0.27 = 1.5pp. Decided by review on 16 Nov 2026: kept, no re-solve.

**Low and high.**
- Low +0.2%: the OBR J-curve; the FRS describes the low end as "less than 0.1 percentage points" a year.
- High +1.6%: the OBR's 0.8pp alternative, inside the IMF risk-matrix range.

**Briefing paper No.9 was not re-read.** obr.uk redirects automated downloads of BP9 and its charts-and-tables file to a no-access page (tried again on 12 Nov 2026 with plain requests). The ¶B.12 and ¶B.14 figures are from the #31 review, which read the PDF. The FRS 2026 Box 4.1 restates the central 0.2pp and the range from "less than 0.1" to "up to 0.8".

## 3. Upper scenario, kept separately

Korinek, Jones, Sacher, Cotter and McCrory (2026), Table 3 "substantial", p.31: labour share 60.0 → 56.1 per cent of income (**−3.9pp**), measured TFP **+3.1%** in 2030.
- It is a US scenario. Against the UK sources above, its TFP is about 8 times the UK central and its share fall about 2.4 times.
- Label it "US substantial (Korinek et al.)", not UK.
