def test_libraries_import():
    import numpy
    import deap
    import fastapi

    assert numpy.__version__
    assert deap.__version__
    assert fastapi.__version__
