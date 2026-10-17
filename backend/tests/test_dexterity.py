import numpy as np
import pytest

from robot.dexterity import dexterity, jacobian
from robot.workspace import coverage

FULL = (np.radians(-180), np.radians(180))


def test_jacobian_hand_check():
    # theta1 = 0, theta2 = 90 deg, l1 = l2 = 10 -> J = [[-10, -10], [10, 0]], det = 0 - (-100) = 100
    J = jacobian(0.0, np.pi / 2, 10, 10)
    np.testing.assert_allclose(J, [[-10, -10], [10, 0]], atol=1e-12)
    assert np.linalg.det(J) == pytest.approx(100.0)


def test_straight_arm_is_singular():
    J = jacobian(0.3, 0.0, 10, 10)
    assert np.linalg.det(J) == pytest.approx(0.0, abs=1e-12)


def test_det_of_5_67_matches_5_73():
    rng = np.random.default_rng(2)
    for theta1, theta2 in rng.uniform(-np.pi, np.pi, (50, 2)):
        J = jacobian(theta1, theta2, 15, 8)
        assert np.linalg.det(J) == pytest.approx(15 * 8 * np.sin(theta2), abs=1e-9)


def test_dexterity_hand_check():
    # l1 = l2 = 10: (10, 10) needs theta2 = 90 -> score 1; (20, 0) is straight -> 0; (30, 0) unreachable
    x = np.array([10.0, 20.0, 30.0])
    y = np.array([10.0, 0.0, 0.0])
    _, covered = coverage(10, 10, x, y, limits=(FULL, FULL))
    mean, scores = dexterity(10, 10, x, y, covered)
    assert scores[0] == pytest.approx(1.0)
    assert scores[1] == pytest.approx(0.0, abs=1e-6)
    assert np.isnan(scores[2])
    assert mean == pytest.approx(0.5)   # (1 + 0) / 2 covered points


def test_dexterity_nothing_covered():
    x, y = np.array([30.0]), np.array([0.0])
    _, covered = coverage(10, 10, x, y)
    mean, _ = dexterity(10, 10, x, y, covered)
    assert mean == 0.0
