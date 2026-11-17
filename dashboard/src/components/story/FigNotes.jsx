'use client';

import { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { FinalState } from './motion.js';

// A figure's source line and notes, moved after the steps on phones (round
// 2, review 3 B5). On a phone a sticky scene pins only its chart; what a
// part wraps in <FigNotes> is drawn in the block's notes slot after the
// cards (Scrolly .scrolly-notes), once, not in the pinned box. Everywhere
// else (desktop, a figure drawn once, outside a Scrolly) it stays in place.
// In Scrolly's hidden measuring copies it is left out on phones, so the
// pinned box is measured without it.
//
//   <FigNotes><figcaption className="story-source">…</figcaption></FigNotes>
export const NotesSlot = createContext(null);

export default function FigNotes({ children }) {
  const slot = useContext(NotesSlot);
  const final = useContext(FinalState);
  if (!slot?.phone) return children;
  if (final) return null;
  return slot.el ? createPortal(children, slot.el) : null;
}
