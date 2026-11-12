"""R1-R4 rerun plumbing with OG-Core absent: demography fixes and the step plan."""

import json
import math
from types import SimpleNamespace

import numpy as np
import pytest

from uk_growth_with_ai import demography, rerun

S, T = 6, 12


def _pop(seed=0, break_at=None):
    """A consistent synthetic population path; optionally break one transition
    the way OG-Core's splice does (next period's rates generate the step)."""
    rng = np.random.default_rng(seed)
    rho = np.tile(rng.uniform(0.01, 0.05, S), (T, 1))
    rho[:, -1] = 1.0
    imm = rng.uniform(-0.01, 0.02, (T, S))
    if break_at is not None:
        rho[break_at + 1:] *= 1.3
        rho[:, -1] = 1.0
        imm[break_at + 1:] += 0.005
    lev = np.zeros((T + 1, S))
    lev[0] = rng.uniform(0.5, 1.0, S)
    rho_pre, imm_pre = rho[0].copy(), imm[0].copy()
    for k in range(T):
        r_k, i_k = (rho_pre, imm_pre) if k == 0 else (rho[k - 1], imm[k - 1])
        if break_at is not None and k - 1 == break_at:
            r_k, i_k = rho[k], imm[k]        # the projection uses the next rates
        lev[k + 1, 0] = lev[k, 0] * 1.01
        lev[k + 1, 1:] = (1 - r_k[:-1]) * lev[k, :-1] + i_k[1:] * lev[k, 1:]
    tot = lev.sum(1)
    om = lev / tot[:, None]
    g = tot[1:] / tot[:-1] - 1
    p = SimpleNamespace(omega=om[1:], g_n=g[1:], rho=rho, imm_rates=imm,
                        omega_S_preTP=om[0], g_n_preTP=g[0], rho_preTP=rho_pre,
                        imm_rates_preTP=imm_pre, start_year=2026,
                        omega_SS=om[-1], g_n_ss=g[-1])
    return p


def test_law_of_motion_holds_on_a_consistent_path():
    lom = demography.law_of_motion(_pop(), n=8)
    assert max(x["max_abs_rel"] for x in lom) < 1e-12


def test_splice_fix_closes_the_broken_transition_only():
    p = _pop(break_at=1)
    lom = demography.law_of_motion(p, n=8)
    assert lom[2]["max_abs_rel"] > 1e-4                      # 2027 -> 2028
    assert all(x["max_abs_rel"] < 1e-12 for i, x in enumerate(lom) if i != 2)
    g_before = np.array(p.g_n).copy()
    out = demography.apply_splice(p, 1)
    assert out["residual_after"] < 1e-12
    assert np.array_equal(p.g_n, g_before)                   # omega/g_n untouched
    assert max(x["max_abs_rel"] for x in demography.law_of_motion(p, n=8)) < 1e-12


def test_splice_fix_refuses_when_nothing_is_broken():
    with pytest.raises(RuntimeError, match="already holds"):
        demography.apply_splice(_pop(), 1)


def test_pretp_copies_from_the_same_fetch_only():
    p = _pop()
    pop = {"omega_S_preTP": p.omega_S_preTP, "g_n_preTP": 0.0123,
           "rho_preTP": p.rho_preTP * 0.9, "imm_rates_preTP": p.imm_rates_preTP}
    demography.apply_pretp(p, pop)
    assert p.g_n_preTP == 0.0123
    with pytest.raises(RuntimeError, match="different fetch"):
        demography.apply_pretp(p, {**pop, "omega_S_preTP": p.omega_S_preTP * 2})


# --- step plan -------------------------------------------------------------------

def _rec(label, dy2030=None, shift=0.0, Y=None, Z=None, arm="baseline"):
    Y = Y or [1.0] * 5
    D = [0.95 * y for y in Y]
    if dy2030 is not None:
        D[4] = dy2030 / 100 * Y[4]
    return {"label": label, "alpha_G_shift": shift, "alpha_G_used": 0.29 + shift,
            "Y": Y, "D": D, "K": [2.0] * 5, "L": [0.5] * 5, "Z_terminal": Z,
            "spec": {"arm": arm}}


def _write(tmp_path, closure, recs):
    d = tmp_path / closure
    d.mkdir(parents=True, exist_ok=True)
    for r in recs:
        (d / f"{r['label']}.json").write_text(json.dumps(r))


def test_baseline_secant_then_accept(tmp_path, monkeypatch):
    monkeypatch.setattr(rerun, "debt_target_2030", lambda: 95.0)
    assert rerun.next_step(tmp_path, "zk0", "baseline")["label"] == "baseline_p0"
    _write(tmp_path, "zk0", [_rec("baseline_p0", 93.0, 0.01)])
    nxt = rerun.next_step(tmp_path, "zk0", "baseline")
    assert nxt["label"] == "baseline_p1"
    assert nxt["alpha_G_shift"] == pytest.approx(0.01 + 2.0 / rerun.DEBT_SLOPE0)
    _write(tmp_path, "zk0", [_rec("baseline_p1", 94.0, 0.02)])
    nxt = rerun.next_step(tmp_path, "zk0", "baseline")
    assert nxt["alpha_G_shift"] == pytest.approx(0.03)        # secant: 100pp per unit
    _write(tmp_path, "zk0", [_rec("baseline_p2", 95.05, 0.03)])
    assert rerun.next_step(tmp_path, "zk0", "baseline") is None


def test_arms_need_the_gate_then_run_in_order(tmp_path, monkeypatch):
    monkeypatch.setattr(rerun, "debt_target_2030", lambda: 95.0)
    _write(tmp_path, "zk0", [_rec("baseline_p0", 95.0)])
    with pytest.raises(RuntimeError, match="gate"):
        rerun.next_step(tmp_path, "zk0", "arms")
    (tmp_path / "zk0" / "GATE_baseline.json").write_text(json.dumps({"approved": True}))
    assert rerun.next_step(tmp_path, "zk0", "arms")["label"] == "share_shift_tfp_ramp"
    _write(tmp_path, "zk0", [_rec("share_shift_tfp_ramp", Z=0.97)])
    s = rerun.next_step(tmp_path, "zk0", "arms")
    assert s["label"] == "share_shift_ramp_zfixed"
    z0 = s["Z"]
    _write(tmp_path, "zk0", [_rec("share_shift_ramp_zfixed", Y=[1, 1, 1, 1, 1.02], Z=z0)])
    s = rerun.next_step(tmp_path, "zk0", "arms")
    assert s["label"] == "share_shift_ramp_r4_1"
    assert math.log(s["Z"]) == pytest.approx(math.log(z0) - 0.02)
    _write(tmp_path, "zk0", [_rec("share_shift_ramp_r4_1", Y=[1, 1, 1, 1, 1.00005], Z=s["Z"])])
    assert rerun.next_step(tmp_path, "zk0", "arms") is None


def test_closure_record_rebuilds_an_overwritten_label():
    cl = rerun.closure_record({"label": "baseline_p1", "closure": "zk0.1"})
    assert cl["zeta_K"] == 0.1 and cl["zeta_D"] == 0.4
    assert cl["world_int_rate_annual"] == 0.02
    assert rerun.closure_record({"closure": "zk0"})["zeta_K"] == 0.0
    d = {"zeta_K": 0.1, "zeta_D": 0.4, "world_int_rate_annual": 0.02}
    assert rerun.closure_record({"closure": d, "closure_label": "zk0.1"}) is d
    with pytest.raises(ValueError):
        rerun.closure_record({"closure": "nonsense"})


def test_run_step_keeps_the_closure_dict(monkeypatch):
    import inspect
    src = inspect.getsource(rerun.run_step)
    assert '"closure_label": closure' in src and '"closure": closure' not in src


def test_fixed_spending_plan_uses_its_own_labels_and_the_main_slope(tmp_path, monkeypatch):
    monkeypatch.setattr(rerun, "debt_target_2030", lambda: 95.0)
    _write(tmp_path, "zk0", [_rec("baseline_p0", 95.0)])
    (tmp_path / "zk0" / "GATE_baseline.json").write_text(json.dumps({"approved": True}))
    # main variant: done, secant slope 200pp per unit ln Z
    _write(tmp_path, "zk0", [_rec("share_shift_tfp_ramp", Z=0.97),
                             _rec("share_shift_ramp_zfixed", Y=[1, 1, 1, 1, 1.02], Z=0.95),
                             _rec("share_shift_ramp_r4_1", Y=[1, 1, 1, 1, 1.0],
                                  Z=0.95 * math.exp(-0.01))])
    assert rerun.next_step(tmp_path, "zk0", "arms") is None
    s = rerun.next_step(tmp_path, "zk0", "arms_fs")
    assert s["label"] == "share_shift_tfp_ramp_fs" and s["baseline_spending"] is True
    _write(tmp_path, "zk0", [_rec("share_shift_tfp_ramp_fs", Z=0.97)])
    s = rerun.next_step(tmp_path, "zk0", "arms_fs")
    assert s["label"] == "share_shift_ramp_zfixed_fs"
    _write(tmp_path, "zk0", [_rec("share_shift_ramp_zfixed_fs", Y=[1, 1, 1, 1, 1.01], Z=s["Z"])])
    s2 = rerun.next_step(tmp_path, "zk0", "arms_fs")
    assert s2["label"] == "share_shift_ramp_fs_r4_1"
    assert math.log(s2["Z"]) == pytest.approx(math.log(s["Z"]) - 1.0 / 200.0)
