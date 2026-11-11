"""The shocked arms a complete results file must contain: the single list.

``check``, the dashboard generator and ``report`` all read this module, so a
missing arm cannot pass one of them while another silently skips it.

The arm names follow the #22 rename (#14, #27): ``share_shift`` (zero
technology wedge) and ``share_shift_tfp`` (the share shift plus measured TFP).
Results written before the rename are read through
``data_access.normalise_arms``, which maps the legacy keys onto these names.
"""

from __future__ import annotations

from .scenarios import SHARE_SHIFT, SHARE_SHIFT_TFP

# scenario -> output gain at the baseline's fixed 2026 inputs (%) that its Z
# is solved for; results record that Z as assumptions["Z_<scenario>"].  The
# targets are the scenario definitions' own (scenarios.py): a zero technology
# wedge for share_shift, +3.1% for share_shift_tfp.
Z_TARGETS = {
    SHARE_SHIFT.name: round(100 * SHARE_SHIFT.gdp_level_change, 10),
    SHARE_SHIFT_TFP.name: round(100 * SHARE_SHIFT_TFP.tfp_gain, 10),
}

SHOCKED_ARMS = [f"{s}_ramp" for s in Z_TARGETS]
