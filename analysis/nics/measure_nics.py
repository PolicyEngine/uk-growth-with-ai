"""NICs on PolicyEngine-UK Microcosm data, 2027 and 2028 (evidence only).

Vahid chose (12 Nov 2026) to keep OG-UK's tax system: employee NICs are inside
its fitted income-tax functions (PolicyEngine-UK income_tax + national_insurance)
and employer NICs are tau_payroll = 0.15 on all labour income
(docs/red_flags_1_3.md).  This measures how that 15% compares with the actual
average and marginal employer rates.  Nothing in the model changes.

    PYTHONPATH=. ~/ogmodels/OG-UK/.venv/bin/python analysis/nics/measure_nics.py

Uses managed_microsimulation() (not policyengine.core.Simulation, which
disagrees on single-year runs) and the saved read-only Hugging Face login;
no token is printed.  Heavy-ish: two microsimulations per year.  Writes
analysis/nics/nics_<year>.json and prints a summary.  Aggregates only; no
record-level output.
"""

from __future__ import annotations

import json
import os
import time
from pathlib import Path

import numpy as np

OUT = Path(__file__).resolve().parent
YEARS = (2027, 2028)
DELTA = 100.0                     # GBP added to each earner for the marginal rates
TAU_PAYROLL_OGUK = 0.15
# OBR comparator, stated loosely: total NICs about GBP 180bn+ a year (coordinator
# brief, 12 Nov 2026); the exact OBR line is not in this repository.
OBR_NICS_BN_APPROX = 180.0


def _token():
    if not (os.environ.get("HF_TOKEN") and os.environ.get("HUGGING_FACE_TOKEN")):
        from huggingface_hub import get_token
        tok = get_token()          # never printed
        if tok:
            os.environ.setdefault("HF_TOKEN", tok)
            os.environ.setdefault("HUGGING_FACE_TOKEN", tok)


def _arr(x):
    return np.asarray(getattr(x, "values", x), dtype=float)


def _perturb(sim, year, mask, delta):
    """Add delta to employment income of the masked people, on whichever input
    holds the values (as OG-UK's _perturb_first_populated does)."""
    for name in ("employment_income_before_lsr", "employment_income"):
        holder = sim.get_holder(name)
        periods = list(holder.get_known_periods())
        if not periods:
            continue
        for period in periods:
            v = holder.get_array(period)
            holder.delete_arrays(period)
            sim.set_input(name, period, v + delta * mask)
        return name
    raise RuntimeError("no populated employment income input to perturb")


def measure(year: int) -> dict:
    from policyengine.tax_benefit_models.uk import managed_microsimulation
    sim = managed_microsimulation()
    w = _arr(sim.calculate("person_weight", year))
    v = {n: _arr(sim.calculate(n, year)) for n in (
        "employment_income", "self_employment_income", "ni_class_1_employee",
        "ni_employer", "national_insurance", "income_tax")}
    hh_w = _arr(sim.calculate("household_weight", year))
    gov_tax = _arr(sim.calculate("gov_tax", year))
    S = lambda a: float((a * w).sum())
    emp = S(v["employment_income"])
    er, ee = S(v["ni_employer"]), S(v["ni_class_1_employee"])
    earner = (v["employment_income"] > 0).astype(float)

    sim2 = managed_microsimulation()
    held = _perturb(sim2, year, earner, DELTA)
    d_er = _arr(sim2.calculate("ni_employer", year)) - v["ni_employer"]
    d_ee = _arr(sim2.calculate("ni_class_1_employee", year)) - v["ni_class_1_employee"]
    e_w = v["employment_income"] * w * earner           # earnings weights
    mtr_er, mtr_ee = d_er / DELTA, d_ee / DELTA
    total_ni = float((v["national_insurance"] * w).sum()) + er
    return {
        "year": year, "utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "employment_income_bn": emp / 1e9,
        "employer_nics_bn": er / 1e9, "employee_class1_nics_bn": ee / 1e9,
        "all_nics_bn": total_ni / 1e9,
        "avg_employee_rate_on_employment_income": ee / emp,
        "avg_employer_rate_on_employment_income": er / emp,
        "avg_employer_rate_on_total_labour_cost": er / (emp + er),
        "marginal_employer_rate_earnings_weighted": float((mtr_er * e_w).sum() / e_w.sum()),
        "marginal_employee_rate_earnings_weighted": float((mtr_ee * e_w).sum() / e_w.sum()),
        "share_of_earners_with_employer_marginal_15pct": float(
            ((np.abs(mtr_er - 0.15) < 0.005) * earner * w).sum() / (earner * w).sum()),
        "nics_share_of_pe_gov_tax": total_ni / float((gov_tax * hh_w).sum()),
        "pe_gov_tax_bn": float((gov_tax * hh_w).sum()) / 1e9,
        "obr_nics_bn_approx": OBR_NICS_BN_APPROX,
        "oguk_tau_payroll": TAU_PAYROLL_OGUK,
        "perturbed_input": held, "delta_gbp": DELTA,
    }


def main():
    _token()
    for y in YEARS:
        r = measure(y)
        (OUT / f"nics_{y}.json").write_text(json.dumps(r, indent=1))
        print(f"{y}: employer avg {r['avg_employer_rate_on_employment_income']:.1%} of "
              f"employment income ({r['avg_employer_rate_on_total_labour_cost']:.1%} of labour "
              f"cost), marginal {r['marginal_employer_rate_earnings_weighted']:.1%}; employee "
              f"avg {r['avg_employee_rate_on_employment_income']:.1%}, marginal "
              f"{r['marginal_employee_rate_earnings_weighted']:.1%}; all NICs "
              f"GBP {r['all_nics_bn']:.0f}bn (OBR ~{OBR_NICS_BN_APPROX:.0f}bn+), "
              f"{r['nics_share_of_pe_gov_tax']:.1%} of PE gov_tax; OG-UK tau_payroll 15%",
              flush=True)


if __name__ == "__main__":
    main()
