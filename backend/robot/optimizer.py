"""NSGA-II search for link lengths (l1, l2), using DEAP.

Every design is repaired (fitness.repair) and then scored (fitness.evaluate).
DEAP weights (1, 1, -1): maximise coverage, maximise dexterity, minimise l1 + l2.
A design that misses the coverage floor is rescored as (-shortfall, -shortfall, max_total + shortfall),
so it ranks below every feasible design, and closer misses rank higher.
Every scored design is kept in an archive, and the returned front is the non-dominated set of the
whole archive: the population (60) is smaller than the true front, so the final population alone
would discard good designs (found by the brute-force check in validate.py).
"""
import random

import numpy as np
from deap import base, creator, tools

from robot.defaults import (CX_PROB, ETA, GENERATIONS, GRID_SPACING, JOINT_LIMITS, LENGTH_STEP,
                            LINK_MAX, LINK_MIN, MAX_TOTAL, MIN_COVERAGE, MUT_PROB, POP_SIZE,
                            SEED, TASK_RECTS)
from robot.fitness import evaluate, repair
from robot.workspace import task_points

# DEAP keeps these classes globally, so create them only once.
if not hasattr(creator, "ArmFitness"):
    creator.create("ArmFitness", base.Fitness, weights=(1.0, 1.0, -1.0))
    creator.create("Arm", list, fitness=creator.ArmFitness)


def optimize(task_rects=TASK_RECTS, spacing=GRID_SPACING, limits=JOINT_LIMITS,
             link_min=LINK_MIN, link_max=LINK_MAX, max_total=MAX_TOTAL, step=LENGTH_STEP,
             min_coverage=MIN_COVERAGE, pop_size=POP_SIZE, generations=GENERATIONS, seed=SEED):
    """Run NSGA-II. Returns the front, whether any design was feasible, a per-generation log
    and the number of evaluations."""
    if pop_size < 4 or pop_size % 4 != 0:
        raise ValueError("pop_size must be a positive multiple of 4 (needed by DEAP's NSGA-II selection)")
    random.seed(seed)
    x, y, area = task_points(task_rects, spacing)
    log = []
    archive = {}  # (l1, l2) -> design with its scores, for every design ever evaluated

    def fix_and_score(arm):
        # repair in place, then score; keep the raw result on the design for the output
        arm[0], arm[1] = repair(arm[0], arm[1], link_min, link_max, max_total, step)
        arm.result = evaluate(arm[0], arm[1], x, y, limits, link_min, link_max, max_total, min_coverage, area)
        r = arm.result
        archive[(arm[0], arm[1])] = {"l1": arm[0], "l2": arm[1], **r}
        if r["feasible"]:
            arm.fitness.values = (r["coverage"], r["dexterity"], r["length"])
        else:
            s = r["shortfall"]
            arm.fitness.values = (-s, -s, max_total + s)

    def log_generation(gen, pop):
        log.append({
            "gen": gen,
            "n_feasible": sum(a.result["feasible"] for a in pop),
            "best_coverage": max(a.result["coverage"] for a in pop),
        })

    # initial population: random lengths inside the link bounds
    pop = [creator.Arm([random.uniform(link_min, link_max), random.uniform(link_min, link_max)])
           for _ in range(pop_size)]
    for arm in pop:
        fix_and_score(arm)
    pop = tools.selNSGA2(pop, pop_size)  # ranks fronts and sets crowding, needed by the tournament
    log_generation(0, pop)

    for gen in range(1, generations + 1):
        # parents: tournaments preferring a better front, then a less crowded spot
        parents = tools.selTournamentDCD(pop, pop_size)
        children = [creator.Arm(p[:]) for p in parents]  # copies with empty fitness
        for c1, c2 in zip(children[::2], children[1::2]):
            if random.random() <= CX_PROB:
                tools.cxSimulatedBinaryBounded(c1, c2, eta=ETA, low=link_min, up=link_max)
            tools.mutPolynomialBounded(c1, eta=ETA, low=link_min, up=link_max, indpb=MUT_PROB)
            tools.mutPolynomialBounded(c2, eta=ETA, low=link_min, up=link_max, indpb=MUT_PROB)
        for c in children:
            fix_and_score(c)
        # survivors: best fronts first, least crowded designs to fill the last places
        pop = tools.selNSGA2(pop + children, pop_size)
        log_generation(gen, pop)

    return {**_front(archive), "log": log, "evaluations": pop_size * (generations + 1)}


def pareto_front(designs):
    """Feasible designs that no other feasible design dominates.

    Sorted shortest first (ties: more coverage, then more dexterity), any design that could
    dominate another comes before it, so each design is only checked against those kept so far.
    """
    feasible = sorted((d for d in designs if d["feasible"]),
                      key=lambda d: (round(d["length"], 9), -d["coverage"], -d["dexterity"]))
    kept = np.empty((len(feasible), 3))  # coverage, dexterity, length of the kept designs
    m = 0
    front = []
    for d in feasible:
        c, x, l = d["coverage"], d["dexterity"], round(d["length"], 9)
        k = kept[:m]
        beaten = ((k[:, 0] >= c) & (k[:, 1] >= x) & (k[:, 2] <= l)
                  & ((k[:, 0] > c) | (k[:, 1] > x) | (k[:, 2] < l)))
        if not beaten.any():
            kept[m] = (c, x, l)
            m += 1
            front.append(d)
    return front


def _front(archive):
    """Non-dominated feasible designs among everything evaluated, sorted by length.
    If none is feasible: the designs with the smallest shortfall, and of those only the shortest
    (flagged infeasible)."""
    designs = list(archive.values())
    front = pareto_front(designs)
    if not front:
        best = min(d["shortfall"] for d in designs)
        closest = [d for d in designs if d["shortfall"] == best]
        shortest = min(round(d["length"], 9) for d in closest)
        front = [d for d in closest if round(d["length"], 9) == shortest]
    front.sort(key=lambda d: (d["length"], d["l1"]))
    return {"front": front, "feasible_found": any(d["feasible"] for d in designs)}
