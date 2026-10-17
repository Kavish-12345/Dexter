import numpy as np
import pytest

from kinematics import forward_kinematics, inverse_kinematics


def test_fk_straight_arm():
    x, y = forward_kinematics(0.0, 0.0, 10, 10)
    assert x == pytest.approx(20.0)
    assert y == pytest.approx(0.0)


def test_fk_hand_check():
    # theta1 = 0, theta2 = 90 deg: link 1 along x, link 2 straight up
    x, y = forward_kinematics(0.0, np.pi / 2, 10, 10)
    assert x == pytest.approx(10.0)
    assert y == pytest.approx(10.0)


def test_ik_hand_check_both_elbows():
    # (10, 10) with l1 = l2 = 10: c2 = 0, so theta2 = +-90 deg
    t1, t2, ok = inverse_kinematics(10, 10, 10, 10, elbow=1)
    assert ok
    assert np.degrees(t1) == pytest.approx(0.0, abs=1e-9)
    assert np.degrees(t2) == pytest.approx(90.0)

    t1, t2, ok = inverse_kinematics(10, 10, 10, 10, elbow=-1)
    assert ok
    assert np.degrees(t1) == pytest.approx(90.0)
    assert np.degrees(t2) == pytest.approx(-90.0)


def test_round_trip_random_points():
    rng = np.random.default_rng(0)
    l1, l2 = 15.0, 8.0
    # random points inside the ring |l1 - l2| <= r <= l1 + l2
    r = rng.uniform(abs(l1 - l2), l1 + l2, 200)
    phi = rng.uniform(-np.pi, np.pi, 200)
    x, y = r * np.cos(phi), r * np.sin(phi)
    for elbow in (1, -1):
        t1, t2, ok = inverse_kinematics(x, y, l1, l2, elbow)
        assert ok.all()
        x2, y2 = forward_kinematics(t1, t2, l1, l2)
        np.testing.assert_allclose(x2, x, atol=1e-9)
        np.testing.assert_allclose(y2, y, atol=1e-9)


def test_unreachable_outside():
    t1, t2, ok = inverse_kinematics(30, 0, 10, 10)
    assert not ok
    assert np.isnan(t1) and np.isnan(t2)


def test_unreachable_inner_hole():
    # l1 = 15, l2 = 5: inner radius 10, so r = 5 is inside the hole
    _, _, ok = inverse_kinematics(5, 0, 15, 5)
    assert not ok


def test_boundary_point_is_reachable():
    # full stretch at an awkward angle; rounding must not mark it unreachable
    x, y = 20 * np.cos(1.0), 20 * np.sin(1.0)
    _, t2, ok = inverse_kinematics(x, y, 10, 10)
    assert ok
    assert t2 == pytest.approx(0.0, abs=1e-6)
    
def test_ik_at_origin_equal_links():
    # Craig: theta1 is arbitrary when x = y = 0. It must not crash or return NaN.
    t1, t2, ok = inverse_kinematics(0, 0, 10, 10)
    assert ok
    assert np.isfinite(t1) and np.isfinite(t2)
    x, y = forward_kinematics(t1, t2, 10, 10)
    assert x == pytest.approx(0.0, abs=1e-9)
    assert y == pytest.approx(0.0, abs=1e-9)


def test_angles_are_wrapped():
    # decision 1A: theta1 and theta2 always lie in [-pi, pi]
    rng = np.random.default_rng(1)
    l1, l2 = 15.0, 8.0
    r = rng.uniform(abs(l1 - l2), l1 + l2, 500)
    phi = rng.uniform(-np.pi, np.pi, 500)
    x, y = r * np.cos(phi), r * np.sin(phi)
    for elbow in (1, -1):
        t1, t2, ok = inverse_kinematics(x, y, l1, l2, elbow)
        assert np.all(np.abs(t1) <= np.pi + 1e-12)
        assert np.all(np.abs(t2) <= np.pi + 1e-12)


def test_mixed_reachable_and_unreachable_array():
    # one call, three points (l1 = 15, l2 = 5): reachable, outside, inner hole
    x = np.array([12.0, 30.0, 5.0])
    y = np.array([0.0, 0.0, 0.0])
    t1, t2, ok = inverse_kinematics(x, y, 15, 5)
    np.testing.assert_array_equal(ok, [True, False, False])
    assert np.isfinite(t1[0]) and np.isfinite(t2[0])
    assert np.isnan(t1[1:]).all() and np.isnan(t2[1:]).all()
