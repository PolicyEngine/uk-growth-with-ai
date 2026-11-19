"""The dashboard exports follow the shock year (2027 set, Vahid 18 Nov 2026).

Module constants are checked for both years; the written 2027 files are
checked once they exist (they need the 2027 solves)."""
import json
import re
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "dashboard" / "src" / "data"


def _consts(script, year, names):
    code = (f"import sys, runpy; sys.argv = ['x', '--year', '{year}'];"
            f"import os; os.environ['UGAI_SURPRISE_YEAR'] = '{year}';"
            f"g = runpy.run_path('{script}', run_name='not_main');"
            f"import json; print(json.dumps({{k: (str(g[k]) if hasattr(g[k], 'parts') else g[k]) "
            f"for k in {names!r}}}))")
    out = subprocess.run([sys.executable, "-c", code], cwd=ROOT, capture_output=True,
                         text=True, check=True).stdout
    return json.loads(out.strip().splitlines()[-1])


@pytest.mark.parametrize("year,window,headline,k", [(2028, [2027, 2031], 2031, 2),
                                                     (2027, [2026, 2030], 2030, 1)])
def test_dashboard_builder_dates_follow_the_year(year, window, headline, k):
    c = _consts("analysis/surprise/build_dashboard_data.py", year,
                ["SURPRISE", "WINDOW", "HEADLINE", "LATE", "K_HIST", "OUT_DIR", "DEST"])
    assert c["SURPRISE"] == year and c["WINDOW"] == window and c["HEADLINE"] == headline
    assert c["K_HIST"] == k and c["LATE"] == 2036
    assert c["DEST"].endswith(f"surprise{year}.json")
    assert c["OUT_DIR"].endswith("analysis/surprise/output" if year == 2028
                                 else f"analysis/surprise{year}/output")


@pytest.mark.parametrize("year,t0", [(2028, 2), (2027, 1)])
def test_cohort_welfare_dates_follow_the_year(year, t0):
    c = _consts("paper/cohort_welfare.py", year, ["SHOCK_YEAR", "T0", "DEBT_RULE", "COHORTS"])
    assert c["SHOCK_YEAR"] == year and c["T0"] == t0 and c["DEBT_RULE"] == 2036
    assert c["COHORTS"].endswith("analysis/surprise/cohorts" if year == 2028
                                 else f"analysis/surprise{year}/cohorts")


def _keys(x, out=None):
    out = set() if out is None else out
    if isinstance(x, dict):
        for k, v in x.items():
            out.add(k)
            _keys(v, out)
    elif isinstance(x, list):
        for v in x:
            _keys(v, out)
    return out


S27 = DATA / "surprise2027.json"
C27 = DATA / "cohorts2027.json"


@pytest.mark.skipif(not S27.exists(), reason="surprise2027.json not built yet")
def test_surprise2027_carries_2027_dates_and_no_2028_headline():
    d = json.loads(S27.read_text())
    assert d["surprise_year"] == 2027 and d["headline_year"] == 2030
    assert d["window"] == [2026, 2030] and d["late_year"] == 2036
    assert d["output_split"]["year"] == 2030
    keys = _keys(d)
    assert not [k for k in keys if re.search(r"20(28|31)", k)], "2028/2031 in a key name"
    assert "foreign_share_dK_2030" in keys
    for sid, arms in d["results"].items():
        for a, cls in arms.items():
            for cl, r in cls.items():
                if r["status"] == "done":
                    assert r["gaps"]["Y"][0] == 0.0 and r["gaps"]["Y"][1] != 0.0, (sid, a, cl)


@pytest.mark.skipif(not C27.exists(), reason="cohorts2027.json not built yet")
def test_cohorts2027_carries_2027_dates():
    d = json.loads(C27.read_text())
    assert d["shock_year"] == 2027 and "2027 surprise" in d["what"]
    keys = _keys(d)
    # bare year keys (c_gap's 2027..2035) are data; year-NAMED keys must not say 2028
    assert not [k for k in keys if re.search(r"2028", k) and not re.fullmatch(r"\d{4}", k)], \
        "2028 in a key name"
    assert "profile_2027" in keys and "income_2027_35_age45" in keys and "wealth_by_age_2027" in keys
    for cl in d["closures"].values():
        for rule in cl["rules"].values():
            for arm in rule.values():
                assert min(int(y) for y in arm["c_gap"]) == 2027
