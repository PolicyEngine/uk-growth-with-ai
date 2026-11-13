"""Cohort (household) paths for the 2028-surprise solves: the welfare inputs.

    WORK=~/ugai-rerun-work python3 analysis/surprise/export_cohorts.py [labels...]

From the SS/TPI pickles each surprise solve leaves under
$WORK/surprise2028/<closure>/<label>/ (no re-solve; pickles are never
deleted), this writes analysis/surprise/cohorts/<closure>/<label>.npz with
float32 arrays indexed by CALENDAR period (t = 0 is 2026), age s and
lifetime-earnings type j:

    c, n, b_s, b_sp1, bq, tr   (T, S, J)   2026-27 from the committed baseline's
                                           TPI, 2028 on from the surprise run
                                           (run period t - 2), T = 60 periods
    ss_c, ss_n, ss_b_s          (S, J)     the run's steady state

Splicing is exact for the households. Every arm equals the baseline in
2026-27, and the run starts from the baseline's end-of-2027 wealth (checked:
the restart's b_s at 2028 equals the baseline's b_sp1 at 2027).

params.npz per closure is OG-UK's household and demographic parameters with
the R2-corrected demographics, the same object the solves ran on. It is
not rebuilt here (a spec build is ~15 GB). It is taken from the R1-R4
export (PR #36, analysis/rerun/cohorts/<closure>/params.npz at 37bd0e2), and
this script refuses it unless its omega, g_n, rho, imm_rates and pre-period
hashes equal the accepted baseline's recorded ones.  Its demographics are on
the calendar from 2026, matching the spliced arrays.

Default labels: per closure, the continuation and the UK central arms under
the common rule and debt-neutral transfers (tfp, fixed-input Z, accepted R4).
"""

from __future__ import annotations

import json
import os
import pickle
import subprocess
import sys
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))
from uk_growth_with_ai import demography, rerun, surprise as sp  # noqa: E402

WORK = Path(os.environ.get("WORK", Path.home() / "ugai-rerun-work"))
OUT = REPO / "analysis" / "surprise" / "cohorts"
OUTDIR = REPO / "analysis" / "surprise" / "output"
TPI_KEYS = ("c", "n", "b_s", "b_sp1", "bq", "tr")
PARAMS_SHA = "37bd0e282b92d07e16c66b9649872308961c6076"
K = sp.k_of()


def default_labels(c):
    done = sp.load(OUTDIR, c)
    ref = sp.reference_ext(OUTDIR, c)
    out = ["continuation"] if "continuation" in done else []
    for v in ("", "dn"):
        k = sp._keys(v, "uk_central")
        out += [x for x in (k["tfp"], k["zfixed"]) if x in done]
        r4 = sp.accepted_r4(done, ref, v, sp.SURPRISE_YEAR, "uk_central")
        if r4 is not None:
            out.append(r4["label"])
    full = sp._keys("dnfull", "uk_central")["tfp"]
    if full in done:
        out.append(full)
    return out


def params(c):
    raw = subprocess.run(["git", "-C", str(REPO), "show",
                          f"{PARAMS_SHA}:analysis/rerun/cohorts/{c}/params.npz"],
                         capture_output=True, check=True).stdout
    tmp = OUT / c / "params.npz"
    tmp.write_bytes(raw)
    z = np.load(tmp)
    got = {k: demography.h(z[k]) for k in ("omega", "omega_SS", "omega_S_preTP", "g_n",
                                           "rho", "imm_rates", "rho_preTP",
                                           "imm_rates_preTP")}
    want = rerun.accepted_baseline(rerun.load(REPO / "analysis/rerun/output", c)
                                   )["demographics"]["hash"]
    if got != want:
        tmp.unlink()
        raise RuntimeError(f"{c}: params.npz demographics differ from the baseline's")
    return {"source": f"analysis/rerun/cohorts/{c}/params.npz at {PARAMS_SHA}",
            "demographics_hash_matches_baseline": True}


def export(c, label):
    base = rerun.accepted_baseline(rerun.load(REPO / "analysis/rerun/output", c))
    bt = pickle.load(open(WORK / c / base["label"] / "TPI" / "TPI_vars.pkl", "rb"))
    d = WORK / f"surprise{sp.SURPRISE_YEAR}" / c / label
    rt = pickle.load(open(d / "TPI" / "TPI_vars.pkl", "rb"))
    ss = pickle.load(open(d / "SS" / "SS_vars.pkl", "rb"))
    # the handover: the run's start-of-2028 wealth is the baseline's end-of-2027
    gap = float(np.max(np.abs(np.asarray(rt["b_s"])[0, 1:] - np.asarray(bt["b_sp1"])[K - 1, :-1])))
    if gap > 1e-12:
        raise RuntimeError(f"{c} {label}: b_s(2028) differs from baseline b_sp1(2027) by {gap}")
    T = np.asarray(bt["c"]).shape[0]
    arrs = {k: np.concatenate([np.asarray(bt[k])[:K], np.asarray(rt[k])[:T - K]]
                              ).astype(np.float32) for k in TPI_KEYS}
    arrs.update({f"ss_{k}": np.asarray(ss[k], dtype=np.float32) for k in ("c", "n", "b_s")})
    np.savez_compressed(OUT / c / f"{label}.npz", **arrs)
    return {"label": label, "shape": list(arrs["c"].shape), "handover_max_abs": gap}


def main(labels=None):
    manifest = {"what": __doc__.split("\n\n")[0], "t0_year": 2026,
                "splice": f"2026-{sp.SURPRISE_YEAR - 1} baseline, {sp.SURPRISE_YEAR}+ run",
                "units": "detrended model units", "dims": "(T, S, J)", "closures": {}}
    for c in ("zk0.1", "zk0"):
        (OUT / c).mkdir(parents=True, exist_ok=True)
        rows = [export(c, lab) for lab in (labels or default_labels(c))]
        manifest["closures"][c] = {"params": params(c), "files": rows}
        for r in rows:
            print(c, r)
    (OUT / "README.json").write_text(json.dumps(manifest, indent=1) + "\n")


if __name__ == "__main__":
    main(sys.argv[1:] or None)
