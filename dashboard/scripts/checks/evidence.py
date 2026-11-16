"""Method and sources > Evidence (the 'studies' dump): the UK evidence map is
the one home of the published figures, and OG-UK's figures are not printed.

check(dump) returns the number of failures:
- in the evidence-map card (from its title to the Sources heading), each
  quantified row's `value` appears exactly as often as the rows whose value
  contains it (each fact once; a value can be part of a longer one);
- every no-estimate body is listed;
- a row flagged `unverified` (not confirmed in a primary text) is not
  printed: its value appears nowhere in the card;
- the Related PolicyEngine work section (from relatedWork.json) prints its
  provenance line and each of its figures;
- no headline-year GDP or wage gap of any scenario and closure from
  surprise2028.json (formatted as the site prints it) appears anywhere on the
  page: their home is Explore.

Run alone (python3 scripts/checks/evidence.py dump.json) for this check only.
"""
import json, os, sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..', '..', 'src', 'data')
MAP = json.load(open(os.path.join(DATA, 'site-evidence-map.json')))
S = json.load(open(os.path.join(DATA, 'surprise2028.json')))
REL = json.load(open(os.path.join(DATA, 'relatedWork.json')))
TITLE = 'Published estimates of AI’s economic effects'


def signed(x, dp=2):
    if abs(x) < 0.5 * 10 ** -dp:
        return f"{0:.{dp}f}"
    return ("+" if x >= 0 else "−") + f"{abs(x):.{dp}f}"


def our_gaps():
    h = S['years'].index(S['headline_year'])
    out = set()
    for sid, arms in S['results'].items():
        for cl, r in arms.get('tfp', {}).items():
            if r.get('status') == 'done':
                for v in ('Y', 'w'):
                    out.add(signed(r['gaps'][v][h]) + '%')
    return out


def related(text):
    '''Related PolicyEngine work: its section, provenance line and figures.'''
    out = []
    # the section's heading is its last occurrence (the page's contents
    # list names it first); it ends at the evidence map's heading
    head = '\nRelated PolicyEngine work\n'
    if head not in text:
        return ['related work: section missing']
    sec = text[text.rindex(head):]
    end = sec.find('\nUK evidence map\n')
    sec = sec if end < 0 else sec[:end]
    d = date.fromisoformat(REL['read'])
    line = f"Figures read off these pages on {d.day} {d.strftime('%B')} {d.year}"
    if line not in sec:
        out.append(f'related work: provenance line {line!r} missing')
    s, b = (next(i for i in REL['items'] if i['id'] == k) for k in ('income_shift', 'budget_lab'))
    for fig in (s['gini_base'], s['gini_full'], f"−£{s['revenue_min_bn']}B", f"{s['revenue_min_shift_pct']}%", f"${b['rapid_revenue_bn']}B", f"{b['rapid_poverty_pp']}pp"):
        if fig not in sec:
            out.append(f'related work: figure {fig!r} missing')
    return out


def check(dump):
    bad = 0
    for sid, tabs in dump.items():
        text = tabs.get('studies', '')
        if TITLE not in text:
            bad += 1; print(sid, 'evidence: map card not in the studies dump'); continue
        card = text[text.index(TITLE):]
        end = card.find('\nSources\n')
        card = card if end < 0 else card[:end]
        fails = []
        for r in MAP['rows']:
            if r.get('unverified'):
                if r['value'] in card:
                    fails.append(f"{r['id']}: unverified value {r['value']!r} printed")
                continue
            if r['metric'] == 'none':
                if r['institution'] not in card:
                    fails.append(f"{r['id']}: not listed")
                continue
            want = sum(1 for x in MAP['rows'] if not x.get('unverified') and r['value'] in x['value'])
            got = card.count(r['value'])
            if got != want:
                fails.append(f"{r['id']}: {r['value']!r} printed {got}x, expected {want}")
        fails += related(text)
        left = [g for g in our_gaps() if g in text]
        if left:
            fails.append(f'OG-UK gaps printed on the page: {sorted(left)}')
        if fails:
            bad += len(fails)
            for f in fails:
                print(sid, 'evidence:', f)
        else:
            print(sid, 'evidence: ok,', len(MAP['rows']), 'rows, each value once; no OG-UK gap printed')
    return bad


if __name__ == '__main__':
    sys.exit(1 if check(json.load(open(sys.argv[1]))) else 0)
