"""Per-arm sanity gate for the R1-R4 reruns: identities, residuals, GNI <= GDP,
and the 2030 gap signs against #30's solve of the same arm and closure.

    python3 analysis/rerun/sanity.py zk0.1 share_shift_tfp_ramp
"""
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))
from uk_growth_with_ai import rerun  # noqa: E402

c, label = sys.argv[1], sys.argv[2]
done = rerun.load(REPO / "analysis/rerun/output", c)
base = rerun.accepted_baseline(done)
arm = label.split("_ramp")[0] + "_ramp"
prior = REPO / "analysis/closure/output" / f"{c}_{arm}.json"
pb = REPO / "analysis/closure/output" / f"{c}_baseline.json"
rep = rerun.arm_report(done[label], base,
                       json.loads(prior.read_text()) if prior.exists() else None,
                       json.loads(pb.read_text()) if pb.exists() else None)
f = lambda v: [round(x, 3) for x in v] if isinstance(v, list) else v
print(f"{c} {label}: Z {rep['Z']:.6f}, TPI converged {rep['tpi_converged']} "
      f"({rep['tpi_final_distance']:.1e})")
print("identities", rep["identities_maxabs"], "| GNI<=GDP", rep["gni_le_gdp"],
      "| K_f>0", rep["K_f_positive"])
print("RC/Y % 2026-30", f(rep["rc_rel_Y_pct"]), "interior max",
      f"{rep['rc_rel_Y_max_abs_interior_pct']:.5f}")
for v, g in rep["gap_pct"].items():
    old = rep.get("prior_30_gap_pct", {}).get(v)
    print(f"  {v:4s} new {f(g)}" + (f"   old {f(old)}" if old else ""))
print(f"  dr bp new {f(rep['dr_bp'])}   old {f(rep.get('prior_30_gap_pct', {}).get('r_bp'))}")
print("  debt/GDP pp", f(rep["debt_gdp_pp"]))
print("  2030 signs match #30:", rep.get("sign_matches_30_2030"))
