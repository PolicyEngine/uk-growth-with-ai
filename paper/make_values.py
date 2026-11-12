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
    for a in NEEDED:
        r = res[a]
        for z in (r.get("zeta_K"), (r.get("closure") or {}).get("zeta_K")):
            if z is not None:
                found.add(float(z))
    a = res.get("assumptions") or {}
    for z in (a.get("zeta_K"), (a.get("closure") or {}).get("zeta_K")):
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
        """Signed value, its magnitude, and a direction word, so prose that reads
        "\\genXAbs{} per cent \\genXDir{} baseline" stays true if the sign flips."""
        txt = fmt_signed.format(x)
        if txt[0] in "+-":
            txt = f"${txt[0]}${txt[1:]}"   # typeset sign, not a hyphen
        self.put(name, txt)
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
        # extra national saving (GNI - C - G) over extra investment, 2026-29
        s = lambda x: gni(x) - arr(x, "C") - arr(x, "G")
        ds = (s(r) - s(base))[:4].sum()
        di = (arr(r, "I") - arr(base, "I"))[:4].sum()
        v.put(f"{aw}SavingShare{cw}", ds / di, "{:.2f}")
        v.signed(f"{aw}WageGapThirty{cw}", gap(res, arm, "w")[4])
        v.signed(f"{aw}CapitalGapThirty{cw}", gap(res, arm, "K")[4])
        v.put(f"{aw}InterestChangeBp{cw}",
              (arr(r, "r")[4] - arr(base, "r")[4]) * 1e4, "{:+.0f}")


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
                for d in (src[a], src[a].get("closure") or {}):
                    if key in d:
                        vals.add(float(d[key]))
            cl = (src.get("assumptions") or {}).get("closure") or {}
            if key in cl:
                vals.add(float(cl[key]))
        if len(vals) != 1:
            raise ResultsError(f"{key}: expected one value across the closures, got {sorted(vals)}")
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
        # announcement year: 2026 gap as a share of the 2030 gap
        g_y = gap(res, arm, "Y")
        v.put(f"{aw}AnnouncementSharePct", g_y[0] / g_y[4] * 100 if g_y[4] else 0.0, "{:.0f}")
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
        lines.append(r"\newcommand{\gen%s}{%s}" % (name, value))
    return "\n".join(lines) + "\n"


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
