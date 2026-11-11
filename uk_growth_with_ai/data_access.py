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


# The `obr` arm was renamed `zero_tfp` because it does not reproduce the OBR's
# Box 2.2 case (GDP level unchanged); it imposes a zero technology wedge at the
# baseline's fixed 2026 inputs and delivers GDP +1.4% by 2030.  Results files
# written before the rename carry the old keys, so every reader normalises on
# load: the new keys are the only ones written, both are accepted.
ARM_RENAMES = {"obr_ramp": "zero_tfp_ramp", "obr_step": "zero_tfp_step"}
ASSUMPTION_RENAMES = {"Z_obr": "Z_zero_tfp", "obr_target": "zero_tfp_target"}


def normalise_arms(res: dict) -> dict:
    """Rename pre-rename arm and assumption keys in place-ish (returns a copy)."""
    out = {ARM_RENAMES.get(k, k): v for k, v in res.items()}
    if isinstance(out.get("assumptions"), dict):
        out["assumptions"] = {ASSUMPTION_RENAMES.get(k, k): v
                              for k, v in out["assumptions"].items()}
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
