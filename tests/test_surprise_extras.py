"""continuation_dnfull label and the opt-in SS initial guess (15 Nov 2026)."""
import os
import pickle
import types

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
    p = types.SimpleNamespace(baseline_dir=str(tmp_path / "base"), baseline_spending=False)
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
