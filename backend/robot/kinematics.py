"""Forward and inverse kinematics of a 2-link planar arm (two revolute joints).

Notation and equation numbers follow Craig, Introduction to Robotics, 3rd ed.:
  l1, l2   link lengths (cm)
  theta1   angle of link 1 from the x-axis (rad)
  theta2   angle of link 2 relative to link 1 (rad)
  c1 = cos(theta1), c12 = cos(theta1 + theta2), etc.

Units are always cm and radians; the frontend converts.
x, y, theta1, theta2 may be scalars or NumPy arrays.
"""
import numpy as np

# Points exactly on the workspace edge can give |c2| = 1 + 1e-16 from rounding.
TOL = 1e-9


def forward_kinematics(theta1, theta2, l1, l2):
    """Joint angles -> end-effector position (x, y). Craig Eqs. (4.10), (4.11)."""
    c1, s1 = np.cos(theta1), np.sin(theta1)
    c12, s12 = np.cos(theta1 + theta2), np.sin(theta1 + theta2)
    x = l1 * c1 + l2 * c12                                  # Eq. (4.10)
    y = l1 * s1 + l2 * s12                                  # Eq. (4.11)
    return x, y


def inverse_kinematics(x, y, l1, l2, elbow=1):
    """End-effector position (x, y) -> joint angles (theta1, theta2).

    elbow = +1 takes the + root for s2, elbow = -1 the - root.
    Returns theta1, theta2 (NaN where unreachable) and a boolean array 'reachable'.
    """
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)

    c2 = (x**2 + y**2 - l1**2 - l2**2) / (2 * l1 * l2)    # Eq. (4.14)
    reachable = np.abs(c2) <= 1 + TOL                       # solvable only if |c2| <= 1
    c2 = np.clip(c2, -1.0, 1.0)
    s2 = elbow * np.sqrt(1.0 - c2**2)                       # Eq. (4.15)
    theta2 = np.arctan2(s2, c2)                             # Eq. (4.16)

    k1 = l1 + l2 * c2                                       # Eq. (4.19)
    k2 = l2 * s2                                            # Eq. (4.19)
    theta1 = np.arctan2(y, x) - np.arctan2(k2, k1)          # Eq. (4.27)
    theta1 = np.arctan2(np.sin(theta1), np.cos(theta1))     # wrap to (-pi, pi]

    theta1 = np.where(reachable, theta1, np.nan)
    theta2 = np.where(reachable, theta2, np.nan)
    return theta1, theta2, reachable
