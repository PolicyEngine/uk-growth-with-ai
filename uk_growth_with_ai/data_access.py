"""Locating and loading the packaged data files.

``data/scenarios.json``   the committed, reviewed model results (all five arms)
``data/trajectories.json`` derived chart data, owned by ``dashboard/``
``data/og_uk_params.json`` the trend parameters (g_n, g_y_annual) vendored from
                          the OG-UK checkout used for the committed run

The trend parameters are vendored because both original scripts re-trended the
detrended model output with the OG-UK DEFAULT g_n, not with the ``g_n_used``
recorded in the results file.  Reading them from the package keeps every
published number reproducible without an OG-UK checkout on the machine;
``oguk_dir`` re-reads the live file instead.
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


def load_trajectories(path=None) -> dict:
    """Derived chart data (written for the dashboard)."""
    return json.loads(Path(path or DATA / "trajectories.json").read_text())


def _flat(params: dict, name: str) -> np.ndarray:
    v = params[name]
    return np.asarray(v["value"] if isinstance(v, dict) and "value" in v else v).ravel()


def load_trend_params(oguk_dir=None) -> tuple[np.ndarray, float]:
    """Return ``(g_n, g_y_annual)``.

    With ``oguk_dir`` the live ``oguk_default_parameters.json`` is read; without
    it the vendored copy is used, which carries identical values.
    """
    if oguk_dir:
        params = json.loads(
            (Path(oguk_dir) / "oguk" / "oguk_default_parameters.json").read_text()
        )
    else:
        params = json.loads((DATA / "og_uk_params.json").read_text())
    return _flat(params, "g_n"), float(_flat(params, "g_y_annual")[0])
