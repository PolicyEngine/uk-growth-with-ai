"""Sanity for the fixed-spending arms: identities, residuals, G held at baseline
levels, GNI <= GDP, and the 2026-30 gaps beside (a) the new common-G/Y arm at the
same closure and (b) the legacy fixed-spending run (zeta_K = 0.1 only).

    python3 analysis/rerun/sanity_fs.py zk0.1 share_shift_tfp_ramp_fs
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
rec = done[label]
rep = rerun.arm_report(rec, base)
s, b = rec["series"], base["series"]
f = lambda v: [round(x, 3) for x in v]
print(f"{c} {label}: Z {rec['Z_terminal']:.6f}, baseline_spending {rec['baseline_spending']}, "
      f"TPI converged {rep['tpi_converged']} ({rep['tpi_final_distance']:.1e})")
print("identities", rep["identities_maxabs"], "| GNI<=GDP", rep["gni_le_gdp"])
print("RC/Y % 2026-30", f(rep["rc_rel_Y_pct"]),
      f"interior max {rep['rc_rel_Y_max_abs_interior_pct']:.5f}")
print("max |G/G_base - 1| 2026-35:", max(abs(s["G"][i] / b["G"][i] - 1) for i in range(10)),
      " max |TR/TR_base - 1|:", max(abs(s["TR"][i] / b["TR"][i] - 1) for i in range(10)))
arm = "share_shift_tfp_ramp" if "tfp" in label else (
    "share_shift_ramp_zfixed" if "zfixed" in label else None)
main = done.get(arm) if arm else rerun.accepted_r4(done, base)
legacy = None
if c == "zk0.1":
    L = json.loads((REPO / "uk_growth_with_ai/data/legacy/scenarios_fixed_spending_2026-11-11.json").read_text())
    la = "share_shift_tfp_ramp" if "tfp" in label else "share_shift_ramp"
    legacy = (L[la], L["baseline"])
for v in ("Y", "GNI", "K", "L", "w", "C", "I", "G", "D"):
    row = f"  {v:4s} fs {f(rep['gap_pct'][v]) if v in rep['gap_pct'] else f([(s[v][i]/b[v][i]-1)*100 for i in range(5)])}"
    if main:
        row += f"   main {f([(main['series'][v][i] / b[v][i] - 1) * 100 for i in range(5)])}"
    if legacy and v in legacy[0]:
        row += f"   legacy-fs {f([(legacy[0][v][i] / legacy[1][v][i] - 1) * 100 for i in range(5)])}"
    print(row)
print("  dr bp fs", f(rep["dr_bp"]))
print("  debt/GDP pp fs", f(rep["debt_gdp_pp"]),
      "  main", f([rerun._dy(main, i) - rerun._dy(base, i) for i in range(5)]) if main else "")
if legacy:
    print("  debt/GDP pp legacy-fs", f([(legacy[0]["D"][i] / legacy[0]["Y"][i] - legacy[1]["D"][i] / legacy[1]["Y"][i]) * 100 for i in range(5)]))
