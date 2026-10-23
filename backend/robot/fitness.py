"""Objectives, constraints and the length repair for one arm design (l1, l2).

Objectives are returned raw; the optimizer sets their directions in step 6:
  coverage   0..1, maximise
  dexterity  0..1, maximise
  length     l1 + l2 in cm, minimise
Units are cm and radians. Every limit defaults to robot/defaults.py and can be overridden.
"""
import math

import numpy as np

from robot.defaults import JOINT_LIMITS, LENGTH_STEP, LINK_MAX, LINK_MIN, MAX_TOTAL, MIN_COVERAGE
from robot.dexterity import dexterity
from robot.kinematics import TOL
from robot.workspace import area_coverage, coverage


def _clip(value, lo, hi):
    return min(max(value, lo), hi)


def _within_bounds(l1, l2, link_min, link_max, max_total):
    return (link_min - TOL <= l1 <= link_max + TOL
            and link_min - TOL <= l2 <= link_max + TOL
            and l1 + l2 <= max_total + TOL)


def _snap(value, link_min, link_max, step):
    """Nearest point on the grid link_min, link_min + step, ... (halves round up), kept <= link_max."""
    k = math.floor((value - link_min) / step + 0.5)
    snapped = link_min + k * step
    if snapped > link_max + TOL:
        snapped -= step
    return round(snapped, 9)  # removes float noise such as 8.700000000000001


def repair(l1, l2, link_min=LINK_MIN, link_max=LINK_MAX, max_total=MAX_TOTAL, step=LENGTH_STEP):
    """Turn any (l1, l2) into a valid design on the length step."""
    # 1. clip each link to its bounds
    l1, l2 = _clip(l1, link_min, link_max), _clip(l2, link_min, link_max)

    # 2. too long: scale both links by the same factor (keeps the l1 : l2 ratio)
    if l1 + l2 > max_total:
        factor = max_total / (l1 + l2)
        l1, l2 = l1 * factor, l2 * factor

    # 3. scaling can push a link below link_min: clip again, and if the total is
    #    still too long, shorten the longer link to fill exactly what is left
    l1, l2 = _clip(l1, link_min, link_max), _clip(l2, link_min, link_max)
    if l1 + l2 > max_total:
        if l1 >= l2:
            l1 = max_total - l2
        else:
            l2 = max_total - l1

    # 4. snap to the length step, so the values shown are the values scored
    l1 = _snap(l1, link_min, link_max, step)
    l2 = _snap(l2, link_min, link_max, step)

    # 5. snapping can add up to one step to the total: take it off the longer link
    if l1 + l2 > max_total + TOL:
        if l1 >= l2:
            l1 = round(l1 - step, 9)
        else:
            l2 = round(l2 - step, 9)

    # 6. final check (fails only for impossible limits, which the API rejects first)
    if not _within_bounds(l1, l2, link_min, link_max, max_total):
        raise ValueError(f"cannot fit l1, l2 in [{link_min}, {link_max}] with l1 + l2 <= {max_total}")
    return l1, l2


def evaluate(l1, l2, x, y, limits=JOINT_LIMITS, link_min=LINK_MIN, link_max=LINK_MAX,
             max_total=MAX_TOTAL, min_coverage=MIN_COVERAGE, area=None):
    """Score one design exactly as given; it is not repaired here.

    x, y are the task points (built once per run with task_points); area gives the task area of
    each point (None: all points are one area).
    The coverage objective is the mean of the areas' coverages, so every area counts equally however
    many points it has. The coverage floor applies to every area separately, so no area can be left out:
    shortfall = max over areas of max(0, min_coverage - area coverage).
    With one area both reduce to the plain coverage of its points.
    """
    if area is None:
        area = np.zeros(len(x), dtype=int)
    n_areas = int(area.max()) + 1
    _, covered = coverage(l1, l2, x, y, limits)
    dex, _ = dexterity(l1, l2, x, y, covered)
    per_area = area_coverage(covered, area, n_areas)
    cov = sum(per_area) / n_areas
    shortfall = max(max(0.0, min_coverage - c) for c in per_area)
    feasible = _within_bounds(l1, l2, link_min, link_max, max_total) and shortfall == 0.0
    return {
        "coverage": cov,
        "dexterity": dex,
        "length": l1 + l2,
        "feasible": feasible,
        "shortfall": shortfall,
        "area_coverage": per_area,
    }
