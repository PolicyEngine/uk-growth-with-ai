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
import Closing from './part3/Closing.jsx';
import { MODEL_YEAR } from './part3/shared.jsx';

// Part 3: a model of households, the uk-ai-study PolicyEngine-UK
// microsimulation of AI job displacement for one year, from
// data/aiStudy2425.json; docs/story/part3-notes.md defines every value.
// Four Scrolly scenes in the paper's order (results.tex): the main case,
// its three channels, where the loss falls, and what changes the answer (who
// loses the job, job loss against wage cuts, the break-evens: one scene,
// round 2); then what the study leaves out, a plain list. Where a lost pound
// goes (a smaller, OBR-sized run) is on Explore > Households, linked from
// the deciles scene. The change of model is said once, in the opener's
// handover line; the links onward are on the close (TwoLenses). Each figure
// is printed here once; the detail, including take-up and JSA, is on
// Explore > Households. Formats: part3/format.js.

export default function Part3({ part }) {
  return (
    <>
      {/* the change of model is the opener's handover line (StoryTab PARTS); no call-out */}
      <PartHead part={part}>A one-year model of households, {MODEL_YEAR}, if a share of employees are assumed to lose their jobs to AI.</PartHead>
      {/* beat B4: the rate is its home (data-path, data-input: a quoted
          input); no beat while the rate is unknown */}
      {CENTRAL_RATE != null ? (
        <StoryBeat
          id="7pct"
          num={fmtInputPct(CENTRAL_RATE)}
          head="A separate study: what if employees lose their jobs?"
          line="This household study assumes that share lose their jobs for one year. Part 2’s model has no unemployment; the two are not added or compared."
          numProps={{ 'data-input': '', 'data-path': 'headline.central_displaced.note' }}
        />
      ) : null}
      <Central />
      <Channels />
      <Deciles />
      <Pound />
      <Changes />
      <Closing />
    </>
  );
}
