"""The 2028 surprise restart, with OG-Core absent.

The OG-Core formulas the restart relies on (``aggregates.get_B`` and
``get_BQ``, 0.17.0) are copied below in numpy so the identity "aggregate
wealth and bequests at the restart equal the baseline's 2028 values" is
tested without ogcore installed (CI has none).
"""

import json
from types import SimpleNamespace

import numpy as np
import pytest

from uk_growth_with_ai import demography, solve, surprise as sp
from uk_growth_with_ai.data_access import load_committed_g_n
from uk_growth_with_ai.scenarios import G_BASE, NPER, RAMP_YEARS, START, TG1

S, T, J = 6, 12, 3
K = 2                                           # 2028 - 2026


# --- the OG-Core 0.17 formulas, copied --------------------------------------------

def get_B_ss_pretp(b, p):
    part1 = b * np.transpose(p.omega_S_preTP * p.lambdas)
    om = np.append(p.omega_S_preTP[1:], [0.0])
    im = np.append(p.imm_rates_preTP[1:], [0.0])
    return (part1 + b * np.transpose(om * im * p.lambdas)).sum() / (1.0 + p.g_n_preTP)


def get_B_tpi(b, p):
    lam = np.squeeze(p.lambdas)
    part1 = (b * lam) * p.omega[:p.T, :, None]
    om = np.append(p.omega[:p.T, 1:], np.zeros((p.T, 1)), axis=1)
    im = np.append(p.imm_rates[:p.T, 1:], np.zeros((p.T, 1)), axis=1)
    part2 = (b * lam) * (im * om)[:, :, None]
    return (part1 + part2).sum(1).sum(1) / (1.0 + np.hstack((p.g_n[:p.T - 1], p.g_n_ss)))


def get_BQ_ss_pretp(r, b, p):
    pre = np.transpose(p.omega_S_preTP * (p.rho_preTP * p.lambdas)) * b
    return pre.sum(0) * (1.0 + r) / (1.0 + p.g_n_preTP)


def get_BQ_tpi(r, b, p):
    pop = np.append(p.omega_S_preTP.reshape(1, p.S), p.omega[:p.T - 1], axis=0)
    rho = np.append(p.rho_preTP.reshape(1, p.S), p.rho[:p.T - 1], axis=0)
    BQ = ((b * np.squeeze(p.lambdas)) * (pop * rho)[:, :, None]).sum(1)
    return BQ * ((1.0 + r) / (1.0 + np.append(p.g_n_preTP, p.g_n[:p.T - 1])))[:, None]


def _spec(seed=0):
    """A 2026 specification stub: consistent demographics and a few time paths."""
    rng = np.random.default_rng(seed)
    n = T + S
    rho = np.tile(rng.uniform(0.01, 0.05, S), (n, 1)) * np.linspace(1, 1.2, n)[:, None]
    rho[:, -1] = 1.0
    imm = rng.uniform(-0.01, 0.02, (n, S))
    lev = np.zeros((n + 2, S))             # pre-period, then n periods, then one more
    lev[0] = rng.uniform(0.5, 1.0, S)
    rho_pre, imm_pre = rho[0].copy(), imm[0].copy()
    for t in range(n + 1):
        r_k, i_k = (rho_pre, imm_pre) if t == 0 else (rho[t - 1], imm[t - 1])
        lev[t + 1, 0] = lev[t, 0] * 1.01
        lev[t + 1, 1:] = (1 - r_k[:-1]) * lev[t, :-1] + i_k[1:] * lev[t, 1:]
    om = lev / lev.sum(1)[:, None]
    g = lev.sum(1)[1:] / lev.sum(1)[:-1] - 1
    return SimpleNamespace(
        T=T, S=S, J=J, start_year=START, tG1=TG1, tG2=T - 1,
        lambdas=np.array([[0.5], [0.3], [0.2]]),
        omega=om[1:n + 1], g_n=g[1:], rho=rho, imm_rates=imm,
        omega_S_preTP=om[0], g_n_preTP=float(g[0]), rho_preTP=rho_pre,
        imm_rates_preTP=imm_pre, omega_SS=om[-1], g_n_ss=float(g[-1]),
        alpha_T=np.linspace(0.06, 0.05, n), zeta_K=np.full(n, 0.1),
        Z=np.ones((n, 1)), gamma=[G_BASE],
        e=rng.uniform(0.5, 1.5, (T, S, J)),
        etr_params=[[[float(t), float(s)] for s in range(S)] for t in range(T)],
        lambdas_note="not time", chi_b=np.ones(J),
        initial_foreign_debt_ratio=0.09,
    )


# --- dates and the ramp -------------------------------------------------------------

def test_window_dates_follow_the_shock_year():
    w = sp.window(2028)
    assert w["k"] == 2
    assert (w["ramp_zero_year"], w["ramp_full_year"]) == (2027, 2031)
    assert w["z_anchor_year"] == 2027 and w["r4_year"] == 2031 == w["headline_year"]
    assert w["report_years"] == [2027, 2028, 2029, 2030, 2031]
    assert w["debt_rule_year"] == 2036
    with pytest.raises(ValueError):
        sp.k_of(START)


def test_offset_zero_reproduces_the_old_ramp_bit_for_bit():
    n = 140
    old = np.minimum(np.arange(n) / RAMP_YEARS, 1.0)[:, None]
    assert np.array_equal(sp.ramp_weights(n, 0), old)


def test_surprise_ramp_is_the_old_shape_one_year_later():
    w = sp.ramp_weights(10, K - 1).ravel()          # model t = 0 is 2028
    assert w[:5].tolist() == [0.25, 0.5, 0.75, 1.0, 1.0]
    cal = sp.calendar_weights(2028)
    assert [cal[y] for y in range(2026, 2033)] == [0, 0, 0.25, 0.5, 0.75, 1.0, 1.0]
    old = sp.ramp_weights(5, 0).ravel().tolist()     # 2026..2030
    assert [cal[y] for y in range(2027, 2032)] == old


# --- shifting the specification -------------------------------------------------------

def test_shift_moves_every_time_path_and_sets_the_pre_period():
    p0, p = _spec(), _spec()
    log = sp.shift_time_params(p, K)
    assert p.start_year == 2028 and p.tG1 == TG1 - K and p.tG2 == T - 1 - K
    for name in ("omega", "g_n", "rho", "imm_rates", "alpha_T", "e"):
        a0, a1 = np.asarray(getattr(p0, name)), np.asarray(getattr(p, name))
        assert a1.shape == a0.shape
        assert np.array_equal(a1[:-K], a0[K:])
        assert np.array_equal(a1[-K:], np.repeat(a0[-1:], K, axis=0))   # edge pad
    assert p.etr_params[0] == p0.etr_params[K] and len(p.etr_params) == T
    assert np.array_equal(p.omega_S_preTP, p0.omega[K - 1])
    assert p.g_n_preTP == p0.g_n[K - 1]
    assert np.array_equal(p.rho_preTP, p0.rho[K - 1])
    assert np.array_equal(p.imm_rates_preTP, p0.imm_rates[K - 1])
    assert np.array_equal(p.omega_SS, p0.omega_SS) and p.g_n_ss == p0.g_n_ss
    assert "omega" in log["shifted_varying"] and "zeta_K" in log["shifted_constant"]


def test_shifted_demographics_keep_the_law_of_motion():
    p = _spec()
    assert max(x["max_abs_rel"] for x in demography.law_of_motion(p, n=8)) < 1e-12
    sp.shift_time_params(p, K)
    assert max(x["max_abs_rel"] for x in demography.law_of_motion(p, n=8)) < 1e-12


def test_unlisted_time_varying_input_is_refused():
    p = _spec()
    p.mystery_path = np.linspace(0, 1, T + S)
    with pytest.raises(sp.ShiftError, match="mystery_path"):
        sp.shift_time_params(p, K)
    p = _spec()
    p.flat_path = np.full(T + S, 3.0)                # constant: harmless
    sp.shift_time_params(p, K)


def test_restart_wealth_and_bequests_equal_the_baseline_2028_values():
    """B0 and BQ0 of the restart (OG-Core's 'SS, preTP' formulas on the shifted
    spec) equal the baseline's TPI B and BQ in period k: the wealth carried into
    2028 is handed over, with the 2027 population that holds it."""
    p = _spec()
    rng = np.random.default_rng(1)
    b_sp1 = rng.uniform(0.1, 2.0, (T, S, J))         # baseline savings path
    r_p = rng.uniform(0.03, 0.05, T)
    B_tpi = np.r_[np.nan, get_B_tpi(b_sp1, p)[:T - 1]]   # B[t] for t >= 1
    b_shift = np.append(np.zeros((1, S, J)), b_sp1[:T - 1], axis=0)
    BQ_tpi = get_BQ_tpi(r_p, b_shift, p)
    sp.shift_time_params(p, K)
    assert get_B_ss_pretp(b_sp1[K - 1], p) == pytest.approx(B_tpi[K], rel=1e-13)
    assert np.allclose(get_BQ_ss_pretp(r_p[K], b_sp1[K - 1], p), BQ_tpi[K], rtol=1e-13)


# --- the initial state handed to TPI ---------------------------------------------------

def _tpi(seed=2):
    rng = np.random.default_rng(seed)
    return {"b_sp1": rng.uniform(0.1, 2, (T, S, J)), "n": rng.uniform(0.2, 0.6, (T, S, J)),
            "D": np.linspace(1.0, 1.2, T), "D_f": np.linspace(0.09, 0.12, T),
            "D_d": np.linspace(0.91, 1.08, T), "K_g": np.zeros(T), "B": np.linspace(3, 4, T),
            "K_d": np.linspace(2.09, 2.92, T), "BQ": np.ones((T, J)), "r_p": np.full(T, .04),
            "Y": np.linspace(2, 3, T), "TR": np.linspace(.1, .2, T),
            "G": np.linspace(.5, .6, T), "I_g": np.zeros(T)}


def test_baseline_state_is_period_k():
    tpi = _tpi()
    st = sp.baseline_state(tpi, K)
    assert np.array_equal(st["initial_b"], tpi["b_sp1"][K - 1])
    assert st["D0"] == tpi["D"][K] and st["B"] == tpi["B"][K]
    assert st["initial_foreign_debt_ratio"] == tpi["D_f"][K] / tpi["D"][K]
    assert np.array_equal(st["Y_path"][:T - K], tpi["Y"][K:])


def test_replace_initial_values_hands_over_the_state_and_checks_B():
    tpi = _tpi()
    st = sp.baseline_state(tpi, K)
    p = SimpleNamespace(T=T)
    ss_out = ((9.9, None, None, "factor", None, None), {"ss": 1}, "theta",
              (np.zeros(T), None, None, None, 0.5, 0.0))
    exact = lambda b, p, m, pre: st["B"]
    (iv, ss, theta, bv), chk = sp.replace_initial_values(ss_out, p, st, exact)
    B0, b_sinit, b_sp1init, factor, ib, n0 = iv
    assert B0 == st["B"] and factor == "factor" and theta == "theta"
    assert np.array_equal(ib, tpi["b_sp1"][K - 1]) and np.array_equal(b_sp1init, ib)
    assert np.array_equal(b_sinit[1:], ib[:-1]) and not b_sinit[0].any()
    assert np.array_equal(p.n_preTP, tpi["n"][K - 1])
    assert bv[4] == tpi["D"][K] and np.array_equal(bv[0], st["Y_path"][:T])
    assert bv[1] is None                                  # not fixed spending
    with pytest.raises(sp.ShiftError, match="aggregate wealth"):
        sp.replace_initial_values(ss_out, p, st, lambda *a: st["B"] * 1.001)


# --- 2026 and 2027 are the baseline, exactly ---------------------------------------------

def _base_ext(n=11):
    yrs = np.arange(n)
    s = {v: (1.0 + 0.01 * yrs + i).tolist() for i, v in
         enumerate(("Y", "K", "L", "C", "I", "r", "w", "D", "B", "D_f", "D_d", "K_d", "GNI"))}
    return {"base_label": "baseline_p1", "series": s,
            "years_series": list(range(START, START + n))}


def _run_record(base_ext, bump=0.02, ok=True):
    run = {v: [x * (1 + bump * (t > 0)) for t, x in enumerate(vals[K:])]
           for v, vals in base_ext["series"].items()}
    return {"series": run, "Z_terminal": 0.95,
            "surprise": {"predetermined": {"ok": ok}}}


def test_2026_and_2027_are_identical_to_the_baseline():
    be = _base_ext()
    rec = sp.calendar_record(_run_record(be), be, K)
    for v, x in rec["series"].items():
        assert x[:K] == be["series"][v][:K]               # exact, not approx
    assert rec["years"] == [2027, 2028, 2029, 2030, 2031]
    assert rec["Y"][0] == be["series"]["Y"][1]            # 2027 top-level point
    assert sp.gap_pct(rec, be, 2026) == 0.0 and sp.gap_pct(rec, be, 2027) == 0.0
    assert sp.gap_pct(rec, be, 2028) == 0.0               # predetermined in the stub
    assert sp.gap_pct(rec, be, 2031) == pytest.approx(2.0)
    assert len(rec["series"]["Y"]) == 11 and rec["years_series"][-1] == 2036


def test_splice_refuses_when_the_restart_did_not_inherit_the_state():
    be = _base_ext()
    with pytest.raises(sp.ShiftError, match="predetermined"):
        sp.calendar_record(_run_record(be, ok=False), be, K)


def test_predetermined_check():
    st = {"B": 3.0, "D0": 1.0, "D_f": 0.1, "D_d": 0.9, "K_d": 2.1}
    good = {"B": [3.0], "D": [1.0], "D_f": [0.1], "D_d": [0.9], "K_d": [2.1]}
    assert sp.predetermined_check(good, st)["ok"]
    assert not sp.predetermined_check({**good, "K_d": [2.2]}, st)["ok"]


# --- the plan ------------------------------------------------------------------------------

def _write(d, name, rec):
    d.mkdir(parents=True, exist_ok=True)
    (d / f"{name}.json").write_text(json.dumps(rec))


def _dirs(tmp_path):
    rerun_dir, out = tmp_path / "rerun", tmp_path / "surprise"
    from uk_growth_with_ai import rerun
    tgt = rerun.debt_target_2030()
    Y = [1.0] * 5
    _write(rerun_dir / "zk0.1", "baseline_p1",
           {"label": "baseline_p1", "alpha_G_used": 0.3, "alpha_G_shift": 0.01,
            "provenance": {"utc": "x"},
            "Y": Y, "D": [tgt / 100] * 5, "K": [2.0] * 5, "L": [0.4] * 5})
    # an old 2026-start R4 point in the RERUN dir must not leak into the plan
    _write(rerun_dir / "zk0.1", "share_shift_ramp_r4_1",
           {"label": "share_shift_ramp_r4_1", "Z_terminal": 0.93, "Y": Y})
    be = _base_ext()
    be["series"]["K"][1], be["series"]["L"][1] = 2.1, 0.41      # 2027 inputs
    _write(out / "zk0.1", "baseline_ext", be)
    return rerun_dir, out, be


def _arm(be, gap_2031_pp, Z):
    rec = sp.calendar_record(_run_record(be, bump=0.0), be, K)
    rec["series"]["Y"][5] *= 1 + gap_2031_pp / 100
    rec["Z_terminal"] = Z
    rec["elapsed_min"] = 7.0
    rec["diagnostics"] = {"tpi_converged": True}
    return rec


def test_plan_runs_the_continuation_first_and_gates_the_arms_on_it(tmp_path):
    rd, out, be = _dirs(tmp_path)
    nxt = lambda stage: sp.next_step(out, "zk0.1", stage, rd)
    assert nxt("continuation")["label"] == "continuation"
    with pytest.raises(RuntimeError, match="continuation stage first"):
        nxt("arms")
    bad = _arm(be, 0.5, None)                      # misses the baseline by 0.5%
    _write(out / "zk0.1", "continuation", bad)
    with pytest.raises(RuntimeError, match="misses the baseline"):
        nxt("arms")
    _write(out / "zk0.1", "continuation", _arm(be, 0.0, None))
    assert nxt("continuation") is None
    with pytest.raises(RuntimeError, match="gate is not approved"):
        nxt("arms")
    sp.write_gate(out, "zk0.1", "baseline", "test")
    s = nxt("arms")
    assert s["label"] == "share_shift_tfp_ramp" and s["surprise_year"] == 2028
    from uk_growth_with_ai.calibrate import solve_scenario
    from uk_growth_with_ai.scenarios import SCENARIOS
    z27 = solve_scenario(SCENARIOS["share_shift_tfp"], 2.1, 0.41, G_BASE)["Z"]
    assert s["Z"] == pytest.approx(z27)            # anchored at the 2027 inputs
    assert nxt("arms_fs")["label"] == "share_shift_tfp_ramp_fs"
    assert nxt("arms_fs")["baseline_spending"] is True


def test_r4_reads_the_2031_gap_and_ignores_old_points(tmp_path):
    rd, out, be = _dirs(tmp_path)
    d = out / "zk0.1"
    _write(d, "continuation", _arm(be, 0.0, None))
    sp.write_gate(out, "zk0.1", "baseline", "test")
    _write(d, "share_shift_tfp_ramp", _arm(be, 4.0, 0.97))
    _write(d, "share_shift_ramp_zfixed", _arm(be, 1.0, 0.943))
    pts = sp.r4_points(sp.load(out, "zk0.1"), be)
    assert [p[2] for p in pts] == ["share_shift_ramp_zfixed"]
    assert pts[0][1] == pytest.approx(1.0)
    s = sp.next_step(out, "zk0.1", "arms", rd)
    assert s["label"] == "share_shift_ramp_r4_1" and s["Z"] < 0.943
    _write(d, "share_shift_ramp_r4_1", _arm(be, 0.004, s["Z"]))
    assert sp.next_step(out, "zk0.1", "arms", rd) is None
    res = sp.assemble(out, "zk0.1", rerun_dir=rd)
    assert res["years"] == [2027, 2028, 2029, 2030, 2031]
    assert res["assumptions"]["Z_share_shift_year"] == 2031
    assert res["share_shift_ramp"]["Z_terminal"] == s["Z"]
    assert res["assumptions"]["Z_anchor_year"] == 2027
    assert res["baseline"]["Y"] == be["series"]["Y"][1:6]


# --- run_arm wiring (stubbed OG-Core) ----------------------------------------------------

class _Stop(Exception):
    pass


def _handles(captured):
    def build_specs(start, _, out_dir, base_dir, baseline, **kw):
        n = T + S
        p = SimpleNamespace(T=T, S=S, gamma=list(kw["param_overrides"]["gamma"]),
                            Z=np.ones((n, 1)), tG1=kw["param_overrides"]["tG1"], tG2=T - 1,
                            g_n=np.concatenate([load_committed_g_n(NPER),
                                                np.full(n - NPER, 0.002)]),
                            TPI_outer_method=None, baseline_spending=False,
                            start_year=start, initial_foreign_debt_ratio=0.0904)
        captured["p"] = p
        return p

    def run_ss(p, client=None):
        raise _Stop

    return (None, SimpleNamespace(run_SS=run_ss), SimpleNamespace(_build_specs=build_specs),
            None, None)


def test_run_arm_surprise_shifts_the_spec_and_offsets_the_ramp(tmp_path):
    st = sp.baseline_state(_tpi(), K)
    c = {}
    with pytest.raises(_Stop):
        solve.run_arm("arm", 0.389, True, 0.94, str(tmp_path), None, _handles(c),
                      surprise=st)
    p = c["p"]
    assert p.tG1 == TG1 - K and p.start_year == 2028
    assert p.initial_foreign_debt_ratio == st["initial_foreign_debt_ratio"]
    w = (np.asarray(p.gamma).ravel() - G_BASE) / (0.389 - G_BASE)
    assert np.allclose(w[:5], [0.25, 0.5, 0.75, 1.0, 1.0])
    z = np.asarray(p.Z).ravel()
    assert np.allclose((z[:5] - 1) / (0.94 - 1), [0.25, 0.5, 0.75, 1.0, 1.0])
    assert p.g_n[0] == load_committed_g_n(NPER)[K]   # guard ran before the shift


def test_run_arm_without_surprise_is_unchanged(tmp_path):
    c = {}
    with pytest.raises(_Stop):
        solve.run_arm("arm", 0.389, True, 0.94, str(tmp_path), None, _handles(c))
    p = c["p"]
    assert p.tG1 == TG1 and p.start_year == START
    old = np.minimum(np.arange(T + S) / RAMP_YEARS, 1.0)[:, None]
    assert np.array_equal(p.gamma, G_BASE + old * (0.389 - G_BASE))     # bit for bit
    assert np.array_equal(p.Z, 1.0 + old * (0.94 - 1.0))


def test_continuation_gate_uses_I_as_a_share_of_Y_and_the_restart_RC():
    be = _base_ext()
    be["series"]["I"] = [0.2 * y for y in be["series"]["Y"]]   # I/Y = 0.2
    rec = _arm(be, 0.0, None)
    rec["series"]["I"][3] *= 1.002          # 0.2% of I = 0.04% of Y: within 0.1%
    rep = sp.continuation_report(rec, be)
    assert rep["ok"] and "I" not in rep
    rec["diagnostics"] = {"rc_rel_Y_signed": [5e-5, 0.0]}
    assert not sp.continuation_report(rec, be)["ok"]


def test_gate_fixes_the_reference_for_r4_and_assemble(tmp_path):
    """With reference = continuation, R4 is measured against the restart, so the
    reported R4 gap is the one the secant drove to zero."""
    rd, out, be = _dirs(tmp_path)
    d = out / "zk0.1"
    cont = _arm(be, 0.005, None)            # restart 0.005% above the baseline in 2031
    _write(d, "continuation", cont)
    with pytest.raises(ValueError):
        sp.write_gate(out, "zk0.1", "nonsense", "")
    sp.write_gate(out, "zk0.1", "continuation", "test")
    _write(d, "share_shift_tfp_ramp", _arm(be, 4.0, 0.97))
    _write(d, "share_shift_ramp_zfixed", _arm(be, 0.005, 0.943))  # 0 against the restart
    assert sp.next_step(out, "zk0.1", "arms", rd) is None        # already accepted
    res = sp.assemble(out, "zk0.1", rerun_dir=rd)
    assert res["assumptions"]["gap_reference"] == "continuation"
    assert res["baseline"]["Y"] == cont["series"]["Y"][1:6]
    assert res["baseline"]["series"]["Y"][:2] == be["series"]["Y"][:2]   # 2026-27 exact
    assert abs(res["assumptions"]["r4_iterations"][0]["gdp_gap_pct"]) < 1e-9
    assert set(res["assumptions"]["r4_post_target_gdp_gap_pct"]) == set(range(2032, 2037))


def test_continuation_gate_is_tight_on_gdp_capital_and_debt_to_2036():
    be = _base_ext()
    ok = _arm(be, 0.0, None)
    assert sp.continuation_report(ok, be)["years"] == [2028, 2036]
    for v, i in (("Y", 10), ("K", 9), ("D", 8)):     # 2036, 2035, 2034
        rec = _arm(be, 0.0, None)
        rec["series"][v][i] *= 1 + 2e-4              # 0.02%: beyond 1e-4
        rep = sp.continuation_report(rec, be)
        assert not rep["tight_ok"] and not rep["ok"], v
    rec = _arm(be, 0.0, None)
    rec["series"]["L"][6] *= 1 + 5e-4                # looser variables: 1e-3
    assert sp.continuation_report(rec, be)["ok"]


# --- the debt-neutral closure -------------------------------------------------------

def _dg_path(D0, Y, G, I_g, TR, UBI, pens, rev, fa, r_gov_of, growth, n):
    """OG-Core 0.17 fiscal.D_G_path's debt recursion (before tG1), copied."""
    D = np.empty(n + 1)
    D[0] = D0
    for t in range(1, n + 1):
        rg = r_gov_of(t - 1, D[t - 1] / Y[t - 1])
        D[t] = ((1 + rg) * D[t - 1] + G[t - 1] + I_g[t - 1] + TR[t - 1] + UBI[t - 1]
                + pens[t - 1] - rev[t - 1] - fa[t - 1]) / growth[t]
    return D


def test_debt_neutral_transfers_put_debt_gdp_on_the_target_path():
    rng = np.random.default_rng(3)
    n = 8
    Y = 1 + 0.02 * np.arange(n + 1) + rng.uniform(0, .01, n + 1)
    G, rev = 0.3 * Y, 0.42 * Y
    I_g, UBI, fa = np.zeros(n + 1), np.zeros(n + 1), np.zeros(n + 1)
    pens = 0.05 * Y
    growth = np.full(n + 2, 1.012)
    r_gov_of = lambda t, dy: 0.03 + 0.01 * dy          # r_gov depends on D/Y
    target = 0.95 + 0.002 * np.arange(n + 1)
    D0 = 0.95 * Y[0] * 1.001
    tr = sp.debt_neutral_tr(target, Y, G, I_g, UBI, pens, rev, fa, r_gov_of, D0, growth, n)
    D = _dg_path(D0, Y, G, I_g, tr, UBI, pens, rev, fa, r_gov_of, growth, n)
    assert np.allclose(D[1:] / Y[1:n + 1], target[1:], rtol=1e-12, atol=0)
    assert D[0] == D0


class _Fiscal:
    """A stand-in for ogcore.fiscal: TR = alpha_T * Y, D_G_path returns G untouched."""

    def __init__(self):
        self.seen_G = None

    def get_TR(self, Y, TR, G, rev, pens, UBI, I_g, p, method):
        return 0.06 * np.asarray(Y, float)

    def D_G_path(self, r, dg_fixed_values, p):
        self.seen_G = dg_fixed_values[0] * 0.3          # "G = alpha_G * Y"
        return ("D", self.seen_G)

    @staticmethod
    def get_r_gov(r, dy, p, method, t=None):
        return 0.8 * r + 0.01 * dy


def test_debt_neutral_patch_sets_tr_until_tG1_and_leaves_g_and_ss_alone():
    fis = _Fiscal()
    orig_tr, orig_dg = fis.get_TR, fis.D_G_path
    T_ = 12
    p = SimpleNamespace(T=T_, tG1=8, g_n_preTP=0.004, g_n=np.full(T_ + 6, 0.004), g_y=0.01,
                        alpha_FA=np.zeros(T_ + 6), baseline_spending=False,
                        budget_balance=False)
    Y = np.linspace(1, 1.2, T_)
    target = [0.95] * 9                                   # 2028..2036
    rec = {}
    with sp.debt_neutral(fis, target, 0.94, rec):
        out = fis.D_G_path(np.full(T_, 0.05), (Y,), p)
        assert np.array_equal(out[1], 0.3 * Y)            # G: its usual rule, unchanged
        tr = fis.get_TR(Y, None, 0.3 * Y, 0.42 * Y, 0.05 * Y, np.zeros(T_), np.zeros(T_),
                        p, "TPI")
        ss_tr = fis.get_TR(Y, None, 0.3 * Y, 0.42 * Y, 0.05 * Y, 0, 0, p, "SS")
    assert fis.get_TR == orig_tr and fis.D_G_path == orig_dg          # restored
    assert rec["horizon"] == 8 and rec["calls"] == 1
    assert np.array_equal(tr[8:], 0.06 * Y[8:])           # alpha_T * Y from tG1
    assert not np.allclose(tr[:8], 0.06 * Y[:8])
    assert np.array_equal(ss_tr, 0.06 * Y)                # SS untouched
    growth = (1 + np.append(p.g_n_preTP, p.g_n[:T_])) * np.exp(p.g_y)
    rg = lambda t, dy: 0.8 * 0.05 + 0.01 * dy
    D = _dg_path(0.94, Y, 0.3 * Y, np.zeros(T_), tr, np.zeros(T_), 0.05 * Y, 0.42 * Y,
                 np.zeros(T_), rg, growth, 8)
    assert np.allclose(D[1:] / Y[1:9], 0.95, rtol=1e-12)


def test_dn_plan_labels_check_and_assemble(tmp_path):
    rd, out, be = _dirs(tmp_path)
    d = out / "zk0.1"
    _write(d, "continuation", _arm(be, 0.0, None))
    sp.write_gate(out, "zk0.1", "continuation", "test")
    s = sp.next_step(out, "zk0.1", "arms_dn", rd)
    assert s["label"] == "share_shift_tfp_ramp_dn" and s["variant"] == "dn"
    assert s["baseline_spending"] is False
    good = lambda g, Z: {**_arm(be, g, Z), "dn_check": {"ok": True}}
    _write(d, "share_shift_tfp_ramp_dn", good(4.0, 0.97))
    _write(d, "share_shift_ramp_zfixed_dn", good(0.004, 0.943))
    assert sp.next_step(out, "zk0.1", "arms_dn", rd) is None
    res = sp.assemble(out, "zk0.1", fs="dn", rerun_dir=rd)
    assert res["assumptions"]["fiscal_variant"] == "dn"
    _write(d, "share_shift_tfp_ramp_dn", {**_arm(be, 4.0, 0.97), "dn_check": {"ok": False}})
    with pytest.raises(RuntimeError, match="off their debt path"):
        sp.assemble(out, "zk0.1", fs="dn", rerun_dir=rd)


def test_dn_check_and_nni():
    be = _base_ext()
    rec = _arm(be, 0.0, None)
    assert sp.dn_check(rec, be)["ok"]
    rec["series"]["D"][7] *= 1.001                         # 2033
    c = sp.dn_check(rec, be)
    assert not c["ok"] and c["max_abs_rel"] == pytest.approx(1e-3)
    T_ = 4
    tpi = {"Y": np.full(T_, 2.0), "K": np.full(T_, 3.0), "K_f": np.full(T_, .3),
           "D_f": np.full(T_, .1), "r_p": np.full(T_, .05)}
    s = sp.series_from_tpi(tpi, T_, T_, ("Y", "K", "K_f", "D_f", "r_p"))
    assert s["GNI"][0] == pytest.approx(2.0 - .05 * .4)
    assert s["NNI"][0] == pytest.approx(s["GNI"][0] - sp.DELTA_ANNUAL * 3.0)
