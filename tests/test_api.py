import copy
import pytest
from fastapi.testclient import TestClient

from src.app import app, activities


@pytest.fixture(autouse=True)
def reset_activities():
    # Create a deep copy of global activities and restore after each test
    original = copy.deepcopy(activities)
    yield
    activities.clear()
    activities.update(original)


@pytest.fixture
def client():
    return TestClient(app)


def test_get_activities(client):
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # Some activity known to exist in the seed data
    assert "Chess Club" in data


def test_signup_adds_participant(client):
    activity = "Chess Club"
    email = "testuser@example.com"

    # Ensure not already present
    assert email not in activities[activity]["participants"]

    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200
    assert "Signed up" in resp.json().get("message", "")

    # Verify participant now present in activities payload
    list_resp = client.get("/activities")
    assert list_resp.status_code == 200
    assert email in list_resp.json()[activity]["participants"]


def test_signup_duplicate_returns_400(client):
    activity = "Chess Club"
    email = "dupuser@example.com"

    # First signup ok
    resp1 = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp1.status_code == 200

    # Second signup should fail
    resp2 = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp2.status_code == 400
    assert "already signed up" in resp2.json().get("detail", "")


def test_unregister_removes_participant(client):
    activity = "Programming Class"
    email = "user2@example.com"

    # Sign up first
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200

    # Now unregister
    resp2 = client.post(f"/activities/{activity}/unregister?email={email}")
    assert resp2.status_code == 200
    assert "Unregistered" in resp2.json().get("message", "")

    # Verify removed
    listing = client.get("/activities").json()
    assert email not in listing[activity]["participants"]


def test_unregister_not_signed_up_returns_400(client):
    activity = "Programming Class"
    email = "notsigned@example.com"

    resp = client.post(f"/activities/{activity}/unregister?email={email}")
    assert resp.status_code == 400
    assert "not signed up" in resp.json().get("detail", "")
