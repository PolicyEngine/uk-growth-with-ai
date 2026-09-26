"""`python -m uk_growth_with_ai run|report|obr|dashboard`."""

from __future__ import annotations

import argparse

from .data_access import load_results
from .solve import DEFAULT_OUT
from . import obr as obr_mod
from . import report as report_mod


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="uk_growth_with_ai",
                                 description="OG-UK AI-growth scenarios for the UK")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p_run = sub.add_parser("run", help="run the OG-UK scenarios (needs ogcore + oguk)")
    p_run.add_argument("--only", choices=["anthropic", "obr"], default=None)
    p_run.add_argument("--shapes", choices=["step", "ramp", "both"], default="both")
    p_run.add_argument("--out", default=str(DEFAULT_OUT),
                       help="pass uk_growth_with_ai/data/scenarios.json to replace "
                            "the committed results")

    p_rep = sub.add_parser("report", help="result tables for one arm")
    p_rep.add_argument("--arm", default="anthropic_ramp", choices=report_mod.ARMS)
    p_rep.add_argument("--results", default=None)
    p_rep.add_argument("--oguk-dir", default=None,
                       help="read g_n/g_y from a live OG-UK checkout instead of "
                            "the vendored copy")

    p_obr = sub.add_parser("obr", help="OG-UK baseline vs the OBR March 2026 EFO")
    p_obr.add_argument("--results", default=None)
    p_obr.add_argument("--oguk-dir", default=None)

    p_dash = sub.add_parser("dashboard", help="write the dashboard data files from the results")
    p_dash.add_argument("--results", default=None)
    p_dash.add_argument("--oguk-dir", default=None)
    p_dash.add_argument("--check", action="store_true",
                        help="write nothing; exit 1 if the committed files are stale")

    args = ap.parse_args(argv)

    if args.cmd == "run":
        from .solve import run_scenarios   # lazy: keeps ogcore off the import path
        run_scenarios(only=args.only, shapes=args.shapes, out=args.out)
    elif args.cmd == "report":
        report_mod.print_report(args.arm, load_results(args.results), args.oguk_dir)
    elif args.cmd == "obr":
        obr_mod.print_comparison(load_results(args.results), args.oguk_dir)
    else:
        from . import dashboard_data
        res = load_results(args.results)
        if args.check:
            stale = dashboard_data.stale(results=res, oguk_dir=args.oguk_dir)
            for name in stale:
                print(f"stale: dashboard/src/data/{name}")
            return 1 if stale else 0
        for path in dashboard_data.write(results=res, oguk_dir=args.oguk_dir):
            print(f"wrote {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
