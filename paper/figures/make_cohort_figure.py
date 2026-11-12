"""Figure: consumption-equivalent welfare change by birth cohort and lifetime-earnings
group, both scenarios, both closures.  Run from the repo root:

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

LAST = 2046
GROUPS = ((0, "Bottom 25%", "#2a78d6"), (2, "50th–70th percentile", "#1baf7a"),
          (6, "Top 1%", "#eb6834"))
ARMS = (("share_shift_tfp_ramp", "share_shift_tfp (automation + productivity)"),
        ("share_shift_ramp", "share_shift (automation only)"))
CLOS = (("zk0.1", r"Central closure, $\zeta_K = 0.1$"), ("zk0", r"Closed-capital bound, $\zeta_K = 0$"))


def main():
    plt.rcParams.update({"font.size": 9, "axes.spines.top": False, "axes.spines.right": False,
                         "axes.edgecolor": "#52514e", "xtick.color": "#52514e",
                         "ytick.color": "#52514e", "font.family": "serif"})
    fig, axes = plt.subplots(2, 2, figsize=(7.2, 5.6), sharex=True)
    res = {cl: cw.cev(cl, "hold") for cl, _ in CLOS}
    lims = {}
    for r, (arm, _) in enumerate(ARMS):
        vals = np.concatenate([res[cl][arm][res[cl]["birth_year"] <= LAST] for cl, _ in CLOS])
        lims[arm] = (min(vals.min(), 0) - 0.5, vals.max() + 0.5)
    for r, (arm, atitle) in enumerate(ARMS):
        for c, (cl, ctitle) in enumerate(CLOS):
            ax = axes[r, c]
            R = res[cl]
            b = R["birth_year"]
            m = (b <= LAST) & (b >= 1936)
            lam = cw.type_weights(R["par"])
            ax.axhline(0, color="#52514e", lw=0.8)
            ax.axvspan(2006.5, LAST + 1, color="#f0efec", lw=0)
            for j, lab, col in GROUPS:
                ax.plot(b[m], R[arm][m, j], color=col, lw=1.6, label=lab)
            ax.plot(b[m], (R[arm] @ lam)[m], color="#0b0b0b", lw=1.4, ls="--",
                    label="All groups (weighted)")
            ax.set_ylim(*lims[arm])
            ax.grid(axis="y", color="#e4e3df", lw=0.6)
            ax.set_title(f"{atitle}\n{ctitle}", fontsize=8.5, loc="left")
            if c == 0:
                ax.set_ylabel("Welfare change, % of consumption")
            if r == 1:
                ax.set_xlabel("Birth year")
    axes[0, 0].text(2008, 0.4, "born after 2006:\nenter after 2026",
                    fontsize=7, color="#52514e", va="bottom")
    h, l = axes[0, 0].get_legend_handles_labels()
    fig.legend(h, l, loc="lower center", ncol=4, frameon=False, fontsize=8)
    fig.tight_layout(rect=(0, 0.05, 1, 1))
    for ext in ("pdf", "png"):
        fig.savefig(HERE / f"cohort_cev.{ext}", dpi=200)
    print("wrote", HERE / "cohort_cev.pdf")


if __name__ == "__main__":
    main()
