"""Scenario definitions and the shared run constants.

Two AI scenarios for the UK, each measured against the "OBR central" baseline
(see ``G_Y_ANNUAL``: the baseline already embeds the OBR's own AI assumption):

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
# (about 0.1pp by year five, 0.2pp at its forecast horizon; Briefing paper No.9
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
