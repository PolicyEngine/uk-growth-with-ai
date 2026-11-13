'use client';

import Disclosure from '@/components/ab/Disclosure.jsx';
import LineChart from '@/components/LineChart.jsx';
import Card, { InfoCard, SectionHeading, StatTile, ViewNote } from '@/components/ui/Card.jsx';
import ControlBar, { ControlGroup, Segmented, SeriesChips, RuleGroup } from '@/components/ui/ControlBar.jsx';
import { useNav, WG_GROUPS } from '@/lib/nav.jsx';
import { ruleLabel } from '@/lib/labels.js';
import { GROUP_RAMP, ALL_GROUPS_COLOUR } from '@/lib/chartTheme.js';
import D from '@/data/cohorts2028.json';

// Who gains: consumption-equivalent welfare change by birth year and
// lifetime-earnings group, UK central only, from cohorts2028.json (written
// by paper/cohort_welfare.py --json). The headline is the share of adults
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
const tone = (x) => (Math.abs(x) < 0.005 ? null : x > 0 ? 'gain' : 'loss');

export function cell(closure, rule, arm) {
  return D.closures[closure].rules[rule][arm];
}

function Num({ x }) {
  return <b className={`num ${tone(x) === 'gain' ? 'is-gain' : tone(x) === 'loss' ? 'is-loss' : ''}`}>{pct(x)}</b>;
}

// The headline tiles. The share who lose is a range, not one figure: it
// moves with two accounting choices (whether bequests are valued, whether
// the later fiscal cost is charged to households).
export function Headline({ c, rule }) {
  const ch = rule === 'dn' ? c.charged : null;
  const s = c.sources_alive;
  const all = [c.alive_losing_pct, c.no_bequest_losing_pct, ...(ch ? [...ch.joint_losing_pct, ...ch.no_bequest_losing_pct] : [])];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const young = c.all_lose_up_to_age;
  const ages = ch?.oldest_losing_on_average;
  return (
    <div className="stat-row cols-4">
      <StatTile icon="usersRound" name={`Adults who lose`} value={`${lo < 1 ? 'Under 1%' : `${Math.round(lo)}%`} to ${Math.round(hi)}%`} sub={`Share of adults alive in ${D.shock_year}, depending on the measure`}>
        <dl className="stat-rows">
          <div>
            <dt>As modelled</dt>
            <dd>{share(c.alive_losing_pct)}</dd>
          </div>
          <div>
            <dt>If bequests are not valued</dt>
            <dd>{share(c.no_bequest_losing_pct)}</dd>
          </div>
          {ch ? (
            <>
              <div>
                <dt>With the fiscal cost after 2035 charged</dt>
                <dd>{shareRange(ch.joint_losing_pct)}</dd>
              </div>
              <div>
                <dt>With both</dt>
                <dd>{shareRange(ch.no_bequest_losing_pct)}</dd>
              </div>
            </>
          ) : null}
        </dl>
      </StatTile>
      <StatTile
        icon="baby"
        name="Who loses, by age"
        value={young ? (young === 20 ? 'Age 20' : `Up to age ${young}`) : ages ? `Up to age ${ages[0] === ages[1] ? ages[0] : `${ages[0]}–${ages[1]}`}` : 'The youngest'}
        sub={
          young
            ? `Every adult this age or younger in ${D.shock_year} loses, as modelled`
            : ages
              ? `Adults this age or younger in ${D.shock_year} lose on average once the later fiscal cost is charged`
              : 'Losses, where there are any, fall on the youngest adults: they have the most working years ahead and the least wealth'
        }
      >
        <p className="stat-line">Older adults gain: they hold more wealth and collect the higher return on it.</p>
      </StatTile>
      <StatTile icon="scale" name="Average change" value={pct(c.alive_avg)} tone={tone(c.alive_avg)} sub="Of remaining-lifetime consumption and bequests, adults alive">
        <dl className="stat-rows">
          <div>
            <dt>If bequests are not valued</dt>
            <dd>{pct(c.no_bequest_alive_avg)}</dd>
          </div>
          {ch ? (
            <div>
              <dt>And the later fiscal cost charged</dt>
              <dd>{ch.no_bequest_avg[0].toFixed(2) === ch.no_bequest_avg[1].toFixed(2) ? pct(ch.no_bequest_avg[0]) : `${pct(ch.no_bequest_avg[0])} to ${pct(ch.no_bequest_avg[1])}`}</dd>
            </div>
          ) : null}
        </dl>
      </StatTile>
      <StatTile icon="pie" name="Where it comes from" value={pct(s.capital)} tone={tone(s.capital)} sub="From capital income, at unchanged behaviour">
        <dl className="stat-rows">
          <div>
            <dt>From labour income</dt>
            <dd>{pct(s.labour)}</dd>
          </div>
        </dl>
      </StatTile>
    </div>
  );
}

function Why({ cl, rule, arm }) {
  const C = D.closures[cl];
  const c = cell(cl, rule, arm);
  const prof = C.profile_2028;
  const tr = c.income_2028_35_age45.transfers;
  const [bot, top] = [c.alive_by_group[0], c.alive_by_group[6]];
  return (
    <div className="cards-grid">
      <InfoCard icon="cart" title="Consumption dips first, then recovers">
        <p>
          The return on capital rises and the wage rate is lower than on the OBR-central path. Households save more at first, so aggregate
          consumption starts below the path.{' '}
          {c.first_year_c_above
            ? `It moves above the path from ${c.first_year_c_above}, which longer-lived and later cohorts see more of.`
            : 'In this arm it stays below the path through 2085.'}{' '}
          The assets households carry forward, and so their bequests, rise with the return, and fewer hours count as extra leisure.
        </p>
      </InfoCard>
      <InfoCard icon="briefcase" title="By earnings group: a property of the model">
        <p>
          The bottom 25% of lifetime earners change by <Num x={bot} /> and the top 1% by <Num x={top} />. This ranking is a property of
          the model, not a finding about the UK: it follows from the model&rsquo;s evenly spread wealth and equal transfers.
        </p>
        <p>
          Wages are {plain(prof.labour[0])} of the bottom group&rsquo;s gross income against {plain(prof.labour[6])} of the top
          1%&rsquo;s, and transfers are the same amount per head in every group. The bottom 25% hold {plain(prof.wealth_share[0])} of
          household wealth and earn {plain(prof.earnings_share[0])} of labour income. In the model the top tenth by wealth hold{' '}
          {plain(C.wealth_concentration.top_tenth_pct)} of wealth, against 43% in ONS data for 2018–20.
        </p>
      </InfoCard>
      <InfoCard icon="landmark" title="Who pays the fiscal cost">
        {rule === 'dn' ? (
          <p>
            With debt-neutral transfers, households pay for the shock&rsquo;s effect on the public finances through lower transfers until
            the debt rule starts in 2036. For a 45-year-old over 2028–35 that costs {plain(Math.abs(tr[0]), 1)} of consumption in the
            bottom group and {plain(Math.abs(tr[6]), 1)} in the top 1%. From 2036 the adjustment falls on government consumption, which
            households do not value in the model.
          </p>
        ) : (
          <p>
            Under the common fiscal rule, transfers stay a fixed share of GDP and the public debt absorbs the fiscal effect, which no
            cohort repays in the model. Choose debt-neutral transfers under Fiscal rule to charge it to households.
          </p>
        )}
      </InfoCard>
      <InfoCard icon="users" title="Young adults bear the stress test">
        <p>
          With no output gain, the wage rate is lower still and there is less extra income to share. Young adults have most of their
          working lives ahead and little wealth to gain from a higher return; older adults collect the higher return.
        </p>
      </InfoCard>
    </div>
  );
}

export default function WhoGainsTab() {
  const { st, set } = useNav();
  const arm = st.arm;
  const rule = st.wrule;
  const cl = st.closure === 'closed' ? 'zk0' : 'zk0.1';
  const C = D.closures[cl];
  const c = cell(cl, rule, arm);
  const x = C.birth_year;
  const items = [
    ...GROUP_LABELS.map((label, j) => ({ id: String(j), label, color: GROUP_RAMP[j] })),
    { id: 'all', label: 'All groups', color: ALL_GROUPS_COLOUR, dashed: true },
  ];
  const series = items
    .filter((it) => st.groups.includes(it.id))
    .map((it) => ({ ...it, key: it.id, values: it.id === 'all' ? c.cev_all : c.cev.map((r) => r[Number(it.id)]) }));
  const armLabel = ARMS.find((a) => a.id === arm).label;
  const clWords = cl === 'zk0' ? 'closed capital' : 'central closure';
  const p = c.parts_alive;

  return (
    <>
      <SectionHeading id="who-gains" icon="usersRound" title="Who gains, who loses">
        Welfare by birth year and lifetime-earnings group when AI arrives as a surprise in {D.shock_year}.
      </SectionHeading>
      <ViewNote icon="lock">
        This tab is solved for <b>UK central</b> only, so the Scenario picker is fixed here.
        {st.closure === 'both' ? ' It draws one closure at a time: with Both chosen it shows the central closure.' : ''}
      </ViewNote>
      <ControlBar label="Who gains: options">
        <ControlGroup label="Arm">
          <Segmented options={ARMS} value={arm} onChange={(a) => set({ arm: a })} label="Arm" />
        </ControlGroup>
        <RuleGroup value={rule} onChange={(r) => set({ wrule: r })} only={['dn', 'common']} />
      </ControlBar>
      <Headline c={c} rule={rule} />
      <div className="card fold-only">
        <Disclosure inCard title="The same average by form" preview="Consumption · Leisure · Bequests">
          <p className="card-text">
            With one part at a time on the scenario path: consumption <Num x={p.consumption} />, leisure <Num x={p.leisure} />, bequests{' '}
            <Num x={p.bequests} />. The parts need not add up to the total, and they show how households take the change, not where it
            comes from.
          </p>
        </Disclosure>
      </div>
      <div className="cards-stack stack-gap">
        <Card
          id="welfare-chart"
          icon="lineChart"
          title="Welfare change by birth year"
          finding={`${armLabel}, ${ruleLabel(rule).toLowerCase()}, ${clWords}. Cohorts to the left of the marker are adults in ${D.shock_year}; those to the right enter later.`}
          unit="Consumption-equivalent change, % of remaining-lifetime consumption and bequests"
          controls={
            <ControlBar label="Welfare chart: options">
              <ControlGroup label="Earnings groups">
                <SeriesChips items={items} shown={st.groups} onChange={(groups) => set({ groups: WG_GROUPS.filter((g) => groups.includes(g)) })} label="Earnings groups shown" />
              </ControlGroup>
            </ControlBar>
          }
          about={{
            shows: (
              <p>
                For each birth year and lifetime-earnings group, the constant percentage change in consumption and bequests on the
                OBR-central path, in every remaining year, that leaves the household as well off as in the scenario. Labour is held at the
                OBR-central path. Cohorts born up to {LAST_ALIVE} are adults in {D.shock_year} and count only their remaining lives; later
                cohorts count their whole lives.
              </p>
            ),
            how: (
              <p>
                From the household paths of the OG-UK solves, using the model&rsquo;s own utility, discount factor, survival rates and
                growth adjustment. The reference is the OBR-central path, restarted in 2028 without the shock at the same closure.
                Household consumption reproduces the aggregate consumption gap of every solve in every year 2028–2036.
              </p>
            ),
            definitions: (
              <p>
                Earnings groups are percentiles of lifetime earnings, not income deciles. Consumption-only figures, which scale consumption
                alone, are a sensitivity in the paper. The figures with the fiscal cost after 2035 charged are a first-order estimate, not
                a model run.
              </p>
            ),
            caveats: (
              <p>
                The model has no job loss and spreads wealth more evenly than UK data, and it places a value on leaving bequests; the share
                of adults who lose is sensitive to all three. Cohorts born after 2011 depend slightly (up to {c.fill_max_pp.toFixed(2)}{' '}
                percentage points) on how the solved path is extended past 2085.
              </p>
            ),
            sources: <p>{D.source}, paper/cohort_welfare.py.</p>,
          }}
          method="welfare"
          download={{
            title: 'Welfare change by birth year',
            context: () => `UK central · ${armLabel} · ${ruleLabel(rule)} · ${clWords}`,
            table: () => ({ columns: ['Birth year', ...series.map((s) => `${s.label} (%)`)], rows: x.map((yr, i) => [yr, ...series.map((s) => s.values[i])]) }),
            legend: () => [],
          }}
        >
          {series.length ? (
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
              markers={[{ year: LAST_ALIVE + 1, label: `Enter after ${D.shock_year}` }]}
            />
          ) : (
            <div className="unpublished-plot">
              <p>Every group is hidden. Choose one under Earnings groups above.</p>
            </div>
          )}
        </Card>
      </div>
      <SectionHeading id="who-why" icon="compass" title="Why">
        What drives the pattern. The last card applies to the stress-test arm.
      </SectionHeading>
      <Why cl={cl} rule={rule} arm={arm} />
    </>
  );
}
