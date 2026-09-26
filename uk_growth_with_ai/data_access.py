"""Locating and loading the packaged data files.

``data/scenarios.json``   the committed, reviewed model results (baseline + ramp arms)
``data/og_uk_params.json`` OG-UK's default trend parameters (g_n, g_y_annual),
                          vendored from the OG-UK checkout

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


def load_results(path=None) -> dict:
    """The committed scenario results."""
    return json.loads(Path(path or DEFAULT_RESULTS).read_text())


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
