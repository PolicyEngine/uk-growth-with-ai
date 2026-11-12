"""Cohort incidence export for the paper (R1-R4 reruns, #27, #24).

From the SS/TPI pickles each rerun solve leaves under $WORK/<closure>/<label>/
(no re-solve), write analysis/rerun/cohorts/<closure>/<label>.npz with, per
period t (2026 + t, all T periods), age s and lifetime-earnings type j:

    c, n, b_s, b_sp1, bq, tr   (T, S, J) detrended, float32
    ss_c, ss_n, ss_b_s          (S, J) steady state, float32

``--params`` additionally writes <closure>/params.npz with what a
consumption-equivalent welfare calculation needs (beta, sigma, chi_n,
b_ellipse, upsilon, ltilde, frisch, e, lambdas, rho, omega, g_y, g_n, chi_b,
S, J, T, start_year).  It builds OG-UK's specifications once per closure
(no solve, but ~15 GB for a few minutes), so run it only when no solve is
running.  Household parameters do not differ across the arms of a closure.

    WORK=~/ugai-rerun-work PY=<og-uk venv python> $PY analysis/rerun/export_cohorts.py [--params]
"""
import json
import os
import pickle
import sys
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))
from uk_growth_with_ai import rerun  # noqa: E402

WORK = Path(os.environ["WORK"])
OUT = REPO / "analysis" / "rerun" / "cohorts"
TPI_KEYS = ("c", "n", "b_s", "b_sp1", "bq", "tr")
PARAMS = ("beta", "sigma", "chi_n", "b_ellipse", "upsilon", "ltilde", "frisch", "e",
          "lambdas", "rho", "omega", "omega_SS", "omega_S_preTP", "rho_preTP",
          "imm_rates", "imm_rates_preTP", "g_n_preTP", "g_y", "g_n", "g_n_ss", "chi_b",
          "S", "J", "T", "start_year", "zeta_K")


def accepted(c):
    done = rerun.load(REPO / "analysis/rerun/output", c)
    base = rerun.accepted_baseline(done)
    out = [base["label"]] if base else []
    if "share_shift_tfp_ramp" in done:
        out.append("share_shift_tfp_ramp")
    if "share_shift_ramp_zfixed" in done:
        out.append("share_shift_ramp_zfixed")
    if base and (r4 := rerun.accepted_r4(done, base)):
        out.append(r4["label"])
    for k in ("share_shift_tfp_ramp_fs", "share_shift_ramp_zfixed_fs"):   # fixed spending
        if k in done:
            out.append(k)
    if base and (r4 := rerun.accepted_r4(done, base, fs=True)):
        out.append(r4["label"])
    return out


def main(params=False):
    for c in rerun.CLOSURES:
        (OUT / c).mkdir(parents=True, exist_ok=True)
        for label in accepted(c):
            d = WORK / c / label
            tpi = pickle.load(open(d / "TPI" / "TPI_vars.pkl", "rb"))
            ss = pickle.load(open(d / "SS" / "SS_vars.pkl", "rb"))
            arrs = {k: np.asarray(tpi[k], dtype=np.float32) for k in TPI_KEYS}
            arrs.update({f"ss_{k}": np.asarray(ss[k], dtype=np.float32)
                         for k in ("c", "n", "b_s")})
            np.savez_compressed(OUT / c / f"{label}.npz", **arrs)
            print(c, label, {k: v.shape for k, v in arrs.items() if k == "c"})
        if params:
            from uk_growth_with_ai import demography, solve
            from uk_growth_with_ai.solve import _load_oguk
            import tempfile
            _, _, api, _, _ = _load_oguk()
            tmp = tempfile.mkdtemp()
            os.chdir(WORK)
            captured = solve._capture_pop_objs()
            p = api._build_specs(rerun.START, None, tmp, tmp, baseline=True,
                                 age_specific="pooled", multi_sector=False,
                                 param_overrides={"tG1": rerun.TG1, "g_y_annual": rerun.G_Y_ANNUAL,
                                                  "zeta_K": [rerun.CLOSURES[c]]})
            # The solves ran on the R2-corrected demographics (run_arm applies
            # these after _build_specs), so the exported rho / imm_rates /
            # pre-TP inputs must be the corrected ones too.  Refuse to write
            # anything that is not what the accepted baseline recorded.
            demography.apply_pretp(p, captured)
            demography.apply_splice(p, solve.FINAL_DATA_YEAR - solve.START - 1)
            done = rerun.load(REPO / "analysis/rerun/output", c)
            want = rerun.accepted_baseline(done)["demographics"]["hash"]
            got = demography.hashes(p)
            if got != want:
                raise RuntimeError(f"{c}: demographic inputs differ from the accepted "
                                   f"baseline's: {got} != {want}")
            vals = {k: np.asarray(getattr(p, k)) for k in PARAMS if hasattr(p, k)}
            np.savez_compressed(OUT / c / "params.npz", **vals)
            print(c, "params", sorted(vals))
    write_readme()


def roles(c):
    """Which file is which arm, per closure (the labels are solve names)."""
    done = rerun.load(REPO / "analysis/rerun/output", c)
    base = rerun.accepted_baseline(done)
    r4 = rerun.accepted_r4(done, base) if base else None
    return {"baseline": base["label"] if base else None,
            "share_shift_tfp": "share_shift_tfp_ramp",
            "share_shift (R4 Z, the results-file arm)": r4["label"] if r4 else None,
            "share_shift at the fixed-input Z (not in the results file)":
                "share_shift_ramp_zfixed"}


def write_readme():
    (OUT / "README.json").write_text(json.dumps({
        "what": "household paths by period, age and lifetime-earnings type; see "
                "analysis/rerun/export_cohorts.py", "units": "detrended model units",
        "periods": "t = 0 is 2026; T periods", "dims": "(T, S, J)",
        "files": {c: roles(c) for c in rerun.CLOSURES},
        "variables": {
            "c": "consumption", "n": "labour supply",
            "b_s": "assets held at the start of the period (0 at the first model age)",
            "b_sp1": "assets carried into the next period",
            "bq": "bequests received", "tr": "government transfers received",
            "ss_c, ss_n, ss_b_s": "the same arm's steady-state profiles, (S, J)"},
        "weights": "not in these files: aggregating over ages and types needs omega "
                   "(T, S) and lambdas (J) from <closure>/params.npz, which "
                   "`export_cohorts.py --params` writes (not yet run, see "
                   "docs/rerun_r1_r4.md)"}, indent=1) + "\n")


if __name__ == "__main__":
    main(params="--params" in sys.argv)
