'use client';

import Disclosure from '@/components/ab/Disclosure.jsx';
import Icon from '@/components/ab/Icon.jsx';
import LineChart from '@/components/LineChart.jsx';
import Card, { InfoCard, SectionHeading, StatTile } from '@/components/ui/Card.jsx';
import { Items, KeyFacts, WhyChain } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import { gap, HEADLINE_YEAR } from '@/tabs/ai/surprise.js';
import { side } from '@/tabs/ai/lines.js';
import { Dir, Lead } from '@/tabs/explore/direction.jsx';
import ControlBar, { ControlGroup, Segmented, SeriesChips, RuleGroup } from '@/components/ui/ControlBar.jsx';
import { useNav, WG_GROUPS, NavLink } from '@/lib/nav.jsx';
import { ruleLabel } from '@/lib/labels.js';
import { GROUP_RAMP, ALL_GROUPS_COLOUR } from '@/lib/chartTheme.js';
import D from '@/data/cohorts2028.json';

// Who gains: consumption-equivalent welfare change by birth year and
// lifetime-earnings group, UK central only, from cohorts2028.json (written
// by paper/cohort_welfare.py --json). With Closure = Both, the tiles and the
// chart show each closure (two rows, two panels on one y-axis); the Why
// cards stay at the central closure. The headline is the share of adults
// who lose, as a range over the measure, and their ages; then the average
// and where it comes from; then the chart; then why. The ranking by
// earnings group is a detail under Why, with its caveat.

export const ARMS = [
  { id: 'tfp', label: 'Automation + productivity', short: 'Automation + productivity' },
  { id: 'zfixed', label: 'Automation, technology unchanged', short: 'Technology unchanged' },
  { id: 'stress', label: 'OBR-style stress test: no output gain', short: 'Stress test' },
];
export const GROUP_LABELS = ['Bottom 25%', '25th–50th', '50th–70th', '70th–80th', '80th–90th', '90th–99th', 'Top 1%'];
const LAST_ALIVE = D.shock_year - 20; // youngest adult in the shock year

const minus = (s) => s.replace('-', '−');
export const pct = (x, dp = 2) => (x == null ? 'n/a' : minus(`${x > 0 ? '+' : ''}${x.toFixed(dp)}%`));
const plain = (x, dp = 0) => `${x.toFixed(dp)}%`;
// A share of adults: whole per cent, or "under 1%" (never "0%" for a few)
const share = (x) => (x <= 0 ? 'none' : x < 1 ? 'under 1%' : `${Math.round(x)}%`);
const shareRange = ([lo, hi]) => (Math.round(lo) === Math.round(hi) ? share(lo) : `${Math.round(lo)}–${Math.round(hi)}%`);
// The tile's range over the measures, worded as its rows are: a true zero is
// "none" (so the range reads "up to"), a few is "under 1%".
export const tileRange = (lo, hi) => {
  const cap = (t) => t[0].toUpperCase() + t.slice(1);
  if (hi < 1 || Math.round(lo) === Math.round(hi)) return cap(share(hi));
  if (lo <= 0) return `Up to ${Math.round(hi)}%`;
  return `${lo < 1 ? 'Under 1%' : `${Math.round(lo)}%`} to ${Math.round(hi)}%`;
};
const tone = (x) => (Math.abs(x) < 0.005 ? null : x > 0 ? 'gain' : 'loss');

// Age in the shock year of the adult cohort with the largest change, in words.
export function peakWords(c) {
  const xs = D.closures[Object.keys(D.closures)[0]].birth_year;
  let best = -1;
  c.cev_all.forEach((v, i) => {
    if (xs[i] <= LAST_ALIVE && (best < 0 || v > c.cev_all[best])) best = i;
  });
  const age = D.shock_year - xs[best];
  return age >= 60 && age <= 70 ? 'around retirement age' : `around age ${age}`;
}

// Change for the youngest adult cohort in the shock year.
const youngest = (c) => {
  const xs = D.closures[Object.keys(D.closures)[0]].birth_year;
  return c.cev_all[xs.lastIndexOf(LAST_ALIVE)];
};

export function cell(closure, rule, arm) {
  return D.closures[closure].rules[rule][arm];
}

function Num({ x }) {
  return <b className={`num ${tone(x) === 'gain' ? 'is-gain' : tone(x) === 'loss' ? 'is-loss' : ''}`}>{pct(x)}</b>;
}

// The main arm solved with debt-neutral transfers kept on to the horizon,
// measured against a no-shock path solved under the same rule (the paper's
// "solved to the horizon" row, UK central, central closure). Read from the
// `dnfull` block of cohorts2028.json, which paper/cohort_welfare.py --json
// writes once that block is committed: {ready, closure, rule, arm, range:
// {joint_losing_pct, no_bequest_losing_pct, ...: [low, high] over the two
// extensions past the last solved year]}}. Until the block is in the data,
// or while it is not ready, this returns null and nothing renders.
export function dnfullFor(cl, rule, arm) {
  const x = D.dnfull;
  return x?.ready && x.closure === cl && x.rule === rule && x.arm === arm ? x : null;
}

// The headline tiles. The share who lose is a range, not one figure: it
// moves with two accounting choices (whether bequests are valued, whether
// the later fiscal cost is charged to households).
// Where the solved-to-the-horizon block exists for this cell it replaces the
// first-order charge-back (its own note says so), so only one is shown.
export function Headline({ c, rule, cl, arm }) {
  const full = dnfullFor(cl, rule, arm);
  const ch = rule === 'dn' && !full ? c.charged : null;
  const fills = full ? Object.values(full.by_fill ?? {}) : [];
  const fullAges = fills.length ? [Math.min(...fills.map((f) => f.oldest_losing_on_average)), Math.max(...fills.map((f) => f.oldest_losing_on_average))] : null;
  const s = c.sources_alive;
  const all = [
    c.alive_losing_pct,
    c.no_bequest_losing_pct,
    ...(ch ? [...ch.joint_losing_pct, ...ch.no_bequest_losing_pct] : []),
    ...(full ? [...full.range.joint_losing_pct, ...full.range.no_bequest_losing_pct] : []),
  ];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const young = c.all_lose_up_to_age;
  const ages = fullAges ?? ch?.oldest_losing_on_average;
  return (
    <div className="stat-row cols-4">
      <StatTile icon={iconFor('households')} name={`Adults who lose`} value={tileRange(lo, hi)} sub={`Share of adults alive in ${D.shock_year}, depending on the measure`}>
        <dl className="stat-rows">
          <div>
            <dt>
              <Lead c="model">As modelled</Lead>
            </dt>
            <dd>{share(c.alive_losing_pct)}</dd>
          </div>
          <div>
            <dt>
              <Lead c="bequests">If bequests are not valued</Lead>
            </dt>
            <dd>{share(c.no_bequest_losing_pct)}</dd>
          </div>
          {ch ? (
            <>
              <div>
                <dt>
              <Lead c="provisional">With the fiscal cost after 2035 charged, first order</Lead>
            </dt>
                <dd>{shareRange(ch.joint_losing_pct)}</dd>
              </div>
              <div>
                <dt>
              <Lead c="range">With both, first order</Lead>
            </dt>
                <dd>{shareRange(ch.no_bequest_losing_pct)}</dd>
              </div>
            </>
          ) : null}
          {full ? (
            <>
              <div data-dnfull="">
                <dt>
              <Lead c="benefits">With transfers bearing the later fiscal cost, solved to the horizon</Lead>
            </dt>
                <dd>{shareRange(full.range.joint_losing_pct)}</dd>
              </div>
              <div data-dnfull="">
                <dt>
              <Lead c="range">With both, solved to the horizon</Lead>
            </dt>
                <dd>{shareRange(full.range.no_bequest_losing_pct)}</dd>
              </div>
            </>
          ) : null}
        </dl>
      </StatTile>
      <StatTile
        icon={iconFor('young')}
        name="Who loses, by age"
        value={young ? (young === 20 ? 'Age 20' : `Up to age ${young}`) : ages ? `Up to age ${ages[0] === ages[1] ? ages[0] : `${ages[0]}–${ages[1]}`}` : 'The youngest'}
        sub={
          young
            ? `Every adult this age or younger in ${D.shock_year} loses, as modelled`
            : ages
              ? full
                ? `Adults this age or younger in ${D.shock_year} lose on average with transfers bearing the later fiscal cost, solved to the horizon`
                : `Adults this age or younger in ${D.shock_year} lose on average once the later fiscal cost is charged (first-order estimate, not a model run)`
              : 'Losses, where there are any, fall on the youngest adults: they have the most working years ahead and the least wealth'
        }
      >
        <p className="stat-line">
          <Lead c="age">The gain is largest for adults {peakWords(c)}, who hold more wealth and collect the higher return on it.</Lead>
        </p>
      </StatTile>
      <StatTile icon={iconFor('measure')} name="Average change" value={pct(c.alive_avg)} tone={tone(c.alive_avg)} sub="Of remaining-lifetime consumption and bequests, adults alive">
        <dl className="stat-rows">
          <div>
            <dt>
              <Lead c="bequests">If bequests are not valued</Lead>
            </dt>
            <dd>{pct(c.no_bequest_alive_avg)}</dd>
          </div>
          {full ? (
            <div data-dnfull="">
              <dt>
              <Lead c="benefits">And transfers bearing the later fiscal cost, solved to the horizon</Lead>
            </dt>
              <dd>{full.range.no_bequest_avg[0].toFixed(2) === full.range.no_bequest_avg[1].toFixed(2) ? pct(full.range.no_bequest_avg[0]) : `${pct(full.range.no_bequest_avg[0])} to ${pct(full.range.no_bequest_avg[1])}`}</dd>
            </div>
          ) : null}
          {ch ? (
            <div>
              <dt>
              <Lead c="finances">And the later fiscal cost charged</Lead>
            </dt>
              <dd>{ch.no_bequest_avg[0].toFixed(2) === ch.no_bequest_avg[1].toFixed(2) ? pct(ch.no_bequest_avg[0]) : `${pct(ch.no_bequest_avg[0])} to ${pct(ch.no_bequest_avg[1])}`}</dd>
            </div>
          ) : null}
        </dl>
      </StatTile>
      <StatTile icon={iconFor('inequality')} name="Where it comes from" value={pct(s.capital)} tone={tone(s.capital)} sub="From capital income, at unchanged behaviour">
        <dl className="stat-rows">
          <div>
            <dt>
              <Lead c="labour">From labour income</Lead>
            </dt>
            <dd>{pct(s.labour)}</dd>
          </div>
        </dl>
      </StatTile>
    </div>
  );
}

// The aggregate signs behind the Why cards, from the same OG-UK solves
// (surprise2028.json, UK central, headline year): the interest rate and the
// wage rate for the arm, closure and rule in view, and aggregate consumption
// in the shock year (cohorts2028.json). Every direction word and arrow on
// the cards is computed from these signs.
const SURPRISE_ARM = { tfp: 'tfp', zfixed: 'tz', stress: 'ss' };
export function whySigns(cl, rule, arm) {
  const c = cell(cl, rule, arm);
  const g = (a, v) => gap('uk_central', SURPRISE_ARM[a], cl, v, HEADLINE_YEAR, rule);
  return {
    r: g(arm, 'r_bp'),
    w: g(arm, 'w'),
    c0: c.c_gap[String(D.shock_year)],
    cAbove: c.first_year_c_above,
    young: youngest(cell(cl, rule, 'stress')),
    stressW: g('stress', 'w'),
    tfpW: g('tfp', 'w'),
  };
}

// The consumption card: a why chain whose every direction is the data's.
export function consumptionChain(x) {
  return [
    x.r == null ? null : { key: 'r', icon: 'interestRate', dir: x.r, text: `Return on capital ${x.r > 0 ? 'rises' : 'falls'}` },
    x.w == null ? null : { key: 'w', icon: 'pay', dir: x.w, text: `Wage rate ${side(x.w) === 'on' ? 'on' : side(x.w)} the path` },
    { key: 's', icon: 'households', text: `Households ${x.c0 < 0 ? 'save more' : 'spend more'} at first` },
    { key: 'c', icon: 'consumption', dir: x.c0, text: `Consumption starts ${side(x.c0) === 'on' ? 'on' : side(x.c0)} the path` },
  ].filter(Boolean);
}
const withDir = (l) => ({ ...l, text: l.dir == null ? l.text : <><Dir x={l.dir} />{l.text}</> });

function Why({ cl, rule, arm }) {
  const C = D.closures[cl];
  const c = cell(cl, rule, arm);
  const prof = C.profile_2028;
  const tr = c.income_2028_35_age45.transfers;
  const [bot, top] = [c.alive_by_group[0], c.alive_by_group[6]];
  const x = whySigns(cl, rule, arm);
  const title = x.c0 < 0 ? (x.cAbove ? 'Consumption dips first, then recovers' : 'Consumption dips and stays below') : 'Consumption starts above the path';
  return (
    <div className="cards-grid is-top">
      <InfoCard icon={iconFor('consumption')} title={title}>
        <WhyChain className="ex-chain" label="Why consumption starts where it does" links={consumptionChain(x).map(withDir)} />
        <Items
          items={[
            x.cAbove
              ? { key: 'later', icon: 'gapUp', text: `Above the path from ${x.cAbove}: longer-lived and later cohorts see more` }
              : { key: 'later', icon: 'gapDown', text: 'In this arm it stays below the path through 2085' },
            { key: 'bequests', icon: 'bequests', text: 'Assets carried forward, and so bequests, rise with the return' },
            { key: 'leisure', icon: 'leisure', text: 'Fewer hours count as extra leisure' },
          ]}
        />
      </InfoCard>
      <InfoCard icon={iconFor('lifetimeEarnings')} title="By earnings group: a property of the model">
        <KeyFacts
          className="ex-facts"
          facts={[
            { key: 'bot', icon: 'lifetimeEarnings', value: <Num x={bot} />, label: 'Bottom 25% of lifetime earners' },
            { key: 'top', icon: 'lifetimeEarnings', value: <Num x={top} />, label: 'Top 1%' },
          ]}
        />
        <Items
          items={[
            { key: 'model', icon: 'limit', text: 'Ranking: a property of the model, not a finding about the UK' },
            { key: 'why', icon: 'why', text: 'It follows from evenly spread wealth and equal transfers' },
            { key: 'wages', icon: 'labour', text: `Wages: ${plain(prof.labour[0])} of bottom-group gross income, ${plain(prof.labour[6])} for the top 1%` },
            { key: 'transfers', icon: 'benefits', text: 'Transfers: the same amount per head in every group' },
            { key: 'wealth', icon: 'capital', text: `Bottom 25%: ${plain(prof.wealth_share[0])} of household wealth, ${plain(prof.earnings_share[0])} of labour income` },
            { key: 'top10', icon: 'inequality', text: `Model: the top tenth by wealth hold ${plain(C.wealth_concentration.top_tenth_pct)} of wealth` },
            { key: 'ons', icon: 'data', text: 'ONS data for 2018–20: 43%' },
          ]}
        />
      </InfoCard>
      <InfoCard icon={iconFor('finances')} title="Who pays the fiscal cost">
        {rule === 'dn' ? (
          <>
            <Items
              items={[
                { key: 'dn', icon: 'benefits', text: 'Debt-neutral: households pay through lower transfers until 2036' },
                { key: 'cost', icon: 'age', text: 'Cost to a 45-year-old over 2028–35, share of consumption:' },
              ]}
            />
            <KeyFacts
              className="ex-facts"
              facts={[
                { key: 'bot', icon: 'lifetimeEarnings', value: plain(Math.abs(tr[0]), 1), label: 'Bottom group' },
                { key: 'top', icon: 'lifetimeEarnings', value: plain(Math.abs(tr[6]), 1), label: 'Top 1%' },
              ]}
            />
            <Items
              items={[
                { key: 'gap', icon: 'compare', text: 'That narrows the gap between them but does not reverse it' },
                { key: 'later', icon: 'finances', text: 'From 2036 government consumption adjusts instead' },
                { key: 'value', icon: 'excluded', text: 'Households do not value government consumption in the model' },
              ]}
            />
          </>
        ) : (
          <Items
            items={[
              { key: 'share', icon: 'benefits', text: 'Common rule: transfers stay a fixed share of GDP' },
              { key: 'debt', icon: 'debt', text: 'Public debt absorbs the fiscal effect; no cohort repays it' },
              { key: 'pick', icon: 'rule', text: 'Pick debt-neutral transfers under Fiscal rule to charge households' },
            ]}
          />
        )}
      </InfoCard>
      <InfoCard icon={iconFor('young')} title="The stress test by age">
        <Items
          items={[
            x.stressW == null || x.tfpW == null
              ? null
              : { key: 'w', icon: 'pay', text: `No output gain: the wage rate is ${x.stressW < x.tfpW ? 'lower still' : 'no lower'}` },
            { key: 'young', icon: 'young', text: <><Dir x={x.young} />{`The youngest adults ${x.young < 0 ? 'lose' : 'gain least'} in this arm`}</> },
            { key: 'why', icon: 'why', text: 'They have most of their working lives ahead and little wealth' },
          ].filter(Boolean)}
        />
      </InfoCard>
    </div>
  );
}

const CL_WORDS = { 'zk0.1': 'central closure', zk0: 'closed capital' };
const CL_HEAD = { 'zk0.1': { icon: iconFor('foreign'), text: 'Central closure' }, zk0: { icon: iconFor('closedCapital'), text: 'Closed capital' } };

export default function WhoGainsTab() {
  const { st, set } = useNav();
  const arm = st.arm;
  const rule = st.wrule;
  const both = st.closure === 'both';
  const cl = st.closure === 'closed' ? 'zk0' : 'zk0.1';
  const cls = both ? ['zk0.1', 'zk0'] : [cl];
  const C = D.closures[cl];
  const c = cell(cl, rule, arm);
  const x = C.birth_year;
  const items = [
    ...GROUP_LABELS.map((label, j) => ({ id: String(j), label, color: GROUP_RAMP[j] })),
    { id: 'all', label: 'All groups', color: ALL_GROUPS_COLOUR, dashed: true },
  ];
  const seriesAt = (k) => {
    const ck = cell(k, rule, arm);
    return items
      .filter((it) => st.groups.includes(it.id))
      .map((it) => ({ ...it, key: it.id, values: it.id === 'all' ? ck.cev_all : ck.cev.map((r) => r[Number(it.id)]) }));
  };
  const panels = cls.map((k) => ({ cl: k, series: seriesAt(k) }));
  const series = panels[0].series;
  // one y-axis for both panels, so their heights compare
  const ys = panels.flatMap((pn) => pn.series.flatMap((s) => s.values)).filter(Number.isFinite);
  const yDomain = both && ys.length ? [Math.min(...ys), Math.max(...ys)] : null;
  const armLabel = ARMS.find((a) => a.id === arm).label;
  const clWords = both ? 'central closure and closed capital' : CL_WORDS[cl];
  const p = c.parts_alive;

  return (
    <>
      <SectionHeading id="who-gains" icon={iconFor('welfare')} title="Welfare by birth year and earnings group">
        Consumption-equivalent change for each birth year and lifetime-earnings group when AI arrives as a surprise in {D.shock_year}.
      </SectionHeading>
      <Items
        className="ex-view-note"
        items={[
          {
            key: 'only',
            icon: 'scenario',
            text: (
              <>
                Who gains shows <b>UK central</b> only: the Scenario picker is fixed here
              </>
            ),
          },
          { key: 'paper', icon: 'source', text: 'The paper also reports Korinek et al. (upper), debt-neutral only' },
          { key: 'data', icon: 'data', text: 'Its cohort paths are not yet in this site’s data' },
          both ? { key: 'both', icon: 'closure', text: 'With Both, the figures and the chart show each closure' } : null,
          both ? { key: 'why', icon: 'caveat', text: 'The reasons below are for the central closure' } : null,
        ]}
      />
      <ControlBar label="Who gains: options">
        <ControlGroup label="Arm">
          <Segmented options={ARMS} value={arm} onChange={(a) => set({ arm: a })} label="Arm" />
        </ControlGroup>
        <RuleGroup value={rule} onChange={(r) => set({ wrule: r })} only={['common', 'dn']} />
      </ControlBar>
      {both ? (
        cls.map((k) => (
          <div key={k} className="wg-closure">
            <h3 className="wg-closure-title">
              <Icon name={CL_HEAD[k].icon} size={16} /> {CL_HEAD[k].text}
            </h3>
            <Headline c={cell(k, rule, arm)} rule={rule} cl={k} arm={arm} />
          </div>
        ))
      ) : (
        <Headline c={c} rule={rule} cl={cl} arm={arm} />
      )}
      <div className="card fold-only">
        <Disclosure inCard title="The same average by form" preview="Consumption · Leisure · Bequests">
          <KeyFacts
            className="ex-facts"
            facts={[
              { key: 'c', icon: 'consumption', value: <Num x={p.consumption} />, label: 'Consumption' },
              { key: 'l', icon: 'leisure', value: <Num x={p.leisure} />, label: 'Leisure' },
              { key: 'b', icon: 'bequests', value: <Num x={p.bequests} />, label: 'Bequests' },
            ]}
          />
          <Items
            items={[
              { key: 'one', icon: 'scenario', text: 'One part at a time on the scenario path' },
              { key: 'sum', icon: 'caveat', text: 'The parts need not add up to the total' },
              { key: 'how', icon: 'households', text: 'They show how households take the change, not its source' },
              both ? { key: 'cl', icon: 'foreign', text: 'Central closure' } : null,
            ]}
          />
        </Disclosure>
      </div>
      <div className="cards-stack stack-gap">
        <Card
          id="welfare-chart"
          icon={iconFor('path')}
          title="Welfare change by birth year"
          finding={<Lead c="canSay">{`${armLabel}, ${ruleLabel(rule).toLowerCase()}, ${clWords}. Left of the marker: adults in ${D.shock_year}; right: later cohorts.`}</Lead>}
          unit={<Lead c="measure">Consumption-equivalent change, % of remaining-lifetime consumption and bequests</Lead>}
          controls={
            <ControlBar label="Welfare chart: options">
              <ControlGroup label="Earnings groups">
                <SeriesChips items={items} shown={st.groups} onChange={(groups) => set({ groups: WG_GROUPS.filter((g) => groups.includes(g)) })} label="Earnings groups shown" />
              </ControlGroup>
            </ControlBar>
          }
          about={{
            shows: (
              <Items
                items={[
                  { key: 'cev', icon: 'consumption', text: 'Constant % change in consumption and bequests, every remaining year' },
                  { key: 'path', icon: 'onPath', text: 'On the OBR-central path, it leaves the household as well off' },
                  { key: 'labour', icon: 'labour', text: 'Labour is held at the OBR-central path' },
                  { key: 'alive', icon: 'age', text: `Born up to ${LAST_ALIVE}: adults in ${D.shock_year}, remaining lives only` },
                  { key: 'later', icon: 'young', text: 'Later cohorts count their whole lives' },
                ]}
              />
            ),
            how: (
              <Items
                items={[
                  { key: 'paths', icon: 'model', text: 'From the household paths of the OG-UK solves' },
                  { key: 'own', icon: 'measure', text: 'The model’s own utility, discounting, survival and growth adjustment' },
                  { key: 'ref', icon: 'onPath', text: 'Reference: the OBR-central path, restarted in 2028 without the shock' },
                  { key: 'check', icon: 'data', text: 'Household consumption matches every solve’s aggregate gap, 2028–2036' },
                ]}
              />
            ),
            definitions: (
              <Items
                items={[
                  { key: 'groups', icon: 'lifetimeEarnings', text: 'Earnings groups: percentiles of lifetime earnings, not income deciles' },
                  { key: 'conly', icon: 'consumption', text: 'Consumption-only figures are a sensitivity in the paper' },
                  { key: 'first', icon: 'provisional', text: 'Post-2035 fiscal cost charged: a first-order estimate, not a model run' },
                  ...(D.dnfull?.ready
                    ? [
                        { key: 'full', icon: 'model', text: 'Main arm, central closure: solved to the horizon instead, a model run' },
                        { key: 'tr', icon: 'benefits', text: 'Transfers, not government consumption, hold debt/GDP on the path' },
                        { key: 'ref', icon: 'compare', text: 'Against a no-shock path solved under the same rule' },
                      ]
                    : []),
                ]}
              />
            ),
            caveats: (
              <Items
                items={[
                  { key: 'job', icon: 'excluded', text: 'The model has no job loss' },
                  { key: 'wealth', icon: 'inequality', text: 'It spreads wealth more evenly than UK data' },
                  { key: 'beq', icon: 'bequests', text: 'It places a value on leaving bequests' },
                  { key: 'sens', icon: 'range', text: 'The share of adults who lose is sensitive to all three' },
                  { key: 'assets', icon: 'interestRate', text: 'No asset prices: revaluing existing assets is left out' },
                  { key: 'old', icon: 'age', text: 'So that is not in the gain to older adults' },
                  { key: 'fill', icon: 'young', text: `Born after 2011: up to ${c.fill_max_pp.toFixed(2)} percentage points from extending past 2085` },
                ]}
              />
            ),
            sources: <Lead c="source">{`${D.source}, paper/cohort_welfare.py.`}</Lead>,
          }}
          method="welfare"
          download={{
            title: 'Welfare change by birth year',
            context: () => `UK central · ${armLabel} · ${ruleLabel(rule)} · ${clWords}`,
            table: () => ({
              columns: ['Birth year', ...panels.flatMap((pn) => pn.series.map((s) => `${s.label}${both ? `, ${CL_WORDS[pn.cl]}` : ''} (%)`))],
              rows: x.map((yr, i) => [yr, ...panels.flatMap((pn) => pn.series.map((s) => s.values[i]))]),
            }),
            legend: () => series.map((s) => ({ label: s.label, color: s.color, dashed: s.dashed })),
          }}
        >
          {series.length ? (
            <div className={both ? 'wg-panels' : undefined}>
              {panels.map((pn) => (
                <figure key={pn.cl} className="wg-panel">
                  {both ? (
                    <figcaption className="wg-panel-title" data-panel-title="">
                      <Icon name={CL_HEAD[pn.cl].icon} size={14} /> {CL_HEAD[pn.cl].text}
                    </figcaption>
                  ) : null}
                  <LineChart
                    x={x}
                    series={pn.series.map((s) => ({ ...s, closure: CL_WORDS[pn.cl] }))}
                    height={both ? 320 : 380}
                    noEndLabels
                    dots={false}
                    yUnit="% change"
                    xUnit="Birth year"
                    unit="%"
                    yDomain={yDomain}
                    valueFormat={(v) => minus(`${v > 0 ? '+' : ''}${v.toFixed(2)}`)}
                    tipTitle="Born"
                    ariaLabel={`Welfare change by birth year and earnings group, ${armLabel}, ${CL_WORDS[pn.cl]}`}
                    markers={[{ year: LAST_ALIVE + 1, label: `Enter after ${D.shock_year}` }]}
                  />
                </figure>
              ))}
            </div>
          ) : (
            <div className="unpublished-plot">
              <p>Every group is hidden. Choose one under Earnings groups above.</p>
            </div>
          )}
        </Card>
      </div>
      <SectionHeading id="who-why" icon={iconFor('why')} title="What drives the result">
        The results behind the pattern; the last card is the stress test. Why age matters:{' '}
        <NavLink tab="method" sub="how" anchor="m-generations">
          Method, many generations at once
        </NavLink>
        .
      </SectionHeading>
      <Why cl={both ? 'zk0.1' : cl} rule={rule} arm={arm} />
    </>
  );
}
