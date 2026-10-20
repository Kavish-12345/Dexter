# Dexter

**Smarter robotic design, optimized for your workspace.**

Dexter finds the best link lengths (l1, l2) for a two-link planar robot arm. You draw the task area the tool must reach. NSGA-II then trades off three objectives, and the resulting designs are shown live in 3D:

- **Coverage** (maximise): the share of task points the arm can reach within its joint limits.
- **Dexterity** (maximise): how far the arm stays from a singularity, |det J| / (l1·l2) = |sin θ2|.
- **Size** (minimise): the total link length l1 + l2.

ME-314 Robotics & Control course project.

![Landing page](docs/screenshots/landing.png)

## Features

- Task setup: link limits, joint limits and a drag-to-draw task area, in mm, cm, m or in and in deg or rad.
- 3D arm view: coordinate frames, both elbow solutions, and click-to-move along joint-space cubic trajectories.
- Chart tabs: Workspace, Dexterity, Pareto front, Convergence and Comparison.
- Explainer pages: How it works and The math.
- Results checked against a brute-force search of all 51,676 designs.

![3D arm view](docs/screenshots/arm-3d.png)

| Pareto front | Workspace |
| :---: | :---: |
| ![Pareto front](docs/screenshots/pareto.png) | ![Workspace](docs/screenshots/workspace.png) |

## How it works

1. **Define the task**: a grid of points the tool must reach, plus the allowed link and joint limits.
2. **Score each design**: inverse kinematics tests every task point with both elbow solutions. The Jacobian determinant rates the distance from a singularity.
3. **Optimize**: NSGA-II evolves 60 designs over 50 generations and keeps the ones no other design beats on all three objectives. These form the Pareto front.
4. **Explore**: pick a design from the front and inspect it in 3D and in the charts.

## Tech stack

| Part | Tools |
| --- | --- |
| Backend | Python, FastAPI, DEAP (NSGA-II), NumPy |
| Frontend | React, TypeScript, Vite, Tailwind CSS, React Three Fiber, Plotly |
| Tests | pytest, Vitest |

## Run it

**Backend** (runs on http://127.0.0.1:8000):

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend** (runs on http://localhost:5173; it forwards API calls to the backend):

```bash
cd frontend
npm install
npm run dev
```

**Tests and validation:**

```bash
cd backend && pytest              # backend unit tests
cd backend && python validate.py  # NSGA-II vs brute-force true Pareto front
cd frontend && npm test           # frontend unit tests
```

## Project structure

```
backend/
  robot/        kinematics, workspace, dexterity, fitness, optimizer, defaults
  main.py       FastAPI endpoints: /defaults /evaluate /optimize /ik /workspace
  validate.py   brute-force check of the optimizer
  tests/
frontend/
  src/components/   landing pages, task setup, 3D arm, chart tabs
  src/lib/          units, kinematics, trajectories, chart helpers
```

## Author

Kavish Srivastava
