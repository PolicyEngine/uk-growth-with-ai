"""The shocked arms a complete results file must contain: the single list.

``check``, the dashboard generator and ``report`` all read this module, so a
missing arm cannot pass one of them while another silently skips it.

The arm rename in flight on ``fix/baseline-contamination`` (#22, #27:
``obr`` -> ``share_shift``, ``anthropic`` -> ``share_shift_tfp``) is a one-line
change to ``Z_TARGETS`` here: the arm names and the ``Z_<scenario>`` assumption
keys ``check`` reads both follow from it. (``solve.py`` and ``cli.py`` name the
scenarios themselves and are renamed on that branch.)
"""

from __future__ import annotations

# scenario -> output gain at the baseline's fixed 2026 inputs (%) that its Z
# is solved for; results record that Z as assumptions["Z_<scenario>"].
Z_TARGETS = {"obr": 0.0, "anthropic": 3.1}

SHOCKED_ARMS = [f"{s}_ramp" for s in Z_TARGETS]
