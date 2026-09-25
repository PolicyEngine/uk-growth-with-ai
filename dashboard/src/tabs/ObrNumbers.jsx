'use client';

// The OG-UK no-AI baseline checked against the OBR March 2026 EFO.
// Lifted verbatim from the methodology narrative's step 9 so it can
// stand as its own sub-tab; numbers and notes unchanged.
export default function ObrNumbers() {
  return (
    <div className="obrv-wrap" dangerouslySetInnerHTML={{ __html: BODY }} />
  );
}

const BODY = `<p class="obrv-lede">The no-AI baseline that every scenario on the results tab is measured against, checked against the OBR&rsquo;s March 2026 EFO.</p>
              <table class="obrv-table">
                <thead>
                  <tr>
                    <th style="width:38%">Measure</th>
                    <th>OBR<span class="obrv-th2">EFO March 2026</span></th>
                    <th>OG-UK<span class="obrv-th2">no-AI baseline</span></th>
                    <th>gap</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><b>Real GDP growth, 2027&ndash;30 average</b><span class="obrv-sub2">the headline test</span></td>
                    <td><b>1.60%</b> <span class="obrv-sub2">&para;1.9</span></td>
                    <td><b>1.67%</b></td>
                    <td class="obrv-good">+0.07pp</td>
                  </tr>
                  <tr>
                    <td>Productivity growth, medium term</td>
                    <td>1.0% <span class="obrv-sub2">&para;1.2</span></td>
                    <td>1.1% <code>g_y</code></td>
                    <td class="obrv-warn">+0.10pp</td>
                  </tr>
                  <tr>
                    <td>Labour supply growth by 2030</td>
                    <td>0.5% <span class="obrv-sub2">&para;1.2</span></td>
                    <td>0.63% <code>g_n</code></td>
                    <td class="obrv-warn">+0.13pp</td>
                  </tr>
                  <tr>
                    <td><b>Potential output growth, 2030</b></td>
                    <td><b>1.5%</b> <span class="obrv-sub2">&para;2.10</span></td>
                    <td><b>1.73%</b></td>
                    <td class="obrv-bad">+0.23pp</td>
                  </tr>
                  <tr>
                    <td>Potential output growth, 2026</td>
                    <td>1.2% <span class="obrv-sub2">&para;2.10</span></td>
                    <td>1.85%</td>
                    <td class="obrv-bad">+0.65pp</td>
                  </tr>
                  <tr>
                    <td>Labour share of income</td>
                    <td>&mdash; not published</td>
                    <td>65.0%</td>
                    <td>&mdash;</td>
                  </tr>
                </tbody>
              </table>

              <div class="obrv-note"><b>Verdict: good on the headline, not on the components.</b> Real GDP growth matches to <b>+0.07pp</b>, which is a genuine validation. But OG-UK runs hot on <b>both</b> underlying components &mdash; productivity by 0.10pp and labour supply by 0.13pp &mdash; so potential output growth is 1.73% against the OBR&rsquo;s 1.5%. The headline agrees because transition dynamics happen to pull realised growth back down. <b>That is a coincidence, not an agreement</b>, and this table should travel with the 1.67% wherever it is quoted.</div>

              <div class="obrv-flag"><b>One of the two gaps is a sourcing error, not a judgement call.</b> OG-UK documents <code>g_y_annual = 1.1%</code> as OBR <i>potential output</i> growth, but OG-Core defines that parameter as <i>labour-augmenting technological change</i> &mdash; productivity growth. The OBR separates them explicitly: productivity 1.0% + labour supply 0.5% = potential output 1.5%. Since OG-UK already carries labour-force growth in <code>g_n</code>, the current setting <b>double-counts labour supply</b>. Setting <code>g_y_annual = 0.010</code> brings implied potential output growth to 1.63%, close to the OBR&rsquo;s 1.5%. <b>Every figure in this dashboard inherits the error.</b></div>

              <div class="obrv-note"><b>What has not been checked.</b> Only growth rates. The OBR also publishes borrowing (5.2% of GDP in 2024-25 falling to 4.3%), debt and receipts year by year, and OG-UK produces all three. That comparison is the proper baseline validation and has not been run.</div>
`;
