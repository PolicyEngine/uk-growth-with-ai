"""The active data set for the Python checks, picked as the dashboard picks
it (src/lib/dataFlag.js): unset or NEXT_PUBLIC_DATA=2027 (the default since
the swap) reads surprise2027.json; NEXT_PUBLIC_DATA=2028 reads
surprise2028.json. Every check reads its paths here (results, cohorts,
method facts, NICs, solve outputs), so check_numbers and scripts/checks/*
pass on either file.

    UGAI_OUT=/path/to/output   overrides the solve outputs the raw-solve
    recompute reads (both sets' outputs are in this tree since the swap).
    UGAI_ROOT=/path/to/tree    the tree whose builder the repricing
    cross-check imports (this one by default: its builder takes --year).
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
DATA = os.path.normpath(os.path.join(HERE, '..', 'src', 'data'))

FLAG = os.environ.get('NEXT_PUBLIC_DATA') or '2027'
if FLAG not in ('2028', '2027'):
    raise SystemExit(f'NEXT_PUBLIC_DATA={FLAG}: expected 2028 or 2027')
SURPRISE_FILE = os.path.join(DATA, f'surprise{FLAG}.json')
# each set's own cohort file, method facts and NICs measure
# (src/lib/dataKeys.js SETS)
COHORTS_FILE = os.path.join(DATA, f'cohorts{FLAG}.json')
METHOD_FACTS_FILE = os.path.join(DATA, 'methodFacts.json' if FLAG == '2028' else f'methodFacts{FLAG}.json')
NICS_FILE = os.path.join(HERE, '..', 'src', 'tabs', 'explore', f'nics{FLAG}.json')
# the solve outputs each set was built from
_OUT = {'2028': os.path.join('analysis', 'surprise', 'output'), '2027': os.path.join('analysis', 'surprise2027', 'output')}
OUT = os.environ.get('UGAI_OUT') or os.path.join(ROOT, _OUT[FLAG])
HAVE_OUT = os.path.isdir(OUT)
# the repository whose analysis/surprise/build_dashboard_data.py built the
# file (UGAI_ROOT: the 2027 builder takes --year and lives on
# rerun/surprise-2027); the builder reads the year from UGAI_SURPRISE_YEAR
BUILDER_ROOT = os.environ.get('UGAI_ROOT') or ROOT
os.environ.setdefault('UGAI_SURPRISE_YEAR', FLAG)


def load_surprise(path=None):
    return json.load(open(path or SURPRISE_FILE))


def load_cohorts():
    return json.load(open(COHORTS_FILE))


def load_method_facts():
    return json.load(open(METHOD_FACTS_FILE))


def load_nics():
    return json.load(open(NICS_FILE))
