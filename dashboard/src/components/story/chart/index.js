// Shared chart primitives for the story (wave 2). See each file's header.
export { useChartBox } from './useChartBox.js';
export { linear, tickStep, niceTicks, niceDomain, fmtTick, yearTicks, nearestIndex } from './scale.js';
export { default as Frame, Legend } from './Frame.jsx';
export { default as ModelBadge, MODELS } from './ModelBadge.jsx';
export { default as Axis } from './Axis.jsx';
export { default as Grid } from './Grid.jsx';
export { default as Band } from './Band.jsx';
export { default as Line, linePath } from './Line.jsx';
export { default as Bars, barPath, barDelay } from './Bars.jsx';
export { default as EndLabels, placeLabels, crowded } from './EndLabels.jsx';
export { default as View, affine, viewFor } from './View.jsx';
export { default as Replay, Pause } from './Replay.jsx';
