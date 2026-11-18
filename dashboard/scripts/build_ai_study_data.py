"""Write dashboard/src/data/aiStudy2425.json: the results of the PolicyEngine-UK
microsimulation of AI job displacement (PolicyEngine/uk-ai-study, main at the
merge commit of PR #18, Microcosm UK 2024-25, fiscal year 2027-28), for part 3
of the story, Explore > Households and Method > Household method.

Reads only analysis/story/ai_study/ (verbatim copies of committed result files
at their repo paths, plus SOURCE.json with the commit they came from). No
network. Every value is read or derived from those files with the formulas the
study's own emitter (analysis/emit_tex_values.py and its helpers
post_takeup_runs.py, post_wage_cut.py, revision_accounting.py) uses; nothing is
typed in. The builder asserts its rounded outputs against the paper's printed
values (paper/values_generated.tex at the same commit: every check reads its
expected value from that file's macros), so a silent change in the copied
files fails loudly. The model year (genModelFiscalYear) and the study's status
(SOURCE.json; BUILD_MANIFEST recovery_note) are read from the same copies and
written as data, so components never hard-code them.

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
F_POVD = "results/robustness/poverty_decomposition.json"
F_DIVC = "results/robustness/dividend_coverage.json"
F_COST = "results/robustness/central_cost_decomposition.json"
F_SWG = "results/robustness/survivor_wage_grid.csv"
F_CV = "results/next_runs/capital_variants_draws.csv"
F_D5 = "results/robustness/incidence_draws_five.csv"
F_DUR = "results/robustness/duration_takeup_sensitivity.json"
F_HDEC = "results/next_runs/obr_household_deciles.csv"
F_POL = "results/robustness/policy_draws.csv"
F_MAN = "results/BUILD_MANIFEST.json"
F_TEX = "paper/values_generated.tex"


def paper_macros() -> dict:
    """The paper's printed values (paper/values_generated.tex), name -> text."""
    import re
    text = (SRC / F_TEX).read_text()
    return {m.group(1): m.group(2) for m in re.finditer(r"\\newcommand\{\\(gen\w+)\}\{([^{}]*)\}", text)}


def pnum(macros: dict, name: str) -> float:
    return float(macros[name].replace(",", "").replace("+", "").replace("$", ""))


def sd(xs) -> float:
    xs = [float(x) for x in xs]
    m = sum(xs) / len(xs)
    return (sum((x - m) ** 2 for x in xs) / (len(xs) - 1)) ** 0.5


def main() -> None:
    source = jload("SOURCE.json")
    P = paper_macros()

    def pc(name: str, value: float, ndp: int) -> None:
        check(name, value, pnum(P, name), ndp)

    # FY as the paper prints it (\genModelFiscalYear, "2027--28"), en dash
    model_year = P["genModelFiscalYear"].replace("--", "\u2013")
    man = jload(F_MAN)
    status_note = (
        f"PR #{source['pr']} was merged into main on {source['merged_utc'][:10]}. Neither the README nor the paper at "
        f"{source['commit'][:7]} calls the study provisional or a draft. Its build manifest says: \"{man['recovery_note']}\"")

    # --- headline ------------------------------------------------------------
    cmc = jload(F_CMC)
    n_central = int(jload(F_INC)["_metadata"]["draws"])  # same 50 exposure draws
    low, high = jload(F_LOW), jload(F_HIGH)

    def preset(d: dict) -> dict:
        return {"cost_bn": d["exchequer_cost"] / 1e9,
                "pov_pp": d["poverty_rate_change_bhc"] * 100,
                "gini_pp": (d["gini_shocked"] - d["gini_baseline"]) * 100}
    lo, hi = preset(low), preset(high)

    pc("genCentralMcCostMeanBn", cmc["exchequer_cost_bn"]["mean"], 1)
    pc("genCentralMcCostSdBn", cmc["exchequer_cost_bn"]["sd"], 1)
    pc("genCentralMcPovBhcMeanPp", cmc["poverty_change_bhc_pp"]["mean"], 2)
    pc("genCentralMcGiniMeanPp", cmc["gini_change_pp"]["mean"], 2)
    pc("genLowCostBn", lo["cost_bn"], 1)
    pc("genHighCostBn", hi["cost_bn"], 1)

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

    pc("genCapCentralTwentyCostMeanBn", mean(x["exchequer_cost_bn"] for x in c20), 1)
    pc("genTkCentralTakeupCostMeanBn", tk_mean("central", "takeup1", "exchequer_cost_bn"), 1)
    pc("genTkCentralJsaCostMeanBn", tk_mean("central", "jsa", "exchequer_cost_bn"), 1)
    pc("genTkCentralTakeupPovBhcMeanPp", tk_mean("central", "takeup1", "poverty_change_bhc_pp"), 2)
    pc("genTkCentralJsaPovBhcMeanPp", tk_mean("central", "jsa", "poverty_change_bhc_pp"), 2)
    pc("genTkCentralTakeupGiniMeanPp", tk_mean("central", "takeup1", "gini_change_pp"), 2)
    pc("genTkCentralJsaGiniMeanPp", tk_mean("central", "jsa", "gini_change_pp"), 2)
    pc("genWcWageCostMeanBn", mean(x["exchequer_cost_bn"] for x in t3), 1)
    pc("genWcWagePovBhcMeanPp", mean(x["poverty_change_bhc_pp"] for x in t3), 2)
    pc("genObrCostMeanBn", obr["exchequer_cost_bn"]["mean"], 1)
    pc("genTkObrTakeupCostMeanBn", tk_mean("obr", "takeup1", "exchequer_cost_bn"), 1)
    pc("genTkObrJsaCostMeanBn", tk_mean("obr", "jsa", "exchequer_cost_bn"), 1)

    def rung(id_, label, cost, pov, gini, draws, file, key, note=None):
        return {"id": id_, "label": label, "cost_bn": r(cost, 4), "poverty_pp": None if pov is None else r(pov, 4),
                "gini_pp": None if gini is None else r(gini, 4), "draws": draws, "file": file, "key": key,
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
    pc("genIncUniformCostMeanBn", inc["uniform"]["exchequer_cost_bn"]["mean"], 1)
    pc("genIncJuniorCostMeanBn", inc["junior"]["exchequer_cost_bn"]["mean"], 1)
    pc("genIncUniformPovBhcMeanPp", inc["uniform"]["poverty_change_bhc_pp"]["mean"], 2)
    pc("genIncKleinPovBhcMeanPp", inc["klein_top_loaded"]["poverty_change_bhc_pp"]["mean"], 2)
    pc("genIncCompressionCostMeanBn", inc["compression"]["exchequer_cost_bn"]["mean"], 1)
    pc("genIncKleinCostMeanBn", inc["klein_top_loaded"]["exchequer_cost_bn"]["mean"], 1)
    rule_labels = [("uniform", "Uniform"), ("junior", "Junior-tilted"), ("exposure", "Exposure-proportional (central)"),
                   ("compression", "Expertise compression"), ("klein_top_loaded", "Top-loaded stress test")]
    # four decimals: at cd54488 two would put uniform (1.948) and junior (7.047) on a one-decimal tie
    rules = [{"id": k, "label": lab, "cost_bn": r(inc[k]["exchequer_cost_bn"]["mean"], 4),
              "cost_sd_bn": r(inc[k]["exchequer_cost_bn"]["sd"], 4),
              "poverty_pp": r(inc[k]["poverty_change_bhc_pp"]["mean"], 4),
              "gini_pp": r(inc[k]["gini_change_pp"]["mean"], 4),
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
    for name, val in [("genAbsJobGovPct", job_gov), ("genAbsJobHhPct", job_hh),
                           ("genAbsJobGovTakeupPct", pp["takeup1"][0]), ("genAbsJobHhTakeupPct", pp["takeup1"][1]),
                           ("genAbsJobGovJsaPct", pp["jsa"][0]), ("genAbsJobHhJsaPct", pp["jsa"][1]),
                           ("genAbsCutGovPct", cut_gov), ("genAbsCutHhPct", cut_hh)]:
        pc(name, 100 * val, 0)
    per_pound = [
        {"id": "job_loss", "label": "Job loss", "government_p": r(100 * job_gov, 4), "household_p": r(100 * job_hh, 4),
         "draws": 1, "file": F_CG,
         "key": ("row unemployment_pct=7: -microsim_gov_balance_change_bn and -microsim_net_revenue_change_bn, over "
                 f"{F_WM} gross_cut_realised/1e9")},
        {"id": "job_loss_takeup", "label": "Job loss, UC take-up = 1", "government_p": r(100 * pp["takeup1"][0], 4),
         "household_p": r(100 * pp["takeup1"][1], 4), "draws": 1, "file": F_TK,
         "key": "row scenario=disp_only, variant=takeup1: exchequer_cost_bn and -narrow_cash_change_bn, over wage_bill_lost_bn"},
        {"id": "job_loss_takeup_jsa", "label": "Job loss, UC take-up = 1 and new-style JSA",
         "government_p": r(100 * pp["jsa"][0], 4), "household_p": r(100 * pp["jsa"][1], 4), "draws": 1, "file": F_TK,
         "key": "row scenario=disp_only, variant=jsa: exchequer_cost_bn and -narrow_cash_change_bn, over wage_bill_lost_bn"},
        {"id": "wage_cuts", "label": "Wage cuts", "government_p": r(100 * cut_gov, 4), "household_p": r(100 * cut_hh, 4),
         "draws": len(co), "file": F_WC,
         "key": "rows variant=cut_only: mean(exchequer_cost_bn)/mean(gross_cut_bn), mean(household_basis_cost_bn)/mean(gross_cut_bn)"},
    ]

    # --- who the displaced are (OBR sizing) ----------------------------------------
    diag = jload(F_TK_JSON)["diagnostics"]["obr"]
    eu = jload(F_TK_JSON)["existing_unemployed"]
    obrd = rows(F_OBRD)
    uc_pw = mean(x["uc_change_bn"] for x in obrd) * 1e3 / mean(x["displaced_weighted_m"] for x in obrd)
    uc_pw_tk = tk_mean("obr", "takeup1", "uc_change_bn") * 1e3 / tk_mean("obr", "takeup1", "displaced_weighted_m")
    for name, val in [("genTkFlagTruePct", 100 * diag["flag_true_share"]),
                           ("genTkFlagTrueEntitledPct", 100 * diag["flag_true_share_entitled_after"]),
                           ("genTkOverCapitalPct", 100 * diag["over_capital_limit_share"]),
                           ("genTkOtherEarnerPct", 100 * diag["other_earner_share"]),
                           ("genTkOwnerPct", 100 * diag["owner_share"]),
                           ("genTkUnempFlagEntitledPct", 100 * eu["flag_true_share_entitled"])]:
        pc(name, val, 0)
    pc("genObrUcPerDisplacedGbp", round(uc_pw, -1), 0)
    pc("genTkObrTakeupUcPerDisplacedGbp", round(uc_pw_tk, -1), 0)
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
    pc("genDecompCiMaxLossPct", -min(vals), 2)
    pc("genDecompCiDTenSignedPct", vals[9], 2)
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
        f"Study: {source['repo']} main at {source['commit'][:7]} (PR #{source['pr']}, merged {source['merged_utc'][:10]}).",
        f"Data: Microcosm UK 2024-25 ({cmc['certified_data_build_id']}), simulated for FY {model_year} with PolicyEngine-UK.",
        "Central scenario: 7% of employees displaced in proportion to occupational AI exposure (C-AIOE), "
        "wages of those who keep their jobs up 2.6% on average, interest and dividend income up 39.8% (+0.4pp return); displaced workers lose a full year of earnings.",
        "Exchequer cost is the fall in the government balance: income tax, employee and employer NI, and benefits; "
        "it counts no corporation tax. A negative cost is a net gain.",
        "Poverty is the absolute line (frozen at baseline) before housing costs unless stated; Gini changes are in points (x100).",
        "Draw counts differ: headline 50 draws; take-up, JSA and wage-cut variants 20 draws paired with seeds 0-19 of the central run "
        "(central on those seeds costs £7.2bn); low and high scenarios one draw (seed 0); job-loss cost per pound seed 0.",
        "SDs describe assignment-draw variation only, not survey sampling or model uncertainty.",
        "The OBR-sized run is a different, smaller shock (1.7% displacement, no wage or capital channel), not a step on the central ladder.",
        "No regional results: the study's main branch has no results/geo/ (its README: the earlier maps used the enhanced FRS 2023-24 and were dropped with it).",
    ]

    out = {
        "provisional": False,
        "model_year": model_year,
        "model_year_label": f"FY {model_year}",
        "status": source["pr_status"],
        "status_note": status_note,
        "commit": source["commit"],
        "source": {"repo": source["repo"], "pr": source["pr"], "pr_status": source["pr_status"],
                   "merged_utc": source["merged_utc"], "pr_head": source["pr_head"], "branch": source["branch"],
                   "commit": source["commit"], "fetched": source["fetched"], "dataset": "Microcosm UK 2024-25",
                   "repo_url": f"https://github.com/{source['repo']}",
                   "commit_url": f"https://github.com/{source['repo']}/tree/{source['commit']}",
                   "pr_url": f"https://github.com/{source['repo']}/pull/{source['pr']}",
                   "paper_url": f"https://github.com/{source['repo']}/blob/{source['commit']}/paper/main.pdf",
                   "files_base_url": f"https://github.com/{source['repo']}/blob/{source['commit']}/"},
        "headline": headline,
        "ladder": ladder,
        "rules": rules,
        "per_pound": per_pound,
        "displaced": displaced,
        "deciles": deciles,
        "regions": None,
        "notes": notes,
        **extras(cmc, low, model_year),
    }
    DEST.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {DEST.relative_to(ROOT)}")


# The capital shock's constants, as the study sets them (methodology.tex,
# "Shock scenarios"; analysis/revision_accounting.py BASE_RETURN_PCT,
# RETURN_SHOCK_PP). The builder asserts the uplift they imply against the
# paper's printed genCapitalScalePct.
BASE_RETURN_PCT = 1.005
RETURN_SHOCK_PP = 0.4


def zero_crossing(x, y) -> float:
    """revision_accounting.zero_crossing: linear x at which y crosses zero."""
    for i in range(len(x) - 1):
        if y[i] == 0:
            return float(x[i])
        if y[i] * y[i + 1] < 0:
            return float(x[i] + (x[i + 1] - x[i]) * y[i] / (y[i] - y[i + 1]))
    raise SystemExit("no zero crossing inside the grid")


def extras(cmc: dict, low: dict, model_year: str) -> dict:
    """The sections added for the eight-step part 3, Explore > Households and
    Method and sources > Household method (November 2026)."""
    P = paper_macros()

    def r(x, ndp):  # noqa: ARG001 - four decimals here, so one-decimal display never double-rounds
        return round(float(x), 4)

    def pcheck(name: str, value: float, ndp: int) -> None:
        check(name, value, pnum(P, name), ndp)

    # --- baselines beside the central rises --------------------------------
    povd = jload(F_POVD)
    pcheck("genPovBaselineBhcPct", 100 * povd["poverty_rate_bhc_baseline"], 1)
    pcheck("genBaselineGini", low["gini_baseline"], 3)
    baseline = {
        "absolute_bhc_pct": {"value": r(100 * povd["poverty_rate_bhc_baseline"], 2), "file": F_POVD,
                             "key": "poverty_rate_bhc_baseline * 100",
                             "note": f"Baseline (no shock), FY {model_year}; the baseline does not depend on the draw."},
        "relative_bhc_pct": {"value": r(100 * cmc["baseline_relative_poverty_bhc_rate"], 2), "file": F_CMC,
                             "key": "baseline_relative_poverty_bhc_rate * 100", "note": "60% of the baseline median."},
        "gini": {"value": r(low["gini_baseline"], 3), "file": F_LOW, "key": "gini_baseline", "note": None},
        "baseline_source": "PolicyEngine-UK baseline",
        "baseline_source_note": ("Simulated by PolicyEngine-UK on Microcosm UK 2024-25 for FY " + model_year +
                                 "; not a DWP Households Below Average Income statistic."),
    }

    # --- the three channels (20 paired draws) -------------------------------
    dv = jload(F_DIVC)
    ch = dv["channels"]
    for k, N in [("displacement", "Disp"), ("wage", "Wage"), ("capital", "Capital")]:
        pcheck(f"genChannelMc{N}CostSignedBn", ch[k]["exchequer_cost_bn"]["mean"], 1)
        pcheck(f"genChannelMc{N}PovBhcSignedPp", ch[k]["poverty_change_bhc_pp"]["mean"], 2)
    pcheck("genChannelMcInteractionCostSignedBn", dv["channels_interaction"]["exchequer_cost_bn"], 2)
    pcheck("genChannelMcSumCostSignedBn", dv["channels_sum"]["exchequer_cost_bn"], 2)
    channels = {
        "draws": int(dv["draws"]), "file": F_DIVC,
        "key": "channels.<channel>.exchequer_cost_bn.mean (positive = cost); channels_sum; channels_interaction",
        "rows": [{"id": k, "cost_bn": r(ch[k]["exchequer_cost_bn"]["mean"], 2),
                  "poverty_pp": r(ch[k]["poverty_change_bhc_pp"]["mean"], 2),
                  "gini_pp": r(ch[k]["gini_change_pp"]["mean"], 2)} for k in ("displacement", "wage", "capital")],
        "sum_bn": r(dv["channels_sum"]["exchequer_cost_bn"], 2),
        "interaction_bn": r(dv["channels_interaction"]["exchequer_cost_bn"], 2),
        "central_bn": r(dv["central"]["exchequer_cost_bn"]["mean"], 2),
        "note": "Each channel run alone on the same 20 draws (seeds 0-19) as the central case.",
    }

    # --- the 50-draw cost by tax and benefit --------------------------------
    cd = jload(F_COST)
    comp_rows = [("other_income_tax", "Income tax on earnings, net of tax on the wage gains of those who keep their jobs"),
                 ("employer_ni", "Employer NI"), ("employee_ni", "Employee NI"), ("universal_credit", "Universal Credit"),
                 ("other", "Other items"), ("childcare", "Childcare support"), ("savings_tax", "Tax on savings income"),
                 ("dividend_tax", "Tax on dividends")]
    for k, N in [("other_income_tax", "OtherIncomeTax"), ("employer_ni", "EmployerNi"), ("employee_ni", "EmployeeNi"),
                 ("universal_credit", "Uc"), ("dividend_tax", "DividendTax"), ("savings_tax", "SavingsTax"),
                 ("childcare", "Childcare"), ("total", "Total")]:
        pcheck(f"genCost{N}SignedBn", cd[k]["mean"], 1)
    parts = sum(cd[k]["mean"] for k, _ in comp_rows)
    assert abs(parts - cd["total"]["mean"]) < 1e-6, (parts, cd["total"]["mean"])
    cost_components = {
        "draws": int(cd["_metadata"]["draws"]), "file": F_COST,
        "key": "<component>.mean and .sd; positive = cost to the Exchequer (fall in gov_balance)",
        "rows": [{"id": k, "label": lab, "cost_bn": r(cd[k]["mean"], 2), "sd_bn": r(cd[k]["sd"], 2)}
                 for k, lab in comp_rows],
        "total_bn": r(cd["total"]["mean"], 2),
    }

    # --- break-even values (results.tex, Table "Break-even values") ---------
    swg = sorted(rows(F_SWG), key=lambda x: float(x["survivor_wage_effect_pct"]))
    be_wage = zero_crossing([float(x["survivor_wage_effect_pct"]) for x in swg], [float(x["exchequer_cost_bn"]) for x in swg])
    pcheck("genBeWagePct", be_wage, 1)
    c20 = {int(x["seed"]): float(x["exchequer_cost_bn"]) for x in rows(F_DCD) if x["run"] == "central"}
    # the grid's central survivor setting: its row reproduces the seed-0 central draw
    srow = next(x for x in swg if abs(float(x["exchequer_cost_bn"]) - c20[0]) < 1e-6)
    wage_central = float(srow["survivor_wage_effect_pct"])
    cap_x0 = 100 * ((BASE_RETURN_PCT + RETURN_SHOCK_PP) / BASE_RETURN_PCT - 1)
    pcheck("genCapitalScalePct", cap_x0, 1)
    cap60 = {int(x["seed"]): float(x["exchequer_cost_bn"]) for x in rows(F_CV) if x["variant"] == "cap60"}
    assert set(cap60) == set(c20) == set(range(20))
    y0, y1 = mean(c20.values()), mean(cap60.values())
    be_cap = cap_x0 + (60 - cap_x0) * y0 / (y0 - y1)
    pcheck("genBeCapInterpUpliftPct", be_cap, 0)
    pcheck("genBeCapInterpPp", BASE_RETURN_PCT * be_cap / 100, 2)
    pcheck("genCapSixtyDrawCostMeanBn", y1, 1)
    full = mean(float(x["exchequer_cost_bn"]) for x in rows(F_D5) if x["family"] == "exposure" and int(x["seed"]) < 20)
    half = jload(F_DUR)["half_earnings_retention"]["results"]["exchequer_cost_bn"]["mean"]
    ret = 0.5 * full / (full - half)
    be_dur = 12 * (1 - ret)
    pcheck("genBeDurMonths", be_dur, 1)
    pcheck("genDurSixMoCostMeanBn", half, 1)
    breakeven = {
        "wage": {"central_pct": r(wage_central, 2), "value_pct": r(be_wage, 2), "draws": 1, "file": F_SWG,
                 "key": "zero crossing of exchequer_cost_bn over survivor_wage_effect_pct (seed 0)"},
        "capital": {"central_pct": r(cap_x0, 2), "value_pct": r(be_cap, 2), "value_pp": r(BASE_RETURN_PCT * be_cap / 100, 2),
                    "cost_at_central_bn": r(y0, 2), "cost_at_60_bn": r(y1, 2), "draws": len(c20),
                    "file": F_CV, "key": (f"linear between mean central cost ({F_DCD} run=central) at the central uplift and "
                                          "mean cost of variant cap60 at +60%, seeds 0-19")},
        "duration": {"value_months": r(be_dur, 2), "cost_full_bn": r(full, 2), "cost_half_bn": r(half, 2), "draws": 20,
                     "file": F_DUR, "key": (f"12 x (1 - r), r = 0.5 full / (full - half); full = mean {F_D5} family=exposure "
                                            "seeds 0-19, half = half_earnings_retention.results.exchequer_cost_bn.mean")},
        "note": ("Each value sets the central cost to zero with the other two at their central settings (linear "
                 "interpolation). Full take-up and new-style JSA move each further away."),
        "paper_other_capital_pct": pnum(P, "genBeCapitalUpliftPct"),
        "capital_choice_note": (
            "capital.value_pct is the break-even the paper prints (genBeCapInterpUpliftPct, "
            f"+{pnum(P, 'genBeCapInterpUpliftPct'):.0f}%, in the results.tex break-even table and intro.tex): linear between "
            "the 20-draw central run and the simulated +60% uplift. paper_other_capital_pct "
            f"(genBeCapitalUpliftPct, +{pnum(P, 'genBeCapitalUpliftPct'):.0f}%) is a second macro, extrapolated from the "
            "capital channel run alone (identical on every draw); the paper's text does not print it, so the dashboard does not show it."),
    }

    # --- pence per pound, matching 20-draw bases ---------------------------
    wc = rows(F_WC)
    co = sorted([x for x in wc if x["variant"] == "cut_only"], key=lambda x: int(x["seed"]))
    jd = sorted([x for x in rows(F_DCD) if x["run"] == "channel_displacement"], key=lambda x: int(x["seed"]))
    assert [int(x["seed"]) for x in co] == [int(x["seed"]) for x in jd] == list(range(20))
    gross = mean(x["gross_cut_bn"] for x in co)
    job = mean(x["exchequer_cost_bn"] for x in jd) / gross
    per = [float(a["exchequer_cost_bn"]) / float(b["gross_cut_bn"]) for a, b in zip(jd, co)]
    cut_er = -mean(x["employer_ni_change_bn"] for x in co) / gross
    pcheck("genAbsJobGovDrawsPct", 100 * job, 0)
    pcheck("genAbsJobGovDrawsMinPct", 100 * min(per), 0)
    pcheck("genAbsJobGovDrawsMaxPct", 100 * max(per), 0)
    pcheck("genAbsCutErNiPct", 100 * cut_er, 0)
    per_pound_20 = {
        "draws": len(co), "file": F_WC,
        "job_loss": {"government_p": r(100 * job, 1), "min_p": r(100 * min(per), 1), "max_p": r(100 * max(per), 1),
                     "file": F_DCD, "key": ("mean(exchequer_cost_bn) of run=channel_displacement over mean(gross_cut_bn) of "
                                           f"{F_WC} variant=cut_only, seeds 0-19; min/max of the per-draw ratio")},
        "wage_cuts_employer_ni_p": r(100 * cut_er, 1),
        "note": "Displacement alone and wage cuts alone: no survivor-wage or capital channel in either.",
    }
    # the gross pay each pair removes (item 32): the denominator above, the
    # same on variant=table3; cross-checked against the displacement channel
    assert abs(mean(x["gross_cut_bn"] for x in wc if x["variant"] == "table3") - gross) < 1e-6
    assert abs(100 * ch["displacement"]["exchequer_cost_bn"]["mean"] / gross - 100 * job) < 0.01
    per_pound_20["gross_cut_bn"] = r(gross, 4)

    # --- the Sankey: where the earnings lost go (OBR-sized run) ------------
    hd = {x["decile"]: x for x in rows(F_HDEC)}
    assert {int(x["draws"]) for x in hd.values()} == {20}
    obr_sum = jload(F_OBR)["summary"]
    er_ni = -obr_sum["employer_ni_change_bn"]["mean"]
    pcheck("genObrLineNiEmployerBn", er_ni, 1)
    pcheck("genObrLineWageBillBn", -float(hd["all"]["market_change"]), 1)
    pcheck("genObrStabTbAllPct", 100 * float(hd["all"]["tax_benefit_share"]), 0)
    pcheck("genObrStabNetAllPct", 100 * float(hd["all"]["stabilisation_net"]), 0)

    def flows(x):
        market = -float(x["market_change"])
        tax = -float(x["tax_change"])
        ben = float(x["benefit_change"])
        net = -float(x["net_income_change"])
        other = market - tax - ben - net
        return {"earnings_lost_bn": market, "tax_ni_bn": tax, "benefits_bn": ben, "other_bn": other, "disposable_bn": net}
    dec_flows = [flows(hd[str(i)]) for i in range(1, 11)]
    allf = flows(hd["all"])
    for k in allf:
        assert abs(sum(f[k] for f in dec_flows) - allf[k]) < 1e-6, k
    for f in dec_flows:
        assert all(f[k] >= 0 for k in f), f
    sankey = {
        "draws": 20, "file": F_HDEC, "displacement_rate_pct": r(100 * jload(F_OBR)["displacement_rate"], 2),
        "key": ("per decile: earnings lost = -market_change; lower income tax and employee NI = -tax_change; more benefits "
                "= benefit_change; lower disposable income = -net_income_change; other items = the remainder"),
        "deciles": [{k: r(v, 4) for k, v in f.items()} for f in dec_flows],
        "total": {k: r(v, 4) for k, v in allf.items()},
        "employer_ni_bn": r(er_ni, 4), "employer_ni_file": F_OBR, "employer_ni_key": "-summary.employer_ni_change_bn.mean",
        "tax_benefit_share_pct": r(100 * float(hd["all"]["tax_benefit_share"]), 1),
        "note": ("OBR-sized run: 1.67% of employees displaced under exposure-proportional incidence, earnings of those who keep their jobs "
                 "flat, no capital shock; by baseline decile of equivalised HBAI income. Other items are mainly "
                 "pension contributions, plus council tax and other deductions inside the HBAI concept."),
    }

    # --- deciles under the three rankings (20 draws) ------------------------
    decr = rows(F_DECR)
    rk_labels = [("hbai", "HBAI household income (the study's ranking)"),
                 ("pre_pension", "Income before pension contributions"),
                 ("hbai_excl_large_ppc", "HBAI, leaving out households with large pension contributions")]
    rankings = [{"id": k, "label": lab,
                 "values": [r(float(x["disposable_change_pct"]), 2) for x in sorted(
                     (y for y in decr if y["ranking"] == k), key=lambda y: int(y["decile"]))]}
                for k, lab in rk_labels]
    assert all(len(x["values"]) == 10 for x in rankings)

    # --- policy responses (50 draws; paper Table "Policy reforms") ---------
    pol = rows(F_POL)
    pol_labels = [("R1_wage_insurance", "exposure", "Wage insurance: half of lost earnings, up to £15,000 a year"),
                  ("R2_uc_circuit_breaker", "exposure", "Universal Credit standard allowance 20% higher"),
                  ("R3_cap_suspension_taper_cut", "exposure", "Benefit cap suspended and UC taper cut from 55% to 45%"),
                  ("R1_wage_insurance", "junior", "Wage insurance, junior-tilted displacement"),
                  ("R1_wage_insurance", "uniform", "Wage insurance, uniform displacement")]
    policy = []
    for reform, fam, lab in pol_labels:
        xs = [x for x in pol if x["reform"] == reform and x["family"] == fam]
        policy.append({"id": f"{reform}:{fam}", "reform": reform, "family": fam, "label": lab, "draws": len(xs),
                       "cost_bn": r(mean(x["exchequer_cost_bn"] for x in xs), 2),
                       "cost_sd_bn": r(sd(x["exchequer_cost_bn"] for x in xs), 2),
                       "poverty_pp": r(mean(x["poverty_change_bhc_pp"] for x in xs), 2),
                       "poverty_sd_pp": r(sd(x["poverty_change_bhc_pp"] for x in xs), 2),
                       "gini_pp": r(mean(x["gini_change_pp"] for x in xs), 2)})
    def pol_mean(reform, fam, col):
        return mean(x[col] for x in pol if x["reform"] == reform and x["family"] == fam)
    for (reform, fam, _), N in zip(pol_labels[:3], ["Rone", "Rtwo", "Rthree"]):
        pcheck(f"gen{N}McCostMeanBn", pol_mean(reform, fam, "exchequer_cost_bn"), 1)
        pcheck(f"gen{N}McPovBhcMeanPp", pol_mean(reform, fam, "poverty_change_bhc_pp"), 2)
    pcheck("genRoneJuniorMcCostMeanBn", pol_mean("R1_wage_insurance", "junior", "exchequer_cost_bn"), 1)
    pcheck("genRoneUniformMcCostMeanBn", pol_mean("R1_wage_insurance", "uniform", "exchequer_cost_bn"), 1)
    assert all(p_["draws"] == 50 for p_ in policy)
    policy_out = {"file": F_POL, "key": "mean and SD over seeds of exchequer_cost_bn, poverty_change_bhc_pp, gini_change_pp per reform and family",
                  "rows": policy,
                  "note": ("Each reform is simulated on top of the central shock (shocked-plus-reform minus shocked, poverty "
                           "lines at their shocked values). Wage insurance is a post-simulation transfer, untaxed and "
                           "ignored by means tests, so its cost is gross; the two UC reforms are parameter changes, so "
                           "their costs are net of withdrawal elsewhere. The designs differ in aim and administration.")}

    # --- method facts -------------------------------------------------------
    man = jload(F_MAN)
    method = {
        "policyengine_uk": man["package_versions"]["policyengine-uk"],
        "policyengine": man["package_versions"]["policyengine"],
        "manifest_commit": man["git_commit"], "manifest_finished": man["finished_utc"],
        "manifest_full_rerun": "without a full clean-room rerun" not in man.get("recovery_note", ""), "file": F_MAN,
        "manifest_recovery_note": man.get("recovery_note"),
        "manifest_stages": [x["stage"] for x in man["stages"]],
        # the runs the dashboard flagged "outside the study's attested rebuild" at 02956bd: those still
        # missing from the manifest's stages (empty at cd54488, so the flag no longer applies)
        "outside_rebuild": [k for k in ("wage_cut", "takeup", "obr_benchmark", "capital_variants", "obr_household_deciles")
                            if k not in {x["stage"] for x in man["stages"]}],
        "households": P["genDataHouseholds"], "persons": P["genDataPersons"],
        "population_m": P["genDataPopulationM"], "employees_m": P["genDataEmployeesM"],
        "employee_rows": P["genDataEmployeeRows"], "kish_n": P["genDataEmployeeKishN"],
        "soc_pct": P["genDataEmployeesSocPct"],
        "displaced_min_m": P["genCentralMcDisplacedMinM"], "displaced_max_m": P["genCentralMcDisplacedMaxM"],
        "uc_single_month_gbp": P["genUcSingleOldMonthGbp"], "uc_couple_month_gbp": P["genUcCoupleOldMonthGbp"],
        "uc_taper_pct": P["genUcTaperPct"], "uc_capital_limit_gbp": P["genUcCapitalLimitGbp"],
        "jsa_week_gbp": P["genJsaContribWeekGbp"], "jsa_eligible_pct": P["genTkObrJsaEligiblePct"],
        "takeup_flag_pct": P["genTkFlagTruePct"],
        "survivor_wage_pct": r(wage_central, 2), "capital_uplift_pct": r(cap_x0, 2), "return_shock_pp": RETURN_SHOCK_PP,
        "obr_unemployment_rise_pp": P["genObrUnempRisePp"],
        "macro_file": F_TEX,
        "data_build": cmc["certified_data_build_id"],
    }
    return {"baseline": baseline, "channels": channels, "cost_components": cost_components, "breakeven": breakeven,
            "per_pound_20": per_pound_20, "sankey": sankey, "rankings": rankings, "policy": policy_out, "method": method}


if __name__ == "__main__":
    main()
