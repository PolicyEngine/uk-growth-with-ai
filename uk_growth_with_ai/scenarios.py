"""Scenario definitions and the shared run constants.

Two AI scenarios for the UK, run on a corrected counterfactual:

  anthropic  Korinek, Jones, Sacher, Cotter & McCrory (2026), Anthropic Institute
             WP 2026-02, Table 3, "substantial" column: the labour share falls
             3.9pp and measured TFP rises 3.1% by 2030.
  zero_tfp   The same automation intensity with NO technology gain: Z is solved so
             that the (gamma, Z) pair leaves output unchanged at the baseline's
             2026 K and L, i.e. a zero technology wedge.  Its motivation is the
             OBR's March 2026 EFO Box 2.2 technological-displacement case ("higher
             trend productivity fully offsets lower employment to leave the LEVEL
             of GDP unchanged"), but it does NOT reproduce it: K and L are
             endogenous, so neutrality at fixed 2026 inputs still lets saving move
             K and the arm delivers GDP +1.4% by 2030, not an unchanged level.
             Box 2.2 also publishes no labour-share number.  The arm is therefore
             named for what it does -- automation with a zero TFP wedge -- and not
             for the OBR (.audit/03-uk-benchmarks.md F2, .audit/02 §2).

Both shocks enter the same way: gamma raises the capital weight (automation) and
Z carries productivity.  They differ only in what Z is solved against -- see
``calibrate``.  Each is run twice, with gamma STEPPED and gamma RAMPED, so the
effect of the time-varying-gamma patch (patches/ogcore-0.17.0-firm-gamma-tv.diff) can be read
directly off the results; the step arms do not need the patch.
"""

from __future__ import annotations

from dataclasses import dataclass

EPS = 1.0            # Cobb-Douglas: at epsilon=1 the labour share is exactly 1-gamma
G_BASE = 0.35        # UK baseline capital weight -> labour share 0.65
START = 2026
RAMP_YEARS = 4       # 2026 -> 2030, Anthropic's horizon
NPER = 5             # periods kept in the results file

# Run settings for the re-run in issue #9 (defaults of `run`; the committed
# results predate them: own alpha_G per arm, tG1 = 4, g_y_annual = 0.011).
TG1 = 10             # issue #3: OG-UK's tG1 = 4 switches G to debt targeting in 2030

# Labour-augmenting productivity growth in the NO-AI counterfactual.
#
# 0.008, not the OBR's headline 1.0%.  Two separate corrections sit behind this
# number and both are needed:
#
#   1. Object.  OG-Core's g_y is labour-augmenting technological change, and
#      OG-UK carries population growth separately in g_n, so OG-UK's shipped
#      0.011 (potential output growth, Nov 2025 EFO Table 1.1) double-counted
#      labour supply.  The right object is the OBR's medium-term PRODUCTIVITY
#      growth of 1.0% (March 2026 EFO para 1.2) -- that was the issue #5 fix,
#      and it is still right (.audit/07-calibration-sensitivity.md §3).
#   2. Counterfactual.  That 1.0% is AI-INCLUSIVE.  OBR Briefing paper No.9
#      Annex B (Nov 2025) states that AI "will build over time as adoption grows
#      to reach an estimated 0.2 percentage points by our forecast horizon", and
#      the October 2026 EFO (para 2.45) repeats the 0.2pp central judgement.
#      Running an AI shock on top of 1.0% therefore adds AI to a baseline that
#      already embeds the OBR's own AI uplift, and the baseline cannot be
#      described as "no AI" at all (.audit/03-uk-benchmarks.md F1).
#
# Netting the 0.2pp AI uplift off the 1.0% productivity path gives a no-AI
# counterfactual of 0.8%/yr.  .audit/10-reproducibility.md derives no figure of
# its own; 0.008 comes from 03 F1 and is listed as a sensitivity point in
# .audit/07 §5 row 11.  OPEN QUESTION for Vahid: the 0.2pp is the OBR's central
# judgement over the medium term, not a 2026-30 profile, so 0.008 is flat where
# the OBR's uplift ramps.  An alternative is to keep 0.010 and relabel the
# baseline "OBR central", reporting the gaps as AI effects IN ADDITION to the
# OBR's AI assumption.
G_Y_ANNUAL = 0.008


@dataclass(frozen=True)
class Scenario:
    """One AI scenario: a labour-share target plus whatever pins down Z.

    ``tfp_gain`` and ``gdp_level_change`` are mutually exclusive: exactly one of
    them is set, and it selects which Z solver in ``calibrate`` is used.
    """

    name: str
    labour_share_fall_pp: float
    tfp_gain: float | None = None
    gdp_level_change: float | None = None
    target: str = ""


ANTHROPIC = Scenario(
    name="anthropic",
    labour_share_fall_pp=3.9,        # 60.0c -> 56.1c, applied to the UK's 0.65
    tfp_gain=0.031,                  # Table 3 panel d, measured TFP
    target="labour share -3.9pp and +3.1% measured TFP (Table 3)",
)

# Automation with no technology gain.  The labour-share fall is not published as
# a number anywhere in Box 2.2, so we impose the same automation intensity as the
# Anthropic arm and let Z offset the pure-gamma output change.  The defining
# feature is the ZERO technology wedge at the baseline's fixed 2026 inputs -- not
# an unchanged GDP level, which is what the OBR's case targets and what this arm
# does not deliver (see the module docstring).
ZERO_TFP = Scenario(
    name="zero_tfp",
    labour_share_fall_pp=3.9,
    gdp_level_change=0.0,
    target=("labour share -3.9pp with a ZERO technology wedge: Z solved so that "
            "output is unchanged at the baseline's 2026 K and L.  Motivated by, "
            "but not a reproduction of, March 2026 EFO Box 2.2"),
)

# Back-compatible alias: the arm was called `obr` until the rename.
OBR = ZERO_TFP

SCENARIOS = {s.name: s for s in (ANTHROPIC, ZERO_TFP)}

# Korinek et al. (2026) Table 3, 2030, for the comparison table in ``report``.
ANTHROPIC_SUBSTANTIAL = {
    "labour_share_fall_pp": 3.9,     # 60.0c -> 56.1c
    "measured_tfp_pct": 3.1,         # panel d
    "gdp_above_no_ai_pct": 8.3,
    "gdp_growth_pct": 5.4,
    "capital_stock_pct": 13.8,
    "unemployment_pct": 4.6,         # all workers; cognitive workers 4.5
}
