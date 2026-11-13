'use client';

import { useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import Disclosure from '@/components/ab/Disclosure.jsx';
import ChartCard from '@/components/ab/ChartCard.jsx';
import LineChart from '@/components/LineChart.jsx';
import { TipTarget } from '@/components/ab/Tip.jsx';
import { SectionHeading, Unpublished } from '@/components/ab/Section.jsx';
import {
  YEARS, HEADLINE_YEAR, LATE_YEAR, FIRST_YEAR, SURPRISE_YEAR, CENTRAL, BOUND, ARMS, ARM_COLOR, ARM_LIGHT, CLOSURE_LABEL, result, ruleResult, ruleScenarios, scenarioById, gap, signed, fmt,
} from '@/tabs/ai/surprise.js';

// Public finances, the last section of Results: debt/GDP to the debt rule's
// start, tax/GDP, why both are too small, and the spending rule. Every number
// from surprise2028.json through surprise.js; this is the one home of the
// tax/GDP and debt/GDP figures.

const LONG_YEARS = YEARS.filter((y) => y >= FIRST_YEAR && y <= LATE_YEAR);
const SHORT_YEARS = YEARS.filter((y) => y >= FIRST_YEAR && y <= HEADLINE_YEAR);

const closuresFor = (closure) => (closure === 'closed' ? [BOUND] : closure === 'both' ? [CENTRAL, BOUND] : [CENTRAL]);

function seriesFor(sid, v, years, hidden, closure) {
  return ARMS.filter((a) => !hidden[a.id]).flatMap((a) =>
    closuresFor(closure).flatMap((cl) => {
      const r = result(sid, a.id, cl);
      if (r.status !== 'done') return [];
      const bound = cl === BOUND;
      return [{
        key: `${a.id}-${bound ? 'b' : 'c'}`,
        label: a.short || a.label,
        closure: bound ? 'closed capital' : 'central closure',
        color: ARM_COLOR[a.id],
        light: ARM_LIGHT[a.id],
        dashed: bound && closure === 'both',
        noEndLabel: bound && closure === 'both',
        values: years.map((y) => r.gaps[v][YEARS.indexOf(y)]),
      }];
    }),
  );
}

function FiscalCard({ sid, hidden, closure, v, years, title, icon, summary, about, markers, bands }) {
  const series = seriesFor(sid, v, years, hidden, closure);
  const pend = closure === 'central' ? [] : ARMS.filter((a) => !hidden[a.id] && result(sid, a.id, BOUND).status !== 'done').map((a) => a.short || a.label);
  const empty = ARMS.every((a) => hidden[a.id])
    ? 'Every series is hidden: choose one in the legend above.'
    : closure === 'closed'
      ? 'Closed-capital results pending for this scenario.'
      : 'No solve for this scenario yet.';
  return (
    <ChartCard icon={icon} title={title} summary={summary} unit="Percentage points of GDP, difference from the OBR-central path" about={about}>
      {series.length && pend.length ? (
        <p className="pending-note">
          <Icon name="lock" size={13} />
          <span>Closed-capital results pending: {pend.join(', ')}.</span>
        </p>
      ) : null}
      {series.length ? (
        <LineChart
          x={years}
          series={series}
          height={280}
          endLabel="value"
          unit="pp"
          zeroLabel="OBR central"
          markers={markers}
          bands={bands}
          tipTitle={title.split(',')[0]}
          valueFormat={(x) => signed(x, 2)}
          ariaLabel={`${title} against the OBR-central path`}
        />
      ) : (
        <Unpublished>{empty}</Unpublished>
      )}
    </ChartCard>
  );
}

// The OBR's labour-minus-capital effective-rate gap, pp: FRS July 2026 Box
// 4.1 (46% - 27% = 19pp) and EFO Nov 2025 para 2.64 (40% - 17% = 23pp). Each
// pp of income moved from labour to capital lowers revenue by about this many
// hundredths of a pp of GDP (docs/red_flags_1_3.md).
const OBR_PER_PP = [0.19, 0.23];

function Cause({ icon, title, axis, ours, theirs, effect, up }) {
  const pct = (x) => `${((x / axis.max) * 100).toFixed(2)}%`;
  // A label near either end of the axis is anchored inwards
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
      <p className={`effect-chip${up ? ' is-main' : ''}`}>
        <Icon name={up ? 'arrowUp' : 'arrowDown'} size={14} />
        <span>{effect}</span>
      </p>
    </div>
  );
}

// Tax/GDP with closed capital in the main arm, in words (results sanity
// audit A6): it can rise, so the model's sign there is not reliable.
function closedTaxWords(sid) {
  const r = result(sid, 'tfp', BOUND);
  if (r.status !== 'done') return null;
  const at = (y) => r.gaps.tax_gdp_pp[YEARS.indexOf(y)];
  if (at(HEADLINE_YEAR) > 0) return `rises by ${HEADLINE_YEAR}`;
  // flows from the debt rule's first year are not quoted
  const first = YEARS.find((y) => y > HEADLINE_YEAR && y < LATE_YEAR && at(y) > 0);
  if (first) return `is close to zero in ${HEADLINE_YEAR} and turns positive from ${first}`;
  return 'falls by much less than under the central closure';
}

// Debt/GDP by 2036: higher than the OBR-central path in every solved arm?
function debtWords(sid) {
  const all = ARMS.flatMap((a) => [CENTRAL, BOUND].map((cl) => gap(sid, a.id, cl, 'debt_gdp_pp', LATE_YEAR))).filter((x) => x != null);
  if (!all.length) return '';
  const main31 = gap(sid, 'tfp', CENTRAL, 'debt_gdp_pp', HEADLINE_YEAR);
  const main36 = gap(sid, 'tfp', CENTRAL, 'debt_gdp_pp', LATE_YEAR);
  const every = all.every((x) => x > 0);
  const lead = every
    ? `By ${LATE_YEAR} debt/GDP is above the OBR-central path in every arm${main31 != null && main31 < 0 && main36 > 0 ? ', including automation + productivity, which is below it in ' + HEADLINE_YEAR + ' under the central closure' : ''}.`
    : `By ${LATE_YEAR} debt/GDP is above the OBR-central path in some arms.`;
  return `${lead} The higher interest rate reprices the whole debt stock.`;
}

function TaxGapCard({ sid }) {
  const closedTax = closedTaxWords(sid);
  const model = gap(sid, 'tfp', CENTRAL, 'tax_gdp_pp');
  const ls = gap(sid, 'tfp', CENTRAL, 'labour_share_pp');
  const fall = ls == null ? null : -ls;
  const uk = fall == null ? null : OBR_PER_PP.map((k) => -fall * k);
  return (
    <div className="chart-card taxgap-card" id="tax-gap">
      <div className="chart-header">
        <h3>
          <Icon name="alert" size={16} />
          <span>Our tax and debt effects are likely understated</span>
        </h3>
      </div>
      <p className="chart-description">
        OG-UK taxes wages and profits too similarly, so under the central closure revenue falls too little when income
        shifts to profits.
        {closedTax ? ` With closed capital the model’s tax/GDP ${closedTax}, so its sign there is not reliable.` : ''}
      </p>
      <div className="bias-pair">
        <div className="bias-fig">
          <span className="bias-label">Tax/GDP in {HEADLINE_YEAR}: model</span>
          <span className="bias-value">{model == null ? 'pending' : `${signed(model, 2)}pp`}</span>
        </div>
        <Icon name="arrowRight" size={18} className="bias-arrow" />
        <div className="bias-fig">
          <span className="bias-label">With UK tax rates, about</span>
          <span className="bias-value">{uk == null ? 'pending' : `${signed(uk[0], 2)} to ${signed(uk[1], 2)}pp`}</span>
        </div>
      </div>
      <p className="bias-caveat">
        Rough scaling, not a model run. Automation + productivity, central closure only; it does not show that the model&rsquo;s sign is right with closed capital.
      </p>
      <Disclosure inCard title="How the scaling works" preview="Labour-share fall × the OBR’s revenue loss per point">
        <p className="disclosure-text">
          {fall == null ? (
            'The labour-share fall for this scenario is pending.'
          ) : (
            <>
              In this scenario the labour share falls by {fall.toFixed(1)} points by {HEADLINE_YEAR}. The OBR&rsquo;s tax rates lose
              0.19 to 0.23 points of revenue per point moved from labour to capital. Multiplying gives the range above.
              {model != null ? ` The model loses about ${Math.abs(model / fall).toFixed(2)} per point, including every other effect of AI.` : ''}
            </>
          )}
        </p>
      </Disclosure>
      <div className="cause-rows">
        <Cause
          icon="scale"
          title="Labour vs capital tax-rate gap"
          axis={{ max: 25, label: '25pp' }}
          ours={{ value: 14, text: 'about 14pp' }}
          theirs={{ name: 'OBR', lo: 19, hi: 23, text: '19–23pp' }}
          up
          effect="Understates the revenue fall (main effect)"
        />
        <Cause
          icon="receipt"
          title="Employer National Insurance"
          axis={{ max: 16, label: '16% of labour cost' }}
          ours={{ value: 15, text: '15% flat' }}
          theirs={{ name: 'PolicyEngine-UK', value: 11, text: 'about 11%' }}
          effect="Partly offsets the first row (smaller)"
        />
      </div>
      <p className="net-line">
        <Icon name="scale" size={16} />
        <span>
          <b>Net:</b> revenue losses and the rise in debt are probably larger than shown.
        </span>
      </p>
      <Disclosure inCard title="Sources" preview="OBR FRS 2026 Box 4.1 · EFO Nov 2025 ¶2.64 · analysis/nics · red_flags_1_3.md">
        <ul className="disclosure-text">
          <li>OBR Fiscal risks and sustainability, July 2026, Box 4.1: labour 46%, capital 27%.</li>
          <li>OBR Economic and fiscal outlook, November 2025, ¶2.64: labour 40%, capital 17%.</li>
          <li>
            OG-UK&rsquo;s gap of about 14pp and the direction of each bias: <code>docs/red_flags_1_3.md</code>.
          </li>
          <li>
            PolicyEngine-UK employer NICs, 2028 (about 11% of labour cost on average, 13.9% at the margin):{' '}
            <code>analysis/nics/nics_2028.json</code>.
          </li>
        </ul>
      </Disclosure>
    </div>
  );
}

const RULES = [
  { id: 'default', label: 'Spending follows GDP' },
  { id: 'fixed_spending', label: 'Fixed spending' },
  { id: 'debt_neutral', label: 'Debt-neutral' },
];

// The headline-year gaps a rule variant prints: this card is their one home.
const RULE_VARS = [
  { v: 'Y', label: 'GDP' },
  { v: 'GNI', label: 'GNI' },
  { v: 'w', label: 'Wage rate' },
  { v: 'C', label: 'Consumption' },
];

function RuleTable({ rule, sid, closure }) {
  const cls = closuresFor(closure);
  const at = (r, v) => (r.status === 'done' ? r.gaps[v][YEARS.indexOf(HEADLINE_YEAR)] : null);
  return (
    <div className="rule-table-wrap">
      <table className="rule-table">
        <caption>
          {scenarioById(sid).label}, {HEADLINE_YEAR}, % difference from the OBR-central path
        </caption>
        <thead>
          <tr>
            <th scope="col">Arm</th>
            {RULE_VARS.map((c) => (
              <th key={c.v} scope="col">{c.label}</th>
            ))}
          </tr>
        </thead>
        {cls.map((cl) => (
          <tbody key={cl}>
            {cls.length > 1 ? (
              <tr className="rule-table-group">
                <th colSpan={RULE_VARS.length + 1} scope="colgroup">{CLOSURE_LABEL[cl]}</th>
              </tr>
            ) : null}
            {ARMS.map((a) => {
              const r = ruleResult(rule, sid, a.id, cl);
              return (
                <tr key={a.id}>
                  <th scope="row">{a.short || a.label}</th>
                  {RULE_VARS.map((c) => (
                    <td key={c.v}>{fmt(at(r, c.v), 2)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}

function SpendingRuleCard({ sid, closure, link }) {
  const [rule, setRule] = useState('default');
  const solved = ruleScenarios(rule);
  const names = solved.map((s) => scenarioById(s).label).join(', ');
  const cl = closure === 'both' ? 'both closures' : CLOSURE_LABEL[closuresFor(closure)[0]];
  return (
    <div className="chart-card" id="spending-rule">
      <div className="chart-header">
        <h3>
          <Icon name="sliders" size={16} />
          <span>How the result changes with the spending rule</span>
        </h3>
      </div>
      <p className="chart-description">
        Each alternative rule shows its own {HEADLINE_YEAR} gaps, in place of the default-rule figures on the other cards.
      </p>
      <div className="view-switch" role="group" aria-label="Spending rule">
        {RULES.map((r) => (
          <button key={r.id} type="button" aria-pressed={rule === r.id} className={`view-switch-option${rule === r.id ? ' is-on' : ''}`} onClick={() => setRule(r.id)}>
            {r.label}
          </button>
        ))}
      </div>
      {rule === 'default' ? (
        <p className="chart-description rule-default">
          This is the rule every other card on Results uses: government consumption follows GDP until the
          debt rule starts in {LATE_YEAR}.
        </p>
      ) : !solved.length ? (
        <Unpublished>No solve for this rule yet. The {RULES.find((r) => r.id === rule).label.toLowerCase()} results will appear here once they are published.</Unpublished>
      ) : !solved.includes(sid) ? (
        <Unpublished>This rule is solved for {names} only. Choose {names} at the top of the page.</Unpublished>
      ) : (
        <>
          <RuleTable rule={rule} sid={sid} closure={closure} />
          <p className="chart-description rule-note">
            Closure shown: {cl}. Debt/GDP stays on the OBR-central path to {LATE_YEAR} by construction, so it has no gap
            to show. Solved for {names} only. What the rule changes: {link('method', 'Scenarios and method')}.
          </p>
        </>
      )}
    </div>
  );
}

export default function FinancesSection({ sid, hidden, legendBar, closure, link }) {
  const cl = closure === 'closed' ? 'closed capital' : closure === 'both' ? 'both closures' : 'central closure';
  return (
    <>
      <SectionHeading id="public-finances" icon="landmark" title="Public finances">
        Debt and tax as shares of GDP, {cl}.
      </SectionHeading>
      {legendBar}
      <div className="charts-grid">
        <FiscalCard
          sid={sid}
          hidden={hidden}
          closure={closure}
          v="debt_gdp_pp"
          years={LONG_YEARS}
          title={`Debt/GDP, ${FIRST_YEAR}–${LATE_YEAR}`}
          icon="landmark"
          summary={`${debtWords(sid)} ${LATE_YEAR} is the debt rule’s first year, so only stocks are quoted for it. End labels give ${LATE_YEAR}; hover for other years.`}
          markers={[{ year: SURPRISE_YEAR, label: 'AI shock' }, { year: LATE_YEAR, label: 'debt rule starts' }]}
          bands={[{ year: HEADLINE_YEAR }]}
          about={{ shows: `Public debt as a share of GDP against the OBR-central path. The shaded year is ${HEADLINE_YEAR}, the headline year.` }}
        />
        <FiscalCard
          sid={sid}
          hidden={hidden}
          closure={closure}
          v="tax_gdp_pp"
          years={SHORT_YEARS}
          title={`Tax/GDP, ${FIRST_YEAR}–${HEADLINE_YEAR}`}
          icon="receipt"
          summary={
            closure === 'central'
              ? `End labels give ${HEADLINE_YEAR}; hover or focus for each year.`
              : `End labels give ${HEADLINE_YEAR}. With closed capital the model’s sign is not reliable: see the card below.`
          }
          markers={[{ year: SURPRISE_YEAR, label: 'AI shock' }]}
          bands={[{ year: HEADLINE_YEAR }]}
          about={{
            shows: 'Tax revenue as a share of GDP against the OBR-central path.',
            caveats: 'Under the central closure the fall is too small; with closed capital the sign itself is not reliable. See the next card.',
          }}
        />
      </div>
      <div className="charts-stack stack-gap">
        <TaxGapCard sid={sid} />
      </div>
      <div className="charts-stack stack-gap">
        <SpendingRuleCard sid={sid} closure={closure} link={link} />
      </div>
    </>
  );
}
