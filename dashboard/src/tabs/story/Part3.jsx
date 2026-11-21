'use client';

import PartHead from './PartHead.jsx';
import StoryBeat from '@/components/story/StoryBeat.jsx';
import { CENTRAL_RATE } from './part3/Central.jsx';
import { fmtInputPct } from './part3/format.js';
import Central from './part3/Central.jsx';
import Channels from './part3/Channels.jsx';
import Deciles from './part3/Deciles.jsx';
import Pound from './part3/Pound.jsx';
import Changes from './part3/Changes.jsx';
import { MODEL_YEAR, PAPER_URL } from './part3/shared.jsx';
import { REFS, Ref } from './part3/sources.jsx';

// Part 3: a model of households, the uk-ai-study PolicyEngine UK
// microsimulation of AI job displacement for one year, from
// data/aiStudy2425.json; docs/story/part3-notes.md defines every value.
// Four Scrolly scenes in the paper's order (results.tex): the main case,
// its three channels, where the loss falls, and what changes the answer (who
// loses the job, job loss against wage cuts, the break-evens: one scene,
// round 2). What the study leaves out is its own section after the part
// (StoryTab, part3/Closing.jsx; push D, Q4). Where a lost pound
// goes (a smaller, OBR-sized run) is on Explore > Households, linked from
// the deciles scene. The change of model is said once, in the opener's
// handover line; the links onward are on the close (TwoLenses). Each figure
// is printed here once; the detail, including take-up and JSA, is on
// Explore > Households. Formats: part3/format.js.

export default function Part3({ part }) {
  return (
    <>
      {/* the change of model is the opener's handover line (StoryTab PARTS); no call-out */}
      <PartHead part={part}>
        In <a href={PAPER_URL} target="_blank" rel="noreferrer" title={REFS.ahmadi.title}>the household study (PolicyEngine UK)</a>, a one-year model of households, {MODEL_YEAR}, a share of employees are assumed to lose their jobs to AI.
      </PartHead>
      {/* beat B4: the rate is its home (data-path, data-input: a quoted
          input); no beat while the rate is unknown */}
      {CENTRAL_RATE != null ? (
        <StoryBeat
          id="7pct"
          num={fmtInputPct(CENTRAL_RATE)}
          head="of employees assumed jobless for a year"
          line="The size comes from an Irish study: a Goldman Sachs scenario of about a decade’s adoption, applied in one year. AI-exposed jobs are hit more."
          cite={
            <>
              Sources: <Ref id="doorley" />, after <Ref id="briggs" />. Household modelling: <Ref id="ahmadi" />
            </>
          }
          numProps={{ 'data-input': '', 'data-path': 'headline.central_displaced.note' }}
        />
      ) : null}
      <Central />
      <Channels />
      <Deciles />
      <Pound />
      <Changes />
    </>
  );
}
