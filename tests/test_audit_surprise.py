"""analysis/surprise/audit_surprise.py: the results audit for any shock year.

1. With ``--year 2028`` (and with no flag) every mode prints exactly what
   audit_2028.py (branch audit/sanity-2028-final) prints on the same records.
2. The date logic the audit re-derives from the shock year equals
   uk_growth_with_ai.surprise.window and calendar_weights, and the 2027 dates
   are the ones the 2027 set is built on.
3. A synthetic 2027 set (the committed 2028 records moved one year earlier)
   gives the 2028 verdict tables with the years relabelled, so every index in
   the verdict path follows the shock year.

No OG solve is run; the audit reads committed JSON only.
"""

import importlib.util
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
import pytest

from uk_growth_with_ai import surprise as sp

REPO = Path(__file__).resolve().parents[1]
SCRIPT = REPO / "analysis/surprise/audit_surprise.py"
OUT_2028 = REPO / "analysis/surprise/output"
OLD_REF = "audit/sanity-2028-final:analysis/surprise/audit_2028.py"
MODES = {"default": [], "verdict": ["--verdict"], "mono": ["--mono"], "dnfull": ["--dnfull"]}

spec = importlib.util.spec_from_file_location("audit_surprise", SCRIPT)
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)

needs_2028 = pytest.mark.skipif(not (OUT_2028 / "zk0.1" / "continuation.json").exists(),
                                reason="the 2028 surprise records are not in this checkout")


def _run(script, *args):
    return subprocess.run([sys.executable, str(script), *args], capture_output=True, cwd=REPO)


def _tree(tmp, script_name, script_text):
    """analysis/surprise under ``tmp`` with the script, the targets and the 2026-start records linked in."""
    d = tmp / "analysis" / "surprise"
    d.mkdir(parents=True)
    (d / script_name).write_text(script_text)
    (d / "uk_targets.json").symlink_to(REPO / "analysis/surprise/uk_targets.json")
    (tmp / "analysis" / "rerun").symlink_to(REPO / "analysis/rerun", target_is_directory=True)
    return d


@pytest.fixture
def at_year():
    """configure(year) for the test, with the module put back on its default year afterwards."""
    yield audit.configure
    audit.configure(audit.DEFAULT_YEAR)


# ------------------------------------------------------------------ 1. 2028 byte identity
@pytest.fixture(scope="module")
def audit_2028(tmp_path_factory):
    """audit_2028.py from its branch, in a temporary tree that reads this checkout's records."""
    got = subprocess.run(["git", "-C", str(REPO), "show", OLD_REF], capture_output=True)
    if got.returncode != 0:
        pytest.skip(f"git cannot show {OLD_REF}")
    d = _tree(tmp_path_factory.mktemp("audit2028"), "audit_2028.py", got.stdout.decode())
    (d / "output").symlink_to(OUT_2028, target_is_directory=True)
    return d / "audit_2028.py"


@needs_2028
@pytest.mark.parametrize("mode", list(MODES))
def test_2028_output_is_byte_identical_to_audit_2028(audit_2028, mode):
    old = _run(audit_2028, *MODES[mode])
    assert old.returncode == 0 and old.stdout, old.stderr.decode()[-2000:]
    for flags in (["--year", "2028"], ["--year=2028"], []):
        new = _run(SCRIPT, *flags, *MODES[mode])
        assert new.returncode == old.returncode
        assert new.stdout == old.stdout, f"{mode} {flags}: stdout differs from audit_2028.py"
        assert new.stderr == old.stderr


# ------------------------------------------------------------------ 2. date logic
@pytest.mark.parametrize("year", [2027, 2028])
def test_dates_equal_the_surprise_module(year):
    dt, w = audit.dates(year), sp.window(year)
    for k in ("surprise_year", "ramp_zero_year", "ramp_full_year", "z_anchor_year", "r4_year",
              "headline_year", "report_years", "debt_rule_year"):
        assert dt[k] == w[k], k
    assert dt["weights"] == sp.calendar_weights(year)
    assert dt["years"] == list(sp.calendar_weights(year))
    assert audit.RAMP_YEARS == sp.RAMP_YEARS


def test_2027_dates():
    dt = audit.dates(2027)
    assert dt["weights"] == {2026: 0.0, 2027: 0.25, 2028: 0.5, 2029: 0.75, 2030: 1.0, 2031: 1.0,
                             2032: 1.0, 2033: 1.0, 2034: 1.0, 2035: 1.0, 2036: 1.0}
    assert (dt["surprise_year"], dt["ramp_zero_year"], dt["z_anchor_year"], dt["headline_year"]) == (2027, 2026, 2026, 2030)
    assert dt["ix"] == {"shock": 1, "zero": 0, "headline": 4}
    assert dt["pre_shock_years"] == [2026]
    assert dt["report_years"] == [2026, 2027, 2028, 2029, 2030]
    assert dt["debt_rule_year"] == 2036 and dt["years"] == list(range(2026, 2037))
    assert dt["far_year"] == 2035            # five years after the headline, as old 2035 is after old 2030


def test_2028_dates_are_the_ones_audit_2028_hard_coded():
    dt = audit.dates(2028)
    old = {2026: 0.0, 2027: 0.0, 2028: 0.25, 2029: 0.5, 2030: 0.75}
    old.update({y: 1.0 for y in range(2031, 2037)})
    assert dt["weights"] == old
    assert dt["ix"] == {"shock": 2, "zero": 1, "headline": 5}
    assert dt["pre_shock_years"] == [2026, 2027] and dt["headline_year"] == 2031 and dt["far_year"] == 2036


def test_configure_2027_sets_every_year_dependent_global(at_year):
    at_year(2027)
    assert (audit.SY, audit.ZY, audit.HY, audit.FAR, audit.PRE) == (2027, 2026, 2030, 2035, "2026")
    assert Path(audit.OUT) == REPO / "analysis/surprise2027/output"
    assert list(audit.W) == [0.0, 0.25, 0.5, 0.75] + [1.0] * 7
    assert audit.ARM_NAME["r4"] == "stress test (2030 GDP held)"
    rows = {v: yr for v, _, yr in audit.ROWS}
    assert {rows[v] for v in ("I28", "L28", "C28")} == {2027}
    assert {rows[v] for v in ("Y36", "debt36")} == {2036}
    assert {yr for v, yr in rows.items() if v not in ("I28", "L28", "C28", "Y36", "debt36")} == {2030}
    assert audit.LABEL["I28"] == "2027 investment %" and audit.LABEL["Y36"] == "2036 GDP %"
    assert audit.EXPECT["L"]["tfp"][0] == "<= 0 by 2030 (wage falls)"
    assert audit.EXPECT["Y36"]["r4"][0] == "near 0, not held after 2030"
    # the ramp on a record: gamma and Z are at the terminal value from the headline year
    rec = {"gamma_terminal": 0.39, "Z_terminal": 1.02}
    assert np.allclose(audit.gam(rec)[:5], [0.35, 0.36, 0.37, 0.38, 0.39]) and np.allclose(audit.gam(rec)[4:], 0.39)
    assert np.allclose(audit.zpath(rec)[:5], [1.0, 1.005, 1.01, 1.015, 1.02]) and np.allclose(audit.zpath(rec)[4:], 1.02)


def test_configure_default_is_2028(at_year):
    at_year(2027)
    at_year()
    assert (audit.SY, audit.ZY, audit.HY, audit.FAR, audit.PRE) == (2028, 2027, 2031, 2036, "2026-27")
    assert Path(audit.OUT) == REPO / "analysis/surprise/output"
    assert audit.ARM_NAME["r4"] == "stress test (2031 GDP held)"


def test_year_flag_and_range():
    assert audit.parse_year([]) == 2028 and audit.parse_year(["--verdict"]) == 2028
    assert audit.parse_year(["--year", "2027", "--mono"]) == 2027 and audit.parse_year(["--mono", "--year=2027"]) == 2027
    for bad in (2026, 2033):     # no pre-shock year; no year after the headline inside 2026-36
        with pytest.raises(ValueError):
            audit.dates(bad)


# ------------------------------------------------------------------ 3. synthetic 2027 set
def _shift_one_year_earlier(src, dst):
    """The 2028 records as a 2027 set: every series moved one year earlier (2036 repeats 2035's successor),
    and the sanity reports' year-named keys renamed."""
    for f in src.glob("*/*.json"):
        j = json.loads(f.read_text())
        if f.name.endswith(".sanity.json"):
            for a, b in (("gaps_2031", "gaps_2030"), ("gaps_2028", "gaps_2027")):
                if a in j:
                    j[b] = j.pop(a)
            dg = j.get("diagnostics", {})
            if "tax_gdp_2031" in dg:
                dg["tax_gdp_2030"] = dg.pop("tax_gdp_2031")
        elif isinstance(j.get("series"), dict):
            j["series"] = {k: v[1:] + [v[-1]] for k, v in j["series"].items()}
        (dst / f.parent.name).mkdir(parents=True, exist_ok=True)
        (dst / f.parent.name / f.name).write_text(json.dumps(j))


@pytest.fixture(scope="module")
def synthetic_2027(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("audit2027")
    d = _tree(tmp, "audit_surprise.py", SCRIPT.read_text())
    _shift_one_year_earlier(OUT_2028, tmp / "analysis" / "surprise2027" / "output")
    return d / "audit_surprise.py"


def _relabel(text):
    """2028 -> 2027 and 2031 -> 2030 where they stand alone as years (not inside a number)."""
    text = re.sub(r"(?<![\d.])2031(?![\d.])", "2030", text)
    return re.sub(r"(?<![\d.])2028(?![\d.])", "2027", text)


@needs_2028
def test_synthetic_2027_verdict_is_the_2028_verdict_relabelled(synthetic_2027):
    new = _run(synthetic_2027, "--year", "2027", "--verdict")
    assert new.returncode == 0, new.stderr.decode()[-2000:]
    ref = _run(SCRIPT, "--verdict").stdout.decode()
    assert "2031" in ref and "| 2028 labour % |" in ref
    assert new.stdout.decode() == _relabel(ref)


@needs_2028
def test_synthetic_2027_every_mode_runs_with_2027_labels(synthetic_2027):
    out = {}
    for mode, flags in MODES.items():
        r = _run(synthetic_2027, "--year", "2027", *flags)
        assert r.returncode == 0 and r.stdout, f"{mode}: {r.stderr.decode()[-2000:]}"
        out[mode] = r.stdout.decode()
    full = out["default"]
    for label in ("RC/GDP max 2027-36|RC/GDP 2026|I_total growth vs cont 2027-35|2027 capital with no 2026 investment",
                  "zeros 2026 vs baseline|2027 state vs cont",
                  "dn: max |D/Y / reference - 1|, 2028-36|fs: max rel dev of G from reference, 2027-35",
                  "## Z_terminal re-derived from the continuation's 2026 K and L",
                  "fixed-input gain at 2026 inputs %|at 2030 continuation inputs %|at 2036 %",
                  "## 2. GDP gap split, log points x100 (2030)",
                  "## 6. Korinek 2030 (surprise) against the 2026-start 2030",
                  "variable|old 2030|new 2030|new - old|new/old|old 2026 (anticipation)|new 2027|old 2035|new 2035",
                  "| new 2027-2030:",
                  "|GDP gap 2030 (yr 4)|2031 (yr 5)|technology at ref inputs 2030|",
                  "capital-supply elasticity 2030|2036",
                  "over 2027 and 2030 gaps and the 2030 tax/GDP change",
                  "Tax/GDP gap by year, pp (2027-2036)"):
        assert label in full, label
    assert "News year (2027) against the 2030 wage gap" in out["mono"]
    assert "reference: 2026 equal to baseline_ext (rel)" in out["dnfull"]
    assert "reference: D/Y against continuation, 2028-36" in out["dnfull"]
    # the paths start in the shock year: ten years of values, 2027-2036
    line = next(ln for ln in full.splitlines() if ln.startswith("  Y       "))
    assert len(line.split()) == 11


def _section(text, start, stop):
    lines = text.splitlines()
    i = next(k for k, ln in enumerate(lines) if ln.startswith(start))
    j = next(k for k in range(i + 1, len(lines)) if lines[k].startswith(stop))
    return lines[i + 1:j]


@needs_2028
def test_synthetic_2027_pointwise_sections_equal_2028(synthetic_2027):
    """Everything read at the zero, shock and headline years alone is unchanged by moving the records a year."""
    new = _run(synthetic_2027, "--year", "2027").stdout.decode()
    ref = _run(SCRIPT).stdout.decode()
    # whole sections: the Z anchor (zero year), the headline-year splits, the IMF comparison and its bound
    for start, stop in (("closure|run|Z recorded", "## 2."), ("## 2.", "## 3."), ("## 3.", "## 4."),
                        ("## 4.", "## 5."), ("## Linear rules", "## R4 drift"), ("## R4 drift", "## 7."),
                        ("## 7.", "## 9.")):
        a, b = _section(ref, start, stop), _section(new, start, stop)
        assert len(a) > 3 and [_relabel(x).replace("2032 (yr 5)", "2031 (yr 5)") for x in a] == b, start
    # section 1: the columns that read the zero year and the shock year
    a, b = _section(ref, "## 1.", "worst:"), _section(new, "## 1.", "worst:")
    cols = [11, 12, 14, 16, 17]       # RC/GDP from the shock year, RC/GDP zero year, capital jump, zeros, state
    assert [b[0].split("|")[k] for k in cols] == ["RC/GDP max 2027-36", "RC/GDP 2026",
                                                  "2027 capital with no 2026 investment, % of GDP",
                                                  "zeros 2026 vs baseline", "2027 state vs cont"]
    rows = [(x.split("|"), y.split("|")) for x, y in zip(a[2:], b[2:]) if x.count("|") == 18]
    assert len(rows) > 60
    for x, y in rows:
        assert x[:2] == y[:2] and [x[k] for k in cols] == [y[k] for k in cols], x[:2]


def test_a_year_with_no_finished_continuation_stops_with_a_message(tmp_path):
    script = _tree(tmp_path, "audit_surprise.py", SCRIPT.read_text()) / "audit_surprise.py"
    r = _run(script, "--year", "2027")
    assert r.returncode != 0 and not r.stdout
    assert b"no continuation.json" in r.stderr and b"surprise2027" in r.stderr
