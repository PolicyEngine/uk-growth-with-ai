"""Calibration algebra: gamma from a labour-share target, and the Z solvers.

The joint normalisation is the subtle part.  Moving gamma alone ALREADY changes
output at fixed inputs (K^g1 L^(1-g1) != K^g0 L^(1-g0)), by +5.9938% at the UK
baseline factor levels.  So Z must be solved JOINTLY with gamma against the
scenario's technology target -- it must NOT be set to 1 + target, which would
silently add the gamma-only gain on top and overstate every arm.  Both solved
values come out BELOW 1 for exactly that reason.
"""

from __future__ import annotations

from .scenarios import Scenario


def gamma_for_labour_share_fall(g0: float, fall_pp: float) -> float:
    """At epsilon=1 the labour share is exactly 1-gamma, so this is algebra."""
    return 1.0 - ((1.0 - g0) - fall_pp / 100.0)


def gamma_only_gain(K: float, L: float, g0: float, g1: float) -> float:
    """Output change at FIXED inputs from moving gamma alone, Z held at 1."""
    return (K ** g1 * L ** (1 - g1)) / (K ** g0 * L ** (1 - g0)) - 1.0


def z_for_tfp_gain(gamma_only: float, tfp_gain: float) -> float:
    """Z such that the JOINT (gamma, Z) move is a +tfp_gain technology gain."""
    return (1.0 + tfp_gain) / (1.0 + gamma_only)


def z_for_gdp_level(gamma_only: float, level_change: float = 0.0) -> float:
    """Z such that the GDP LEVEL at fixed inputs moves by ``level_change``.

    With level_change = 0 this is Z exactly offsetting the gamma-only gain.
    """
    return (1.0 + level_change) / (1.0 + gamma_only)


def solve_scenario(scenario: Scenario, K0: float, L0: float, g0: float) -> dict:
    """gamma and Z for one scenario, given baseline period-0 factor levels."""
    g1 = gamma_for_labour_share_fall(g0, scenario.labour_share_fall_pp)
    gonly = gamma_only_gain(K0, L0, g0, g1)
    if scenario.tfp_gain is not None:
        Z = z_for_tfp_gain(gonly, scenario.tfp_gain)
    else:
        Z = z_for_gdp_level(gonly, scenario.gdp_level_change or 0.0)
    return {"gamma": g1, "gamma_only_output_gain": gonly, "Z": Z}
