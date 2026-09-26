"""Result tables: one shocked arm against the common baseline.

Everything here reads the committed results JSON; nothing re-runs the model, so
ogcore/oguk need not be installed.

Levels: the model reports detrended values. OG-Core divides by productivity
e^{g_y t} and population N_t, and its ``p.g_n[t]`` is population growth from
t to t+1 (see the investment identity in ``ogcore/aggregates.py``). So
re-trending is variable by variable (issue #4): output, spending, capital,
debt and tax by e^{g_y t} N_t; the wage by e^{g_y t} only; aggregate labour by
N_t only; the interest rate not at all. The labour share w*L/Y is therefore
unchanged by re-trending. Ratios of an arm to the baseline need no trend.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from .data_access import load_results, load_trend_params
from .scenarios import ANTHROPIC_SUBSTANTIAL

VARS = [("C", "Consumption"), ("I", "Investment"), ("G", "Government"),
        ("total_tax_revenue", "Tax revenue"), ("D", "Debt"), ("Y", "GDP")]

YEARS = [2026, 2027, 2028, 2029, 2030]

ARMS = ["anthropic_ramp", "obr_ramp"]

# Which trend each variable carries; anything not listed carries both.
TREND = {"w": "productivity", "L": "population", "r": None}


def trend(v: str, g_y: float, g_n: np.ndarray, n: int = 5) -> np.ndarray:
    """Factor that turns detrended variable ``v`` back into levels, t = 0..n-1."""
    t = np.arange(n)
    productivity = np.exp(g_y * t)
    population = np.concatenate([[1.0], np.cumprod(1 + np.asarray(g_n)[: n - 1])])
    kind = TREND.get(v, "both")
    if kind is None:
        return np.ones(n)
    if kind == "productivity":
        return productivity
    if kind == "population":
        return population
    return productivity * population


def growth_path(series, g_y: float, g_n: np.ndarray) -> np.ndarray:
    """Real growth in percent, year on year, of a variable carrying both trends."""
    Y = np.asarray(series)[:5] * trend("Y", g_y, g_n)
    return (Y[1:] / Y[:-1] - 1) * 100


def labour_share(arm: dict) -> np.ndarray:
    """w*L/Y. Flat over time because epsilon=1: at Cobb-Douglas the labour
    share is exactly 1-gamma, so this is purely the automation channel."""
    return (np.array(arm["w"]) * np.array(arm["L"]) / np.array(arm["Y"]))[:5]


def gap_table(arm_name: str, results=None, oguk_dir=None) -> pd.DataFrame:
    """Year-by-year % gap of every macro series, shocked arm vs baseline."""
    res = results if results is not None else load_results()
    rows = {}
    for v, label in VARS:
        a = np.array(res[arm_name][v])[:5]
        b = np.array(res["baseline"][v])[:5]
        rows[label] = (a / b - 1) * 100
    return pd.DataFrame(rows, index=YEARS).T


def growth_table(arm_name: str, results=None, oguk_dir=None) -> pd.DataFrame:
    res = results if results is not None else load_results()
    g_n, g_y = load_trend_params(oguk_dir, res)
    return pd.DataFrame(
        {"Baseline": growth_path(res["baseline"]["Y"], g_y, g_n),
         "With AI": growth_path(res[arm_name]["Y"], g_y, g_n)},
        index=YEARS[1:],
    ).T


def labour_share_table(arm_name: str, results=None) -> pd.DataFrame:
    res = results if results is not None else load_results()
    return pd.DataFrame(
        {"Baseline": labour_share(res["baseline"]),
         "With AI": labour_share(res[arm_name])},
        index=YEARS,
    ).T


def summary(arm_name: str, results=None, oguk_dir=None) -> dict:
    """The 2030 headline numbers for one arm."""
    res = results if results is not None else load_results()
    g_n, g_y = load_trend_params(oguk_dir, res)
    arm, base = res[arm_name], res["baseline"]
    gdp_gap = float(np.array(arm["Y"])[4] / np.array(base["Y"])[4] - 1) * 100
    return {
        "arm": arm_name,
        "gamma_shape": arm["gamma_shape"],
        "gdp_gap_2030_pct": gdp_gap,
        "growth_2030_pct": float(growth_path(arm["Y"], g_y, g_n)[-1]),
        "labour_share_fall_pp": (float(base["ss_labour_share"])
                                 - float(arm["ss_labour_share"])) * 100,
        "capital_gap_2030_pct": float(np.array(arm["K"])[4]
                                      / np.array(base["K"])[4] - 1) * 100,
    }


def print_report(arm_name: str, results=None, oguk_dir=None) -> dict:
    res = results if results is not None else load_results()
    arm = res[arm_name]
    s = summary(arm_name, res, oguk_dir)

    print(f"ARM: {arm_name}  (gamma {arm['gamma_shape']} -> "
          f"{arm['gamma_terminal']}, Z -> {arm['Z_terminal']:.6f})\n")
    print("AI vs BASELINE, % gap by year\n")
    print(f"{'variable':<16}" + "".join(f"{y:>9}" for y in YEARS))
    gaps = gap_table(arm_name, res, oguk_dir)
    for label in gaps.index:
        print(f"{label:<16}" + "".join(f"{x:>+8.2f}%" for x in gaps.loc[label]))

    print("\nGDP GROWTH\n")
    g = growth_table(arm_name, res, oguk_dir)
    for name in g.index:
        print(f"  {name:<10}" + "".join(f"{x:>8.2f}%" for x in g.loc[name]))

    print("\nLABOUR SHARE (w*L/Y)\n")
    print(f"{'path':<16}" + "".join(f"{y:>9}" for y in YEARS))
    sl = labour_share_table(arm_name, res)
    for name in sl.index:
        print(f"{name:<16}" + "".join(f"{x:>9.4f}" for x in sl.loc[name]))
    print("  flat over time because epsilon=1: at Cobb-Douglas the labour share is")
    print("  exactly 1-gamma, so this is purely the automation channel.")

    # Only the anthropic arms are calibrated to Table 3; the OBR arms target an
    # unchanged GDP level instead, so this comparison would be meaningless there.
    if arm_name.startswith("anthropic"):
        A = ANTHROPIC_SUBSTANTIAL
        print("\nAGAINST ANTHROPIC SUBSTANTIAL (Table 3, 2030)\n")
        print(f"{'outcome':<26}{'Anthropic':>11}{'OG-UK':>10}")
        print(f"{'labour-share fall (pp)':<26}{A['labour_share_fall_pp']:>10.1f}"
              f"{s['labour_share_fall_pp']:>10.1f}   matched by construction")
        print(f"{'measured TFP (%)':<26}{A['measured_tfp_pct']:>10.1f}"
              f"{A['measured_tfp_pct']:>10.1f}   input, matched")
        print(f"{'GDP vs no-AI (%)':<26}{A['gdp_above_no_ai_pct']:>10.1f}"
              f"{s['gdp_gap_2030_pct']:>10.1f}   we overshoot")
        print(f"{'GDP growth (%)':<26}{A['gdp_growth_pct']:>10.1f}"
              f"{s['growth_2030_pct']:>10.2f}   we undershoot")
        print(f"{'capital stock (%)':<26}{A['capital_stock_pct']:>10.1f}"
              f"{s['capital_gap_2030_pct']:>10.1f}")
        print(f"{'unemployment (%)':<26}{A['unemployment_pct']:>10.1f}{'—':>10}"
              "   not modelled")
        # True of the step arms only: that diagnosis is what motivated the ramp.
        if arm["gamma_shape"] == "step":
            print("\nBoth discrepancies have one cause: gamma steps once and is fully in force")
            print("from 2026, where Anthropic's automation builds to 2030. The level arrives")
            print("immediately, leaving no growth behind it. Needs time-varying gamma.")
    return s
