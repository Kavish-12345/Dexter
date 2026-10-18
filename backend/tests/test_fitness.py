import numpy as np
import pytest

from robot.defaults import GRID_SPACING, TASK_RECT
from robot.fitness import evaluate, repair
from robot.workspace import task_grid

X, Y = task_grid(*TASK_RECT, GRID_SPACING)


def on_step(value, link_min, step):
    k = (value - link_min) / step
    return abs(k - round(k)) < 1e-6


# ---- repair, default limits (5..30 cm, total 45 cm, step 0.1 cm) ----

def test_repair_keeps_valid_design():
    assert repair(12.3, 20.0) == pytest.approx((12.3, 20.0))


def test_repair_clips_to_bounds():
    # 2 -> 5 and 40 -> 30; total 35 <= 45
    assert repair(2.0, 40.0) == pytest.approx((5.0, 30.0))


def test_repair_scales_to_max_total():
    # 30 + 30 = 60 > 45: factor 0.75 -> 22.5 + 22.5 = 45
    assert repair(30.0, 30.0) == pytest.approx((22.5, 22.5))


def test_repair_snaps_to_step():
    # 12.34 -> 12.3 and 20.06 -> 20.1
    assert repair(12.34, 20.06) == pytest.approx((12.3, 20.1))


# ---- repair, custom tight limits ----

def test_repair_clip_after_scaling_shortens_longer_link():
    # max total 20: 30 + 5 scaled by 20/35 -> 17.14 + 2.86; 2.86 clips up to 5 (total 22.14),
    # so the longer link becomes 20 - 5 = 15
    assert repair(30.0, 5.0, max_total=20.0) == pytest.approx((15.0, 5.0))


def test_repair_snapping_over_total_takes_one_step_off_longer_link():
    # max total 45.18: 30 + 30 scaled -> 22.59 + 22.59; both snap up to 22.6 (total 45.2 > 45.18),
    # so l1 (ties go to l1) drops one step to 22.5 -> total 45.1
    assert repair(30.0, 30.0, max_total=45.18) == pytest.approx((22.5, 22.6))


def test_repair_impossible_limits_raise():
    # 10 + 10 > 15: no valid design exists
    with pytest.raises(ValueError):
        repair(12.0, 12.0, link_min=10.0, max_total=15.0)


@pytest.mark.parametrize("link_min, link_max, max_total, step", [
    (5.0, 30.0, 45.0, 0.1),   # defaults
    (4.0, 9.0, 14.0, 0.5),    # tight custom limits
    (5.0, 30.0, 45.18, 0.1),  # max total not on the step
])
def test_repaired_designs_always_valid(link_min, link_max, max_total, step):
    rng = np.random.default_rng(3)
    for l1, l2 in rng.uniform(-10, 60, (500, 2)):
        r1, r2 = repair(l1, l2, link_min, link_max, max_total, step)
        assert link_min - 1e-9 <= r1 <= link_max + 1e-9
        assert link_min - 1e-9 <= r2 <= link_max + 1e-9
        assert r1 + r2 <= max_total + 1e-9
        assert on_step(r1, link_min, step) and on_step(r2, link_min, step)


# ---- evaluate (default task rectangle 10..25 x 5..20 cm, 1 cm grid) ----

def test_evaluate_feasible_design():
    # l1 = l2 = 20 covers the whole default rectangle (step 3 hand check)
    r = evaluate(20.0, 20.0, X, Y)
    assert r["coverage"] == pytest.approx(1.0)
    assert 0.0 < r["dexterity"] <= 1.0
    assert r["length"] == pytest.approx(40.0)
    assert r["feasible"] and r["shortfall"] == 0.0


def test_evaluate_arm_too_short():
    # l1 + l2 = 10 cannot reach the nearest corner (r = 11.18)
    r = evaluate(5.0, 5.0, X, Y)
    assert r["coverage"] == 0.0 and r["dexterity"] == 0.0
    assert not r["feasible"]
    assert r["shortfall"] == pytest.approx(0.5)


def test_evaluate_shortfall_hand_count():
    # step 3 hand count: l1 = 15, l2 = 5 covers 2 of 5 points -> 0.4; floor 0.5 -> shortfall 0.1
    x = np.array([0.0, 5.0, 10.0, 15.0, 20.0])
    y = np.zeros(5)
    r = evaluate(15.0, 5.0, x, y)
    assert r["coverage"] == pytest.approx(0.4)
    assert r["shortfall"] == pytest.approx(0.1)
    assert not r["feasible"]


def test_evaluate_does_not_repair():
    # l1 = 3 is below the 5 cm default: scored as given, but flagged infeasible
    r = evaluate(3.0, 20.0, X, Y)
    assert r["length"] == pytest.approx(23.0)
    assert not r["feasible"]


def test_evaluate_custom_max_total():
    # covers everything, but 40 cm exceeds a user max total of 35 cm
    r = evaluate(20.0, 20.0, X, Y, max_total=35.0)
    assert r["coverage"] == pytest.approx(1.0)
    assert not r["feasible"]
    assert r["shortfall"] == 0.0  # shortfall only measures the coverage floor


def test_evaluate_custom_min_coverage():
    # with the coverage floor set to 0, even the 5 + 5 arm is feasible
    r = evaluate(5.0, 5.0, X, Y, min_coverage=0.0)
    assert r["feasible"] and r["shortfall"] == 0.0
