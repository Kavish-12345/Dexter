# Dexter: robot arm design optimizer

Finds link lengths (L1, L2) for a 2-link planar arm using NSGA-II.
The objectives are task coverage, dexterity and compactness.
ROBCON course project.

## Backend
    cd backend
    python -m venv .venv
    .venv\Scripts\activate
    pip install -r requirements.txt
    pytest

## Frontend
    cd frontend
    npm install
    npm run dev
