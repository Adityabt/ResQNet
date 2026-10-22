import pytest

from app import deps


@pytest.fixture(autouse=True)
def relaxed_test_environment(monkeypatch):
    monkeypatch.setattr(deps, "LOOPBACK", deps.LOOPBACK | {"testclient"})
    monkeypatch.setattr(deps, "ENFORCE_TOKENS", False)