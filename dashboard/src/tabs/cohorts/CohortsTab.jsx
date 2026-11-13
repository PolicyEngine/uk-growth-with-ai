'use client';

import { useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import ChartCard from '@/components/ab/ChartCard.jsx';
import InfoCard from '@/components/ab/InfoCard.jsx';
import { SectionHeading, Note } from '@/components/ab/Section.jsx';
import LineChart from '@/components/LineChart.jsx';
import D from '@/data/cohorts2028.json';

// Cohorts tab: consumption-equivalent welfare change by birth year and
// lifetime-earnings group, UK central, from cohorts2028.json (written by
// paper/cohort_welfare.py --json). Each fact is stated once: the headline
// gives the averages, the chart the cohort detail, the cards the reasons.

export const ARMS = [
  { id: 'tfp', label: 'Automation + productivity', icon: 'trend' },
  { id: 'zfixed', label: 'Automation, technology unchanged', icon: 'arrowLeftRight' },
  { id: 'stress', label: 'OBR-style stress test: no output gain', icon: 'alert' },
];
export const CLOSURES = [
  { id: 'zk0.1', label: 'Central', math: '(ζK = 0.1)', icon: 'globe' },
  { id: 'zk0', label: 'Closed capital', math: '(ζK = 0)', icon: 'lock' },
];
export const RULES = [
  { id: 'dn', label: 'Debt-neutral transfers', note: 'headline', icon: 'scale' },
  { id: 'common', label: 'Common fiscal rule', note: 'comparison', icon: 'landmark' },
];
export const GROUP_LABELS = ['Bottom 25%', '25th–50th', '50th–70th', '70th–80th', '80th–90th', '90th–99th', 'Top 1%'];
// Ordinal: light-to-dark from the bottom to the top earnings group.
const GROUP_COLORS = ['#e8590c', '#d6336c', '#ae3ec9', '#7048e8', '#4263eb', '#1c7ed6', '#0b3c6e'];
const ALL_COLOR = 'var(--pe-gray-800)';
const LAST_ALIVE = D.shock_year - 20; // youngest adult in 2028 (born 2008)

const minus = (s) => s.replace('-', '−');
export const pct = (x, dp = 2) => (x == null ? 'n/a' : minus(`${x > 0 ? '+' : ''}${x.toFixed(dp)}%`));
const plain = (x, dp = 0) => `${x.toFixed(dp)}%`;

export function cell(closure, rule, arm) {
  return D.closures[closure].rules[rule][arm];
}

function Seg({ label, options, value, onChange, aria }) {
  return (
    <div className="closure-select">
      <span className="closure-select-label">{label}</span>
      <div className="seg" role="radiogroup" aria-label={aria}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            className={`seg-option${value === o.id ? ' is-on' : ''}`}
            onClick={() => onChange(o.id)}
          >
            {o.icon ? <Icon name={o.icon} size={13} /> : null}
            <span>{o.label}</span>
            {o.math ? <span className="seg-math">{o.math}</span> : null}
            {o.note ? <span className="seg-math">({o.note})</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function Num({ x }) {
  const name = Math.abs(x) < 0.005 ? 'minus' : x > 0 ? 'arrowUp' : 'arrowDown';
  return (
    <span className="num">
      <Icon name={name} size={13} className="dir-icon" />
      {pct(x)}
    </span>
  );
}

// The headline: who gains, who loses, for the chosen arm, closure and rule.
export function Headline({ c }) {
  const [bot, top] = [c.alive_by_group[0], c.alive_by_group[6]];
  const p = c.parts_alive;
  const lose = c.alive_losing_pct;
  return (
    <div className="takeaway">
      <p>
        <b>Adults alive in {D.shock_year}:</b> welfare <Num x={c.alive_avg} /> on average, as a share of their remaining
        consumption and bequests.{' '}
        {lose === 0 ? 'None of them lose.' : lose < 0.5 ? 'Fewer than 1 in 200 of them lose.' : `${plain(lose)} of them lose.`}
      </p>
      <p>
        <b>By earnings:</b> the bottom 25% <Num x={bot} />, the top 1% <Num x={top} />.{' '}
        <b>By form:</b> consumption <Num x={p.consumption} />, leisure <Num x={p.leisure} />, bequests <Num x={p.bequests} />.
      </p>
    </div>
  );
}

function Legend({ hidden, onToggle }) {
  const items = [...GROUP_LABELS.map((l, j) => ({ id: String(j), label: l, color: GROUP_COLORS[j] })), { id: 'all', label: 'All groups', color: ALL_COLOR, dashed: true }];
  return (
    <div className="headline-key" role="group" aria-label="Show or hide an earnings group">
      {items.map((it) => (
        <button key={it.id} type="button" className="legend-toggle" aria-pressed={!hidden[it.id]} onClick={() => onToggle(it.id)}>
          <span className={`arm-tag${hidden[it.id] ? ' is-off' : ''}`}>
            <span className={`swatch${it.dashed ? ' dashed' : ''}`} style={{ borderTopColor: it.color }} aria-hidden="true" />
            <span>{it.label}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

// Youngest-born and oldest-born cohorts alive in 2028 whose all-groups CEV is negative.
// Returns [first, last, every] where `every` says all cohorts in between lose.
export function losersBorn(c, x) {
  const idx = x.map((b, i) => i).filter((i) => x[i] <= LAST_ALIVE && c.cev_all[i] < 0);
  if (!idx.length) return null;
  const [i0, i1] = [Math.min(...idx), Math.max(...idx)];
  return [x[i0], x[i1], idx.length === i1 - i0 + 1];
}

function Why({ cl, rule, arm }) {
  const C = D.closures[cl];
  const c = cell(cl, rule, arm);
  const prof = C.profile_2028;
  const tr = c.income_2028_35_age45.transfers;
  const stress = cell(cl, rule, 'stress');
  const sl = losersBorn(stress, C.birth_year);
  return (
    <div className="card-grid cols-2">
      <InfoCard icon="cart" title="Consumption dips first, then recovers">
        <p>
          The return on capital rises and the wage falls. Households save more at first, so aggregate consumption starts
          below the OBR-central path.{' '}
          {c.first_year_c_above
            ? `It moves above the path from ${c.first_year_c_above}, which longer-lived and later cohorts see more of.`
            : 'In this arm it stays below the path through 2085.'}{' '}
          The assets households carry forward, and so their bequests, rise with the return, and fewer hours count as extra leisure.
        </p>
      </InfoCard>
      <InfoCard icon="briefcase" title="Lower earners rely less on wages">
        <p>
          The wage falls, and wages are {plain(prof.labour[0])} of the bottom group&rsquo;s gross income against{' '}
          {plain(prof.labour[6])} of the top 1%&rsquo;s. Transfers are the same amount per head in every group.
        </p>
        <p>
          Wealth is spread more evenly than earnings: the bottom 25% hold {plain(prof.wealth_share[0])} of household wealth
          and earn {plain(prof.earnings_share[0])} of labour income. In the model the wealthiest tenth hold{' '}
          {plain(C.wealth_concentration.top_tenth_pct)} of wealth, against 43% in ONS data for 2018–20, so a higher return
          reaches lower earners more than it would in the UK.
        </p>
      </InfoCard>
      <InfoCard icon="landmark" title="Who pays the fiscal cost">
        {rule === 'dn' ? (
          <p>
            With debt-neutral transfers, households pay for the shock&rsquo;s effect on the public finances through lower
            transfers until the debt rule starts in 2036. For a 45-year-old over 2028–35 that costs {plain(Math.abs(tr[0]), 1)}{' '}
            of consumption in the bottom group and {plain(Math.abs(tr[6]), 1)} in the top 1%. That narrows the gap between them
            but does not reverse it. From 2036 the adjustment falls on government consumption, which households do not
            value in the model.
          </p>
        ) : (
          <p>
            Under the common rule, transfers stay a fixed share of GDP and the public debt absorbs the fiscal effect, which no
            cohort repays in the model. Switch to debt-neutral transfers to charge it to households.
          </p>
        )}
      </InfoCard>
      <InfoCard icon="users" title="Young adults bear the stress test">
        <p>
          With no output gain, the wage falls more and there is less extra income to share.{' '}
          {sl
            ? `Here, ${sl[2] ? 'every' : 'most'} cohort${sl[2] ? '' : 's'} born ${sl[0]}–${sl[1]} lose${sl[2] ? 's' : ''} on average across groups: they have most of their working lives ahead and little wealth to gain from a higher return.`
            : 'Here, no cohort loses on average across groups.'}
        </p>
      </InfoCard>
    </div>
  );
}

export default function CohortsTab({ sid = 'uk_central' }) {
  const [arm, setArm] = useState('tfp');
  const [cl, setCl] = useState('zk0.1');
  const [rule, setRule] = useState('dn');
  const [hidden, setHidden] = useState({ 1: true, 3: true, 4: true, 5: true });
  const C = D.closures[cl];
  const c = cell(cl, rule, arm);
  const x = C.birth_year;
  const series = [
    ...GROUP_LABELS.map((label, j) => ({ id: String(j), label, color: GROUP_COLORS[j], values: c.cev.map((r) => r[j]) })),
    { id: 'all', label: 'All groups', color: ALL_COLOR, dashed: true, values: c.cev_all },
  ].filter((s) => !hidden[s.id]);
  const armLabel = ARMS.find((a) => a.id === arm).label;
  const clLabel = CLOSURES.find((o) => o.id === cl);
  const ruleLabel = RULES.find((o) => o.id === rule).label;

  return (
    <>
      <SectionHeading id="cohorts" icon="usersRound" title="Who gains, who loses">
        Welfare by birth year and lifetime-earnings group when AI arrives as a surprise in {D.shock_year}.
      </SectionHeading>
      {sid !== 'uk_central' ? (
        <Note>Cohort results exist for UK central only, so this tab shows UK central whatever scenario is chosen above.</Note>
      ) : null}
      <div className="cohort-controls">
        <Seg label="Arm" aria="Arm" options={ARMS} value={arm} onChange={setArm} />
        <Seg label="Closure" aria="Capital closure" options={CLOSURES} value={cl} onChange={setCl} />
        <Seg label="Fiscal rule" aria="Who bears the fiscal cost" options={RULES} value={rule} onChange={setRule} />
      </div>
      <Headline c={c} />
      <div className="charts-stack">
        <ChartCard
          icon="usersRound"
          title="Welfare change by birth year"
          summary={`${armLabel}, UK central, ${clLabel.label.toLowerCase()} closure ${clLabel.math}, ${ruleLabel.toLowerCase()}.`}
          unit="Consumption-equivalent change, % of remaining-lifetime consumption and bequests"
          legend={<Legend hidden={hidden} onToggle={(id) => setHidden((h) => ({ ...h, [id]: !h[id] }))} />}
          about={{
            shows: (
              <p>
                For each birth year and lifetime-earnings group, the constant percentage change in consumption and bequests on
                the OBR-central path, in every remaining year, that leaves the household as well off as in the scenario. Labour
                is held at the OBR-central path. Cohorts born up to {LAST_ALIVE} are adults in {D.shock_year} and count only their remaining lives; later
                cohorts count their whole lives.
              </p>
            ),
            how: (
              <p>
                From the household paths of the OG-UK solves, using the model&rsquo;s own utility, discount factor, survival
                rates and growth adjustment. The reference is the OBR-central path, restarted in 2028 without the shock at the same closure. Household consumption
                reproduces the aggregate consumption gap of every solve in every year 2028–2036.
              </p>
            ),
            definitions: (
              <p>
                Earnings groups are percentiles of lifetime earnings, not income deciles. Consumption-only figures, which scale
                consumption alone, are a sensitivity in the paper.
              </p>
            ),
            caveats: (
              <p>
                Transfers are equal per head and wealth is spread more evenly than in the UK. Cohorts born after 2011 depend
                slightly (up to {c.fill_max_pp.toFixed(2)} percentage points) on how the solved path is extended past 2085.
              </p>
            ),
            sources: <p>{D.source}, paper/cohort_welfare.py.</p>,
          }}
        >
          <LineChart
            x={x}
            series={series}
            height={380}
            noEndLabels
            dots={false}
            yUnit="% change"
            unit="%"
            valueFormat={(v) => minus(`${v > 0 ? '+' : ''}${v.toFixed(2)}`)}
            tipTitle="Born"
            ariaLabel={`Welfare change by birth year and earnings group, ${armLabel}`}
            markers={[{ year: LAST_ALIVE + 1, label: `Enter after ${D.shock_year} →` }]}
          />
        </ChartCard>
      </div>
      <SectionHeading id="cohorts-why" icon="info" title="Why" />
      <Why cl={cl} rule={rule} arm={arm} />
    </>
  );
}
