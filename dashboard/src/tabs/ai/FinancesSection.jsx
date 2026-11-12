'use client';

import { useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import Disclosure from '@/components/ab/Disclosure.jsx';
import ChartCard from '@/components/ab/ChartCard.jsx';
import LineChart from '@/components/LineChart.jsx';
import { TipTarget } from '@/components/ab/Tip.jsx';
import { SectionHeading, Unpublished } from '@/components/ab/Section.jsx';
import { ArmToggles } from '@/tabs/ai/Headline.jsx';
import {
  YEARS, HEADLINE_YEAR, LATE_YEAR, FIRST_YEAR, CENTRAL, ARMS, ARM_COLOR, ARM_LIGHT, result, signed,
} from '@/tabs/ai/surprise.js';

// Public finances, the last section of Results: debt/GDP to the debt rule's
// start, tax/GDP, why both are too small, and the spending rule. Every number
// from surprise2028.json through surprise.js; this is the one home of the
// tax/GDP and debt/GDP figures.

const LONG_YEARS = YEARS.filter((y) => y >= FIRST_YEAR && y <= LATE_YEAR);
const SHORT_YEARS = YEARS.filter((y) => y >= FIRST_YEAR && y <= HEADLINE_YEAR);

function seriesFor(sid, v, years, hidden) {
  return ARMS.filter((a) => !hidden[a.id]).flatMap((a) => {
    const r = result(sid, a.id, CENTRAL);
    if (r.status !== 'done') return [];
    return [{
      key: a.id,
      label: a.short || a.label,
      closure: 'central closure',
      color: ARM_COLOR[a.id],
      light: ARM_LIGHT[a.id],
      values: years.map((y) => r.gaps[v][YEARS.indexOf(y)]),
    }];
  });
}

function FiscalCard({ sid, hidden, v, years, title, icon, summary, about, markers, bands }) {
  const series = seriesFor(sid, v, years, hidden);
  return (
    <ChartCard icon={icon} title={title} summary={summary} unit="Percentage points of GDP, difference from the no-AI path" about={about}>
      {series.length ? (
        <LineChart
          x={years}
          series={series}
          height={280}
          endLabel="value"
          unit="pp"
          zeroLabel="no-AI path"
          markers={markers}
          bands={bands}
          tipTitle={title.split(',')[0]}
          valueFormat={(x) => signed(x, 2)}
          ariaLabel={`${title}, central closure, against the no-AI path`}
        />
      ) : (
        <Unpublished>No solve for this scenario yet.</Unpublished>
      )}
    </ChartCard>
  );
}

// Two bars on one scale: OG-UK's value against the UK's (a value or a range).
function BarPair({ max, unit, ours, theirs, what }) {
  const pct = (x) => `${((x / max) * 100).toFixed(2)}%`;
  const tip = (who, text, note) => (
    <>
      <b>{what}</b>
      <span>{who}</span>
      <span className="tip-value">{text}</span>
      {note ? <span className="tip-sub">{note}</span> : null}
    </>
  );
  return (
    <div className="bar-pair">
      <div className="bar-pair-scale" aria-hidden="true" data-axis="">
        <span>0</span>
        <span>
          {max}
          {unit === 'percentage points' ? 'pp' : '%'}
        </span>
      </div>
      <div className="bar-pair-row">
        <span className="bar-pair-name">OG-UK</span>
        <TipTarget className="bar-pair-track" label={`${what}, OG-UK: ${ours.text}`} tip={tip('OG-UK', ours.text, ours.note)}>
          <span className="bar-pair-bar is-ours" style={{ width: pct(ours.value) }} />
        </TipTarget>
        <span className="bar-pair-value">{ours.text}</span>
      </div>
      <div className="bar-pair-row">
        <span className="bar-pair-name">{theirs.name}</span>
        <TipTarget className="bar-pair-track" label={`${what}, ${theirs.name}: ${theirs.text}`} tip={tip(theirs.name, theirs.text, theirs.note)}>
          {theirs.lo != null ? (
            <>
              <span className="bar-pair-bar is-theirs" style={{ width: pct(theirs.lo) }} />
              <span className="bar-pair-range" style={{ left: pct(theirs.lo), width: pct(theirs.hi - theirs.lo) }} />
            </>
          ) : (
            <span className="bar-pair-bar is-theirs" style={{ width: pct(theirs.value) }} />
          )}
        </TipTarget>
        <span className="bar-pair-value">{theirs.text}</span>
      </div>
      <span className="visually-hidden">{unit}</span>
    </div>
  );
}

function TaxGapCard() {
  return (
    <div className="chart-card taxgap-card" id="tax-gap">
      <div className="chart-header">
        <h3>
          <Icon name="alert" size={16} />
          <span>Why the tax and debt figures are too small</span>
        </h3>
      </div>
      <p className="chart-description">
        When income shifts from wages to profits, revenue in the model falls less than it would in the UK, so the debt
        rise is understated.
      </p>
      <div className="taxgap-rows">
        <div className="taxgap-row">
          <div className="taxgap-label">
            <Icon name="scale" size={16} />
            <span>Tax-rate gap between labour and capital income</span>
          </div>
          <BarPair
            what="Labour minus capital effective tax rate"
            max={25}
            unit="percentage points"
            ours={{ value: 14, text: 'about 14pp', note: 'one income-tax schedule for both' }}
            theirs={{ name: 'OBR', lo: 19, hi: 23, text: '19–23pp', note: 'range across two OBR estimates' }}
          />
          <p className="taxgap-dir">
            <Icon name="arrowDown" size={14} className="dir-icon" />
            <span>A smaller gap means revenue falls too little as the labour share falls, so debt is understated.</span>
          </p>
        </div>
        <div className="taxgap-row">
          <div className="taxgap-label">
            <Icon name="receipt" size={16} />
            <span>Employer National Insurance</span>
          </div>
          <BarPair
            what="Employer National Insurance, % of labour cost"
            max={16}
            unit="per cent"
            ours={{ value: 15, text: '15% flat', note: 'tau_payroll on all labour income' }}
            theirs={{ name: 'PolicyEngine-UK', value: 11, text: 'about 11% average', note: '13.9% at the margin, 2028' }}
          />
          <p className="taxgap-dir">
            <Icon name="arrowUp" size={14} className="dir-icon" />
            <span>
              The flat 15% taxes labour more than the UK average does, which works the other way: it widens OG-UK&rsquo;s
              gap and so partly offsets the bias above. At the measured rate the gap would be narrower still.
            </span>
          </p>
        </div>
      </div>
      <Disclosure inCard title="Sources" preview="docs/red_flags_1_3.md · analysis/nics">
        <p className="disclosure-text">
          OG-UK taxes labour and capital income through one income-tax schedule (employee NICs inside it) and employer
          NICs as a flat 15% payroll tax. The OBR&rsquo;s labour–capital gap of 19–23pp and the OG-UK gap of about
          14pp are from <code>docs/red_flags_1_3.md</code>; the PolicyEngine-UK employer NICs rate (about 11% of
          labour cost on average, 13.9% at the margin, 2028) is from <code>analysis/nics/nics_2028.json</code>.
        </p>
      </Disclosure>
    </div>
  );
}

const RULES = [
  { id: 'default', label: 'Spending follows GDP' },
  { id: 'fixed_spending', label: 'Fixed spending' },
  { id: 'debt_neutral', label: 'Debt-neutral' },
];

function SpendingRuleCard() {
  const [rule, setRule] = useState('default');
  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>
          <Icon name="sliders" size={16} />
          <span>How the result changes with the spending rule</span>
        </h3>
      </div>
      <p className="chart-description">
        The alternative rules are shown as their difference from the default rule, so no figure above is repeated.
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
          This is the rule every other card on this dashboard uses: government consumption follows GDP, as the
          debt card notes.
        </p>
      ) : (
        <Unpublished>No solve for this rule yet. The {RULES.find((r) => r.id === rule).label.toLowerCase()} results will appear here once they are published.</Unpublished>
      )}
    </div>
  );
}

export default function FinancesSection({ sid, hidden, onToggle }) {
  return (
    <>
      <SectionHeading id="public-finances" icon="landmark" title="Public finances">
        Debt and tax as shares of GDP under the central closure, then why both are too small, then the spending rule.
      </SectionHeading>
      <ArmToggles hidden={hidden} onToggle={onToggle} />
      <div className="charts-grid">
        <FiscalCard
          sid={sid}
          hidden={hidden}
          v="debt_gdp_pp"
          years={LONG_YEARS}
          title={`Debt/GDP, ${FIRST_YEAR}–${LATE_YEAR}`}
          icon="landmark"
          summary={`End labels give ${LATE_YEAR}; hover or focus for ${HEADLINE_YEAR} and every other year. Government consumption follows GDP until the debt rule starts in ${LATE_YEAR}, so debt/GDP keeps moving after ${HEADLINE_YEAR}.`}
          markers={[{ year: LATE_YEAR, label: 'debt rule starts' }]}
          bands={[{ year: HEADLINE_YEAR }]}
          about={{ shows: `Public debt as a share of GDP against the path without AI, central closure. The shaded year is ${HEADLINE_YEAR}, the headline year.` }}
        />
        <FiscalCard
          sid={sid}
          hidden={hidden}
          v="tax_gdp_pp"
          years={SHORT_YEARS}
          title={`Tax/GDP, ${FIRST_YEAR}–${HEADLINE_YEAR}`}
          icon="receipt"
          summary={`End labels give ${HEADLINE_YEAR}; hover or focus for each year.`}
          bands={[{ year: HEADLINE_YEAR }]}
          about={{
            shows: 'Tax revenue as a share of GDP against the path without AI, central closure.',
            caveats: 'Too small a fall: see “Why the tax and debt figures are too small”, below.',
          }}
        />
      </div>
      <div className="charts-stack stack-gap">
        <TaxGapCard />
      </div>
      <div className="charts-stack stack-gap">
        <SpendingRuleCard />
      </div>
    </>
  );
}
