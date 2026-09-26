"""The dashboard's data files are generated, not hand-edited."""

import json

import numpy as np

from uk_growth_with_ai import dashboard_data as dd
from uk_growth_with_ai import load_results

RESULTS = load_results()


def test_committed_dashboard_files_match_the_generator():
    assert dd.stale(results=RESULTS) == [], (
        "run `python -m uk_growth_with_ai dashboard` and commit the output")


def test_paths_start_at_the_obr_2026_value():
    for p in dd.uk_paths(RESULTS)["panels"]:
        obr = p["traces"][0]
        o26 = dict(zip(obr["x"], obr["y"]))[2026]
        base = next(t for t in p["traces"] if t["name"] == "UK, no AI")
        assert base["x"][0] == 2026
        assert abs(base["y"][0] - o26) < 1e-3


def test_indices_are_2026_baseline_100():
    ai = dd.ai_scenarios(RESULTS)
    for v, _ in dd.VARS:
        assert abs(ai["idx"]["baseline"][v][0] - 100) < 1e-9


def test_generated_files_are_valid_json_with_every_arm():
    files = dd.build(RESULTS)
    ai = json.loads(files["aiScenarios.json"])
    assert ai["arms"] == dd.ARMS
    paths = json.loads(files["ukAiPaths.json"])
    for p in paths["panels"]:
        assert [t["name"] for t in p["traces"][1:]] == [dd.ARM_TRACE[a][0] for a in dd.ARMS]
        assert np.all(np.isfinite(p["traces"][1]["y"]))
