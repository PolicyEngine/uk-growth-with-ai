import Icon from '@/components/ab/Icon.jsx';

// Icon buttons for a figure head (24px targets): Replay re-runs a build,
// Pause stops and restarts moving content. Neither is shown under reduced
// motion (story.css), where nothing builds or moves.
//
//   <Frame actions={<><Replay onClick={replay} /><Pause paused={p} onClick={() => setP(!p)} /></>} …>
export default function Replay({ onClick, label = 'Replay the animation' }) {
  return (
    <button type="button" className="ch-icon-btn is-motion" aria-label={label} title={label} onClick={onClick}>
      <Icon name="replay" size={16} />
    </button>
  );
}

export function Pause({ paused, onClick }) {
  const label = paused ? 'Play the flow' : 'Pause the flow';
  return (
    <button type="button" className="ch-icon-btn is-motion" aria-label={label} title={label} aria-pressed={paused} onClick={onClick}>
      <Icon name={paused ? 'play' : 'pause'} size={16} />
    </button>
  );
}
