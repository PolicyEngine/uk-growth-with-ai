# Which capital closure should be central?

Decision memo for R3 on #27 and for #16. Written in the review of #30, 12 November 2026.
Status: **recommendation, pending Vahid**. The R1–R4 reruns produce both `zeta_K = 0` and
`zeta_K = 0.1`, so this decides only which set is published as central.

## Recommendation

1. **Keep `zeta_K = 0.1` as the central closure.** State it, with `zeta_D = 0.4` and the 2% world
   rate, next to every headline.
2. **Publish `zeta_K = 0` beside it as the closed-capital bound**, in the same table and the same
   chart, not in an appendix.
3. **Lead with national income (GNI) and show GDP with it.** GNI is the number that moves least
   with the closure.

This differs from `docs/closure_sensitivity.md` as first written, which proposed `zeta_K = 0` as
central. The reason is below: on UK data, a closed capital account fails more tests than the
default does.

On the committed (pre-rerun) numbers the headline would read:

| 2030 gap against baseline | GNI, central (0.1) | GNI, closed-capital bound (0) | GDP, central | GDP, bound |
|---|---|---|---|---|
| `share_shift_tfp` | +3.87% | +3.01% | +4.92% | +3.14% |
| `share_shift` | +0.59% | −0.04% | +1.42% | +0.09% |

The GNI range across the two closures is 0.9pp and 0.6pp. The GDP range is 1.8pp and 1.3pp.

## The case for `zeta_K = 0`, and where it falls short

`docs/closure_sensitivity.md` gives three reasons for a closed central case. Each is true.

- The results do not depend on the 2% world rate, which nobody calibrated.
- GDP and GNI nearly coincide, so the headline means what residents get.
- The OBR runs the scenarios in its own overlapping-generations model in the closed setting
  (Working paper No.22, para 5.2).

None of them is evidence that the UK is closed. `zeta_K = 0` is a parameter value too, and it
makes three claims about the UK that the data reject (next section). It is also not a closed
economy: foreigners still buy 40% of new gilts (`zeta_D = 0.4`), so the capital account is open
for public debt and shut for private capital. That hybrid is hard to defend as a description of
anything.

## Evidence

### 1. What the three baselines imply, against UK data

Model figures are 2030 baseline values from `analysis/closure/output/`. A closure should match
the **net** external position, because the model has no UK-owned assets abroad: K_f + D_f is a
net liability.

| | UK data | `zeta_K = 0` | 0.1 | 0.5 |
|---|---|---|---|---|
| Net income paid abroad, % of GDP | 1.2 (2025), 1.6 (2024) | 0.44 | **1.43** | 4.01 |
| GNI / GDP, % | about 98.4–98.8 | 99.56 | **98.57** | 95.99 |
| Net foreign inflow (current account deficit), % of GDP | 3.0 (2025), 2.9 (2024) | 0.15 | 0.61 | **2.9–3.1** |
| Net foreign liabilities, % of GDP | 2.0 (end 2025), 1.4 (end 2024) | **8.6** | 30 | 123 |
| Foreign claims on the capital stock, % (gross) | about 40 (OBR); 58.8 of quoted shares | 0 | 8 | **37** |

Bold marks the closest closure in each row. Sources are at the end.

- **No closure matches every row.** The model has one net position where the UK has large gross
  positions on both sides.
- **`zeta_K = 0.1` matches the income flow.** Income paid abroad is what separates GNI from GDP,
  so it is the row that matters most for the headline. The baseline pays 1.43% of GDP abroad,
  inside the UK's 1.2–1.6%.
- **`zeta_K = 0` is closest on the net stock and furthest on the flows.** Its current account is
  near balance, where the OBR forecasts a deficit of about 3% of GDP "funded by a matching inflow
  of foreign saving" (March 2026 EFO, para 2.36).
- **`zeta_K = 0.5` matches the gross figures only.** On net it pays 4% of GDP abroad and owes
  123% of GDP.
- The UK's net liability figure is small and unstable across ONS vintages (the 2025 Pink Book
  had 5.0% of GDP for end 2024). It is the weakest row to calibrate on.

### 2. Who finances extra investment

The headline is about the margin: when firms want more capital, who supplies it? The baseline
shares above do not answer that. The saving–investment literature does.

| | Share of extra 2026–29 investment met from domestic resources |
|---|---|
| `zeta_K = 0` | 0.95 / 0.90 |
| `zeta_K = 0.1` | 0.33 / 0.37 |
| `zeta_K = 0.5` | 0.10 / 0.12 |

(`share_shift_tfp` / `share_shift`; domestic resources are ΔY − ΔC − ΔG.)

- Feldstein and Horioka (1980) found that about 0.9 of a rise in national saving stayed in
  domestic investment across OECD countries in 1960–74. That is the `zeta_K = 0` world.
- Later estimates are much lower. Blanchard and Giavazzi (2002) report about 0.6 for the OECD
  over 1975–2001, about 0.4 for 1991–2001, and about 0.1 for the euro area in the 1990s.
- For the UK, Sarno and Taylor (1998) find the country highly integrated with world capital
  markets after exchange controls ended in October 1979.
- So a retention near 0.9 describes the UK before 1979. A value near 0.35 sits at the open end
  of the modern range, which is where the UK belongs. A value near 0.1 is a small open economy
  with no frictions.

The coefficients in the second and third bullets are quoted from memory of the papers. Check
them against the published tables before they go into the paper.

### 3. What the OBR assumes

- **AI scenario.** Box 2.2 of the March 2026 EFO has the technology "increasing capital
  deepening". It does not say who finances it.
- **Central forecast.** Current account deficits of about 3% of GDP, funded by foreign saving
  (para 2.36). The OBR's baseline is not a closed economy.
- **OBR's own OLG model (Working paper No.22).** It runs either closed or as a small open economy
  at a 5% world rate. The open baseline has 43¾% of capital foreign-owned, against the OBR's
  forecast of foreign claims worth about 40½% of the capital stock in 2028-29. Its illustrative
  scenarios use the closed setting "to assess all levers of the model", not as a claim about the
  UK.

### 4. Where 0.1 comes from

- OG-Core's parameter documentation: "Set to 0.1 when running large-open version of US economy,
  but hard to find data to pin this down."
- OG-USA's calibration chapter says only "We set ζ_K = 0.1". Its current default file has 0.5.
- OG-UK inherits 0.1 and sets the world rate to 2% (OG-Core's default is 4%).

So 0.1 was not chosen for the UK. The argument for it here is after the fact: the baseline it
produces matches the UK's net income flow, and its marginal financing split is in the range the
literature supports. That is a weaker basis than a calibration, and the paper should say so in
those words.

## What a NIER referee will ask

| Question | Answer under 0.1 central | Answer under 0 central |
|---|---|---|
| Why this closure? | The baseline reproduces UK net income paid abroad; marginal financing is within published saving–investment estimates | It has no free parameter |
| Is that the UK? | Partly: income flow yes, gross ownership no | No: current account in balance, no foreign-owned capital, all extra investment from domestic saving |
| How sensitive is the headline? | Closed-capital bound shown beside it | Open case shown beside it |
| Does GDP overstate the gain? | Yes, and GNI leads | Not an issue |

The second row decides it. A referee can accept a central case that is imperfect and bounded.
A central case that contradicts the UK's balance of payments invites the objection that the
headline was picked for being low.

## Weaknesses of 0.1 that the paper has to state

- **The size of the inflow depends on the 2% world rate, and no run has varied it.** Domestic r
  is 5.3% in the baseline, so capital demanded at the world rate is 1.72 times the actual stock.
  The rule works on that standing gap.
- **Price and quantity disagree.** Foreigners raise their UK capital by 59% while the return on
  it rises 108bp. An integrated market would not show both.
- **The four-year profile is not a result.** Investment reaches 24.6% of GDP in 2029 and drops
  in 2030. The external deficit is 2.3–3.9pp of GDP wider than baseline for four years, about
  double the UK's current deficit. Report the 2030 levels, not the path.
- **The wage sign in `share_shift_tfp` depends on the closure** (−1.92% at 0, −0.55% at 0.1).
  Report it as about unchanged.

## What this means for the reruns

- **Publish the `zeta_K = 0.1` set as central and the `zeta_K = 0` set as the bound.** Both are
  already being solved.
- **Re-check the choice on the new baselines.** R1 and R2 change the baseline. Keep 0.1 central
  if the new baseline still pays between 1% and 2% of GDP abroad. If it does not, bring the
  numbers back before publishing.
- **R4 (GDP-neutral Z for `share_shift`)** should be solved at the central closure.
- **Later, not in this rerun:** one sensitivity with the world rate set to the baseline domestic
  return. That removes the standing gap and tests the first weakness above. It is a new closure
  and needs about three solves.

## Sources

- ONS, *UK Balance of Payments, The Pink Book: 2026* (30 October 2026): current account deficit
  3.0% of GDP in 2025 and 2.9% in 2024; primary income deficit 1.2% and 1.6%; net international
  investment liability 2.0% of GDP at end 2025 and 1.4% at end 2024. GNI / GDP above is 100
  minus the primary income deficit.
- ONS, *Ownership of UK quoted shares: 2024* (29 January 2026): rest of the world 58.8% by value.
- OBR, *Economic and fiscal outlook*, March 2026: Box 2.2; paras 2.35–2.36.
- OBR, Working paper No.22, *A new UK overlapping generations model* (April 2025): paras 2.18,
  4.4, 5.2.
- OG-Core documentation, `docs/book/content/intro/parameters.md` (`zeta_K`) and
  `theory/open_economy.md`; OG-USA documentation, `calibration/macro.md`, and
  `ogusa_default_parameters.json` on `master`, read 12 November 2026.
- Feldstein, M. and Horioka, C. (1980), "Domestic saving and international capital flows",
  *Economic Journal* 90.
- Blanchard, O. and Giavazzi, F. (2002), "Current account deficits in the euro area: the end of
  the Feldstein–Horioka puzzle?", *Brookings Papers on Economic Activity* 2002(2).
- Sarno, L. and Taylor, M. (1998), "Exchange controls, international capital flows and
  saving–investment correlations in the UK: an empirical investigation", *Weltwirtschaftliches
  Archiv* 134(1).
- Model figures: `analysis/closure/output/zk*_*.json`, computed in the review of #30.
