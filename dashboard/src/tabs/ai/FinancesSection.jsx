'use client';

import Icon from '@/components/ab/Icon.jsx';
import { TipTarget } from '@/components/ab/Tip.jsx';
import { Unpublished } from '@/components/ab/Section.jsx';
import Card, { SectionHeading, IconLine } from '@/components/ui/Card.jsx';
import ControlBar, { RuleGroup } from '@/components/ui/ControlBar.jsx';
import { useNav, NavLink } from '@/lib/nav.jsx';
import { ruleLabel } from '@/lib/labels.js';
import {
  YEARS, HEADLINE_YEAR, LATE_YEAR, FIRST_YEAR, SURPRISE_YEAR, CENTRAL, BOUND, ARMS, CLOSURE_LABEL, result, ruleResult, ruleScenarios, scenarioById, gap, signed, fmt, SCEN_NAME,
} from '@/tabs/ai/surprise.js';
import { closuresFor, closureWords, contextLine, side } from '@/tabs/ai/lines.js';
import { PathCard } from '@/tabs/ai/ResultsTab.jsx';

// Results > Public finances: debt/GDP to the debt rule's first year,
// tax/GDP, why both are likely understated, and how the result changes with
// the fiscal rule. Every number from surprise2028.json through surprise.js;
// this is the one home of the tax/GDP and debt/GDP figures.

const LONG_YEARS = YEARS.filter((y) => y >= FIRST_YEAR && y <= LATE_YEAR);
const SHORT_YEARS = YEARS.filter((y) => y >= FIRST_YEAR && y <= HEADLINE_YEAR);
// The fiscal-rule ids of the control bar against the data file's keys
const RULE_KEY = { dn: 'debt_neutral', fixed: 'fixed_spending' };

// Scenarios whose main arm ends below the path by the debt rule's first year
// once debt is repriced at the speed the OBR assumes for UK debt (PR #43,
// docs/debt_repricing.md: both solved closures; UK high is solved at the
// central closure only). The model's own figure is above the path in both.
const BELOW_AT_OBR_SPEED = new Set(['uk_high', 'korinek']);

// The main arm's debt/GDP in words, by sign, for the closure in view. No
// claim about every arm: the lines and their end values show each one.
function debtFinding(sid, closure) {
  const cl = closure === 'closed' ? BOUND : CENTRAL;
  const a = gap(sid, 'tfp', cl, 'debt_gdp_pp', HEADLINE_YEAR);
  const b = gap(sid, 'tfp', cl, 'debt_gdp_pp', LATE_YEAR);
  if (a == null || b == null) return null;
  const at = (x) => (side(x) === 'on' ? 'on' : side(x));
  const same = at(a) === at(b);
  const obr = BELOW_AT_OBR_SPEED.has(sid) && at(b) === 'above';
  return `With automation + productivity${closure === 'closed' ? ' and closed capital' : ''}, debt/GDP is ${at(a)} the OBR-central path in ${HEADLINE_YEAR} and ${same ? 'still ' : ''}${at(b)} it by ${LATE_YEAR}, as the model reprices debt at the higher interest rate${obr ? ', but below it at the speed the OBR assumes for UK debt' : ''}.`;
}

// Tax/GDP with closed capital in the main arm, in words (results sanity
// audit A6): it can rise, so the model's sign there is not reliable.
function closedTaxWords(sid) {
  const r = result(sid, 'tfp', BOUND);
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

function TaxGapCard({ sid, closure }) {
  // The model's central-closure figure is the tax/GDP chart's end label
  // unless that chart is showing closed capital: each fact once.
  const onChart = closure !== 'closed';
  const closedTax = closedTaxWords(sid);
  const model = gap(sid, 'tfp', CENTRAL, 'tax_gdp_pp');
  const ls = gap(sid, 'tfp', CENTRAL, 'labour_share_pp');
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
              <NavLink tab="results" sub="economy" anchor="economy-prices">
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
              <NavLink tab="method" anchor="m-tax">
                How labour is taxed on Method
              </NavLink>
              ; data in <code>analysis/nics/nics_2028.json</code>.
            </li>
          </ul>
        ),
      }}
      method="limits"
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
            {onChart ? `Tax/GDP in ${HEADLINE_YEAR} with UK tax rates, about` : 'With UK tax rates, about'}
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
          ours={{ value: 15, text: 'flat rate' }}
          theirs={{ name: 'PolicyEngine-UK', value: 11, text: 'average' }}
          effect="Partly offsets the first row (smaller)"
        />
      </div>
      <IconLine icon="scale" className="net-line">
        <b>Net:</b> revenue losses are probably larger than shown.
      </IconLine>
    </Card>
  );
}

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
    <div className="table-wrap">
      <table className="data-table">
        <caption>
          {scenarioById(sid).label}, {ruleLabel('dn').toLowerCase()}, {HEADLINE_YEAR}, % difference from the OBR-central path
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
            {ARMS.map((a) => {
              const r = ruleResult(rule, sid, a.id, cl);
              return (
                <tr key={a.id}>
                  <th scope="row">{a.short || a.label}</th>
                  {RULE_VARS.map((c) => {
                    const x = at(r, c.v);
                    return (
                      <td key={c.v} className={`num${x == null ? '' : x > 0.005 ? ' is-gain' : x < -0.005 ? ' is-loss' : ''}`}>{fmt(x, 2)}</td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}

function ruleTable(rule, sid, closure) {
  const at = (r, v) => (r.status === 'done' ? r.gaps[v][YEARS.indexOf(HEADLINE_YEAR)] : null);
  return {
    columns: ['Closure', 'Arm', ...RULE_VARS.map((c) => `${c.label} (%)`)],
    rows: closuresFor(closure).flatMap((cl) => ARMS.map((a) => [CLOSURE_LABEL[cl], a.label, ...RULE_VARS.map((c) => at(ruleResult(rule, sid, a.id, cl), c.v))])),
  };
}

function FiscalRuleCard({ sid }) {
  const { st, set } = useNav();
  const rule = st.rule;
  const key = RULE_KEY[rule];
  const solved = key ? ruleScenarios(key) : [];
  const names = solved.map((s) => scenarioById(s).label).join(', ');
  const has = key && solved.includes(sid);
  return (
    <Card
      id="fiscal-rule"
      icon="sliders"
      title="How the result changes with the fiscal rule"
      finding={`Every other chart on Results uses the common fiscal rule. Choose another rule to see its own ${HEADLINE_YEAR} gaps.`}
      controls={
        <ControlBar label="Fiscal rule: options">
          <RuleGroup value={rule} onChange={(r) => set({ rule: r })} />
        </ControlBar>
      }
      logo={false}
      about={{
        shows: `The ${HEADLINE_YEAR} gaps in GDP, national income, the wage rate and consumption under the rule chosen, for the closure chosen at the top of the page.`,
        caveats: `Under debt-neutral transfers, debt/GDP stays on the OBR-central path to ${LATE_YEAR} by construction, so it has no gap to show. Fixed spending, the OBR’s convention, is not solved yet.`,
      }}
      aboutTitle="About this table"
      method="rules"
      download={has ? { title: `${HEADLINE_YEAR} gaps under ${ruleLabel(rule).toLowerCase()}`, context: () => contextLine(sid, st.closure), table: () => ruleTable(key, sid, st.closure) } : undefined}
    >
      {rule === 'common' ? (
        <p className="card-text rule-default">
          Under the common fiscal rule, government consumption and transfers follow GDP until the debt rule starts in {LATE_YEAR}. Its figures are the ones on Summary, Income and output and Economy.
        </p>
      ) : !has ? (
        <Unpublished>
          {ruleLabel(rule)} is solved for {names} only. Choose {names} under Scenario at the top of the page.
        </Unpublished>
      ) : (
        <RuleTable rule={key} sid={sid} closure={st.closure} />
      )}
    </Card>
  );
}

export default function FinancesSection({ sid }) {
  const { st } = useNav();
  const cl = closureWords(st.closure);
  const reading = `The zero line is the OBR-central path; the shaded year is ${HEADLINE_YEAR}, the headline year. Each line ends with its last value; hover, tap or use the arrow keys for other years.`;
  return (
    <>
      <SectionHeading id="public-finances" icon="landmark" title="Public finances">
        Debt and tax as shares of GDP under the common fiscal rule, {cl}, {SCEN_NAME[sid]}.
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
          finding={debtFinding(sid, st.closure) ?? undefined}
          markers={[{ year: SURPRISE_YEAR, label: 'AI shock' }, { year: LATE_YEAR, label: 'debt rule starts' }]}
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
                <NavLink tab="results" sub="finances" anchor="tax-gap">
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
        <TaxGapCard sid={sid} closure={st.closure} />
        <FiscalRuleCard sid={sid} />
      </div>
    </>
  );
}
