"""Emit paper/values_generated.tex from the committed 2028-surprise solves.

Every number in the paper's text is a LaTeX macro defined here, so no result is
typed into a .tex file by hand.  Run from the repo root:

    python paper/make_values.py                 # writes paper/values_generated.tex
    python paper/make_values.py --check         # exits 1 if the file is stale

Design (docs/surprise_2028.md, docs/uk_calibration.md, #27):

* AI is an unanticipated shock announced at the start of 2028.  2026-27 equal
  the OBR-central path (which already includes the OBR's own AI assumption); gamma and Z ramp with weights 0/.25/.5/.75/1
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

sys.path.insert(0, str(ROOT / "paper"))
import cohort_welfare as cwf  # noqa: E402

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


# Debt repriced at the OBR's speed.  The model's debt is one-period, so a rise in
# the interest rate reaches the whole stock at once.  This redoes the debt
# recursion with the rate gap (arm less path) reaching the stock at the speed of
# the OBR's debt interest ready reckoner, holding GDP, the primary balance and
# the market rate at the solve's values (first order, no feedback).  Same method
# and source as docs/debt_repricing.md (PR #43): OBR, October 2026 Economic and
# fiscal outlook, detailed forecast tables, debt interest ready reckoner table
# 5.1 (GBP bn for +1pp on gilt and on short rates, 2026-27 to 2031-32) and
# aggregates tables 6.13 and 6.17 (2025-26 to 2031-32).
OBR_RR_GILT = (1.1313, 3.7303, 6.4512, 8.6640, 10.5657, 12.6125)
OBR_RR_SHORT = (6.5150, 7.1503, 6.6096, 6.1767, 5.5172, 5.2053)
OBR_CG_GROSS_DEBT_BN = (2996.06, 3172.4991, 3336.7799, 3489.3976, 3619.2944, 3735.8203,
                        3857.1338)
OBR_CG_GROSS_DEBT_PCT = (98.4223, 101.0028, 101.9149, 102.4897, 101.8414, 101.6155, 101.3471)
OBR_PSND_PCT = (93.1017, 95.5055, 96.6997, 97.2848, 96.6742, 95.8675, 95.6107)


def obr_passthrough(n: int) -> list[float]:
    """Share of a sustained rate rise that has reached the debt stock in its k-th
    year, k = 1..n: the cost of +1pp on gilt and short rates over 1% of public
    sector net debt (mean of opening and closing stock).  The OBR gives six years;
    later years add the mean annual step of years three to six."""
    psnd = [b * p / c for b, p, c in
            zip(OBR_CG_GROSS_DEBT_BN, OBR_PSND_PCT, OBR_CG_GROSS_DEBT_PCT)]
    phi = [(g + s) / (0.01 * 0.5 * (psnd[k] + psnd[k + 1]))
           for k, (g, s) in enumerate(zip(OBR_RR_GILT, OBR_RR_SHORT))]
    step = (phi[5] - phi[2]) / 3
    while len(phi) < n:
        phi.append(min(1.0, phi[-1] + step))
    return phi[:n]


def repriced_debt_pp(rec, ref, y, full: bool = False) -> float:
    """Debt/GDP gap in year y with the rate gap phased in at the OBR's speed.
    ``full=True`` passes the whole gap through at once and returns the solve's own
    gap (the check that the recursion is the model's)."""
    S, Rf = rec["series"], ref["series"]
    k0, n = ix(SHOCK), ix(y)
    phi = [1.0] * (n - k0) if full else obr_passthrough(n - k0)
    pd = [Rf["G"][t] + Rf["I_g"][t] + Rf["TR"][t] + Rf["agg_pension_outlays"][t]
          - Rf["total_tax_revenue"][t] for t in range(n)]
    growth = [((1 + Rf["r_gov"][t]) * Rf["D"][t] + pd[t]) / Rf["D"][t + 1] for t in range(n)]
    gap = [S["r_gov"][t] - Rf["r_gov"][t] for t in range(n)]
    D = S["D"][k0]                                # debt in the shock year is predetermined
    for t in range(k0, n):
        eff = sum(phi[t - j] * (gap[j] - (gap[j - 1] if j > k0 else 0.0))
                  for j in range(k0, t + 1))
        D = S["D"][t + 1] + ((1 + Rf["r_gov"][t] + eff) * D
                             - (1 + S["r_gov"][t]) * S["D"][t]) / growth[t]
    return (D / S["Y"][n] - Rf["D"][n] / Rf["Y"][n]) * 100


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
                v.signed(f"{pre}DebtRepricedThirtySix{cw}",
                         repriced_debt_pp(rec, ref, DEBT_RULE) if rec else None)
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



# --- cohort incidence (paper/cohort_welfare.py) ---------------------------------

COH_RULE = {"dn": "Dn", "": "Common"}
ONS_WEALTH_TOP_TENTH, ONS_WEALTH_BOTTOM_HALF = 43.0, 9.0   # ONS (2022), 2018-20


def cohort_results() -> dict:
    """Everything the cohort section quotes, per closure (computed once)."""
    out = {}
    for cl in CLOSURES:
        par, _ = cwf.load(cl)
        b = cwf.birth_years(par)
        R, Rc = cwf.cev(cl), cwf.cev(cl, "hold", "consumption")
        out[cl] = {"par": par, "b": b, "R": R, "Rc": Rc, "parts": cwf.part_averages(cl),
                   "fill": cwf.fill_sensitivity(cl), "recon": cwf.reconcile(cl),
                   "recon_tr": cwf.reconcile_tr(cl), "ident": cwf.identity_checks(cl),
                   "wealth": cwf.wealth_concentration(cl), "profile": cwf.group_profile(cl),
                   "labels": cwf.labels(cl), "rob": cwf.robustness(cl)}
    return out


def emit_cohorts(v: Values, CR: dict) -> None:
    for cl, (cw, _) in CLOSURES.items():
        X = CR[cl]
        par, b = X["par"], X["b"]
        aw, gw = cwf.alive_weights(par), cwf.group_weights(par)
        alive = aw > 0
        for var, rw in COH_RULE.items():
            for a, aword in ARMS.items():
                key = (var, a)
                lam = X["R"][key]
                av = cwf.averages(par, lam)
                pre = f"Coh{aword}{rw}{cw}"
                v.signed(f"{pre}Avg", av["alive_all"])
                v.signed(f"{pre}Bottom", av["alive_by_group"][0])
                v.signed(f"{pre}TopOne", av["alive_by_group"][6])
                v.signed(f"{pre}FutBottom", av["future_by_group"][0])
                v.signed(f"{pre}FutTopOne", av["future_by_group"][6])
                v.signed(f"{pre}FutAll", av["future_all"])
                v.put(f"{pre}LosingPct", float(aw @ (lam < 0) @ gw) * 100, "{:.0f}")
                for p, pw in (("consumption", "PartCons"), ("leisure", "PartLeis"),
                              ("bequests", "PartBeq")):
                    v.signed(f"{pre}{pw}", X["parts"][key][p]["all"])
                v.signed(f"{pre}ConsOnly", float(aw @ X["Rc"][key] @ gw))
                fc = cwf.first_c_above(cl, key)
                v.put(f"{pre}FirstCAbove", str(fc) if fc else "never")
                i_min = np.unravel_index(np.argmin(np.where(alive[:, None], lam, np.inf)), lam.shape)
                i_max = np.unravel_index(np.argmax(np.where(alive[:, None], lam, -np.inf)), lam.shape)
                v.signed(f"{pre}Min", float(lam[i_min]))
                v.put(f"{pre}MinAge", SHOCK - int(b[i_min[0]]), "{:.0f}")
                v.signed(f"{pre}Max", float(lam[i_max]))
                v.put(f"{pre}MaxAge", SHOCK - int(b[i_max[0]]), "{:.0f}")
                chart = b <= cwf.FIG_LAST_BIRTH
                i_all = np.unravel_index(np.argmin(np.where(chart[:, None], lam, np.inf)), lam.shape)
                v.signed(f"{pre}MinAll", float(lam[i_all]))
                v.put(f"{pre}MinAllBirth", int(b[i_all[0]]), "{:.0f}")
                allg = lam @ gw
                j = int(np.argmax(np.where(alive, allg, -np.inf)))
                v.put(f"{pre}PeakAge", SHOCK - int(b[j]), "{:.0f}")
                flips = b[lam[:, 0] <= lam[:, 6]]
                v.put(f"{pre}RankFlips", len(flips), "{:.0f}")
                v.put(f"{pre}NCohorts", len(b), "{:.0f}")
                if len(flips):
                    v.put(f"{pre}RankFlipFirst", int(flips.min()), "{:.0f}")
                    v.put(f"{pre}RankFlipLast", int(flips.max()), "{:.0f}")
                # what the average rests on (PR #24 referee): no-bequest measure, lifetime
                # income by source at unchanged behaviour, the post-2035 cost charged back
                rb = X["rob"][key]
                v.signed(f"{pre}NoBeqAvg", rb["no_bequest_avg"])
                v.put(f"{pre}NoBeqLosingPct", rb["no_bequest_losing_pct"], "{:.0f}")
                for k, kw in (("capital", "Cap"), ("labour", "Lab"), ("transfers", "Tr"),
                              ("bequests", "Beq"), ("total", "Tot")):
                    v.signed(f"{pre}Src{kw}", rb["sources"][k])
                    v.signed(f"{pre}Src{kw}Bottom", rb["sources_by_group"][k][0])
                    v.signed(f"{pre}Src{kw}TopOne", rb["sources_by_group"][k][6])
                if "charged" in rb:
                    ch = rb["charged"]
                    for k, kw, fmt in (("joint_avg", "ChargedAvg", None),
                                       ("no_bequest_avg", "ChargedNoBeqAvg", None),
                                       ("joint_losing_pct", "ChargedLosingPct", "{:.0f}"),
                                       ("no_bequest_losing_pct", "ChargedNoBeqLosingPct", "{:.0f}"),
                                       ("oldest_losing_on_average", "ChargedOldestLosingAge", "{:.0f}")):
                        for i, lh in ((0, "Lo"), (1, "Hi")):
                            if fmt is None:
                                v.signed(f"{pre}{kw}{lh}", ch[k][i])
                            else:
                                v.put(f"{pre}{kw}{lh}", ch[k][i], fmt)
                        lo, hi = v[f"{pre}{kw}Lo"], v[f"{pre}{kw}Hi"]
                        v.put(f"{pre}{kw}Range", lo if lo == hi else
                              (f"{lo} to {hi}" if fmt is None else f"{lo}--{hi}"))
                    g = ch["g_shortfall"]
                    v.put(f"{pre}GShortSsPctGdp", abs(g["ss_pct_gdp"]), "{:.2f}")
                    v.put(f"{pre}GShortSsPctC", abs(g["ss_pct_c"]), "{:.1f}")
                # oldest age at which every group loses (alive cohorts)
                lose_all = [SHOCK - int(x) for x, row, ok in zip(b, lam, alive) if ok and (row < 0).all()]
                v.put(f"{pre}AllLoseUpToAge", max(lose_all) if lose_all else "none",
                      "{:.0f}")
        for a, aword in ARMS.items():
            d = (cwf.averages(par, X["R"][("dn", a)])["alive_all"]
                 - cwf.averages(par, X["R"][("", a)])["alive_all"])
            v.signed(f"Coh{aword}DnLessCommon{cw}", d)
        # income by source over 2028-35, age 45 in 2028, main arm: per cent of consumption
        for var, rw in COH_RULE.items():
            ia = cwf.income_accounts(cl, (var, "tfp"))
            s45 = 45 - cwf.FIRST_AGE
            for k, kw in (("labour", "Lab"), ("capital", "Cap"), ("transfers", "Tr")):
                v.signed(f"CohMain{rw}{cw}Inc{kw}Bottom", float(ia[k][s45, 0]))
                v.signed(f"CohMain{rw}{cw}Inc{kw}TopOne", float(ia[k][s45, 6]))
        # checks and model features
        v.put(f"CohReconMaxPp{cw}", sci(max(X["recon"].values())))
        v.put(f"CohTrReconMaxRelDn{cw}", sci(max(x for k, x in X["recon_tr"].items() if "_dn" in k)))
        v.put(f"CohTrReconMaxRelCommon{cw}", sci(max(x for k, x in X["recon_tr"].items() if "_dn" not in k)))
        v.put(f"CohIdentityMax{cw}", sci(max(X["ident"].values())))
        fm = max(max(np.array(f["max_by_birth"])[b <= cwf.FIG_LAST_BIRTH]) for f in X["fill"].values())
        v.put(f"CohFillMaxPp{cw}", fm, "{:.2f}")
        v.put(f"CohFillFirstBirth{cw}", min(f["first_birth_over_0p01"] for f in X["fill"].values()), "{:.0f}")
        tx = cwf.tax_rates(cl)
        v.put(f"CohTaxIncPct{cw}", tx["income"] * 100, "{:.1f}")
        v.put(f"CohTaxConsPct{cw}", tx["consumption"] * 100, "{:.0f}")
        v.put(f"CohWealthTopTenth{cw}", X["wealth"]["top_tenth_pct"], "{:.0f}")
        v.put(f"CohWealthBottomHalf{cw}", X["wealth"]["bottom_half_pct"], "{:.0f}")
        P = X["profile"]
        v.put(f"CohLabourIncShareBottom{cw}", P["labour"][0], "{:.0f}")
        v.put(f"CohLabourIncShareTopOne{cw}", P["labour"][6], "{:.0f}")
        v.put(f"CohTransferIncShareBottom{cw}", P["transfers"][0], "{:.0f}")
        v.put(f"CohTransferIncShareTopOne{cw}", P["transfers"][6], "{:.1f}")
        v.put(f"CohCapIncShareBottom{cw}", P["capital"][0], "{:.0f}")
        v.put(f"CohCapIncShareTopOne{cw}", P["capital"][6], "{:.0f}")
        # per head, relative to the population mean: wealth vs earnings
        rel = lambda sh, j: sh[j] / (gw[j] * 100)
        v.put(f"CohWealthRelTopOne{cw}", rel(P["wealth_share"], 6), "{:.1f}")
        v.put(f"CohEarnRelTopOne{cw}", rel(P["earnings_share"], 6), "{:.1f}")
        v.put(f"CohWealthRelBottom{cw}", rel(P["wealth_share"], 0), "{:.2f}")
        v.put(f"CohEarnRelBottom{cw}", rel(P["earnings_share"], 0), "{:.2f}")
    v.put("CohOnsWealthTopTenth", ONS_WEALTH_TOP_TENTH, "{:.0f}")
    v.put("CohOnsWealthBottomHalf", ONS_WEALTH_BOTTOM_HALF, "{:.0f}")
    v.put("CohFigLastBirth", cwf.FIG_LAST_BIRTH, "{:.0f}")
    v.put("CohLastAliveBirth", SHOCK - cwf.FIRST_AGE, "{:.0f}")
    v.put("CohFirstAliveBirth", SHOCK - cwf.FIRST_AGE - 79, "{:.0f}")
    v.put("CohReconTolPp", sci(cwf.RECON_TOL_PP))

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
                # ... and at the OBR's repricing speed: the recursion is the model's;
                # the rise is a tenth to two-thirds as large; it ends below the path
                # only in the main arm of UK high and the upper case
                d36, rp36 = debt_pp(arms[a], ref, DEBT_RULE), repriced_debt_pp(arms[a], ref, DEBT_RULE)
                if not abs(repriced_debt_pp(arms[a], ref, DEBT_RULE, full=True) - d36) < 1e-9:
                    fail.append(f"the debt recursion does not reproduce the solve: {sc} {a} {cl}")
                lower = a == "tfp" and sc in ("uk_high", "korinek")
                if (rp36 < 0) != lower:
                    fail.append(f"'at the OBR's speed debt/GDP ends below the path only in the main "
                                f"arm of UK high and the upper case' fails: {sc} {a} {cl} ({rp36:+.2f})")
                if not lower and not 0.05 <= rp36 / d36 <= 0.67:
                    fail.append(f"'the rise is a tenth to two-thirds as large at the OBR's speed' "
                                f"fails: {sc} {a} {cl} ({rp36 / d36:.2f})")
                # the stress test sits below technology unchanged on the wage at 0.1
            # the main arm's wage gap is slower growth, not a cut: the level (the
            # stationary wage re-trended at e^g_y a year) rises over 2027-31
            g_y = float(R[cl]["cont"]["g_y_annual_used"])
            lvl = (s_(arms["tfp"], "w", HEAD) / s_(arms["tfp"], "w", W["ramp_zero_year"])
                   * math.exp(g_y * (HEAD - W["ramp_zero_year"])))
            if not lvl > 1:
                fail.append(f"'the wage level still rises in the main arm' fails: {sc} {cl} ({lvl:.4f})")
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

    # the extremes of 'a tenth to two-thirds' are reached, not just bounded
    ratios = [repriced_debt_pp(r, R[cl]["ref"], DEBT_RULE) / debt_pp(r, R[cl]["ref"], DEBT_RULE)
              for cl in CLOSURES for sc in solved(cl)
              for a, r in R[cl]["arms"][(sc, "")].items()
              if not (a == "tfp" and sc in ("uk_high", "korinek"))]
    if not (0.05 <= min(ratios) < 0.15 and 0.6 < max(ratios) <= 0.67):
        fail.append(f"'a tenth to two-thirds' no longer spans the cells "
                    f"({min(ratios):.2f} to {max(ratios):.2f})")
    phi = obr_passthrough(DEBT_RULE - SHOCK)
    v.put("ObrPassFirstPct", 100 * phi[0], "{:.0f}")
    v.put("ObrPassSixthPct", 100 * phi[5], "{:.0f}")

    # the 2036 guard: only debt/GDP may be quoted in the debt rule's first year
    bad = [k for k in v if "ThirtySix" in k and "Debt" not in k]
    if bad:
        fail.append(f"non-debt macros quote {DEBT_RULE}: {bad[:5]}")
    if fail:
        raise ResultsError("claims in the text no longer hold:\n  " + "\n  ".join(fail))



def check_cohort_claims(R: dict, CR: dict, v: Values) -> None:
    """Sentences of the incidence section stated in words."""
    fail = []
    for cl, (cw, _) in CLOSURES.items():
        X = CR[cl]
        par, b = X["par"], X["b"]
        aw, gw = cwf.alive_weights(par), cwf.group_weights(par)
        ref = R[cl]["ref"]
        avg = {k: cwf.averages(par, X["R"][k]) for k in X["labels"]}
        for a in ARMS:
            # debt-neutral transfers: above the path in 2028, below it every year 2029-2035
            rec_ = R[cl]["arms"][("uk_central", "dn")][a]
            if rec_ is not None and not (pct(rec_, ref, "TR", SHOCK) > 0 and all(
                    pct(rec_, ref, "TR", y) < 0 for y in range(SHOCK + 1, LAST_FLOW + 1))):
                fail.append(f"'debt-neutral transfers higher in {SHOCK}, lower 2029-{LAST_FLOW}' fails: {a} {cl}")
            # debt-neutral: aggregate consumption below the path every year 2028-2035
            rec = R[cl]["arms"][("uk_central", "dn")][a]
            if rec is None or not all(pct(rec, ref, "C", y) < 0 for y in range(SHOCK, LAST_FLOW + 1)):
                fail.append(f"'debt-neutral C below the path every year {SHOCK}-{LAST_FLOW}' fails: {a} {cl}")
            for var in ("dn", ""):
                k = (var, a)
                # bottom group gains more than the top 1% on average, alive in 2028
                if not avg[k]["alive_by_group"][0] > avg[k]["alive_by_group"][6]:
                    fail.append(f"'bottom 25% above top 1%' fails: {k} {cl}")
                # bequests are the largest part, then leisure (alive average)
                pp = X["parts"][k]
                if not pp["bequests"]["all"] > pp["leisure"]["all"] > 0:
                    fail.append(f"'bequest part largest, leisure positive' fails: {k} {cl}")
                if not pp["consumption"]["all"] < pp["bequests"]["all"]:
                    fail.append(f"'consumption part below bequest part' fails: {k} {cl}")
            # debt-neutral lowers the alive average in every arm
            if not avg[("dn", a)]["alive_all"] < avg[("", a)]["alive_all"]:
                fail.append(f"'debt-neutral below the common rule' fails: {a} {cl}")
        # main arm, debt-neutral: positive average, consumption part small and positive
        m = ("dn", "tfp")
        if not avg[m]["alive_all"] > 0:
            fail.append(f"'main-arm debt-neutral average gain' fails: {cl}")
        if not 0 < X["parts"][m]["consumption"]["all"] < 0.2:
            fail.append(f"'main-arm consumption part small and positive' fails: {cl}")
        if not float(aw @ (X["R"][m] < 0) @ gw) < 0.01:
            fail.append(f"'almost nobody alive in 2028 loses in the main arm' fails: {cl}")
        # consumption-only measure exceeds the joint one, main arm
        if not float(aw @ X["Rc"][m] @ gw) > avg[m]["alive_all"]:
            fail.append(f"'consumption-only exceeds joint' fails: {cl}")
        # main arm: gain rises with age up to the 60s, falls for the oldest
        allg = X["R"][m] @ gw
        alive = aw > 0
        peak = SHOCK - int(b[np.argmax(np.where(alive, allg, -np.inf))])
        if not 55 <= peak <= 75:
            fail.append(f"'the gain peaks for those in their 60s in 2028' fails: {cl} ({peak})")
        # the C gap turns positive in the main arm in the late 2030s
        fc = cwf.first_c_above(cl, m)
        if fc is None or not 2036 <= fc <= 2040:
            fail.append(f"'main-arm consumption above the path from the late 2030s' fails: {cl} ({fc})")
        # labour is a smaller share of income for the bottom group
        P = X["profile"]
        if not P["labour"][0] < P["labour"][6]:
            fail.append(f"'labour share of income lower for the bottom group' fails: {cl}")
        if not P["transfers"][0] > P["transfers"][6]:
            fail.append(f"'transfers a larger share for the bottom group' fails: {cl}")
        # wealth per head is spread more evenly than earnings
        rw = P["wealth_share"][6] / P["earnings_share"][6]
        if not rw < 1:
            fail.append(f"'top 1% hold a smaller share of wealth than of earnings' fails: {cl}")
        if not X["wealth"]["top_tenth_pct"] < ONS_WEALTH_TOP_TENTH:
            fail.append(f"'model wealth less concentrated at the top than ONS' fails: {cl}")
        # debt-neutral transfer change costs the bottom group more (age 45, main arm)
        ia = cwf.income_accounts(cl, m)
        s45 = 45 - cwf.FIRST_AGE
        if not ia["transfers"][s45, 0] < ia["transfers"][s45, 6] < 0:
            fail.append(f"'lower transfers cost the bottom group more' fails: {cl}")
        if not ia["labour"][s45, 0] > ia["labour"][s45, 6]:
            fail.append(f"'the wage fall costs the top 1% more' fails: {cl}")
        # fill sensitivity small over the charted cohorts
        if not float(v[f"CohFillMaxPp{cw}"]) < 0.1:
            fail.append(f"'the fill moves no charted cohort by 0.1pp' fails: {cl}")
    # what the average rests on (PR #24 referee): sources, the no-bequest measure, the charge-back
    for cl, (cw, _) in CLOSURES.items():
        X = CR[cl]
        for k in X["labels"]:
            # joint and consumption-only measures agree in sign in every cell
            J, Co = X["R"][k], X["Rc"][k]
            if np.isnan(Co).any() or not (np.sign(J) == np.sign(Co)).all():
                fail.append(f"'the two measures have the same sign in every cohort and group' fails: {k} {cl}")
            src = X["rob"][k]["sources"]
            if not (src["capital"] > 0 > src["labour"]):
                fail.append(f"'capital income up, labour income down in every arm' fails: {k} {cl}")
        dn = {a: X["rob"][("dn", a)] for a in ARMS}
        rng = lambda f: max(f(x) for x in dn.values()) - min(f(x) for x in dn.values())
        if not rng(lambda x: x["sources"]["labour"]) > rng(lambda x: x["sources"]["capital"]):
            fail.append(f"'the arms differ mainly in how far the wage falls' fails: {cl}")
        m = dn["tfp"]
        sg = m["sources_by_group"]
        if not (sg["labour"][6] < sg["labour"][0] < 0 and sg["capital"][0] > 0 and sg["capital"][6] > 0):
            fail.append(f"'labour income falls more for the top 1%, capital rises for both' fails: {cl}")
        if not m["no_bequest_avg"] > 0 or not min(m["charged"]["joint_avg"]) > 0:
            fail.append(f"'main arm positive without bequests and with the cost charged' fails: {cl}")
        if not (0 < m["no_bequest_avg"] < m["joint_avg"]):
            fail.append(f"'the no-bequest average is below the joint one' fails: {cl}")
        gm, gst = dn["tfp"]["charged"]["g_shortfall"], dn["stress"]["charged"]["g_shortfall"]
        if not (gm["ss_pct_gdp"] < 0 and gst["ss_pct_gdp"] < 0 and abs(gm["ss_pct_c"]) <= abs(gst["ss_pct_c"])):
            fail.append(f"'G below its GDP share in the steady state, main arm least' fails: {cl}")
        # 'adults aged up to about N lose on average once the cost is charged': every age 20..N
        par = X["par"]
        for f in cwf.FILL_PATHS:
            lam = cwf.chargeback(cl, ("dn", "tfp"), f)["joint"]
            old_ = cwf.oldest_losing_on_average(par, lam)
            aw_, gw_ = cwf.alive_weights(par), cwf.group_weights(par)
            ages_ = SHOCK - X["b"]
            mm = (aw_ > 0) & (ages_ <= (old_ or 0))
            if old_ is None or not ((lam[mm] @ gw_) < 0).all():
                fail.append(f"'once the cost is charged, every age up to {old_} loses on average' fails: {cl} {f}")
    X = CR["zk0.1"]
    m = X["rob"][("dn", "tfp")]
    # 'without both, close to zero, with about half of adults losing' (central closure)
    if not all(-0.2 < x < 0.2 for x in m["charged"]["no_bequest_avg"]):
        fail.append("'without both features the main-arm average is close to zero' fails")
    if not all(40 <= x <= 60 for x in m["charged"]["no_bequest_losing_pct"]):
        fail.append("'without both features about half of adults lose' fails")
    if not abs(m["sources"]["total"] - float(cwf.alive_weights(X["par"]) @ X["Rc"][("dn", "tfp")]
                                              @ cwf.group_weights(X["par"]))) < 0.3:
        fail.append("'the lifetime income total is close to the consumption-only measure' fails")
    # stress test, debt-neutral, central closure: about zero on average, young lose in every group
    s = ("dn", "stress")
    if not abs(cwf.averages(X["par"], X["R"][s])["alive_all"]) < 0.1:
        fail.append("'stress test debt-neutral average about zero at 0.1' fails")
    if X["rob"][s]["all_lose_up_to_age"] != int(v["CohStressDnCentralAllLoseUpToAge"]):
        fail.append("'every group aged N or younger loses in the stress test' is not contiguous from 20")
    if not v["CohStressDnCentralAllLoseUpToAge"].isdigit() or int(v["CohStressDnCentralAllLoseUpToAge"]) < 35:
        fail.append("'in the stress test every group aged 35 or under loses' fails")
    ages = SHOCK - X["b"]
    old = (ages >= 65) & (ages <= 99)
    if not (X["R"][s][old] > 0).all():
        fail.append("'in the stress test everyone 65 and over gains' fails")
    # the stress-test rank flips are tiny
    lam = X["R"][s]
    flip = lam[:, 0] <= lam[:, 6]
    if flip.any() and not np.abs(lam[flip, 0] - lam[flip, 6]).max() < 0.03:
        fail.append("'where the ranking flips the two differ by less than 0.03' fails")
    # technology unchanged: losers are the younger and higher-earning
    f = X["R"][("dn", "zfixed")]
    aw = cwf.alive_weights(X["par"])
    lose_g = aw @ (f < 0)
    if not (lose_g[0] < lose_g[6] and all(a <= b_ for a, b_ in zip(lose_g, lose_g[1:]))):
        fail.append(f"'technology unchanged: losers concentrated in higher groups' fails: {lose_g}")
    if not ages[(f < 0).any(axis=1) & (aw > 0)].max() < 50:
        fail.append("'technology unchanged: only younger adults lose' fails")
    # at the bound the stress test still gives an average gain
    if not cwf.averages(CR["zk0"]["par"], CR["zk0"]["R"][s])["alive_all"] > 0:
        fail.append("'the stress test averages a gain at the bound' fails")
    # the charge-back stays first order (\pending in the incidence section): the solve with
    # debt-neutral transfers to the horizon is not like-for-like against the continuation,
    # whose G leaves its GDP share under the debt rule from 2036
    if cwf.dnfull_available("zk0.1") and cwf.dnfull_comparable("zk0.1"):
        fail.append("'the debt-neutral-to-the-horizon solve also moves the no-shock path's "
                    "consolidation onto transfers' no longer holds: quote the solve")
    if fail:
        raise ResultsError("cohort claims in the text no longer hold:\n  " + "\n  ".join(fail))

def build() -> tuple[Values, list[str]]:
    R = load_all()
    v = Values()
    emit(v, R)
    check_claims(R, v)
    CR = cohort_results()
    emit_cohorts(v, CR)
    check_cohort_claims(R, CR, v)
    sources = [f"baseline  {BASELINE_FILE.relative_to(ROOT)} (calibration, OBR comparison)"]
    for cl in CLOSURES:
        labs = sorted(r["label"] for x in R[cl]["arms"].values() for r in x.values() if r)
        sources.append(f"{cl}  {sp.OUTDIR}/{cl}/: continuation + " + ", ".join(labs))
        pend = sorted(f"{sc}{'_' + var if var else ''}" for (sc, var), x in R[cl]["arms"].items()
                      if any(r is None for r in x.values()))
        sources.append(f"{cl}  pending: " + ", ".join(pend))
    sources.append("nics  analysis/nics/nics_2027.json, nics_2028.json")
    sources.append("cohorts  analysis/surprise/cohorts/<closure>/*.npz via paper/cohort_welfare.py")
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
