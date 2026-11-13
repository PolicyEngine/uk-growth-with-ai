"""Emit paper/values_generated.tex from the committed 2028-surprise solves.

Every number in the paper's text is a LaTeX macro defined here, so no result is
typed into a .tex file by hand.  Run from the repo root:

    python paper/make_values.py                 # writes paper/values_generated.tex
    python paper/make_values.py --check         # exits 1 if the file is stale

Design (docs/surprise_2028.md, docs/uk_calibration.md, #27):

* AI is an unanticipated shock announced at the start of 2028.  2026-27 equal
  the no-AI (OBR-central) path; gamma and Z ramp with weights 0/.25/.5/.75/1
  over 2027-2031; the headline year is 2031.
* Four scenarios: UK low / UK central (headline) / UK high, calibrated to
  IMF UK 2026, OBR FRS 2026 and BP9, and Korinek et al.'s US "substantial"
  case as the labelled upper scenario.
* Three arms per scenario: "automation + productivity" (``_share_shift_tfp_ramp``,
  the main arm), "automation, technology unchanged" (``_share_shift_ramp_zfixed``)
  and the "OBR-style stress test: no output gain" (the accepted R4 iteration,
  ``surprise.accepted_r4``; 2031 GDP held at the no-shock path).
* Two closures: zeta_K = 0.1 (central) and 0 (closed-capital bound).
* Gaps are measured against the gated no-shock restart (``surprise.reference_ext``),
  by calendar year from each record's 2026-2036 ``series``.
* Debt/GDP is quoted with its 2036 value; 2036 is the debt rule's first year,
  so no other series is quoted for 2036 (checked: only Debt macros may carry
  a ThirtySix suffix).

The per-solve records are read from ``analysis/surprise/output/<closure>/``.
A record that is missing is a hard error, EXCEPT for the explicit allowlist
``PENDING_OK``: the debt-neutral (``_dn``) and fixed-spending (``_fs``)
variants, and UK low / UK high at zeta_K = 0, which run overnight.  Their
macros are emitted as ``\\pend{}`` (red "pending" in drafts, a build error with
``\\submissiontrue``).  A variant record that is present but fails its sanity
report or its debt-neutral check also stays pending, with the reason printed.

Every sentence the paper states in words is checked in ``check_claims``.  If a
new solve breaks one, the build stops: rewrite the sentence, do not publish it.
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
from uk_growth_with_ai import scenarios as scen  # noqa: E402
from uk_growth_with_ai import surprise as sp  # noqa: E402
from uk_growth_with_ai.data_access import DATA, normalise_arms  # noqa: E402

OUT = ROOT / "paper" / "values_generated.tex"
OUTDIR = ROOT / sp.OUTDIR
NICS = ROOT / "analysis" / "nics"
# The committed R1-R4 baseline the surprise runs restart from (zeta_K = 0.1).
# Read for its calibration and for the OBR growth comparison only; the gaps
# are against the continuation.
BASELINE_FILE = DATA / "scenarios.json"

CLOSURES = {"zk0.1": ("Central", 0.1), "zk0": ("Bound", 0.0)}
SCEN = {"uk_low": "UkLow", "uk_central": "UkCentral", "uk_high": "UkHigh",
        "korinek": "Korinek"}
UK = ("uk_low", "uk_central", "uk_high")
ARMS = {"tfp": "Main", "zfixed": "Flat", "stress": "Stress"}
VARIANTS = {"": "", "dn": "Dn", "fs": "Fs"}
# Solves allowed to be missing tonight (#27 lock queue, 12 Nov 23:55).
PENDING_OK = {("zk0", "uk_low", ""), ("zk0", "uk_high", "")} | {
    (cl, sc, v) for cl in CLOSURES for sc in SCEN for v in ("dn", "fs")}

W = sp.window()
HEAD = W["headline_year"]            # 2031
SHOCK = W["surprise_year"]           # 2028
DEBT_RULE = W["debt_rule_year"]      # 2036
LAST_FLOW = DEBT_RULE - 1            # 2035: no flow is quoted for 2036
START = scen.START                   # 2026
YW = {2026: "TwentySix", 2027: "TwentySeven", 2028: "TwentyEight", 2029: "TwentyNine",
      2030: "Thirty", 2031: "ThirtyOne", 2032: "ThirtyTwo", 2033: "ThirtyThree",
      2034: "ThirtyFour", 2035: "ThirtyFive", 2036: "ThirtySix"}
G0 = scen.G_BASE

# Published benchmarks.
OBR_EFF_RATE_LABOUR, OBR_EFF_RATE_PROFITS = 40.0, 17.0     # Nov 2025 EFO para 2.64
OBR_TAX_PER_PP = (0.19, 0.23)                              # FRS 2026 Box 4.1 / EFO rates
OBR_WEDGE_PP = (19.0, 23.0)                                # FRS 46-27, EFO 40-17
IMF_OUTPUT_Y4_PCT, IMF_OUTPUT_Y5_PCT = 2.52, 3.26          # SIP/2026/072, uk_calibration.md
IMF_TFP_Y4_PCT = 0.42
KORINEK_T5_WAGE_PCT = {"One": -1.6, "Three": 2.1, "Six": 3.7, "Inf": 5.6}
PE = r"\pend{}"


class ResultsError(SystemExit):
    """Any defect in the inputs: exits non-zero with a message, never a placeholder."""

    def __init__(self, msg: str):
        super().__init__(f"make_values: {msg}")


# --- loading ------------------------------------------------------------------

def ix(year: int) -> int:
    return year - START


def s_(rec: dict, k: str, year: int) -> float:
    if rec["years_series"][0] != START:
        raise ResultsError(f"{rec.get('label')}: series does not start in {START}")
    return float(rec["series"][k][ix(year)])


def labour_share(rec, year):
    return s_(rec, "w", year) * s_(rec, "L", year) / s_(rec, "Y", year)


def validate(rec: dict, ref: dict, base_ext: dict, cl: str, sc: str | None) -> None:
    """The record is the solve it claims to be (raises on any failure)."""
    lab = rec.get("label", "?")
    z = (rec.get("closure") or {}).get("zeta_K")
    if z is None or not math.isclose(float(z), CLOSURES[cl][1], abs_tol=1e-12):
        raise ResultsError(f"{cl}/{lab}: zeta_K {z}, expected {CLOSURES[cl][1]}")
    if rec.get("closure_label") != cl:
        raise ResultsError(f"{cl}/{lab}: closure_label {rec.get('closure_label')}")
    if not (rec.get("surprise") or {}).get("predetermined", {}).get("ok"):
        raise ResultsError(f"{cl}/{lab}: predetermined 2028 stocks do not match the baseline")
    if not rec["diagnostics"].get("tpi_converged"):
        raise ResultsError(f"{cl}/{lab}: TPI did not converge")
    if rec.get("run_period0_year") != SHOCK:
        raise ResultsError(f"{cl}/{lab}: run starts in {rec.get('run_period0_year')}, not {SHOCK}")
    for v in ("Y", "K", "L", "C", "D", "w", "r", "GNI", "NNI"):
        for y in (2026, 2027):
            if s_(rec, v, y) != float(base_ext["series"][v][ix(y)]):
                raise ResultsError(f"{cl}/{lab}: {v} in {y} differs from the baseline")
    if sc is None:
        return
    fall = sp.scenario_grid()[sc]["labour_share_fall_pp"]
    if abs(rec["gamma_terminal"] - (G0 + fall / 100)) > 1e-9:
        raise ResultsError(f"{cl}/{lab}: gamma_terminal {rec['gamma_terminal']} for a {fall}pp fall")
    d = (labour_share(rec, HEAD) - labour_share(ref, HEAD)) * 100
    if abs(d + fall) > 0.02:
        raise ResultsError(f"{cl}/{lab}: {HEAD} labour-share gap {d:.3f}pp, target -{fall}")


def sanity_ok(cl: str, label: str) -> tuple[bool, str]:
    f = OUTDIR / cl / f"{label}.sanity.json"
    if not f.is_file():
        return False, "no sanity report"
    rep = json.loads(f.read_text())
    return (bool(rep.get("ok")), "; ".join(map(str, rep.get("fails") or [])) or "sanity failed")


def load_all() -> dict:
    """{cl: {"ref", "base_ext", "cont", "arms": {(sc, v): {arm: rec | None}}, "why": {...}}}"""
    out = {}
    for cl in CLOSURES:
        base_ext = sp.load_base_ext(OUTDIR, cl)
        gate = sp.read_gate(OUTDIR, cl)
        if gate is None or gate.get("reference") != "continuation":
            raise ResultsError(f"{cl}: the continuation gate is not approved with reference "
                               f"'continuation' ({gate})")
        ref = sp.reference_ext(OUTDIR, cl, base_ext)
        done = sp.load(OUTDIR, cl)
        cont = done["continuation"]
        validate(cont, ref, base_ext, cl, None)
        arms, why = {}, {}
        for sc in SCEN:
            for v in VARIANTS:
                k = sp._keys(v, sc)
                recs = {"tfp": done.get(k["tfp"]), "zfixed": done.get(k["zfixed"]),
                        "stress": sp.accepted_r4(done, ref, v, scenario=sc)}
                for a, r in list(recs.items()):
                    if r is None:
                        continue
                    ok, reason = sanity_ok(cl, r["label"])
                    if v == "dn" and not (r.get("dn_check") or {}).get("ok"):
                        ok, reason = False, "debt-neutral check failed"
                    if not ok:
                        if v == "":
                            raise ResultsError(f"{cl}/{r['label']}: {reason}")
                        print(f"pending {cl}/{r['label']}: {reason}", file=sys.stderr)
                        recs[a] = None
                        continue
                    validate(r, ref, base_ext, cl, sc)
                missing = [a for a, r in recs.items() if r is None]
                if missing and (cl, sc, v) not in PENDING_OK:
                    raise ResultsError(f"{cl}: {sc}{'_' + v if v else ''} lacks arm(s) {missing} "
                                       f"and is not on the pending allowlist")
                if missing and v == "" and len(missing) < 3:
                    # a partial set at the bound: report none of it until all three exist
                    recs = {a: None for a in recs}
                arms[(sc, v)] = recs
        out[cl] = {"ref": ref, "base_ext": base_ext, "cont": cont, "arms": arms}
    return out


# --- measures -----------------------------------------------------------------

def pct(rec, ref, v, y):
    return (s_(rec, v, y) / s_(ref, v, y) - 1) * 100


def debt_pp(rec, ref, y):
    return (s_(rec, "D", y) / s_(rec, "Y", y) - s_(ref, "D", y) / s_(ref, "Y", y)) * 100


def tax_pp(rec, ref, y, base="total_tax_revenue"):
    return (s_(rec, base, y) / s_(rec, "Y", y) - s_(ref, base, y) / s_(ref, "Y", y)) * 100


def payroll_pp(rec, ref, y, tau):
    """Employer NICs (tau_payroll on wL), booked inside iit_revenue (frac_tax_payroll = 0)."""
    return tau * (labour_share(rec, y) - labour_share(ref, y)) * 100


def measures(rec, ref, y) -> dict:
    m = {v: pct(rec, ref, k, y) for v, k in (
        ("Gdp", "Y"), ("Gni", "GNI"), ("Nni", "NNI"), ("Capital", "K"), ("Labour", "L"),
        ("Wage", "w"), ("Consumption", "C"), ("Investment", "I"))}
    m["InterestBp"] = (s_(rec, "r", y) - s_(ref, "r", y)) * 1e4
    m["DebtPp"] = debt_pp(rec, ref, y)
    m["TaxGdpPp"] = tax_pp(rec, ref, y)
    m["LabourSharePp"] = (labour_share(rec, y) - labour_share(ref, y)) * 100
    return m


FLOW_VARS = ("Gdp", "Gni", "Nni", "Capital", "Labour", "Wage", "Consumption",
             "Investment", "InterestBp", "TaxGdpPp")


def sci(x: float) -> str:
    m, e = f"{x:.1e}".split("e")
    return rf"${m}\times 10^{{{int(e)}}}$"


# --- macro store --------------------------------------------------------------

class Values(dict):
    def put(self, name: str, value, fmt: str = "{:.2f}") -> None:
        if name in self:
            raise KeyError(f"duplicate macro: {name}")
        if value is None or (isinstance(value, float) and not math.isfinite(value)):
            raise ResultsError(f"no value for macro \\gen{name}")
        self[name] = value if isinstance(value, str) else fmt.format(value)

    def signed(self, name: str, x, fmt_signed="{:+.2f}", fmt_abs="{:.2f}",
               up="above", down="below") -> None:
        """Signed value (2dp; Short = 1dp), its magnitude and a direction word, so prose
        that reads "\\genXAbs{} per cent \\genXDir{} ..." stays true if the sign flips.
        ``x is None`` emits the pending marker for every form."""
        if x is None:
            for suf in ("", "Short", "Abs", "Dir", "Verb"):
                self.put(name + suf, PE)
            return

        def typeset(t):   # typeset sign, not a hyphen; no sign on a printed zero
            if t.lstrip("+-").strip("0.") == "":
                return t.lstrip("+-")
            return f"${t[0]}${t[1:]}" if t[0] in "+-" else t
        self.put(name, typeset(fmt_signed.format(x)))
        self.put(name + "Short", typeset(("{:+.2f}" if abs(x) < 0.1 else "{:+.1f}").format(x)))
        self.put(name + "Abs", abs(x), fmt_abs)
        self.put(name + "Dir", up if x >= 0 else down)
        self.put(name + "Verb", "rises" if x >= 0 else "falls")


# --- emitters -----------------------------------------------------------------

def emit_grid(v: Values, R: dict) -> None:
    """Scenario x arm x closure x variant: 2031 gaps, 2028 response, debt 2036."""
    for cl, (cw, _) in CLOSURES.items():
        ref = R[cl]["ref"]
        for (sc, var), recs in R[cl]["arms"].items():
            for a, aw in ARMS.items():
                rec = recs[a]
                pre = f"{SCEN[sc]}{aw}{VARIANTS[var]}"
                m = measures(rec, ref, HEAD) if rec else {}
                for k in FLOW_VARS + ("DebtPp", "LabourSharePp"):
                    v.signed(f"{pre}{k}{cw}", m.get(k) if rec else None,
                             fmt_signed="{:+.0f}" if k == "InterestBp" else "{:+.2f}",
                             fmt_abs="{:.0f}" if k == "InterestBp" else "{:.2f}")
                v.signed(f"{pre}DebtPpThirtySix{cw}", debt_pp(rec, ref, DEBT_RULE) if rec else None)
                if var:
                    continue
                m28 = measures(rec, ref, SHOCK) if rec else {}
                for k in ("Gdp", "Capital", "Labour", "Consumption", "Investment"):
                    v.signed(f"{pre}{k}TwentyEight{cw}", m28.get(k) if rec else None)
                v.signed(f"{pre}GdpThirtyFive{cw}", pct(rec, ref, "Y", LAST_FLOW) if rec else None)
                v.put(f"{pre}Z{cw}", f"{rec['Z_terminal']:.4f}" if rec else PE)
                v.signed(f"{pre}TaxPerPp{cw}",
                         m["TaxGdpPp"] / sp.scenario_grid()[sc]["labour_share_fall_pp"]
                         if rec else None, fmt_signed="{:+.3f}", fmt_abs="{:.2f}")


def emit(v: Values, R: dict) -> None:
    grid = sp.scenario_grid()
    base = normalise_arms(json.loads(BASELINE_FILE.read_text()))
    assume = base["assumptions"]
    # the surprise runs restart from this baseline: its committed series must match
    be = R["zk0.1"]["base_ext"]["series"]
    dev = max(abs(be["Y"][i] / base["baseline"]["Y"][i] - 1) for i in range(5))
    if dev > 1e-9:
        raise ResultsError(f"baseline_ext.json is not {BASELINE_FILE.name}'s baseline ({dev:.1e})")

    # ---- design and calibration -----------------------------------------
    v.put("StartYear", START, "{:.0f}")
    v.put("ShockYear", SHOCK, "{:.0f}")
    v.put("RampZeroYear", W["ramp_zero_year"], "{:.0f}")
    v.put("HeadYear", HEAD, "{:.0f}")
    v.put("DebtRuleYear", DEBT_RULE, "{:.0f}")
    v.put("LastFlowYear", LAST_FLOW, "{:.0f}")
    v.put("RampYears", scen.RAMP_YEARS, "{:.0f}")
    v.put("Epsilon", assume["epsilon"], "{:.0f}")
    v.put("GammaBase", G0, "{:.2f}")
    v.put("LabourShareBase", (1 - G0) * 100, "{:.0f}")
    v.put("GyAnnualPct", assume["g_y_annual"] * 100, "{:.1f}")
    v.put("AlphaG", base["baseline"]["alpha_G_used"], "{:.3f}")
    v.put("ObrDebtThirtyPct", assume["debt_calibration"]["target_2030_pct"], "{:.1f}")
    v.put("TGone", assume["tG1"], "{:.0f}")
    v.put("Delta", R["zk0.1"]["cont"]["delta"], "{:.3f}")
    v.put("TauPayrollPct", R["zk0.1"]["cont"]["tau_payroll"] * 100, "{:.0f}")
    for sc, sw in SCEN.items():
        g = grid[sc]
        v.put(f"{sw}FallPp", g["labour_share_fall_pp"], "{:.1f}")
        v.put(f"{sw}GammaTerminal", G0 + g["labour_share_fall_pp"] / 100, "{:.3f}")
        v.put(f"{sw}TfpPct", g["tfp_gain"] * 100, "{:.1f}")
        v.put(f"{sw}LabourShareTerminal", (1 - G0) * 100 - g["labour_share_fall_pp"], "{:.1f}")
    # the share effect on the wage, dln(1-gamma)
    v.put("UkCentralShareLogPct",
          abs(math.log((1 - G0 - grid["uk_central"]["labour_share_fall_pp"] / 100) / (1 - G0))) * 100,
          "{:.1f}")

    # ---- closure parameters ------------------------------------------------
    c0 = R["zk0.1"]["cont"]["closure"]
    v.put("ZetaKCentral", 0.1, "{:.1f}")
    v.put("ZetaKBound", 0.0, "{:.0f}")
    v.put("ZetaD", c0["zeta_D"], "{:.1f}")
    v.put("WorldRatePct", c0["world_int_rate_annual"] * 100, "{:.0f}")
    for cl, (cw, _) in CLOSURES.items():
        c = R[cl]["cont"]["closure"]
        if (c["zeta_D"], c["world_int_rate_annual"]) != (c0["zeta_D"], c0["world_int_rate_annual"]):
            raise ResultsError(f"{cl}: zeta_D or the world rate differ across closures")
        ref = R[cl]["ref"]
        y = HEAD
        Y = s_(ref, "Y", y)
        v.put(f"PaidAbroadBase{cw}", (1 - s_(ref, "GNI", y) / Y) * 100, "{:.2f}")
        v.put(f"NniGdpBase{cw}", s_(ref, "NNI", y) / Y * 100, "{:.1f}")
        cad = (s_(ref, "C", y) + s_(ref, "I", y) + s_(ref, "G", y) - s_(ref, "GNI", y)) / Y * 100
        v.put(f"CurrentAccountDeficitBase{cw}", cad, "{:.1f}")
        v.put(f"ForeignOwnedCapitalBase{cw}", s_(ref, "K_f", y) / s_(ref, "K", y) * 100, "{:.0f}")
        v.put(f"BaseDebtGdpThirtyOne{cw}", s_(ref, "D", y) / Y * 100, "{:.1f}")
        v.put(f"BaseDebtGdpThirtySix{cw}", s_(ref, "D", DEBT_RULE) / s_(ref, "Y", DEBT_RULE) * 100, "{:.1f}")
        v.put(f"BaseInterestPct{cw}", s_(ref, "r", y) * 100, "{:.1f}")
        # who supplies the extra capital: UK central main arm, 2031
        rec = R[cl]["arms"][("uk_central", "")]["tfp"]
        dk = s_(rec, "K", y) - s_(ref, "K", y)
        v.put(f"UkCentralForeignShareExtraK{cw}",
              (s_(rec, "K_f", y) - s_(ref, "K_f", y)) / dk * 100, "{:.0f}")
        # extra national saving (GNI - C - G) over extra investment, 2028-2031
        nsave = lambda x, t: s_(x, "GNI", t) - s_(x, "C", t) - s_(x, "G", t)
        yrs = range(SHOCK, HEAD + 1)
        ds = sum(nsave(rec, t) - nsave(ref, t) for t in yrs)
        di = sum(s_(rec, "I", t) - s_(ref, "I", t) for t in yrs)
        v.put(f"UkCentralSavingShare{cw}", ds / di, "{:.2f}")
        # continuation gate
        g = sp.read_gate(OUTDIR, cl)["report"]
        v.put(f"GateMax{cw}", sci(g["max"]))
        v.put(f"GateY{cw}", sci(g["tight"]["Y"]))

    # ---- the 2031 grid ------------------------------------------------------
    emit_grid(v, R)

    # stress test against technology unchanged: output at fixed inputs, per cent
    for cl, (cw, _) in CLOSURES.items():
        for sc, sw in SCEN.items():
            r = R[cl]["arms"][(sc, "")]
            x = (r["stress"]["Z_terminal"] / r["zfixed"]["Z_terminal"] - 1) * 100 if r["stress"] else None
            v.signed(f"{sw}StressZVsFlat{cw}", x, fmt_signed="{:+.2f}", fmt_abs="{:.2f}")

    # ---- UK central main arm, central closure, by year ----------------------
    ref, rec = R["zk0.1"]["ref"], R["zk0.1"]["arms"][("uk_central", "")]["tfp"]
    for y in range(W["ramp_zero_year"], LAST_FLOW + 1):
        m = measures(rec, ref, y)
        for k in ("Gdp", "Gni", "Nni", "Capital", "Labour", "Wage", "Consumption", "Investment"):
            v.signed(f"PathUkCentral{k}{YW[y]}", m[k])
        v.signed(f"PathUkCentralInterestBp{YW[y]}", m["InterestBp"], fmt_signed="{:+.0f}")
    for y in range(W["ramp_zero_year"], DEBT_RULE + 1):
        v.signed(f"PathUkCentralDebtPp{YW[y]}", debt_pp(rec, ref, y))
    # first year the UK central main-arm wage and consumption are back above the path
    for cl, (cw, _) in CLOSURES.items():
        ref_, rec_ = R[cl]["ref"], R[cl]["arms"][("uk_central", "")]["tfp"]
        for k, var in (("Consumption", "C"), ("Wage", "w")):
            pos = [y for y in range(SHOCK, LAST_FLOW + 1) if pct(rec_, ref_, var, y) > 0]
            v.put(f"UkCentralMain{k}FirstPos{cw}", f"{min(pos)}" if pos else f"after {LAST_FLOW}")
        pos = [y for y in range(SHOCK, LAST_FLOW + 1) if tax_pp(rec_, ref_, y) > 0]
        v.put(f"UkCentralMainTaxFirstPos{cw}", f"{min(pos)}" if pos else "never")
        r_k = R[cl]["arms"][("korinek", "")]["tfp"]
        pos = [y for y in range(SHOCK, LAST_FLOW + 1) if tax_pp(r_k, ref_, y) > 0]
        v.put(f"KorinekMainTaxFirstPos{cw}", f"{min(pos)}" if pos else "never")
        pos = [y for y in range(SHOCK, DEBT_RULE + 1) if debt_pp(rec_, ref_, y) > 0]
        v.put(f"UkCentralMainDebtFirstPos{cw}", f"{min(pos)}")
    # the 2028 capital that arrives with no 2027 investment (zeta_K = 0.1)

    # ---- tax: Korinek main arm at the bound, by base -------------------------
    ref0, rk = R["zk0"]["ref"], R["zk0"]["arms"][("korinek", "")]["tfp"]
    tau = rk["tau_payroll"]
    pay = payroll_pp(rk, ref0, HEAD, tau)
    v.signed("KorinekMainBoundTaxPayroll", pay)
    v.signed("KorinekMainBoundTaxIncome", tax_pp(rk, ref0, HEAD, "iit_revenue") - pay)
    v.signed("KorinekMainBoundTaxBusiness", tax_pp(rk, ref0, HEAD, "business_tax_revenue"))
    v.signed("KorinekMainBoundTaxConsumption", tax_pp(rk, ref0, HEAD, "cons_tax_revenue"))
    hk = lambda x: s_(x, "r_p", HEAD) * s_(x, "B", HEAD) / s_(x, "Y", HEAD)
    v.signed("KorinekMainBoundHhCapIncPp", (hk(rk) - hk(ref0)) * 100)

    # effective rates on the continuation, 2031 (the sanity gate's own calculation)
    for cl, (cw, _) in CLOSURES.items():
        eff = json.loads((OUTDIR / cl / "uk_central_share_shift_tfp_ramp.sanity.json")
                         .read_text())["diagnostics"]["effective_rates_2031"]["reference"]
        v.put(f"EffLabourPct{cw}", eff["labour"], "{:.1f}")
        v.put(f"EffCapitalPct{cw}", eff["capital_gross"], "{:.1f}")
        v.put(f"EffWedgePp{cw}", eff["labour"] - eff["capital_gross"], "{:.1f}")
        v.put(f"EffIncomeFnPct{cw}", eff["labour_excl_payroll"], "{:.1f}")
        v.put(f"PayrollPctGdp{cw}", eff["payroll_pct_gdp"], "{:.1f}")
    v.put("ObrWedgeLo", OBR_WEDGE_PP[0], "{:.0f}")
    v.put("ObrWedgeHi", OBR_WEDGE_PP[1], "{:.0f}")
    v.put("ObrTaxPerPpLo", OBR_TAX_PER_PP[0], "{:.2f}")
    v.put("ObrTaxPerPpHi", OBR_TAX_PER_PP[1], "{:.2f}")
    v.put("ObrEffRateLabourPct", OBR_EFF_RATE_LABOUR, "{:.0f}")
    v.put("ObrEffRateProfitsPct", OBR_EFF_RATE_PROFITS, "{:.0f}")
    # PolicyEngine-UK employer and employee NICs, 2027-28 (analysis/nics, evidence only)
    n = {y: json.loads((NICS / f"nics_{y}.json").read_text()) for y in (2027, 2028)}
    v.put("NicsEmployerOnLabourCostPct",
          n[2028]["avg_employer_rate_on_total_labour_cost"] * 100, "{:.0f}")
    v.put("NicsEmployerOnEarningsPct",
          n[2028]["avg_employer_rate_on_employment_income"] * 100, "{:.1f}")
    v.put("NicsEmployeePct", n[2028]["avg_employee_rate_on_employment_income"] * 100, "{:.1f}")

    # ---- against Korinek et al. and the IMF ---------------------------------
    A = scen.ANTHROPIC_SUBSTANTIAL
    v.put("KorinekTableGdpPct", A["gdp_above_no_ai_pct"], "{:.1f}")
    v.put("KorinekTableCapitalPct", A["capital_stock_pct"], "{:.1f}")
    v.put("KorinekTableUnemploymentPct", A["unemployment_pct"], "{:.1f}")
    v.put("KorinekTableTfpPct", A["measured_tfp_pct"], "{:.1f}")
    v.put("KorinekTableFallPp", A["labour_share_fall_pp"], "{:.1f}")
    for word, x in KORINEK_T5_WAGE_PCT.items():
        v.signed(f"KorinekTableFiveWage{word}", x, fmt_signed="{:+.1f}", fmt_abs="{:.1f}")
    v.put("ImfOutputYFourPct", IMF_OUTPUT_Y4_PCT, "{:.1f}")
    v.put("ImfOutputYFivePct", IMF_OUTPUT_Y5_PCT, "{:.1f}")
    v.put("ImfTfpYFourPct", IMF_TFP_Y4_PCT, "{:.2f}")
    # capital supplied at an unchanged return (gamma Y / K at the path's value),
    # UK central inputs, labour unchanged and at the arm's own labour
    ref, rec = R["zk0.1"]["ref"], R["zk0.1"]["arms"][("uk_central", "")]["tfp"]
    g1, Z = rec["gamma_terminal"], rec["Z_terminal"]
    K0, L0, Y0 = (s_(ref, k, HEAD) for k in ("K", "L", "Y"))
    if abs(K0 ** G0 * L0 ** (1 - G0) / Y0 - 1) > 1e-4:
        raise ResultsError("the path's 2031 output is not K^gamma L^(1-gamma)")
    c = G0 * Y0 / K0

    def elastic(L):
        K = (g1 * Z * L ** (1 - g1) / c) ** (1 / (1 - g1))
        return (Z * K ** g1 * L ** (1 - g1) / Y0 - 1) * 100, (K / K0 - 1) * 100
    gdp_e, k_e = elastic(L0)
    gdp_el, _ = elastic(s_(rec, "L", HEAD))
    v.put("ElasticBoundGdpPct", gdp_e, "{:.1f}")
    v.put("ElasticBoundKPct", k_e, "{:.1f}")
    v.put("ElasticBoundGdpOwnLPct", gdp_el, "{:.1f}")
    # capital-supply elasticity, 2031 / 2036 / steady state (sanity diagnostics)
    for cl, (cw, _) in CLOSURES.items():
        d = json.loads((OUTDIR / cl / "uk_central_share_shift_tfp_ramp.sanity.json").read_text())
        e = d["diagnostics"]["capital_supply_elasticity"]
        v.put(f"UkCentralElasticity{cw}", e[str(HEAD)]["elasticity"], "{:.2f}")
        v.put(f"UkCentralElasticitySs{cw}", e["SS"]["elasticity"], "{:.2f}")

    # ---- OBR baseline comparison (appendix) ----------------------------------
    cmp_ = obr_mod.compare(base)
    for year, g in zip(cmp_["years"], cmp_["growth"]):
        v.put(f"BaseGrowth{YW[year]}", g)
    v.put("BaseGrowthMean", cmp_["mean"])
    v.put("ObrGrowthMean", cmp_["obr_mean"], "{:.1f}")
    v.signed("BaseObrGrowthDiffPp", cmp_["difference"])
    v.put("BaseGrowthStartYear", cmp_["years"][0], "{:.0f}")
    v.put("BaseGrowthEndYear", cmp_["years"][-1], "{:.0f}")
    v.put("ObrProductivityPct", obr_mod.OBR_BASELINE["productivity_medium_term"], "{:.1f}")
    v.put("ModelProductivityPct", (np.exp(cmp_["g_y"]) - 1) * 100)

    # ---- provenance and diagnostics ------------------------------------------
    p = R["zk0.1"]["cont"]["provenance"]
    v.put("OgcoreVersion", p["packages"]["ogcore"])
    v.put("PolicyengineUkVersion", p["packages"]["policyengine-uk"])
    v.put("OgukSha", p["oguk_git_sha"][:7])
    for cl, (cw, _) in CLOSURES.items():
        recs = [R[cl]["cont"]] + [r for x in R[cl]["arms"].values() for r in x.values() if r]
        v.put(f"NSolves{cw}", len(recs), "{:.0f}")
        rc = max(r["diagnostics"]["rc_rel_Y_max_abs_interior"] for r in recs)
        eu = max(max(r["diagnostics"]["euler_savings_max"], r["diagnostics"]["euler_labour_max"])
                 for r in recs)
        v.put(f"RcMax{cw}", sci(rc))
        v.put(f"EulerMax{cw}", sci(eu))
        v.put(f"SolveMinMax{cw}", max(r["elapsed_min"] for r in recs), "{:.1f}")
    v.put("RFourTolPp", sp.R4_TOL_PP, "{:.2f}")
    # the gamma patch's verification run (docs/firm_gamma_tv.md)
    v.put("PatchSites", 14, "{:.0f}")
    v.put("PatchEpsilonSites", 20, "{:.0f}")


def render(v: Values, sources: list[str]) -> str:
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    lines = ["% values_generated.tex — machine-generated by paper/make_values.py. DO NOT EDIT BY HAND.",
             f"% generated {stamp}", *[f"% source: {s}" for s in sources], ""]
    for name, value in v.items():
        lines.append(r"\newcommand{\gen%s}{%s}" % (name, value))
    return "\n".join(lines) + "\n"


# --- claims stated in words ---------------------------------------------------

def check_claims(R: dict, v: Values) -> None:
    """Sentences the paper states in words, not macros.  If a solve breaks one,
    stop and make someone rewrite the sentence rather than publish it false."""
    fail = []
    grid = sp.scenario_grid()
    solved = lambda cl: [sc for sc in SCEN if R[cl]["arms"][(sc, "")]["tfp"]]

    def M(cl, sc, a, y=HEAD, var=""):
        return measures(R[cl]["arms"][(sc, var)][a], R[cl]["ref"], y)

    for cl in CLOSURES:
        ref = R[cl]["ref"]
        for sc in solved(cl):
            arms = R[cl]["arms"][(sc, "")]
            m = {a: M(cl, sc, a) for a in ARMS}
            # the stress test holds 2031 GDP
            if not abs(m["stress"]["Gdp"]) <= sp.R4_TOL_PP:
                fail.append(f"stress-test GDP not held in {HEAD}: {sc} {cl}")
            # the main arm: GNI below GDP; wage falls; capital and the return rise
            if not m["tfp"]["Gni"] < m["tfp"]["Gdp"]:
                fail.append(f"'GNI gap below GDP gap' fails: {sc} {cl}")
            for a in ARMS:
                if not m[a]["Wage"] < 0:
                    fail.append(f"'the wage falls in every arm in {HEAD}' fails: {sc} {a} {cl}")
                if not (m[a]["Capital"] > 0 and m[a]["InterestBp"] > 0):
                    fail.append(f"'capital and the return rise' fails: {sc} {a} {cl}")
                if not m[a]["Labour"] < 0:
                    fail.append(f"'labour input is lower by {HEAD}' fails: {sc} {a} {cl}")
                m28 = M(cl, sc, a, SHOCK)
                if not (m28["Investment"] > 0 and m28["Labour"] > 0 and m28["Consumption"] < 0):
                    fail.append(f"'in {SHOCK} investment and hours rise, consumption falls' "
                                f"fails: {sc} {a} {cl}")
                # debt/GDP is higher by 2036 in every arm
                if not debt_pp(arms[a], ref, DEBT_RULE) > 0:
                    fail.append(f"'debt/GDP is higher by {DEBT_RULE} in every arm' fails: {sc} {a} {cl}")
                # the stress test sits below technology unchanged on the wage at 0.1
            if not m["tfp"]["Gni"] > max(m["zfixed"]["Gni"], m["stress"]["Gni"]):
                fail.append(f"'the two other arms bound the main arm's GNI from below' fails: {sc} {cl}")
            if not m["tfp"]["Gdp"] > m["zfixed"]["Gdp"]:
                fail.append(f"'the main arm's GDP exceeds technology-unchanged' fails: {sc} {cl}")
            # stress test needs output at fixed inputs to fall at 0.1, rise a little at 0
            z = arms["stress"]["Z_terminal"] / arms["zfixed"]["Z_terminal"] - 1
            if cl == "zk0.1" and not z < 0:
                fail.append(f"'stress test needs output at fixed inputs to fall at 0.1' fails: {sc}")
            if cl == "zk0" and not 0 < z < 0.001:
                fail.append(f"'stress test needs a small rise at the bound' fails: {sc} ({z:.5f})")
            if cl == "zk0" and not m["zfixed"]["Gdp"] < 0:
                fail.append(f"'technology-unchanged GDP is slightly below the path at 0' fails: {sc}")
            if cl == "zk0.1" and not m["zfixed"]["Gdp"] > 0:
                fail.append(f"'technology-unchanged GDP is above the path at 0.1' fails: {sc}")
            if cl == "zk0" and not max(abs(m["zfixed"][k] - m["stress"][k])
                                        for k in ("Gdp", "Gni", "Wage", "Consumption")) < 0.1:
                fail.append(f"'the two no-gain arms nearly coincide at the bound' fails: {sc}")
            # tax/GDP: falls in every arm and every year at 0.1
            if cl == "zk0.1":
                for a in ARMS:
                    if not all(tax_pp(arms[a], ref, y) < 0 for y in range(SHOCK, LAST_FLOW + 1)):
                        fail.append(f"'tax/GDP falls in every arm and year at 0.1' fails: {sc} {a}")
                tpp = m["stress"]["TaxGdpPp"] / grid[sc]["labour_share_fall_pp"]
                if not -OBR_TAX_PER_PP[0] < tpp < -0.6 * OBR_TAX_PER_PP[0]:
                    fail.append(f"'stress-test tax/GDP per pp is below the OBR's but over 60% "
                                f"of 0.19' fails: {sc} ({tpp:.3f})")
                if not m["tfp"]["DebtPp"] < 0:
                    fail.append(f"'main-arm debt/GDP is lower in {HEAD} at 0.1' fails: {sc}")
            # NNI below GNI in levels (main arm)
            dn = s_(arms["tfp"], "NNI", HEAD) - s_(ref, "NNI", HEAD)
            dg = s_(arms["tfp"], "GNI", HEAD) - s_(ref, "GNI", HEAD)
            if not dn < dg:
                fail.append(f"'NNI rises by less than GNI in levels' fails: {sc} {cl}")
            # consumption below the path while GNI is above it (main arm)
            if sc != "korinek" and not (m["tfp"]["Consumption"] < 0 < m["tfp"]["Gni"]):
                fail.append(f"'consumption falls while GNI rises in {HEAD}' fails: {sc} {cl}")
    # Korinek at 0.1: consumption is above the path by 2031 (the exception)
    if not M("zk0.1", "korinek", "tfp")["Consumption"] > 0:
        fail.append("'Korinek's main-arm consumption is above the path at 0.1 in 2031' fails")
    if not M("zk0", "korinek", "tfp")["Consumption"] < 0:
        fail.append("'Korinek's main-arm consumption is below the path at 0 in 2031' fails")
    # UK central main arm: consumption below the path in every year to 2035 at 0.1
    ref, rec = R["zk0.1"]["ref"], R["zk0.1"]["arms"][("uk_central", "")]["tfp"]
    if not all(pct(rec, ref, "C", y) < 0 < pct(rec, ref, "GNI", y) for y in range(SHOCK, LAST_FLOW + 1)):
        fail.append(f"'UK central consumption below, GNI above, {SHOCK}-{LAST_FLOW}' fails")
    if not all(pct(rec, ref, "w", y) < 0 for y in range(SHOCK, LAST_FLOW + 1)):
        fail.append(f"'UK central wage below the path to {LAST_FLOW}' fails")
    # tax/GDP at the bound: rises for Korinek main; UK central main ~0 in 2031, positive later
    k0 = M("zk0", "korinek", "tfp")["TaxGdpPp"]
    if not k0 > 0:
        fail.append("'tax/GDP rises for Korinek at the bound' fails")
    u0 = M("zk0", "uk_central", "tfp")["TaxGdpPp"]
    if not -0.02 < u0 < 0:
        fail.append(f"'UK central main tax/GDP is about zero, slightly negative, at the bound' fails ({u0:.3f})")
    if not v["UkCentralMainTaxFirstPosBound"].isdigit():
        fail.append("'UK central main tax/GDP turns positive at the bound' fails")
    if v["UkCentralMainTaxFirstPosCentral"] != "never" or v["KorinekMainTaxFirstPosCentral"] != "never":
        fail.append("'no main arm's tax/GDP turns positive at 0.1' fails")
    # monotonic in shock size at 0.1, main arm
    order = ("uk_low", "uk_central", "uk_high", "korinek")
    for k in ("Gdp", "Gni", "Capital", "InterestBp"):
        xs = [M("zk0.1", sc, "tfp")[k] for sc in order]
        if not all(a < b for a, b in zip(xs, xs[1:])):
            fail.append(f"'main-arm {k} rises with the shock size' fails: {xs}")
    if not abs(M("zk0.1", "uk_central", "tfp")["Wage"] - M("zk0.1", "uk_high", "tfp")["Wage"]) < 0.05:
        fail.append("'UK central's wage falls as far as UK high's' fails")
    if not M("zk0.1", "korinek", "tfp")["Wage"] > M("zk0.1", "uk_central", "tfp")["Wage"]:
        fail.append("'Korinek's main-arm wage falls less than UK central's' fails")
    # GNI moves less with the closure than GDP; capital smaller and r larger at 0
    for sc in ("uk_central", "korinek"):
        a, b = M("zk0.1", sc, "tfp"), M("zk0", sc, "tfp")
        if not abs(a["Gni"] - b["Gni"]) < abs(a["Gdp"] - b["Gdp"]):
            fail.append(f"'GNI moves less with the closure than GDP' fails: {sc}")
        if not (b["Capital"] < a["Capital"] and b["InterestBp"] > a["InterestBp"]):
            fail.append(f"'less capital and a larger rise in r at the bound' fails: {sc}")
        if not (b["Gdp"] < a["Gdp"]):
            fail.append(f"'GDP gap smaller at the bound' fails: {sc}")
    # closure re-check (docs/closure_choice.md): baseline pays 1-2% of GDP abroad
    pa = float(v["PaidAbroadBaseCentral"])
    if not 1.0 <= pa <= 2.0:
        fail.append(f"'the central baseline pays 1-2% of GDP abroad' fails ({pa})")
    fs = float(v["UkCentralForeignShareExtraKCentral"])
    if not 65 <= fs <= 85:
        fail.append(f"'about three-quarters of the extra capital is foreign-owned' fails ({fs})")
    if not float(v["UkCentralForeignShareExtraKBound"]) == 0:
        fail.append("'no extra capital is foreign-owned at the bound' fails")
    # IMF: capital supplied at an unchanged return brackets the IMF's year-4/5 output
    e = float(v["ElasticBoundGdpPct"])
    if not IMF_OUTPUT_Y4_PCT <= e <= IMF_OUTPUT_Y5_PCT + 0.1:
        fail.append(f"'an elastic capital supply brackets the IMF's output' fails ({e})")
    g = M("zk0.1", "uk_central", "tfp")["Gdp"]
    if not 0.25 < g / IMF_OUTPUT_Y4_PCT < 0.45:
        fail.append(f"'about a third of the IMF's output effect' fails ({g / IMF_OUTPUT_Y4_PCT:.2f})")
    # Korinek: GDP and capital below their figures at both closures
    A = scen.ANTHROPIC_SUBSTANTIAL
    for cl in CLOSURES:
        m = M(cl, "korinek", "tfp")
        if not (m["Gdp"] < A["gdp_above_no_ai_pct"] and m["Capital"] < A["capital_stock_pct"]):
            fail.append(f"'GDP and capital rise by less than in Korinek et al.' fails at {cl}")
    # tax wedge and NICs as stated
    for cw in ("Central", "Bound"):
        w_ = float(v[f"EffWedgePp{cw}"])
        if not 12 <= w_ <= 16:
            fail.append(f"'the labour-capital wedge is about 14pp' fails at {cw} ({w_})")
        if not w_ < OBR_WEDGE_PP[0]:
            fail.append("'the wedge is below the OBR's' fails")
    nic = float(v["NicsEmployerOnLabourCostPct"])
    if not 10 <= nic <= 12:
        fail.append(f"'PolicyEngine-UK employer NICs are about 11%' fails ({nic})")
    # --- results section, stated in words ---------------------------------------
    for cl in CLOSURES:
        ref = R[cl]["ref"]
        for sc in solved(cl):
            arms = R[cl]["arms"][(sc, "")]
            mm, ms = M(cl, sc, "tfp"), M(cl, sc, "stress")
            if cl == "zk0.1" and not ms["Gni"] < 0:
                fail.append(f"'stress-test GNI is below the path at 0.1' fails: {sc}")
            if not ms["Wage"] < mm["Wage"]:
                fail.append(f"'the stress-test wage falls further than the main arm's' fails: {sc} {cl}")
            # G rises with GDP and takes part, not all, of the GNI gain (main arm)
            dG = s_(arms["tfp"], "G", HEAD) - s_(ref, "G", HEAD)
            dGNI = s_(arms["tfp"], "GNI", HEAD) - s_(ref, "GNI", HEAD)
            if not 0 < dG < dGNI:
                fail.append(f"'government consumption takes part of the GNI gain' fails: {sc} {cl}")
            # stress-test GDP drift after 2031: below at 0.1, above at 0
            d35 = pct(arms["stress"], ref, "Y", LAST_FLOW)
            if (cl == "zk0.1" and not d35 < 0) or (cl == "zk0" and not d35 > 0):
                fail.append(f"'stress-test GDP drifts below (0.1) / above (0) after {HEAD}' fails: {sc} {cl}")
    # NNI moves less with the closure than GNI (UK central main arm)
    a, b = M("zk0.1", "uk_central", "tfp"), M("zk0", "uk_central", "tfp")
    if not abs(a["Nni"] - b["Nni"]) < abs(a["Gni"] - b["Gni"]):
        fail.append("'NNI moves less with the closure than GNI' fails")
    # wage: UK central has the lowest TFP-to-share ratio and the worst wage per unit of GDP
    ratio = {sc: grid[sc]["tfp_gain"] * 100 / grid[sc]["labour_share_fall_pp"] for sc in SCEN}
    if min(ratio, key=ratio.get) != "uk_central":
        fail.append("'UK central has the lowest productivity-to-share ratio' fails")
    wpg = {sc: M("zk0.1", sc, "tfp")["Wage"] / M("zk0.1", sc, "tfp")["Gdp"] for sc in SCEN}
    if min(wpg, key=wpg.get) != "uk_central":
        fail.append("'per unit of GDP, UK central is the least favourable for wages' fails")
    # stress-test tax per pp: UK low smallest, Korinek largest; within the stated range
    tpp = {sc: -M("zk0.1", sc, "stress")["TaxGdpPp"] / grid[sc]["labour_share_fall_pp"] for sc in SCEN}
    if not (min(tpp, key=tpp.get) == "uk_low" and max(tpp, key=tpp.get) == "korinek"):
        fail.append(f"'stress-test tax per pp ranges from UK low to Korinek' fails: {tpp}")
    # Korinek main arm at the bound: signs of the tax bases, and positive every year from first
    ref0, rk = R["zk0"]["ref"], R["zk0"]["arms"][("korinek", "")]["tfp"]
    for k, sgn in (("KorinekMainBoundTaxPayroll", -1), ("KorinekMainBoundTaxConsumption", -1),
                   ("KorinekMainBoundTaxIncome", 1), ("KorinekMainBoundTaxBusiness", 1),
                   ("KorinekMainBoundHhCapIncPp", 1)):
        if not v[k + "Dir"] == ("above" if sgn > 0 else "below"):
            fail.append(f"'{k} has the stated sign' fails")
    for sc, key in (("korinek", "KorinekMainTaxFirstPosBound"), ("uk_central", "UkCentralMainTaxFirstPosBound")):
        r_ = R["zk0"]["arms"][(sc, "")]["tfp"]
        y0 = int(v[key])
        if not all(tax_pp(r_, ref0, y) > 0 for y in range(y0, LAST_FLOW + 1)):
            fail.append(f"'tax/GDP positive in every year from {y0} at the bound' fails: {sc}")
    # debt: UK central main arm at 0.1 turns positive and rises every year to 2036
    ref, rec = R["zk0.1"]["ref"], R["zk0.1"]["arms"][("uk_central", "")]["tfp"]
    y0 = int(v["UkCentralMainDebtFirstPosCentral"])
    dd = [debt_pp(rec, ref, y) for y in range(y0, DEBT_RULE + 1)]
    if not all(x2 > x1 for x1, x2 in zip(dd, dd[1:])):
        fail.append("'UK central main-arm debt gap rises every year after it turns positive' fails")
    # investment: high while the ramp runs, drops in 2031 (UK central main, 0.1)
    inv = {y: pct(rec, ref, "I", y) for y in range(SHOCK, HEAD + 1)}
    if not all(inv[y] > inv[HEAD] for y in range(SHOCK, HEAD)):
        fail.append("'investment drops in 2031 when the ramp ends' fails")
    # capital-supply elasticity below 1 in 2031, Korinek main arm, both closures
    for cl in CLOSURES:
        d = json.loads((OUTDIR / cl / "korinek_share_shift_tfp_ramp.sanity.json").read_text())
        if not d["diagnostics"]["capital_supply_elasticity"][str(HEAD)]["elasticity"] < 1:
            fail.append(f"'the upper case's capital-supply elasticity is below 1 in {HEAD}' fails at {cl}")
    # methodology: saving shares near the published coefficients
    if not 0.25 <= float(v["UkCentralSavingShareCentral"]) <= 0.45:
        fail.append("'the central saving share is close to the EU's 0.36' fails")
    if not 0.75 <= float(v["UkCentralSavingShareBound"]) <= 0.95:
        fail.append("'the bound saving share is close to 0.89' fails")
    # the realised technology gain at 2031 inputs is 2-6% short of each target (A11)
    for sc in SCEN:
        r_ = R["zk0.1"]["arms"][(sc, "")]["tfp"]
        ref = R["zk0.1"]["ref"]
        K0, L0 = s_(ref, "K", HEAD), s_(ref, "L", HEAD)
        g1 = r_["gamma_terminal"]
        tech = r_["Z_terminal"] * K0 ** g1 * L0 ** (1 - g1) / (K0 ** G0 * L0 ** (1 - G0)) - 1
        short = 1 - tech / grid[sc]["tfp_gain"]
        if not 0.01 <= short <= 0.07:
            fail.append(f"'the gain at {HEAD} inputs is 2-6% short of the target' fails: {sc} ({short:.3f})")

    # the 2036 guard: only debt/GDP may be quoted in the debt rule's first year
    bad = [k for k in v if "ThirtySix" in k and "Debt" not in k]
    if bad:
        fail.append(f"non-debt macros quote {DEBT_RULE}: {bad[:5]}")
    if fail:
        raise ResultsError("claims in the text no longer hold:\n  " + "\n  ".join(fail))


def build() -> tuple[Values, list[str]]:
    R = load_all()
    v = Values()
    emit(v, R)
    check_claims(R, v)
    sources = [f"baseline  {BASELINE_FILE.relative_to(ROOT)} (calibration, OBR comparison)"]
    for cl in CLOSURES:
        labs = sorted(r["label"] for x in R[cl]["arms"].values() for r in x.values() if r)
        sources.append(f"{cl}  {sp.OUTDIR}/{cl}/: continuation + " + ", ".join(labs))
        pend = sorted(f"{sc}{'_' + var if var else ''}" for (sc, var), x in R[cl]["arms"].items()
                      if any(r is None for r in x.values()))
        sources.append(f"{cl}  pending: " + ", ".join(pend))
    sources.append("nics  analysis/nics/nics_2027.json, nics_2028.json")
    return v, sources


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--check", action="store_true",
                    help="write nothing; exit 1 if values_generated.tex is stale")
    args = ap.parse_args()
    v, sources = build()
    text = render(v, sources)
    npend = sum(1 for x in v.values() if x == PE)
    if args.check:
        current = OUT.read_text() if OUT.exists() else ""
        strip = lambda s: "\n".join(l for l in s.splitlines() if not l.startswith("% generated"))
        if strip(current) != strip(text):
            print("values_generated.tex is stale; run python paper/make_values.py")
            return 1
        print(f"values_generated.tex is up to date ({len(v)} macros, {npend} pending)")
        return 0
    OUT.write_text(text)
    print(f"wrote {OUT.relative_to(ROOT)} ({len(v)} macros, {npend} pending)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
