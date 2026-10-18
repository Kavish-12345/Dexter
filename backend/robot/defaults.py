"""Default design constraints, all in one place.

Every function takes these as parameters. The user can edit them through the API except those marked fixed.
Units are cm and radians.
"""
import math

LINK_MIN = 5.0         # cm
LINK_MAX = 30.0        # cm
MAX_TOTAL = 45.0       # cm, limit on l1 + l2
LENGTH_STEP = 0.1      # cm, fixed (not in the API): designs are snapped to this step
MIN_COVERAGE = 0.5     # fraction of task points (50%)
JOINT_LIMITS = (
    (math.radians(-180), math.radians(180)),  # theta1
    (math.radians(-150), math.radians(150)),  # theta2
)
TASK_RECT = (10.0, 25.0, 5.0, 20.0)  # x_min, x_max, y_min, y_max (cm)
GRID_SPACING = 1.0     # cm

# Safety cap, not a design choice: keeps one evaluation fast. Not user-editable.
MAX_POINTS = 2500

# NSGA-II run settings (fixed: not in the API or form; optimize() still takes them for tests and step 10)
POP_SIZE = 60          # must be a multiple of 4
GENERATIONS = 50
SEED = 42

WORKSPACE_GRID = 50    # points per side for the /workspace plot (50 x 50 = 2500, the cap)

# NSGA-II operator settings (fixed; standard values from DEAP's NSGA-II example)
CX_PROB = 0.9          # chance that a pair of parents is crossed
MUT_PROB = 0.5         # chance that each length is mutated (1 / number of variables)
ETA = 20.0             # how close children stay to their parents (higher = closer)
