"""NSGA-II search for link lengths (l1, l2), using DEAP.

Every design is repaired (fitness.repair) and then scored (fitness.evaluate).
DEAP weights (1, 1, -1): maximise coverage, maximise dexterity, minimise l1 + l2.
A design that misses the coverage floor is rescored as (-shortfall, -shortfall, max_total + shortfall),
so it ranks below every feasible design, and closer misses rank higher.
"""
import random

from deap import base, creator, tools

from robot.defaults import (CX_PROB, ETA, GENERATIONS, GRID_SPACING, JOINT_LIMITS, LENGTH_STEP,
                            LINK_MAX, LINK_MIN, MAX_TOTAL, MIN_COVERAGE, MUT_PROB, POP_SIZE,
                            SEED, TASK_RECT)
from robot.fitness import evaluate, repair
from robot.workspace import task_grid

# DEAP keeps these classes globally, so create them only once.
if not hasattr(creator, "ArmFitness"):
    creator.create("ArmFitness", base.Fitness, weights=(1.0, 1.0, -1.0))
    creator.create("Arm", list, fitness=creator.ArmFitness)


def optimize(task_rect=TASK_RECT, spacing=GRID_SPACING, limits=JOINT_LIMITS,
             link_min=LINK_MIN, link_max=LINK_MAX, max_total=MAX_TOTAL, step=LENGTH_STEP,
             min_coverage=MIN_COVERAGE, pop_size=POP_SIZE, generations=GENERATIONS, seed=SEED):
    """Run NSGA-II. Returns the front, whether any design was feasible, a per-generation log
    and the number of evaluations."""
    if pop_size < 4 or pop_size % 4 != 0:
        raise ValueError("pop_size must be a positive multiple of 4 (needed by DEAP's NSGA-II selection)")
    random.seed(seed)
    x, y = task_grid(*task_rect, spacing)
    log = []

    def fix_and_score(arm):
        # repair in place, then score; keep the raw result on the design for the output
        arm[0], arm[1] = repair(arm[0], arm[1], link_min, link_max, max_total, step)
        arm.result = evaluate(arm[0], arm[1], x, y, limits, link_min, link_max, max_total, min_coverage)
        r = arm.result
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

    return {**_front(pop), "log": log, "evaluations": pop_size * (generations + 1)}


def _front(pop):
    """Feasible non-dominated designs, without duplicates, sorted by length.
    If no design is feasible, the designs closest to the coverage floor instead (flagged infeasible)."""
    feasible = [a for a in pop if a.result["feasible"]]
    if feasible:
        chosen = tools.sortNondominated(feasible, len(feasible), first_front_only=True)[0]
    else:
        best = min(a.result["shortfall"] for a in pop)
        chosen = [a for a in pop if a.result["shortfall"] == best]
    unique = {}
    for a in chosen:
        unique[(a[0], a[1])] = {"l1": a[0], "l2": a[1], **a.result}
    designs = sorted(unique.values(), key=lambda d: (d["length"], d["l1"]))
    return {"front": designs, "feasible_found": bool(feasible)}
