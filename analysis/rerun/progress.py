"""Markdown progress table for the R1-R4 rerun comment on #27 (driver.sh)."""
import json
import sys
from pathlib import Path

out = Path(sys.argv[1])
rows = []
for c in ("zk0.1", "zk0"):
    d = out / c
    for f in sorted(d.glob("*.json"), key=lambda f: f.stat().st_mtime) if d.exists() else []:
        if f.stem.startswith("GATE"):
            continue
        r = json.loads(f.read_text())
        dg = r["diagnostics"]
        Y, D = r["Y"], r["D"]
        extra = (f"alpha_G shift {r['alpha_G_shift']:+.4f}, 2030 D/Y {D[4] / Y[4] * 100:.2f}%"
                 if r["spec"]["arm"] == "baseline"
                 else f"Z {r['Z_terminal']:.6f}")
        rows.append(f"| `{c}` | `{r['label']}` | done ({r['elapsed_min']:.1f} min) | "
                    f"{'yes' if dg.get('tpi_converged') else 'NO'} "
                    f"(dist {dg.get('tpi_final_distance', float('nan')):.1e}) | "
                    f"{dg['rc_rel_Y_signed'][0] * 100:+.4f}% / {dg['rc_rel_Y_signed'][2] * 100:+.4f}% | {extra} |")
    g = d / "GATE_baseline.json"
    if g.exists():
        rows.append(f"| `{c}` | baseline gate | approved | | | {json.loads(g.read_text())['baseline']} |")
body = ["**R1–R4 rerun progress** (branch `rerun/r1-r4`; auto-updated after each solve; "
        "one OG solve at a time; restart with `analysis/rerun/driver.sh`, which skips finished solves).",
        "", "| closure | solve | status | TPI converged | RC/GDP 2026 / 2028 | note |",
        "|---|---|---|---|---|---|", *rows, "",
        "Pending: baseline passes until 2030 debt/GDP is within 0.1pp of the OBR's 95.05%, "
        "the sanity gate, then per closure `share_shift_tfp_ramp`, `share_shift_ramp_zfixed` "
        "and the R4 secant on `share_shift`. Closures: `zeta_K` = 0.1 then 0."]
print("\n".join(body))
