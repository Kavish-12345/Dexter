import numpy as np
import pytest

from robot.defaults import JOINT_LIMITS
from robot.workspace import coverage, task_grid, within_limits

FULL = (np.radians(-180), np.radians(180))


def test_grid_default_rectangle():
    # 10..25 and 5..20 at 1 cm: 16 x 16 points, edges included
    x, y = task_grid(10, 25, 5, 20, spacing=1.0)
    assert len(x) == 256
    assert x.min() == 10 and x.max() == 25
    assert y.min() == 5 and y.max() == 20


def test_grid_keeps_edges_when_spacing_does_not_divide():
    # width 10 at spacing 3 -> 4 points: 0, 3.33, 6.67, 10
    x, _ = task_grid(0, 10, 0, 0, spacing=3.0)
    np.testing.assert_allclose(np.unique(x), [0, 10 / 3, 20 / 3, 10])


def test_grid_cap():
    with pytest.raises(ValueError):
        task_grid(10, 25, 5, 20, spacing=0.1)  # 151 x 151 = 22801 points


def test_within_limits_360_rule():
    assert within_limits(np.radians(-90), np.radians(0), np.radians(270))  # -90 + 360 = 270 fits
    assert not within_limits(np.radians(100), np.radians(-90), np.radians(90))
    assert within_limits(np.pi, *FULL)
    assert not within_limits(np.nan, *FULL)


def test_full_coverage():
    # l1 = l2 = 20. Nearest corner (10, 5): c2 = (125 - 800) / 800 = -0.844, so theta2 = 147.6 deg, inside +-150.
    # Farthest corner (25, 20): r = 32.0 < 40.
    x, y = task_grid(10, 25, 5, 20)
    frac, covered = coverage(20, 20, x, y)
    assert frac == pytest.approx(1.0)
    assert covered.all()


def test_zero_coverage_arm_too_short():
    # l1 + l2 = 10 < 11.18, the distance to the nearest corner (10, 5)
    x, y = task_grid(10, 25, 5, 20)
    frac, _ = coverage(5, 5, x, y)
    assert frac == 0.0


def test_partial_coverage_hand_count():
    # l1 = 15, l2 = 5: ring 10 <= r <= 20. Points on the x-axis at r = 0, 5, 10, 15, 20
    x = np.array([0.0, 5.0, 10.0, 15.0, 20.0])
    y = np.zeros(5)
    # no theta2 limit: r = 10, 15, 20 are reachable -> 3/5
    frac, _ = coverage(15, 5, x, y, limits=(FULL, FULL))
    assert frac == pytest.approx(0.6)
    # theta2 within +-150: r = 10 needs theta2 = 180 (fully folded) -> 2/5
    frac, covered = coverage(15, 5, x, y)
    assert frac == pytest.approx(0.4)
    np.testing.assert_array_equal(covered, [False, False, False, True, True])


def test_theta1_limit_and_360_rule():
    # l1 = 15, l2 = 5. (0, 15) needs theta1 = 70.8 or 109.2 deg; (0, -15) needs -109.2 or -70.8 deg
    x = np.array([0.0, 0.0])
    y = np.array([15.0, -15.0])
    t2_lim = JOINT_LIMITS[1]
    _, covered = coverage(15, 5, x, y, limits=((np.radians(0), np.radians(180)), t2_lim))
    np.testing.assert_array_equal(covered, [True, False])
    # limit 0..270: -109.2 + 360 = 250.8 fits, so (0, -15) is now covered
    _, covered = coverage(15, 5, x, y, limits=((np.radians(0), np.radians(270)), t2_lim))
    np.testing.assert_array_equal(covered, [True, True])
