"""Write dashboard/src/data/aiStudy2425.json: the provisional results of the
PolicyEngine-UK microsimulation of AI job displacement (PolicyEngine/uk-ai-study
PR #18, branch data/microcosm-2024-25, Microcosm UK 2024-25), for part 3 of the
story.

Reads only analysis/story/ai_study/ (verbatim copies of committed result files
at their repo paths, plus SOURCE.json with the commit they came from). No
network. Every value is read or derived from those files with the formulas the
study's own emitter (analysis/emit_tex_values.py and its helpers
post_takeup_runs.py, post_wage_cut.py, revision_accounting.py) uses; nothing is
typed in. The builder asserts its rounded outputs against the paper's printed
values (paper/values_generated.tex at the same commit), so a silent change in
the copied files fails loudly.

    python dashboard/scripts/build_ai_study_data.py
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "analysis" / "story" / "ai_study"
DEST = ROOT / "dashboard" / "src" / "data" / "aiStudy2425.json"


def jload(rel: str) -> dict:
    return json.loads((SRC / rel).read_text())


def rows(rel: str) -> list[dict]:
    with (SRC / rel).open(newline="") as f:
        return list(csv.DictReader(f))


def mean(xs) -> float:
    xs = [float(x) for x in xs]
    return sum(xs) / len(xs)


def check(name: str, value: float, expected: float, ndp: int) -> None:
    """The paper's printed value (paper/values_generated.tex) at this commit."""
    got = round(value, ndp)
    if abs(got - expected) > 1e-9:
        raise SystemExit(f"{name}: computed {value!r} rounds to {got}, paper prints {expected}")


def r(x: float, ndp: int) -> float:
    return round(float(x), ndp)


# --- files -------------------------------------------------------------------
F_CMC = "results/robustness/central_monte_carlo.json"
F_LOW = "results/low.json"
F_HIGH = "results/high.json"
F_TK_JSON = "results/takeup/takeup_runs.json"
F_TK = "results/takeup/takeup_draws.csv"
F_DCD = "results/robustness/dividend_coverage_draws.csv"
F_WC = "results/wage_cut/wage_cut_draws.csv"
F_OBR = "results/next_runs/obr_benchmark.json"
F_OBRD = "results/next_runs/obr_benchmark_draws.csv"
F_INC = "results/robustness/incidence_monte_carlo.json"
F_WM = "results/wage_margin_central.json"
F_CG = "results/tax_composition/composition_grid.csv"
F_DEC = "results/appendix/decomposition_ci.csv"
F_DECR = "results/appendix/decile_ranking_sensitivity.csv"


def main() -> None:
    source = jload("SOURCE.json")

    # --- headline ------------------------------------------------------------
    cmc = jload(F_CMC)
    n_central = int(jload(F_INC)["_metadata"]["draws"])  # same 50 exposure draws
    low, high = jload(F_LOW), jload(F_HIGH)

    def preset(d: dict) -> dict:
        return {"cost_bn": d["exchequer_cost"] / 1e9,
                "pov_pp": d["poverty_rate_change_bhc"] * 100,
                "gini_pp": (d["gini_shocked"] - d["gini_baseline"]) * 100}
    lo, hi = preset(low), preset(high)

    check("genCentralMcCostMeanBn", cmc["exchequer_cost_bn"]["mean"], 7.4, 1)
    check("genCentralMcCostSdBn", cmc["exchequer_cost_bn"]["sd"], 1.8, 1)
    check("genCentralMcPovBhcMeanPp", cmc["poverty_change_bhc_pp"]["mean"], 2.34, 2)
    check("genCentralMcGiniMeanPp", cmc["gini_change_pp"]["mean"], 1.76, 2)
    check("genLowCostBn", lo["cost_bn"], -10.4, 1)
    check("genHighCostBn", hi["cost_bn"], 43.4, 1)

    cost_note = ("Fall in the government balance (income tax, NI incl. employer NI, benefits); "
                 "no corporation tax. Negative = net gain to the Exchequer.")
    headline = {
        "central_cost": {
            "label": "Exchequer cost, central scenario", "value": r(cmc["exchequer_cost_bn"]["mean"], 2),
            "unit": "£bn", "file": F_CMC, "key": "exchequer_cost_bn.mean",
            "draws": n_central, "sd": r(cmc["exchequer_cost_bn"]["sd"], 2),
            "se": r(cmc["exchequer_cost_bn"]["mcse"], 2),
            "range": [r(cmc["exchequer_cost_bn"]["min"], 2), r(cmc["exchequer_cost_bn"]["max"], 2)],
            "note": f"Mean of {n_central} assignment draws; SD is across draws. " + cost_note},
        "central_poverty": {
            "label": "Change in absolute poverty before housing costs, central scenario",
            "value": r(cmc["poverty_change_bhc_pp"]["mean"], 2), "unit": "pp", "file": F_CMC,
            "key": "poverty_change_bhc_pp.mean", "draws": n_central,
            "sd": r(cmc["poverty_change_bhc_pp"]["sd"], 2),
            "note": ("Absolute BHC line frozen at its baseline value; persons. The paper reads it as an upper "
                     "bound for exposure-proportional incidence (every displaced worker loses a full year).")},
        "central_poverty_ahc": {
            "label": "Change in absolute poverty after housing costs, central scenario",
            "value": r(cmc["poverty_change_ahc_pp"]["mean"], 2), "unit": "pp", "file": F_CMC,
            "key": "poverty_change_ahc_pp.mean", "draws": n_central, "note": None},
        "central_poverty_relative": {
            "label": "Change in relative poverty before housing costs, central scenario",
            "value": r(cmc["relative_poverty_change_bhc_pp"]["mean"], 2), "unit": "pp", "file": F_CMC,
            "key": "relative_poverty_change_bhc_pp.mean", "draws": n_central,
            "note": "Line at 60% of the shocked median."},
        "central_gini": {
            "label": "Change in the Gini coefficient, central scenario",
            "value": r(cmc["gini_change_pp"]["mean"], 2), "unit": "pp", "file": F_CMC,
            "key": "gini_change_pp.mean", "draws": n_central, "sd": r(cmc["gini_change_pp"]["sd"], 2),
            "note": f"Points of the Gini (x100); baseline Gini {low['gini_baseline']:.3f} ({F_LOW} gini_baseline)."},
        "central_displaced": {
            "label": "Employees displaced, central scenario", "value": r(cmc["displaced_weighted_m"]["mean"], 2),
            "unit": "m", "file": F_CMC, "key": "displaced_weighted_m.mean", "draws": n_central,
            "note": "Weighted count; 7% prescribed displacement rate."},
        "low_cost": {
            "label": "Exchequer cost, low scenario", "value": r(lo["cost_bn"], 1), "unit": "£bn",
            "file": F_LOW, "key": "exchequer_cost / 1e9", "draws": 1,
            "note": ("Seed 0 only. 1% displacement, no survivor-wage gain, full capital uplift; negative = "
                     "net gain to the Exchequer.")},
        "low_poverty": {
            "label": "Change in absolute poverty before housing costs, low scenario", "value": r(lo["pov_pp"], 2),
            "unit": "pp", "file": F_LOW, "key": "poverty_rate_change_bhc * 100", "draws": 1, "note": "Seed 0 only."},
        "low_gini": {
            "label": "Change in the Gini coefficient, low scenario", "value": r(lo["gini_pp"], 2), "unit": "pp",
            "file": F_LOW, "key": "(gini_shocked - gini_baseline) * 100", "draws": 1, "note": "Seed 0 only."},
        "high_cost": {
            "label": "Exchequer cost, high scenario", "value": r(hi["cost_bn"], 1), "unit": "£bn",
            "file": F_HIGH, "key": "exchequer_cost / 1e9", "draws": 1,
            "note": "Seed 0 only. 13% displacement, 2.6% survivor-wage gain, full capital uplift."},
        "high_poverty": {
            "label": "Change in absolute poverty before housing costs, high scenario", "value": r(hi["pov_pp"], 2),
            "unit": "pp", "file": F_HIGH, "key": "poverty_rate_change_bhc * 100", "draws": 1, "note": "Seed 0 only."},
        "high_gini": {
            "label": "Change in the Gini coefficient, high scenario", "value": r(hi["gini_pp"], 2), "unit": "pp",
            "file": F_HIGH, "key": "(gini_shocked - gini_baseline) * 100", "draws": 1, "note": "Seed 0 only."},
    }

    # --- ladder ----------------------------------------------------------------
    tk = rows(F_TK)

    def tk_rows(scen, var):
        out = [x for x in tk if x["scenario"] == scen and x["variant"] == var]
        return sorted(out, key=lambda x: int(x["seed"]))

    def tk_mean(scen, var, col):
        return mean(x[col] for x in tk_rows(scen, var))

    tkj = jload(F_TK_JSON)["results"]
    for scen in ("central", "obr"):
        for var in ("takeup1", "jsa"):
            for col in ("exchequer_cost_bn", "poverty_change_bhc_pp", "gini_change_pp", "uc_change_bn"):
                a, b = tk_mean(scen, var, col), tkj[scen][var][col]["mean"]
                assert abs(a - b) < 1e-9, (scen, var, col, a, b)

    dcd = rows(F_DCD)
    c20 = sorted([x for x in dcd if x["run"] == "central"], key=lambda x: int(x["seed"]))
    assert [int(x["seed"]) for x in c20] == list(range(20))
    wc = rows(F_WC)
    t3 = [x for x in wc if x["variant"] == "table3"]
    assert sorted(int(x["seed"]) for x in t3) == list(range(20))
    obr = jload(F_OBR)["summary"]

    check("central seeds 0-19 cost (PR table 7.2)", mean(x["exchequer_cost_bn"] for x in c20), 7.2, 1)
    check("genTkCentralTakeupCostMeanBn", tk_mean("central", "takeup1", "exchequer_cost_bn"), 9.9, 1)
    check("genTkCentralJsaCostMeanBn", tk_mean("central", "jsa", "exchequer_cost_bn"), 12.6, 1)
    check("genTkCentralTakeupPovBhcMeanPp", tk_mean("central", "takeup1", "poverty_change_bhc_pp"), 2.10, 2)
    check("genTkCentralJsaPovBhcMeanPp", tk_mean("central", "jsa", "poverty_change_bhc_pp"), 1.92, 2)
    check("genTkCentralTakeupGiniMeanPp", tk_mean("central", "takeup1", "gini_change_pp"), 1.56, 2)
    check("genTkCentralJsaGiniMeanPp", tk_mean("central", "jsa", "gini_change_pp"), 1.46, 2)
    check("genWcWageCostMeanBn", mean(x["exchequer_cost_bn"] for x in t3), 18.9, 1)
    check("genWcWagePovBhcMeanPp", mean(x["poverty_change_bhc_pp"] for x in t3), 0.20, 2)
    check("genObrCostMeanBn", obr["exchequer_cost_bn"]["mean"], 9.7, 1)
    check("genTkObrTakeupCostMeanBn", tk_mean("obr", "takeup1", "exchequer_cost_bn"), 10.4, 1)
    check("genTkObrJsaCostMeanBn", tk_mean("obr", "jsa", "exchequer_cost_bn"), 11.1, 1)

    def rung(id_, label, cost, pov, gini, draws, file, key, note=None):
        return {"id": id_, "label": label, "cost_bn": r(cost, 2), "poverty_pp": None if pov is None else r(pov, 2),
                "gini_pp": None if gini is None else r(gini, 2), "draws": draws, "file": file, "key": key,
                "note": note}

    c = "mean over seeds of column {} (exchequer_cost_bn, poverty_change_bhc_pp, gini_change_pp)"
    ladder = [
        rung("central_50", "Central scenario", cmc["exchequer_cost_bn"]["mean"],
             cmc["poverty_change_bhc_pp"]["mean"], cmc["gini_change_pp"]["mean"], n_central, F_CMC,
             "exchequer_cost_bn.mean, poverty_change_bhc_pp.mean, gini_change_pp.mean",
             "Headline 50-draw mean."),
        rung("central_20", "Central scenario, seeds 0-19", mean(x["exchequer_cost_bn"] for x in c20),
             mean(x["poverty_change_bhc_pp"] for x in c20), mean(x["gini_change_pp"] for x in c20), len(c20), F_DCD,
             "rows run=central, seeds 0-19; " + c.format("means"),
             "The base the take-up, JSA and wage-cut rungs are paired with (same seeds, same displaced workers)."),
        rung("takeup", "UC take-up = 1 for the displaced", tk_mean("central", "takeup1", "exchequer_cost_bn"),
             tk_mean("central", "takeup1", "poverty_change_bhc_pp"), tk_mean("central", "takeup1", "gini_change_pp"),
             len(tk_rows("central", "takeup1")), F_TK, "rows scenario=central, variant=takeup1; " + c.format("means"),
             "Every benefit unit with a displaced worker claims UC (paired baseline and shock)."),
        rung("takeup_jsa", "Plus 26 weeks of new-style JSA", tk_mean("central", "jsa", "exchequer_cost_bn"),
             tk_mean("central", "jsa", "poverty_change_bhc_pp"), tk_mean("central", "jsa", "gini_change_pp"),
             len(tk_rows("central", "jsa")), F_TK, "rows scenario=central, variant=jsa; " + c.format("means"),
             "Take-up = 1 plus contributory JSA for displaced workers aged 18-65 who meet the contribution condition."),
        rung("wage_cuts", "Wage cuts with the same gross earnings loss", mean(x["exchequer_cost_bn"] for x in t3),
             mean(x["poverty_change_bhc_pp"] for x in t3), mean(x["gini_change_pp"] for x in t3), len(t3), F_WC,
             "rows variant=table3; " + c.format("means"),
             "Occupation-level (C-AIOE-graded) wage cuts removing the same seed's displaced wage bill; survivor-wage "
             "uplift and capital shock on, as in the central rows."),
        rung("obr", "OBR-sized displacement (different shock)", obr["exchequer_cost_bn"]["mean"],
             obr["poverty_change_bhc_pp"]["mean"], obr["gini_change_pp"]["mean"], int(obr["exchequer_cost_bn"]["n"]),
             F_OBR, "summary.exchequer_cost_bn.mean, summary.poverty_change_bhc_pp.mean, summary.gini_change_pp.mean",
             f"Not a step on the central ladder: {jload(F_OBR)['displacement_rate'] * 100:.2f}% displacement, no "
             "survivor-wage or capital change, sized to the OBR March 2026 scenario."),
        rung("obr_takeup", "OBR-sized, UC take-up = 1", tk_mean("obr", "takeup1", "exchequer_cost_bn"),
             tk_mean("obr", "takeup1", "poverty_change_bhc_pp"), tk_mean("obr", "takeup1", "gini_change_pp"),
             len(tk_rows("obr", "takeup1")), F_TK, "rows scenario=obr, variant=takeup1; " + c.format("means"), None),
        rung("obr_takeup_jsa", "OBR-sized, plus new-style JSA", tk_mean("obr", "jsa", "exchequer_cost_bn"),
             tk_mean("obr", "jsa", "poverty_change_bhc_pp"), tk_mean("obr", "jsa", "gini_change_pp"),
             len(tk_rows("obr", "jsa")), F_TK, "rows scenario=obr, variant=jsa; " + c.format("means"), None),
    ]

    # --- displacement rules ----------------------------------------------------
    inc = jload(F_INC)
    check("genIncUniformCostMeanBn", inc["uniform"]["exchequer_cost_bn"]["mean"], 2.2, 1)
    check("genIncCompressionCostMeanBn", inc["compression"]["exchequer_cost_bn"]["mean"], 11.2, 1)
    check("genIncKleinCostMeanBn", inc["klein_top_loaded"]["exchequer_cost_bn"]["mean"], 26.9, 1)
    rule_labels = [("uniform", "Uniform"), ("junior", "Junior-tilted"), ("exposure", "Exposure-proportional (central)"),
                   ("compression", "Expertise compression"), ("klein_top_loaded", "Top-loaded stress test")]
    rules = [{"id": k, "label": lab, "cost_bn": r(inc[k]["exchequer_cost_bn"]["mean"], 2),
              "cost_sd_bn": r(inc[k]["exchequer_cost_bn"]["sd"], 2),
              "poverty_pp": r(inc[k]["poverty_change_bhc_pp"]["mean"], 2),
              "gini_pp": r(inc[k]["gini_change_pp"]["mean"], 2),
              "draws": int(inc["_metadata"]["draws"]), "file": F_INC, "key": f"{k}.exchequer_cost_bn.mean"}
             for k, lab in rule_labels]

    # --- cost per pound of earnings lost ----------------------------------------
    wm = jload(F_WM)
    bill = wm["gross_cut_realised"] / 1e9  # seed-0 displaced wage bill
    r7 = next(x for x in rows(F_CG) if x["unemployment_pct"] == "7")
    job_gov = -float(r7["microsim_gov_balance_change_bn"]) / bill
    job_hh = -float(r7["microsim_net_revenue_change_bn"]) / bill
    d0 = {v: tk_rows("disp_only", v)[0] for v in ("takeup1", "jsa")}
    for v in d0:
        assert abs(float(d0[v]["wage_bill_lost_bn"]) - bill) / bill < 1e-6
    pp = {v: (float(d0[v]["exchequer_cost_bn"]) / bill, -float(d0[v]["narrow_cash_change_bn"]) / bill) for v in d0}
    co = [x for x in wc if x["variant"] == "cut_only"]
    gross = mean(x["gross_cut_bn"] for x in co)
    cut_gov = mean(x["exchequer_cost_bn"] for x in co) / gross
    cut_hh = mean(x["household_basis_cost_bn"] for x in co) / gross
    for name, val, exp in [("genAbsJobGovPct", job_gov, 42), ("genAbsJobHhPct", job_hh, 29),
                           ("genAbsJobGovTakeupPct", pp["takeup1"][0], 45), ("genAbsJobHhTakeupPct", pp["takeup1"][1], 31),
                           ("genAbsJobGovJsaPct", pp["jsa"][0], 47), ("genAbsJobHhJsaPct", pp["jsa"][1], 34),
                           ("genAbsCutGovPct", cut_gov, 55), ("genAbsCutHhPct", cut_hh, 40)]:
        check(name, 100 * val, exp, 0)
    per_pound = [
        {"id": "job_loss", "label": "Job loss", "government_p": r(100 * job_gov, 1), "household_p": r(100 * job_hh, 1),
         "draws": 1, "file": F_CG,
         "key": ("row unemployment_pct=7: -microsim_gov_balance_change_bn and -microsim_net_revenue_change_bn, over "
                 f"{F_WM} gross_cut_realised/1e9")},
        {"id": "job_loss_takeup", "label": "Job loss, UC take-up = 1", "government_p": r(100 * pp["takeup1"][0], 1),
         "household_p": r(100 * pp["takeup1"][1], 1), "draws": 1, "file": F_TK,
         "key": "row scenario=disp_only, variant=takeup1: exchequer_cost_bn and -narrow_cash_change_bn, over wage_bill_lost_bn"},
        {"id": "job_loss_takeup_jsa", "label": "Job loss, UC take-up = 1 and new-style JSA",
         "government_p": r(100 * pp["jsa"][0], 1), "household_p": r(100 * pp["jsa"][1], 1), "draws": 1, "file": F_TK,
         "key": "row scenario=disp_only, variant=jsa: exchequer_cost_bn and -narrow_cash_change_bn, over wage_bill_lost_bn"},
        {"id": "wage_cuts", "label": "Wage cuts", "government_p": r(100 * cut_gov, 1), "household_p": r(100 * cut_hh, 1),
         "draws": len(co), "file": F_WC,
         "key": "rows variant=cut_only: mean(exchequer_cost_bn)/mean(gross_cut_bn), mean(household_basis_cost_bn)/mean(gross_cut_bn)"},
    ]

    # --- who the displaced are (OBR sizing) ----------------------------------------
    diag = jload(F_TK_JSON)["diagnostics"]["obr"]
    eu = jload(F_TK_JSON)["existing_unemployed"]
    obrd = rows(F_OBRD)
    uc_pw = mean(x["uc_change_bn"] for x in obrd) * 1e3 / mean(x["displaced_weighted_m"] for x in obrd)
    uc_pw_tk = tk_mean("obr", "takeup1", "uc_change_bn") * 1e3 / tk_mean("obr", "takeup1", "displaced_weighted_m")
    for name, val, exp in [("genTkFlagTruePct", 100 * diag["flag_true_share"], 48),
                           ("genTkFlagTrueEntitledPct", 100 * diag["flag_true_share_entitled_after"], 53),
                           ("genTkOverCapitalPct", 100 * diag["over_capital_limit_share"], 42),
                           ("genTkOtherEarnerPct", 100 * diag["other_earner_share"], 59),
                           ("genTkOwnerPct", 100 * diag["owner_share"], 70),
                           ("genTkUnempFlagEntitledPct", 100 * eu["flag_true_share_entitled"], 88)]:
        check(name, val, exp, 0)
    check("genObrUcPerDisplacedGbp", round(uc_pw, -1), 1380, 0)
    check("genTkObrTakeupUcPerDisplacedGbp", round(uc_pw_tk, -1), 2740, 0)
    k = "diagnostics.obr."
    displaced = {
        "claim_uc": {"label": "Benefit units of the displaced that claim UC (data take-up flags)",
                     "value": r(100 * diag["flag_true_share"], 1), "unit": "%", "file": F_TK_JSON,
                     "key": k + "flag_true_share"},
        "claim_uc_entitled": {"label": "Of those entitled to UC once displaced, share that claim",
                              "value": r(100 * diag["flag_true_share_entitled_after"], 1), "unit": "%",
                              "file": F_TK_JSON, "key": k + "flag_true_share_entitled_after"},
        "existing_unemployed_claim": {"label": "Entitled units with an unemployed member that claim UC (baseline)",
                                      "value": r(100 * eu["flag_true_share_entitled"], 1), "unit": "%",
                                      "file": F_TK_JSON, "key": "existing_unemployed.flag_true_share_entitled"},
        "capital_over_limit": {"label": "Benefit units with capital above the UC limit (£16,000)",
                               "value": r(100 * diag["over_capital_limit_share"], 1), "unit": "%", "file": F_TK_JSON,
                               "key": k + "over_capital_limit_share"},
        "other_earner": {"label": "Benefit units with another earner", "value": r(100 * diag["other_earner_share"], 1),
                         "unit": "%", "file": F_TK_JSON, "key": k + "other_earner_share"},
        "homeowner": {"label": "Benefit units that own their home", "value": r(100 * diag["owner_share"], 1),
                      "unit": "%", "file": F_TK_JSON, "key": k + "owner_share"},
        "uc_per_displaced": {"label": "Added UC per displaced worker", "value": round(uc_pw), "unit": "£",
                             "file": F_OBRD,
                             "key": "mean(uc_change_bn) * 1e3 / mean(displaced_weighted_m) over 20 rows"},
        "uc_per_displaced_takeup": {"label": "Added UC per displaced worker, UC take-up = 1", "value": round(uc_pw_tk),
                                    "unit": "£", "file": F_TK,
                                    "key": "rows scenario=obr, variant=takeup1: mean(uc_change_bn) * 1e3 / mean(displaced_weighted_m)"},
        "uc_per_existing_unemployed": {"label": "UC per person already unemployed (baseline)",
                                       "value": round(eu["uc_per_person_gbp"]), "unit": "£", "file": F_TK_JSON,
                                       "key": "existing_unemployed.uc_per_person_gbp"},
    }

    # --- deciles ---------------------------------------------------------------
    dec = sorted(rows(F_DEC), key=lambda x: int(x["decile"]))
    assert [int(x["decile"]) for x in dec] == list(range(1, 11))
    vals = [float(x["disposable_change_pct"]) for x in dec]
    check("genDecompCiMaxLossPct", -min(vals), 2.86, 2)
    check("genDecompCiDTenSignedPct", vals[9], 0.09, 2)
    decr = rows(F_DECR)
    hb = [x for x in decr if x["ranking"] == "hbai"]
    assert all(abs(float(a["disposable_change_pct"]) - b) < 1e-12 for a, b in zip(sorted(hb, key=lambda x: int(x["decile"])), vals))
    n_dec_draws = int(hb[0]["draws"])
    d1_alt = {x["ranking"]: r(float(x["disposable_change_pct"]), 2) for x in decr if x["decile"] == "1"}
    deciles = {
        "measure": ("Change in household disposable income (HBAI, before housing costs) by baseline income decile, "
                    "central scenario; each household weighted by its number of members; mean over "
                    f"{n_dec_draws} draws"),
        "unit": "%", "file": F_DEC, "key": "disposable_change_pct (deciles 1-10); ci_low/ci_high = 95% interval for the mean",
        "draws": n_dec_draws,
        "values": [r(v, 2) for v in vals],
        "ci_low": [r(x["ci_low"], 2) for x in dec],
        "ci_high": [r(x["ci_high"], 2) for x in dec],
        "bottom_decile_caveat": (
            "The paper does not report the bottom income decile as a finding: its sign depends on how households are "
            f"ranked ({F_DECR}, decile 1: " + ", ".join(f"{k} {v:+.2f}%" for k, v in d1_alt.items()) + ")."),
    }

    notes = [
        "Provisional: PR #18 is an open draft, not merged; numbers may change before publication.",
        f"Data: Microcosm UK 2024-25 ({cmc['certified_data_build_id']}), simulated for 2026 with PolicyEngine-UK.",
        "Central scenario: 7% of employees displaced in proportion to occupational AI exposure (C-AIOE), "
        "survivors' wages up 2.6% on average, interest and dividend income up 39.8% (+0.4pp return); displaced workers lose a full year of earnings.",
        "Exchequer cost is the fall in the government balance: income tax, employee and employer NI, and benefits; "
        "it counts no corporation tax. A negative cost is a net gain.",
        "Poverty is the absolute line (frozen at baseline) before housing costs unless stated; Gini changes are in points (x100).",
        "Draw counts differ: headline 50 draws; take-up, JSA and wage-cut variants 20 draws paired with seeds 0-19 of the central run "
        "(central on those seeds costs £7.2bn); low and high scenarios one draw (seed 0); job-loss cost per pound seed 0.",
        "SDs describe assignment-draw variation only, not survey sampling or model uncertainty.",
        "The OBR-sized run is a different, smaller shock (1.7% displacement, no wage or capital channel), not a step on the central ladder.",
        "Regional results are not on the study's data/microcosm-2024-25 branch; results/geo/ exists only on main and predates the move to Microcosm (FRS-era, superseded).",
    ]

    out = {
        "provisional": True,
        "source": {"repo": source["repo"], "pr": source["pr"], "branch": source["branch"],
                   "commit": source["commit"], "fetched": source["fetched"], "dataset": "Microcosm UK 2024-25"},
        "headline": headline,
        "ladder": ladder,
        "rules": rules,
        "per_pound": per_pound,
        "displaced": displaced,
        "deciles": deciles,
        "regions": None,
        "notes": notes,
    }
    DEST.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {DEST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
