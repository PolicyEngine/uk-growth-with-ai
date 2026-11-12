"""The corrective reruns R1-R4 (tracker #27), one solve per process.

    python -m uk_growth_with_ai rerun next   --closure zk0.1 --stage baseline
    python -m uk_growth_with_ai rerun step   --closure zk0.1 --stage baseline --work DIR
    python -m uk_growth_with_ai rerun gate   --closure zk0.1 [--approve --note TEXT]
    python -m uk_growth_with_ai rerun assemble --closure zk0.1 --out data/scenarios_zk0.1.json

Every solve writes one JSON file, ``<outdir>/<closure>/<label>.json``.  ``next``
reads what exists and prints the next solve's label (nothing when the stage is
done), so a stopped run resumes at the solve that was interrupted and never
repeats a finished one.  ``analysis/rerun/driver.sh`` loops over it.

Settings common to every solve (stated in each results file):

* R2 (#15): UK-consistent pre-TP demographics and the 2027->28 data-splice
  repair (``demography``), baseline and arms alike.
* R3 (#16): ``zeta_K`` per closure (``CLOSURES``); ``zeta_D = 0.4`` and the 2%
  world rate are OG-UK's and are recorded, not changed.
* R1 (#32): the baseline's pre-tG1 G/Y is its steady-state G/Y plus a shift,
  solved by secant so baseline debt/GDP in 2030 equals the OBR's March 2026
  EFO figure (``DEBT_TARGET_2030``) from the common 95.0% start.  The arms
  inherit the calibrated share (issue #2's common-G/Y rule).
* R4 (#8): ``share_shift``'s Z is solved by secant so its 2030 equilibrium GDP
  gap is zero (``R4_YEAR``); ``share_shift_tfp`` keeps the fixed-input Z
  (+3.1% at the closure's own baseline 2026 K and L), as before.  The
  fixed-input ``share_shift`` arm is solved too (``share_shift_ramp_zfixed``):
  it is the first secant point and the like-for-like comparison with the old
  definition.
"""

from __future__ import annotations

import json
import math
import os
import time
from pathlib import Path

import numpy as np

from .calibrate import solve_scenario
from .scenarios import G_BASE, G_Y_ANNUAL, SCENARIOS, START, TG1

CLOSURES = {"zk0.1": 0.1, "zk0": 0.0}
YEARS = list(range(START, START + 5))

# R1 ------------------------------------------------------------------------
# OBR March 2026 EFO, public sector net debt, % of GDP, FY 2030-31
# (data/obr_history.json, panel "D", x = 2030).  Read from the file at use.
DEBT_TOL_PP = 0.10           # accept a baseline within 0.1pp of the target
DEBT_SLOPE0 = 400.0          # first-step guess: pp of 2030 D/Y per unit of G/Y
                             # (four years of extra spending, roughly 1:1)
MAX_BASELINE_PASSES = 5

# R4 ------------------------------------------------------------------------
R4_YEAR = 2030               # #8 option (b): "the TPI path of Y matches
                             # baseline in 2030"; Korinek et al.'s horizon
R4_TOL_PP = 0.01             # |GDP gap| in pp
R4_SLOPE0 = 1.0              # first step: d ln Y_2030 / d ln Z
MAX_R4_ITER = 5


def debt_target_2030() -> float:
    from .data_access import DATA
    panels = json.loads((DATA / "obr_history.json").read_text())["panels"]
    d = next(p for p in panels if p["var"] == "D")["obr"]
    return float(dict(zip(d["x"], d["y"]))[2030])


def _dy(rec, i=4):
    return rec["D"][i] / rec["Y"][i] * 100


def _gap(rec, base, year=R4_YEAR):
    i = YEARS.index(year)
    return (rec["Y"][i] / base["Y"][i] - 1) * 100


def load(outdir, closure) -> dict:
    d = Path(outdir) / closure
    if not d.exists():
        return {}
    return {f.stem: json.loads(f.read_text()) for f in sorted(d.glob("*.json"))
            if not f.stem.startswith("GATE")}


# --- baseline (R1) -----------------------------------------------------------

def baseline_passes(done: dict) -> list[dict]:
    ps = [r for k, r in done.items() if k.startswith("baseline_p")]
    return sorted(ps, key=lambda r: int(r["label"].rsplit("p", 1)[1]))


def accepted_baseline(done: dict):
    tgt = debt_target_2030()
    ok = [r for r in baseline_passes(done) if abs(_dy(r) - tgt) <= DEBT_TOL_PP]
    return min(ok, key=lambda r: abs(_dy(r) - tgt)) if ok else None


def _prior_debt_2030(closure, prior_dir):
    """2030 D/Y of the #30 stock-demographics baseline at this closure, if present."""
    f = Path(prior_dir) / f"{closure}_baseline.json" if prior_dir else None
    if f and f.exists():
        s = json.loads(f.read_text())["series"]
        return s["D"][4] / s["Y"][4] * 100
    return None


def next_baseline(done, closure, prior_dir=None):
    if accepted_baseline(done) is not None:
        return None
    ps = baseline_passes(done)
    if len(ps) >= MAX_BASELINE_PASSES:
        raise RuntimeError(f"{closure}: {len(ps)} baseline passes and none within "
                           f"{DEBT_TOL_PP}pp of the debt target; investigate")
    tgt = debt_target_2030()
    if not ps:
        prior = _prior_debt_2030(closure, prior_dir)
        shift = 0.0 if prior is None else (tgt - prior) / DEBT_SLOPE0
        why = (f"first guess from the #30 baseline (2030 D/Y {prior:.2f}%)"
               if prior is not None else "no prior: shift 0")
    elif len(ps) == 1:
        shift = ps[0]["alpha_G_shift"] + (tgt - _dy(ps[0])) / DEBT_SLOPE0
        why = f"Newton step, slope {DEBT_SLOPE0}"
    else:
        a, b = ps[-2], ps[-1]
        slope = (_dy(b) - _dy(a)) / (b["alpha_G_shift"] - a["alpha_G_shift"])
        shift = b["alpha_G_shift"] + (tgt - _dy(b)) / slope
        why = f"secant, slope {slope:.1f}"
    return {"label": f"baseline_p{len(ps)}", "arm": "baseline",
            "alpha_G_shift": float(shift), "why": why}


# --- arms (R3 closure, R4) -----------------------------------------------------

def r4_points(done: dict, base: dict) -> list[tuple[float, float, str]]:
    keys = ["share_shift_ramp_zfixed"] + sorted(
        (k for k in done if k.startswith("share_shift_ramp_r4_")),
        key=lambda k: int(k.rsplit("_", 1)[1]))
    return [(math.log(done[k]["Z_terminal"]), _gap(done[k], base), k)
            for k in keys if k in done]


def accepted_r4(done, base):
    pts = [p for p in r4_points(done, base) if abs(p[1]) <= R4_TOL_PP]
    return done[min(pts, key=lambda p: abs(p[1]))[2]] if pts else None


def next_arm(done, closure):
    base = accepted_baseline(done)
    if base is None:
        raise RuntimeError(f"{closure}: no accepted baseline; run the baseline stage")
    cal = {n: solve_scenario(s, base["K"][0], base["L"][0], G_BASE)
           for n, s in SCENARIOS.items()}
    common = {"base_label": base["label"], "alpha_G": base["alpha_G_used"]}
    if "share_shift_tfp_ramp" not in done:
        return {"label": "share_shift_tfp_ramp", "arm": "share_shift_tfp",
                "Z": cal["share_shift_tfp"]["Z"], "gamma": cal["share_shift_tfp"]["gamma"],
                "why": "fixed-input Z (+3.1% at baseline 2026 K, L)", **common}
    ss = cal["share_shift"]
    if "share_shift_ramp_zfixed" not in done:
        return {"label": "share_shift_ramp_zfixed", "arm": "share_shift", "Z": ss["Z"],
                "gamma": ss["gamma"], "why": "fixed-input Z (zero technology wedge); "
                "R4 secant point 0", **common}
    if accepted_r4(done, base) is not None:
        return None
    pts = r4_points(done, base)
    n = len(pts) - 1
    if n >= MAX_R4_ITER:
        raise RuntimeError(f"{closure}: R4 did not reach |gap| <= {R4_TOL_PP}pp in "
                           f"{MAX_R4_ITER} iterations: {pts}")
    if len(pts) == 1:
        lz = pts[0][0] - pts[0][1] / 100 / R4_SLOPE0
        why = f"Newton step, d lnY/d lnZ = {R4_SLOPE0}"
    else:
        (z0, g0, _), (z1, g1, _) = pts[-2], pts[-1]
        slope = (g1 - g0) / (z1 - z0)
        lz = z1 - g1 / slope
        why = f"secant, d gap(pp)/d lnZ = {slope:.1f}"
    return {"label": f"share_shift_ramp_r4_{n + 1}", "arm": "share_shift",
            "Z": float(math.exp(lz)), "gamma": ss["gamma"], "why": why, **common}


def gate_ok(outdir, closure) -> bool:
    f = Path(outdir) / closure / "GATE_baseline.json"
    return f.exists() and json.loads(f.read_text()).get("approved") is True


def next_step(outdir, closure, stage, prior_dir=None):
    done = load(outdir, closure)
    if stage == "baseline":
        return next_baseline(done, closure, prior_dir)
    if not gate_ok(outdir, closure):
        raise RuntimeError(f"{closure}: the baseline sanity gate is not approved "
                           f"({Path(outdir) / closure / 'GATE_baseline.json'})")
    return next_arm(done, closure)


# --- one solve ------------------------------------------------------------------

def _env():
    """Environment fixes from #18, before dask / huggingface_hub import."""
    os.environ.setdefault("DASK_DISTRIBUTED__SCHEDULER__WORKER_TTL", "None")
    os.environ.setdefault("HF_HUB_DISABLE_SHARED_BLOBS", "1")
    if not (os.environ.get("HF_TOKEN") and os.environ.get("HUGGING_FACE_TOKEN")):
        try:
            from huggingface_hub import get_token
            tok = get_token()
        except Exception:
            tok = None
        if tok:   # never printed
            os.environ.setdefault("HF_TOKEN", tok)
            os.environ.setdefault("HUGGING_FACE_TOKEN", tok)


def run_step(outdir, closure, stage, work, prior_dir=None) -> dict | None:
    spec = next_step(outdir, closure, stage, prior_dir)
    if spec is None:
        print(f"{closure} {stage}: nothing to do", flush=True)
        return None
    _env()
    from .solve import _load_oguk, provenance, run_arm

    handles = _load_oguk()
    TPI, SS, api, Client, LocalCluster = handles
    work = Path(work) / closure
    zk = CLOSURES[closure]
    settings = {"tG1": TG1, "g_y_annual": G_Y_ANNUAL, "g_n_source": "vendored",
                "zeta_K": zk, "pretp": True, "splice": True}
    client = Client(LocalCluster(processes=False, n_workers=1, threads_per_worker=4,
                                 dashboard_address=None))
    print(f"{closure} {stage}: {spec['label']} ({spec['why']})", flush=True)
    try:
        if spec["arm"] == "baseline":
            bdir = work / spec["label"]
            rec = run_arm(f"{closure} {spec['label']}", G_BASE, False, None, str(bdir),
                          client, handles, baseline=True,
                          alpha_G_shift=spec["alpha_G_shift"], **settings)
        else:
            bdir = work / spec["base_label"]
            if not (bdir / "SS" / "SS_vars.pkl").exists():
                raise RuntimeError(f"baseline pickles missing at {bdir}: re-solve "
                                   f"{spec['base_label']} (delete its JSON) first")
            adir = work / spec["label"]
            rec = run_arm(f"{closure} {spec['label']}", spec["gamma"], True, spec["Z"],
                          str(bdir), client, handles, alpha_G=spec["alpha_G"],
                          out_dir=str(adir), **settings)
    finally:
        client.close()
    rec.update({"label": spec["label"], "closure": closure, "stage": stage,
                "spec": spec, "provenance": provenance(TPI, api)})
    out = Path(outdir) / closure / f"{spec['label']}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".tmp")
    tmp.write_text(json.dumps(rec, indent=1))
    tmp.replace(out)
    print(f"wrote {out}", flush=True)
    return rec


# --- the results file -------------------------------------------------------------

def assemble(outdir, closure) -> dict:
    """The results file for one closure, in the schema `check` and `dashboard` read."""
    from .solve import provenance
    done = load(outdir, closure)
    base = accepted_baseline(done)
    if base is None:
        raise RuntimeError(f"{closure}: no accepted baseline")
    tfp = done.get("share_shift_tfp_ramp")
    ss = accepted_r4(done, base)
    if tfp is None or ss is None:
        raise RuntimeError(f"{closure}: arms incomplete (share_shift_tfp_ramp "
                           f"{'ok' if tfp else 'missing'}, share_shift R4 "
                           f"{'ok' if ss else 'not converged'})")
    zf = done["share_shift_ramp_zfixed"]
    cal = {n: solve_scenario(s, base["K"][0], base["L"][0], G_BASE)
           for n, s in SCENARIOS.items()}
    strip = lambda r: {k: v for k, v in r.items() if k not in ("provenance",)}
    arms = {"share_shift_tfp_ramp": strip(tfp), "share_shift_ramp": strip(ss)}
    cl = base["closure"]
    res = {
        "provenance": {**base["provenance"],
                       "assembled_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                       "solves": {k: {"utc": r["provenance"]["utc"],
                                      "elapsed_min": r["elapsed_min"]}
                                  for k, r in done.items()},
                       "note": "Corrective reruns R1-R4 (#27). One solve per process "
                               "via `python -m uk_growth_with_ai rerun`; every solve's "
                               "full record is in analysis/rerun/output/" + closure},
        "arms_requested": list(arms),
        "arm_status": {a: "ok" for a in arms},
        "baseline": strip(base),
        **arms,
        "assumptions": {
            "epsilon": 1.0, "gamma_base": G_BASE,
            "gamma_shocked": cal["share_shift_tfp"]["gamma"],
            "gamma_only_output_gain": cal["share_shift_tfp"]["gamma_only_output_gain"],
            "Z_share_shift_tfp": tfp["Z_terminal"],
            "Z_share_shift": ss["Z_terminal"],
            "Z_share_shift_fixed_input": zf["Z_terminal"],
            "Z_share_shift_rule": "equilibrium_gdp_gap",
            "Z_share_shift_year": R4_YEAR,
            "Z_share_shift_tol_pp": R4_TOL_PP,
            "share_shift_tfp_target": SCENARIOS["share_shift_tfp"].target,
            "share_shift_target": (
                f"labour share -3.9pp (size from Korinek et al. 2026, Table 3) with Z "
                f"solved so that the {R4_YEAR} equilibrium GDP gap against the baseline "
                f"is zero (R4, #8); the fixed-input Z, a zero technology wedge at the "
                f"baseline's 2026 K and L, is Z_share_shift_fixed_input"),
            "counterfactual": "shocked arms inherit baseline initial assets and debt",
            "fiscal": "every arm uses the baseline's alpha_G",
            "closure": cl,
            "debt_calibration": {
                "rule": "baseline pre-tG1 G/Y = steady-state G/Y + alpha_G_shift, "
                        "solved so 2030 debt/GDP equals the OBR's",
                "target_2030_pct": debt_target_2030(), "tol_pp": DEBT_TOL_PP,
                "alpha_G_ss": base["alpha_G_ss"], "alpha_G_shift": base["alpha_G_shift"],
                "alpha_G_used": base["alpha_G_used"],
                "debt_gdp_pct": [_dy(base, i) for i in range(5)],
                "passes": [{"label": r["label"], "alpha_G_shift": r["alpha_G_shift"],
                            "debt_gdp_2030": _dy(r)} for r in baseline_passes(done)],
            },
            "r4_iterations": [{"label": k, "Z": math.exp(lz), "gdp_gap_pct": g}
                              for lz, g, k in r4_points(done, base)],
            "demographics": "UK-consistent pre-TP inputs and the 2027->28 data-splice "
                            "repair (uk_growth_with_ai.demography)",
            "tG1": TG1, "g_y_annual": G_Y_ANNUAL, "g_n_source": "vendored",
            "zeta_K": cl["zeta_K"], "pretp": True, "splice": True,
        },
    }
    return res


# --- sanity gates ------------------------------------------------------------------

def _obr(var):
    from .data_access import DATA
    panels = json.loads((DATA / "obr_history.json").read_text())["panels"]
    d = next(p for p in panels if p["var"] == var)["obr"]
    m = dict(zip(d["x"], d["y"]))
    return [m[y] for y in YEARS]


def primary_balance(rec, n=5):
    s = rec["series"]
    out = []
    for i in range(n):
        spend = s["G"][i] + s["TR"][i] + s.get("agg_pension_outlays", [0] * n)[i] \
            + s.get("I_g", [0] * n)[i]
        out.append((s["total_tax_revenue"][i] - spend) / s["Y"][i] * 100)
    return out


def baseline_report(rec) -> dict:
    """What the gate checks before any arm runs: debt, residuals, growth, demography."""
    from .report import growth_path
    d = rec["diagnostics"]
    rc = d["rc_rel_Y_signed"]
    lom = rec["demographics"]["law_of_motion_solved"]
    return {
        "label": rec["label"], "alpha_G_ss": rec["alpha_G_ss"],
        "alpha_G_shift": rec["alpha_G_shift"], "alpha_G_used": rec["alpha_G_used"],
        "debt_gdp_pct": [_dy(rec, i) for i in range(5)],
        "obr_debt_gdp_pct": _obr("D"),
        "primary_balance_pct": primary_balance(rec),
        "tax_gdp_pct": [rec["total_tax_revenue"][i] / rec["Y"][i] * 100 for i in range(5)],
        "obr_tax_gdp_pct": _obr("total_tax_revenue"),
        "rc_rel_Y_pct": {y: rc[i] * 100 for i, y in enumerate(YEARS)},
        "rc_rel_Y_max_abs_interior_pct": d["rc_rel_Y_max_abs_interior"] * 100,
        "growth_pct_2027_30": list(growth_path(rec["Y"], rec["g_y_annual_used"],
                                               rec["g_n_used"])),
        "obr_growth_2027_30_mean": 1.6,
        "r": rec["r"], "r_gov": rec["r_gov"],
        "lom_max_abs_rel": max(x["max_abs_rel"] for x in lom),
        "tpi_converged": d.get("tpi_converged"),
        "tpi_final_distance": d.get("tpi_final_distance"),
        "tpi_iterations": d.get("tpi_iterations"),
        "euler_max": max(d["euler_savings_max"], d["euler_labour_max"]),
        "identities_maxabs": rec["identities_maxabs"],
    }


def arm_report(rec, base, prior=None, prior_base=None) -> dict:
    """Identities, residuals, GNI <= GDP and the 2026-30 gaps of one arm.

    ``prior`` / ``prior_base``: the #30 solve of the same arm and closure, for
    the sign comparison."""
    s, b = rec["series"], base["series"]
    gap = lambda v, x=s, y=b: [(x[v][i] / y[v][i] - 1) * 100 for i in range(5)]
    out = {
        "label": rec["label"], "Z": rec["Z_terminal"],
        "identities_maxabs": rec["identities_maxabs"],
        "rc_rel_Y_pct": [x * 100 for x in rec["diagnostics"]["rc_rel_Y_signed"][:5]],
        "rc_rel_Y_max_abs_interior_pct": rec["diagnostics"]["rc_rel_Y_max_abs_interior"] * 100,
        "tpi_converged": rec["diagnostics"].get("tpi_converged"),
        "tpi_final_distance": rec["diagnostics"].get("tpi_final_distance"),
        "gni_le_gdp": all(g <= y + 1e-12 for g, y in zip(s["GNI"][:5], s["Y"][:5])),
        "K_f_positive": all(k > 0 for k in s["K_f"][:5]),
        "gap_pct": {v: gap(v) for v in ("Y", "GNI", "K", "K_d", "K_f", "L", "w", "C", "I")},
        "dr_bp": [(s["r"][i] - b["r"][i]) * 1e4 for i in range(5)],
        "debt_gdp_pp": [_dy(rec, i) - _dy(base, i) for i in range(5)],
    }
    if prior is not None and prior_base is not None:
        ps, pb = prior["series"], prior_base["series"]
        pg = {v: [(ps[v][i] / pb[v][i] - 1) * 100 for i in range(5)]
              for v in ("Y", "K", "L", "w", "C", "I")}
        pg["r_bp"] = [(ps["r"][i] - pb["r"][i]) * 1e4 for i in range(5)]
        out["prior_30_gap_pct"] = pg
        mine = {**{v: out["gap_pct"][v] for v in ("Y", "K", "L", "w", "C", "I")},
                "r_bp": out["dr_bp"]}
        out["sign_matches_30_2030"] = {v: (np.sign(mine[v][4]) == np.sign(pg[v][4])
                                           or abs(mine[v][4]) < 0.05)
                                       for v in mine}
    return out


def write_gate(outdir, closure, note: str) -> Path:
    done = load(outdir, closure)
    base = accepted_baseline(done)
    if base is None:
        raise RuntimeError(f"{closure}: no accepted baseline to approve")
    f = Path(outdir) / closure / "GATE_baseline.json"
    f.write_text(json.dumps({"approved": True, "baseline": base["label"],
                             "utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                             "note": note, "report": baseline_report(base)}, indent=1))
    return f
