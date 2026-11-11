"""The shocked arms a complete results file must contain: the single list.

``check``, the dashboard generator and ``report`` all read this list, so a
missing arm cannot pass one of them while another silently skips it.

The arm rename in flight on ``fix/baseline-contamination`` (#22, #27: ``obr`` /
``zero_tfp`` / ``anthropic`` -> ``share_shift`` / ``share_shift_tfp``) is a
one-line change here; older results files are mapped to the new names on load
by ``data_access.normalise_arms`` on that branch.
"""

from __future__ import annotations

SHOCKED_ARMS = ["obr_ramp", "anthropic_ramp"]
