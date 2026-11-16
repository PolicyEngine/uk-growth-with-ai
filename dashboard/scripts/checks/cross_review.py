import glob, importlib.util, json, os, statistics, sys

# Figures from the cross-output consistency review (16 Nov 2026), each read
# from data and checked here against the files it is built from:
#   - debt/GDP at the OBR's repricing speed (surprise2028.json
#     debt_gdp_pp_obr_repricing_late, common rule): every value equals the
#     recursion run again on the raw solve and its continuation, and with the
#     whole rate gap passed through at once the recursion gives the solve's own
#     gap. The ratio range Public finances prints is taken from these values.
#   - OG-UK's effective tax rates on the path (reference_effective_tax_rates)
#     equal the sanity file the paper's EffWedgePp reads.
#   - the solve timings on Data and code (methodFacts.json solve_minutes)
#     equal the per-solve records, and the page prints that count.
#   - Who gains: the rows solved to the horizon print only when
#     cohorts2028.json has a ready `dnfull` block, and then print its ranges.

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..', '..')
DATA = os.path.join(HERE, '..', '..', 'src', 'data')
OUT = os.path.join(ROOT, 'analysis', 'surprise', 'output')
S = json.load(open(os.path.join(DATA, 'surprise2028.json')))
MF = json.load(open(os.path.join(DATA, 'methodFacts.json')))
CO = json.load(open(os.path.join(DATA, 'cohorts2028.json')))


def builder():
    sys.path.insert(0, os.path.abspath(ROOT))
    spec = importlib.util.spec_from_file_location(
        'bdd', os.path.join(ROOT, 'analysis', 'surprise', 'build_dashboard_data.py'))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def share(x):
    # CohortsTab.jsx share()
    return 'none' if x <= 0 else 'under 1%' if x < 1 else f"{round(x)}%"


def share_range(lo, hi):
    return share(lo) if round(lo) == round(hi) else f"{round(lo)}–{round(hi)}%"


def check(dump):
    bad = 0
    # repricing
    b = builder()
    late = S['years'].index(S['late_year'])
    n = 0
    for sid, arms in S['results'].items():
        for a, by in arms.items():
            for cl, r in by.items():
                if r['status'] != 'done':
                    continue
                s_ = json.load(open(f"{OUT}/{cl}/{r['label']}.json"))['series']
                f_ = json.load(open(f"{OUT}/{cl}/continuation.json"))['series']
                x = r.get('debt_gdp_pp_obr_repricing_late')
                if x is None or abs(b.repriced_debt_pp(s_, f_) - x) > 1e-9:
                    bad += 1; print('repricing: mismatch', sid, a, cl)
                if abs(b.repriced_debt_pp(s_, f_, full=True) - r['gaps']['debt_gdp_pp'][late]) > 1e-9:
                    bad += 1; print('repricing: full pass-through is not the solve', sid, a, cl)
                n += 1
    print(f'repricing: {n} cells match their raw solves')
    # effective tax rates
    for cl, c in S['closures'].items():
        e = json.load(open(f"{OUT}/{cl}/uk_central_share_shift_tfp_ramp.sanity.json"))[
            'diagnostics'][f"effective_rates_{S['headline_year']}"]['reference']
        for k, v in c['reference_effective_tax_rates'].items():
            if abs(e[k] - v) > 1e-12:
                bad += 1; print('effective tax rate mismatch', cl, k)
    # solve timings
    xs = []
    for f in glob.glob(f'{OUT}/zk*/*.json'):
        if f.endswith('.sanity.json'):
            continue
        d = json.load(open(f))
        if isinstance(d, dict) and 'elapsed_min' in d:
            xs.append(d['elapsed_min'])
    sm = MF['solve_minutes']
    if (sm['records'], sm['min'], sm['max']) != (len(xs), min(xs), max(xs)) or abs(sm['median'] - statistics.median(xs)) > 1e-12:
        bad += 1; print('solve minutes: methodFacts.json is stale against', len(xs), 'records')
    for sid in dump:
        code = dump[sid].get('code', '')
        if f"{sm['records']} committed solve records" not in code:
            bad += 1; print(sid, 'Data and code: solve-record count not printed')
        who = dump[sid].get('who', '')
        full = CO.get('dnfull') or {}
        if full.get('ready'):
            for k in ('joint_losing_pct', 'no_bequest_losing_pct'):
                if share_range(*full['range'][k]) not in who:
                    bad += 1; print(sid, 'Who gains: dnfull', k, 'not printed')
            # defined once, in the measures legend above the tiles (the rows
            # use its short code)
            if who.count('solved to the horizon') != 1:
                bad += 1; print(sid, 'Who gains: dnfull rows not printed once each')
        elif 'solved to the horizon' in who:
            bad += 1; print(sid, 'Who gains: dnfull rows print without the data')
    print('cross review:', 'ok' if not bad else f'{bad} failures',
          '(dnfull block', 'in the data)' if (CO.get('dnfull') or {}).get('ready') else 'not in the data yet: rows hidden)')
    return bad
