'use client';

import PartHead from './PartHead.jsx';
import Central from './part3/Central.jsx';
import Channels from './part3/Channels.jsx';
import Deciles from './part3/Deciles.jsx';
import Changes from './part3/Changes.jsx';
import Closing from './part3/Closing.jsx';
import { MODEL_YEAR } from './part3/shared.jsx';

// Part 3: a model of households, the uk-ai-study PolicyEngine-UK
// microsimulation of AI job displacement for one year, from
// data/aiStudy2425.json; docs/story/part3-notes.md defines every value.
// Four Scrolly scenes in the paper's order (results.tex): the central case,
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
      <Central />
      <Channels />
      <Deciles />
      <Changes />
      <Closing />
    </>
  );
}
