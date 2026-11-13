"""Figure: consumption-equivalent welfare change by birth year and lifetime-earnings
group, UK central, 2028 surprise.  Rows: the three arms; columns: the two closures.
Solid lines: debt-neutral transfers (headline); grey dotted: all groups under the
common fiscal rule (comparison).  Run from the repo root:

    python paper/figures/make_cohort_figure.py      # writes cohort_cev.pdf and .png here
"""
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import cohort_welfare as cw  # noqa: E402

GROUPS = ((0, "Bottom 25% (lifetime earnings)", "#2a78d6"), (2, "50th–70th percentile", "#1baf7a"),
          (6, "Top 1%", "#eb6834"))
ARMS = (("tfp", "Automation + productivity"),
        ("zfixed", "Automation, technology unchanged"),
        ("stress", "OBR-style stress test: no output gain"))
CLOS = (("zk0.1", r"$\zeta_K = 0.1$ (central)"), ("zk0", r"$\zeta_K = 0$ (closed-capital bound)"))
LAST_ALIVE = cw.SHOCK_YEAR - cw.FIRST_AGE      # born 2008: aged 20 in 2028


def main(out=HERE):
    plt.rcParams.update({"font.size": 8.5, "axes.spines.top": False, "axes.spines.right": False,
                         "axes.edgecolor": "#52514e", "xtick.color": "#52514e",
                         "ytick.color": "#52514e", "font.family": "serif"})
    fig, axes = plt.subplots(3, 2, figsize=(7.2, 8.2), sharex=True, sharey=True)
    res = {cl: cw.cev(cl, "hold") for cl, _ in CLOS}
    for r, (arm, atitle) in enumerate(ARMS):
        for c, (cl, ctitle) in enumerate(CLOS):
            ax = axes[r, c]
            R = res[cl]
            b = R["birth_year"]
            m = b <= cw.FIG_LAST_BIRTH
            par, _ = cw.load(cl)
            gw = cw.group_weights(par)
            ax.axhline(0, color="#52514e", lw=0.8)
            ax.axvspan(LAST_ALIVE + 0.5, cw.FIG_LAST_BIRTH + 1, color="#f0efec", lw=0)
            for j, lab, col in GROUPS:
                ax.plot(b[m], R[("dn", arm)][m, j], color=col, lw=1.5, label=lab)
            ax.plot(b[m], (R[("dn", arm)] @ gw)[m], color="#0b0b0b", lw=1.3, ls="--",
                    label="All groups, debt-neutral")
            ax.plot(b[m], (R[("", arm)] @ gw)[m], color="#8a8986", lw=1.3, ls=":",
                    label="All groups, common fiscal rule")
            ax.grid(axis="y", color="#e4e3df", lw=0.6)
            ax.set_title(f"{atitle}\n{ctitle}", fontsize=8, loc="left")
            if c == 0:
                ax.set_ylabel("Welfare change, %")
            if r == 2:
                ax.set_xlabel("Birth year")
    axes[0, 0].text(LAST_ALIVE + 2, axes[0, 0].get_ylim()[1] * 0.92, "enter after 2028",
                    fontsize=7, color="#52514e", va="top")
    h, l = axes[0, 0].get_legend_handles_labels()
    fig.legend(h, l, loc="lower center", ncol=3, frameon=False, fontsize=7.5)
    fig.tight_layout(rect=(0, 0.06, 1, 1))
    for ext in ("pdf", "png"):
        fig.savefig(Path(out) / f"cohort_cev.{ext}", dpi=200)
    print("wrote", Path(out) / "cohort_cev.pdf")


if __name__ == "__main__":
    main(*sys.argv[1:])
