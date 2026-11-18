// For tests: choose an option in a pill (components/ui/Pill.jsx). Opens the
// pill inside `root`, clicks the option named `name` (a string or a RegExp)
// in the section labelled `section`, and closes the panel if still open.
import { fireEvent } from '@testing-library/react';

export function pickInPill(root, section, name) {
  const chip = root.querySelector('.settings-chip');
  if (chip.getAttribute('aria-expanded') !== 'true') fireEvent.click(chip);
  const pop = document.getElementById(chip.getAttribute('aria-controls'));
  const group = [...pop.querySelectorAll('.sp-group')].find((g) => g.querySelector('.sp-group-name').textContent === section);
  const label = (b) => b.querySelector('.sp-option-label').textContent;
  const opt = [...group.querySelectorAll('[role=radio], [role=checkbox]')].find((b) => (name instanceof RegExp ? name.test(label(b)) : label(b) === name));
  fireEvent.click(opt);
  if (chip.getAttribute('aria-expanded') === 'true') fireEvent.keyDown(pop, { key: 'Escape' });
  return opt;
}
