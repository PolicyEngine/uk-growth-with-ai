# Method and sources redesign: checks (push E)

The Method redesign (Fable 5.2 ruling for Vahid, 22 Nov; rulings M1 to M18) landed as commits 1 to 12 on `perf/method`, branched from `perf/pushD` at `baabc21`. Commit 13 (parameter symbols through `MathSym`) waits for `MathSym`. Under the light-work rule no browser, build or server was run. The 1280 and 390 check outputs are listed below as pending, not passed.

## Run, browser-free

- vitest, under the default data (2027) and `NEXT_PUBLIC_DATA=2028`, on these files: `lib/nav.test.js`, `tabs/method/*` (`inputs.test`, `scenarios.test`, `sensitivity.test`, `investStep.test`), `tabs/households/*`, `tabs/code/dataCode.test`, `tabs/literature/evidence.test`, `components/ui/*` (`refs.test`, `anatomy.test`, `icon-lines.test` and the rest), `model-name.test`, `linkAncestry.test`, `claims-and-years.test`, `caption-length.test`, `label-joins.test`, `story/noEmptyItems.test`, `story/part2.test`, `story/part3.test` and `explore/allScenarios.test`.
  - Default data: 277 passed, 1 failed.
  - 2028: 263 passed, 1 skipped, 1 failed.
  - The failure is the same in both and is already present at `baabc21`: `caption-length` "every fold is titled More info" counts 4 against a baseline of 3 (the Story's "About this model" fold, from the part-openings commit). This series does not change that count.
- `tsc --noEmit`: clean.
- eslint on every file the series adds or changes: no errors. The 5 warnings were already there (`ugai/one-fold` and `ugai/one-card-shell`).
- `scripts/ratchet.mjs --no-vitest`: the lint counts hold at their baselines (`one_chooser` 0, `one_fold` 4, `one_card_shell` 3).
- `scripts/checks/part2.py` `links()`, run as its source scan only (no dump): every Method anchor that part 2 links to is still a literal id in `tabs/method/*.jsx`. The one miss, `closure-sensitivity` from `Landing.jsx`, is an Explore anchor the scan reads as a Method one. It is the same at `baabc21`.

## Page maps updated (not run)

- `check_sources`, `check_text`, `check_header`, `check_hover`, `check_axes`: `method` is `/?tab=method&sub=how`; `overview` (`/?tab=method`) and `inputs` (`/?tab=method&sub=inputs`) are added; `detail` is removed.
- `check_pill`: `how` is `/?tab=method&sub=how`, plus `overview` and `inputs`.
- `dumptabs.mjs`, `check_numbers.py`, `checks/cross_review.py`, `evidence.py`, `part3.py`: no change.

## Pending in the browser, at 1280 and 390

- `check_numbers`: the macro page's counted two-decimal figures should still be exactly the stress-test pair. Every value in the sensitivity table sits in `[data-axis]`.
- `check_sources` (method, household-method, overview, inputs): one sources button on each of `#model-diagram`, `#hm-flow`, `#sens-grid` and `#inputs-table`. The landing's six cards are text cards.
- `check_header`: the six sub-tabs fit the row from 1024px. If they do not, the ruling is "Macro model" for `how` and "Household study" for `households`.
- `check_pill`: the inputs search box and the second pill section.
- `check_text`, `check_axes`, `check_hover`, `check_states`, `check_gaps`, `check_orphans`.
- `checks/cross_review.py` on a fresh dump: "N committed solve records" is on the Rerun it card, visible at rest.
- Look at by eye: the macro flow's three stages and the household flow, each in its grid and at one column; the Key settings rows open and stacked at 390; the section links as pills at 1024px and below; the caution panel's tint on the grey page; the sensitivity table at 358px.
