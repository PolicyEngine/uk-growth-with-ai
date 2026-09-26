'use client';

// How AI enters OG-UK: the channels the runs change, the ones they cannot,
// and how each is represented. Rendered on the Adding AI to OG-UK tab, step 2.

const CHANNELS = [
  {
    channel: 'Automation',
    what: 'Tasks move from labour to capital',
    oguk: <>
      &gamma;, the capital weight in production, rises over the window and lowers the labour share one for
      one (step 1).
    </>,
    status: 'in',
  },
  {
    channel: 'Productivity',
    what: 'AI makes production more efficient',
    oguk: <>
      Z, total factor productivity, rises from 1 to a value solved for each scenario&rsquo;s target
      (steps 4&ndash;5).
    </>,
    status: 'in',
  },
  {
    channel: 'Capital accumulation',
    what: 'Investment responds to the higher return',
    oguk: <>Endogenous: households save and the capital stock builds; not imposed.</>,
    status: 'in',
  },
  {
    channel: 'Adoption and diffusion',
    what: 'How fast firms take AI up',
    oguk: <>Not separate &mdash; folded into the ramps of &gamma; and Z.</>,
    status: 'partial',
  },
  {
    channel: 'Unemployment and search',
    what: 'Displaced workers take time to find new jobs',
    oguk: <>Absent: no unemployment or search frictions.</>,
    status: 'out',
  },
  {
    channel: 'New tasks for people',
    what: 'AI creates work as well as replacing it',
    oguk: <>Absent.</>,
    status: 'out',
  },
  {
    channel: 'Which goods get cheaper',
    what: 'Spending shifts toward what AI cannot do',
    oguk: <>Absent: the runs have one sector.</>,
    status: 'out',
  },
];

const BADGE = {
  in: { label: 'modelled', cls: 'ch-in' },
  partial: { label: 'partly', cls: 'ch-partial' },
  out: { label: 'not modelled', cls: 'ch-out' },
};

const GROUPS = [
  { title: 'Modelled', rows: CHANNELS.filter((c) => c.status === 'in') },
  { title: 'Partly or not modelled', rows: CHANNELS.filter((c) => c.status !== 'in') },
];

export default function AiChannels() {
  return (
    <div className="growth-block">
      <div className="table-wrap">
        <table className="comparison-table channels-table">
          <thead>
            <tr>
              <th>Channel</th>
              <th>What it means</th>
              <th>How OG-UK represents it</th>
            </tr>
          </thead>
          {GROUPS.map((g) => (
            <tbody key={g.title}>
              <tr className="group-row">
                <th colSpan={3} scope="colgroup">
                  {g.title} ({g.rows.length})
                </th>
              </tr>
              {g.rows.map((c) => (
                <tr key={c.channel}>
                  <td>
                    <b>{c.channel}</b>
                    <span className={`ch-badge ${BADGE[c.status].cls}`}>{BADGE[c.status].label}</span>
                  </td>
                  <td>{c.what}</td>
                  <td>{c.oguk}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}
