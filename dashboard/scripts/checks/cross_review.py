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
# And from the economics review of round 1 (explanations only):
#   - gilt yields rise one for one with the return on capital (Public
#     finances): in every solve, r_gov moves with r within 0.5bp a year;
#   - the 2028 investment flag the Explore cards print (explore/caveats.js
#     I_FLAG_PCT) equals analysis/surprise/expectations.json i_jump_flag_pct.

HERE = os.path.dirname(os.path.abspath(__file__))
import sys as _sys
_sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import active_data  # noqa: E402
ROOT = os.path.join(HERE, '..', '..', '..')
DATA = os.path.join(HERE, '..', '..', 'src', 'data')
OUT = active_data.OUT
S = active_data.load_surprise()
MF = json.load(open(os.path.join(DATA, 'methodFacts.json')))
CO = active_data.load_cohorts()


def builder():
    root = active_data.BUILDER_ROOT
    sys.path.insert(0, os.path.abspath(root))
    spec = importlib.util.spec_from_file_location(
        'bdd', os.path.join(root, 'analysis', 'surprise', 'build_dashboard_data.py'))
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
    if not active_data.HAVE_OUT:
        print('cross review: NOT RUN, no solve outputs at', OUT, '(set UGAI_OUT)')
        return 0
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
        # the 2028 solve times print only on the 2028 set (R3-04); another set
        # says they are not compiled yet until its methodFacts file lands
        if active_data.FLAG != '2028':
            if 'not compiled yet' not in code:
                bad += 1; print(sid, 'Data and code: no "not compiled yet" for this set\'s solve times')
        elif f"{sm['records']} committed solve records" not in code:
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
    # gilt rate one for one with r
    worst = 0.0
    for sid, arms in S['results'].items():
        for a, by in arms.items():
            for cl, r in by.items():
                if r['status'] != 'done':
                    continue
                s_ = json.load(open(f"{OUT}/{cl}/{r['label']}.json"))['series']
                f_ = json.load(open(f"{OUT}/{cl}/continuation.json"))['series']
                for k in range(len(S['years'])):
                    worst = max(worst, abs((s_['r_gov'][k] - f_['r_gov'][k]) - (s_['r'][k] - f_['r'][k])) * 1e4)
    if worst > 0.5:
        bad += 1; print(f'gilt rate: moves {worst:.2f}bp apart from r in a solve')
    else:
        print(f'gilt rate: one for one with r in every solve (largest gap {worst:.2f}bp)')
    # investment flag
    exp_ = json.load(open(os.path.join(ROOT, 'analysis', 'surprise', 'expectations.json')))
    src = open(os.path.join(HERE, '..', '..', 'src', 'tabs', 'explore', 'caveats.js')).read()
    import re
    m = re.search(r"I_FLAG_PCT = ([\d.]+)", src)
    if not m or float(m.group(1)) != float(exp_['i_jump_flag_pct']):
        bad += 1; print('investment flag: caveats.js does not match expectations.json')
    print('cross review:', 'ok' if not bad else f'{bad} failures',
          '(dnfull block', 'in the data)' if (CO.get('dnfull') or {}).get('ready') else 'not in the data yet: rows hidden)')
    return bad
