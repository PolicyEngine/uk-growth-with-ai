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


def test_paths_run_over_every_model_year():
    assert dd.PATH_YEARS == dd.YEARS
    for p in dd.uk_paths(RESULTS)["panels"]:
        for t in p["traces"][1:]:
            assert t["x"] == dd.YEARS and len(t["y"]) == len(dd.YEARS)


def test_every_obr_series_has_provenance():
    hist = dd._read("obr_history.json")
    assert isinstance(hist["_source"], dict)
    for p in hist["panels"]:
        prov = p["provenance"]
        for key in ["source", "url", "table", "definition", "year_basis", "vintage",
                    "last_outturn"]:
            assert prov.get(key), (p["var"], key)
        assert prov["url"].startswith("https://obr.uk/")
        obr = p["obr"]
        assert obr["x"][0] == 2000 and obr["x"][-1] == 2030
        assert len(obr["x"]) == len(obr["y"])
        assert "unverified" not in json.dumps(prov).lower()
        # the dotted marker sits at the panel's last outturn year
        assert str(p["shapes"][0]["x0"]) in prov["last_outturn"]
        if "pre_2008" in prov:
            assert all(s["url"].startswith("https://www.ons.gov.uk/")
                       for s in prov["pre_2008"]["series"])


def test_gdp_series_is_real():
    hist = dd._read("obr_history.json")
    y = next(p for p in hist["panels"] if p["var"] == "Y")
    assert y["provenance"]["real"] is True
    assert "Real GDP" in y["title"] and "prices" in y["title"]
    assert "chained volume" in y["provenance"]["definition"]
    assert "Real GDP" in y["provenance"]["column"]


def test_model_ratios_are_the_baseline_2026_ratios():
    ai = dd.ai_scenarios(RESULTS)
    b = RESULTS["baseline"]
    for v, r in ai["model_ratios"]["ratios"].items():
        assert abs(r - b[v][0] / b["Y"][0] * 100) < 1e-9
