import pytest

from robot.optimizer import optimize

FAST = dict(pop_size=20, generations=10)


def dominates(a, b):
    """a is at least as good on all three objectives and strictly better on one."""
    no_worse = a["coverage"] >= b["coverage"] and a["dexterity"] >= b["dexterity"] and a["length"] <= b["length"]
    better = a["coverage"] > b["coverage"] or a["dexterity"] > b["dexterity"] or a["length"] < b["length"]
    return no_worse and better


def test_same_seed_same_result():
    a = optimize(seed=1, **FAST)
    b = optimize(seed=1, **FAST)
    assert a["front"] == b["front"]
    assert a["log"] == b["log"]


def test_front_designs_are_valid():
    res = optimize(seed=2, **FAST)
    assert res["feasible_found"] and res["front"]
    for d in res["front"]:
        assert d["feasible"] and d["coverage"] >= 0.5
        assert 5.0 - 1e-9 <= d["l1"] <= 30.0 + 1e-9
        assert 5.0 - 1e-9 <= d["l2"] <= 30.0 + 1e-9
        assert d["l1"] + d["l2"] <= 45.0 + 1e-9
        for v in (d["l1"], d["l2"]):
            k = (v - 5.0) / 0.1
            assert abs(k - round(k)) < 1e-6  # on the 0.1 cm step


def test_front_has_no_duplicate_designs():
    front = optimize(seed=7, **FAST)["front"]
    pairs = [(d["l1"], d["l2"]) for d in front]
    assert len(pairs) == len(set(pairs))


def test_front_is_non_dominated():
    front = optimize(seed=3, **FAST)["front"]
    for a in front:
        for b in front:
            assert not dominates(a, b)


def test_full_coverage_design_found():
    # l1 = l2 = 20 covers the whole default rectangle (step 3), so a coverage-1.0 design exists
    front = optimize(seed=4, pop_size=40, generations=30)["front"]
    assert max(d["coverage"] for d in front) == pytest.approx(1.0)


def test_log_and_evaluation_count():
    res = optimize(seed=5, **FAST)
    assert [g["gen"] for g in res["log"]] == list(range(11))  # generation 0 plus 10
    assert res["evaluations"] == 20 * 11


def test_no_feasible_design_returns_closest():
    # max total 10 forces l1 = l2 = 5, which cannot reach the nearest corner (11.18 cm)
    res = optimize(seed=6, max_total=10.0, **FAST)
    assert not res["feasible_found"]
    assert res["front"] and all(not d["feasible"] for d in res["front"])
    assert all(d["shortfall"] == pytest.approx(0.5) for d in res["front"])


def test_pop_size_must_be_multiple_of_4():
    with pytest.raises(ValueError):
        optimize(pop_size=22, generations=1)
