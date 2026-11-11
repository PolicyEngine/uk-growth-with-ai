"""Two exports the results-sanity audit asked for on #27 (no extra solve).

1. The population law-of-motion residual for each period from the pre-period
   through 2036, with OG-UK's demographics as passed to the solves. This tests
   whether the 2028 residual comes from the data-to-projection splice:
   OG-UK's demographics use data for 2026-2028 (``final_data_year = 2028``).
   The transition checked is OG-Core's stationarised one,

       omega[k+1, s+1] (1 + g[k]) = (1 - rho[k, s]) omega[k, s]
                                    + imm[k, s+1] omega[k, s+1],

   where k = 0 is the pre-period (``*_preTP``) and k = 1 is 2026. At k = 0 this
   is the same relation the solves check: with UK pre-TP inputs it holds to
   1e-16. The "stock" row puts OG-Core's shipped pre-TP defaults at k = 0,
   which is what every solve except the pretp one actually used.
2. Steady-state fiscal aggregates (G, TR, tax revenue, outlays, primary
   balance) for each closure baseline, plus ``g_n_ss``, from the baseline
   SS pickles the solves wrote.

The demographics are fetched again here and are checked by hash against the
inputs the solves recorded, so the residuals describe exactly what was solved.

    WORK=<the driver's scratch dir> <og-uk venv python> analysis/closure/extra_exports.py
"""

from __future__ import annotations

import hashlib
import json
import os
import pickle
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
OUT = HERE / "output"
WORK = Path(os.environ["WORK"])
NPER = 11


def _h(a):
    return hashlib.sha256(np.ascontiguousarray(np.asarray(a, dtype=float)).tobytes()
                          ).hexdigest()[:16]


def main():
    os.chdir(WORK)   # empty un_api_token.txt lives here
    from ogcore import demographics
    from ogcore.parameters import Specifications
    import oguk.api  # noqa: F401  (same import path as the solves)

    ref = json.loads((OUT / "zk0.1_baseline.json").read_text())
    defaults = json.load(open(Path(oguk.api.__file__).parent / "oguk_default_parameters.json"))
    S, T = defaults["S"], defaults["T"]
    d = demographics.get_pop_objs(E=20, S=S, T=T, country_id="826",
                                  initial_data_year=2026, final_data_year=2028,
                                  GraphDiag=False)
    got = {k: _h(d[k]) for k in ("omega", "omega_SS", "omega_S_preTP", "g_n", "rho", "imm_rates")}
    match = got == ref["demographics"]["hash"]
    stock = Specifications()   # OG-Core shipped defaults, which OG-UK leaves in place
    rows = {}
    for lab, g0, rho0, imm0 in (
            ("uk_consistent_preTP", d["g_n_preTP"], d["rho_preTP"], d["imm_rates_preTP"]),
            ("stock_preTP", stock.g_n_preTP, stock.rho_preTP, stock.imm_rates_preTP)):
        om = np.vstack([d["omega_S_preTP"][None, :], d["omega"]])
        g = np.concatenate([[g0], d["g_n"]])
        rho = np.vstack([np.asarray(rho0).reshape(1, -1), d["rho"]])
        imm = np.vstack([np.asarray(imm0).reshape(1, -1), d["imm_rates"]])
        per = []
        for k in range(NPER):
            lhs = om[k + 1, 1:] * (1 + g[k])
            rhs = (1 - rho[k, :-1]) * om[k, :-1] + imm[k, 1:] * om[k, 1:]
            rel = (lhs - rhs) / lhs
            per.append({"transition": f"{'pre' if k == 0 else 2025 + k}->{2026 + k}",
                        "max_abs_rel": float(np.abs(rel).max()),
                        "min_rel": float(rel.min()), "max_rel": float(rel.max())})
        rows[lab] = per

    fiscal = {}
    for f in sorted(OUT.glob("*baseline.json")):
        r = json.loads(f.read_text())
        pk = WORK / f.stem / "SS" / "SS_vars.pkl"
        if not pk.exists():
            continue
        ss = pickle.load(open(pk, "rb"))
        g = {k: float(np.asarray(ss[k]).sum()) for k in
             ("Y", "G", "TR", "total_tax_revenue", "total_government_outlays",
              "total_primary_government_outlays", "agg_pension_outlays", "I_g",
              "debt_service", "D", "UBI")}
        Y = g["Y"]
        fiscal[f.stem] = {
            "ss_levels": g,
            "ss_share_of_Y": {k: v / Y for k, v in g.items() if k != "Y"},
            "ss_primary_balance_share_Y":
                (g["total_tax_revenue"] - g["total_primary_government_outlays"]) / Y,
            "g_n_ss": r["demographics"]["g_n_ss"],
            "tpi_2026_2030_share_of_Y": {
                k: (np.asarray(r["series"][k][:5]) / np.asarray(r["series"]["Y"][:5])).tolist()
                for k in ("G", "TR", "total_tax_revenue") if k in r["series"]},
        }
    res = {"demographics_hash_matches_solves": match, "law_of_motion": rows,
           "fiscal_baselines": fiscal}
    (OUT / "extra_exports.json").write_text(json.dumps(res, indent=1))
    print("hash match:", match)
    for lab, per in rows.items():
        print(lab, [f"{p['transition']}:{p['max_abs_rel']:.2e}" for p in per])
    for k, v in fiscal.items():
        print(k, "SS primary balance/Y", round(v["ss_primary_balance_share_Y"], 4),
              "g_n_ss", v["g_n_ss"])


if __name__ == "__main__":
    main()
