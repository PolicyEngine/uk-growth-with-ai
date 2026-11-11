"""Emit paper/values_generated.tex from the committed results under results/.

Every number that appears in the paper's text is a LaTeX macro defined here, so
no result is ever typed into a .tex file by hand.  Run from the repo root:

    python paper/make_values.py                 # writes paper/values_generated.tex
    python paper/make_values.py --check         # exits 1 if the file is stale

Re-trending, the labour share and the per-arm summary come from
``uk_growth_with_ai.report``, the OBR baseline figures from
``uk_growth_with_ai.obr`` and the Korinek et al. Table 3 column from
``uk_growth_with_ai.scenarios``, so the paper, the dashboard and the CLI
tables are provably the same numbers.

Arms present in the committed results are the two RAMP arms and the baseline.
Macros that would need a STEP arm are emitted as \\GENMISSING, which errors at
LaTeX build time by design (see .audit/08-paper-draft.md).
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from uk_growth_with_ai import obr as obr_mod  # noqa: E402
from uk_growth_with_ai.data_access import normalise_arms  # noqa: E402
from uk_growth_with_ai import report as rep  # noqa: E402
from uk_growth_with_ai import scenarios as scen  # noqa: E402

OUT = ROOT / "paper" / "values_generated.tex"
MAIN = ROOT / "results" / "scenarios.json"
FIXED = ROOT / "results" / "scenarios_fixed_spending.json"
BASECHECK = ROOT / "results" / "baseline_check.json"

YEAR_WORD = {2026: "TwentySix", 2027: "TwentySeven", 2028: "TwentyEight",
             2029: "TwentyNine", 2030: "Thirty"}
# "Obr" is deliberately NOT used as an arm word: the macros \genObrGrowthMean,
# \genObrProductivityPct etc. are genuine OBR benchmark figures, and the arm
# formerly called obr_ramp does not reproduce the OBR's Box 2.2 case.
ARM_WORD = {"anthropic_ramp": "Anth", "zero_tfp_ramp": "ZeroTfp"}
VAR_WORD = {"Y": "Gdp", "K": "Capital", "L": "Labour", "w": "Wage",
            "C": "Consumption", "I": "Investment", "G": "Spending",
            "D": "Debt", "total_tax_revenue": "Revenue"}

MISSING = r"\GENMISSING"


class Values(dict):
    def put(self, name: str, value, fmt: str = "{:.2f}") -> None:
        if name in self:
            raise KeyError(f"duplicate macro: {name}")
        if value is None:
            self[name] = MISSING
            return
        self[name] = fmt.format(value) if not isinstance(value, str) else value


def gap(res: dict, arm: str, var: str) -> np.ndarray:
    return (np.array(res[arm][var]) / np.array(res["baseline"][var]) - 1) * 100


def emit(v: Values) -> None:
    main = normalise_arms(json.loads(MAIN.read_text()))
    fixed = normalise_arms(json.loads(FIXED.read_text()))
    basechk = json.loads(BASECHECK.read_text())
    assume = main["assumptions"]

    # ---- assumptions and calibration -------------------------------------
    v.put("Epsilon", assume["epsilon"], "{:.0f}")
    v.put("GammaBase", assume["gamma_base"], "{:.2f}")
    v.put("GammaShocked", assume["gamma_shocked"], "{:.3f}")
    v.put("LabourShareBase", (1 - assume["gamma_base"]) * 100, "{:.1f}")
    v.put("LabourShareShocked", (1 - assume["gamma_shocked"]) * 100, "{:.1f}")
    v.put("LabourShareFallPp",
          (assume["gamma_shocked"] - assume["gamma_base"]) * 100, "{:.1f}")
    v.put("GammaOnlyGainPct", assume["gamma_only_output_gain"] * 100, "{:.2f}")
    import math as _m
    v.put("LabourShareLogChangePctAbs",
          abs(_m.log((1 - assume["gamma_shocked"]) / (1 - assume["gamma_base"]))) * 100,
          "{:.1f}")
    v.put("ZAnthropic", assume["Z_anthropic"], "{:.6f}")
    v.put("ZZeroTfp", assume["Z_zero_tfp"], "{:.6f}")
    v.put("TfpGainPct", scen.ANTHROPIC.tfp_gain * 100, "{:.1f}")
    v.put("GdpLevelTargetPct", scen.ZERO_TFP.gdp_level_change * 100, "{:.0f}")
    v.put("TGone", assume["tG1"], "{:.0f}")
    v.put("TGoneYear", scen.START + int(assume["tG1"]), "{:.0f}")
    v.put("GyAnnualPct", assume["g_y_annual"] * 100, "{:.1f}")
    v.put("AlphaG", main["baseline"]["alpha_G_used"], "{:.4f}")
    v.put("AlphaGPct", main["baseline"]["alpha_G_used"] * 100, "{:.1f}")
    v.put("RampYears", scen.RAMP_YEARS, "{:.0f}")
    v.put("StartYear", scen.START, "{:.0f}")
    v.put("EndYear", scen.START + scen.RAMP_YEARS, "{:.0f}")
    v.put("Nper", scen.NPER, "{:.0f}")

    # ---- provenance -------------------------------------------------------
    p = main["provenance"]
    v.put("OgcoreVersion", p["packages"]["ogcore"])
    v.put("PolicyengineVersion", p["packages"]["policyengine"])
    v.put("PolicyengineUkVersion", p["packages"]["policyengine-uk"])
    v.put("PythonVersion", p["python"])
    v.put("OgukSha", p["oguk_git_sha"][:7])
    v.put("RunDate", p["utc"])
    v.put("EnforceChecks", str(p["enforce_solution_checks"]))

    # ---- baseline against the OBR ----------------------------------------
    cmp_ = obr_mod.compare(main)
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
    v.put("ModelBgrThirtyPct",
          (np.exp(cmp_["g_y"]) * (1 + cmp_["g_n"][3]) - 1) * 100)
    v.put("ModelBgrTwentySixPct",
          (np.exp(cmp_["g_y"]) * (1 + cmp_["g_n"][0]) - 1) * 100)
    v.put("BaselineDebtRatioTwentySix",
          main["baseline"]["D"][0] / main["baseline"]["Y"][0] * 100, "{:.1f}")
    v.put("BaselineCheckElapsedMin", basechk["baseline"]["elapsed_min"], "{:.0f}")
    v.put("BaseGrowthStartYear", cmp_["years"][0], "{:.0f}")
    v.put("BaseInterestThirtyPct", main["baseline"]["r"][4] * 100, "{:.2f}")

    # ---- scenario results, both spending conventions ---------------------
    for tag, res in (("", main), ("Fix", fixed)):
        for arm, aw in ARM_WORD.items():
            s = rep.summary(arm, res)
            pre = f"{tag}{aw}"
            v.put(f"{pre}GdpGapThirtySummary", s["gdp_gap_2030_pct"], "{:+.2f}")
            v.put(f"{pre}CapitalGapThirtySummary", s["capital_gap_2030_pct"], "{:+.2f}")
            v.put(f"{pre}LabourShareFallPp", s["labour_share_fall_pp"], "{:.1f}")
            v.put(f"{pre}GrowthThirty", s["growth_2030_pct"])
            v.put(f"{pre}ZTerminal", res[arm]["Z_terminal"], "{:.6f}")
            v.put(f"{pre}GammaShape", res[arm]["gamma_shape"])
            v.put(f"{pre}SsLabourShare", res[arm]["ss_labour_share"] * 100, "{:.1f}")
            v.put(f"{pre}ElapsedMin", res[arm]["elapsed_min"], "{:.0f}")
            for var, vw in VAR_WORD.items():
                g = gap(res, arm, var)
                for i, year in enumerate(YEAR_WORD):
                    # signed, 2dp: for tables. unsigned magnitude, 1dp: for
                    # prose, where a verb ("falls", "above") carries the sign.
                    v.put(f"{pre}{vw}Gap{YEAR_WORD[year]}", g[i], "{:+.2f}")
                    v.put(f"{pre}{vw}Gap{YEAR_WORD[year]}Abs", abs(g[i]), "{:.1f}")
            # the wage identity: dln w = dln(1-gamma) + dln(Y/L)
            yl = (np.array(res[arm]["Y"]) / np.array(res[arm]["L"])) / (
                np.array(res["baseline"]["Y"]) / np.array(res["baseline"]["L"]))
            v.put(f"{pre}OutputPerWorkerGapThirty", (yl[4] - 1) * 100, "{:+.2f}")
            v.put(f"{pre}OutputPerWorkerGapThirtyAbs", abs((yl[4] - 1) * 100), "{:.1f}")
            v.put(f"{pre}InterestThirtyPct", res[arm]["r"][4] * 100, "{:.2f}")
            # diagnostics
            d = res[arm]["diagnostics"]
            v.put(f"{pre}RcMaxInterior", f"{d['rc_max_interior']:.1e}")
            v.put(f"{pre}RcTwentySixPctGdp",
                  d["rc_first5"][0] / res[arm]["Y"][0] * 100)
            v.put(f"{pre}EulerMax",
                  f"{max(d['euler_savings_max'], d['euler_labour_max']):.1e}")
        # the baseline arm's own diagnostics and growth
        b = res["baseline"]
        v.put(f"{tag}BaseRcMaxInterior", f"{b['diagnostics']['rc_max_interior']:.1e}")
        v.put(f"{tag}BaseRcTwentySixPctGdp",
              b["diagnostics"]["rc_first5"][0] / b["Y"][0] * 100)
        v.put(f"{tag}BaseEulerMax",
              f"{max(b['diagnostics']['euler_savings_max'], b['diagnostics']['euler_labour_max']):.1e}")
        v.put(f"{tag}BaseElapsedMin", b["elapsed_min"], "{:.0f}")

    # labour-share path, ramp arms (identical across arms by construction)
    for arm, aw in ARM_WORD.items():
        ls = rep.labour_share(main[arm]) * 100
        for i, year in enumerate(YEAR_WORD):
            v.put(f"{aw}LabourShare{YEAR_WORD[year]}", ls[i], "{:.2f}")
    bls = rep.labour_share(main["baseline"]) * 100
    v.put("BaseLabourSharePct", bls[0], "{:.2f}")

    # ---- Korinek et al. Table 3, "substantial" ---------------------------
    A = scen.ANTHROPIC_SUBSTANTIAL
    v.put("AnthropicTableLabourShareFallPp", A["labour_share_fall_pp"], "{:.1f}")
    v.put("AnthropicTableTfpPct", A["measured_tfp_pct"], "{:.1f}")
    v.put("AnthropicTableGdpPct", A["gdp_above_no_ai_pct"], "{:.1f}")
    v.put("AnthropicTableGrowthPct", A["gdp_growth_pct"], "{:.1f}")
    v.put("AnthropicTableCapitalPct", A["capital_stock_pct"], "{:.1f}")
    v.put("AnthropicTableUnemploymentPct", A["unemployment_pct"], "{:.1f}")

    # ---- step arms: not in the committed results -------------------------
    # `run --shapes both` writes anthropic_step / zero_tfp_step; until that re-run
    # lands these are deliberately build-time errors rather than literals.
    for aw in ARM_WORD.values():
        v.put(f"{aw}StepGdpGapThirty", None)
        v.put(f"{aw}StepGrowthThirty", None)
        v.put(f"{aw}StepGdpGapTwentySix", None)

    # ---- the gamma patch's verification run (docs/firm_gamma_tv.md) ------
    # Regression evidence lives in the patch note, not in a results file.
    v.put("PatchSites", 14, "{:.0f}")
    v.put("PatchEpsilonSites", 20, "{:.0f}")


def render(v: Values) -> str:
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    lines = [
        "% values_generated.tex — machine-generated by paper/make_values.py",
        f"% generated {stamp} from the committed files under results/. DO NOT EDIT BY HAND.",
        r"% \GENMISSING marks values whose canonical source was absent at emit time;",
        "% it errors at LaTeX build time by design.",
        r"\newcommand{\GENMISSING}{\errmessage{make_values: missing canonical result}}",
        "",
    ]
    for name, value in v.items():
        lines.append(r"\newcommand{\gen%s}{%s}" % (name, value))
    return "\n".join(lines) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true",
                    help="write nothing; exit 1 if values_generated.tex is stale")
    args = ap.parse_args()

    v = Values()
    emit(v)
    text = render(v)
    if args.check:
        current = OUT.read_text() if OUT.exists() else ""
        # ignore the generation stamp on line 2
        strip = lambda s: "\n".join(l for l in s.splitlines() if not l.startswith("% generated"))
        if strip(current) != strip(text):
            print("values_generated.tex is stale; run python paper/make_values.py")
            return 1
        print("values_generated.tex is up to date")
        return 0
    OUT.write_text(text)
    print(f"wrote {OUT} ({len(v)} macros)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
