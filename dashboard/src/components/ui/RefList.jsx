import IconText from '@/tabs/method/IconText.jsx';
import { REFERENCES } from '@/data/references.js';

// One reference list (Method redesign, section 7): Evidence's #sources
// lists every reference in four groups, and each model page the ones it
// cites (`compact`: no ids, no use or read lines). One entry, one line:
// the key (the in-text citation, weight 600), the full reference, where
// it is read (muted); on Evidence the use and read lines as before. A
// space separates the parts, so copy and screen readers do not run them
// together (label-joins.test); CSS draws the dots between them. The
// whole entry is one link; CSS draws the external mark after the title
// (no text is added to the DOM). data-reference exempts the list from the
// word caps (check_text).
//   <RefList group="uk" />            Evidence, one group
//   <RefList ids={MACRO_REFS} compact />
export default function RefList({ ids, group, compact = false, className = '' }) {
  const list = (ids ?? Object.keys(REFERENCES)).filter((id) => REFERENCES[id] && (!group || REFERENCES[id].group === group));
  return (
    <ul className={`ref-list${compact ? ' is-compact' : ''} ${className}`.trim()} data-reference="">
      {list.map((id) => {
        const r = REFERENCES[id];
        return (
          <li key={id} id={compact ? undefined : `src-${id}`} className="ref-item">
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="ref-link">
              <span className="ref-key">{r.key}</span>
              {r.title ? <> <span className="ref-title">{r.title}</span></> : null}
              {r.loc ? <> <span className="ref-loc">{r.loc}</span></> : null}
              {!compact && r.use ? (
                <>
                  {' '}
                  <span className="ref-use">
                    <IconText icon="why">{r.use}</IconText>
                  </span>
                </>
              ) : null}
              {!compact && r.read ? (
                <>
                  {' '}
                  <span className="ref-read">
                    <IconText icon="caveat">{r.read}</IconText>
                  </span>
                </>
              ) : null}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
