import pytest

from robot.optimizer import pareto_front
from validate import baseline_length, brute_force

# 3 x 3 task points, links 5..12 cm in 1 cm steps, total <= 20 cm
TINY = dict(task_rects=[(10, 14, 5, 9)], spacing=2.0, link_min=5.0, link_max=12.0, max_total=20.0, step=1.0)


def dominates(a, b):
    """The definition, written the slow obvious way (lengths rounded like pareto_front does)."""
    la, lb = round(a["length"], 9), round(b["length"], 9)
    no_worse = a["coverage"] >= b["coverage"] and a["dexterity"] >= b["dexterity"] and la <= lb
    better = a["coverage"] > b["coverage"] or a["dexterity"] > b["dexterity"] or la < lb
    return no_worse and better


def test_brute_force_covers_the_grid():
    # 8 x 8 = 64 pairs, minus the 10 pairs with l1 + l2 > 20 -> 54 designs
    designs = brute_force(**TINY)
    pairs = {(d["l1"], d["l2"]) for d in designs}
    assert pairs == {(a, b) for a in range(5, 13) for b in range(5, 13) if a + b <= 20}
    assert len(designs) == 54


def test_true_front_matches_definition():
    designs = brute_force(**TINY)
    feasible = [d for d in designs if d["feasible"]]
    slow = {(d["l1"], d["l2"]) for d in feasible if not any(dominates(o, d) for o in feasible)}
    fast = {(d["l1"], d["l2"]) for d in pareto_front(designs)}
    assert fast == slow and fast


def test_true_front_hand_example():
    # A beats B (same coverage, more dexterous, shorter); C has more coverage, so nothing beats it
    a = {"coverage": 0.9, "dexterity": 0.8, "length": 30.0, "feasible": True}
    b = {"coverage": 0.9, "dexterity": 0.7, "length": 31.0, "feasible": True}
    c = {"coverage": 1.0, "dexterity": 0.6, "length": 40.0, "feasible": True}
    assert pareto_front([b, c, a]) == [a, c]


def test_true_front_ignores_infeasible():
    bad = {"coverage": 0.9, "dexterity": 0.9, "length": 10.0, "feasible": False}
    ok = {"coverage": 0.6, "dexterity": 0.5, "length": 12.0, "feasible": True}
    assert pareto_front([bad, ok]) == [ok]


def test_baseline_rule_of_thumb():
    # farthest default corner (25, 20) is 32.02 cm away: 32.02 / 2 = 16.01 -> rounded up to 16.1
    assert baseline_length() == pytest.approx(16.1)
