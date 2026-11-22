'use client';

import Icon from '@/components/ab/Icon.jsx';
import { CopyButton } from '@/components/ab/CopyBlock.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { CITE_TEXT } from '@/tabs/code/cite.js';

// "Cite this page" (Method redesign, M14): the last block of every Method
// page but Data and code, whose own citation section (#cite) is the full
// one. The one-line citation (a citation: check_text exempts [data-cite]),
// a copy button, and a link to the BibTeX.
export default function CiteFoot() {
  return (
    <div className="cite-foot">
      <h3 className="cite-foot-h">Cite this page</h3>
      <div className="cite-foot-row">
        <p className="page-cite" data-cite="">
          {CITE_TEXT}
        </p>
        <CopyButton text={CITE_TEXT} label="Copy the text" className="copy-button cite-foot-copy" />
      </div>
      <p className="cite-foot-link">
        <NavLink tab="method" sub="code" anchor="cite">
          BibTeX: Data and code, Cite this work <Icon name="arrowRight" size={14} strokeWidth={2} />
        </NavLink>
      </p>
    </div>
  );
}
