"""Tables for docs/rerun_r1_r4.md from the rerun outputs (R1-R4, #27).

    python3 analysis/rerun/summarise.py > /tmp/tables.md

"Old" is the #30 solve of the same arm at the same closure (stock pre-TP
demographics, no debt calibration, fixed-input Z for share_shift); at
zeta_K = 0.1 those equal the committed data/scenarios.json bit for bit.
"New" is the assembled results file: data/scenarios.json (zeta_K = 0.1, central)
and data/scenarios_zk0.json (zeta_K = 0).
Prose lives in the doc itself; this prints the numbers.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))

from uk_growth_with_ai import rerun  # noqa: E402

OUT = REPO / "analysis" / "rerun" / "output"
PRIOR = REPO / "analysis" / "closure" / "output"
DATA = REPO / "uk_growth_with_ai" / "data"
YEARS = rerun.YEARS
ARMS = ("share_shift_tfp_ramp", "share_shift_ramp")


def series(rec):
    return rec["series"]


def gaps(a, b, i=4):
    sa, sb = series(a), series(b)
    g = lambda v: (sa[v][i] / sb[v][i] - 1) * 100
    kf = sa["K_f"][i] - sb["K_f"][i]
    dk = sa["K"][i] - sb["K"][i]
    gni = lambda s: s["Y"][i] - s["r_p"][i] * (s["K_f"][i] + s["D_f"][i])
    return {"GDP": g("Y"), "GNI": (gni(sa) / gni(sb) - 1) * 100, "K": g("K"), "L": g("L"),
            "w": g("w"), "C": g("C"), "I": g("I"), "dr": (sa["r"][i] - sb["r"][i]) * 1e4,
            "fshare": kf / dk * 100 if abs(dk) > 1e-12 else float("nan"),
            "dy": (sa["D"][i] / sa["Y"][i] - sb["D"][i] / sb["Y"][i]) * 100}


def row(label, g):
    return (f"| {label} | {g['GDP']:+.2f}% | {g['GNI']:+.2f}% | {g['K']:+.2f}% | {g['L']:+.2f}% | "
            f"{g['w']:+.2f}% | {g['C']:+.2f}% | {g['I']:+.1f}% | {g['dr']:+.0f} | "
            f"{g['fshare']:+.1f}% | {g['dy']:+.2f} |")


HEAD = ("| run | GDP | GNI | K | L | wage | C | I | Δr (bp) | foreign share of extra K | "
        "debt/GDP (pp) |\n|---|---|---|---|---|---|---|---|---|---|---|")


def main():
    w = print
    for c in rerun.CLOSURES:
        f = DATA / ("scenarios.json" if c == "zk0.1" else f"scenarios_{c}.json")
        if not f.exists():
            w(f"\n(no assembled results for {c})")
            continue
        new = json.loads(f.read_text())
        done = rerun.load(OUT, c)
        ob = json.loads((PRIOR / f"{c}_baseline.json").read_text())
        nb = new["baseline"]
        w(f"\n### zeta_K = {rerun.CLOSURES[c]}\n")
        w("**Baseline, old (#30, stock demographics, no debt calibration) against new**\n")
        w("| | " + " | ".join(map(str, YEARS)) + " |\n|---|" + "---|" * 5)
        dy = lambda s: [s["D"][i] / s["Y"][i] * 100 for i in range(5)]
        w("| debt/GDP old | " + " | ".join(f"{x:.2f}" for x in dy(series(ob))) + " |")
        w("| debt/GDP new | " + " | ".join(f"{x:.2f}" for x in dy(nb)) + " |")
        w("| debt/GDP OBR | " + " | ".join(f"{x:.2f}" for x in rerun._obr("D")) + " |")
        w("| primary balance new, % GDP | " + " | ".join(
            f"{x:+.2f}" for x in rerun.primary_balance(nb)) + " |")
        rco = ob["convergence"]["rc_rel_Y_signed"]
        rcn = nb["diagnostics"]["rc_rel_Y_signed"]
        w("| RC/GDP old, % | " + " | ".join(f"{x * 100:+.4f}" for x in rco[:5]) + " |")
        w("| RC/GDP new, % | " + " | ".join(f"{x * 100:+.4f}" for x in rcn[:5]) + " |")
        w("| r old, % | " + " | ".join(f"{x * 100:.2f}" for x in series(ob)["r"][:5]) + " |")
        w("| r new, % | " + " | ".join(f"{x * 100:.2f}" for x in nb["r"]) + " |")
        rep = rerun.baseline_report(done[nb["label"]])
        w("| GDP growth new, % | – | " + " | ".join(f"{x:.2f}" for x in rep["growth_pct_2027_30"]) + " |")
        w(f"\nalpha_G: steady state {nb['alpha_G_ss']:.4f}, window {nb['alpha_G_used']:.4f} "
          f"(shift {nb['alpha_G_shift']:+.4f}). Passes: " + "; ".join(
              f"{p['label']} {p['alpha_G_shift']:+.5f} → {p['debt_gdp_2030']:.3f}%"
              for p in new["assumptions"]["debt_calibration"]["passes"]))
        w(f"\n**2030 gaps against the closure's own baseline**\n\n{HEAD}")
        for arm in ARMS:
            old = json.loads((PRIOR / f"{c}_{arm}.json").read_text())
            w(row(f"`{arm}` old (#30)", gaps(old, ob)))
            if arm == "share_shift_ramp":
                w(row("`share_shift_ramp` new, fixed-input Z", gaps(done["share_shift_ramp_zfixed"], nb)))
                w(row("`share_shift_ramp` new, R4 Z", gaps(new[arm], nb)))
            else:
                w(row(f"`{arm}` new", gaps(new[arm], nb)))
        w("\nR4 iterations: " + "; ".join(
            f"{x['label']} Z {x['Z']:.6f} → 2030 GDP gap {x['gdp_gap_pct']:+.4f}%"
            for x in new["assumptions"]["r4_iterations"]))
        w(f"\nZ: share_shift_tfp {new['assumptions']['Z_share_shift_tfp']:.6f}; share_shift "
          f"fixed-input {new['assumptions']['Z_share_shift_fixed_input']:.6f}, R4 "
          f"{new['assumptions']['Z_share_shift']:.6f}")
        for arm in ARMS:
            w(f"\n**`{arm}` new, year by year**\n\n| year | GDP | GNI | K | L | wage | C | I | Δr (bp) "
              "| foreign share of extra K | debt/GDP (pp) |\n|---|---|---|---|---|---|---|---|---|---|---|")
            for i, y in enumerate(YEARS):
                g = gaps(new[arm], nb, i)
                w(row(str(y), g).replace(f"| {y} |", f"| {y} |", 1))
            s = series(new[arm])
            w("\n2031–35 GDP gap: " + ", ".join(
                f"{(s['Y'][i] / series(nb)['Y'][i] - 1) * 100:+.2f}%" for i in range(5, 10)))


if __name__ == "__main__":
    main()
