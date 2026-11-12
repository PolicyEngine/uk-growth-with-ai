"""`python -m uk_growth_with_ai run|report|obr|check|dashboard`."""

from __future__ import annotations

import argparse

from .data_access import load_results
from .scenarios import G_Y_ANNUAL, TG1
from .solve import DEFAULT_OUT, G_N_DEFAULT, G_N_SOURCES
from . import obr as obr_mod
from . import report as report_mod


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="uk_growth_with_ai",
                                 description="OG-UK AI-growth scenarios for the UK")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p_run = sub.add_parser("run", help="run the OG-UK scenarios (needs ogcore + oguk)")
    p_run.add_argument("--only", choices=["share_shift_tfp", "share_shift"], default=None)
    p_run.add_argument("--shapes", choices=["step", "ramp", "both"], default="ramp")
    p_run.add_argument("--baseline-only", action="store_true",
                       help="stop after the baseline and the Z solve (~10 min)")
    p_run.add_argument("--tG1", type=int, default=TG1,
                       help=f"period G switches to debt targeting (default {TG1}; OG-UK's is 4)")
    p_run.add_argument("--g-y-annual", type=float, default=G_Y_ANNUAL,
                       help=f"labour-augmenting productivity growth (default {G_Y_ANNUAL}; OG-UK's is 0.011)")
    p_run.add_argument("--g-n", dest="g_n_source", choices=list(G_N_SOURCES),
                       default=G_N_DEFAULT,
                       help="demographics: 'vendored' (default) stops the run if "
                            "the live UN fetch's g_n for the reported window differs "
                            "from the committed run's recorded path; 'live' skips "
                            "that check. Both solve on the live fetch")
    p_run.add_argument("--baseline-spending", action="store_true",
                       help="shocked arms keep the baseline's G and TR levels (OBR convention)")
    p_run.add_argument("--zeta-K", dest="zeta_K", type=float, default=None,
                       help="share of excess capital demand met from abroad (R3, #16); "
                            "default: OG-UK's 0.1. zeta_D and the world rate are not changed")
    p_run.add_argument("--pretp", action="store_true",
                       help="UK-consistent pre-TP demographics (R2, #15)")
    p_run.add_argument("--splice", action="store_true",
                       help="repair the 2027->28 demographic data splice (R2, #15)")
    p_run.add_argument("--alpha-g-shift", dest="alpha_G_shift", type=float, default=0.0,
                       help="baseline pre-tG1 G/Y = steady-state G/Y + this (R1, #32)")
    p_run.add_argument("--z-share-shift", dest="z_share_shift", type=float, default=None,
                       help="Z for share_shift in place of the fixed-input one (R4, #8; "
                            "`rerun` solves it)")
    p_run.add_argument("--out", default=str(DEFAULT_OUT),
                       help="pass uk_growth_with_ai/data/scenarios.json to replace "
                            "the committed results")

    p_re = sub.add_parser("rerun", help="the corrective reruns R1-R4 (#27), one solve "
                                        "per call; see uk_growth_with_ai/rerun.py")
    p_re.add_argument("action", choices=["next", "step", "gate", "assemble", "status"])
    p_re.add_argument("--closure", required=True, choices=["zk0.1", "zk0"])
    p_re.add_argument("--stage", choices=["baseline", "arms", "arms_fs"], default="baseline",
                      help="arms_fs: the fixed-spending arms (G and TR at baseline levels)")
    p_re.add_argument("--fixed-spending", action="store_true",
                      help="assemble: the fixed-spending variant")
    p_re.add_argument("--outdir", default="analysis/rerun/output")
    p_re.add_argument("--work", default=None, help="scratch dir for SS/TPI pickles")
    p_re.add_argument("--prior-dir", default="analysis/closure/output",
                      help="the #30 solves, for first guesses and sign comparisons")
    p_re.add_argument("--approve", action="store_true")
    p_re.add_argument("--note", default="")
    p_re.add_argument("--out", default=None)

    p_sp = sub.add_parser("surprise", help="unanticipated AI shock announced at the start "
                                           "of --start (2028); see uk_growth_with_ai/surprise.py "
                                           "and docs/surprise_2028.md")
    p_sp.add_argument("action", choices=["prepare", "check-specs", "next", "step", "gate",
                                         "assemble", "status"])
    p_sp.add_argument("--closure", required=True, choices=["zk0.1", "zk0"])
    p_sp.add_argument("--start", type=int, default=2028,
                      help="the announcement year; every arm equals the baseline before it")
    p_sp.add_argument("--stage", choices=["continuation", "arms", "arms_dn", "arms_fs"],
                      default="continuation",
                      help="continuation: the no-shock restart that must reproduce the "
                           "baseline; arms_fs: G and TR at baseline levels")
    p_sp.add_argument("--scenario", default="korinek",
                      help="grid id: korinek (upper, Korinek US substantial), uk_low, "
                           "uk_central, uk_high (from analysis/surprise/uk_targets.json)")
    p_sp.add_argument("--fixed-spending", action="store_true", help="assemble: arms_fs")
    p_sp.add_argument("--debt-neutral", action="store_true", help="assemble: arms_dn")
    p_sp.add_argument("--reference", choices=["baseline", "continuation"],
                      default="continuation",
                      help="gate --approve: what R4 and every gap are measured against "
                           "(decided 12 Nov 2026: the continuation)")
    p_sp.add_argument("--approve", action="store_true")
    p_sp.add_argument("--note", default="")
    p_sp.add_argument("--outdir", default="analysis/surprise/output")
    p_sp.add_argument("--rerun-dir", default="analysis/rerun/output",
                      help="the committed R1-R4 solves; the baselines are reused from here")
    p_sp.add_argument("--work", default=None,
                      help="scratch dir holding <closure>/<baseline>/TPI/TPI_vars.pkl")
    p_sp.add_argument("--out", default=None)

    p_rep = sub.add_parser("report", help="result tables for one arm")
    p_rep.add_argument("--arm", default="share_shift_tfp_ramp", choices=report_mod.ARMS)
    p_rep.add_argument("--results", default=None)
    p_rep.add_argument("--oguk-dir", default=None,
                       help="read g_n/g_y from a live OG-UK checkout instead of "
                            "the vendored copy")

    p_obr = sub.add_parser("obr", help="OG-UK baseline vs the OBR March 2026 EFO")
    p_obr.add_argument("--results", default=None)
    p_obr.add_argument("--oguk-dir", default=None)

    p_chk = sub.add_parser("check", help="validation checks on a results file (issue #9)")
    p_chk.add_argument("--results", default=str(DEFAULT_OUT))
    p_chk.add_argument("--baseline-only", action="store_true",
                       help="the file is from `run --baseline-only` and predates the "
                            "recorded arms_requested; no shocked arm is required")

    p_dash = sub.add_parser("dashboard", help="write the dashboard data files from the results")
    p_dash.add_argument("--results", default=None)
    p_dash.add_argument("--oguk-dir", default=None)
    p_dash.add_argument("--check", action="store_true",
                        help="write nothing; exit 1 if the committed files are stale")

    args = ap.parse_args(argv)

    if args.cmd == "run":
        from .solve import run_scenarios   # lazy: keeps ogcore off the import path
        run_scenarios(only=args.only, shapes=args.shapes, out=args.out,
                      baseline_only=args.baseline_only, tG1=args.tG1,
                      g_y_annual=args.g_y_annual, g_n_source=args.g_n_source,
                      baseline_spending=args.baseline_spending, zeta_K=args.zeta_K,
                      pretp=args.pretp, splice=args.splice,
                      alpha_G_shift=args.alpha_G_shift, z_share_shift=args.z_share_shift)
    elif args.cmd == "rerun":
        return _rerun(args)
    elif args.cmd == "surprise":
        return _surprise(args)
    elif args.cmd == "report":
        report_mod.print_report(args.arm, load_results(args.results), args.oguk_dir)
    elif args.cmd == "check":
        from . import checks
        try:
            res = load_results(args.results)
        except (OSError, ValueError) as e:   # missing file, invalid JSON
            print(f"  [FAIL] cannot read {args.results}: {type(e).__name__}: {e}")
            return 1
        return checks.main(res, baseline_only=args.baseline_only)
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


def _surprise(args) -> int:
    import json
    from pathlib import Path
    from . import surprise as sp
    kw = {"year": args.start}
    if args.action == "prepare":
        if not args.work:
            raise SystemExit("--work is required for prepare (it reads the baseline pickle)")
        out = sp.prepare(args.rerun_dir, args.outdir, args.closure, args.work, **kw)
        print(json.dumps({"checks": out["checks"], "Z_by_anchor_year": out["Z_by_anchor_year"],
                          "state_at_k": {k: v for k, v in out["state_at_k"].items()
                                         if k != "BQ"},
                          "debt_gdp_pct": out["debt_gdp_pct"]}, indent=1))
        return 0
    if args.action == "check-specs":
        if not args.work:
            raise SystemExit("--work is required for check-specs")
        print(json.dumps(sp.check_specs(args.work, args.rerun_dir, args.closure, **kw),
                         indent=1, default=float))
        return 0
    if args.action == "gate":
        done = sp.load(args.outdir, args.closure)
        if "continuation" not in done:
            print("no continuation solve")
            return 1
        rep = sp.continuation_report(done["continuation"],
                                     sp.load_base_ext(args.outdir, args.closure), **kw)
        print(json.dumps(rep, indent=1))
        if args.approve:
            print("wrote", sp.write_gate(args.outdir, args.closure, args.reference,
                                         args.note, **kw))
        return 0 if rep["ok"] else 1
    if args.action == "next":
        spec = sp.next_step(args.outdir, args.closure, args.stage, args.rerun_dir,
                            scenario=args.scenario, **kw)
        if spec:
            print(spec["label"])
        return 0
    if args.action == "step":
        if not args.work:
            raise SystemExit("--work is required for step")
        sp.run_step(args.outdir, args.closure, args.stage, args.work, args.rerun_dir,
                    scenario=args.scenario, **kw)
        return 0
    if args.action == "status":
        for k, r in sp.load(args.outdir, args.closure).items():
            print(f"{k}: {r['elapsed_min']:.1f} min, converged "
                  f"{r['diagnostics'].get('tpi_converged')}")
        return 0
    if args.fixed_spending and args.debt_neutral:
        raise SystemExit("--fixed-spending and --debt-neutral are separate variants")
    variant = "fs" if args.fixed_spending else "dn" if args.debt_neutral else ""
    res = sp.assemble(args.outdir, args.closure, fs=variant, rerun_dir=args.rerun_dir,
                      scenario=args.scenario, **kw)
    stem = f"scenarios_surprise{args.start}_{args.scenario}" + {"": "", "fs": "_fixed_spending",
                                                 "dn": "_debt_neutral"}[variant]
    out = Path(args.out or f"uk_growth_with_ai/data/{stem}"
               f"{'' if args.closure == 'zk0.1' else '_' + args.closure}.json")
    out.write_text(json.dumps(res, indent=1))
    print("wrote", out)
    return 0


def _rerun(args) -> int:
    import json
    from pathlib import Path
    from . import rerun
    if args.action == "next":
        spec = rerun.next_step(args.outdir, args.closure, args.stage, args.prior_dir)
        if spec:
            print(spec["label"])
        return 0
    if args.action == "step":
        if not args.work:
            raise SystemExit("--work is required for step")
        rerun.run_step(args.outdir, args.closure, args.stage, args.work, args.prior_dir)
        return 0
    if args.action == "gate":
        done = rerun.load(args.outdir, args.closure)
        base = rerun.accepted_baseline(done)
        for r in rerun.baseline_passes(done):
            print(f"{r['label']}: alpha_G_shift {r['alpha_G_shift']:+.6f}, "
                  f"2030 D/Y {rerun._dy(r):.3f}%")
        if base is None:
            print("no accepted baseline")
            return 1
        print(json.dumps(rerun.baseline_report(base), indent=1))
        if args.approve:
            print("wrote", rerun.write_gate(args.outdir, args.closure, args.note))
        return 0
    if args.action == "status":
        done = rerun.load(args.outdir, args.closure)
        for k, r in done.items():
            print(f"{k}: {r['elapsed_min']:.1f} min, converged "
                  f"{r['diagnostics'].get('tpi_converged')}")
        return 0
    res = rerun.assemble(args.outdir, args.closure, fs=args.fixed_spending)
    stem = "scenarios_fixed_spending" if args.fixed_spending else "scenarios"
    default = (f"uk_growth_with_ai/data/{stem}.json" if args.closure == "zk0.1"
               else f"uk_growth_with_ai/data/{stem}_{args.closure}.json")
    out = Path(args.out or default)
    out.write_text(json.dumps(res, indent=1))
    print("wrote", out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
