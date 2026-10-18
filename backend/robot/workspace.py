"""Task-area sampling and workspace coverage for the 2-link planar arm.

Units are cm and radians, like kinematics.py.
"""
import numpy as np

from robot.defaults import GRID_SPACING, JOINT_LIMITS, MAX_POINTS
from robot.kinematics import TOL, inverse_kinematics


def task_grid(x_min, x_max, y_min, y_max, spacing=GRID_SPACING):
    """Fixed grid over the task rectangle, edges included. Returns x, y as 1-D arrays."""
    nx = int(round((x_max - x_min) / spacing)) + 1
    ny = int(round((y_max - y_min) / spacing)) + 1
    if nx * ny > MAX_POINTS:
        raise ValueError(f"{nx * ny} task points exceeds the cap of {MAX_POINTS}; use a larger spacing")
    gx, gy = np.meshgrid(np.linspace(x_min, x_max, nx), np.linspace(y_min, y_max, ny))
    return gx.ravel(), gy.ravel()


def within_limits(theta, lo, hi):
    """True where theta, theta + 360 deg or theta - 360 deg lies in [lo, hi]."""
    ok = np.zeros(np.shape(theta), dtype=bool)
    for shift in (0.0, 2 * np.pi, -2 * np.pi):
        t = theta + shift
        ok |= (lo - TOL <= t) & (t <= hi + TOL)
    return ok


def coverage(l1, l2, x, y, limits=JOINT_LIMITS):
    """Fraction of task points reached by at least one elbow solution within the joint limits.

    Returns (fraction, covered), where covered is a boolean array with one entry per point.
    """
    (t1_lo, t1_hi), (t2_lo, t2_hi) = limits
    covered = np.zeros(len(x), dtype=bool)
    for elbow in (1, -1):
        theta1, theta2, reachable = inverse_kinematics(x, y, l1, l2, elbow)
        covered |= reachable & within_limits(theta1, t1_lo, t1_hi) & within_limits(theta2, t2_lo, t2_hi)
    return float(covered.mean()), covered
