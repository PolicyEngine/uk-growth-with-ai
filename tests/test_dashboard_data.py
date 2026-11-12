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
        base = next(t for t in p["traces"] if t["name"] == dd.ARM_TRACE["baseline"][0])
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


def test_trace_names_match_the_dashboard_labels():
    # HistoricalPaths.jsx joins the JSON trace name to ARM_META's label; if the
    # two drift apart the chart silently falls back to the JSON's colours.
    import re

    js = (dd.DASHBOARD_DATA.parent / "tabs" / "ai" / "series.js").read_text()
    labels = dict(re.findall(r"^\s*(\w+): \{ label: '([^']+)'", js, flags=re.M))
    for arm, (name, _) in dd.ARM_TRACE.items():
        assert labels[arm] == name, arm
    assert dd.ARM_TRACE["baseline"][0].startswith("OG-UK")


def test_fixed_spending_must_share_the_main_baseline(tmp_path, monkeypatch):
    import copy
    import json as _json
    import pytest as _pytest
    from uk_growth_with_ai import dashboard_data as dd
    from uk_growth_with_ai.data_access import load_results
    res = load_results()
    fs = copy.deepcopy(res)
    fs["baseline"]["Y"] = [y * 1.01 for y in fs["baseline"]["Y"]]
    (tmp_path / "scenarios_fixed_spending.json").write_text(_json.dumps(fs))
    monkeypatch.setattr(dd, "DATA", tmp_path)
    with _pytest.raises(ValueError, match="different baseline"):
        dd.fixed_spending(res)


def test_closure_blocks_are_gaps_against_each_closures_own_baseline():
    c = dd.closures(RESULTS)
    assert c["central"]["zeta_K"] == 0.1 and c["bound"]["zeta_K"] == 0.0
    assert c["central"]["years"][0] == 2026 and c["central"]["years"][-1] == 2035
    for block in (c["central"], c["bound"]):
        for arm in dd.SHOCKED:
            a = block["arms"][arm]
            assert all(len(v) == 10 for v in a.values())
    # the closed-capital bound has no foreign-owned capital
    assert all(x in (None, 0.0) for arm in dd.SHOCKED
               for x in c["bound"]["arms"][arm]["foreign_share_K"])
    # share_shift is GDP-neutral in 2030 by construction (R4, within 0.01pp)
    i = c["central"]["years"].index(2030)
    for block in (c["central"], c["bound"]):
        assert abs(block["arms"]["share_shift_ramp"]["Y"][i]) < 0.01
    assert len(c["obr_debt_gdp"]) == len(dd.YEARS)


def test_fixed_spending_block_holds_spending_and_carries_both_closures():
    f = dd.fixed_spending(RESULTS)
    assert f["central"]["zeta_K"] == 0.1 and f["bound"]["zeta_K"] == 0.0
    for block in f.values():
        assert block["years"][0] == 2026 and block["years"][-1] == 2035
        i = block["years"].index(2030)
        for arm in dd.SHOCKED:
            a = block["arms"][arm]
            assert set(a) == {"Y", "GNI", "w", "debt_gdp_pp"}
            assert all(len(v) == 10 for v in a.values())
            # the GNI gap is below the GDP gap, as in the main runs
            assert a["GNI"][i] < a["Y"][i]
        # share_shift is re-solved under this rule: GDP-neutral in 2030 (R4)
        assert abs(block["arms"]["share_shift_ramp"]["Y"][i]) <= 0.01
    # less public absorption: debt/GDP is lower than under a common G/Y, in 2030
    # and in 2035, in both arms and both closures
    c = dd.closures(RESULTS)
    for name in ("central", "bound"):
        for arm in dd.SHOCKED:
            for y in (4, 9):
                assert (f[name]["arms"][arm]["debt_gdp_pp"][y]
                        < c[name]["arms"][arm]["debt_gdp_pp"][y])


def test_fixed_spending_refuses_arms_that_do_not_hold_spending(tmp_path, monkeypatch):
    import json as _json
    import pytest as _pytest
    # the common-G/Y results as a "fixed-spending" file: same baseline, G moves
    (tmp_path / "scenarios_fixed_spending.json").write_text(_json.dumps(RESULTS))
    monkeypatch.setattr(dd, "DATA", tmp_path)
    with _pytest.raises(ValueError, match="does not hold G and TR"):
        dd.fixed_spending(RESULTS)


def test_stale_ignores_last_digit_noise_but_not_a_changed_number(tmp_path):
    for f in dd.write(tmp_path, results=RESULTS):
        pass
    assert dd.stale(tmp_path, results=RESULTS) == []
    path = tmp_path / "aiScenarios.json"
    d = json.loads(path.read_text())
    y = d["idx"]["baseline"]["Y"]
    y[2] = float(np.nextafter(y[2], np.inf))          # one ulp: another CPU's exp()
    path.write_text(json.dumps(d, indent=1))
    assert dd.stale(tmp_path, results=RESULTS) == []
    y[2] *= 1 + 1e-6
    path.write_text(json.dumps(d, indent=1))
    assert dd.stale(tmp_path, results=RESULTS) == ["aiScenarios.json"]
    d["idx"]["baseline"]["Y"] = y[:-1]                # a dropped value
    path.write_text(json.dumps(d, indent=1))
    assert dd.stale(tmp_path, results=RESULTS) == ["aiScenarios.json"]
