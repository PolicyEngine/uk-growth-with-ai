"""The active data set for the Python checks, picked as the dashboard picks
it (src/lib/dataFlag.js): NEXT_PUBLIC_DATA=2027 reads surprise2027.json,
unset or 2028 reads surprise2028.json. Every check reads its paths here,
so check_numbers and scripts/checks/* pass on either file.

    UGAI_OUT=/path/to/analysis/surprise2027/output   overrides the solve
    outputs the raw-solve recompute reads (the 2027 outputs live on
    rerun/surprise-2027, not in this tree).
    UGAI_ROOT=/path/to/ugai-surprise2027   the tree whose builder the
    repricing cross-check imports.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
DATA = os.path.normpath(os.path.join(HERE, '..', 'src', 'data'))

FLAG = os.environ.get('NEXT_PUBLIC_DATA') or '2028'
if FLAG not in ('2028', '2027'):
    raise SystemExit(f'NEXT_PUBLIC_DATA={FLAG}: expected 2028 or 2027')
SURPRISE_FILE = os.path.join(DATA, f'surprise{FLAG}.json')
# one cohort file for both sets until cohorts2027.json lands
# (src/lib/dataKeys.js COHORT_YEAR)
COHORTS_FILE = os.path.join(DATA, 'cohorts2028.json')
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
