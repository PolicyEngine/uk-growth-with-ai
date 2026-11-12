'use client';

import { useState } from 'react';
import LineChart from '@/components/LineChart.jsx';
import ChartCard from '@/components/ab/ChartCard.jsx';
import { SectionHeading, Unpublished } from '@/components/ab/Section.jsx';
import {
  YEARS, HEADLINE_YEAR, LATE_YEAR, FIRST_YEAR, CENTRAL, BOUND, ARMS, ARM_COLOR, result, gap, signed,
} from '@/tabs/ai/surprise.js';

// Public finances: debt/GDP to the debt rule's start, tax/GDP, what the tax
// system misses, and the spending-rule card. Every number from
// surprise2028.json through surprise.js; this tab is the one home of the
// tax/GDP and debt/GDP figures.

const LONG_YEARS = YEARS.filter((y) => y >= FIRST_YEAR && y <= LATE_YEAR);
const SHORT_YEARS = YEARS.filter((y) => y >= FIRST_YEAR && y <= HEADLINE_YEAR);

function seriesFor(sid, v, years) {
  return ARMS.flatMap((a) =>
    [CENTRAL, BOUND].flatMap((cl) => {
      const r = result(sid, a.id, cl);
      if (r.status !== 'done') return [];
      const vals = years.map((y) => r.gaps[v][YEARS.indexOf(y)]);
      return [{
        key: `${a.id}-${cl}`,
        label: cl === CENTRAL ? a.label : 'Closed capital',
        color: ARM_COLOR[a.id],
        dashed: cl === BOUND,
        values: vals,
      }];
    }),
  );
}

const pp = (x) => (x == null ? 'pending' : `${signed(x, 2)}pp`);

function Legend({ series }) {
  return (
    <div className="legend-chips">
      {series.map((s) => (
        <span key={s.key} className="legend-chip">
          <span className={`swatch${s.dashed ? ' dashed' : ''}`} style={{ borderTopColor: s.color }} aria-hidden="true" />
          {s.dashed ? `${ARMS.find((a) => s.key.startsWith(a.id)).label}, closed capital` : `${s.label}, central`}
        </span>
      ))}
    </div>
  );
}

function sentence(sid, v, years) {
  const parts = ARMS.map((a) => {
    const vals = years.map((y) => gap(sid, a.id, CENTRAL, v, y));
    if (vals.some((x) => x == null)) return `${a.label}: pending`;
    return `${a.label}: ${years.map((y, i) => `${pp(vals[i])} in ${y}`).join(', ')}`;
  });
  return parts;
}

function DebtCard({ sid }) {
  const series = seriesFor(sid, 'debt_gdp_pp', LONG_YEARS);
  const parts = sentence(sid, 'debt_gdp_pp', [HEADLINE_YEAR, LATE_YEAR]);
  return (
    <ChartCard
      icon="landmark"
      title={`Debt/GDP, ${FIRST_YEAR}–${LATE_YEAR}`}
      summary={
        <>
          Central closure. {parts.map((p, i) => (
            <span key={i}>
              <b>{p}</b>
              {i < parts.length - 1 ? '. ' : '.'}
            </span>
          ))}
        </>
      }
      unit="Percentage points against the no-AI path"
      legend={series.length ? <Legend series={series} /> : null}
      about={{
        shows: `Debt as a share of GDP, against the path without AI. ${HEADLINE_YEAR} is the headline year; the debt rule starts in ${LATE_YEAR}.`,
        how: `Government consumption is a fixed share of GDP until the debt rule starts in ${LATE_YEAR}, so debt/GDP keeps moving after ${HEADLINE_YEAR}.`,
      }}
    >
      {series.length ? (
        <LineChart
          x={LONG_YEARS}
          series={series}
          height={300}
          noValue
          bands={[{ year: HEADLINE_YEAR, label: 'Headline' }, { year: LATE_YEAR, label: 'Debt rule' }]}
          valueFormat={(x) => `${signed(x, 2)}pp`}
          ariaLabel={`Debt to GDP against the no-AI path, ${FIRST_YEAR} to ${LATE_YEAR}`}
        />
      ) : (
        <Unpublished>No solve for this scenario yet.</Unpublished>
      )}
    </ChartCard>
  );
}

function TaxCard({ sid }) {
  const series = seriesFor(sid, 'tax_gdp_pp', SHORT_YEARS);
  const parts = sentence(sid, 'tax_gdp_pp', [HEADLINE_YEAR]);
  return (
    <ChartCard
      icon="landmark"
      title={`Tax/GDP, ${FIRST_YEAR}–${HEADLINE_YEAR}`}
      summary={
        <>
          Central closure. {parts.map((p, i) => (
            <span key={i}>
              <b>{p}</b>
              {i < parts.length - 1 ? '. ' : '.'}
            </span>
          ))}
        </>
      }
      unit="Percentage points against the no-AI path"
      legend={series.length ? <Legend series={series} /> : null}
      about={{
        shows: 'Tax revenue as a share of GDP, against the path without AI.',
        caveats: 'OG-UK’s tax system understates how much revenue falls when income shifts from labour to capital; see “What the tax system misses” below.',
      }}
    >
      {series.length ? (
        <LineChart
          x={SHORT_YEARS}
          series={series}
          height={300}
          noValue
          bands={[{ year: HEADLINE_YEAR }]}
          valueFormat={(x) => `${signed(x, 2)}pp`}
          ariaLabel={`Tax to GDP against the no-AI path, ${FIRST_YEAR} to ${HEADLINE_YEAR}`}
        />
      ) : (
        <Unpublished>No solve for this scenario yet.</Unpublished>
      )}
    </ChartCard>
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
        <h3>How the result changes with the spending rule</h3>
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
          Government consumption follows GDP until the debt rule starts in {LATE_YEAR}. Every other card on this
          dashboard uses this rule.
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
        Debt and tax as shares of GDP, against the path without AI.
      </SectionHeading>
      <div className="charts-grid">
        <DebtCard sid={sid} />
        <TaxCard sid={sid} />
      </div>
      <div className="charts-stack stack-gap">
        <div className="chart-card">
          <div className="chart-header">
            <h3>What the tax system misses</h3>
          </div>
          <p className="chart-description">
            Revenue in OG-UK falls too little when income shifts from labour to capital, so the tax and debt figures
            above understate the fiscal cost of a fall in the labour share.
          </p>
          <dl className="fact-list">
            <div className="fact-head"><span>In OG-UK</span><span>In the UK</span></div>
            <div>
              <dt>Labour and capital income are taxed through one income-tax schedule; the gap between their effective rates is about 14pp.</dt>
              <dd>The OBR puts the gap between the effective rates on labour and capital income at 19–23pp.</dd>
            </div>
            <div>
              <dt>Employer NICs are a flat 15% of labour cost.</dt>
              <dd>PolicyEngine-UK puts the average employer NICs rate at about 11%.</dd>
            </div>
          </dl>
        </div>
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
