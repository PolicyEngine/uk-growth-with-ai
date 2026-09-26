"""OG-UK baseline against the OBR's published March 2026 EFO baseline.

OBR figures, March 2026 Economic and fiscal outlook:
  para 1.2   productivity growth 1.0% medium term; labour supply 0.5% by 2030
  para 1.10  GDP growth averages 1.6% a year from 2027 to 2030
  para 2.10  potential output growth 1.2% in 2026 rising to 1.5% in 2030
https://assets.publishing.service.gov.uk/media/69a6d7b62e1f4fbda4252208/economic-and-fiscal-outlook-march-2026-web-accessible.pdf
"""

from __future__ import annotations

import numpy as np

from .data_access import load_results, load_trend_params
from .report import growth_path

OBR_BASELINE = {
    "gdp_growth_2027_30": 1.60,
    "productivity_medium_term": 1.0,
    "labour_supply_2030": 0.5,
    "potential_output_2030": 1.5,
    "potential_output_2026": 1.2,
}

YEARS = [2027, 2028, 2029, 2030]


def baseline_growth(results=None, oguk_dir=None) -> np.ndarray:
    """Real GDP growth 2027-2030 on the OG-UK baseline path, in percent."""
    res = results if results is not None else load_results()
    g_n, g_y = load_trend_params(oguk_dir, res)
    return growth_path(res["baseline"]["Y"], g_y, g_n)


def compare(results=None, oguk_dir=None) -> dict:
    """Growth path, the OBR gap, and the component decomposition.

    ``g_n[t]`` is population growth from t to t+1 (t = 0 is 2026), so growth
    "in 2030" is ``g_n[3]`` and the model's first year of growth is 2026->27.
    """
    res = results if results is not None else load_results()
    g_n, g_y = load_trend_params(oguk_dir, res)
    growth = baseline_growth(res, oguk_dir)
    prod = (np.exp(g_y) - 1) * 100
    potential = lambda t: (np.exp(g_y) * (1 + g_n[t]) - 1) * 100
    components = [
        ("productivity growth, medium term", OBR_BASELINE["productivity_medium_term"], prod),
        ("labour supply growth, 2030", OBR_BASELINE["labour_supply_2030"], g_n[3] * 100),
        ("potential output growth, 2030", OBR_BASELINE["potential_output_2030"], potential(3)),
        ("potential output growth, 2026 (model: 2026->27)",
         OBR_BASELINE["potential_output_2026"], potential(0)),
    ]
    return {
        "years": YEARS,
        "growth": growth,
        "mean": float(growth.mean()),
        "obr_mean": OBR_BASELINE["gdp_growth_2027_30"],
        "difference": float(growth.mean() - OBR_BASELINE["gdp_growth_2027_30"]),
        "components": components,
        "g_n": g_n,
        "g_y": g_y,
    }


def print_comparison(results=None, oguk_dir=None) -> dict:
    c = compare(results, oguk_dir)
    growth, g_n, g_y = c["growth"], c["g_n"], c["g_y"]

    print("OG-UK BASELINE vs OBR (March 2026 EFO) — real GDP growth\n")
    print(f"{'year':>6}{'OG-UK':>9}")
    for y, x in zip(c["years"], growth):
        print(f"{y:>6}{x:>8.2f}%")
    print(f"\n  OG-UK 2027-30 mean : {c['mean']:.2f}%")
    print(f"  OBR  2027-30 mean  : {c['obr_mean']:.2f}%   (EFO para 1.10)")
    print(f"  difference         : {c['difference']:+.2f}pp")

    print("\nCOMPONENTS — where the agreement breaks down\n")
    print(f"{'':<50}{'OBR':>8}{'OG-UK':>9}{'gap':>9}")
    for label, obr, oguk in c["components"]:
        print(f"{label:<50}{obr:>7.1f}%{oguk:>8.2f}%{oguk - obr:>+8.2f}pp")

    if abs(g_y - 0.011) < 1e-12:
        print(
            "\nNOTE: g_y_annual = 0.011 is mis-sourced (issue #5): it is OBR potential\n"
            "output growth, but OG-Core defines g_y_annual as labour-augmenting\n"
            "productivity growth, and labour supply is already in g_n."
        )
    else:
        print(f"\ng_y_annual = {g_y}: OBR medium-term productivity growth (issue #5).")
    return c
