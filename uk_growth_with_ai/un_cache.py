"""A disk cache, retries and a timeout around OG-Core's UN population fetch.

Why: on 12 Nov 2026 the first debt-neutral solve hung for about two hours on
``ogcore.demographics.get_un_data`` while it held the heavy-job lock. The
network had dropped, and neither the UN API call nor the GitHub-mirror
``pd.read_csv`` has a timeout. Every solve fetches the same three UK series
(fertility, mortality and population for the same years), and the
vendored-g_n guard checks the result, so a cache cannot change a result.

* **Cache first.** A cached ``(variable, country, start, end)`` frame is read
  from disk and the network is not touched.
* **On a miss,** the original function runs in a worker thread with a
  wall-clock timeout (``FETCH_TIMEOUT_S``). It is retried with backoff
  (``BACKOFF_S``), and a success is written to the cache.
* **If every attempt fails or times out,** ``UNFetchError`` is raised: the
  solve fails cleanly instead of hanging.

The cache directory is ``$UGAI_UN_CACHE`` or ``<cwd>/un_cache``. The rerun
drivers run from ``$WORK``, so it is ``$WORK/un_cache``. Nothing in OG-Core is
edited; ``install()`` replaces the module attribute that
``demographics.get_pop_objs`` calls.
"""

from __future__ import annotations

import hashlib
import os
import threading
import time
from pathlib import Path

FETCH_TIMEOUT_S = 120.0
BACKOFF_S = (10.0, 30.0, 90.0)       # sleeps between the 4 attempts


class UNFetchError(RuntimeError):
    """Every attempt to fetch a UN series failed or timed out."""


def cache_dir() -> Path:
    d = Path(os.environ.get("UGAI_UN_CACHE") or Path.cwd() / "un_cache")
    d.mkdir(parents=True, exist_ok=True)
    return d


def _key(args, kwargs) -> str:
    names = ("variable_code", "country_id", "start_year", "end_year")
    vals = dict(zip(names, args))
    vals.update({k: v for k, v in kwargs.items() if k in names})
    return "_".join(str(vals.get(n, "default")) for n in names)


def _call_with_timeout(fn, args, kwargs, timeout):
    box = {}

    def run():
        try:
            box["value"] = fn(*args, **kwargs)
        except BaseException as e:          # re-raised in the caller
            box["error"] = e

    t = threading.Thread(target=run, daemon=True)
    t.start()
    t.join(timeout)
    if t.is_alive():
        raise TimeoutError(f"UN fetch did not return within {timeout:.0f}s")
    if "error" in box:
        raise box["error"]
    return box["value"]


def cached(fn, timeout=FETCH_TIMEOUT_S, backoff=BACKOFF_S, sleep=time.sleep, log=print):
    """Wrap ``get_un_data``-like ``fn`` with the cache, the timeout and retries."""
    import pandas as pd

    def wrapper(*args, **kwargs):
        f = cache_dir() / f"un_{_key(args, kwargs)}.csv"
        if f.exists():
            log(f"  UN data: cache hit {f.name}")
            return pd.read_csv(f)
        errors = []
        for attempt in range(len(backoff) + 1):
            try:
                df = _call_with_timeout(fn, args, kwargs, timeout)
                tmp = f.with_suffix(".tmp")
                df.to_csv(tmp, index=False)
                tmp.replace(f)
                log(f"  UN data: fetched and cached {f.name} (attempt {attempt + 1})")
                return pd.read_csv(f)        # same dtypes as a later cache hit
            except Exception as e:
                errors.append(f"{type(e).__name__}: {e}"[:300])
                if attempt < len(backoff):
                    log(f"  UN data: attempt {attempt + 1} failed ({errors[-1][:120]}); "
                        f"retrying in {backoff[attempt]:.0f}s")
                    sleep(backoff[attempt])
        raise UNFetchError(f"UN series {f.name} unavailable after {len(errors)} attempts: "
                           f"{errors}")

    wrapper.__wrapped__ = fn
    return wrapper


def install():
    """Patch ``ogcore.demographics.get_un_data`` (idempotent)."""
    from ogcore import demographics
    cur = demographics.get_un_data
    if getattr(cur, "__wrapped__", None) is None:
        demographics.get_un_data = cached(cur)
    return demographics.get_un_data


def digest() -> dict:
    """sha256 of every cached file, for the solve record."""
    return {p.name: hashlib.sha256(p.read_bytes()).hexdigest()[:16]
            for p in sorted(cache_dir().glob("un_*.csv"))}
