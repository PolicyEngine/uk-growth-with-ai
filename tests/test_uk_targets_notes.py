"""uk_targets.json took the OBR-overlap note changes (perf/c-m1 86095a3 plus the
Chart B.4 notes[1], 19 Nov 2026): strings only.  Every number is unchanged from
the version the 2028 and 2027 solves read, and the dashboard exports carry the
current source strings."""
import json
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
TARGETS = ROOT / "analysis" / "surprise" / "uk_targets.json"
BEFORE = "7930862"          # the version every 2028 and 2027 solve read


def _strip_strings(x):
    if isinstance(x, dict):
        return {k: _strip_strings(v) for k, v in x.items() if not isinstance(v, str)}
    if isinstance(x, list):
        return [_strip_strings(v) for v in x if not isinstance(v, str)]
    return x


def test_only_note_strings_changed():
    try:
        old = json.loads(subprocess.check_output(
            ["git", "-C", str(ROOT), "show", f"{BEFORE}:analysis/surprise/uk_targets.json"],
            stderr=subprocess.DEVNULL))
    except subprocess.CalledProcessError:
        pytest.skip(f"{BEFORE} not in this clone")
    new = json.loads(TARGETS.read_text())
    assert _strip_strings(new) == _strip_strings(old)
    assert set(new["scenarios"]) == set(old["scenarios"])


def test_withdrawn_cross_check_is_gone():
    t = TARGETS.read_text()
    assert "2 x 0.2 = 0.4%" not in t and "could not be re-read" not in t
    assert "0.19%" in t and "0.33%" in t


@pytest.mark.parametrize("year", [2027, 2028])
def test_exports_carry_the_current_sources(year):
    f = ROOT / "dashboard" / "src" / "data" / f"surprise{year}.json"
    if not f.exists():
        pytest.skip(f"{f.name} not built")
    d = json.loads(f.read_text())
    tg = json.loads(TARGETS.read_text())["scenarios"]
    key = {"uk_low": "uk_low", "uk_central": "uk_central", "uk_high": "uk_high",
           "korinek": "korinek_us_substantial_upper"}
    for s in d["scenarios"]:
        t = tg[key[s["id"]]]
        assert s["sources"] == t["sources"], s["id"]
        assert (s["tfp_gain_pct"], s["gamma_terminal"], s["labour_share_fall_pp"]) == \
            (t["tfp_gain_pct"], t["gamma_terminal"], t["labour_share_fall_pp"])
