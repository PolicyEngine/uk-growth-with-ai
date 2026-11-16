"""Debt/GDP gaps with the interest rate on debt phased in at the OBR's speed.

OG-UK's government debt is one-period: the whole stock pays the current
``r_gov`` every year, so a rise in the interest rate reaches all debt at once.
UK debt reprices more slowly.  This script redoes the debt recursion on the
existing surprise-2028 solves with the rate *gap* (arm less no-shock restart)
passed through to the stock at the speed of the OBR's debt interest ready
reckoner.  Nothing is solved: GDP, the primary balance and the market rate
are taken from the solves as they are (first order, no feedback).

Recursion (OG-Core ``fiscal.D_G_path``; model units, ``growth`` = e^g_y (1 + g_n)):

    growth[t+1] D[t+1] = (1 + r_gov[t]) D[t] + primary deficit[t]

In difference form, so that the solve's own primary deficit is held exactly:

    D_cf[t+1] = D[t+1] + ((1 + r_cf[t]) D_cf[t] - (1 + r_gov[t]) D[t]) / growth[t+1]
    r_cf[t]   = r_ref[t] + sum_s phi[t - s + 1] (gap[s] - gap[s-1]),  s = 2028..t
    gap[s]    = r_gov[s] - r_ref[s]

``phi[k]`` is the share of a sustained rate rise that has reached the debt
stock in its k-th year.  ``phi = 1`` in every year reproduces the solve.

Source for phi: OBR, October 2026 Economic and fiscal outlook, detailed
forecast tables.
  * Debt interest ready reckoner, table 5.1 (GBP bn, net of the APF):
    https://obr.uk/download/october-2026-economic-and-fiscal-outlook-detailed-forecast-tables-debt-interest-ready-reckoner/
  * Aggregates, tables 6.13 (PSND, per cent of GDP) and 6.17 (central
    government gross debt, GBP bn):
    https://obr.uk/download/october-2026-economic-and-fiscal-outlook-detailed-forecast-tables-aggregates/
Both read on 13 November 2026.

Run:  python analysis/surprise/debt_repricing.py [--json]
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent / "output"
START, SHOCK, MID, END = 2026, 2028, 2031, 2036
R4_TOL_PP = 0.01          # uk_growth_with_ai.surprise.R4_TOL_PP
CLOSURES = ("zk0.1", "zk0")
SCENARIOS = (("uk_low", "UK low"), ("uk_central", "UK central"),
             ("uk_high", "UK high"), ("korinek", "Korinek et al."))
ARMS = (("tfp", "main"), ("zfixed", "technology unchanged"), ("r4", "stress test"))

# --- OBR, October 2026 EFO ------------------------------------------------------------
# Table 5.1, years 2026-27 .. 2031-32; every rise starts at the beginning of 2026-27.
RR_GILT = (1.1313, 3.7303, 6.4512, 8.6640, 10.5657, 12.6125)    # +1pp gilt rates
RR_SHORT = (6.5150, 7.1503, 6.6096, 6.1767, 5.5172, 5.2053)     # +1pp short rates
# Tables 6.17 and 6.13, end of 2025-26 (outturn) .. 2031-32.
CG_GROSS_DEBT_BN = (2996.06, 3172.4991, 3336.7799, 3489.3976, 3619.2944, 3735.8203,
                    3857.1338)
CG_GROSS_DEBT_PCT = (98.4223, 101.0028, 101.9149, 102.4897, 101.8414, 101.6155, 101.3471)
PSND_PCT = (93.1017, 95.5055, 96.6997, 97.2848, 96.6742, 95.8675, 95.6107)


def obr_passthrough() -> list[float]:
    """phi[k], k = 1..6: cost of +1pp on gilt and short rates together, over 1% of
    public sector net debt (mean of the year's opening and closing stock).  PSND is
    the stock the model's 95% of GDP is matched to."""
    psnd = [b * p / c for b, p, c in zip(CG_GROSS_DEBT_BN, PSND_PCT, CG_GROSS_DEBT_PCT)]
    return [(g + s) / (0.01 * 0.5 * (psnd[k] + psnd[k + 1]))
            for k, (g, s) in enumerate(zip(RR_GILT, RR_SHORT))]


def schedule(tail: str, n: int = END - SHOCK) -> list[float]:
    """phi for lags 1..n.  The OBR gives six years; the 2036 debt needs eight.
    ``extrapolated``: later years add the mean annual step of years 3 to 6, capped
    at 1.  ``flat``: later years stay at year six."""
    phi = obr_passthrough()
    step = (phi[5] - phi[2]) / 3 if tail == "extrapolated" else 0.0
    while len(phi) < n:
        phi.append(min(1.0, phi[-1] + step))
    return phi[:n]


def load(closure: str, label: str) -> dict | None:
    p = OUT / closure / f"{label}.json"
    return json.loads(p.read_text())["series"] if p.exists() else None


def gdp_gap(s: dict, ref: dict, year: int) -> float:
    i = year - START
    return (s["Y"][i] / ref["Y"][i] - 1) * 100


def pick(closure: str, scenario: str, arm: str, ref: dict) -> tuple[str, dict] | None:
    """The solve behind an arm.  The stress test is the R4 point with the smallest
    2031 GDP gap, within the tolerance (``surprise.accepted_r4``)."""
    if arm != "r4":
        label = f"{scenario}_share_shift_" + ("tfp_ramp" if arm == "tfp" else "ramp_zfixed")
        s = load(closure, label)
        return (label, s) if s else None
    labels = [f"{scenario}_share_shift_ramp_zfixed"] + sorted(
        p.name[:-5] for p in (OUT / closure).glob(f"{scenario}_share_shift_ramp_r4_*.json")
        if not p.name.endswith(".sanity.json"))
    pts = [(abs(gdp_gap(s, ref, MID)), lab, s) for lab in labels
           if (s := load(closure, lab)) is not None]
    pts = [p for p in pts if p[0] <= R4_TOL_PP]
    return min(pts)[1:] if pts else None


def growth_factors(ref: dict) -> list[float]:
    """growth[t+1], from the no-shock restart's own budget items."""
    n = len(ref["D"])
    pd = [ref["G"][t] + ref["I_g"][t] + ref["TR"][t] + ref["agg_pension_outlays"][t]
          - ref["total_tax_revenue"][t] for t in range(n)]
    return [((1 + ref["r_gov"][t]) * ref["D"][t] + pd[t]) / ref["D"][t + 1]
            for t in range(n - 1)]


def debt_path(s: dict, ref: dict, phi: list[float] | None = None,
              scale: float | None = None) -> list[float]:
    """Debt with the rate gap phased in by ``phi`` (or multiplied by ``scale``)."""
    n, k0 = len(s["D"]), SHOCK - START
    gr = growth_factors(ref)
    gap = [s["r_gov"][t] - ref["r_gov"][t] for t in range(n)]
    D = list(s["D"][:k0 + 1])                     # 2028 debt is predetermined
    for t in range(k0, n - 1):
        if scale is not None:
            eff = scale * gap[t]
        else:
            eff = sum(phi[t - j] * (gap[j] - (gap[j - 1] if j > k0 else 0.0))
                      for j in range(k0, t + 1))
        D.append(s["D"][t + 1] + ((1 + ref["r_gov"][t] + eff) * D[t]
                                  - (1 + s["r_gov"][t]) * s["D"][t]) / gr[t])
    return D


def debt_gap_pp(D: list[float], s: dict, ref: dict, year: int) -> float:
    i = year - START
    return (D[i] / s["Y"][i] - ref["D"][i] / ref["Y"][i]) * 100


def break_even(s: dict, ref: dict) -> float | None:
    """Constant share of the model's rate gap at which the 2036 debt gap is zero."""
    f = lambda x: debt_gap_pp(debt_path(s, ref, scale=x), s, ref, END)
    lo, hi = 0.0, 1.0
    if f(lo) * f(hi) > 0:
        return None
    for _ in range(60):
        mid = 0.5 * (lo + hi)
        lo, hi = (mid, hi) if f(lo) * f(mid) > 0 else (lo, mid)
    return 0.5 * (lo + hi)


def compute() -> dict:
    rows = []
    for closure in CLOSURES:
        ref = load(closure, "continuation")
        for sid, sname in SCENARIOS:
            for arm, aname in ARMS:
                row = {"closure": closure, "scenario": sname, "arm": aname}
                got = pick(closure, sid, arm, ref)
                if got is None:
                    rows.append({**row, "status": "not solved"})
                    continue
                label, s = got
                full = debt_path(s, ref, scale=1.0)
                assert max(abs(a / b - 1) for a, b in zip(full, s["D"])) < 1e-12, label
                row.update(status="ok", label=label,
                           break_even_share=break_even(s, ref),
                           rate_gap_bp={y: (s["r_gov"][y - START] - ref["r_gov"][y - START]) * 1e4
                                        for y in (MID, END)})
                for y in (MID, END):
                    row[f"model_{y}"] = debt_gap_pp(s["D"], s, ref, y)
                    row[f"no_interest_{y}"] = debt_gap_pp(debt_path(s, ref, scale=0.0), s, ref, y)
                    for tail in ("extrapolated", "flat"):
                        row[f"obr_{tail}_{y}"] = debt_gap_pp(
                            debt_path(s, ref, phi=schedule(tail)), s, ref, y)
                rows.append(row)
    return {"passthrough": {t: schedule(t) for t in ("extrapolated", "flat")}, "rows": rows}


def sign(a: float, b: float) -> str:
    return "yes" if a * b < 0 else "no"


def markdown(res: dict) -> str:
    f = lambda x: f"{x:+.2f}"
    out = ["Pass-through of a rate rise to the debt stock, by year since the rise (%):", "",
           "| tail | " + " | ".join(str(k) for k in range(1, END - SHOCK + 1)) + " |",
           "|---|" + "---|" * (END - SHOCK)]
    for t, phi in res["passthrough"].items():
        out.append(f"| {t} | " + " | ".join(f"{100 * x:.0f}" for x in phi) + " |")
    out += ["", "Debt/GDP gap against the no-shock restart, percentage points:", "",
            "| closure | scenario | arm | 2031 model | 2031 OBR speed | 2031 sign changes "
            "| 2036 model | 2036 OBR speed | 2036 OBR speed, flat tail | 2036 sign changes "
            "| 2036 no interest effect | break-even share |",
            "|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for r in res["rows"]:
        head = f"| {r['closure']} | {r['scenario']} | {r['arm']} |"
        if r["status"] != "ok":
            out.append(head + " not solved |" + " |" * 8)
            continue
        s36 = {sign(r["model_2036"], r[f"obr_{t}_2036"]) for t in ("extrapolated", "flat")}
        be = r["break_even_share"]
        out.append(
            f"{head} {f(r['model_2031'])} | {f(r['obr_extrapolated_2031'])} | "
            f"{sign(r['model_2031'], r['obr_extrapolated_2031'])} | {f(r['model_2036'])} | "
            f"{f(r['obr_extrapolated_2036'])} | {f(r['obr_flat_2036'])} | "
            f"{s36.pop() if len(s36) == 1 else 'depends on tail'} | "
            f"{f(r['no_interest_2036'])} | {'none' if be is None else f'{100 * be:.0f}%'} |")
    return "\n".join(out)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--json", action="store_true", help="print the full results as JSON")
    a = ap.parse_args()
    res = compute()
    print(json.dumps(res, indent=1) if a.json else markdown(res))
