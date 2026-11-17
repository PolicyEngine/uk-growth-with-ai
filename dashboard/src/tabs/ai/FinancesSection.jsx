'use client';

import Icon from '@/components/ab/Icon.jsx';
import { TipTarget } from '@/components/ab/Tip.jsx';
import Card, { SectionHeading, IconLine } from '@/components/ui/Card.jsx';
import { useNav, NavLink } from '@/lib/nav.jsx';
import { ruleLabel, RULES } from '@/lib/labels.js';
import { CHART_COLOURS } from '@/lib/chartTheme.js';
import { esc } from '@/lib/download.js';
import {
  S,
  YEARS, HEADLINE_YEAR, LATE_YEAR, FIRST_YEAR, SURPRISE_YEAR, CENTRAL, BOUND, CLOSURES, SCENARIOS, ARMS, CLOSURE_LABEL, resultAt, ruleSolved, scenarioById, gap, signed, fmt,
} from '@/tabs/ai/surprise.js';
import { closuresFor, contextLine, side, ruleGapText, primaryClosure } from '@/tabs/ai/lines.js';
import { PathCard } from '@/tabs/ai/ResultsTab.jsx';
import { Items } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import { Dir, dirConcept, Lead, sentenceItems } from '@/tabs/explore/direction.jsx';
import { ext } from '@/tabs/shared/ui.jsx';
import { SOURCES as LIT } from '@/data/literature.js';
import { URLS, atRef, RESULTS_SHA, efo, EFO_PAGE, OG_RESULT_URLS } from '@/tabs/ai/links.js';
import { debtDipIsDenominator, debtSidesByRule, signHeading } from '@/tabs/explore/caveats.js';
import AIS from '@/data/aiScenarios.json';

// OG-UK's world interest rate, the run's closure settings (aiScenarios.json).
const WORLD_RATE = AIS.assum?.closure?.world_int_rate_annual;
import { SourcesLine } from '@/tabs/explore/sources.jsx';
import NICS from '@/tabs/explore/nics2028.json';
import { AxisTitles } from '@/tabs/explore/axes.jsx';

// Results > Public finances: debt/GDP to the debt rule's first year,
// tax/GDP, why both are likely understated, and how the result changes with
// the fiscal rule. Every number from surprise2028.json through surprise.js;
// this is the one home of the tax/GDP and debt/GDP figures.

const LONG_YEARS = YEARS.filter((y) => y >= FIRST_YEAR && y <= LATE_YEAR);
const SHORT_YEARS = YEARS.filter((y) => y >= FIRST_YEAR && y <= HEADLINE_YEAR);
// Debt/GDP in the debt rule's first year with debt repriced at the speed the
// OBR assumes for UK debt (common fiscal rule): debt_gdp_pp_obr_repricing_late,
// built by analysis/surprise/build_dashboard_data.py with the method and
// constants of PR #43 (docs/debt_repricing.md) and paper/make_values.py.
// Over every solved scenario, arm and closure (24 cells): the cells
// (scenario|closure) whose main arm ends below the path at that speed while
// the model's own figure is above it, and, where both are above, the
// repriced rise as a share of the model's, as a [min, max] percentage.
const REPRICED = CLOSURES.flatMap((cl) =>
  SCENARIOS.flatMap((s) =>
    ARMS.map((a) => ({ sid: s.id, arm: a.id, cl, r: resultAt(s.id, a.id, cl, 'common') }))
      .filter((c) => c.r.status === 'done')
      .map((c) => ({ ...c, model: c.r.gaps.debt_gdp_pp[YEARS.indexOf(LATE_YEAR)], obr: c.r.debt_gdp_pp_obr_repricing_late })),
  ),
);
const BELOW_AT_OBR_SPEED = new Set(REPRICED.filter((c) => c.arm === 'tfp' && c.model > 0 && c.obr < 0).map((c) => `${c.sid}|${c.cl}`));
const obrLate = (sid, cl) => REPRICED.find((c) => c.sid === sid && c.cl === cl && c.arm === 'tfp')?.obr ?? null;
const REPRICE_RATIOS = REPRICED.filter((c) => c.model > 0 && c.obr > 0).map((c) => (c.obr / c.model) * 100);
export const REPRICE_RANGE = [Math.min(...REPRICE_RATIOS), Math.max(...REPRICE_RATIOS)];

// The main arm's debt/GDP in words, by sign, for the closure in view, with
// an arrow beside each side that follows the same sign. No claim about every
// arm: the lines and their end values show each one. Returns the parts, so
// the test can check every arrow against the data.
export function debtParts(sid, closure, rule) {
  const cl = closure === 'closed' ? BOUND : CENTRAL;
  const a = gap(sid, 'tfp', cl, 'debt_gdp_pp', HEADLINE_YEAR, rule);
  const b = gap(sid, 'tfp', cl, 'debt_gdp_pp', LATE_YEAR, rule);
  if (a == null || b == null) return null;
  const lead = `Automation + productivity${closure === 'closed' ? ', closed capital' : ''}:`;
  if (rule === 'dn') {
    const first = gap(sid, 'tfp', cl, 'debt_gdp_pp', SURPRISE_YEAR, rule);
    return { kind: 'dn', lead, first: first == null || side(first) === 'on' ? null : first, late: b };
  }
  const obr = rule === 'common' && BELOW_AT_OBR_SPEED.has(`${sid}|${cl}`) && side(b) === 'above' ? obrLate(sid, cl) : null;
  return { kind: 'rule', lead, a, b, obr };
}

const sideOf = (x) => (side(x) === 'on' ? 'on' : side(x));

function DebtFinding({ p }) {
  if (p.kind === 'dn')
    return (
      <>
        {p.lead} debt/GDP
        {p.first != null ? (
          <>
            {' '}is <Dir x={p.first} />
            {side(p.first)} the path in {SURPRISE_YEAR} and then
          </>
        ) : null}{' '}
        stays <Dir x={p.late} />
        on the path: transfers hold it there from {SURPRISE_YEAR + 1}.
      </>
    );
  return (
    <>
      {p.lead} debt/GDP is <Dir x={p.a} />
      {sideOf(p.a)} the path in {HEADLINE_YEAR} and {sideOf(p.a) === sideOf(p.b) ? 'still ' : ''}
      <Dir x={p.b} />
      {sideOf(p.b)} it by {LATE_YEAR}.
    </>
  );
}

// Economics review, round 1 (explore/caveats.js): why debt/GDP first dips,
// how its late-year sign moves with the fiscal rule and repricing, and the
// gilt rate. Each item is gated on the data for the scenario and closure in
// view; none under the debt-neutral rule, which holds debt on the path.
const RULE_WORD = { common: 'common rule', obr: 'OBR repricing', fixed: 'fixed spending' };
export function debtReviewItems(sid, closure, rule) {
  if (rule === 'dn') return [];
  const cl = closure === 'closed' ? BOUND : CENTRAL;
  const sides = debtSidesByRule(sid, cl);
  const head = signHeading(sides);
  const split = head != null;
  return [
    debtDipIsDenominator(sid, cl, rule) ? { key: 'dip', icon: 'gdp', text: `The ${SURPRISE_YEAR} dip is GDP rising on a debt stock already set` } : null,
    split ? { key: 'sign', icon: 'rule', text: `Its ${LATE_YEAR} sign depends on ${head}:` } : null,
    split ? { key: 'sides', icon: 'compare', text: sides.map((x) => `${RULE_WORD[x.key]}: ${x.side}`).join('; ').replace(/^./, (c) => c.toUpperCase()) } : null,
    rule === 'common' ? { key: 'dividend', icon: 'gdp', text: 'Common rule: spending grows with GDP, so growth brings no dividend' } : null,
    { key: 'gilt', icon: 'interest', text: <>Gilt yields rise {ext(OG_RESULT_URLS.giltRate, 'one for one')} with the return on capital</> },
    typeof WORLD_RATE === 'number' ? { key: 'world', icon: 'foreign', text: `The world interest rate stays fixed at ${Math.round(WORLD_RATE * 100)}%` } : null,
  ].filter(Boolean);
}

function debtNotes(p) {
  if (!p || p.kind === 'dn') return null;
  return [
    { key: 'reprice', icon: 'interest', text: 'The model reprices debt at the higher interest rate at once' },
    p.obr != null ? { key: 'obr', icon: dirConcept(p.obr), text: `At the OBR’s repricing speed it ends ${side(p.obr)} the path` } : null,
  ].filter(Boolean);
}

// Tax/GDP with closed capital in the main arm, in words (results sanity
// audit A6): it can rise, so the model's sign there is not reliable.
function closedTaxWords(sid, rule) {
  const r = resultAt(sid, 'tfp', BOUND, rule);
  if (r.status !== 'done') return null;
  const atYear = (y) => r.gaps.tax_gdp_pp[YEARS.indexOf(y)];
  if (atYear(HEADLINE_YEAR) > 0) return `rises by ${HEADLINE_YEAR}`;
  const first = YEARS.find((y) => y > HEADLINE_YEAR && y < LATE_YEAR && atYear(y) > 0);
  if (first) return `near zero in ${HEADLINE_YEAR}, positive from ${first}`;
  return 'falls far less than at the central closure';
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
      {/* icon + text, no box; the arrow follows the comparison (up) */}
      <IconLine icon={up ? 'arrowUp' : 'arrowDown'} className={`cause-effect${up ? ' is-main' : ''}`}>
        {effect}
      </IconLine>
    </div>
  );
}

// OG-UK's labour vs capital effective tax-rate gap on the OBR-central path in
// the headline year, central closure (the sanity gate's effective rates, as
// the paper's EffWedgePp): labour incl. employer NICs less gross capital.
const ETR = S.closures[CENTRAL].reference_effective_tax_rates;
const TAX_GAP = ETR.labour - ETR.capital_gross;
// Employer NICs on one basis, % of earnings (analysis/nics/nics_2028.json,
// copied to tabs/explore/nics2028.json): OG-UK's flat tau_payroll (its
// default, the 15% main rate HMRC sets above the secondary threshold) and
// PolicyEngine-UK's 2028 microsimulation average.
const NIC_OGUK = NICS.oguk_tau_payroll * 100;
const NIC_PE = NICS.avg_employer_rate_on_employment_income * 100;
// The debt rule's first year: OG-Core's tG1, set to 10 periods from 2026 in
// scenarios.py (OG-UK's default is 4, so 2030).
const TG1_URL = atRef(RESULTS_SHA, 'uk_growth_with_ai/scenarios.py#L45');
const OGUK_TG1_YEAR = 2030;
const EFO_NOV25 = 'https://obr.uk/efo/economic-and-fiscal-outlook-november-2025/';
const NICS_URL = atRef('bf5de33', 'analysis/nics/nics_2028.json');
const RED_FLAGS_URL = atRef('bf5de33', 'docs/red_flags_1_3.md');
// The two rows of the tax card, as drawn and as downloaded
const CAUSES = [
  { title: 'Labour vs capital tax-rate gap', max: 25, unit: 'pp', ours: TAX_GAP, oursText: `${TAX_GAP.toFixed(1)}pp`, theirs: 'OBR rates, differenced', lo: 19, hi: 23, theirsText: '19–23pp', effect: 'Likely understates the revenue fall (main effect)' },
  { title: 'Employer National Insurance, % of earnings', max: 16, unit: '% of earnings', ours: NIC_OGUK, oursText: `flat ${Math.round(NIC_OGUK)}%`, theirs: `PolicyEngine-UK ${NICS.year} average`, value: NIC_PE, theirsText: `${NIC_PE.toFixed(1)}%`, effect: 'Partly offsets the first row (smaller)' },
];
// OG-UK's figure below the comparison: the model's revenue fall is too
// small (the first row's main effect); above it, the row partly offsets.
export const understates = (c) => c.ours < (c.lo ?? c.value);
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
    out += `<circle cx="${X(c.ours)}" cy="${ty}" r="6" fill="${C.ours}"/>`;
    out += `<text x="${X(c.ours)}" y="${ty - 12}" font-size="11" font-weight="600" text-anchor="middle" fill="${C.ink}">${esc(`OG-UK ${c.oursText}`)}</text>`;
    out += `<text x="${x0}" y="${ty + 40}" font-size="11" fill="${C.tick}">0</text><text x="${x1}" y="${ty + 40}" font-size="11" text-anchor="end" fill="${C.tick}">${esc(`${c.max}${c.unit === 'pp' ? 'pp' : ` ${c.unit}`}`)}</text>`;
    out += `<text x="0" y="${ty + 62}" font-size="12" fill="${C.ink}">${esc(c.effect)}</text>`;
    y = ty + 84;
  }
  return { w: W, h: y, markup: out };
}

export const TAX_TITLE = 'OG-UK’s revenue fall is smaller than OBR effective rates imply';

// Highlight the main arm's 2031 end point on the Tax/GDP chart while the
// link is hovered or focused (the figure's one home is that end label).
const flag = (on) => () => document.getElementById('tax-gdp')?.classList.toggle('ex-flag', on);

// The model's tax/GDP gap and the rough UK-rates range on one pp axis. The
// model's central figure prints here only when the chart shows closed
// capital; otherwise a link points at (and highlights) the chart's end label.
function TaxStrip({ model, uk, onChart }) {
  const xs = [0, ...(uk ?? []), ...(model == null ? [] : [model])];
  const lo = Math.min(...xs) * 1.25;
  const pos = (x) => `${(((x - lo) / (0 - lo)) * 100).toFixed(2)}%`;
  const ticks = [];
  const step = Math.abs(lo) > 0.6 ? 0.2 : 0.1;
  for (let t = 0; t >= lo; t -= step) ticks.push(Math.round(t * 100) / 100);
  return (
    <div className="ex-taxstrip" role="group" aria-label={`Tax/GDP in ${HEADLINE_YEAR}: the model against UK tax rates`}>
      <div className="ex-taxrow">
        <span className="ex-taxlabel">
          <Icon name={iconFor('model')} size={16} /> Model (OG-UK)
        </span>
        <span className="ex-taxtrack">
          <span className="ex-taxzero" style={{ left: pos(0) }} aria-hidden="true" />
          {model == null ? (
            <span className="ex-taxval">pending</span>
          ) : (
            <span className="ex-taxdot" style={{ left: pos(model) }}>
              {onChart ? null : <span className="ex-taxval">{`${signed(model, 2)}pp`}</span>}
            </span>
          )}
        </span>
      </div>
      {onChart && model != null ? (
        <p className="ex-taxlink">
          <Icon name={iconFor('link')} size={14} />
          <a href="#tax-gdp" onMouseEnter={flag(true)} onMouseLeave={flag(false)} onFocus={flag(true)} onBlur={flag(false)}>
            Its value: the main-arm end point of the Tax/GDP chart
          </a>
        </p>
      ) : null}
      <div className="ex-taxrow">
        <span className="ex-taxlabel">
          <Icon name={iconFor('tax')} size={16} /> Scaled with OBR effective rates
        </span>
        <span className="ex-taxtrack">
          <span className="ex-taxzero" style={{ left: pos(0) }} aria-hidden="true" />
          {uk == null ? (
            <span className="ex-taxval">pending</span>
          ) : (
            <span className="ex-taxbar" style={{ left: pos(Math.min(...uk)), width: `${((Math.abs(uk[0] - uk[1]) / -lo) * 100).toFixed(2)}%` }}>
              <span className="ex-taxval">{`${signed(uk[0], 2)} to ${signed(uk[1], 2)}pp`}</span>
            </span>
          )}
        </span>
      </div>
      <div className="ex-taxrow ex-taxaxis" aria-hidden="true">
        <span />
        <span className="ex-taxtrack" data-axis="">
          {ticks.map((t) => (
            <span key={t} className="ex-taxtick" style={{ left: pos(t) }}>
              {t === 0 ? '0' : `−${Math.abs(t).toFixed(1)}`}
            </span>
          ))}
        </span>
      </div>
      <p className="ex-roughchip">
        <Icon name={iconFor('arithmetic')} size={14} /> Rough scaling, not a model run
      </p>
    </div>
  );
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
      icon={iconFor('limit')}
      title={TAX_TITLE}
      controls={
        <Items
          className="ex-notes"
          items={[
            { key: 'rates', icon: 'rule', text: `OG-UK’s labour–capital tax-rate gap is narrower than the OBR’s` },
            model == null
              ? null
              : { key: 'falls', icon: dirConcept(model), text: model < 0 ? 'So revenue likely falls too little as income shifts to profits' : 'So the model likely misses a revenue fall as income shifts to profits' },
            closure !== 'central' && closedTax ? { key: 'closed', icon: 'closed', text: `With closed capital the ${HEADLINE_YEAR} sign changes:` } : null,
            closure !== 'central' && closedTax ? { key: 'closed2', icon: 'caveat', text: `tax/GDP ${closedTax}` } : null,
          ]}
        />
      }
      aboutTitle="About this estimate"
      about={{
        how:
          fall == null ? (
            'The labour-share fall for this scenario is not solved yet.'
          ) : (
            <Items
              items={[
                { key: 'obr', icon: 'tax', text: 'Implied by two OBR effective rates: 0.19 to 0.23 points of revenue per point shifted' },
                { key: 'r1', icon: 'source', text: 'OBR, July 2026: wages and salaries 46%, profits 27%; November 2025: labour income around 40%, corporate profits around 17%' },
                { key: 'r2', icon: 'arithmetic', text: '19–23pp: those rates differenced, on different bases; the OBR publishes neither gap' },
                { key: 'r3', icon: 'model', text: <>OG-UK {TAX_GAP.toFixed(1)}pp: {ETR.labour.toFixed(1)}% on labour (with employer NICs), {ETR.capital_gross.toFixed(1)}% on gross capital, {HEADLINE_YEAR}, central closure</> },
                {
                  key: 'times',
                  icon: 'inequality',
                  text: (
                    <>
                      Times this scenario&rsquo;s {HEADLINE_YEAR} labour-share fall (
                      <NavLink tab="explore" sub="economy" anchor="economy-prices">
                        Economy
                      </NavLink>
                      ): the range above
                    </>
                  ),
                },
                model != null ? { key: 'model', icon: 'model', text: `The model loses about ${Math.abs(model / fall).toFixed(2)} per point, all AI effects included` } : null,
              ]}
            />
          ),
        caveats: (
          <Items
            items={[
              { key: 'rough', icon: 'limit', text: 'A rough scaling, not a model run' },
              { key: 'arm', icon: 'scenario', text: 'Automation + productivity, central closure only' },
              { key: 'closed', icon: 'closed', text: 'It does not show the model’s sign is right with closed capital' },
            ]}
          />
        ),
      }}
      foot={
        <SourcesLine
          closures={[]}
          code={false}
          extra={[
            ext(LIT.obrFrs26.url, 'OBR FRS, July 2026, Box 4.1'),
            ext(EFO_NOV25, 'OBR EFO, November 2025, ¶2.64'),
            ext(RED_FLAGS_URL, 'red_flags_1_3.md'),
            ext(URLS.ogUkDefaults, 'tau_payroll'),
            ext(URLS.hmrcEmployerRates, 'HMRC employer rates'),
            ext(NICS_URL, 'nics_2028.json'),
            <NavLink key="tax" tab="method" sub="how" anchor="m-tax">
              How labour is taxed
            </NavLink>,
          ]}
          method="limits"
        />
      }
      download={{
        title: TAX_TITLE,
        context: () => contextLine(sid, closure, `tax/GDP in ${HEADLINE_YEAR} with UK tax rates: rough scaling, central closure, automation + productivity`, rule),
        table: () => ({
          columns: ['Item', 'OG-UK', 'Comparison', 'Comparison source', 'Effect on revenue'],
          rows: [
            ...CAUSES.map((c) => [c.title, c.oursText, c.lo != null ? `${c.lo}–${c.hi}${c.unit}` : `${c.value}${c.unit === 'pp' ? 'pp' : '%'}`, c.theirs, c.effect]),
            [`Tax/GDP in ${HEADLINE_YEAR} scaled with OBR effective rates (pp of GDP), low`, null, uk ? uk[0] : null, 'OBR effective rates x labour-share fall', ''],
            [`Tax/GDP in ${HEADLINE_YEAR} scaled with OBR effective rates (pp of GDP), high`, null, uk ? uk[1] : null, 'OBR effective rates x labour-share fall', ''],
          ],
        }),
        svg: causesSvg,
        legend: () => [
          { label: 'OG-UK', color: 'var(--series-2)', shape: 'dot' },
          { label: 'Comparison', color: CHART_COLOURS.muted, shape: 'ring' },
        ],
      }}
    >
      <AxisTitles y="The model, and the scaling with OBR rates" x={`Tax/GDP gap in ${HEADLINE_YEAR}, percentage points of GDP`} reference="0 = OBR-central path" />
      <TaxStrip model={model} uk={uk} onChart={onChart} />
      <div className="cause-rows">
        {CAUSES.map((c, i) => (
          <Cause
            key={c.title}
            icon={iconFor(i ? 'tax' : 'compare')}
            title={c.title}
            axis={{ max: c.max, label: c.unit === 'pp' ? `${c.max}pp` : `${c.max}${c.unit}` }}
            ours={{ value: c.ours, text: c.oursText }}
            theirs={c.lo != null ? { name: c.theirs, lo: c.lo, hi: c.hi, text: c.theirsText } : { name: c.theirs, value: c.value, text: c.theirsText }}
            up={understates(c)}
            effect={c.effect}
          />
        ))}
      </div>
      <IconLine icon={iconFor('rule')} className="net-line">
        <b>Net:</b> the model likely understates the fall in revenue, if the first row outweighs the second ({ext(RED_FLAGS_URL, 'the argument')}).
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
  { v: 'w', label: 'Pay rate' },
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
                <th colSpan={RULE_VARS.length + 1} scope="colgroup"><Lead c={cl === BOUND ? 'closed' : 'foreign'}>{CLOSURE_LABEL[cl].replace(/^./, (c) => c.toUpperCase())}</Lead></th>
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

// The rule cards: each rule with what it holds fixed, synced with the
// page's fiscal-rule picker (&rule=); the common rule is the default.
const RULE_INFO = {
  common: { icon: 'gdp', holds: 'Holds spending and transfers as shares of GDP', span: 'Spending follows GDP' },
  fixed: { icon: 'finances', holds: 'Holds spending at its OBR-central level', span: 'Spending held at its OBR-central level' },
  dn: { icon: 'benefits', holds: 'Holds debt/GDP on the path; transfers adjust', span: 'Transfers hold debt/GDP on the path' },
};
const RULE_DB = [
  { v: 'Y', label: 'GDP', concept: 'gdp', unit: '%' },
  { v: 'w', label: 'Pay rate', concept: 'pay', unit: '%' },
  { v: 'GNI', label: 'GNI', concept: 'gni', unit: '%' },
  { v: 'debt_gdp_pp', label: 'Debt/GDP', concept: 'debt', unit: 'pp' },
  { v: 'tax_gdp_pp', label: 'Tax/GDP', concept: 'tax', unit: 'pp' },
];

export function RulePicker() {
  const { st, set } = useNav();
  return (
    <div className="ex-rules" role="group" aria-label="Fiscal rule">
      {RULES.map((r) => (
        <button key={r.id} type="button" className={`ex-rule${st.rule === r.id ? ' is-active' : ''}`} aria-pressed={st.rule === r.id} onClick={() => set({ rule: r.id })}>
          <span className="ex-rule-name">
            <Icon name={iconFor(RULE_INFO[r.id].icon)} size={16} /> {r.label}
            {r.id === 'common' ? (
              <span className="ex-rule-tag">
                <Icon name={iconFor('defaultRule')} size={12} /> Default
              </span>
            ) : null}
          </span>
          <span className="ex-rule-holds">{RULE_INFO[r.id].holds}</span>
        </button>
      ))}
    </div>
  );
}

// From the shock to the debt rule: what the rule picked does each year, then
// the debt rule (LATE_YEAR, from the data).
function RuleTimeline({ rule }) {
  return (
    <div className="ex-timeline" aria-label={`${SURPRISE_YEAR} to ${LATE_YEAR}`}>
      <span className="ex-tl-year">
        <Icon name={iconFor('shock')} size={14} /> {SURPRISE_YEAR}
      </span>
      <span className="ex-tl-span">{RULE_INFO[rule].span}</span>
      <span className="ex-tl-year is-end">
        <Icon name={iconFor('rule')} size={14} /> {LATE_YEAR}: debt rule starts
      </span>
    </div>
  );
}

// The main arm's headline-year gap under the common rule (hollow) and the
// rule picked (filled), per measure, at the closure in view. Values are in
// the tooltips only: each gap's home is its chart, the shift's the table.
function RuleDumbbells({ rule, sid, closure }) {
  const cl = primaryClosure(closure);
  const rows = RULE_DB.map((m) => ({ ...m, a: gap(sid, 'tfp', cl, m.v, HEADLINE_YEAR, 'common'), b: gap(sid, 'tfp', cl, m.v, HEADLINE_YEAR, rule) }));
  const name = ruleLabel(rule);
  return (
    <div className="ex-rdb" role="group" aria-label={`${HEADLINE_YEAR} gaps, common rule against ${name.toLowerCase()}`}>
      <p className="ex-rdb-key" aria-hidden="true">
        <span className="ex-rdb-dot is-common" /> Common rule <span className="ex-rdb-dot" /> {name}
      </p>
      {rows.map((m) => {
        const D = Math.max(0.1, ...[m.a, m.b].filter((x) => x != null).map(Math.abs)) * 1.2;
        const pos = (x) => `${(((x + D) / (2 * D)) * 100).toFixed(2)}%`;
        return (
          <div key={m.v} className="ex-rdb-row">
            <span className="ex-rdb-label">
              <Icon name={iconFor(m.concept)} size={16} /> {m.label}
            </span>
            <span className="ex-rdb-track">
              <span className="ex-taxzero" style={{ left: pos(0) }} aria-hidden="true" />
              {m.a == null || m.b == null ? (
                <span className="ex-rdb-none">
                  <Icon name={iconFor('timing')} size={12} /> not solved
                </span>
              ) : (
                <>
                  <span className="ex-rdb-bar" style={{ left: pos(Math.min(m.a, m.b)), width: `${((Math.abs(m.a - m.b) / (2 * D)) * 100).toFixed(2)}%` }} aria-hidden="true" />
                  <TipTarget className="ex-rdb-dot is-common" style={{ left: pos(m.a) }} label={`${m.label}, common rule: ${fmt(m.a, 2, m.unit)}`} tip={<><b>{m.label}, {HEADLINE_YEAR}</b><span>Common fiscal rule</span><span className="tip-value">{fmt(m.a, 2, m.unit)}</span></>} />
                  <TipTarget className="ex-rdb-dot" style={{ left: pos(m.b) }} label={`${m.label}, ${name.toLowerCase()}: ${fmt(m.b, 2, m.unit)}`} tip={<><b>{m.label}, {HEADLINE_YEAR}</b><span>{name}</span><span className="tip-value">{fmt(m.b, 2, m.unit)}</span></>} />
                </>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FiscalRuleCard({ sid }) {
  const { st } = useNav();
  const rule = st.rule;
  const has = rule !== 'common' && ruleSolved(rule, sid);
  return (
    <Card
      id="fiscal-rule"
      icon={iconFor('rule')}
      title="What the fiscal rule changes"
      controls={
        <>
          <RuleTimeline rule={rule} />
          <p className="ex-roughchip">
            <Icon name={iconFor('caveat')} size={14} /> The rule picked at the top applies to every chart on this page
          </p>
        </>
      }
      unit={has ? <Lead c="measure">{`How far each ${HEADLINE_YEAR} gap moves, main arm; the table: every arm, pp`}</Lead> : null}
      logo={false}
      about={has ? {
        caveats: (
          <Items
            items={[
              { key: 'shift', icon: 'compare', text: 'Table: the gap under the rule picked, less the common rule’s' },
              { key: 'choice', icon: 'rule', text: 'The three rules are modelling choices, not OBR rules' },
              { key: 'sign', icon: 'gapUp', text: 'Positive: the rule raises the measure against the common rule' },
              { key: 'dn', icon: 'debt', text: `Debt-neutral: debt/GDP stays on the path to ${LATE_YEAR} by construction` },
            ]}
          />
        ),
      } : null}
      aboutTitle="About these figures"
      download={has ? { title: `${HEADLINE_YEAR} gaps: ${ruleLabel(rule).toLowerCase()} against the common rule`, context: () => contextLine(sid, st.closure, 'percentage points', rule), table: () => ruleTable(rule, sid, st.closure) } : undefined}
    >
      {rule === 'common' ? (
        <p className="ex-roughchip">
          <Icon name={iconFor('compare')} size={14} /> Pick another rule to see how far each gap moves
        </p>
      ) : !has ? (
        <div className="unpublished-plot">
          <Items items={sentenceItems(ruleGapText(rule, sid))} />
        </div>
      ) : (
        <>
          <RuleDumbbells rule={rule} sid={sid} closure={st.closure} />
          <RuleTable rule={rule} sid={sid} closure={st.closure} />
        </>
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
  const debt = debtParts(sid, st.closure, st.rule);
  return (
    <>
      <SectionHeading id="public-finances" icon={iconFor('finances')} title="How do debt and tax move in each arm?">
        <Lead c="measure">Shares of GDP, against the OBR-central path</Lead>
      </SectionHeading>
      <div className="cards-grid">
        <PathCard
          sid={sid}
          v="debt_gdp_pp"
          years={LONG_YEARS}
          unit="pp"
          id="debt-gdp"
          title="Debt/GDP"
          name="debt/GDP"
          icon={iconFor('debt')}
          unitLine={`Percentage points of GDP, difference from the OBR-central path, ${FIRST_YEAR}–${LATE_YEAR}`}
          finding={debt ? <DebtFinding p={debt} /> : undefined}
          notes={debtNotes(debt)}
          markers={[{ year: SURPRISE_YEAR, label: 'AI arrives' }, { year: LATE_YEAR, label: 'Debt rule starts (set in this study)' }]}
          about={{
            caveats: (
              <Items
                items={[
                  { key: 'once', icon: 'interest', text: <>{ext(URLS.ogCoreDocs, 'OG-Core')} reprices all government debt at the new rate at once</> },
                  ...debtReviewItems(sid, st.closure, st.rule),
                  { key: 'obr', icon: 'timing', text: `At the OBR’s repricing speed, a first-order recalculation: the ${LATE_YEAR} rise is ${REPRICE_RANGE[0].toFixed(0)}–${REPRICE_RANGE[1].toFixed(0)}% as large` },
                  { key: 'where', icon: 'range', text: `That range covers the ${REPRICE_RATIOS.length} of ${REPRICED.length} cells still above the path at that speed` },
                  { key: 'stocks', icon: 'rule', text: <>{LATE_YEAR}: {ext(URLS.ogCoreParams, 'OG-Core’s budget closure rule')} starts; {ext(TG1_URL, 'set in this study')} (OG-UK&rsquo;s default is {OGUK_TG1_YEAR})</> },
                  { key: 'stress', icon: 'excluded', text: <>The stress test, after {ext(efo(EFO_PAGE.box22), 'OBR Box 2.2')}, leaves out the cost of unemployment</> },
                ]}
              />
            ),
          }}
          method="rules"
        />
        <PathCard
          sid={sid}
          v="tax_gdp_pp"
          years={SHORT_YEARS}
          unit="pp"
          id="tax-gdp"
          title="Tax/GDP"
          name="tax/GDP"
          icon={iconFor('tax')}
          unitLine={`Percentage points of GDP, difference from the OBR-central path, ${FIRST_YEAR}–${HEADLINE_YEAR}`}
          finding={st.closure === 'central' ? undefined : 'With closed capital the model’s sign for tax/GDP changes: see the card below.'}
          sources={false}
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
