"""Default design constraints, all in one place.

Every function takes these as parameters, and the user can edit all of them except MAX_POINTS.
Units are cm and radians.
"""
import numpy as np

LINK_MIN = 5.0         # cm
LINK_MAX = 30.0        # cm
MAX_TOTAL = 45.0       # cm, limit on l1 + l2
LENGTH_STEP = 0.1      # cm, designs are snapped to this step
MIN_COVERAGE = 0.5     # fraction of task points (50%)
JOINT_LIMITS = (
    (np.radians(-180), np.radians(180)),  # theta1
    (np.radians(-150), np.radians(150)),  # theta2
)
TASK_RECT = (10.0, 25.0, 5.0, 20.0)  # x_min, x_max, y_min, y_max (cm)
GRID_SPACING = 1.0     # cm

# Safety cap, not a design choice: keeps one evaluation fast. Not user-editable.
MAX_POINTS = 2500

# NSGA-II run settings (user-editable; the API caps them in step 7)
POP_SIZE = 60          # must be a multiple of 4
GENERATIONS = 50
SEED = 42
MAX_POP_SIZE = 200     # fixed safety caps, not user-editable
MAX_GENERATIONS = 200

# NSGA-II operator settings (fixed; standard values from DEAP's NSGA-II example)
CX_PROB = 0.9          # chance that a pair of parents is crossed
MUT_PROB = 0.5         # chance that each length is mutated (1 / number of variables)
ETA = 20.0             # how close children stay to their parents (higher = closer)
