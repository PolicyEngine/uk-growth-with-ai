"""Locating and loading the packaged data files.

``data/scenarios.json``   the committed, reviewed model results (baseline + ramp arms)
``data/og_uk_params.json`` OG-UK's default trend parameters (g_n, g_y_annual),
                          vendored from the OG-UK checkout
``data/g_n_committed_run.json`` the g_n path the committed run used, vendored so a
                          re-run need not depend on a live UN demographic fetch

Re-trending uses the ``g_n_used`` and ``g_y_annual_used`` each results file
records (issue #4). The vendored defaults remain for results files that
predate those fields.
"""

from __future__ import annotations

import json
from importlib.resources import files
from pathlib import Path

import numpy as np

DATA = Path(str(files("uk_growth_with_ai") / "data"))
DEFAULT_RESULTS = DATA / "scenarios.json"


# Legacy arm names (issue #14).  The arms are named for what they impose:
#   share_shift      (was `obr`, then `zero_tfp`)  capital share +3.9pp, zero
#                    technology wedge at fixed baseline inputs
#   share_shift_tfp  (was `anthropic`)             the same plus +3.1% output at
#                                                  fixed baseline inputs
# Results files written before the rename carry the old keys, so every reader
# normalises on load: only the new keys are written, every spelling is read.
_LEGACY_STEMS = {"obr": "share_shift", "zero_tfp": "share_shift",
                 "anthropic": "share_shift_tfp"}
LEGACY_KEYS = {
    f"{pre}{old}{suf}": f"{pre}{new}{suf}"
    for old, new in _LEGACY_STEMS.items()
    for pre, suf in (("", ""), ("", "_ramp"), ("", "_step"),
                     ("Z_", ""), ("", "_target"))
}


def normalise_arms(obj):
    """Rename legacy arm / assumption KEYS at every depth; returns a copy.

    Only dict keys listed in ``LEGACY_KEYS`` are renamed, recursively through
    nested dicts and lists; string values are never touched.  Idempotent on a
    file that already uses the new names.  Raises ``ValueError`` if one dict
    would end up with two values for the same key (e.g. both ``obr_ramp`` and
    ``share_shift_ramp``), rather than silently keeping one.  Meant for model
    results files; ``data/obr_history.json`` is not one.
    """
    if isinstance(obj, list):
        return [normalise_arms(v) for v in obj]
    if not isinstance(obj, dict):
        return obj
    out = {}
    for k, v in obj.items():
        new = LEGACY_KEYS.get(k, k)
        if new in out:
            raise ValueError(f"results carry both a legacy and a current spelling "
                             f"of {new!r} (offending key {k!r})")
        out[new] = normalise_arms(v)
    return out


def load_results(path=None) -> dict:
    """The committed scenario results, with pre-rename arm keys normalised."""
    return normalise_arms(json.loads(Path(path or DEFAULT_RESULTS).read_text()))


def load_committed_g_n(n: int) -> np.ndarray:
    """The vendored g_n path of the committed run, extended to ``n`` periods.

    Only 5 periods were ever recorded (``baseline.g_n_used``), so the tail is
    held FLAT at the last recorded value -- our convention, not the original
    run's path.  See ``data/g_n_committed_run.json`` -> ``_limitations``.
    """
    d = json.loads((DATA / "g_n_committed_run.json").read_text())
    head = np.asarray(d["g_n"], dtype=float)
    if n <= head.size:
        return head[:n]
    return np.concatenate([head, np.full(n - head.size, head[-1])])


def _flat(params: dict, name: str) -> np.ndarray:
    v = params[name]
    return np.asarray(v["value"] if isinstance(v, dict) and "value" in v else v).ravel()


def load_trend_params(oguk_dir=None, results=None) -> tuple[np.ndarray, float]:
    """Return ``(g_n, g_y_annual)`` for re-trending model output.

    With ``results`` (a results dict), the values the run actually used are
    returned: the baseline's ``g_n_used`` and ``g_y_annual_used`` (issue #4).
    Otherwise ``oguk_dir``'s live ``oguk_default_parameters.json`` or the
    vendored copy is read; those are OG-UK defaults, not what a run used.
    """
    if results is not None and "g_n_used" in results.get("baseline", {}):
        b = results["baseline"]
        return np.asarray(b["g_n_used"], dtype=float), float(b["g_y_annual_used"])
    if oguk_dir:
        params = json.loads(
            (Path(oguk_dir) / "oguk" / "oguk_default_parameters.json").read_text()
        )
    else:
        params = json.loads((DATA / "og_uk_params.json").read_text())
    return _flat(params, "g_n"), float(_flat(params, "g_y_annual")[0])
