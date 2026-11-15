'use client';

import Icon from '@/components/ab/Icon.jsx';
import { TipTarget } from '@/components/ab/Tip.jsx';
import { Unpublished } from '@/components/ab/Section.jsx';
import Card, { SectionHeading, IconLine } from '@/components/ui/Card.jsx';
import { useNav, NavLink } from '@/lib/nav.jsx';
import { ruleLabel } from '@/lib/labels.js';
import { CHART_COLOURS } from '@/lib/chartTheme.js';
import { esc } from '@/lib/download.js';
import {
  YEARS, HEADLINE_YEAR, LATE_YEAR, FIRST_YEAR, SURPRISE_YEAR, CENTRAL, BOUND, ARMS, CLOSURE_LABEL, resultAt, ruleSolved, scenarioById, gap, signed, fmt, SCEN_NAME,
} from '@/tabs/ai/surprise.js';
import { closuresFor, closureWords, contextLine, side, ruleGapText } from '@/tabs/ai/lines.js';
import { PathCard } from '@/tabs/ai/ResultsTab.jsx';

// Results > Public finances: debt/GDP to the debt rule's first year,
// tax/GDP, why both are likely understated, and how the result changes with
// the fiscal rule. Every number from surprise2028.json through surprise.js;
// this is the one home of the tax/GDP and debt/GDP figures.

const LONG_YEARS = YEARS.filter((y) => y >= FIRST_YEAR && y <= LATE_YEAR);
const SHORT_YEARS = YEARS.filter((y) => y >= FIRST_YEAR && y <= HEADLINE_YEAR);
// The cells (scenario|closure) whose main arm ends below the path by the
// debt rule's first year once debt is repriced at the speed the OBR assumes
// for UK debt (PR #43, docs/debt_repricing.md at f097ae6, common fiscal
// rule). That note computed UK low and UK high at the central closure only,
// so no other cell is named. The model's own figure is above the path in
// each.
const BELOW_AT_OBR_SPEED = new Set(['uk_high|zk0.1', 'korinek|zk0.1', 'korinek|zk0']);

// The main arm's debt/GDP in words, by sign, for the closure in view. No
// claim about every arm: the lines and their end values show each one.
function debtFinding(sid, closure, rule) {
  const cl = closure === 'closed' ? BOUND : CENTRAL;
  const a = gap(sid, 'tfp', cl, 'debt_gdp_pp', HEADLINE_YEAR, rule);
  const b = gap(sid, 'tfp', cl, 'debt_gdp_pp', LATE_YEAR, rule);
  if (a == null || b == null) return null;
  const lead = `With automation + productivity${closure === 'closed' ? ' and closed capital' : ''}`;
  if (rule === 'dn') {
    const first = gap(sid, 'tfp', cl, 'debt_gdp_pp', SURPRISE_YEAR, rule);
    const opening = first == null || side(first) === 'on' ? '' : ` is ${side(first)} the OBR-central path in ${SURPRISE_YEAR} and then`;
    return `${lead}, debt/GDP${opening} stays on the OBR-central path: debt-neutral transfers adjust each year from ${SURPRISE_YEAR + 1} to hold it there.`;
  }
  const at = (x) => (side(x) === 'on' ? 'on' : side(x));
  const same = at(a) === at(b);
  const obr = rule === 'common' && BELOW_AT_OBR_SPEED.has(`${sid}|${cl}`) && at(b) === 'above';
  return `${lead}, debt/GDP is ${at(a)} the OBR-central path in ${HEADLINE_YEAR} and ${same ? 'still ' : ''}${at(b)} it by ${LATE_YEAR}, as the model reprices debt at the higher interest rate${obr ? ', but below it at the speed the OBR assumes for UK debt' : ''}.`;
}

// Tax/GDP with closed capital in the main arm, in words (results sanity
// audit A6): it can rise, so the model's sign there is not reliable.
function closedTaxWords(sid, rule) {
  const r = resultAt(sid, 'tfp', BOUND, rule);
  if (r.status !== 'done') return null;
  const at = (y) => r.gaps.tax_gdp_pp[YEARS.indexOf(y)];
  if (at(HEADLINE_YEAR) > 0) return `rises by ${HEADLINE_YEAR}`;
  const first = YEARS.find((y) => y > HEADLINE_YEAR && y < LATE_YEAR && at(y) > 0);
  if (first) return `is close to zero in ${HEADLINE_YEAR} and turns positive from ${first}`;
  return 'falls by much less than under the central closure';
}

// The OBR's labour-minus-capital effective-rate gap, pp: FRS July 2026 Box
// 4.1 (46% - 27% = 19pp) and EFO Nov 2025 para 2.64 (40% - 17% = 23pp). Each
// pp of income moved from labour to capital lowers revenue by about this many
// hundredths of a pp of GDP (docs/red_flags_1_3.md).
const OBR_PER_PP = [0.19, 0.23];

function Cause({ icon, title, axis, ours, theirs, effect, up }) {
  const pct = (x) => `${((x / axis.max) * 100).toFixed(2)}%`;
  const edge = (x) => (x / axis.max > 0.8 ? ' at-end' : x / axis.max < 0.2 ? ' at-start' : '');
  return (
    <div className="cause-row">
      <div className="cause-main">
        <div className="taxgap-label">
          <Icon name={icon} size={16} />
          <span>{title}</span>
        </div>
        <div className="cause-axis">
          <span className="cause-track" aria-hidden="true" />
          {theirs.lo != null ? (
            <TipTarget className="cause-range" style={{ left: pct(theirs.lo), width: pct(theirs.hi - theirs.lo) }} label={`${theirs.name}: ${theirs.text}`} tip={<><b>{theirs.name}</b><span className="tip-value">{theirs.text}</span></>}>
              <span className={`cause-mark-label is-below${edge((theirs.lo + theirs.hi) / 2)}`}>{theirs.name} {theirs.text}</span>
            </TipTarget>
          ) : (
            <TipTarget className="cause-mark is-theirs" style={{ left: pct(theirs.value) }} label={`${theirs.name}: ${theirs.text}`} tip={<><b>{theirs.name}</b><span className="tip-value">{theirs.text}</span></>}>
              <span className={`cause-mark-label is-below${edge(theirs.value)}`}>{theirs.name} {theirs.text}</span>
            </TipTarget>
          )}
          <TipTarget className="cause-mark is-ours" style={{ left: pct(ours.value) }} label={`OG-UK: ${ours.text}`} tip={<><b>OG-UK</b><span className="tip-value">{ours.text}</span></>}>
            <span className={`cause-mark-label${edge(ours.value)}`}>OG-UK {ours.text}</span>
          </TipTarget>
          <span className="cause-ticks" aria-hidden="true" data-axis="">
            <span>0</span>
            <span>{axis.label}</span>
          </span>
        </div>
      </div>
      {/* icon + text, no box */}
      <IconLine icon={up ? 'arrowUp' : 'arrowDown'} className={`cause-effect${up ? ' is-main' : ''}`}>
        {effect}
      </IconLine>
    </div>
  );
}

// The two rows of the tax card, as drawn and as downloaded
const CAUSES = [
  { title: 'Labour vs capital tax-rate gap', max: 25, unit: 'pp', ours: 14, oursText: 'about 14pp', theirs: 'OBR', lo: 19, hi: 23, theirsText: '19–23pp', effect: 'Understates the revenue fall (main effect)' },
  { title: 'Employer National Insurance', max: 16, unit: '% of labour cost', ours: 15, oursText: 'flat rate', theirs: 'PolicyEngine-UK', value: 11, theirsText: 'average', effect: 'Partly offsets the first row (smaller)' },
];
function causesSvg() {
  const C = CHART_COLOURS;
  const W = 720;
  const x0 = 10;
  const x1 = W - 10;
  let out = '';
  let y = 0;
  for (const c of CAUSES) {
    const X = (v) => x0 + (v / c.max) * (x1 - x0);
    out += `<text x="0" y="${y + 14}" font-size="13" font-weight="600" fill="${C.ink}">${esc(c.title)}</text>`;
    const ty = y + 44;
    out += `<line x1="${x0}" x2="${x1}" y1="${ty}" y2="${ty}" stroke="${C.axis}"/>`;
    if (c.lo != null) out += `<rect x="${X(c.lo)}" y="${ty - 5}" width="${X(c.hi) - X(c.lo)}" height="10" fill="${C.muted}" opacity="0.5"/>`;
    else out += `<circle cx="${X(c.value)}" cy="${ty}" r="6" fill="${C.surface}" stroke="${C.muted}" stroke-width="2"/>`;
    const tx = c.lo != null ? (X(c.lo) + X(c.hi)) / 2 : X(c.value);
    out += `<text x="${tx}" y="${ty + 22}" font-size="11" text-anchor="middle" fill="${C.axisTitle}">${esc(`${c.theirs} ${c.theirsText}`)}</text>`;
    out += `<circle cx="${X(c.ours)}" cy="${ty}" r="6" fill="${C.gain}"/>`;
    out += `<text x="${X(c.ours)}" y="${ty - 12}" font-size="11" font-weight="600" text-anchor="middle" fill="${C.ink}">${esc(`OG-UK ${c.oursText}`)}</text>`;
    out += `<text x="${x0}" y="${ty + 40}" font-size="11" fill="${C.tick}">0</text><text x="${x1}" y="${ty + 40}" font-size="11" text-anchor="end" fill="${C.tick}">${esc(`${c.max}${c.unit === 'pp' ? 'pp' : ` ${c.unit}`}`)}</text>`;
    out += `<text x="0" y="${ty + 62}" font-size="12" fill="${C.ink}">${esc(c.effect)}</text>`;
    y = ty + 84;
  }
  return { w: W, h: y, markup: out };
}

function TaxGapCard({ sid, closure, rule }) {
  // The model's central-closure figure is the tax/GDP chart's end label
  // unless that chart is showing closed capital: each fact once.
  const onChart = closure !== 'closed';
  const closedTax = closedTaxWords(sid, rule);
  const model = gap(sid, 'tfp', CENTRAL, 'tax_gdp_pp', HEADLINE_YEAR, rule);
  const ls = gap(sid, 'tfp', CENTRAL, 'labour_share_pp', HEADLINE_YEAR, rule);
  const fall = ls == null ? null : -ls;
  const uk = fall == null ? null : OBR_PER_PP.map((k) => -fall * k);
  return (
    <Card
      id="tax-gap"
      icon="alert"
      title="Our tax effect is likely understated"
      finding={
        <>
          OG-UK taxes wages and profits too similarly, so under the central closure revenue falls too little when income shifts to profits.
          {closedTax ? ` With closed capital the model’s tax/GDP ${closedTax}, so its sign there is not reliable.` : ''}
        </>
      }
      aboutTitle="About this estimate"
      about={{
        how:
          fall == null ? (
            'The labour-share fall for this scenario is not solved yet.'
          ) : (
            <>
              The OBR&rsquo;s tax rates lose 0.19 to 0.23 points of revenue per point moved from labour to capital. Multiplying by this
              scenario&rsquo;s {HEADLINE_YEAR} labour-share fall (on{' '}
              <NavLink tab="explore" sub="economy" anchor="economy-prices">
                Economy
              </NavLink>
              ) gives the range above.
              {model != null ? ` The model loses about ${Math.abs(model / fall).toFixed(2)} per point, including every other effect of AI.` : ''}
            </>
          ),
        caveats: 'A rough scaling, not a model run. Automation + productivity, central closure only. It does not show that the model’s sign is right with closed capital.',
        sources: (
          <ul className="plain-list">
            <li>OBR Fiscal risks and sustainability, July 2026, Box 4.1: labour 46%, capital 27%.</li>
            <li>OBR Economic and fiscal outlook, November 2025, ¶2.64: labour 40%, capital 17%.</li>
            <li>
              OG-UK&rsquo;s gap of about 14pp and the direction of each bias: <code>docs/red_flags_1_3.md</code>.
            </li>
            <li>
              Employer NICs, OG-UK&rsquo;s flat rate against PolicyEngine-UK&rsquo;s average: the rates are under{' '}
              <NavLink tab="method" sub="how" anchor="m-tax">
                How labour is taxed on Method
              </NavLink>
              ; data in <code>analysis/nics/nics_2028.json</code>.
            </li>
          </ul>
        ),
      }}
      method="limits"
      download={{
        title: 'Our tax effect is likely understated',
        context: () => contextLine(sid, closure, `tax/GDP in ${HEADLINE_YEAR} with UK tax rates: rough scaling, central closure, automation + productivity`, rule),
        table: () => ({
          columns: ['Item', 'OG-UK', 'Comparison', 'Comparison source', 'Effect on revenue'],
          rows: [
            ...CAUSES.map((c) => [c.title, c.oursText, c.lo != null ? `${c.lo}–${c.hi}${c.unit}` : `${c.value}${c.unit === 'pp' ? 'pp' : '%'}`, c.theirs, c.effect]),
            [`Tax/GDP in ${HEADLINE_YEAR} with UK tax rates (pp of GDP), low`, null, uk ? uk[0] : null, 'OBR effective rates x labour-share fall', ''],
            [`Tax/GDP in ${HEADLINE_YEAR} with UK tax rates (pp of GDP), high`, null, uk ? uk[1] : null, 'OBR effective rates x labour-share fall', ''],
          ],
        }),
        svg: causesSvg,
        legend: () => [
          { label: 'OG-UK', color: 'var(--series-2)', shape: 'dot' },
          { label: 'Comparison', color: CHART_COLOURS.muted, shape: 'ring' },
        ],
      }}
    >
      <div className="bias-pair">
        {onChart ? null : (
          <>
            <div className="bias-fig">
              <span className="bias-label">Tax/GDP in {HEADLINE_YEAR}: model, central closure</span>
              <span className="bias-value">{model == null ? 'pending' : `${signed(model, 2)}pp`}</span>
            </div>
            <Icon name="arrowRight" size={18} className="bias-arrow" />
          </>
        )}
        <div className="bias-fig">
          <span className="bias-label">
            {onChart ? `Tax/GDP in ${HEADLINE_YEAR} with UK tax rates. Rough scaling, not a model run: about` : 'With UK tax rates. Rough scaling, not a model run: about'}
          </span>
          <span className="bias-value">{uk == null ? 'pending' : `${signed(uk[0], 2)} to ${signed(uk[1], 2)}pp`}</span>
          {onChart ? (
            <span className="bias-label">
              The model&rsquo;s figure is the end of the automation + productivity line in the Tax/GDP chart above.
            </span>
          ) : null}
        </div>
      </div>
      <div className="cause-rows">
        {CAUSES.map((c, i) => (
          <Cause
            key={c.title}
            icon={i ? 'receipt' : 'scale'}
            title={c.title}
            axis={{ max: c.max, label: c.unit === 'pp' ? `${c.max}pp` : `${c.max}% of labour cost` }}
            ours={{ value: c.ours, text: c.oursText }}
            theirs={c.lo != null ? { name: c.theirs, lo: c.lo, hi: c.hi, text: c.theirsText } : { name: c.theirs, value: c.value, text: c.theirsText }}
            up={!i}
            effect={c.effect}
          />
        ))}
      </div>
      <IconLine icon="scale" className="net-line">
        <b>Net:</b> the model probably understates the fall in revenue.
      </IconLine>
    </Card>
  );
}

// How far the rule in view moves each headline-year gap against the common
// fiscal rule, in percentage points. This card is the one home of these
// differences; the gaps themselves are on the charts, which follow the rule.
const RULE_VARS = [
  { v: 'Y', label: 'GDP' },
  { v: 'GNI', label: 'GNI' },
  { v: 'w', label: 'Wage rate' },
  { v: 'C', label: 'Consumption' },
];
const at = (r, v) => (r.status === 'done' ? r.gaps[v][YEARS.indexOf(HEADLINE_YEAR)] : null);
export function ruleShift(rule, sid, arm, cl, v) {
  const a = at(resultAt(sid, arm, cl, rule), v);
  const b = at(resultAt(sid, arm, cl, 'common'), v);
  return a == null || b == null ? null : a - b;
}

function RuleTable({ rule, sid, closure }) {
  const cls = closuresFor(closure);
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>
          {scenarioById(sid).label}, {ruleLabel(rule).toLowerCase()} against the common fiscal rule, {HEADLINE_YEAR}, percentage points
        </caption>
        <thead>
          <tr>
            <th scope="col">Arm</th>
            {RULE_VARS.map((c) => (
              <th key={c.v} scope="col" className="num">{c.label}</th>
            ))}
          </tr>
        </thead>
        {cls.map((cl) => (
          <tbody key={cl}>
            {cls.length > 1 ? (
              <tr className="table-group">
                <th colSpan={RULE_VARS.length + 1} scope="colgroup">{CLOSURE_LABEL[cl].replace(/^./, (c) => c.toUpperCase())}</th>
              </tr>
            ) : null}
            {ARMS.map((a) => (
              <tr key={a.id}>
                <th scope="row">{a.short || a.label}</th>
                {RULE_VARS.map((c) => {
                  const x = ruleShift(rule, sid, a.id, cl, c.v);
                  return <td key={c.v} className="num">{fmt(x, 2, 'pp')}</td>;
                })}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

function ruleTable(rule, sid, closure) {
  return {
    columns: ['Closure', 'Arm', ...RULE_VARS.map((c) => `${c.label}, change against the common rule (pp)`)],
    rows: closuresFor(closure).flatMap((cl) => ARMS.map((a) => [CLOSURE_LABEL[cl], a.label, ...RULE_VARS.map((c) => ruleShift(rule, sid, a.id, cl, c.v))])),
  };
}

function FiscalRuleCard({ sid }) {
  const { st } = useNav();
  const rule = st.rule;
  const has = rule !== 'common' && ruleSolved(rule, sid);
  return (
    <Card
      id="fiscal-rule"
      icon="sliders"
      title="What the fiscal rule changes"
      finding={
        rule === 'common'
          ? 'Every chart in Explore follows the fiscal rule chosen at the top of the page. Choose another rule to see how far it moves each gap.'
          : `How far switching to ${ruleLabel(rule).toLowerCase()} moves each ${HEADLINE_YEAR} gap, against the common fiscal rule. The gaps themselves are on the charts, which now follow this rule.`
      }
      logo={false}
      about={{
        shows: `The ${HEADLINE_YEAR} gap under the rule chosen less the gap under the common fiscal rule, in percentage points, for the closure chosen at the top of the page. Positive: the rule raises the measure against the common rule.`,
        caveats: `Under debt-neutral transfers, debt/GDP stays on the OBR-central path to ${LATE_YEAR} by construction.`,
      }}
      aboutTitle={rule === 'common' ? 'About this card' : 'About this table'}
      method="rules"
      download={has ? { title: `${HEADLINE_YEAR} gaps: ${ruleLabel(rule).toLowerCase()} against the common rule`, context: () => contextLine(sid, st.closure, 'percentage points', rule), table: () => ruleTable(rule, sid, st.closure) } : undefined}
    >
      {rule === 'common' ? (
        <p className="card-text rule-default">
          Under the common fiscal rule, government consumption and transfers follow GDP until the debt rule starts in {LATE_YEAR}. It is the
          default of every solve.
        </p>
      ) : !has ? (
        <Unpublished>{ruleGapText(rule, sid)}</Unpublished>
      ) : (
        <RuleTable rule={rule} sid={sid} closure={st.closure} />
      )}
    </Card>
  );
}

export default function FinancesSection({ sid }) {
  const { st } = useNav();
  // Not solved under this rule: the rule card alone says so (and keeps its id)
  if (!ruleSolved(st.rule, sid))
    return (
      <div className="cards-stack">
        <FiscalRuleCard sid={sid} />
      </div>
    );
  const cl = closureWords(st.closure);
  const reading = `The zero line is the OBR-central path; the shaded year is ${HEADLINE_YEAR}, the headline year. Each line ends with its last value; hover, tap or use the arrow keys for other years.`;
  return (
    <>
      <SectionHeading id="public-finances" icon="landmark" title="Public finances">
        Debt and tax as shares of GDP, {SCEN_NAME[sid]}, {cl}, {ruleLabel(st.rule).toLowerCase()}.
      </SectionHeading>
      <div className="cards-grid">
        <PathCard
          sid={sid}
          v="debt_gdp_pp"
          years={LONG_YEARS}
          unit="pp"
          title="Debt/GDP"
          name="debt/GDP"
          icon="landmark"
          unitLine={`Percentage points of GDP, difference from the OBR-central path, ${FIRST_YEAR}–${LATE_YEAR}`}
          finding={debtFinding(sid, st.closure, st.rule) ?? undefined}
          markers={[{ year: SURPRISE_YEAR, label: 'AI arrives' }, { year: LATE_YEAR, label: 'Debt rule starts' }]}
          about={{
            shows: `Public debt as a share of GDP against the OBR-central path. ${reading}`,
            caveats: (
              <>
                <p>
                  The model reprices all government debt at the new interest rate at once; at the speed the OBR assumes for UK debt, the rise in
                  debt/GDP by {LATE_YEAR} is a tenth to two-thirds as large where debt/GDP still ends above the path.
                </p>
                <p>
                  {LATE_YEAR} is the debt rule&rsquo;s first year, so only stocks are quoted for it. The stress test leaves out the cost of
                  unemployment.
                </p>
              </>
            ),
          }}
          method="rules"
        />
        <PathCard
          sid={sid}
          v="tax_gdp_pp"
          years={SHORT_YEARS}
          unit="pp"
          title="Tax/GDP"
          name="tax/GDP"
          icon="receipt"
          unitLine={`Percentage points of GDP, difference from the OBR-central path, ${FIRST_YEAR}–${HEADLINE_YEAR}`}
          finding={st.closure === 'central' ? undefined : 'With closed capital the model’s sign for tax/GDP is not reliable: see the card below.'}
          about={{
            shows: `Tax revenue as a share of GDP against the OBR-central path. ${reading}`,
            caveats: (
              <>
                Under the central closure the fall is too small; with closed capital the sign itself is not reliable. See{' '}
                <NavLink tab="explore" sub="finances" anchor="tax-gap">
                  Our tax effect is likely understated
                </NavLink>
                .
              </>
            ),
          }}
          method="rules"
        />
      </div>
      <div className="cards-stack stack-gap">
        <TaxGapCard sid={sid} closure={st.closure} rule={st.rule} />
        <FiscalRuleCard sid={sid} />
      </div>
    </>
  );
}
