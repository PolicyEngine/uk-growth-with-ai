"""Scenario definitions and the shared run constants.

Two AI scenarios for the UK, run on a corrected counterfactual:

  anthropic  Korinek, Jones, Sacher, Cotter & McCrory (2026), Anthropic Institute
             WP 2026-02, Table 3, "substantial" column: the labour share falls
             3.9pp and measured TFP rises 3.1% by 2030.
  obr        OBR March 2026 EFO Box 2.2, technological-displacement case: "higher
             trend productivity fully offsets lower employment to leave the LEVEL
             of GDP unchanged", with a lower labour share and higher profit share.

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
G_Y_ANNUAL = 0.010   # issue #5: OBR productivity growth, not potential output (1.1%)


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

# The labour-share fall is not published as a number in the OBR case, so we
# impose the same automation intensity as the Anthropic arm and let Z do the
# offsetting.  The GDP level being unchanged is the defining feature.
OBR = Scenario(
    name="obr",
    labour_share_fall_pp=3.9,
    gdp_level_change=0.0,
    target="labour share -3.9pp with the GDP LEVEL unchanged (March 2026 EFO Box 2.2)",
)

SCENARIOS = {s.name: s for s in (ANTHROPIC, OBR)}

# Korinek et al. (2026) Table 3, 2030, for the comparison table in ``report``.
ANTHROPIC_SUBSTANTIAL = {
    "labour_share_fall_pp": 3.9,     # 60.0c -> 56.1c
    "measured_tfp_pct": 3.1,         # panel d
    "gdp_above_no_ai_pct": 8.3,
    "gdp_growth_pct": 5.4,
    "capital_stock_pct": 13.8,
    "unemployment_pct": 4.6,
}
