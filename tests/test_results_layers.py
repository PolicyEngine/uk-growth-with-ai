"""The committed results files rebuild exactly from the committed solve records.

Three layers are committed: each solve's record (analysis/surprise*/output), the
assembled results files (uk_growth_with_ai/data/scenarios_surprise*.json) and the
dashboard data (dashboard/src/data/surprise*.json).  These tests tie the first two
together and the second two together, so a hand edit to either later layer fails.
No solve is run: assembly reads JSON only (about 1.5 s for all 40 files).
"""
import json
import re
from pathlib import Path

import pytest

from uk_growth_with_ai import surprise as sp

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "uk_growth_with_ai" / "data"
NAME = re.compile(r"scenarios_surprise(?P<year>\d{4})_(?P<scenario>korinek|uk_low|uk_central|uk_high)"
                  r"(?P<variant>_fixed_spending|_debt_neutral)?(?:_(?P<closure>zk0\.5|zk0))?\.json$")
FILES = sorted(DATA.glob("scenarios_surprise*.json"))


def _outdir(year: int) -> Path:
    return ROOT / ("analysis/surprise/output" if year == 2028 else f"analysis/surprise{year}/output")


def _strip(res: dict) -> dict:
    res = json.loads(json.dumps(res))
    res["provenance"].pop("assembled_utc", None)
    return res


def test_every_results_file_is_named_as_expected():
    assert len(FILES) == 40
    for f in FILES:
        assert NAME.match(f.name), f.name


@pytest.mark.parametrize("path", FILES, ids=lambda p: p.stem)
def test_results_file_equals_assembled_records(path):
    m = NAME.match(path.name)
    year = int(m["year"])
    closure = m["closure"] or "zk0.1"
    variant = {None: "", "_fixed_spending": "fs", "_debt_neutral": "dn"}[m["variant"]]
    rebuilt = sp.assemble(str(_outdir(year)), closure, fs=variant,
                          rerun_dir=str(ROOT / "analysis/rerun/output"),
                          year=year, scenario=m["scenario"])
    committed = json.loads(path.read_text())
    rebuilt, committed = _strip(rebuilt), _strip(committed)
    # The provenance note names the output folder as passed; compare it by its tail.
    for r in (rebuilt, committed):
        r["provenance"]["note"] = r["provenance"].get("note", "").split(" every solve's record")[0]
    assert rebuilt == committed


# --- dashboard data against the results files --------------------------------

DASH = ROOT / "dashboard" / "src" / "data"
ARM = {"tfp": "share_shift_tfp_ramp", "ss": "share_shift_ramp"}  # "tz" is not in results files
PCT = ["Y", "GNI", "NNI", "w", "C", "I", "K", "L"]


def _cells(year):
    """(scenario, closure, variant suffix, arm, dashboard cell) for every shown result."""
    d = json.loads((DASH / f"surprise{year}.json").read_text())
    blocks = [("", None, d["results"])]
    # sensitivity cells are keyed by arm only; the closure is the block's key
    blocks += [("", c, d["sensitivity"][c]["results"]) for c in d["sensitivity"]]
    blocks += [({"debt_neutral": "_debt_neutral", "fixed_spending": "_fixed_spending"}[k],
                None, d["rules"][k]["results"]) for k in d["rules"]]
    for suffix, closure, res in blocks:
        for sid, arms in res.items():
            for arm, by_cl in arms.items():
                pairs = [(closure, by_cl)] if closure else by_cl.items()
                for cl, cell in pairs:
                    if arm in ARM and cell.get("status") == "done":
                        yield sid, cl, suffix, arm, cell


@pytest.mark.parametrize("year", [2027, 2028])
def test_dashboard_gaps_equal_results_files(year):
    n = 0
    for sid, cl, suffix, arm, cell in _cells(year):
        f = DATA / (f"scenarios_surprise{year}_{sid}{suffix}"
                    f"{'' if cl == 'zk0.1' else '_' + cl}.json")
        r = json.loads(f.read_text())
        s, b = r[ARM[arm]]["series"], r["baseline"]["series"]
        for v in PCT:
            want = [(s[v][i] / b[v][i] - 1) * 100 for i in range(len(cell["gaps"][v]))]
            assert cell["gaps"][v] == pytest.approx(want, abs=1e-9), (f.name, arm, v)
        n += 1
    assert n >= 40, n
