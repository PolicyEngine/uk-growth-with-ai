'use client';

// How AI enters OG-UK: the channels we change, the ones we cannot, and how
// each source's scenario maps onto them. Shown on the UK growth with AI tab
// before the results, so the method is read before the numbers.

const CHANNELS = [
  {
    channel: 'Automation',
    what: 'Tasks move from labour to capital',
    oguk: <>
      <code>gamma</code>, the capital weight in production, ramps <b>0.35 → 0.389</b> over 2026–2030.
      At &epsilon;&nbsp;=&nbsp;1 the labour share is exactly 1&minus;&gamma;, so this is a
      <b> 3.9pp</b> labour-share fall (65% → 61.1%).
    </>,
    status: 'in',
  },
  {
    channel: 'Productivity',
    what: 'AI makes production more efficient',
    oguk: <>
      <code>Z</code>, total factor productivity, ramps from 1.0 to a solved terminal value.
      Anthropic arm: solved so the joint &gamma;&nbsp;+&nbsp;Z change is Anthropic&rsquo;s
      <b> +3.1%</b> measured TFP. OBR arm: solved for no productivity gain at fixed inputs.
    </>,
    status: 'in',
  },
  {
    channel: 'Capital accumulation',
    what: 'Investment responds to the higher return',
    oguk: <>Endogenous: households save and the capital stock builds. Not imposed.</>,
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
    oguk: <>Absent. OG-UK has no labour-market frictions, so it cannot speak to displacement.</>,
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
    oguk: <>Absent in these runs, which are 1-sector. The 8-sector build carries it but is not used here.</>,
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

// Rendered in UK growth with AI › How the scenarios are built, step 2.
export default function AiChannels({ showHeading = true }) {
  return (
    <div className="growth-block">
      {showHeading && (
        <>
          <h3 className="growth-subhead">How AI enters the model</h3>
          <p className="growth-lede">
            OG-UK has no AI parameter. We represent AI through two production parameters and let the rest
            of the economy respond. Both parameters ramp gradually over 2026&ndash;2030; in 2026 they are at
            their baseline values.
          </p>
        </>
      )}

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
