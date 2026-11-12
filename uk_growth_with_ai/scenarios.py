"""Scenario definitions and the shared run constants.

Two AI scenarios for the UK, each measured against the "OBR central" baseline
(see ``G_Y_ANNUAL``: the baseline already embeds the OBR's own AI assumption):

  share_shift      Capital's share gamma ramps 0.35 -> 0.389 (labour share -3.9pp)
                   with NO technology gain: Z is solved so that the (gamma, Z)
                   pair leaves output unchanged at the baseline's 2026 K and L,
                   i.e. a zero technology wedge.  Compared with, but NOT a
                   reproduction of, the OBR's March 2026 EFO Box 2.2
                   technological-displacement case ("higher trend productivity
                   fully offsets lower employment to leave the LEVEL of GDP
                   unchanged"): K and L are endogenous, so neutrality at fixed
                   2026 inputs still lets saving move K and the arm delivers GDP
                   +1.4% by 2030, not an unchanged level.  Box 2.2 publishes no
                   labour-share number either.
  share_shift_tfp  The same share shift plus +3.1% output at fixed baseline
                   inputs.

Both magnitudes (3.9pp, 3.1%) are taken from Korinek, Jones, Sacher, Cotter &
McCrory (2026), Anthropic Institute WP 2026-02, Table 3, "substantial" column.
Nothing in the model identifies AI as the cause, so the arms are named for what
they impose (issue #14).  They were called ``obr``/``zero_tfp`` and
``anthropic`` before; ``data_access.normalise_arms`` still reads those keys.

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
RAMP_YEARS = 4       # 2026 -> 2030, Korinek et al.'s horizon
NPER = 5             # periods kept in the results file

# Run settings from the re-run in issue #9 (defaults of `run`, used by the
# committed results; before it: own alpha_G per arm, tG1 = 4, g_y_annual = 0.011).
TG1 = 10             # issue #3: OG-UK's tG1 = 4 switches G to debt targeting in 2030

# Labour-augmenting productivity growth in the baseline ("OBR central").
#
# 0.010: the OBR's medium-term PRODUCTIVITY growth (March 2026 EFO para 1.2).
# OG-Core's g_y is labour-augmenting technological change and OG-UK carries
# population growth separately in g_n, so OG-UK's shipped 0.011 (potential
# output growth) double-counted labour supply; 1.0% is the right object (issue
# #5).  The committed results were run at this value.
#
# The baseline is "OBR central", NOT a no-AI counterfactual.  The OBR's 1.0%
# path already contains its own AI assumption, which ramps in with adoption
# along a non-linear path (Briefing paper No.9: a central ~0.2pp at its
# forecast horizon, para B.14; a J-curve reaching 0.1pp a year by year five,
# para B.12).  g_y is a scalar, so it cannot carry that profile, and netting a
# flat 0.2pp off (0.008, tried and dropped in #22) would remove more AI than
# the OBR assumes over 2026-30.  The scenario gaps are therefore AI effects IN
# ADDITION to the OBR's own AI assumption (decision recorded in issue #27).
G_Y_ANNUAL = 0.010


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


SHARE_SHIFT_TFP = Scenario(
    name="share_shift_tfp",
    labour_share_fall_pp=3.9,        # 60.0c -> 56.1c, applied to the UK's 0.65
    tfp_gain=0.031,                  # Table 3 panel d, measured TFP
    target=("labour share -3.9pp and +3.1% output at fixed baseline inputs "
            "(sizes from Korinek et al. 2026, Table 3)"),
)

# The share shift alone.  Box 2.2 publishes no labour-share number, so the
# 3.9pp is Korinek et al.'s, and Z offsets the pure-gamma output change.  The
# defining feature is the ZERO technology wedge at the baseline's fixed 2026
# inputs -- not an unchanged GDP level, which is what the OBR's case targets and
# what this arm does not deliver (see the module docstring).
SHARE_SHIFT = Scenario(
    name="share_shift",
    labour_share_fall_pp=3.9,
    gdp_level_change=0.0,
    target=("labour share -3.9pp (size from Korinek et al. 2026, Table 3) with "
            "a ZERO technology wedge: Z solved so that output is unchanged at "
            "the baseline's 2026 K and L.  A constructed share-shift scenario; "
            "compared with, not a reproduction of, March 2026 EFO Box 2.2"),
)

# Legacy aliases for code written before the rename (issue #14).
ANTHROPIC = SHARE_SHIFT_TFP
ZERO_TFP = OBR = SHARE_SHIFT

SCENARIOS = {s.name: s for s in (SHARE_SHIFT_TFP, SHARE_SHIFT)}

# Korinek et al. (2026) Table 3, 2030, for the comparison table in ``report``.
ANTHROPIC_SUBSTANTIAL = {
    "labour_share_fall_pp": 3.9,     # 60.0c -> 56.1c
    "measured_tfp_pct": 3.1,         # panel d
    "gdp_above_no_ai_pct": 8.3,
    "gdp_growth_pct": 5.4,
    "capital_stock_pct": 13.8,
    "unemployment_pct": 4.6,         # all workers; cognitive workers 4.5
}
