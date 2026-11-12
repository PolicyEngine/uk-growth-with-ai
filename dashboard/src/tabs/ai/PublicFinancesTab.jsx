'use client';

import { useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import VarCard from '@/components/ab/VarCard.jsx';
import Disclosure from '@/components/ab/Disclosure.jsx';
import { SectionHeading, Unpublished } from '@/components/ab/Section.jsx';
import { ArmTag, ARM_ICON } from '@/tabs/ai/Headline.jsx';
import {
  YEARS, HEADLINE_YEAR, LATE_YEAR, FIRST_YEAR, CENTRAL, ARMS, ARM_COLOR, result, gap, signed,
} from '@/tabs/ai/surprise.js';

// Public finances: debt/GDP to the debt rule's start, tax/GDP, what the tax
// system misses, and the spending-rule card. Every number from
// surprise2028.json through surprise.js; this tab is the one home of the
// tax/GDP and debt/GDP figures.

const LONG_YEARS = YEARS.filter((y) => y >= FIRST_YEAR && y <= LATE_YEAR);
const SHORT_YEARS = YEARS.filter((y) => y >= FIRST_YEAR && y <= HEADLINE_YEAR);

function card(sid, v, years, figYears, title, icon) {
  const lines = ARMS.flatMap((a) => {
    const r = result(sid, a.id, CENTRAL);
    if (r.status !== 'done') return [];
    return [{ key: a.id, label: a.label, color: ARM_COLOR[a.id], values: years.map((y) => r.gaps[v][YEARS.indexOf(y)]) }];
  });
  const figures = figYears.flatMap((y) =>
    ARMS.map((a) => {
      const x = gap(sid, a.id, CENTRAL, v, y);
      return {
        key: `${a.id}-${y}`,
        armIcon: ARM_ICON[a.id],
        color: ARM_COLOR[a.id],
        label: a.label,
        year: figYears.length > 1 ? y : null,
        raw: x,
        value: x == null ? 'pending' : `${signed(x, 2)}pp`,
      };
    }),
  );
  return <VarCard icon={icon} title={title} years={years} lines={lines} unit="pp" fmt={(x) => signed(x, 2)} figures={figures} />;
}

// Two bars on one scale: OG-UK's value against the UK's (a value or a range).
function BarPair({ max, unit, ours, theirs }) {
  const pct = (x) => `${((x / max) * 100).toFixed(2)}%`;
  return (
    <div className="bar-pair">
      <div className="bar-pair-row">
        <span className="bar-pair-name">OG-UK</span>
        <span className="bar-pair-track">
          <span className="bar-pair-bar is-ours" style={{ width: pct(ours.value) }} />
        </span>
        <span className="bar-pair-value">{ours.text}</span>
      </div>
      <div className="bar-pair-row">
        <span className="bar-pair-name">{theirs.name}</span>
        <span className="bar-pair-track">
          {theirs.lo != null ? (
            <>
              <span className="bar-pair-bar is-theirs" style={{ width: pct(theirs.lo) }} />
              <span className="bar-pair-range" style={{ left: pct(theirs.lo), width: pct(theirs.hi - theirs.lo) }} />
            </>
          ) : (
            <span className="bar-pair-bar is-theirs" style={{ width: pct(theirs.value) }} />
          )}
        </span>
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
          <BarPair max={25} unit="percentage points" ours={{ value: 14, text: 'about 14pp' }} theirs={{ name: 'OBR', lo: 19, hi: 23, text: '19–23pp' }} />
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
          <BarPair max={16} unit="per cent of labour cost" ours={{ value: 15, text: '15% flat' }} theirs={{ name: 'PolicyEngine-UK', value: 11, text: 'about 11% average' }} />
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
          This is the rule every other card on this dashboard uses: government consumption follows GDP, as noted
          under the debt and tax cards.
        </p>
      ) : (
        <Unpublished>No solve for this rule yet. The {RULES.find((r) => r.id === rule).label.toLowerCase()} results will appear here once they are published.</Unpublished>
      )}
    </div>
  );
}

export default function PublicFinancesTab({ sid }) {
  return (
    <>
      <SectionHeading id="debt-tax" icon="landmark" title="Debt and tax">
        Central closure, percentage points of GDP against the no-AI path. Hover or focus a chart for each year.
      </SectionHeading>
      <div className="headline-key grid-key">
        {ARMS.map((a) => (
          <ArmTag key={a.id} arm={a.id} label={a.label} />
        ))}
      </div>
      <div className="var-grid var-grid-2">
        {card(sid, 'debt_gdp_pp', LONG_YEARS, [HEADLINE_YEAR, LATE_YEAR], `Debt/GDP, ${FIRST_YEAR}–${LATE_YEAR}`, 'landmark')}
        {card(sid, 'tax_gdp_pp', SHORT_YEARS, [HEADLINE_YEAR], `Tax/GDP, ${FIRST_YEAR}–${HEADLINE_YEAR}`, 'receipt')}
      </div>
      <p className="note">
        <Icon name="calendar" size={14} />
        <span>
          Government consumption follows GDP until the debt rule starts in {LATE_YEAR}, so debt/GDP keeps moving after{' '}
          {HEADLINE_YEAR}.
        </span>
      </p>
      <div className="charts-stack stack-gap">
        <TaxGapCard />
      </div>

      <SectionHeading id="spending-rule" icon="sliders" title="Spending rule">
        What changes when government spending follows a different rule.
      </SectionHeading>
      <div className="charts-stack">
        <SpendingRuleCard />
      </div>
    </>
  );
}
