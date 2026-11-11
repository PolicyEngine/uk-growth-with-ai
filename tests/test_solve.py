"""run_arm's wiring of gamma and Z, with OG-Core stubbed out.

The Z path must have the same SHAPE as the gamma path: a step arm steps both
from t = 0, a ramp arm ramps both.  Before the fix in #22 the Z block sat
outside ``if ramp``, so a step arm ran gamma at its terminal value from t = 0
against a Z that started at 1.0, leaving the pure-gamma output gain un-offset.
"""

from types import SimpleNamespace

import numpy as np
import pytest

from uk_growth_with_ai import solve
from uk_growth_with_ai.data_access import load_committed_g_n
from uk_growth_with_ai.scenarios import G_BASE, NPER, RAMP_YEARS

T, S = 12, 4
GAMMA = 0.389
Z_TERMINAL = 0.94


class _Stop(Exception):
    """Raised by the stub SS solve: everything we test happens before it."""


def _handles(captured, g_n_head=None):
    def build_specs(start, _, out_dir, base_dir, baseline, **kw):
        captured["overrides"] = kw["param_overrides"]
        head = load_committed_g_n(NPER) if g_n_head is None else np.asarray(g_n_head)
        p = SimpleNamespace(
            T=T, S=S, gamma=list(kw["param_overrides"]["gamma"]), Z=[1.0],
            g_n=np.concatenate([head, np.full(T + S - NPER, 0.002)]),
            TPI_outer_method=None, baseline_spending=False,
        )
        captured["p"] = p
        return p

    def run_ss(p, client=None):
        raise _Stop

    api = SimpleNamespace(_build_specs=build_specs)
    return (None, SimpleNamespace(run_SS=run_ss), api, None, None)


def _run(tmp_path, ramp, z_terminal, baseline=False, **kw):
    captured = {}
    with pytest.raises(_Stop):
        solve.run_arm("arm", GAMMA, ramp, z_terminal, str(tmp_path), None,
                      _handles(captured, kw.pop("g_n_head", None)),
                      baseline=baseline, **kw)
    return captured


def test_step_arm_steps_z_from_t0(tmp_path):
    c = _run(tmp_path, ramp=False, z_terminal=Z_TERMINAL)
    p = c["p"]
    z = np.asarray(p.Z, dtype=float).ravel()
    assert z.size == T + S
    assert np.allclose(z, Z_TERMINAL)                 # pre-fix: z[0] == 1.0
    assert p.gamma == [GAMMA]                         # stepped via param_overrides
    assert c["overrides"]["gamma"] == [GAMMA]


def test_ramp_arm_ramps_gamma_and_z_together(tmp_path):
    p = _run(tmp_path, ramp=True, z_terminal=Z_TERMINAL)["p"]
    gamma = np.asarray(p.gamma).ravel()
    z = np.asarray(p.Z).ravel()
    assert gamma[0] == pytest.approx(G_BASE) and z[0] == pytest.approx(1.0)
    assert gamma[RAMP_YEARS] == pytest.approx(GAMMA)
    assert z[RAMP_YEARS] == pytest.approx(Z_TERMINAL)
    assert np.allclose(z[RAMP_YEARS:], Z_TERMINAL)
    # Same shape: the fraction of the move done is identical in every period.
    assert np.allclose((gamma - G_BASE) / (GAMMA - G_BASE),
                       (z - 1.0) / (Z_TERMINAL - 1.0))


def test_baseline_leaves_z_and_gamma_alone(tmp_path):
    p = _run(tmp_path, ramp=False, z_terminal=None, baseline=True)["p"]
    assert p.Z == [1.0]
    assert p.gamma == [GAMMA]
