"""Dexter API.

Contract: all lengths in cm, all angles in radians, min_coverage as a fraction 0..1.
The frontend converts units (units.ts). Run with: uvicorn main:app --reload
"""
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field, model_validator

from robot.defaults import (GRID_SPACING, JOINT_LIMITS, LINK_MAX, LINK_MIN, MAX_TOTAL, MIN_COVERAGE,
                            TASK_RECT, WORKSPACE_GRID)
from robot.dexterity import dexterity
from robot.fitness import evaluate
from robot.kinematics import inverse_kinematics
from robot.optimizer import optimize
from robot.workspace import coverage, task_grid, within_limits

app = FastAPI(title="Dexter API", description="Lengths in cm, angles in radians, min_coverage as a fraction 0..1.")


class Config(BaseModel):
    """Everything the user can edit, with the defaults from robot/defaults.py."""
    link_min: float = LINK_MIN
    link_max: float = LINK_MAX
    max_total: float = MAX_TOTAL
    min_coverage: float = MIN_COVERAGE
    theta1_limits: tuple[float, float] = JOINT_LIMITS[0]
    theta2_limits: tuple[float, float] = JOINT_LIMITS[1]
    task_rect: tuple[float, float, float, float] = TASK_RECT  # x_min, x_max, y_min, y_max
    grid_spacing: float = GRID_SPACING

    @model_validator(mode="after")
    def check(self):
        errors = []
        if self.link_min <= 0:
            errors.append("link_min must be greater than 0")
        if self.link_min >= self.link_max:
            errors.append("link_min must be less than link_max")
        if 2 * self.link_min > self.max_total:
            errors.append("2 x link_min must not exceed max_total (no design could fit)")
        if not 0 <= self.min_coverage <= 1:
            errors.append("min_coverage must be between 0 and 1")
        for name, (lo, hi) in (("theta1_limits", self.theta1_limits), ("theta2_limits", self.theta2_limits)):
            if lo > hi:
                errors.append(f"{name}: lower limit must not exceed upper limit")
        x_min, x_max, y_min, y_max = self.task_rect
        rect_ok = True
        if x_max < x_min:
            errors.append("task_rect: x_max must be >= x_min")
            rect_ok = False
        if y_max < y_min:
            errors.append("task_rect: y_max must be >= y_min")
            rect_ok = False
        if self.grid_spacing <= 0:
            errors.append("grid_spacing must be greater than 0")
        elif rect_ok:
            try:
                task_grid(*self.task_rect, self.grid_spacing)  # raises if over the 2,500-point cap
            except ValueError as e:
                errors.append(str(e))
        if errors:
            raise ValueError("; ".join(errors))
        return self

    def limits(self):
        return (self.theta1_limits, self.theta2_limits)


class DesignRequest(BaseModel):
    config: Config = Field(default_factory=Config)
    l1: float = Field(gt=0)
    l2: float = Field(gt=0)


class PointRequest(DesignRequest):
    x: float
    y: float


def _nan_to_none(values):
    """JSON has no NaN; send null instead (Plotly shows it as a gap)."""
    return [None if np.isnan(v) else float(v) for v in values]


@app.get("/defaults")
def get_defaults() -> Config:
    return Config()


@app.post("/evaluate")
def post_evaluate(req: DesignRequest):
    """Score one design exactly as given (for example the baseline arm)."""
    cfg = req.config
    x, y = task_grid(*cfg.task_rect, cfg.grid_spacing)
    return evaluate(req.l1, req.l2, x, y, cfg.limits(), cfg.link_min, cfg.link_max,
                    cfg.max_total, cfg.min_coverage)


@app.post("/optimize")
def post_optimize(cfg: Config):
    """Run NSGA-II with the fixed population, generations, seed and length step from defaults.py."""
    return optimize(task_rect=cfg.task_rect, spacing=cfg.grid_spacing, limits=cfg.limits(),
                    link_min=cfg.link_min, link_max=cfg.link_max, max_total=cfg.max_total,
                    min_coverage=cfg.min_coverage)


@app.post("/ik")
def post_ik(req: PointRequest):
    """Both elbow solutions for one target point, with reachability and joint-limit flags."""
    (lo1, hi1), (lo2, hi2) = req.config.limits()
    solutions = []
    for elbow in (1, -1):
        theta1, theta2, ok = inverse_kinematics(req.x, req.y, req.l1, req.l2, elbow)
        ok = bool(ok)
        fits = ok and bool(within_limits(theta1, lo1, hi1)) and bool(within_limits(theta2, lo2, hi2))
        solutions.append({
            "elbow": elbow,
            "theta1": float(theta1) if ok else None,
            "theta2": float(theta2) if ok else None,
            "reachable": ok,
            "within_limits": fits,
        })
    return {"solutions": solutions}


@app.post("/workspace")
def post_workspace(req: DesignRequest):
    """Coverage and dexterity on a 50 x 50 grid over +-(l1 + l2), plus covered flags for the task grid."""
    cfg = req.config
    reach = req.l1 + req.l2
    x, y = task_grid(-reach, reach, -reach, reach, 2 * reach / (WORKSPACE_GRID - 1))
    _, covered = coverage(req.l1, req.l2, x, y, cfg.limits())
    _, scores = dexterity(req.l1, req.l2, x, y, covered)
    tx, ty = task_grid(*cfg.task_rect, cfg.grid_spacing)
    _, task_covered = coverage(req.l1, req.l2, tx, ty, cfg.limits())
    return {
        "x": x.tolist(),
        "y": y.tolist(),
        "covered": covered.tolist(),
        "dexterity": _nan_to_none(scores),
        "task": {"x": tx.tolist(), "y": ty.tolist(), "covered": task_covered.tolist()},
    }
