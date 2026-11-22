'use client';

import Card, { SectionHeading } from '@/components/ui/Card.jsx';
import IconLine from '@/components/ui/IconLine.jsx';
import OnThisPage from '@/components/ui/OnThisPage.jsx';
import PageIntro from '@/components/ui/PageIntro.jsx';
import CiteFoot from '@/components/ui/CiteFoot.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { iconFor } from '@/lib/concepts.js';
import { MACRO_ABOUT } from '@/lib/labels.js';
import IconText from './IconText.jsx';
import InputsTable, { inputsTable } from './InputsTable.jsx';
import UsedBy from './UsedBy.jsx';
import { SRC } from './sources.js';

// Method and sources > Inputs (Method redesign, section 6): every scenario
// input and model parameter, its value, its kind of source, the source and
// the part that uses it, on one table. It was a section of the macro
// model's page; its anchors (#m-inputs, #m-inputs-head, #inputs-table,
// #mx-group-…, #in-…) came with it, and lib/nav.jsx sends old links here.
const SECTIONS = [
  { id: 'm-inputs', title: 'Every input and its source', icon: iconFor('source') },
  { id: 'in-sources', title: 'Sources', icon: iconFor('record') },
];

// The table in its card (its replication files behind the book icon).
export function InputsPart() {
  return (
    <Card
      id="inputs-table"
      icon={iconFor('source')}
      title="Scenario inputs and model parameters"
      replication={{ code: SRC.ukTargets.url, result: SRC.ogukParams.url }}
      more={[{ label: 'Measure', text: '“Derived”: computed by this study from OBR or IMF figures, by a rule they do not publish.' }]}
      download={{ title: 'Scenario inputs and model parameters', context: 'Each input, the value the model used, its kind of source and the source', table: inputsTable }}
    >
      <InputsTable />
    </Card>
  );
}

export default function InputsPage() {
  return (
    <div className="page-with-contents mx-tab mx-inputs-page">
      <OnThisPage tab="method" sub="inputs" sections={SECTIONS} label="Inputs contents" />
      <div className="page-body">
        <PageIntro
          question="Where does each input come from?"
          answer={
            <IconText icon="source">
              Published, derived by this study, the macro model&rsquo;s default, or a modelling choice: each row says which, and links it. The macro model is {MACRO_ABOUT}.
            </IconText>
          }
        />
        <section>
          {/* the old sub-heading's anchor is kept on the h2 */}
          <SectionHeading id="m-inputs" oldId="m-inputs-head" icon={iconFor('source')} title="Every input and its source" />
          <InputsPart />
        </section>
        <section>
          <SectionHeading id="in-sources" icon={iconFor('record')} title="Sources" />
          <IconLine concept="link" className="mx-sources-line">
            Each row links its own source. The full list, with where each figure is read, is on Evidence.{' '}
            <NavLink tab="method" sub="studies" anchor="sources">
              Evidence, Sources
            </NavLink>
          </IconLine>
          <UsedBy id="m-inputs" />
          <CiteFoot />
        </section>
      </div>
    </div>
  );
}
