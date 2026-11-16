"""continuation_dnfull label and the opt-in SS initial guess (15 Nov 2026)."""
import hashlib
import importlib.util
import json
import os
import pickle
import types
from pathlib import Path

import numpy as np
import pytest

from uk_growth_with_ai import solve
from uk_growth_with_ai import surprise as sp


def test_parse_continuation_dnfull():
    assert sp.parse_label(sp.CONT_DNFULL) == {"scenario": None, "kind": "continuation",
                                              "variant": "dnfull"}
    assert sp.parse_label("continuation")["variant"] == ""


def _fake_ss(tmp_path):
    base = tmp_path / "base" / "SS"
    base.mkdir(parents=True)
    bdict = {k: 1.0 for k in solve.SS_GUESS_KEYS} | {"factor": 7.0, "theta": 3.0}
    pickle.dump(bdict, open(base / "SS_vars.pkl", "wb"))
    donor = tmp_path / "donor.pkl"
    pickle.dump({k: 2.0 for k in solve.SS_GUESS_KEYS} | {"factor": 99.0, "theta": 99.0},
                open(donor, "wb"))
    utils = types.SimpleNamespace(safe_read_pickle=lambda f: pickle.load(open(f, "rb")))
    seen = {}

    def run_SS(p, client=None):
        seen["d"] = utils.safe_read_pickle(os.path.join(p.baseline_dir, "SS", "SS_vars.pkl"))
        return {"ok": True}
    SS = types.SimpleNamespace(__name__="ogcore.SS", utils=utils, run_SS=run_SS)
    p = types.SimpleNamespace(baseline_dir=str(tmp_path / "base"), baseline_spending=False,
                              reform_use_baseline_solution=True)
    return SS, p, donor, utils, seen


def test_ss_guess_takes_only_guess_fields(tmp_path):
    SS, p, donor, utils, seen = _fake_ss(tmp_path)
    orig = utils.safe_read_pickle
    assert solve.run_SS_with_guess(SS, p, None, str(donor)) == {"ok": True}
    d = seen["d"]
    assert all(d[k] == 2.0 for k in solve.SS_GUESS_KEYS)
    assert d["factor"] == 7.0 and d["theta"] == 3.0      # the baseline's, not the donor's
    assert utils.safe_read_pickle is orig                 # restored


def test_ss_guess_restored_on_error(tmp_path):
    SS, p, donor, utils, _ = _fake_ss(tmp_path)
    orig = utils.safe_read_pickle

    def boom(p, client=None):
        raise RuntimeError("x")
    SS.run_SS = boom
    with pytest.raises(RuntimeError):
        solve.run_SS_with_guess(SS, p, None, str(donor))
    assert utils.safe_read_pickle is orig


def test_ss_guess_refused_without_reform_use_baseline_solution(tmp_path):
    SS, p, donor, utils, _ = _fake_ss(tmp_path)
    p.reform_use_baseline_solution = False
    with pytest.raises(ValueError, match="reform_use_baseline_solution"):
        solve.run_SS_with_guess(SS, p, None, str(donor))


def test_ss_guess_fails_loudly_when_it_does_not_apply(tmp_path):
    SS, p, donor, utils, _ = _fake_ss(tmp_path)
    orig = utils.safe_read_pickle
    SS.run_SS = lambda p, client=None: {"ok": True}     # never reads the baseline SS
    with pytest.raises(RuntimeError, match="was not used"):
        solve.run_SS_with_guess(SS, p, None, str(donor))
    assert utils.safe_read_pickle is orig


@pytest.mark.parametrize("kw", [{"baseline": True}, {"baseline_spending": True}])
def test_run_arm_refuses_a_guess_for_baselines_and_fixed_spending(kw):
    with pytest.raises(ValueError, match="ss_guess"):
        solve.run_arm("x", 1.0, False, None, "/nonexistent", None, None,
                      ss_guess="/nonexistent/donor.pkl", **kw)


# --- UGAI_SS_GUESS resolution ---------------------------------------------------

def _work(tmp_path, label="uk_high_share_shift_tfp_ramp", closure="zk0.5"):
    d = tmp_path / "work" / "surprise2028" / closure / label / "SS"
    d.mkdir(parents=True)
    (d / "SS_vars.pkl").write_bytes(b"donor-bytes")
    return tmp_path / "work"


def test_ss_guess_applies_only_to_its_target(tmp_path):
    work = _work(tmp_path)
    env = "uk_high_share_shift_ramp_zfixed=uk_high_share_shift_tfp_ramp"
    assert sp.resolve_ss_guess(None, "x", work, "zk0.5") is None
    assert sp.resolve_ss_guess(env, "uk_high_share_shift_ramp_r4_1", work, "zk0.5") is None
    g = sp.resolve_ss_guess(env, "uk_high_share_shift_ramp_zfixed", work, "zk0.5")
    assert g["donor"] == "surprise2028/zk0.5/uk_high_share_shift_tfp_ramp/SS/SS_vars.pkl"
    assert g["sha256"] == hashlib.sha256(b"donor-bytes").hexdigest()
    assert Path(g["path"]).exists() and g["target"] == "uk_high_share_shift_ramp_zfixed"
    two = env + ",uk_high_share_shift_ramp_r4_1=uk_high_share_shift_tfp_ramp"
    assert sp.resolve_ss_guess(two, "uk_high_share_shift_ramp_r4_1", work, "zk0.5")


def test_ss_guess_pkl_path_missing_file_and_old_form(tmp_path):
    work = _work(tmp_path)
    pkl = tmp_path / "elsewhere.pkl"
    pkl.write_bytes(b"z")
    g = sp.resolve_ss_guess(f"a={pkl}", "a", work, "zk0.5")
    assert g["donor"] == str(pkl)                    # outside the work dir: as given
    with pytest.raises(RuntimeError, match="missing"):
        sp.resolve_ss_guess("a=no_such_label", "a", work, "zk0.5")
    with pytest.raises(ValueError, match="<target label>=<donor>"):
        sp.resolve_ss_guess("uk_high_share_shift_tfp_ramp", "a", work, "zk0.5")


# --- the dnfull target and full-horizon check -----------------------------------

def test_dnfull_target_must_match_the_committed_continuation():
    D, Y = np.linspace(1, 2, 60), np.linspace(2, 3, 60)
    cont = {"series": {"D": [0.5, 0.5] + D[:9].tolist(), "Y": [1, 1] + Y[:9].tolist()}}
    assert sp.dnfull_target({"D": D, "Y": Y}, cont, 2) == pytest.approx((D / Y).tolist())
    D2 = D.copy()
    D2[3] *= 1.001
    with pytest.raises(RuntimeError, match="stale pickle"):
        sp.dnfull_target({"D": D2, "Y": Y}, cont, 2)


def test_dnfull_check_runs_to_t_minus_1():
    n = 60
    tgt = np.full(n, 0.9)
    Y, G = np.ones(n), np.full(n, 0.2)
    D = tgt * Y
    c = sp.dnfull_check(D, Y, G, tgt.tolist(), 0.2)
    assert c["ok"] and c["periods"] == [2029, 2028 + n - 1]
    D[n - 1] *= 1.01                                  # only the last period (T-1) off
    assert not sp.dnfull_check(D, Y, G, tgt.tolist(), 0.2)["ok"]


# --- the plan for continuation_dnfull, and its reference ------------------------

from test_surprise import _arm, _dirs, _write  # noqa: E402  (shared fixtures)


def test_continuation_dnfull_plan_needs_the_gate_before_solving(tmp_path):
    rd, out, be = _dirs(tmp_path)
    _write(out / "zk0.1", "continuation", _arm(be, 0.0, None))
    with pytest.raises(RuntimeError, match="gate is not approved"):
        sp.next_step(out, "zk0.1", "continuation_dnfull", rd)
    sp.write_gate(out, "zk0.1", "continuation", "test")
    s = sp.next_step(out, "zk0.1", "continuation_dnfull", rd)
    assert s["label"] == sp.CONT_DNFULL and s["variant"] == "dnfull" and s["Z"] is None
    assert s["baseline_spending"] is False and s["alpha_G"] == 0.3


def test_reference_for_pairs_dnfull_with_continuation_dnfull(tmp_path):
    assert sp.reference_for("uk_central_share_shift_tfp_ramp_dnfull") == sp.CONT_DNFULL
    assert sp.reference_for("uk_central_share_shift_tfp_ramp_dn") == "continuation"
    assert sp.reference_for("korinek_share_shift_ramp_r4_1_fs") == "continuation"
    assert sp.reference_for(None) == "continuation"
    rd, out, be = _dirs(tmp_path)
    d = out / "zk0.1"
    _write(d, "continuation", _arm(be, 0.0, None))
    sp.write_gate(out, "zk0.1", "continuation", "test")
    lab = "uk_central_share_shift_tfp_ramp_dnfull"
    with pytest.raises(RuntimeError, match="not solved"):
        sp.reference_ext(out, "zk0.1", label=lab)
    cd = _arm(be, 0.3, None)
    _write(d, sp.CONT_DNFULL, cd)
    r = sp.reference_ext(out, "zk0.1", label=lab)
    assert r["reference"] == sp.CONT_DNFULL and r["series"] == cd["series"]
    assert sp.reference_ext(out, "zk0.1")["reference"] == "continuation"


def test_export_default_labels_add_continuation_dnfull(tmp_path, monkeypatch):
    repo = Path(__file__).resolve().parents[1]
    spec = importlib.util.spec_from_file_location(
        "export_cohorts", repo / "analysis/surprise/export_cohorts.py")
    ec = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(ec)
    rd, out, be = _dirs(tmp_path)
    d = out / "zk0.1"
    _write(d, "continuation", _arm(be, 0.0, None))
    sp.write_gate(out, "zk0.1", "continuation", "test")
    monkeypatch.setattr(ec, "OUTDIR", out)
    assert ec.default_labels("zk0.1") == ["continuation"]
    _write(d, sp.CONT_DNFULL, _arm(be, 0.0, None))
    assert ec.default_labels("zk0.1") == ["continuation", sp.CONT_DNFULL]


def test_export_refuses_a_dn_arm_off_its_debt_path(tmp_path, monkeypatch):
    repo = Path(__file__).resolve().parents[1]
    spec = importlib.util.spec_from_file_location(
        "export_cohorts", repo / "analysis/surprise/export_cohorts.py")
    ec = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(ec)
    rd, out, be = _dirs(tmp_path)
    d = out / "zk0.1"
    _write(d, "continuation", _arm(be, 0.0, None))
    sp.write_gate(out, "zk0.1", "continuation", "test")
    monkeypatch.setattr(ec, "OUTDIR", out)
    arm = _arm(be, 1.0, 0.97)
    _write(d, "korinek_share_shift_tfp_ramp_dn", {**arm, "dn_check": {"ok": True}})
    assert "korinek_share_shift_tfp_ramp_dn" in ec.default_labels("zk0.1")
    _write(d, "korinek_share_shift_tfp_ramp_dn", {**arm, "dn_check": {"ok": False}})
    with pytest.raises(RuntimeError, match="off their debt path"):
        ec.default_labels("zk0.1")
