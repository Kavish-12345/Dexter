"""Validation of the NSGA-II optimizer against a brute-force search.

Run from backend/:  python validate.py
Prints tables only and saves nothing. Seeds are fixed, so a rerun prints identical numbers.

repair() snaps lengths to the 0.1 cm step, so the design space is a finite grid.
Evaluating every design on that grid gives the exact true Pareto front to compare against.
"""
import math
import time

from robot.defaults import (GRID_SPACING, JOINT_LIMITS, LENGTH_STEP, LINK_MAX, LINK_MIN, MAX_TOTAL,
                            MIN_COVERAGE, SEED, TASK_RECT)
from robot.fitness import evaluate
from robot.kinematics import TOL
from robot.optimizer import optimize, pareto_front
from robot.workspace import task_grid

SEEDS = [*range(1, 11), SEED]  # seeds 1-10, plus the default seed the UI uses


def brute_force(task_rect=TASK_RECT, spacing=GRID_SPACING, limits=JOINT_LIMITS, link_min=LINK_MIN,
                link_max=LINK_MAX, max_total=MAX_TOTAL, step=LENGTH_STEP, min_coverage=MIN_COVERAGE):
    """Evaluate every design on the length-step grid with l1 + l2 <= max_total."""
    x, y = task_grid(*task_rect, spacing)
    n = math.floor((link_max - link_min) / step + 1e-9) + 1
    lengths = [round(link_min + k * step, 9) for k in range(n)]  # the same grid repair() snaps to
    designs = []
    for l1 in lengths:
        for l2 in lengths:
            if l1 + l2 <= max_total + TOL:
                r = evaluate(l1, l2, x, y, limits, link_min, link_max, max_total, min_coverage)
                designs.append({"l1": l1, "l2": l2, **r})
    return designs


def miss_distance(d, front):
    """cm from design d to the nearest true-front design: the larger of the two link differences."""
    return min(max(abs(d["l1"] - e["l1"]), abs(d["l2"] - e["l2"])) for e in front)


def baseline_length(task_rect=TASK_RECT, link_min=LINK_MIN, link_max=LINK_MAX, step=LENGTH_STEP):
    """Rule of thumb: equal links whose total just reaches the farthest task corner, rounded up to the step."""
    x_min, x_max, y_min, y_max = task_rect
    far = max(math.hypot(cx, cy) for cx in (x_min, x_max) for cy in (y_min, y_max))
    k = math.ceil((far / 2 - link_min) / step - 1e-9)
    return round(min(max(link_min + k * step, link_min), link_max), 9)


def _row(name, d, on_front):
    print(f"{name:<34}{d['l1']:>6.1f}{d['l2']:>6.1f}{100 * d['coverage']:>9.1f}%"
          f"{d['dexterity']:>10.3f}{d['length']:>8.1f}   {'yes' if d['feasible'] else 'no':<10}"
          f"{'yes' if (d['l1'], d['l2']) in on_front else 'no'}")


def main():
    t = time.time()
    designs = brute_force()
    front = pareto_front(designs)
    on_front = {(d["l1"], d["l2"]) for d in front}
    best_cov = max(d["coverage"] for d in front)
    best_dex = max(d["dexterity"] for d in front)
    shortest = min(d["length"] for d in front)
    print(f"Brute force: {len(designs)} designs, {len(front)} on the true front ({time.time() - t:.0f} s)\n")

    print(f"Table 1: NSGA-II front vs the true front (seeds 1-10, plus the default seed {SEED})")
    print(f"{'seed':>4}{'front':>7}{'on true front':>16}{'share':>8}{'avg miss':>10}"
          f"{'best cov':>10}{'best dex':>10}{'shortest':>10}")
    matches = [0, 0, 0]
    all_hits = all_returned = 0
    all_misses = []
    for seed in SEEDS:
        res = optimize(seed=seed)["front"]
        hits = sum((d["l1"], d["l2"]) in on_front for d in res)
        misses = [miss_distance(d, front) for d in res if (d["l1"], d["l2"]) not in on_front]
        avg_miss = sum(misses) / len(misses) if misses else 0.0
        all_hits += hits
        all_returned += len(res)
        all_misses += misses
        c = max(d["coverage"] for d in res)
        x = max(d["dexterity"] for d in res)
        l = min(d["length"] for d in res)
        matches[0] += abs(c - best_cov) < 1e-9
        matches[1] += abs(x - best_dex) < 1e-9
        matches[2] += abs(l - shortest) < 1e-9
        print(f"{seed:>4}{len(res):>7}{hits:>10}/{len(res):<5}{100 * hits / len(res):>7.1f}%"
              f"{avg_miss:>7.2f} cm{100 * c:>9.1f}%{x:>10.3f}{l:>10.1f}")
    print(f"{'true':>4}{len(front):>7}{'':>34}{100 * best_cov:>9.1f}%{best_dex:>10.3f}{shortest:>10.1f}")
    n = len(SEEDS)
    print(f"Runs matching the true best: coverage {matches[0]}/{n}, dexterity {matches[1]}/{n}, "
          f"shortest {matches[2]}/{n}")
    overall_miss = sum(all_misses) / len(all_misses) if all_misses else 0.0
    print(f"All runs: {all_hits}/{all_returned} returned designs on the true front "
          f"({100 * all_hits / all_returned:.1f}%); misses are {overall_miss:.2f} cm from it on average\n")

    print(f"Table 2: designs compared (NSGA-II candidates from the default seed {SEED})")
    print(f"{'design':<34}{'l1':>6}{'l2':>6}{'coverage':>10}{'dexterity':>10}{'length':>8}   "
          f"feasible  on true front")
    x, y = task_grid(*TASK_RECT, GRID_SPACING)
    b = baseline_length()
    _row("baseline (equal links)", {"l1": b, "l2": b, **evaluate(b, b, x, y)}, on_front)
    _row("coverage-only", min(designs, key=lambda d: (-d["coverage"], d["length"], d["l1"])), on_front)
    app_front = optimize(seed=SEED)["front"]
    high = [d for d in app_front if d["coverage"] >= 0.95]
    if high:
        _row("NSGA-II shortest, coverage >= 95%", min(high, key=lambda d: (d["length"], -d["dexterity"])),
             on_front)
        _row("NSGA-II most dexterous, cov >= 95%", max(high, key=lambda d: (d["dexterity"], -d["length"])),
             on_front)
    _row("NSGA-II best coverage", max(app_front, key=lambda d: (d["coverage"], -d["length"])), on_front)
    _row("NSGA-II best dexterity", max(app_front, key=lambda d: (d["dexterity"], d["coverage"])), on_front)
    _row("NSGA-II shortest", min(app_front, key=lambda d: (d["length"], -d["coverage"])), on_front)


if __name__ == "__main__":
    main()
