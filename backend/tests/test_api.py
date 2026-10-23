import math

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_defaults():
    d = client.get("/defaults").json()
    assert (d["link_min"], d["link_max"], d["max_total"]) == (5.0, 30.0, 45.0)
    assert d["min_coverage"] == 0.5
    assert d["task_rects"] == [[10.0, 25.0, 5.0, 20.0]]
    assert d["theta2_limits"] == pytest.approx([math.radians(-150), math.radians(150)])
    assert "pop_size" not in d  # fixed, not exposed
    assert "length_step" not in d  # fixed at 0.1 cm, not exposed


def test_evaluate_full_coverage():
    # l1 = l2 = 20 covers the whole default rectangle (step 3 hand check)
    r = client.post("/evaluate", json={"l1": 20, "l2": 20})
    assert r.status_code == 200
    body = r.json()
    assert body["coverage"] == pytest.approx(1.0)
    assert body["length"] == pytest.approx(40.0)
    assert body["feasible"] is True


def test_evaluate_short_arm():
    # l1 + l2 = 10 cannot reach the nearest corner (11.18 cm)
    body = client.post("/evaluate", json={"l1": 5, "l2": 5}).json()
    assert body["coverage"] == 0.0
    assert body["feasible"] is False
    assert body["shortfall"] == pytest.approx(0.5)


def test_evaluate_rejects_non_positive_length():
    assert client.post("/evaluate", json={"l1": 0, "l2": 20}).status_code == 422


def test_optimize_default_run():
    r = client.post("/optimize", json={})
    assert r.status_code == 200
    body = r.json()
    assert body["feasible_found"] is True
    assert body["evaluations"] == 60 * 51
    assert len(body["log"]) == 51
    assert body["front"] and all(d["feasible"] for d in body["front"])


def test_ik_hand_check():
    # (10, 10) with l1 = l2 = 10: elbow +1 -> (0, 90 deg), elbow -1 -> (90, -90 deg)
    sols = client.post("/ik", json={"l1": 10, "l2": 10, "x": 10, "y": 10}).json()["solutions"]
    up, down = sols
    assert up["theta1"] == pytest.approx(0.0, abs=1e-9) and up["theta2"] == pytest.approx(math.pi / 2)
    assert down["theta1"] == pytest.approx(math.pi / 2) and down["theta2"] == pytest.approx(-math.pi / 2)
    assert up["within_limits"] and down["within_limits"]


def test_ik_unreachable_gives_nulls():
    sols = client.post("/ik", json={"l1": 10, "l2": 10, "x": 30, "y": 0}).json()["solutions"]
    for s in sols:
        assert s["reachable"] is False and s["theta1"] is None and s["theta2"] is None


def test_ik_joint_limit_flag():
    # l1 = 15, l2 = 5 at (10, 0) needs theta2 = 180 deg (folded): reachable, but outside +-150
    sols = client.post("/ik", json={"l1": 15, "l2": 5, "x": 10, "y": 0}).json()["solutions"]
    for s in sols:
        assert s["reachable"] is True and s["within_limits"] is False


def test_workspace_shape_and_nulls():
    w = client.post("/workspace", json={"l1": 10, "l2": 10}).json()
    assert len(w["x"]) == len(w["covered"]) == len(w["dexterity"]) == 2500
    assert min(w["x"]) == pytest.approx(-20) and max(w["x"]) == pytest.approx(20)
    for c, s in zip(w["covered"], w["dexterity"]):
        assert (s is None) == (not c)  # null exactly where not covered
    assert len(w["task"]["covered"]) == 256  # default rectangle at 1 cm


@pytest.mark.parametrize("change, message", [
    ({"link_min": 0}, "link_min must be greater than 0"),
    ({"link_min": 30}, "link_min must be less than link_max"),
    ({"link_min": 25}, "2 x link_min must not exceed max_total"),
    ({"task_rects": [[25, 10, 5, 20]]}, "task area A: x_max must be >= x_min"),
    ({"task_rects": []}, "give between 1 and 4 task areas"),
    ({"task_rects": [[0, 1, 0, 1]] * 5}, "give between 1 and 4 task areas"),
    ({"task_rects": [[10, 25, 5, 20], [20, 30, 15, 25]]}, "task areas A and B must not overlap or touch"),
    ({"task_rects": [[10, 25, 5, 20], [-25, -10, -20, -5]], "grid_spacing": 0.4}, "over all areas exceeds the cap"),
    ({"grid_spacing": 0.1}, "exceeds the cap"),
    ({"min_coverage": 1.5}, "min_coverage must be between 0 and 1"),
    ({"grid_spacing": 0}, "grid_spacing must be greater than 0"),
    ({"theta2_limits": [1.0, -1.0]}, "theta2_limits: lower limit must not exceed upper limit"),
])
def test_invalid_config_rejected(change, message):
    r = client.post("/optimize", json=change)
    assert r.status_code == 422
    assert message in r.text


# --- several task areas ---
FAR_AND_NEAR = [[10, 25, 5, 20], [-3, -1, -3, -1]]  # B is 1.4 to 4.2 cm from the base


def test_evaluate_floor_applies_to_every_area():
    # l1 = l2 = 20 reaches all of A, but none of B: theta2 <= 150 deg keeps the tool >= 10.35 cm away.
    # Coverage is the mean over the areas, (100% + 0%) / 2 = 50%: B counts as much as A although it has
    # only 9 points (by points it would be 256 / 265). Still infeasible, because B is below the floor.
    body = client.post("/evaluate", json={"l1": 20, "l2": 20, "config": {"task_rects": FAR_AND_NEAR}}).json()
    assert body["area_coverage"] == pytest.approx([1.0, 0.0])
    assert body["coverage"] == pytest.approx(0.5)
    assert body["feasible"] is False
    assert body["shortfall"] == pytest.approx(0.5)


def test_optimize_two_areas_meets_floor_in_each():
    rects = [[10, 25, 5, 20], [-25, -10, -20, -5]]  # opposite quadrants
    body = client.post("/optimize", json={"task_rects": rects}).json()
    assert body["feasible_found"] is True
    for d in body["front"]:
        assert len(d["area_coverage"]) == 2
        assert min(d["area_coverage"]) >= 0.5


def test_workspace_marks_task_areas():
    w = client.post("/workspace", json={"l1": 20, "l2": 20, "config": {"task_rects": FAR_AND_NEAR}}).json()
    assert w["task"]["area"] == [0] * 256 + [1] * 9
    assert w["task"]["area_coverage"] == pytest.approx([1.0, 0.0])
