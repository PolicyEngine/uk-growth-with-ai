"""The post-solve sanity gate (analysis/surprise/sanity.py) on synthetic solves
built from the committed zk0.1 baseline, with OG-Core absent."""

import copy
import importlib.util
import json
from pathlib import Path

import pytest

from uk_growth_with_ai import surprise as sp

REPO = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("sanity", REPO / "analysis/surprise/sanity.py")
sanity = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sanity)

BASE_EXT = json.loads((REPO / "analysis/surprise/output/zk0.1/baseline_ext.json").read_text())


def _rec(scale=None):
    """A record equal to the baseline, then scaled from 2028 on by ``scale(y)``."""
    s = copy.deepcopy(BASE_EXT["series"])
    if scale:
        for y in range(2028, 2037):
            i = y - 2026
            f = scale(y)
            for v in ("K", "K_d", "K_f", "B"):
                s[v][i] *= f.get("K", 1.0)
            s["D_d"][i] *= f.get("D", 1.0)
            s["D_f"][i] *= f.get("D", 1.0)
            s["D"][i] *= f.get("D", 1.0)
            s["B"][i] = s["K_d"][i] + s["D_d"][i]          # keep K_d = B - D_d
            for v in ("Y", "L", "C", "I"):
                s[v][i] *= f.get(v, 1.0)
            ls0 = BASE_EXT["series"]["w"][i] * BASE_EXT["series"]["L"][i] / BASE_EXT["series"]["Y"][i]
            ls1 = ls0 - 0.039 * f.get("weight", 0.0)
            s["w"][i] = ls1 * s["Y"][i] / s["L"][i]
            s["r"][i] += f.get("r", 0.0)
            gni = s["Y"][i] - s["r_p"][i] * (s["K_f"][i] + s["D_f"][i])
            s["GNI"][i] = gni
            s["NNI"][i] = gni - sp.DELTA_ANNUAL * s["K"][i]
    return {"series": s, "diagnostics": {"rc_rel_Y_signed": [1e-7] * 11},
            "elapsed_min": 7.0, "Z_terminal": 0.97}


def _out(tmp_path, arms):
    d = tmp_path / "zk0.1"
    d.mkdir(parents=True)
    (d / "baseline_ext.json").write_text(json.dumps(BASE_EXT))
    (d / "continuation.json").write_text(json.dumps(_rec()))
    sp.write_gate(tmp_path, "zk0.1", "continuation", "test")
    for label, rec in arms.items():
        (d / f"{label}.json").write_text(json.dumps(rec))
    return tmp_path


def _tfp(sign=1.0):
    def scale(y):
        w = sp.calendar_weights()[y]
        Y = 1 + sign * 0.049 * w
        return {"Y": Y, "K": 1 + sign * 0.055 * w, "L": 1 - 0.008 * w,
                "C": 1.003, "I": 1 + 0.13 * w, "r": sign * 0.010 * w, "weight": w,
                "D": Y * (1 - 0.032 * w)}
    return _rec(scale)


def test_continuation_equal_to_the_baseline_passes(tmp_path):
    out = _out(tmp_path, {})
    res = sanity.check("zk0.1", "continuation", out)
    assert res["ok"], res["fails"]


def test_a_sensible_tfp_arm_passes_and_a_flipped_one_fails(tmp_path):
    out = _out(tmp_path, {"share_shift_tfp_ramp": _tfp(1.0)})
    res = sanity.check("zk0.1", "share_shift_tfp_ramp", out)
    assert res["ok"], res["fails"]
    assert res["gaps_2031"]["Y"] == pytest.approx(4.9, abs=1e-6)
    out2 = _out(tmp_path / "b", {"share_shift_tfp_ramp": _tfp(-1.0)})
    bad = sanity.check("zk0.1", "share_shift_tfp_ramp", out2)
    assert not bad["ok"]
    assert "sign 2031 Y >0" in bad["fails"] and "band 2031 Y vs old 2030" in bad["fails"]


def test_a_2027_difference_breaks_the_single_point(tmp_path):
    r = _tfp(1.0)
    r["series"]["C"][1] *= 1 + 1e-12
    out = _out(tmp_path, {"share_shift_tfp_ramp": r})
    assert "every gap exactly 0 in 2026 and 2027" in sanity.check(
        "zk0.1", "share_shift_tfp_ramp", out)["fails"]


def test_labour_share_must_follow_the_ramp(tmp_path):
    def scale(y):            # labour share on the OLD calendar: one year early
        w = min((y - 2026) / 4, 1)
        return {"Y": 1 + 0.045 * w, "K": 1 + 0.055 * w, "I": 1.13, "r": 0.01 * w, "weight": w}
    out = _out(tmp_path, {"share_shift_tfp_ramp": _rec(scale)})
    assert "labour share = -3.9pp x ramp weight" in sanity.check(
        "zk0.1", "share_shift_tfp_ramp", out)["fails"]


def test_kinds_and_expectations_are_committed():
    assert sanity.kind("share_shift_ramp_dn_r4_2") == ("r4_iter", "dn")
    assert sanity.kind("share_shift_tfp_ramp_fs") == ("tfp", "fs")
    exp = json.loads(sanity.EXPECT.read_text())
    assert exp["old_2030_gaps"]["zk0.1|common|tfp"]["Y"] == pytest.approx(4.90, abs=0.01)
    assert set(exp["signs_2031"]) == {"tfp", "r4", "zfixed", "r4_iter"}
