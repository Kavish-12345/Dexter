"""Dexterity from the Jacobian of the 2-link planar arm.

Craig, 3rd ed.: Jacobian in frame {0}, Eq. (5.67); det J = l1 l2 s2, Eq. (5.73).
Dexterity score per pose = |det J| / (l1 l2) = |s2|: 0 at a singularity, 1 at theta2 = +-90 deg.
Dividing by l1 l2 is our modification, so a bigger arm does not score higher just for being bigger.
"""
import numpy as np

from robot.kinematics import inverse_kinematics


def jacobian(theta1, theta2, l1, l2):
    """2x2 Jacobian in frame {0}, Eq. (5.67): joint rates -> end-effector velocity."""
    s1, c1 = np.sin(theta1), np.cos(theta1)
    s12, c12 = np.sin(theta1 + theta2), np.cos(theta1 + theta2)
    return np.array([
        [-l1 * s1 - l2 * s12, -l2 * s12],
        [l1 * c1 + l2 * c12, l2 * c12],
    ])


def dexterity(l1, l2, x, y, covered):
    """Mean dexterity score over the covered task points.

    Returns (mean_score, scores); scores is NaN at uncovered points.
    If nothing is covered, mean_score is 0.0 (not NaN) so the optimizer always gets a number.
    """
    # The score uses |s2|, and s2 = +-sqrt(1 - c2^2) has the same size for both elbows,
    # so one IK call (either elbow) gives the score at every covered point.
    _, theta2, _ = inverse_kinematics(x, y, l1, l2)
    det_j = l1 * l2 * np.sin(theta2)                        # Eq. (5.73)
    scores = np.where(covered, np.abs(det_j) / (l1 * l2), np.nan)
    if not covered.any():
        return 0.0, scores
    return float(np.nanmean(scores)), scores
