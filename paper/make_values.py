"""Emit paper/values_generated.tex from committed model results.

Every number in the paper's text is a LaTeX macro defined here, so no result is
typed into a .tex file by hand.  Run from the repo root:

    python paper/make_values.py                 # writes paper/values_generated.tex
    python paper/make_values.py --check         # exits 1 if the file is stale

Two capital closures are reported side by side (#16, #27, docs/closure_choice.md):

    --central   zeta_K = 0.1, OG-UK's default and the paper's central case
    --bound     zeta_K = 0,   the closed-capital bound

Each accepts either form of results:

  * an assembled results FILE (``baseline``, ``share_shift_tfp_ramp`` and
    ``share_shift_ramp`` at top level), as ``python -m uk_growth_with_ai rerun
    assemble`` writes after the R1-R4 reruns and as ``data/scenarios.json`` is; or
  * a closure-record PREFIX ``P`` naming the three per-solve records
    ``P_baseline.json``, ``P_share_shift_tfp_ramp.json`` and
    ``P_share_shift_ramp.json`` (``analysis/closure/output/zk0`` and friends).

Defaults are the committed, pre-rerun results: the central file is
``uk_growth_with_ai/data/scenarios.json`` and the bound is the committed
``analysis/closure/output/zk0`` records.  When the rerun lands, point both flags
at the assembled files and every macro below moves with them:

    python paper/make_values.py \\
        --central uk_growth_with_ai/data/scenarios_zk0.1.json \\
        --bound   uk_growth_with_ai/data/scenarios_zk0.json

Missing files, missing arms, a closure that does not state the expected
``zeta_K``, or a GNI source that does not reproduce the central file's GDP path
all exit non-zero, in write mode and in ``--check`` mode.  Nothing falls back to
a placeholder.

Legacy arm names (``anthropic_ramp``, ``obr_ramp``, ``zero_tfp_ramp``) are
normalised on load (``uk_growth_with_ai.data_access.normalise_arms``, #22).
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from uk_growth_with_ai import obr as obr_mod  # noqa: E402
from uk_growth_with_ai import report as rep  # noqa: E402
from uk_growth_with_ai import scenarios as scen  # noqa: E402
from uk_growth_with_ai.data_access import DATA, normalise_arms  # noqa: E402

OUT = ROOT / "paper" / "values_generated.tex"
DEFAULT_CENTRAL = DATA / "scenarios.json"
DEFAULT_BOUND = ROOT / "analysis" / "closure" / "output" / "zk0"
# GNI for a central file that carries no foreign positions (the pre-rerun
# data/scenarios.json): the committed zeta_K = 0.1 re-solve, which reproduces it
# bit for bit (docs/closure_sensitivity.md).  Ignored once the central file
# carries GNI itself, as the rerun's assembled file does.
DEFAULT_CENTRAL_RECORDS = ROOT / "analysis" / "closure" / "output" / "zk0.1"
DEFAULT_FIXED = DATA / "scenarios_fixed_spending.json"
# Diagnostic closure that the R1-R4 rerun does not reproduce.  Used for one
# sentence only (the wage sign across closures), labelled pre-rerun in the text.
DIAG_OPEN = ROOT / "analysis" / "closure" / "output" / "zk0.5"

CENTRAL_ZETA_K, BOUND_ZETA_K, OPEN_ZETA_K = 0.1, 0.0, 0.5
CLOSURE_LABELS = {"zk0.1": 0.1, "zk0": 0.0, "zk0.5": 0.5}

# Published benchmarks (audited in docs/results_sanity_audit.md):
# OBR effective tax rates, November 2025 EFO para 2.64 and Box 4.1.
OBR_EFF_RATE_LABOUR, OBR_EFF_RATE_PROFITS = 40.0, 17.0
# Korinek et al. (2026) Table 3: labour share 60.0 cents in the no-AI scenario.
KORINEK_LABOUR_SHARE_BASE = 60.0

ARMS = ("share_shift_tfp_ramp", "share_shift_ramp")
NEEDED = ("baseline",) + ARMS
YEAR_WORD = {2026: "TwentySix", 2027: "TwentySeven", 2028: "TwentyEight",
             2029: "TwentyNine", 2030: "Thirty"}
# Macro words for the #22 arm ids.  "ShareShift" is a prefix of "ShareShiftTfp";
# every macro is matched whole by LaTeX, so that is harmless.
ARM_WORD = {"share_shift_tfp_ramp": "ShareShiftTfp", "share_shift_ramp": "ShareShift"}
VAR_WORD = {"Y": "Gdp", "K": "Capital", "L": "Labour", "w": "Wage",
            "C": "Consumption", "I": "Investment", "G": "Spending",
            "D": "Debt", "total_tax_revenue": "Revenue"}
NPER = 5


class ResultsError(SystemExit):
    """Any defect in the inputs: exits non-zero with a message, never a placeholder."""

    def __init__(self, msg: str):
        super().__init__(f"make_values: {msg}")


# --- loading ------------------------------------------------------------------

def _flatten(rec: dict) -> dict:
    """A per-solve record with its paths at top level (records keep them in `series`)."""
    out = dict(rec)
    for k, v in (rec.get("series") or {}).items():
        out.setdefault(k, v)
    return out


def load_closure(spec: Path, label: str) -> dict:
    """Assembled results file, or a prefix naming the three closure records."""
    spec = Path(spec)
    if spec.suffix == ".json":
        if not spec.is_file():
            raise ResultsError(f"{label}: results file {spec} does not exist")
        res = normalise_arms(json.loads(spec.read_text()))
        missing = [a for a in NEEDED if a not in res]
        if missing:
            raise ResultsError(f"{label}: {spec} lacks arm(s) {missing}")
        res = {**res, **{a: _flatten(res[a]) for a in NEEDED}}
        res["_source"] = str(spec.relative_to(ROOT) if spec.is_relative_to(ROOT) else spec)
        return res
    files = {a: spec.parent / f"{spec.name}_{a}.json" for a in NEEDED}
    missing = [str(f) for f in files.values() if not f.is_file()]
    if missing:
        raise ResultsError(f"{label}: closure record(s) missing: {missing}")
    res = {a: _flatten(normalise_arms(json.loads(f.read_text()))) for a, f in files.items()}
    res["_source"] = str(spec.relative_to(ROOT) if spec.is_relative_to(ROOT) else spec) + "_*.json"
    return res


def stated_zeta_k(res: dict):
    """The zeta_K a results set says it was solved at, or None if it does not say."""
    found = set()
    a = res.get("assumptions") or {}
    for d in [res[x] for x in NEEDED] + [a]:
        cl = d.get("closure")
        if isinstance(cl, str):
            # rerun records label the closure ("zk0.1", "zk0"), as uk_growth_with_ai.rerun does
            if cl not in CLOSURE_LABELS:
                raise ResultsError(f"{res['_source']}: unknown closure label {cl!r}")
            found.add(CLOSURE_LABELS[cl])
            cl = {}
        for z in (d.get("zeta_K"), (cl or {}).get("zeta_K")):
            if z is not None:
                found.add(float(z))
    if len(found) > 1:
        raise ResultsError(f"{res['_source']}: arms disagree on zeta_K {sorted(found)}")
    return found.pop() if found else None


def require_zeta_k(res: dict, want: float, label: str) -> None:
    z = stated_zeta_k(res)
    if z is None:
        raise ResultsError(f"{label}: {res['_source']} does not state zeta_K")
    if not math.isclose(z, want, abs_tol=1e-12):
        raise ResultsError(f"{label}: {res['_source']} is zeta_K = {z}, expected {want}")


def has_foreign_positions(r: dict) -> bool:
    return "GNI" in r or all(k in r for k in ("r_p", "K_f", "D_f"))


def gni(r: dict) -> np.ndarray:
    """GNI = Y - r_p (K_f + D_f): GDP less income paid abroad (closure_sensitivity.md)."""
    if "GNI" in r:
        return np.array(r["GNI"][:NPER], dtype=float)
    f = lambda k: np.array(r[k][:NPER], dtype=float)
    return f("Y") - f("r_p") * (f("K_f") + f("D_f"))


def arr(r: dict, k: str) -> np.ndarray:
    return np.array(r[k][:NPER], dtype=float)


def gap(res: dict, arm: str, var: str) -> np.ndarray:
    return (arr(res[arm], var) / arr(res["baseline"], var) - 1) * 100


def gni_gap(res: dict, arm: str) -> np.ndarray:
    return (gni(res[arm]) / gni(res["baseline"]) - 1) * 100


def attach_gni(central: dict, records_spec: Path) -> dict:
    """Give a central file without foreign positions the GNI of its closure records.

    The records must reproduce the central file's GDP path in every arm; a mismatch
    means they are a different solve, and the run stops."""
    if all(has_foreign_positions(central[a]) for a in NEEDED):
        return central
    recs = load_closure(records_spec, "central GNI records")
    require_zeta_k(recs, CENTRAL_ZETA_K, "central GNI records")
    out = dict(central)
    for a in NEEDED:
        y_c, y_r = arr(central[a], "Y"), arr(recs[a], "Y")
        dev = float(np.max(np.abs(y_c / y_r - 1)))
        if dev > 1e-9:
            raise ResultsError(
                f"central GNI records {recs['_source']} do not reproduce "
                f"{central['_source']} ({a}: max relative GDP difference {dev:.2e})")
        out[a] = {**central[a], **{k: recs[a][k] for k in ("r_p", "K_f", "D_f")}}
    out["_gni_source"] = recs["_source"]
    return out


# --- macro store --------------------------------------------------------------

class Values(dict):
    def put(self, name: str, value, fmt: str = "{:.2f}") -> None:
        if name in self:
            raise KeyError(f"duplicate macro: {name}")
        if value is None or (isinstance(value, float) and not math.isfinite(value)):
            raise ResultsError(f"no value for macro \\gen{name}")
        self[name] = value if isinstance(value, str) else fmt.format(value)

    def signed(self, name: str, x: float, fmt_signed="{:+.2f}", fmt_abs="{:.1f}",
               up="above", down="below") -> None:
        """Signed value (2dp; Short = 1dp), its magnitude, and a direction word, so prose that reads
        "\\genXAbs{} per cent \\genXDir{} baseline" stays true if the sign flips."""
        def typeset(t):   # typeset sign, not a hyphen
            return f"${t[0]}${t[1:]}" if t[0] in "+-" else t
        self.put(name, typeset(fmt_signed.format(x)))
        # 1dp, but 2dp near zero so a small gap never prints as "-0.0"
        self.put(name + "Short", typeset(("{:+.2f}" if abs(x) < 0.1 else "{:+.1f}").format(x)))
        self.put(name + "Abs", abs(x), fmt_abs)
        self.put(name + "Dir", up if x >= 0 else down)
        self.put(name + "Verb", "rises" if x >= 0 else "falls")


# --- emitters -----------------------------------------------------------------

def emit_closure(v: Values, res: dict, cw: str, *, all_years: bool) -> None:
    """GDP and GNI gaps, foreign share and saving share for one closure."""
    base = res["baseline"]
    pa = (1 - gni(base) / arr(base, "Y")) * 100
    v.put(f"PaidAbroadBase{cw}", pa[4], "{:.2f}")
    v.put(f"GniGdpRatioBase{cw}", 100 - pa[4], "{:.1f}")
    cad = (arr(base, "C") + arr(base, "I") + arr(base, "G") - gni(base)) / arr(base, "Y") * 100
    v.put(f"CurrentAccountDeficitBase{cw}", cad[4], "{:.1f}")
    if "K_f" in base:
        v.put(f"ForeignOwnedCapitalBase{cw}", arr(base, "K_f")[4] / arr(base, "K")[4] * 100, "{:.0f}")
    for arm, aw in ARM_WORD.items():
        r = res[arm]
        g_y, g_n = gap(res, arm, "Y"), gni_gap(res, arm)
        years = YEAR_WORD.items() if all_years else [(2030, "Thirty")]
        for year, yw in years:
            i = year - 2026
            v.signed(f"{aw}GdpGap{yw}{cw}", g_y[i])
            v.signed(f"{aw}GniGap{yw}{cw}", g_n[i])
        v.put(f"{aw}GniLessGdpThirty{cw}", g_n[4] - g_y[4], "{:+.2f}")
        dk = arr(r, "K")[4] - arr(base, "K")[4]
        dkf = arr(r, "K_f")[4] - arr(base, "K_f")[4] if "K_f" in r else None
        if dkf is not None:
            v.put(f"{aw}ForeignShareExtraK{cw}", dkf / dk * 100, "{:.1f}")
            if arr(base, "K_f")[4] > 0:
                v.signed(f"{aw}ForeignCapitalGapThirty{cw}",
                         (arr(r, "K_f")[4] / arr(base, "K_f")[4] - 1) * 100, fmt_abs="{:.0f}")
        # extra national saving (GNI - C - G) over extra investment, 2026-29
        s = lambda x: gni(x) - arr(x, "C") - arr(x, "G")
        ds = (s(r) - s(base))[:4].sum()
        di = (arr(r, "I") - arr(base, "I"))[:4].sum()
        v.put(f"{aw}SavingShare{cw}", ds / di, "{:.2f}")
        v.signed(f"{aw}WageGapThirty{cw}", gap(res, arm, "w")[4])
        ty = lambda x: arr(x, "total_tax_revenue")[4] / arr(x, "Y")[4] * 100
        v.signed(f"{aw}TaxGdpChangePp{cw}", ty(r) - ty(base))
        v.signed(f"{aw}InvestmentGapTwentyNine{cw}", gap(res, arm, "I")[3])
        v.signed(f"{aw}InvestmentGapThirty{cw}", gap(res, arm, "I")[4])
        v.signed(f"{aw}CapitalGapThirty{cw}", gap(res, arm, "K")[4])
        v.put(f"{aw}InterestChangeBp{cw}",
              (arr(r, "r")[4] - arr(base, "r")[4]) * 1e4, "{:.0f}")  # sign checked in check_claims


def emit(v: Values, central: dict, bound: dict, fixed: dict, open_: dict) -> None:
    assume = central["assumptions"]

    # ---- assumptions and calibration -------------------------------------
    v.put("Epsilon", assume["epsilon"], "{:.0f}")
    v.put("GammaBase", assume["gamma_base"], "{:.2f}")
    v.put("GammaShocked", assume["gamma_shocked"], "{:.3f}")
    v.put("LabourShareBase", (1 - assume["gamma_base"]) * 100, "{:.1f}")
    v.put("LabourShareShocked", (1 - assume["gamma_shocked"]) * 100, "{:.1f}")
    v.put("LabourShareFallPp",
          (assume["gamma_shocked"] - assume["gamma_base"]) * 100, "{:.1f}")
    v.put("GammaOnlyGainPct", assume["gamma_only_output_gain"] * 100, "{:.2f}")
    v.put("LabourShareLogChangePctAbs",
          abs(math.log((1 - assume["gamma_shocked"]) / (1 - assume["gamma_base"]))) * 100,
          "{:.1f}")
    v.put("ZShareShiftTfp", assume["Z_share_shift_tfp"], "{:.6f}")
    v.put("ZShareShift", assume["Z_share_shift"], "{:.6f}")
    v.put("TfpGainPct", scen.SHARE_SHIFT_TFP.tfp_gain * 100, "{:.1f}")
    v.put("GdpLevelTargetPct", scen.SHARE_SHIFT.gdp_level_change * 100, "{:.0f}")
    v.put("TGone", assume["tG1"], "{:.0f}")
    v.put("TGoneYear", scen.START + int(assume["tG1"]), "{:.0f}")
    v.put("GyAnnualPct", assume["g_y_annual"] * 100, "{:.1f}")
    v.put("AlphaG", central["baseline"]["alpha_G_used"], "{:.4f}")
    v.put("RampYears", scen.RAMP_YEARS, "{:.0f}")
    v.put("StartYear", scen.START, "{:.0f}")
    v.put("EndYear", scen.START + scen.RAMP_YEARS, "{:.0f}")

    # ---- closure parameters (stated beside every headline) ---------------
    v.put("ZetaKCentral", CENTRAL_ZETA_K, "{:.1f}")
    v.put("ZetaKBound", BOUND_ZETA_K, "{:.0f}")
    v.put("ZetaKOpen", OPEN_ZETA_K, "{:.1f}")
    for name, key, fmt in (("ZetaD", "zeta_D", "{:.1f}"),
                           ("WorldRatePct", "world_int_rate_annual", "{:.0f}")):
        vals = set()
        for src in (central, bound):
            for a in NEEDED:
                cl = src[a].get("closure")
                for d in (src[a], cl if isinstance(cl, dict) else {}):
                    if key in d:
                        vals.add(float(d[key]))
            cl = (src.get("assumptions") or {}).get("closure")
            cl = cl if isinstance(cl, dict) else {}
            if key in cl:
                vals.add(float(cl[key]))
        if len(vals) != 1:
            raise ResultsError(f"{key}: expected one value stated across the central and bound "
                               f"results, got {sorted(vals)}")
        val = vals.pop()
        v.put(name, val * 100 if name == "WorldRatePct" else val, fmt)

    # ---- provenance -------------------------------------------------------
    p = central["provenance"]
    v.put("OgcoreVersion", p["packages"]["ogcore"])
    v.put("PolicyengineVersion", p["packages"]["policyengine"])
    v.put("PolicyengineUkVersion", p["packages"]["policyengine-uk"])
    v.put("PythonVersion", p["python"])
    v.put("OgukSha", p["oguk_git_sha"][:7])
    v.put("RunDate", p["utc"])
    v.put("EnforceChecks", str(p["enforce_solution_checks"]))
    v.put("CentralSource", central["_source"].replace("_", r"\_"))
    v.put("BoundSource", bound["_source"].replace("_", r"\_"))
    v.put("CentralGniSource", central.get("_gni_source", central["_source"]).replace("_", r"\_"))

    # ---- baseline against the OBR (growth only; debt is reported as a gap) --
    cmp_ = obr_mod.compare(central)
    for year, g in zip(cmp_["years"], cmp_["growth"]):
        v.put(f"BaseGrowth{YEAR_WORD[year]}", g)
    v.put("BaseGrowthMean", cmp_["mean"])
    v.put("ObrGrowthMean", cmp_["obr_mean"], "{:.1f}")
    v.put("BaseObrGrowthDiffPp", cmp_["difference"], "{:+.2f}")
    v.put("ObrProductivityPct", obr_mod.OBR_BASELINE["productivity_medium_term"], "{:.1f}")
    v.put("ObrLabourSupplyPct", obr_mod.OBR_BASELINE["labour_supply_2030"], "{:.1f}")
    v.put("ObrPotentialThirtyPct", obr_mod.OBR_BASELINE["potential_output_2030"], "{:.1f}")
    v.put("ObrPotentialTwentySixPct", obr_mod.OBR_BASELINE["potential_output_2026"], "{:.1f}")
    v.put("ModelProductivityPct", (np.exp(cmp_["g_y"]) - 1) * 100)
    v.put("ModelPopGrowthThirtyPct", cmp_["g_n"][3] * 100)
    v.put("ModelBgrThirtyPct", (np.exp(cmp_["g_y"]) * (1 + cmp_["g_n"][3]) - 1) * 100)
    v.put("ModelBgrTwentySixPct", (np.exp(cmp_["g_y"]) * (1 + cmp_["g_n"][0]) - 1) * 100)
    v.put("BaseGrowthStartYear", cmp_["years"][0], "{:.0f}")
    v.put("BaseInterestThirtyPct", arr(central["baseline"], "r")[4] * 100, "{:.2f}")

    # ---- the two closures side by side ------------------------------------
    emit_closure(v, central, "Central", all_years=True)
    emit_closure(v, bound, "Bound", all_years=False)
    # zeta_K = 0.5: pre-rerun diagnostic, one wage figure only
    v.signed("ShareShiftTfpWageGapThirtyOpen", gap(open_, "share_shift_tfp_ramp", "w")[4])
    v.signed("ShareShiftWageGapThirtyOpen", gap(open_, "share_shift_ramp", "w")[4])

    # ---- central-closure detail, every variable and year -------------------
    res = central
    for arm, aw in ARM_WORD.items():
        s = rep.summary(arm, res)
        v.put(f"{aw}LabourShareFallPp", s["labour_share_fall_pp"], "{:.1f}")
        v.put(f"{aw}GrowthThirty", s["growth_2030_pct"])
        v.put(f"{aw}ZTerminal", res[arm]["Z_terminal"], "{:.6f}")
        v.put(f"{aw}GammaShape", res[arm]["gamma_shape"])
        v.put(f"{aw}ElapsedMin", res[arm]["elapsed_min"], "{:.0f}")
        for var, vw in VAR_WORD.items():
            g = gap(res, arm, var)
            for i, yw in enumerate(YEAR_WORD.values()):
                v.signed(f"{aw}{vw}Gap{yw}", g[i])
        # the wage identity: dln w = dln(1-gamma) + dln(Y/L)
        yl = (arr(res[arm], "Y") / arr(res[arm], "L")) / (
            arr(res["baseline"], "Y") / arr(res["baseline"], "L"))
        v.signed(f"{aw}OutputPerWorkerGapThirty", (yl[4] - 1) * 100)
        # labour income wL, the like-for-like comparator for Korinek et al.
        wl = gap(res, arm, "w") / 100 + 1
        wl = (wl * (gap(res, arm, "L") / 100 + 1) - 1) * 100
        v.signed(f"{aw}LabourIncomeGapThirty", wl[4])
        v.put(f"{aw}InterestThirtyPct", arr(res[arm], "r")[4] * 100, "{:.2f}")
        d = res[arm]["diagnostics"]
        v.put(f"{aw}RcMaxInterior", f"{d['rc_max_interior']:.1e}")
        v.put(f"{aw}RcTwentySixPctGdp", d["rc_first5"][0] / res[arm]["Y"][0] * 100)
        v.put(f"{aw}EulerMax", f"{max(d['euler_savings_max'], d['euler_labour_max']):.1e}")
        ty = lambda x: arr(x, "total_tax_revenue")[4] / arr(x, "Y")[4] * 100
        v.signed(f"{aw}TaxGdpChangePp", ty(res[arm]) - ty(res["baseline"]))
    b = res["baseline"]
    v.put("BaseRcMaxInterior", f"{b['diagnostics']['rc_max_interior']:.1e}")
    v.put("BaseRcTwentySixPctGdp", b["diagnostics"]["rc_first5"][0] / b["Y"][0] * 100)
    v.put("BaseEulerMax", f"{max(b['diagnostics']['euler_savings_max'], b['diagnostics']['euler_labour_max']):.1e}")
    v.put("BaseElapsedMin", b["elapsed_min"], "{:.0f}")
    for arm, aw in ARM_WORD.items():
        ls = rep.labour_share(res[arm]) * 100
        for i, yw in enumerate(YEAR_WORD.values()):
            v.put(f"{aw}LabourShare{yw}", ls[i], "{:.2f}")
    v.put("BaseLabourSharePct", rep.labour_share(b)[0] * 100, "{:.2f}")

    # ---- fixed-spending convention (pre-rerun baseline; appendix only) ------
    for arm, aw in ARM_WORD.items():
        for var, vw in (("Y", "Gdp"), ("K", "Capital"), ("w", "Wage"),
                        ("C", "Consumption"), ("total_tax_revenue", "Revenue"),
                        ("D", "Debt")):
            v.signed(f"Fix{aw}{vw}GapThirty", gap(fixed, arm, var)[4])
            v.signed(f"PreRerun{aw}{vw}GapThirty", gap(fixed["_shared"], arm, var)[4])

    # ---- Korinek et al. Table 3, "substantial" ---------------------------
    A = scen.ANTHROPIC_SUBSTANTIAL
    v.put("KorinekTableLabourShareFallPp", A["labour_share_fall_pp"], "{:.1f}")
    v.put("KorinekTableTfpPct", A["measured_tfp_pct"], "{:.1f}")
    v.put("KorinekTableGdpPct", A["gdp_above_no_ai_pct"], "{:.1f}")
    v.put("KorinekTableGrowthPct", A["gdp_growth_pct"], "{:.1f}")
    v.put("KorinekTableCapitalPct", A["capital_stock_pct"], "{:.1f}")
    v.put("KorinekTableUnemploymentPct", A["unemployment_pct"], "{:.1f}")

    # labour income in the source scenario: share 60.0c -> 56.1c with GDP +8.3%
    ls0 = KORINEK_LABOUR_SHARE_BASE
    v.signed("KorinekTableLabourIncomeGap",
             ((ls0 - A["labour_share_fall_pp"]) / ls0 * (1 + A["gdp_above_no_ai_pct"] / 100) - 1) * 100)
    # this model's production function at the source scenario's capital gap and
    # the model's own 2030 labour input (results_sanity_audit.md, #16)
    b, r = central["baseline"], central["share_shift_tfp_ramp"]
    g0, g1 = assume["gamma_base"], assume["gamma_shocked"]
    kb, lb = arr(b, "K")[4], arr(b, "L")[4]
    k = kb * (1 + A["capital_stock_pct"] / 100)
    y_cf = r["Z_terminal"] * k ** g1 * arr(r, "L")[4] ** (1 - g1)
    y_b = kb ** g0 * lb ** (1 - g0)
    if abs(arr(b, "Y")[4] / y_b - 1) > 1e-5:
        raise ResultsError("baseline 2030 output is not K^gamma L^(1-gamma); "
                           "the capital-gap counterfactual does not apply")
    cf = (y_cf / y_b - 1) * 100
    v.put("KorinekCapitalCounterfactualGdpPct", cf, "{:.1f}")
    model = gap(central, "share_shift_tfp_ramp", "Y")[4]
    if not (A["gdp_above_no_ai_pct"] - cf) < 0.25 * (A["gdp_above_no_ai_pct"] - model):
        raise ResultsError("'capital supply accounts for almost all of the GDP difference "
                           f"with Korinek et al.' no longer holds (counterfactual {cf:.2f}, "
                           f"model {model:.2f}, theirs {A['gdp_above_no_ai_pct']})")

    # ---- OBR effective-rate rule of thumb (Nov 2025 EFO para 2.64) ---------
    v.put("ObrEffRateLabourPct", OBR_EFF_RATE_LABOUR, "{:.0f}")
    v.put("ObrEffRateProfitsPct", OBR_EFF_RATE_PROFITS, "{:.0f}")
    v.signed("RuleOfThumbTaxPp",
             -(OBR_EFF_RATE_LABOUR - OBR_EFF_RATE_PROFITS) / 100
             * (assume["gamma_shocked"] - assume["gamma_base"]) * 100)

    # ---- which results these are: pre-rerun or R1-R4 -----------------------
    rerun = "debt_calibration" in assume and bool(assume.get("pretp"))
    r4 = assume.get("Z_share_shift_rule") == "equilibrium_gdp_gap"
    if rerun != r4:
        raise ResultsError("central file has only part of R1-R4 (debt calibration "
                           f"{'yes' if rerun else 'no'}, R4 Z rule {'yes' if r4 else 'no'})")
    # \genIfRerun{text for the R1-R4 results}{text for the pre-rerun results}
    v.put("IfRerun", "#1" if rerun else "#2")
    for src, label in ((bound, "bound"),):
        a = src.get("assumptions") or {}
        if ("debt_calibration" in a) != rerun:
            raise ResultsError(f"{label} and central are from different runs (rerun "
                               f"{'yes' if 'debt_calibration' in a else 'no'} vs "
                               f"{'yes' if rerun else 'no'})")

    # ---- the gamma patch's verification run (docs/firm_gamma_tv.md) ------
    v.put("PatchSites", 14, "{:.0f}")
    v.put("PatchEpsilonSites", 20, "{:.0f}")


def render(v: Values, sources: list[str]) -> str:
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    lines = [
        "% values_generated.tex — machine-generated by paper/make_values.py. DO NOT EDIT BY HAND.",
        f"% generated {stamp}",
        *[f"% source: {s}" for s in sources],
        "",
    ]
    for name, value in v.items():
        nargs = "[2]" if name == "IfRerun" else ""
        lines.append(r"\newcommand{\gen%s}%s{%s}" % (name, nargs, value))
    return "\n".join(lines) + "\n"


def check_claims(central: dict, bound: dict, open_: dict) -> None:
    """Sentences the paper states in words, not macros.  If a rerun breaks one,
    stop and make someone rewrite the sentence rather than publish it false."""
    fail = []
    for arm in ARMS:
        for res, cl in ((central, "0.1"), (bound, "0")):
            if not gni_gap(res, arm)[4] < gap(res, arm, "Y")[4]:
                fail.append(f"'GNI gap < GDP gap' fails for {arm} at zeta_K {cl}")
    # stated for share_shift_tfp only: after R4, share_shift's 2030 GDP gap is zero
    # at both closures by construction
    arm = "share_shift_tfp_ramp"
    if not (abs(gni_gap(central, arm)[4] - gni_gap(bound, arm)[4])
            < abs(gap(central, arm, "Y")[4] - gap(bound, arm, "Y")[4])):
        fail.append(f"'GNI moves less with the closure than GDP' fails for {arm}")
    w = gap(central, arm, "w")[4]
    share = abs(math.log((1 - central["assumptions"]["gamma_shocked"])
                         / (1 - central["assumptions"]["gamma_base"]))) * 100
    if not abs(w) < 0.25 * share:
        fail.append(f"'in share_shift_tfp the two wage terms nearly cancel' fails: wage {w:.2f}%")
    for arm in ARMS:
        rule = (OBR_EFF_RATE_LABOUR - OBR_EFF_RATE_PROFITS) / 100 * (
            central["assumptions"]["gamma_shocked"] - central["assumptions"]["gamma_base"]) * 100
        ty = lambda x: arr(x, "total_tax_revenue")[4] / arr(x, "Y")[4] * 100
        if not abs(ty(central[arm]) - ty(central["baseline"])) < rule:
            fail.append(f"'tax functions give smaller falls than the rule of thumb' fails for {arm}")
        b, r = central["baseline"], central[arm]
        dk = arr(r, "K")[4] - arr(b, "K")[4]
        share = (arr(r, "K_f")[4] - arr(b, "K_f")[4]) / dk * 100
        if not 65 <= share <= 85:
            fail.append(f"'about three-quarters of extra capital is foreign-owned' "
                        f"fails for {arm}: {share:.1f}%")
    for res, cl in ((central, "0.1"), (bound, "0"), (open_, "0.5")):
        if not gap(res, "share_shift_ramp", "w")[4] < 0:
            fail.append(f"'share_shift wage is below baseline' fails at zeta_K {cl}")
        for arm in ARMS:
            if not (gap(res, arm, "K")[4] > 0 and arr(res[arm], "r")[4] > arr(res["baseline"], "r")[4]):
                fail.append(f"'the return to capital and capital both rise' fails for {arm} at zeta_K {cl}")
    for arm in ARMS:
        ty = lambda x: arr(x, "total_tax_revenue")[4] / arr(x, "Y")[4]
        if not ty(central[arm]) < ty(central["baseline"]):
            fail.append(f"'revenue falls as a share of GDP' fails for {arm}")
    ty = lambda x: arr(x, "total_tax_revenue")[4] / arr(x, "Y")[4]
    a = "share_shift_tfp_ramp"
    if np.sign(ty(central[a]) - ty(central["baseline"])) == np.sign(ty(bound[a]) - ty(bound["baseline"])):
        fail.append("'the sign of the revenue/GDP change in share_shift_tfp depends on the closure' fails")
    A = scen.ANTHROPIC_SUBSTANTIAL
    for res, cl in ((central, "0.1"), (bound, "0")):
        if not (gap(res, "share_shift_tfp_ramp", "Y")[4] < A["gdp_above_no_ai_pct"]
                and gap(res, "share_shift_tfp_ramp", "K")[4] < A["capital_stock_pct"]):
            fail.append(f"'GDP and capital rise by less than in Korinek et al.' fails at zeta_K {cl}")
    signs = {np.sign(gap(x, "share_shift_tfp_ramp", "w")[4]) for x in (central, bound, open_)}
    if len(signs) < 2:
        fail.append("'the share_shift_tfp wage sign depends on the closure' fails")
    if fail:
        raise ResultsError("claims in the text no longer hold:\n  " + "\n  ".join(fail))


def build(args) -> tuple[Values, list[str]]:
    central = load_closure(args.central, "central (zeta_K = 0.1)")
    central = attach_gni(central, args.central_records)
    if stated_zeta_k(central) is None:
        # the pre-rerun data/scenarios.json states no closure; attach_gni has
        # just proved it is the zeta_K = 0.1 solve by its GDP path
        if "_gni_source" not in central:
            raise ResultsError(f"central: {central['_source']} does not state zeta_K")
    else:
        require_zeta_k(central, CENTRAL_ZETA_K, "central")
    bound = load_closure(args.bound, "closed-capital bound (zeta_K = 0)")
    require_zeta_k(bound, BOUND_ZETA_K, "bound")
    for a in NEEDED:
        if not has_foreign_positions(bound[a]):
            raise ResultsError(f"bound: {bound['_source']} {a} carries no GNI or foreign positions")
    open_ = load_closure(args.open_diag, "zeta_K = 0.5 diagnostic")
    require_zeta_k(open_, OPEN_ZETA_K, "zeta_K = 0.5 diagnostic")
    fixed = load_closure(args.fixed, "fixed spending")
    fixed["_shared"] = load_closure(DEFAULT_CENTRAL, "pre-rerun shared-share results")
    for var in ("Y", "K", "L"):
        dev = float(np.max(np.abs(arr(fixed["baseline"], var) / arr(fixed["_shared"]["baseline"], var) - 1)))
        if dev > 1e-9:
            raise ResultsError(f"fixed-spending file {fixed['_source']} and {fixed['_shared']['_source']} "
                               f"have different baselines ({var} differs by {dev:.2e}); the "
                               "appendix table would compare two runs")
    check_claims(central, bound, open_)
    v = Values()
    emit(v, central, bound, fixed, open_)
    sources = [f"central  {central['_source']}"
               + (f" (GNI from {central['_gni_source']})" if "_gni_source" in central else ""),
               f"bound    {bound['_source']}",
               f"fixed    {fixed['_source']}",
               f"zeta_K=0.5 diagnostic  {open_['_source']}"]
    return v, sources


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--central", type=Path, default=DEFAULT_CENTRAL,
                    help="zeta_K = 0.1 results: assembled .json or closure-record prefix")
    ap.add_argument("--bound", type=Path, default=DEFAULT_BOUND,
                    help="zeta_K = 0 results: assembled .json or closure-record prefix")
    ap.add_argument("--central-records", type=Path, default=DEFAULT_CENTRAL_RECORDS,
                    help="zeta_K = 0.1 closure records, used for GNI only when the "
                         "central file carries no foreign positions")
    ap.add_argument("--fixed", type=Path, default=DEFAULT_FIXED,
                    help="fixed-spending results (pre-rerun baseline; appendix only)")
    ap.add_argument("--open-diag", type=Path, default=DIAG_OPEN,
                    help="zeta_K = 0.5 closure records (pre-rerun diagnostic)")
    ap.add_argument("--check", action="store_true",
                    help="write nothing; exit 1 if values_generated.tex is stale")
    args = ap.parse_args()

    v, sources = build(args)
    text = render(v, sources)
    if args.check:
        current = OUT.read_text() if OUT.exists() else ""
        strip = lambda s: "\n".join(l for l in s.splitlines() if not l.startswith("% generated"))
        if strip(current) != strip(text):
            print("values_generated.tex is stale; run python paper/make_values.py")
            return 1
        print(f"values_generated.tex is up to date ({len(v)} macros)")
        return 0
    OUT.write_text(text)
    print(f"wrote {OUT.relative_to(ROOT)} ({len(v)} macros)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
