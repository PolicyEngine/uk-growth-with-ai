"""`check` and `report` on the 2028 surprise results files (2027-2031 window)."""

import copy
import json

import numpy as np
import pytest

from uk_growth_with_ai import checks, cli, report
from uk_growth_with_ai.data_access import DATA, load_results

SUR = DATA / "scenarios_surprise2028_uk_central.json"
SUR_FS = DATA / "scenarios_surprise2028_uk_central_fixed_spending.json"
SUR_K = DATA / "scenarios_surprise2028_korinek.json"
LEGACY = DATA / "scenarios.json"


def _load(p):
    return copy.deepcopy(json.loads(p.read_text()))


def _run(tmp_path, res):
    f = tmp_path / "r.json"
    f.write_text(json.dumps(res))
    return cli.main(["check", "--results", str(f)])


# --- context --------------------------------------------------------------------

def test_context_reads_the_surprise_window_and_targets():
    c = checks._context(_load(SUR))
    assert c["surprise"] and c["years"] == [2027, 2028, 2029, 2030, 2031]
    assert c["headline"] == 2031 and c["start"] == 2028
    assert c["ls_target"] == pytest.approx(65.0 - 1.6)
    assert c["z_targets"] == {"share_shift_tfp": pytest.approx(0.4), "share_shift": 0.0}


def test_context_of_a_legacy_file_is_unchanged():
    c = checks._context(load_results(LEGACY))
    assert not c["surprise"] and c["years"] == checks.YEARS and c["ls_target"] == 61.1


# --- check ------------------------------------------------------------------------

ALL_SURPRISE = sorted(DATA.glob("scenarios_surprise2028_*.json"))
# Known failures, on results not format (docs/surprise_2028.md): the 2028 investment
# surge at zeta_K 0.5 is financed from abroad, so Y - C - I - G breaks the +-6%
# bound (and I/Y the 35% band for korinek).  Pinned so a change either way shows.
KNOWN_CHECK_FAILURES = {"scenarios_surprise2028_korinek_zk0.5.json",
                        "scenarios_surprise2028_uk_high_zk0.5.json"}


def test_all_twenty_surprise_files_are_tested():
    assert len(ALL_SURPRISE) == 20
    assert KNOWN_CHECK_FAILURES <= {p.name for p in ALL_SURPRISE}


@pytest.mark.parametrize("path", ALL_SURPRISE, ids=lambda p: p.stem)
def test_committed_surprise_files_check(path):
    want = 1 if path.name in KNOWN_CHECK_FAILURES else 0
    assert cli.main(["check", "--results", str(path)]) == want


@pytest.mark.parametrize("path", ALL_SURPRISE, ids=lambda p: p.stem)
def test_committed_surprise_files_report(path, capsys):
    assert cli.main(["report", "--results", str(path)]) in (0, None)
    assert "AI vs CONTINUATION" in capsys.readouterr().out


def test_known_zk05_failures_are_the_external_balance(capsys):
    cli.main(["check", "--results", str(DATA / "scenarios_surprise2028_uk_high_zk0.5.json")])
    lines = capsys.readouterr().out.splitlines()
    fails = [i for i, x in enumerate(lines) if "[FAIL]" in x]
    assert len(fails) == 1 and "share_shift_tfp_ramp: 2027 +0.19, 2028 -9.19" in lines[fails[0]]
    head = next(x for x in reversed(lines[:fails[0]]) if not x.startswith("  ["))
    assert head.startswith("National accounts: X = Y - C - I - G")


def test_legacy_check_header_year_is_unchanged(capsys):
    cli.main(["check", "--results", str(LEGACY)])
    assert "#3  No fiscal-rule break in 2030 (baseline)" in capsys.readouterr().out


def test_window_and_years_are_not_arms(capsys):
    cli.main(["check", "--results", str(SUR)])
    out = capsys.readouterr().out
    assert "window is malformed" not in out and "years is malformed" not in out
    assert "Labour share 2031" in out and "2027 " in out


def test_wrong_labour_share_fails(tmp_path):
    res = _load(SUR)
    res["assumptions"]["scenario_targets"]["labour_share_fall_pp"] = 3.9
    assert _run(tmp_path, res) == 1


def test_wrong_tfp_target_fails(tmp_path):
    res = _load(SUR)
    res["assumptions"]["scenario_targets"]["tfp_gain"] = 0.031
    assert _run(tmp_path, res) == 1


def test_r4_gap_in_the_headline_year_is_checked(tmp_path):
    res = _load(SUR)
    y = res["share_shift_ramp"]["Y"]
    y[4] *= 1.001          # 2031 GDP gap +0.1pp, over the 0.01pp R4 tolerance
    assert _run(tmp_path, res) == 1


def test_fs_g_must_equal_the_reference_before_the_shock(tmp_path):
    res = _load(SUR_FS)
    res["share_shift_tfp_ramp"]["G"][0] *= 1 + 1e-9       # 2027
    assert _run(tmp_path, res) == 1


def test_fs_g_beyond_the_continuation_distance_fails(tmp_path):
    res = _load(SUR_FS)
    res["share_shift_tfp_ramp"]["G"][3] *= 1 + 1e-3       # 2030
    assert _run(tmp_path, res) == 1


def test_fiscal_variant_must_agree_with_the_arms(tmp_path):
    res = _load(SUR_FS)
    res["assumptions"]["fiscal_variant"] = ""
    assert _run(tmp_path, res) == 1


def test_surprise_rc_uses_the_run_from_the_shock_year(tmp_path):
    res = _load(SUR)
    res["share_shift_tfp_ramp"]["diagnostics"]["rc_rel_Y_signed"][3] = 0.01   # 2031: 1% of GDP
    assert _run(tmp_path, res) == 1
    res = _load(SUR)
    res["share_shift_tfp_ramp"]["diagnostics"]["rc_rel_Y_signed"][10] = 0.01  # 2038: outside
    assert _run(tmp_path, res) == 0


def test_malformed_surprise_years_fail_without_a_traceback(tmp_path):
    res = _load(SUR)
    res["years"] = [2027, 2028]
    assert _run(tmp_path, res) == 1


# --- report ----------------------------------------------------------------------

def test_report_labels_the_surprise_years():
    res = _load(SUR)
    g = report.gap_table("share_shift_tfp_ramp", res)
    assert list(g.columns) == [2027, 2028, 2029, 2030, 2031]
    assert g.loc["GDP", 2027] == 0.0
    assert list(report.growth_table("share_shift_tfp_ramp", res).columns) == [2028, 2029, 2030, 2031]


def test_report_summary_is_the_headline_year():
    res = _load(SUR)
    s = report.summary("share_shift_tfp_ramp", res)
    b, a = res["baseline"], res["share_shift_tfp_ramp"]
    assert s["headline_year"] == 2031
    assert s["gdp_gap_headline_pct"] == pytest.approx((a["Y"][4] / b["Y"][4] - 1) * 100)
    assert "gdp_gap_2030_pct" not in s


def test_surprise_population_growth_is_spliced_on_the_calendar():
    res = _load(SUR)
    g_n, _ = report.trend_params(res, arm_name="share_shift_tfp_ramp")
    b, a = res["baseline"]["g_n_used"], res["share_shift_tfp_ramp"]["g_n_used"]
    assert np.allclose(g_n[:4], b[1:5])        # 2027-2030 from the baseline
    assert g_n[4] == a[3]                      # 2031 from the arm (period 0 = 2028)
    assert np.allclose(b[2:5], a[:3])          # they agree where they overlap


def test_report_prints_the_scenario_targets_not_korinek(capsys):
    cli.main(["report", "--results", str(SUR)])
    out = capsys.readouterr().out
    assert "2027     2028     2029     2030     2031" in out
    assert "AGAINST THE SCENARIO'S TARGETS" in out and "KORINEK" not in out


def test_report_prints_korinek_for_the_korinek_scenario(capsys):
    cli.main(["report", "--results", str(SUR_K)])
    assert "AGAINST KORINEK ET AL. SUBSTANTIAL (Table 3, 2030; OG-UK 2031)" in capsys.readouterr().out


def test_legacy_report_is_unchanged():
    s = report.summary("share_shift_tfp_ramp")
    assert s["headline_year"] == 2030 and s["gdp_gap_2030_pct"] == s["gdp_gap_headline_pct"]


def test_legacy_report_korinek_title_is_unchanged(capsys):
    cli.main(["report", "--results", str(LEGACY)])
    assert "AGAINST KORINEK ET AL. SUBSTANTIAL (Table 3, 2030)\n" in capsys.readouterr().out


def test_trend_params_without_any_arm_is_a_clear_error():
    res = _load(SUR)
    res["arms_requested"] = []
    with pytest.raises(ValueError, match="population growth"):
        report.trend_params(res, arm_name=None)


# --- the 2027 set (arrival 2027, headline 2030): same checks, same known failures ---

ALL_2027 = sorted(DATA.glob("scenarios_surprise2027_*.json"))
KNOWN_2027 = {"scenarios_surprise2027_korinek_zk0.5.json",
              "scenarios_surprise2027_uk_high_zk0.5.json"}


@pytest.mark.skipif(not ALL_2027, reason="2027 set not assembled")
def test_all_twenty_2027_files_are_tested():
    assert len(ALL_2027) == 20 and KNOWN_2027 <= {p.name for p in ALL_2027}


@pytest.mark.parametrize("path", ALL_2027, ids=lambda p: p.stem)
def test_2027_files_check_and_report(path, capsys):
    assert cli.main(["check", "--results", str(path)]) == (1 if path.name in KNOWN_2027 else 0)
    capsys.readouterr()
    assert cli.main(["report", "--results", str(path)]) in (0, None)
    out = capsys.readouterr().out
    assert "AI vs CONTINUATION" in out and "2030" in out


@pytest.mark.skipif(not ALL_2027, reason="2027 set not assembled")
def test_2027_context_is_the_2030_window():
    c = checks._context(_load(DATA / "scenarios_surprise2027_uk_central.json"))
    assert c["years"] == [2026, 2027, 2028, 2029, 2030] and c["headline"] == 2030
    assert c["start"] == 2027
