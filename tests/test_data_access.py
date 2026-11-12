"""Legacy arm names are read at every depth, written nowhere (issue #14)."""

import json

import pytest

from uk_growth_with_ai.data_access import DATA, LEGACY_KEYS, load_results, normalise_arms

LEGACY = {
    "baseline": {"Y": [1.0]},
    "obr_ramp": {"Y": [1.1], "note": "obr_ramp stays a string"},
    "anthropic_step": {"Y": [1.2]},
    "assumptions": {"Z_obr": 0.94, "Z_anthropic": 0.97,
                    "obr_target": "x", "anthropic_target": "y"},
    "fixed_spending": {
        "arms": {"zero_tfp_ramp": {"Y_gap": [0.1]}, "anthropic_ramp": {"Y_gap": [0.2]}},
        "runs": [{"Z_zero_tfp": 0.94, "anthropic": {"Z": 0.97}}],
    },
}


def test_legacy_keys_are_renamed_at_every_depth():
    out = normalise_arms(LEGACY)
    assert set(out) == {"baseline", "share_shift_ramp", "share_shift_tfp_step",
                        "assumptions", "fixed_spending"}
    assert out["assumptions"] == {"Z_share_shift": 0.94, "Z_share_shift_tfp": 0.97,
                                  "share_shift_target": "x",
                                  "share_shift_tfp_target": "y"}
    assert set(out["fixed_spending"]["arms"]) == {"share_shift_ramp", "share_shift_tfp_ramp"}
    assert out["fixed_spending"]["runs"] == [
        {"Z_share_shift": 0.94, "share_shift_tfp": {"Z": 0.97}}]


def test_string_values_are_never_rewritten():
    assert normalise_arms(LEGACY)["share_shift_ramp"]["note"] == "obr_ramp stays a string"


def test_normalising_is_idempotent_and_copies():
    once = normalise_arms(LEGACY)
    assert normalise_arms(once) == once
    assert "obr_ramp" in LEGACY            # the input is not mutated


@pytest.mark.parametrize("legacy", ["obr_ramp", "zero_tfp_ramp"])
def test_a_legacy_and_a_current_key_together_raise(legacy):
    with pytest.raises(ValueError, match="share_shift_ramp"):
        normalise_arms({"share_shift_ramp": {}, legacy: {}})
    with pytest.raises(ValueError):
        normalise_arms({"nested": {legacy: 1, "share_shift_ramp": 2}})


def test_two_legacy_spellings_of_one_arm_raise():
    with pytest.raises(ValueError):
        normalise_arms({"obr_ramp": {}, "zero_tfp_ramp": {}})


def test_committed_files_use_only_the_new_names():
    def keys(o):
        if isinstance(o, dict):
            for k, v in o.items():
                yield k
                yield from keys(v)
        elif isinstance(o, list):
            for v in o:
                yield from keys(v)

    names = sorted(DATA.glob("scenarios*.json")) + sorted((DATA / "legacy").glob("*.json"))
    assert len(names) >= 3
    for name in names:
        raw = json.loads(name.read_text())
        assert not set(keys(raw)) & set(LEGACY_KEYS), name
        assert normalise_arms(raw) == raw


def test_a_legacy_results_file_loads_as_the_current_one(tmp_path):
    current = load_results()
    inverse = {}
    for old, new in LEGACY_KEYS.items():
        inverse.setdefault(new, old)       # first legacy spelling of each key

    def to_legacy(o):
        if isinstance(o, dict):
            return {inverse.get(k, k): to_legacy(v) for k, v in o.items()}
        if isinstance(o, list):
            return [to_legacy(v) for v in o]
        return o

    p = tmp_path / "legacy.json"
    p.write_text(json.dumps(to_legacy(current)))
    assert "obr_ramp" in json.loads(p.read_text())
    assert load_results(p) == current
